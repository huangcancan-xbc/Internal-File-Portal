import os
from datetime import timedelta

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    # Flask
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production-at-least-32-bytes')

    # Database
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        'mysql+pymysql://root:123456@localhost:3306/file_control?charset=utf8mb4'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-dev-secret-key-change-in-production-32bytes!')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=2)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    # CORS (comma-separated origins, or '*' for all — NOT recommended with credentials)
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:5173,http://localhost:3000')

    # File storage
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
    PUBLIC_FOLDER = os.path.join(UPLOAD_FOLDER, 'public')
    PRIVATE_FOLDER = os.path.join(UPLOAD_FOLDER, 'private')
    # Flask request size limit (covers multi-file uploads in a single request).
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100MB per request

    # File policy
    ALLOWED_EXTENSIONS = {
        'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf', 'txt', 'csv',
        'md', 'json', 'xml', 'yaml', 'yml', 'log', 'html', 'htm', 'css',
        'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico',
        'zip', 'rar', '7z', 'tar', 'gz', 'bz2',
        'mp3', 'mp4', 'avi', 'mov', 'wav', 'flac',
    }
    # Blocked extensions take precedence over allowed — if an extension
    # appears in both sets, it is blocked. See validators.py allowed_file().
    BLOCKED_EXTENSIONS = {
        'exe', 'bat', 'cmd', 'sh', 'ps1', 'vbs', 'js', 'msi', 'dll', 'scr',
    }
    # Per-file size limit (enforced in upload_file, not by Flask).
    SINGLE_FILE_MAX_SIZE = 50 * 1024 * 1024  # 50MB
    # Total batch upload size limit (sum of all files in one upload request).
    BATCH_MAX_SIZE = 200 * 1024 * 1024  # 200MB

    # Password policy (only length 3-20 required)
    PASSWORD_EXPIRE_DAYS = 90

    # Account lockout
    LOGIN_MAX_ATTEMPTS = 5
    LOGIN_LOCKOUT_MINUTES = 30

    # Session (reserved for future use — currently not enforced by middleware)
    SESSION_TIMEOUT_MINUTES = 30
