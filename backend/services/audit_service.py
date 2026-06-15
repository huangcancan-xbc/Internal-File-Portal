from models import db
from models.log import AuditLog, CopyAudit


def query_audit_logs(page=1, per_page=50, module=None, action=None,
                     user_account=None, status=None, start_date=None, end_date=None):
    """Query general audit logs with filters."""
    query = AuditLog.query

    if module:
        query = query.filter_by(module=module)
    if action:
        query = query.filter_by(action=action)
    if user_account:
        query = query.filter(AuditLog.account.like(f'%{user_account}%'))
    if status:
        query = query.filter_by(status=status)
    if start_date:
        query = query.filter(AuditLog.created_at >= start_date)
    if end_date:
        query = query.filter(AuditLog.created_at <= end_date)

    pagination = query.order_by(AuditLog.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    return {
        'items': [log.to_dict() for log in pagination.items],
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
        'pages': pagination.pages,
    }


def query_copy_audits(page=1, per_page=50, user_account=None, copy_type=None,
                      start_date=None, end_date=None):
    """Query copy-specific audit logs."""
    query = CopyAudit.query

    if user_account:
        query = query.filter(CopyAudit.account.like(f'%{user_account}%'))
    if copy_type:
        query = query.filter_by(copy_type=copy_type)
    if start_date:
        query = query.filter(CopyAudit.created_at >= start_date)
    if end_date:
        query = query.filter(CopyAudit.created_at <= end_date)

    pagination = query.order_by(CopyAudit.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    return {
        'items': [log.to_dict() for log in pagination.items],
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
        'pages': pagination.pages,
    }
