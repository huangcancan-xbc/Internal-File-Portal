import os
import re
import uuid
import shutil
from datetime import datetime, timezone
from pypinyin import lazy_pinyin
from flask import current_app, request, send_file
from models import db
from models.user import User, ROLE_ADMIN
from models.file import Directory, FileRecord
from models.log import AuditLog, CopyAudit
from utils.validators import allowed_file, get_file_extension
from utils.request import get_client_ip, get_client_ua


def _audit(user, action, detail, file_record=None):
    log = AuditLog(
        user_id=user.id, account=user.account, username=user.username,
        ip=get_client_ip() if request else 'system', user_agent=get_client_ua() if request else '',
        module='file', action=action, detail=detail,
    )
    db.session.add(log)
    db.session.commit()


def _detach_copy_audits(*file_ids):
    """Clear copy audit FK refs so file records can be permanently deleted."""
    ids = [i for i in file_ids if i is not None]
    if not ids:
        return
    CopyAudit.query.filter(CopyAudit.file_id.in_(ids)).update(
        {CopyAudit.file_id: None}, synchronize_session=False
    )


def _safe_user_dir(user):
    """Generate a safe directory name for a user: pinyin_account + user.id."""
    raw = user.account or str(user.id)
    if re.search(r'[\u4e00-\u9fff]', raw):
        raw = ''.join(lazy_pinyin(raw))
    safe = re.sub(r'[^\w\-.]', '_', raw)
    return f"{safe}_{user.id}"


def _physical_path(scope, user, filename):
    """Generate physical storage path for a file.

    public/  → flat structure: {16-hex}_{filename}
    private/ → per-user dir:   {pinyin_account}_{user.id}/{16-hex}_{filename}
    """
    unique_name = f"{uuid.uuid4().hex[:16]}_{filename}"
    if scope == 'public':
        return os.path.join(current_app.config['PUBLIC_FOLDER'], unique_name)
    else:
        user_dir = os.path.join(current_app.config['PRIVATE_FOLDER'], _safe_user_dir(user))
        os.makedirs(user_dir, exist_ok=True)
        return os.path.join(user_dir, unique_name)


def _get_or_create_dir(scope, user_id, dir_name, parent_path=None):
    """Get or create a directory."""
    if parent_path:
        path = f"{parent_path.rstrip('/')}/{dir_name}"
    else:
        path = f"/{scope}/{dir_name}"

    d = Directory.query.filter_by(path=path).first()
    if d:
        return d

    parent = None
    if parent_path:
        parent = Directory.query.filter_by(path=parent_path).first()

    d = Directory(
        name=dir_name,
        parent_id=parent.id if parent else None,
        scope=scope,
        owner_id=user_id if scope == 'private' else None,
        path=path,
    )
    db.session.add(d)
    db.session.flush()
    return d


def init_root_directories():
    """Create root public and private directories if they don't exist."""
    for scope in ('public', 'private'):
        path = f'/{scope}'
        if not Directory.query.filter_by(path=path).first():
            d = Directory(name=scope, scope=scope, path=path)
            db.session.add(d)
    db.session.commit()


def upload_file(user, files, directory_id=None, scope='public'):
    """Upload one or multiple files. Returns (success, result)."""
    if not files:
        return False, '未选择文件'

    # Permission check
    if scope == 'public' and not user.is_admin():
        from models.user import UserPermission, PERM_UPLOAD
        perm = UserPermission.query.filter_by(user_id=user.id, scope='public',
                                               directory_id=directory_id).first()
        if not perm or not perm.has_permission(PERM_UPLOAD):
            # Check default public permission
            perm = UserPermission.query.filter_by(user_id=user.id, scope='public',
                                                   directory_id=None).first()
            if not perm or not perm.has_permission(PERM_UPLOAD):
                return False, '没有上传权限'

    max_size = current_app.config.get('SINGLE_FILE_MAX_SIZE', 50 * 1024 * 1024)
    directory = Directory.query.get(directory_id) if directory_id else None

    success_count = 0
    fail_count = 0
    results = []

    for f in files:
        filename = f.filename
        if not filename:
            fail_count += 1
            results.append({'filename': filename, 'status': 'failure', 'reason': '文件名为空'})
            continue

        if not allowed_file(filename):
            fail_count += 1
            results.append({'filename': filename, 'status': 'failure', 'reason': '文件格式不允许'})
            continue

        # Read file to check size
        f.seek(0, 2)
        size = f.tell()
        f.seek(0)

        if size > max_size:
            fail_count += 1
            results.append({'filename': filename, 'status': 'failure',
                            'reason': f'文件大小超过限制（最大{max_size // 1024 // 1024}MB）'})
            continue

        actual_scope = scope
        owner_id = user.id

        file_path = _physical_path(actual_scope, user, filename)
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        f.save(file_path)

        ext = get_file_extension(filename)
        record = FileRecord(
            filename=os.path.basename(file_path),
            original_filename=filename,
            file_path=file_path,
            file_size=size,
            file_type=ext,
            mime_type=f.content_type,
            directory_id=directory.id if directory else None,
            owner_id=owner_id,
            scope=actual_scope,
        )
        db.session.add(record)
        db.session.flush()
        success_count += 1
        results.append({'filename': filename, 'status': 'success', 'file_id': record.id})

    db.session.commit()

    dir_name = directory.name if directory else '根目录'
    _audit(user, 'upload',
           f'上传了 {success_count} 个文件到「{dir_name}」' + (f'（{fail_count} 个失败）' if fail_count else ''))

    return True, {
        'success_count': success_count,
        'fail_count': fail_count,
        'results': results,
    }


