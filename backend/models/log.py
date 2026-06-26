from datetime import datetime, timezone
from models import db, fmt_utc


class AuditLog(db.Model):
    """General operation audit log — append-only, never deleted.

    Policy: rows are only ever inserted, never updated or deleted.
    This is not enforced at the DB level (no triggers), but all application
    code must respect this invariant.
    """
    __tablename__ = 'audit_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    account = db.Column(db.String(64), nullable=True)
    username = db.Column(db.String(64), nullable=True)
    ip = db.Column(db.String(64), nullable=True)
    user_agent = db.Column(db.String(512), nullable=True)
    module = db.Column(db.String(64), nullable=False)  # auth / user / file / config / system
    action = db.Column(db.String(64), nullable=False)  # login / upload / download / delete / ...
    detail = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), nullable=False, default='success')  # success / failure
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'account': self.account,
            'username': self.username,
            'ip': self.ip,
            'user_agent': self.user_agent,
            'module': self.module,
            'action': self.action,
            'detail': self.detail,
            'status': self.status,
            'created_at': fmt_utc(self.created_at),
        }


class CopyAudit(db.Model):
    """File copy audit — high-priority tracking."""
    __tablename__ = 'copy_audits'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    account = db.Column(db.String(64), nullable=False)
    username = db.Column(db.String(64), nullable=False)
    file_id = db.Column(db.Integer, db.ForeignKey('file_records.id'), nullable=True)
    source_filename = db.Column(db.String(512), nullable=False)
    source_path = db.Column(db.String(1024), nullable=False)
    target_path = db.Column(db.String(1024), nullable=False)
    file_size = db.Column(db.BigInteger, nullable=False, default=0)
    # Copy scope: 'internal' = within the system, 'local' = to local disk, 'external' = to USB/email etc.
    copy_type = db.Column(db.String(20), nullable=False)
    ip = db.Column(db.String(64), nullable=True)
    user_agent = db.Column(db.String(512), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'account': self.account,
            'username': self.username,
            'file_id': self.file_id,
            'source_filename': self.source_filename,
            'source_path': self.source_path,
            'target_path': self.target_path,
            'file_size': self.file_size,
            'copy_type': self.copy_type,
            'ip': self.ip,
            'user_agent': self.user_agent,
            'created_at': fmt_utc(self.created_at),
        }
