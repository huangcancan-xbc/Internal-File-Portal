from flask import request, jsonify
from flask_jwt_extended import jwt_required
from blueprints.audit import audit_bp
from utils.permissions import admin_required
from services import audit_service


def _parse_filters():
    """Extract common filter params from request args into a dict.

    Note: user_account and username are partial-match (LIKE) at the service layer;
    module, action, ip, status are exact-match.
    """
    return {
        'module': request.args.get('module'),
        'action': request.args.get('action'),
        'user_account': request.args.get('user_account'),
        'username': request.args.get('username'),
        'ip': request.args.get('ip'),
        'status': request.args.get('status'),
        'start_date': request.args.get('start_date'),
        'end_date': request.args.get('end_date'),
        'hide_deleted': request.args.get('hide_deleted', '0') == '1',
    }


def _parse_pagination():
    """Extract pagination params from request args (per_page capped at 200)."""
    return (
        request.args.get('page', 1, type=int),
        min(request.args.get('per_page', 50, type=int), 200),
    )


@audit_bp.route('/log-options', methods=['GET'])
@jwt_required()
@admin_required
def get_log_options():
    """Return distinct values for audit log filter dropdowns."""
    hide_deleted = request.args.get('hide_deleted', '0') == '1'
    data = audit_service.get_filter_options(hide_deleted=hide_deleted)
    return jsonify({'data': data}), 200


@audit_bp.route('/logs', methods=['GET'])
@jwt_required()
@admin_required
def get_audit_logs():
    page, per_page = _parse_pagination()
    filters = _parse_filters()
    result = audit_service.query_audit_logs(page, per_page, filters)
    return jsonify({'data': result}), 200


@audit_bp.route('/copy', methods=['GET'])
@jwt_required()
@admin_required
def get_copy_audits():
    """Query copy-specific audit logs.

    Uses a separate (narrower) filter set than _parse_filters() because
    CopyAudit has no module/action/status columns.
    """
    page, per_page = _parse_pagination()
    filters = {
        'user_account': request.args.get('user_account'),
        'start_date': request.args.get('start_date'),
        'end_date': request.args.get('end_date'),
        'hide_deleted': request.args.get('hide_deleted', '0') == '1',
    }
    result = audit_service.query_copy_audits(page, per_page, filters)
    return jsonify({'data': result}), 200