def download_file(user, file_id, copy_type=None):
    """Download a file. Returns (success, result_or_error).

    Args:
        copy_type: None='download', 'local'=拷贝到本地, 'external'=拷贝到外接设备
    """
    record = FileRecord.query.get(file_id)
    if not record or record.status == 'deleted':
        return False, '文件不存在'

    # Permission check
    if record.scope == 'public' and not user.is_admin():
        from models.user import UserPermission, PERM_DOWNLOAD
        perm = UserPermission.query.filter_by(user_id=user.id, scope='public',
                                               directory_id=record.directory_id).first()
        if not perm or not perm.has_permission(PERM_DOWNLOAD):
            perm = UserPermission.query.filter_by(user_id=user.id, scope='public',
                                                   directory_id=None).first()
            if not perm or not perm.has_permission(PERM_DOWNLOAD):
                return False, '没有下载权限'
    elif record.scope == 'private' and record.owner_id != user.id and not user.is_admin():
        return False, '没有权限访问该文件'

    if not os.path.exists(record.file_path):
        return False, '文件已丢失'

    # Audit logging
    if copy_type == 'local':
        _audit(user, 'copy_to_local', f'拷贝「{record.original_filename}」到本地', record)
        ip = get_client_ip() if request else 'system'
        ua = get_client_ua() if request else ''
        copy_log = CopyAudit(
            user_id=user.id, account=user.account, username=user.username,
            file_id=record.id,
            source_filename=record.original_filename,
            source_path=record.file_path,
            target_path='[download to local]',
            file_size=record.file_size,
            copy_type='local', ip=ip, user_agent=ua,
        )
        db.session.add(copy_log)
        db.session.commit()
    else:
        _audit(user, 'download', f'下载了「{record.original_filename}」', record)

    return True, send_file(
        record.file_path,
        as_attachment=True,
        download_name=record.original_filename,
    )


