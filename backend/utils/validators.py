import os
from flask import current_app


def sanitize_filename(filename):
    """Sanitize filename to prevent path traversal.

    Strips directory components (.., /, \\) and keeps only the safe basename.
    """
    if not filename:
        return ''
    # Extract basename to strip any path components
    safe = os.path.basename(filename)
    # On Windows, os.path.basename may keep leading spaces or dots; strip them
    safe = safe.strip('. ')
    if not safe:
        return 'unnamed'
    return safe


def validate_scope(scope):
    """Validate scope value against whitelist. Returns True if valid."""
    return scope in ('public', 'private')


def validate_password(password):
    """Validate password: length must be between 3 and 20 characters."""
    if not password:
        return False, '密码不能为空'
    if len(password) < 3:
        return False, '密码长度不能少于3个字符'
    if len(password) > 20:
        return False, '密码长度不能超过20个字符'
    return True, ''


def allowed_file(filename):
    """Check if file extension is allowed.

    Precedence: BLOCKED_EXTENSIONS takes priority over ALLOWED_EXTENSIONS.
    If an extension appears in both sets, it is blocked.
    Files without any '.' are always rejected.
    """
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
