from flask import request, jsonify
from flask_jwt_extended import jwt_required
from blueprints.file import file_bp
from utils.permissions import get_current_user
from services import file_service


def _require_user():
    user = get_current_user()
    if not user:
        return None, jsonify({'error': '用户不存在'}), 404
    return user, None, None


def _user_or_404():
    user = get_current_user()
    if not user:
        return None, (jsonify({'error': '用户不存在'}), 404)
    return user, None


# ── File Upload ──

@file_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload():
    user, err, code = _require_user()
    if err: return err, code
    files = request.files.getlist('files')
    scope = request.form.get('scope', 'public')
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
    copy_type = request.args.get('copy_type')
    success, result = file_service.download_file(user, file_id, copy_type=copy_type)
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
    directory_id = request.args.get('directory_id', type=int)
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    keyword = request.args.get('keyword')
    file_type = request.args.get('file_type')
    result = file_service.list_files(user, scope, directory_id, page, per_page, keyword, file_type)
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
        copy_type=data.get('copy_type', 'internal'),
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
    per_page = request.args.get('per_page', 20, type=int)
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


@file_bp.route('/<int:file_id>/copy', methods=['POST'])
@jwt_required()
def copy_file(file_id):
    user, err = _user_or_404()
    if err: return err
    data = request.get_json() or {}
    success, result = file_service.copy_file(
        user, file_id,
        target_directory_id=data.get('target_directory_id'),
        copy_type=data.get('copy_type', 'internal'),
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
    success, result = file_service.create_directory(
        user, data['name'].strip(),
        scope=data.get('scope', 'public'),
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
