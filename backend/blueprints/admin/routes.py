from flask import request, jsonify
from flask_jwt_extended import jwt_required
from blueprints.admin import admin_bp
from utils.permissions import admin_required, get_current_user
from utils.request import get_client_ip, get_client_ua
from services import user_service
from services.user_service import _audit
from models.user import User
from models.file import FileRecord
from models.log import AuditLog
from models import db

# ── Dashboard Stats ──

@admin_bp.route('/stats', methods=['GET'])
@jwt_required()
@admin_required
def get_stats():
    """Return aggregated statistics for the dashboard."""
    users_count = User.query.filter(User.status != 'deleted').count()
    active_users = User.query.filter_by(status='active').count()
    files_count = FileRecord.query.filter_by(status='active').count()
    total_size = db.session.query(
        db.func.coalesce(db.func.sum(FileRecord.file_size), 0)
    ).filter_by(status='active').scalar()
    logs_count = AuditLog.query.count()
    deleted_files = FileRecord.query.filter_by(status='deleted').count()

    return jsonify({'data': {
        'users': users_count,
        'active_users': active_users,
        'files': files_count,
        'total_size': total_size,
        'logs': logs_count,
        'deleted_files': deleted_files,
    }}), 200


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


# ── Device Management ──

@admin_bp.route('/users/<int:user_id>/device', methods=['GET'])
@jwt_required()
@admin_required
def get_user_device(user_id):
    """Get user's registered device info."""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': '用户不存在'}), 404
    return jsonify({'data': {
        'serial_number': user.serial_number,
    }}), 200


@admin_bp.route('/users/<int:user_id>/device', methods=['PUT'])
@jwt_required()
@admin_required
def update_user_device(user_id):
    """Register/update device info for a user."""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': '用户不存在'}), 404
    data = request.get_json()
    if not data:
        return jsonify({'error': '请求数据为空'}), 400
    user.serial_number = data.get('serial_number', user.serial_number or '')[:128]
    db.session.commit()
    log = AuditLog(
        user_id=user.id, account=user.account, username=user.username,
        ip=get_client_ip(), user_agent=get_client_ua(), module='user', action='update_user',
        detail=f'更新了设备信息（序列号: {user.serial_number}）', status='success',
    )
    db.session.add(log)
    db.session.commit()
    return jsonify({'message': '设备信息已更新', 'data': {
        'serial_number': user.serial_number,
    }}), 200


@admin_bp.route('/users/<int:user_id>/device', methods=['DELETE'])
@jwt_required()
@admin_required
def clear_user_device(user_id):
    """Clear device binding for a user."""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': '用户不存在'}), 404
    user.serial_number = None
    db.session.commit()
    return jsonify({'message': '设备绑定已清除'}), 200
