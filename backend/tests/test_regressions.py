import os
import unittest

from flask import Flask
from flask_jwt_extended import JWTManager

from models import db
from models.user import User, ROLE_ADMIN, ROLE_USER
from models.file import Directory, FileRecord
from services import auth_service, file_service


class TestConfig:
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = 'test-jwt-secret'
    JWT_ACCESS_TOKEN_EXPIRES = False
    UPLOAD_FOLDER = ''
    PUBLIC_FOLDER = ''
    PRIVATE_FOLDER = ''


def make_user(account='user', role=ROLE_USER, serial_number=None):
    user = User(account=account, username=account, role=role, serial_number=serial_number)
    user.set_password('Password1!')
    db.session.add(user)
    db.session.flush()
    return user


def make_file(owner, scope='private', directory_id=None, path=None):
    record = FileRecord(
        filename='stored.txt',
        original_filename='report.txt',
        file_path=path or os.path.join('/tmp', f'{owner.account}-report.txt'),
        file_size=5,
        file_type='txt',
        mime_type='text/plain',
        directory_id=directory_id,
        owner_id=owner.id,
        scope=scope,
    )
    db.session.add(record)
    db.session.flush()
    return record


class RegressionTests(unittest.TestCase):
    def setUp(self):
        import tempfile

        self.tmp = tempfile.TemporaryDirectory()
        self.app = Flask(__name__)
        self.app.config.from_object(TestConfig)
        self.app.config['UPLOAD_FOLDER'] = self.tmp.name
        self.app.config['PUBLIC_FOLDER'] = os.path.join(self.tmp.name, 'public')
        self.app.config['PRIVATE_FOLDER'] = os.path.join(self.tmp.name, 'private')
        db.init_app(self.app)
        JWTManager(self.app)
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()
        self.tmp.cleanup()

    def test_existing_users_table_gets_serial_number_column(self):
        from app import _ensure_schema

        db.session.execute(db.text('ALTER TABLE users DROP COLUMN serial_number'))
        db.session.commit()

        _ensure_schema()

        columns = {row[1] for row in db.session.execute(db.text('PRAGMA table_info(users)'))}
        self.assertIn('serial_number', columns)

    def test_login_rejects_bound_user_from_wrong_serial(self):
        with self.app.test_request_context('/api/auth/login', headers={'X-Serial-Number': 'WRONG'}):
            make_user(serial_number='DEVICE-1')
            db.session.commit()

            ok, result = auth_service.login('user', 'Password1!')

            self.assertFalse(ok)
            self.assertEqual(result, '当前设备未授权登录')

    def test_move_private_file_rejects_other_users_private_directory(self):
        with self.app.test_request_context('/api/files/1/move'):
            owner = make_user('owner')
            other = make_user('other')
            other_dir = Directory(
                name='other-private',
                scope='private',
                owner_id=other.id,
                path='/private/other-private',
                created_by=other.id,
            )
            db.session.add(other_dir)
            db.session.flush()
            record = make_file(owner)
            db.session.commit()

            ok, result = file_service.move_file(owner, record.id, other_dir.id)

            self.assertFalse(ok)
            self.assertEqual(result, '目标目录不存在或无权限')

    def test_copy_private_file_rejects_public_target_directory(self):
        with self.app.test_request_context('/api/files/1/copy'):
            owner = make_user('owner')
            public_dir = Directory(
                name='public',
                scope='public',
                owner_id=None,
                path='/public/public',
                created_by=owner.id,
            )
            db.session.add(public_dir)
            db.session.flush()
            source = os.path.join(self.tmp.name, 'source.txt')
            with open(source, 'w', encoding='utf-8') as f:
                f.write('hello')
            record = make_file(owner, path=source)
            db.session.commit()

            ok, result = file_service.copy_file(owner, record.id, public_dir.id)

            self.assertFalse(ok)
            self.assertEqual(result, '目标目录不存在或无权限')


if __name__ == '__main__':
    unittest.main()
