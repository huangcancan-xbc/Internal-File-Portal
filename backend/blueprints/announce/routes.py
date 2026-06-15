from flask import request, jsonify
from flask_jwt_extended import jwt_required
from blueprints.announce import announce_bp
from utils.permissions import admin_required, get_current_user
from models import db
from models.announcement import Announcement


@announce_bp.route('/', methods=['GET'])
@jwt_required()
def list_announcements():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    pagination = Announcement.query.order_by(Announcement.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False)
    return jsonify({
        'data': {
            'items': [a.to_dict() for a in pagination.items],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages,
        }
    }), 200


@announce_bp.route('/', methods=['POST'])
@jwt_required()
@admin_required
def create_announcement():
    admin = get_current_user()
    data = request.get_json()
    if not data:
        return jsonify({'error': '请求数据为空'}), 400

    title = data.get('title', '').strip()
    content = data.get('content', '').strip()
    if not title:
        return jsonify({'error': '标题不能为空'}), 400
    if not content:
        return jsonify({'error': '内容不能为空'}), 400

    ann = Announcement(title=title, content=content, created_by=admin.id)
    db.session.add(ann)
    db.session.commit()

    return jsonify({'message': '公告发布成功', 'data': ann.to_dict()}), 201


@announce_bp.route('/<int:ann_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_announcement(ann_id):
    ann = Announcement.query.get(ann_id)
    if not ann:
        return jsonify({'error': '公告不存在'}), 404
    db.session.delete(ann)
    db.session.commit()
    return jsonify({'message': '公告已删除'}), 200
