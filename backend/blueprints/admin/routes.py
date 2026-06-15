from flask import request, jsonify
from flask_jwt_extended import jwt_required
from blueprints.admin import admin_bp
from utils.permissions import admin_required, get_current_user
from services import user_service


# ── User Management ──

@admin_bp.route('/users', methods=['GET'])
@jwt_required()
@admin_required
def list_users():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    keyword = request.args.get('keyword')
    result = user_service.list_users(page, per_page, keyword)
    return jsonify({'data': result}), 200


@admin_bp.route('/users', methods=['POST'])
@jwt_required()
@admin_required
def create_user():
    admin = get_current_user()
    data = request.get_json()
    if not data:
        return jsonify({'error': '请求数据为空'}), 400

    success, result = user_service.create_user(admin, data)
    if not success:
        return jsonify({'error': result}), 400
    return jsonify({'message': '用户创建成功', 'data': result}), 201


@admin_bp.route('/users/<int:user_id>', methods=['GET'])
@jwt_required()
@admin_required
def get_user(user_id):
    result = user_service.get_user(user_id)
    if not result:
        return jsonify({'error': '用户不存在'}), 404
    return jsonify({'data': result}), 200


@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@jwt_required()
@admin_required
def update_user(user_id):
    admin = get_current_user()
    if not admin:
        return jsonify({'error': '管理员不存在'}), 404
    data = request.get_json() or {}
    success, result = user_service.update_user(admin, user_id, data)
    if not success:
        return jsonify({'error': result}), 400
    return jsonify({'message': '用户更新成功', 'data': result}), 200


@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_user(user_id):
    admin = get_current_user()
    success, result = user_service.delete_user(admin, user_id)
    if not success:
        return jsonify({'error': result}), 400
    return jsonify({'message': result}), 200


# ── Password Management ──

@admin_bp.route('/users/<int:user_id>/reset-password', methods=['POST'])
@jwt_required()
@admin_required
def reset_password(user_id):
    admin = get_current_user()
    data = request.get_json() or {}
    success, result = user_service.reset_password(admin, user_id, data.get('new_password'))
    if not success:
        return jsonify({'error': result}), 400
    return jsonify({'message': '密码重置成功', 'data': result}), 200


# ── Permissions ──

@admin_bp.route('/users/<int:user_id>/permissions', methods=['GET'])
@jwt_required()
@admin_required
def get_permissions(user_id):
    perms = user_service.get_user_permissions(user_id)
    return jsonify({'data': perms}), 200


@admin_bp.route('/users/<int:user_id>/permissions', methods=['POST'])
@jwt_required()
@admin_required
def set_permissions(user_id):
    admin = get_current_user()
    data = request.get_json()
    if not data:
        return jsonify({'error': '请求数据为空'}), 400

    scope = data.get('scope')
    if scope not in ('public', 'private'):
        return jsonify({'error': 'scope 必须为 public 或 private'}), 400

    permission_mask = data.get('permission_mask', 0)
    directory_id = data.get('directory_id')

    success, result = user_service.set_user_permissions(
        admin, user_id, scope, permission_mask, directory_id
    )
    if not success:
        return jsonify({'error': result}), 400
    return jsonify({'message': '权限设置成功', 'data': result}), 200


# ── System Config ──

@admin_bp.route('/config', methods=['GET'])
@jwt_required()
@admin_required
def get_config():
    from models.config import SystemConfig
    configs = SystemConfig.query.all()
    return jsonify({'data': [c.to_dict() for c in configs]}), 200


@admin_bp.route('/config', methods=['PUT'])
@jwt_required()
@admin_required
def update_config():
    from models.config import SystemConfig
    admin = get_current_user()
    if not admin:
        return jsonify({'error': '管理员不存在'}), 404
    data = request.get_json()
    if not data or 'key' not in data:
        return jsonify({'error': '缺少配置项key'}), 400

    cfg = SystemConfig.set_value(
        data['key'], data.get('value'),
        description=data.get('description'), user_id=admin.id,
    )
    return jsonify({'message': '配置更新成功', 'data': cfg.to_dict()}), 200
