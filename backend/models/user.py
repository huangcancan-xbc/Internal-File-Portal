from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, fmt_utc


PERM_VIEW = 1
PERM_UPLOAD = 2
PERM_DOWNLOAD = 4
PERM_EXPORT = 8
PERM_COPY = 16
PERM_DIR_MANAGE = 32
PERM_ALL = 63

ROLE_ADMIN = 'admin'
ROLE_USER = 'user'

DEPT_CHOICES = ['开发', '售前', '售后']


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    account = db.Column(db.String(64), unique=True, nullable=False, index=True)   # 登录账号
    username = db.Column(db.String(64), nullable=False)                            # 真实姓名
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, default=ROLE_USER)
    department = db.Column(db.String(128), default='')                             # 部门：开发/售前/售后
    serial_number = db.Column(db.String(128), nullable=True)                       # 硬件序列号
    status = db.Column(db.String(20), nullable=False, default='active')
    login_attempts = db.Column(db.Integer, default=0)
    locked_until = db.Column(db.DateTime, nullable=True)
    last_login_at = db.Column(db.DateTime, nullable=True)
    last_login_ip = db.Column(db.String(64), nullable=True)
    password_changed_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    permissions = db.relationship('UserPermission', backref='user', lazy='dynamic',
                                  cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        self.password_changed_at = datetime.now(timezone.utc)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def is_locked(self):
        if self.status == 'locked' and self.locked_until:
            if datetime.now(timezone.utc) < self.locked_until:
                return True
            self.status = 'active'
            self.login_attempts = 0
            self.locked_until = None
            db.session.commit()
        return False

    def is_admin(self):
        return self.role == ROLE_ADMIN

    def to_dict(self, include_permissions=False):
        d = {
            'id': self.id,
            'account': self.account,
            'username': self.username,
            'role': self.role,
            'department': self.department,
            'serial_number': self.serial_number,
            'status': self.status,
            'last_login_at': fmt_utc(self.last_login_at),
            'last_login_ip': self.last_login_ip,
            'password_changed_at': fmt_utc(self.password_changed_at),
            'created_at': fmt_utc(self.created_at),
        }
        if include_permissions:
            d['permissions'] = [p.to_dict() for p in self.permissions]
        return d


class UserPermission(db.Model):
    __tablename__ = 'user_permissions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    scope = db.Column(db.String(20), nullable=False)
    directory_id = db.Column(db.Integer, db.ForeignKey('directories.id'), nullable=True)
    permission_mask = db.Column(db.Integer, nullable=False, default=0)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'scope', 'directory_id', name='uq_user_scope_dir'),
    )

    def has_permission(self, perm):
        return bool(self.permission_mask & perm)

    def grant(self, perm):
        self.permission_mask |= perm

    def revoke(self, perm):
        self.permission_mask &= ~perm

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'scope': self.scope,
            'directory_id': self.directory_id,
            'permission_mask': self.permission_mask,
            'permissions': {
                'view': self.has_permission(PERM_VIEW),
                'upload': self.has_permission(PERM_UPLOAD),
                'download': self.has_permission(PERM_DOWNLOAD),
                'export': self.has_permission(PERM_EXPORT),
                'copy': self.has_permission(PERM_COPY),
                'dir_manage': self.has_permission(PERM_DIR_MANAGE),
            }
        }
