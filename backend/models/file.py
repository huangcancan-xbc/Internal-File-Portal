from datetime import datetime, timezone
from models import db, fmt_utc


class Directory(db.Model):
    """Directory / folder management."""
    __tablename__ = 'directories'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(256), nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey('directories.id'), nullable=True)
    scope = db.Column(db.String(20), nullable=False, default='public')  # public / private
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # NULL for public
    path = db.Column(db.String(512), nullable=False)  # full virtual path e.g. /public/docs
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    children = db.relationship('Directory', backref=db.backref('parent', remote_side=[id]),
                               lazy='dynamic')
    files = db.relationship('FileRecord', backref='directory', lazy='dynamic')

    __table_args__ = (
        db.UniqueConstraint('path', name='uq_directory_path'),
    )

    def to_dict(self, include_children=False):
        d = {
            'id': self.id,
            'name': self.name,
            'parent_id': self.parent_id,
            'scope': self.scope,
            'owner_id': self.owner_id,
            'path': self.path,
            'created_at': fmt_utc(self.created_at),
        }
        if include_children:
            d['children'] = [c.to_dict() for c in self.children]
            d['files'] = [f.to_dict() for f in self.files]
        return d


class FileRecord(db.Model):
    """File metadata record."""
    __tablename__ = 'file_records'

    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(512), nullable=False)
    original_filename = db.Column(db.String(512), nullable=False)
    file_path = db.Column(db.String(1024), nullable=False)  # physical storage path
    file_size = db.Column(db.BigInteger, nullable=False, default=0)
    file_type = db.Column(db.String(64), nullable=True)  # extension
    mime_type = db.Column(db.String(128), nullable=True)
    directory_id = db.Column(db.Integer, db.ForeignKey('directories.id'), nullable=True)
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    scope = db.Column(db.String(20), nullable=False, default='public')  # public / private
    status = db.Column(db.String(20), nullable=False, default='active')  # active / deleted
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        owner_name = None
        owner_account = None
        if self.owner_id:
            from models.user import User
            owner = User.query.get(self.owner_id)
            if owner:
                owner_name = owner.username
                owner_account = owner.account
        return {
            'id': self.id,
            'filename': self.filename,
            'original_filename': self.original_filename,
            'file_size': self.file_size,
            'file_type': self.file_type,
            'mime_type': self.mime_type,
            'directory_id': self.directory_id,
            'owner_id': self.owner_id,
            'owner_name': owner_name,
            'owner_account': owner_account,
            'scope': self.scope,
            'status': self.status,
            'created_at': fmt_utc(self.created_at),
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
