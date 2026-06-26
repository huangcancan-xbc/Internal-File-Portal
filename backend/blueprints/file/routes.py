from flask import request, jsonify
from flask_jwt_extended import jwt_required
from blueprints.file import file_bp
from utils.permissions import get_current_user
from utils.validators import validate_scope
from services import file_service


def _user_or_404():
    """Return (user, None) or (None, error_response)."""
    user = get_current_user()
    if not user:
        return None, (jsonify({'error': '用户不存在'}), 404)
    return user, None


# ── File Operations ──
# All routes require JWT authentication. Admin-only operations are enforced
# at the service layer (not with @admin_required decorator) because some
# operations have nuanced permission logic (e.g. public vs private scope).

@file_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload():
    user, err = _user_or_404()
    if err: return err
    files = request.files.getlist('files')
    scope = request.form.get('scope', 'public')
    if not validate_scope(scope):
        return jsonify({'error': 'scope 必须为 public 或 private'}), 400
    directory_id = request.form.get('directory_id', type=int)
    success, result = file_service.upload_file(user, files, directory_id, scope)
    if not success:
        return jsonify({'error': result}), 400
    return jsonify({'message': '上传完成', 'data': result}), 200


# ── File Download ──

@file_bp.route('/<int:file_id>/download', methods=['GET'])
@jwt_required()
def download(file_id):
    user, err = _user_or_404()
    if err: return err
    success, result = file_service.download_file(user, file_id)
    if not success:
        return jsonify({'error': result}), 400
    return result


# ── File Preview ──

@file_bp.route('/<int:file_id>/preview', methods=['GET'])
@jwt_required()
def preview(file_id):
    user, err = _user_or_404()
    if err: return err
    success, result = file_service.get_file_preview(user, file_id)
    if not success:
        return jsonify({'error': result}), 400
    return result


# ── File List ──

@file_bp.route('/', methods=['GET'])
@jwt_required()
def list_files():
    user, err = _user_or_404()
    if err: return err
    scope = request.args.get('scope', 'public')
    if not validate_scope(scope):
        return jsonify({'error': 'scope 必须为 public 或 private'}), 400
    directory_id = request.args.get('directory_id', type=int)
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    keyword = request.args.get('keyword')
    file_type = request.args.get('file_type')
    uploader = request.args.get('uploader')
    sort_by = request.args.get('sort_by', 'created_at')
    sort_order = request.args.get('sort_order', 'desc')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    result = file_service.list_files(user, scope, directory_id, page, per_page, keyword, file_type, uploader, sort_by, sort_order, start_date, end_date)
    return jsonify({'data': result}), 200


@file_bp.route('/filter-options', methods=['GET'])
@jwt_required()
def get_filter_options():
    """Return available file types and uploaders for filter dropdowns."""
    user, err = _user_or_404()
    if err: return err
    scope = request.args.get('scope', 'public')
    result = file_service.get_filter_options(user, scope)
    return jsonify({'data': result}), 200


# ── File Operations ──

@file_bp.route('/<int:file_id>', methods=['DELETE'])
@jwt_required()
def delete_file(file_id):
    user, err = _user_or_404()
    if err: return err
    success, result = file_service.delete_file(user, file_id)
    if not success:
        return jsonify({'error': result}), 400
    return jsonify({'message': result}), 200


# ── Recycle Bin ──

@file_bp.route('/batch/delete', methods=['POST'])
@jwt_required()
def batch_delete_files():
    user, err = _user_or_404()
    if err: return err
    data = request.get_json() or {}
    success, result = file_service.batch_delete_files(user, data.get('file_ids'))
    if not success:
        return jsonify({'error': result}), 400
    return jsonify({'message': f'成功 {result["success_count"]} 个，失败 {result["fail_count"]} 个', 'data': result}), 200


@file_bp.route('/batch/move', methods=['POST'])
@jwt_required()
def batch_move_files():
    user, err = _user_or_404()
    if err: return err
    data = request.get_json() or {}
    file_ids = data.get('file_ids')
    target_directory_id = data.get('target_directory_id')
    if target_directory_id == '':
        target_directory_id = None
    success, result = file_service.batch_move_files(user, file_ids, target_directory_id)
    if not success:
        return jsonify({'error': result}), 400
    return jsonify({'message': f'成功 {result["success_count"]} 个，失败 {result["fail_count"]} 个', 'data': result}), 200


@file_bp.route('/batch/copy', methods=['POST'])
@jwt_required()
def batch_copy_files():
    user, err = _user_or_404()
    if err: return err
    data = request.get_json() or {}
    success, result = file_service.batch_copy_files(
        user, data.get('file_ids'),
        target_directory_id=data.get('target_directory_id'),
    )
    if not success:
        return jsonify({'error': result}), 400
    return jsonify({'message': f'成功 {result["success_count"]} 个，失败 {result["fail_count"]} 个', 'data': result}), 200


