import re
from flask import current_app


def validate_password(password):
    """Validate password against global policy. Returns (valid, error_message)."""
    if not password:
        return False, '密码不能为空'

    min_len = current_app.config.get('PASSWORD_MIN_LENGTH', 8)
    if len(password) < min_len:
        return False, f'密码长度不能少于{min_len}个字符'

    if current_app.config.get('PASSWORD_REQUIRE_UPPER', True):
        if not re.search(r'[A-Z]', password):
            return False, '密码必须包含大写字母'

    if current_app.config.get('PASSWORD_REQUIRE_LOWER', True):
        if not re.search(r'[a-z]', password):
            return False, '密码必须包含小写字母'

    if current_app.config.get('PASSWORD_REQUIRE_DIGIT', True):
        if not re.search(r'\d', password):
            return False, '密码必须包含数字'

    if current_app.config.get('PASSWORD_REQUIRE_SPECIAL', True):
        if not re.search(r'[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;\'`~]', password):
            return False, '密码必须包含特殊字符'

    return True, ''


def allowed_file(filename):
    """Check if file extension is allowed."""
    if '.' not in filename:
        return False
    ext = filename.rsplit('.', 1)[1].lower()
    blocked = current_app.config.get('BLOCKED_EXTENSIONS', set())
    if ext in blocked:
        return False
    allowed = current_app.config.get('ALLOWED_EXTENSIONS', set())
    return ext in allowed


def get_file_extension(filename):
    """Extract lowercase file extension."""
    if '.' in filename:
        return filename.rsplit('.', 1)[1].lower()
    return ''