def list_files(user, scope='public', directory_id=None, page=1, per_page=20,
               keyword=None, file_type=None):
    """List files with filters."""
    query = FileRecord.query.filter_by(status='active')

    if scope == 'public':
        query = query.filter_by(scope='public')
    else:
        if user.is_admin():
            query = query.filter_by(scope='private')
        else:
            query = query.filter_by(scope='private', owner_id=user.id)

    if directory_id:
        query = query.filter_by(directory_id=directory_id)

    if keyword:
        query = query.filter(FileRecord.original_filename.like(f'%{keyword}%'))
    if file_type:
        query = query.filter_by(file_type=file_type)

    pagination = query.order_by(FileRecord.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    # Total size across ALL matching files
    total_size = query.with_entities(db.func.coalesce(db.func.sum(FileRecord.file_size), 0)).scalar()
    return {
        'items': [f.to_dict() for f in pagination.items],
        'total': pagination.total,
        'total_size': total_size,
        'page': page,
        'per_page': per_page,
        'pages': pagination.pages,
    }


def delete_file(user, file_id):
    """Soft-delete a file (move to recycle bin)."""
    if not user.is_admin():
        return False, '仅管理员可删除文件'

    record = FileRecord.query.get(file_id)
    if not record or record.status == 'deleted':
        return False, '文件不存在'

    if record.scope == 'private' and record.owner_id != user.id and not user.is_admin():
        return False, '没有权限删除该文件'
    if record.scope == 'public' and not user.is_admin():
        return False, '公共目录文件仅管理员可删除'

    record.status = 'deleted'
    db.session.commit()
    _audit(user, 'delete', f'将「{record.original_filename}」移入回收站', record)
    return True, '文件已移入回收站'


def list_deleted_files(user, page=1, per_page=20, keyword=None):
    """List files in recycle bin."""
    if not user.is_admin():
        return {'items': [], 'total': 0, 'page': page, 'per_page': per_page, 'pages': 0}
    query = FileRecord.query.filter_by(status='deleted')
    if keyword:
        query = query.filter(FileRecord.original_filename.like(f'%{keyword}%'))
    pagination = query.order_by(FileRecord.updated_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False)
    return {
        'items': [f.to_dict() for f in pagination.items],
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
        'pages': pagination.pages,
    }


def restore_file(user, file_id):
    """Restore a file from recycle bin."""
    if not user.is_admin():
        return False, '仅管理员可恢复文件'
    record = FileRecord.query.get(file_id)
    if not record or record.status != 'deleted':
        return False, '文件不在回收站中'
    if not user.is_admin() and record.owner_id != user.id:
        return False, '没有权限恢复该文件'
    record.status = 'active'
    db.session.commit()
    _audit(user, 'restore', f'从回收站恢复了「{record.original_filename}」', record)
    return True, record.to_dict()


def permanent_delete_file(user, file_id):
    """Permanently delete a file from recycle bin (remove physical file)."""
    if not user.is_admin():
        return False, '仅管理员可永久删除文件'
    record = FileRecord.query.get(file_id)
    if not record or record.status != 'deleted':
        return False, '文件不在回收站中'
    if not user.is_admin() and record.owner_id != user.id:
        return False, '没有权限删除该文件'

    # Remove physical file
    if record.file_path and os.path.exists(record.file_path):
        try:
            os.remove(record.file_path)
        except OSError as e:
            return False, f'物理文件删除失败: {e}'

    name = record.original_filename
    _detach_copy_audits(record.id)
    db.session.delete(record)
    db.session.commit()
    _audit(user, 'permanent_delete', f'永久删除了「{name}」')
    return True, '文件已永久删除'


def empty_recycle_bin(user):
    """Permanently delete all files in recycle bin."""
    if not user.is_admin():
        return False, '仅管理员可清空回收站'
    query = FileRecord.query.filter_by(status='deleted')
    records = query.all()
    _detach_copy_audits(*(r.id for r in records))
    deleted = 0
    failed = 0
    for record in records:
        physical_ok = True
        if record.file_path and os.path.exists(record.file_path):
            try:
                os.remove(record.file_path)
            except OSError:
                physical_ok = False
                failed += 1
        if physical_ok:
            db.session.delete(record)
            deleted += 1

    db.session.commit()
    _audit(user, 'empty_recycle_bin',
           f'清空了回收站，永久删除 {deleted} 个文件' + (f'，{failed} 个物理文件删除失败' if failed else ''))
    if failed:
        return True, f'已删除 {deleted} 个记录，{failed} 个物理文件删除失败（记录已保留）'
    return True, f'已永久删除 {deleted} 个文件'


def rename_file(user, file_id, new_name):
    """Rename a file."""
    record = FileRecord.query.get(file_id)
    if not record or record.status == 'deleted':
        return False, '文件不存在'

    if record.scope == 'public' and not user.is_admin():
        return False, '公共目录文件仅管理员可重命名'
    if record.scope == 'private' and record.owner_id != user.id and not user.is_admin():
        return False, '没有权限重命名该文件'

    old_name = record.original_filename
    record.original_filename = new_name
    record.file_type = get_file_extension(new_name)
    db.session.commit()
    _audit(user, 'rename', f'将「{old_name}」重命名为「{new_name}」', record)
    return True, record.to_dict()


def _resolve_target_directory(user, record, target_directory_id):
    """Return a writable target directory for a file, or None for root."""
    if target_directory_id in (None, ''):
        return None, None

    try:
        target_directory_id = int(target_directory_id)
    except (TypeError, ValueError):
        return None, '目标目录不存在或无权限'

    target_dir = Directory.query.get(target_directory_id)
    if not target_dir or target_dir.scope != record.scope:
        return None, '目标目录不存在或无权限'

    if record.scope == 'private':
        if target_dir.owner_id != record.owner_id:
            return None, '目标目录不存在或无权限'
        if not user.is_admin() and target_dir.owner_id != user.id:
            return None, '目标目录不存在或无权限'

    return target_dir, None


def move_file(user, file_id, target_directory_id):
    """Move a file to another directory."""
    record = FileRecord.query.get(file_id)
    if not record or record.status == 'deleted':
        return False, '文件不存在'

    if record.scope == 'public' and not user.is_admin():
        return False, '仅管理员可移动公共目录文件'
    if record.scope == 'private' and record.owner_id != user.id and not user.is_admin():
        return False, '没有权限移动该文件'

    target_dir, err = _resolve_target_directory(user, record, target_directory_id)
    if err:
        return False, err

    record.directory_id = target_dir.id if target_dir else None
    db.session.commit()
    _audit(user, 'move',
           f'将「{record.original_filename}」移动到「{target_dir.name if target_dir else "根目录"}」',
           record)
    return True, record.to_dict()


def copy_file(user, file_id, target_directory_id=None, copy_type='internal'):
    """Copy a file within the system."""
    record = FileRecord.query.get(file_id)
    if not record or record.status == 'deleted':
        return False, '源文件不存在'

    if record.scope == 'public' and not user.is_admin():
        from models.user import UserPermission, PERM_COPY
        perm = UserPermission.query.filter_by(user_id=user.id, scope='public').first()
        if not perm or not perm.has_permission(PERM_COPY):
            return False, '没有拷贝权限'

    target_dir, err = _resolve_target_directory(user, record, target_directory_id)
    if err:
        return False, err

    new_path = _physical_path(record.scope, user, record.original_filename)
    shutil.copy2(record.file_path, new_path)

    new_record = FileRecord(
        filename=os.path.basename(new_path),
        original_filename=record.original_filename,
        file_path=new_path,
        file_size=record.file_size,
        file_type=record.file_type,
        mime_type=record.mime_type,
        directory_id=target_dir.id if target_dir else record.directory_id,
        owner_id=user.id,
        scope=record.scope,
    )
    db.session.add(new_record)
    db.session.flush()

    # Copy audit
    ip = get_client_ip() if request else 'system'
    ua = get_client_ua() if request else ''
    copy_log = CopyAudit(
        user_id=user.id, account=user.account, username=user.username,
        file_id=record.id,
        source_filename=record.original_filename,
        source_path=record.file_path,
        target_path=new_path,
        file_size=record.file_size,
        copy_type=copy_type, ip=ip, user_agent=ua,
    )
    db.session.add(copy_log)
    db.session.commit()

    _audit(user, 'copy',
           f'拷贝了「{record.original_filename}」', record)
    return True, new_record.to_dict()


BATCH_MAX = 100


def _parse_file_ids(file_ids):
    if not file_ids or not isinstance(file_ids, list):
        return None, '请提供文件 ID 列表'
    try:
        ids = list(dict.fromkeys(int(x) for x in file_ids))
    except (TypeError, ValueError):
        return None, '文件 ID 格式无效'
    if not ids:
        return None, '请至少选择一个文件'
    if len(ids) > BATCH_MAX:
        return None, f'单次最多操作 {BATCH_MAX} 个文件'
    return ids, None


def _batch_summary(results):
    success_count = sum(1 for r in results if r['status'] == 'success')
    fail_count = len(results) - success_count
    return {
        'success_count': success_count,
        'fail_count': fail_count,
        'results': results,
    }


def batch_delete_files(user, file_ids):
    """Soft-delete multiple files (move to recycle bin)."""
    ids, err = _parse_file_ids(file_ids)
    if err:
        return False, err
    if not user.is_admin():
        return False, '仅管理员可删除文件'

    results = []
    for file_id in ids:
        record = FileRecord.query.get(file_id)
        if not record or record.status == 'deleted':
            results.append({'file_id': file_id, 'status': 'failure', 'reason': '文件不存在'})
            continue
        if record.scope == 'public' and not user.is_admin():
            results.append({'file_id': file_id, 'filename': record.original_filename,
                            'status': 'failure', 'reason': '公共目录文件仅管理员可删除'})
            continue
        record.status = 'deleted'
        results.append({'file_id': file_id, 'filename': record.original_filename, 'status': 'success'})

    db.session.commit()
    summary = _batch_summary(results)
    sc, fc = summary['success_count'], summary['fail_count']
    detail = f'批量移入回收站 {sc} 个文件' + (f'（{fc} 个失败）' if fc else '')
    _audit(user, 'delete', detail)
    return True, summary


def batch_move_files(user, file_ids, target_directory_id):
    """Move multiple files to a directory (None = root)."""
    ids, err = _parse_file_ids(file_ids)
    if err:
        return False, err

    target_dir_name = '根目录'
    results = []
    for file_id in ids:
        record = FileRecord.query.get(file_id)
        if not record or record.status == 'deleted':
            results.append({'file_id': file_id, 'status': 'failure', 'reason': '文件不存在'})
            continue
        if record.scope == 'public' and not user.is_admin():
            results.append({'file_id': file_id, 'filename': record.original_filename,
                            'status': 'failure', 'reason': '仅管理员可移动公共目录文件'})
            continue
        if record.scope == 'private' and record.owner_id != user.id and not user.is_admin():
            results.append({'file_id': file_id, 'filename': record.original_filename,
                            'status': 'failure', 'reason': '没有权限移动该文件'})
            continue
        target_dir, err = _resolve_target_directory(user, record, target_directory_id)
        if err:
            results.append({'file_id': file_id, 'filename': record.original_filename,
                            'status': 'failure', 'reason': err})
            continue
        target_dir_name = target_dir.name if target_dir else '根目录'
        record.directory_id = target_dir.id if target_dir else None
        results.append({'file_id': file_id, 'filename': record.original_filename, 'status': 'success'})

    db.session.commit()
    summary = _batch_summary(results)
    sc, fc = summary['success_count'], summary['fail_count']
    _audit(user, 'move', f'批量移动 {sc} 个文件到「{target_dir_name}」' + (f'（{fc} 个失败）' if fc else ''))
    return True, summary


def batch_copy_files(user, file_ids, target_directory_id=None, copy_type='internal'):
    """Copy multiple files within the system."""
    ids, err = _parse_file_ids(file_ids)
    if err:
        return False, err

    results = []
    for file_id in ids:
        record = FileRecord.query.get(file_id)
        if not record or record.status == 'deleted':
            results.append({'file_id': file_id, 'status': 'failure', 'reason': '源文件不存在'})
            continue
        if record.scope == 'public' and not user.is_admin():
            from models.user import UserPermission, PERM_COPY
            perm = UserPermission.query.filter_by(user_id=user.id, scope='public').first()
            if not perm or not perm.has_permission(PERM_COPY):
                results.append({'file_id': file_id, 'filename': record.original_filename,
                                'status': 'failure', 'reason': '没有拷贝权限'})
                continue

        target_dir, err = _resolve_target_directory(user, record, target_directory_id)
        if err:
            results.append({'file_id': file_id, 'filename': record.original_filename,
                            'status': 'failure', 'reason': err})
            continue

        try:
            new_path = _physical_path(record.scope, user, record.original_filename)
            shutil.copy2(record.file_path, new_path)
            new_record = FileRecord(
                filename=os.path.basename(new_path),
                original_filename=record.original_filename,
                file_path=new_path,
                file_size=record.file_size,
                file_type=record.file_type,
                mime_type=record.mime_type,
                directory_id=target_dir.id if target_dir else record.directory_id,
                owner_id=user.id,
                scope=record.scope,
            )
            db.session.add(new_record)
            db.session.flush()

            ip = get_client_ip() if request else 'system'
            ua = get_client_ua() if request else ''
            copy_log = CopyAudit(
                user_id=user.id, account=user.account, username=user.username,
                file_id=record.id,
                source_filename=record.original_filename,
                source_path=record.file_path,
                target_path=new_path,
                file_size=record.file_size,
                copy_type=copy_type, ip=ip, user_agent=ua,
            )
            db.session.add(copy_log)
            db.session.commit()
            results.append({'file_id': file_id, 'filename': record.original_filename,
                            'status': 'success', 'new_file_id': new_record.id})
        except OSError as e:
            db.session.rollback()
            results.append({'file_id': file_id, 'filename': record.original_filename,
                            'status': 'failure', 'reason': f'复制失败: {e}'})

    summary = _batch_summary(results)
    sc, fc = summary['success_count'], summary['fail_count']
    _audit(user, 'copy', f'批量拷贝 {sc} 个文件' + (f'（{fc} 个失败）' if fc else ''))
    return True, summary


def list_directories(user, scope='public', parent_id=None):
    """List directories."""
    query = Directory.query.filter_by(scope=scope)
    if parent_id:
        query = query.filter_by(parent_id=parent_id)
    else:
        query = query.filter_by(parent_id=None)

    if scope == 'private' and not user.is_admin():
        query = query.filter_by(owner_id=user.id)

    dirs = query.order_by(Directory.name).all()
    return [d.to_dict() for d in dirs]


def create_directory(user, name, scope='public', parent_id=None):
    """Create a new directory."""
    if scope == 'public' and not user.is_admin():
        return False, '仅管理员可创建公共目录'

    parent_path = f'/{scope}'
    if parent_id:
        parent = Directory.query.get(parent_id)
        if not parent:
            return False, '父目录不存在'
        parent_path = parent.path

    path = f"{parent_path.rstrip('/')}/{name}"
    if Directory.query.filter_by(path=path).first():
        return False, f'目录 "{name}" 已存在'

    d = Directory(
        name=name, parent_id=parent_id, scope=scope,
        owner_id=user.id if scope == 'private' else None,
        path=path, created_by=user.id,
    )
    db.session.add(d)
    db.session.commit()
    parent_name = '根目录'
    if parent_id:
        p = Directory.query.get(parent_id)
        if p: parent_name = p.name
    _audit(user, 'create_directory', f'在「{parent_name}」下创建了目录「{name}」')
    return True, d.to_dict()


def delete_directory(user, dir_id):
    """Delete an empty directory."""
    d = Directory.query.get(dir_id)
    if not d:
        return False, '目录不存在'
    if d.scope == 'public' and not user.is_admin():
        return False, '仅管理员可删除公共目录'
    if d.children.count() > 0:
        return False, '目录不为空，无法删除'
    if d.files.filter_by(status='active').count() > 0:
        return False, '目录下有文件，无法删除'

    db.session.delete(d)
    db.session.commit()
    _audit(user, 'delete_directory', f'删除了目录「{d.name}」')
    return True, '目录已删除'


def get_file_preview(user, file_id):
    """Get file for preview (inline display)."""
    record = FileRecord.query.get(file_id)
    if not record or record.status == 'deleted':
        return False, '文件不存在'

    if record.scope == 'private' and record.owner_id != user.id and not user.is_admin():
        return False, '没有权限访问该文件'

    if not os.path.exists(record.file_path):
        return False, '文件已丢失'

    _audit(user, 'preview', f'预览了「{record.original_filename}」', record)

    ext = os.path.splitext(record.original_filename)[1].lower()

    # Word → HTML
    if ext in ('.docx', '.doc'):
        try:
            from docx import Document
            doc = Document(record.file_path)
            html = '<div style="max-width:900px;margin:0 auto;padding:24px;font-family:sans-serif;color:#1E293B;">'
            for p in doc.paragraphs:
                if p.style.name.startswith('Heading'):
                    level = int(p.style.name[-1]) if p.style.name[-1].isdigit() else 1
                    sizes = {1:24, 2:20, 3:16, 4:14}
                    html += f'<h{level} style="font-size:{sizes.get(level,16)}px;margin:0.5em 0;font-weight:600;">{p.text}</h{level}>'
                elif p.text.strip():
                    html += f'<p style="margin:0.4em 0;line-height:1.7;">{p.text}</p>'
            html += '</div>'
            from flask import make_response
            resp = make_response(html)
            resp.headers['Content-Type'] = 'text/html; charset=utf-8'
            return True, resp
        except Exception:
            pass  # Fall through to raw send

    # Excel → HTML table
    if ext in ('.xlsx', '.xls'):
        try:
            from openpyxl import load_workbook
            wb = load_workbook(record.file_path, data_only=True)
            sheet = wb.active
            html = '<div style="max-width:100%;overflow:auto;padding:16px;">'
            html += '<table style="border-collapse:collapse;font-family:sans-serif;font-size:13px;">'
            for row in sheet.iter_rows(values_only=True):
                html += '<tr>'
                for cell in row:
                    val = str(cell) if cell is not None else ''
                    html += f'<td style="border:1px solid #D5D8DC;padding:6px 10px;min-width:80px;color:#1E293B;">{val}</td>'
                html += '</tr>'
            html += '</table></div>'
            from flask import make_response
            resp = make_response(html)
            resp.headers['Content-Type'] = 'text/html; charset=utf-8'
            return True, resp
        except Exception:
            pass  # Fall through to raw send

    return True, send_file(
        record.file_path,
        mimetype=record.mime_type or 'application/octet-stream',
    )