@file_bp.route('/recycle-bin', methods=['GET'])
@jwt_required()
def list_recycle_bin():
    user, err = _user_or_404()
    if err: return err
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    keyword = request.args.get('keyword')
    result = file_service.list_deleted_files(user, page, per_page, keyword)
    return jsonify({'data': result}), 200


@file_bp.route('/<int:file_id>/restore', methods=['POST'])
@jwt_required()
def restore_file(file_id):
    user, err = _user_or_404()
    if err: return err
    success, result = file_service.restore_file(user, file_id)
    if not success:
        return jsonify({'error': result}), 400
    return jsonify({'message': '文件已恢复', 'data': result}), 200


@file_bp.route('/<int:file_id>/permanent', methods=['DELETE'])
@jwt_required()
def permanent_delete_file(file_id):
    user, err = _user_or_404()
    if err: return err
    success, result = file_service.permanent_delete_file(user, file_id)
    if not success:
        return jsonify({'error': result}), 400
    return jsonify({'message': result}), 200


@file_bp.route('/recycle-bin/empty', methods=['DELETE'])
@jwt_required()
def empty_recycle_bin():
    user, err = _user_or_404()
    if err: return err
    success, result = file_service.empty_recycle_bin(user)
    if not success:
        return jsonify({'error': result}), 400
    return jsonify({'message': result}), 200


@file_bp.route('/<int:file_id>/rename', methods=['PUT'])
@jwt_required()
def rename_file(file_id):
    user, err = _user_or_404()
    if err: return err
    data = request.get_json()
    new_name = data.get('name', '').strip() if data else ''
    if not new_name:
        return jsonify({'error': '新文件名不能为空'}), 400
    success, result = file_service.rename_file(user, file_id, new_name)
    if not success:
        return jsonify({'error': result}), 400
    return jsonify({'message': '重命名成功', 'data': result}), 200


@file_bp.route('/<int:file_id>/move', methods=['PUT'])
@jwt_required()
def move_file(file_id):
    user, err = _user_or_404()
    if err: return err
    data = request.get_json()
    target_dir = data.get('target_directory_id') if data else None
    if target_dir == '':
        target_dir = None
    success, result = file_service.move_file(user, file_id, target_dir)
    if not success:
        return jsonify({'error': result}), 400
    return jsonify({'message': '移动成功', 'data': result}), 200


# Returns 201 (Created) because a new file record is produced.
@file_bp.route('/<int:file_id>/copy', methods=['POST'])
@jwt_required()
def copy_file(file_id):
    user, err = _user_or_404()
    if err: return err
    data = request.get_json() or {}
    success, result = file_service.copy_file(
        user, file_id,
        target_directory_id=data.get('target_directory_id'),
    )
    if not success:
        return jsonify({'error': result}), 400
    return jsonify({'message': '拷贝成功', 'data': result}), 201


# ── Directories ──

@file_bp.route('/directories', methods=['GET'])
@jwt_required()
def list_directories():
    user, err = _user_or_404()
    if err: return err
    scope = request.args.get('scope', 'public')
    parent_id = request.args.get('parent_id', type=int)
    result = file_service.list_directories(user, scope, parent_id)
    return jsonify({'data': result}), 200


@file_bp.route('/directories', methods=['POST'])
@jwt_required()
def create_directory():
    user, err = _user_or_404()
    if err: return err
    data = request.get_json()
    if not data or not data.get('name', '').strip():
        return jsonify({'error': '目录名不能为空'}), 400
    scope = data.get('scope', 'public')
    if scope == 'private' and not user.is_admin():
        return jsonify({'error': '普通用户无权创建私人目录'}), 403
    success, result = file_service.create_directory(
        user, data['name'].strip(),
        scope=scope,
        parent_id=data.get('parent_id'),
    )
    if not success:
        return jsonify({'error': result}), 400
    return jsonify({'message': '目录创建成功', 'data': result}), 201


@file_bp.route('/directories/<int:dir_id>', methods=['DELETE'])
@jwt_required()
def delete_directory(dir_id):
    user, err = _user_or_404()
    if err: return err
    success, result = file_service.delete_directory(user, dir_id)
    if not success:
        return jsonify({'error': result}), 400
    return jsonify({'message': result}), 200


@file_bp.route('/directories/<int:dir_id>/rename', methods=['PUT'])
@jwt_required()
def rename_directory(dir_id):
    user, err = _user_or_404()
    if err: return err
    data = request.get_json()
    if not data or not data.get('name', '').strip():
        return jsonify({'error': '目录名不能为空'}), 400
    success, result = file_service.rename_directory(user, dir_id, data['name'].strip())
    if not success:
        return jsonify({'error': result}), 400
    return jsonify({'message': '目录重命名成功', 'data': result}), 200
