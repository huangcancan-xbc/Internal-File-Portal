from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from blueprints.auth import auth_bp
from services.auth_service import login, logout
from models.user import User
from utils.permissions import get_current_user
from models import db
from models.log import AuditLog


@auth_bp.route('/login', methods=['POST'])
def api_login():
    data = request.get_json()
    if not data:
        return jsonify({'error': '请求数据为空'}), 400

    account = data.get('account', '').strip()
    password = data.get('password', '')
    remember = data.get('remember', False)

    if not account or not password:
        return jsonify({'error': '账号和密码不能为空'}), 400

    success, result = login(account, password, remember)
    if not success:
        return jsonify({'error': result}), 401

    return jsonify({'message': '登录成功', 'data': result}), 200


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def api_logout():
    user = get_current_user()
    if user:
        logout(user)
    return jsonify({'message': '已登出'}), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def api_me():
    user = get_current_user()
    if not user:
        return jsonify({'error': '用户不存在'}), 404
    return jsonify({'data': user.to_dict(include_permissions=True)}), 200


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def api_refresh():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.status != 'active':
        return jsonify({'error': '用户无效或已禁用'}), 401
    from flask_jwt_extended import create_access_token
    access_token = create_access_token(identity=str(user_id))
    return jsonify({'access_token': access_token}), 200


@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def api_change_password():
    user = get_current_user()
    if not user:
        return jsonify({'error': '用户不存在'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': '请求数据为空'}), 400

    old_pwd = data.get('old_password', '')
    new_pwd = data.get('new_password', '')

    if not old_pwd or not new_pwd:
        return jsonify({'error': '旧密码和新密码不能为空'}), 400

    if not user.check_password(old_pwd):
        return jsonify({'error': '旧密码不正确'}), 400

    from utils.validators import validate_password
    valid, msg = validate_password(new_pwd)
    if not valid:
        return jsonify({'error': msg}), 400

    user.set_password(new_pwd)

    ip = request.headers.get('X-Forwarded-For', request.remote_addr or '')
    ua = request.headers.get('User-Agent', '')[:500]
    log = AuditLog(
        user_id=user.id, account=user.account, username=user.username,
        ip=ip, user_agent=ua, module='user', action='change_password',
        detail='修改了个人密码', status='success',
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({'message': '密码修改成功'}), 200
