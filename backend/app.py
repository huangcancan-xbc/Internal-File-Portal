import os
import sys
from flask import Flask, jsonify
from flask_jwt_extended import JWTManager
from config import Config
from models import db
from models.user import User, UserPermission, ROLE_ADMIN, ROLE_USER, PERM_ALL, PERM_VIEW, PERM_UPLOAD, PERM_DOWNLOAD
from services.file_service import init_root_directories


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    backend_dir = os.path.abspath(os.path.dirname(__file__))
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)

    db.init_app(app)
    jwt = JWTManager(app)

    @jwt.user_lookup_loader
    def user_lookup_callback(_jwt_header, jwt_data):
        identity = jwt_data['sub']
        return User.query.get(int(identity))

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({'error': 'Token已过期，请重新登录'}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({'error': '无效的Token'}), 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({'error': '请先登录'}), 401

    from blueprints.auth import auth_bp
    from blueprints.admin import admin_bp
    from blueprints.file import file_bp
    from blueprints.audit import audit_bp
    from blueprints.announce import announce_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(file_bp)
    app.register_blueprint(audit_bp)
    app.register_blueprint(announce_bp)

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': '接口不存在'}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({'error': '请求方法不允许'}), 405

    @app.errorhandler(413)
    def request_entity_too_large(e):
        return jsonify({'error': '上传文件大小超过限制'}), 413

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({'error': '服务器内部错误'}), 500

    with app.app_context():
        db.create_all()
        _seed_data(app)

    return app


def _seed_data(app):
    """Initialize default admin user and root directories."""
    if not User.query.filter_by(role=ROLE_ADMIN).first():
        admin = User(
            account='admin',
            username='系统管理员',
            department='开发',
            role=ROLE_ADMIN,
        )
        admin.set_password('admin123')
        db.session.add(admin)
        db.session.flush()

        for scope in ('public', 'private'):
            perm = UserPermission(user_id=admin.id, scope=scope, permission_mask=PERM_ALL)
            db.session.add(perm)

        db.session.commit()
        print('[INIT] 管理员已创建: admin / admin123')

    init_root_directories()


if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)
