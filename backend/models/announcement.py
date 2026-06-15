from datetime import datetime, timezone
from models import db, fmt_utc


class Announcement(db.Model):
    """System announcements / notifications."""
    __tablename__ = 'announcements'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(256), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        author_name = None
        author_account = None
        if self.created_by:
            from models.user import User
            u = User.query.get(self.created_by)
            if u:
                author_name = u.username
                author_account = u.account
        return {
            'id': self.id,
            'title': self.title,
            'content': self.content,
            'created_by': self.created_by,
            'author_name': author_name,
            'author_account': author_account,
            'created_at': fmt_utc(self.created_at),
        }
