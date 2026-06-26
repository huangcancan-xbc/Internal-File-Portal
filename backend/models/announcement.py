from datetime import datetime, timezone
from models import db, fmt_utc


class Announcement(db.Model):
    """System announcements / notifications.

    Note: Announcements use hard-delete (db.session.delete), not soft-delete.
    This is a deliberate design choice — announcements are short-lived and
    don't require the same recovery guarantees as files.
    """
    __tablename__ = 'announcements'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(256), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    author = db.relationship('User', foreign_keys=[created_by])

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'content': self.content,
            'created_by': self.created_by,
            'author_name': self.author.username if self.author else None,
            'author_account': self.author.account if self.author else None,
            'created_at': fmt_utc(self.created_at),
        }
