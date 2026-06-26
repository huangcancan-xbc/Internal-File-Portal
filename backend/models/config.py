from datetime import datetime, timezone
from models import db, fmt_utc


class SystemConfig(db.Model):
    """Global system configuration — key-value store."""
    __tablename__ = 'system_configs'

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(128), unique=True, nullable=False)
    value = db.Column(db.Text, nullable=True)
    description = db.Column(db.String(256), nullable=True)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'key': self.key,
            'value': self.value,
            'description': self.description,
            'updated_at': fmt_utc(self.updated_at),
        }

    @staticmethod
    def get_value(key, default=None):
        cfg = SystemConfig.query.filter_by(key=key).first()
        return cfg.value if cfg else default

    @staticmethod
    def set_value(key, value, description=None, user_id=None, commit=True):
        """Create or update a config entry.

        Args:
            commit: If True, commit immediately. Pass False when batching
                    multiple set_value calls in a single transaction.
        """
        cfg = SystemConfig.query.filter_by(key=key).first()
        if cfg:
            cfg.value = value
            cfg.updated_by = user_id
            if description:
                cfg.description = description
        else:
            cfg = SystemConfig(key=key, value=value, description=description, updated_by=user_id)
            db.session.add(cfg)
        if commit:
            db.session.commit()
        return cfg
