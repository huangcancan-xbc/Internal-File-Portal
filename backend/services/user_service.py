import random, string
from flask import request
from models import db
from models.user import User, UserPermission, ROLE_ADMIN, ROLE_USER, PERM_ALL, PERM_VIEW, PERM_UPLOAD, PERM_DOWNLOAD, DEPT_CHOICES
from models.log import AuditLog
from utils.validators import validate_password
from utils.request import get_client_ip, get_client_ua


def _audit(user_id, account, username, action, detail, target_account=None):
    log = AuditLog(
        user_id=user_id, account=account, username=username,
        ip=get_client_ip() if request else 'system', user_agent=get_client_ua() if request else '',
        module='user', action=action, detail=detail, status='success',
    )
    db.session.add(log)
    db.session.commit()


def create_user(admin, data):
    username = data.get('username', '').strip()
    if not username:
        return False, '姓名不能为空'

    account = data.get('account', '').strip()
    if not account:
        # Auto-generate pinyin from real name
        try:
            from pypinyin import lazy_pinyin
            account = ''.join(lazy_pinyin(username))
        except Exception:
            account = username
        # Ensure uniqueness
        suffix = 1
        base = account
        while User.query.filter_by(account=account).first():
            account = f'{base}{suffix}'
            suffix += 1
    elif User.query.filter_by(account=account).first():
        return False, f'用户名 "{account}" 已被使用'

    password = data.get('password', '')
    if not password:
        return False, '密码不能为空'

    department = data.get('department', '')
    if department and department not in DEPT_CHOICES:
        department = DEPT_CHOICES[0]

    user = User(
        account=account,
        username=username,
        department=department,
        role=data.get('role', ROLE_USER),
        created_by=admin.id,
    )
    user.set_password(password)
    db.session.add(user)
    db.session.flush()

    if user.role == ROLE_ADMIN:
        for scope in ('public', 'private'):
            db.session.add(UserPermission(user_id=user.id, scope=scope, permission_mask=PERM_ALL))
    else:
        db.session.add(UserPermission(user_id=user.id, scope='public',
                                       permission_mask=PERM_VIEW | PERM_UPLOAD | PERM_DOWNLOAD))
        db.session.add(UserPermission(user_id=user.id, scope='private', permission_mask=PERM_ALL))

    db.session.commit()
    _audit(admin.id, admin.account, admin.username, 'create_user',
           f'创建了用户「{user.username}」（{account}），角色：{user.role}', account)
    return True, user.to_dict(include_permissions=True)


def update_user(admin, user_id, data):
    user = User.query.get(user_id)
    if not user:
        return False, '用户不存在'

    if 'username' in data:
        user.username = data['username']
    if 'department' in data:
        dept = data['department']
        if dept in DEPT_CHOICES:
            user.department = dept
    if 'account' in data:
        new_acc = data['account'].strip()
        if new_acc and new_acc != user.account:
            if User.query.filter_by(account=new_acc).first():
                return False, f'账号 "{new_acc}" 已被使用'
            user.account = new_acc
    if 'role' in data:
        user.role = data['role']
    if 'status' in data:
        user.status = data['status']
        if data['status'] == 'deleted':
            _audit(admin.id, admin.account, admin.username, 'delete_user',
                   f'永久删除了用户「{user.username}」（{user.account}），其上传的文件保留', user.account)
            return True, '用户已永久删除'

    db.session.commit()
    _audit(admin.id, admin.account, admin.username, 'update_user',
           f'编辑了用户「{user.username}」的信息', user.account)
    return True, user.to_dict()


def update_profile(user, data):
    """User updates own profile — account and department."""
    if 'account' in data:
        new_acc = data['account'].strip()
        if new_acc and new_acc != user.account:
            if User.query.filter_by(account=new_acc).first():
                return False, f'用户名 "{new_acc}" 已被使用'
            user.account = new_acc
    if 'department' in data:
        dept = data['department']
        if dept in DEPT_CHOICES:
            user.department = dept

    db.session.commit()
    _audit(user.id, user.account, user.username, 'update_profile', '编辑了个人信息')
    return True, user.to_dict()


def delete_user(admin, user_id):
    user = User.query.get(user_id)
    if not user:
        return False, '用户不存在'
    if user.id == admin.id:
        return False, '不能禁用自己'
    user.status = 'disabled'
    db.session.commit()
    _audit(admin.id, admin.account, admin.username, 'delete_user',
           f'禁用了用户「{user.username}」', user.account)
    return True, '用户已禁用'


def reset_password(admin, user_id, new_password=None):
    user = User.query.get(user_id)
    if not user:
        return False, '用户不存在'

    if not new_password:
        new_password = ''.join(random.choices(string.ascii_letters + string.digits, k=10))

    user.set_password(new_password)
    user.login_attempts = 0
    user.locked_until = None
    if user.status == 'locked':
        user.status = 'active'
    db.session.commit()
    _audit(admin.id, admin.account, admin.username, 'reset_password',
           f'重置了用户「{user.username}」的密码', user.account)
    return True, {'new_password': new_password}


def change_password(user, old_password, new_password):
    if not user.check_password(old_password):
        return False, '原密码错误'
    valid, msg = validate_password(new_password)
    if not valid:
        return False, msg
    user.set_password(new_password)
    db.session.commit()
    _audit(user.id, user.account, user.username, 'change_password', '修改了个人密码')
    return True, '密码修改成功'


def list_users(page=1, per_page=20, keyword=None):
    query = User.query.filter(User.status != 'deleted')
    if keyword:
        like = f'%{keyword}%'
        query = query.filter(
            db.or_(User.account.like(like), User.username.like(like), User.department.like(like))
        )
    pagination = query.order_by(User.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    return {
        'items': [u.to_dict() for u in pagination.items],
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
        'pages': pagination.pages,
    }


def get_user(user_id):
    user = User.query.get(user_id)
    return user.to_dict(include_permissions=True) if user else None


def set_user_permissions(admin, user_id, scope, permission_mask, directory_id=None):
    user = User.query.get(user_id)
    if not user:
        return False, '用户不存在'

    perm = UserPermission.query.filter_by(
        user_id=user_id, scope=scope, directory_id=directory_id
    ).first()
    if perm:
        perm.permission_mask = permission_mask
    else:
        perm = UserPermission(
            user_id=user_id, scope=scope,
            directory_id=directory_id, permission_mask=permission_mask,
        )
        db.session.add(perm)

    db.session.commit()
    _audit(admin.id, admin.account, admin.username, 'set_permissions',
           f'修改了用户「{user.username}」的权限', user.account)
    return True, perm.to_dict()


def get_user_permissions(user_id):
    perms = UserPermission.query.filter_by(user_id=user_id).all()
    return [p.to_dict() for p in perms]
