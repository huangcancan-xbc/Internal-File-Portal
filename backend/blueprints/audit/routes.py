from flask import request, jsonify
from flask_jwt_extended import jwt_required
from blueprints.audit import audit_bp
from utils.permissions import admin_required
from services import audit_service


@audit_bp.route('/logs', methods=['GET'])
@jwt_required()
@admin_required
def get_audit_logs():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    module = request.args.get('module')
    action = request.args.get('action')
    user_account = request.args.get('user_account')
    status = request.args.get('status')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    result = audit_service.query_audit_logs(
        page, per_page, module, action, user_account, status,
        start_date, end_date,
    )
    return jsonify({'data': result}), 200


@audit_bp.route('/copy', methods=['GET'])
@jwt_required()
@admin_required
def get_copy_audits():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    user_account = request.args.get('user_account')
    copy_type = request.args.get('copy_type')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    result = audit_service.query_copy_audits(
        page, per_page, user_account, copy_type,
        start_date, end_date,
    )
    return jsonify({'data': result}), 200
