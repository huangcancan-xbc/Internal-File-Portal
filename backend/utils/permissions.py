from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from models.user import User


def admin_required(fn):
    """Decorator: require admin role."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or not user.is_admin():
            return jsonify({'error': '权限不足，仅管理员可操作'}), 403
        return fn(*args, **kwargs)
    return wrapper


def get_current_user():
    """Get current authenticated user from JWT."""
    identity = get_jwt_identity()
    if not identity:
        return None
    return User.query.get(int(identity))
