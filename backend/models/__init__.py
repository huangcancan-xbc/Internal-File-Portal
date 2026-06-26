from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy

# Shared SQLAlchemy instance — used by all models and the app factory.
db = SQLAlchemy()

def fmt_utc(dt):
    """Format datetime as ISO-8601 with Z suffix (UTC).

    Handles both timezone-aware and naive datetimes.
    Naive datetimes are assumed to be UTC (MySQL DATETIME has no timezone info).
    """
    if dt is None:
        return None
    # Convert naive datetime to UTC-aware
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    elif dt.tzinfo != timezone.utc:
        dt = dt.astimezone(timezone.utc)
    # Use isoformat() to preserve sub-second precision, then ensure Z suffix
    s = dt.isoformat()
    # Replace +00:00 timezone offset with Z
    if s.endswith('+00:00'):
        s = s[:-6] + 'Z'
    elif not s.endswith('Z'):
        s += 'Z'
    return s

# ──────────────────────────────────────────────────────────────
# Model imports MUST remain at the bottom of this file.
# All models depend on `db` and `fmt_utc` defined above.
# Moving these to the top will cause circular import errors.
# ──────────────────────────────────────────────────────────────
from models.user import User
from models.file import FileRecord
from models.log import AuditLog, CopyAudit
from models.config import SystemConfig
from models.announcement import Announcement
