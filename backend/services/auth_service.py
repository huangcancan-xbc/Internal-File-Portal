from datetime import datetime, timedelta, timezone
from flask import current_app, request
from flask_jwt_extended import create_access_token, create_refresh_token
from models import db
from models.user import User
from models.log import AuditLog
from utils.request import get_client_ip, get_client_ua


def login(account, password, remember=False):
    """Authenticate user by account. Returns (success, data_or_error)."""
    ip = get_client_ip()
    ua = get_client_ua()

    user = User.query.filter_by(account=account).first()
    if not user:
        _log_login(None, account, ip, ua, 'failure', '账号不存在')
        return False, '用户名或密码错误'

    if user.status == 'disabled':
        _log_login(user, account, ip, ua, 'failure', '账号已禁用')
        return False, '账号已被禁用，请联系管理员'

    if user.status == 'deleted':
        _log_login(user, account, ip, ua, 'failure', '账号已删除')
        return False, '账号不存在'

    if user.is_locked():
        _log_login(user, account, ip, ua, 'failure', '账号已锁定')
        return False, '账号已锁定，请稍后再试'

    if not user.check_password(password):
        user.login_attempts = (user.login_attempts or 0) + 1
        max_attempts = current_app.config.get('LOGIN_MAX_ATTEMPTS', 5)
        if user.login_attempts >= max_attempts:
            user.status = 'locked'
            lockout_min = current_app.config.get('LOGIN_LOCKOUT_MINUTES', 30)
            user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=lockout_min)
            db.session.commit()
            _log_login(user, account, ip, ua, 'failure', f'密码错误达{max_attempts}次，账号已锁定')
            return False, f'密码错误次数过多，账号已锁定{lockout_min}分钟'
        db.session.commit()
        remaining = max_attempts - user.login_attempts
        _log_login(user, account, ip, ua, 'failure', f'密码错误，剩余{remaining}次')
        return False, f'账号或密码错误（剩余{remaining}次尝试机会）'

    serial = request.headers.get('X-Serial-Number', '').strip()
    if user.serial_number and serial != user.serial_number:
        _log_login(user, account, ip, ua, 'failure', '设备未授权')
        return False, '当前设备未授权登录'

    user.login_attempts = 0
    user.locked_until = None
    user.status = 'active'
    user.last_login_at = datetime.now(timezone.utc)
    user.last_login_ip = ip
    db.session.commit()

    expires = None if remember else current_app.config.get('JWT_ACCESS_TOKEN_EXPIRES')
    access_token = create_access_token(identity=str(user.id), expires_delta=expires)
    refresh_token = create_refresh_token(identity=str(user.id)) if remember else None

    _log_login(user, account, ip, ua, 'success')

    return True, {
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': user.to_dict(),
    }


def logout(user):
    log = AuditLog(
        user_id=user.id, account=user.account, username=user.username,
        ip=get_client_ip(), user_agent=get_client_ua(), module='auth', action='logout', status='success',
    )
    db.session.add(log)
    db.session.commit()


def _log_login(user, account, ip, ua, status, detail=None):
    log = AuditLog(
        user_id=user.id if user else None,
        account=account,
        username=user.username if user else None,
        ip=ip, user_agent=ua, module='auth', action='login',
        detail=detail, status=status,
    )
    db.session.add(log)
    db.session.commit()
