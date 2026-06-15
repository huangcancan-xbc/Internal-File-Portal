from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

def fmt_utc(dt):
    """Format datetime as ISO-8601 with Z suffix (UTC)."""
    if dt is None:
        return None
    s = dt.isoformat()
    return s + 'Z' if 'Z' not in s and '+' not in s else s

from models.user import User
from models.file import FileRecord
from models.log import AuditLog, CopyAudit
from models.config import SystemConfig
from models.announcement import Announcement
