from models import db
from models.log import AuditLog, CopyAudit
from models.user import User


def _active_account_subquery():
    """Subquery: accounts of users whose status is 'active'."""
    return db.session.query(User.account).filter(User.status == 'active')


def _apply_common_filters(query, model, filters, *, hide_deleted_col='account'):
    """Apply shared filter dict to a query.

    Args:
        query: SQLAlchemy query
        model: the model class (AuditLog or CopyAudit)
        filters: dict of filter params (values may be None/empty)
        hide_deleted_col: column name on model to match against active accounts
    """
    if filters.get('hide_deleted'):
        col = getattr(model, hide_deleted_col)
        query = query.filter(col.in_(_active_account_subquery()))

    if filters.get('module'):
        query = query.filter_by(module=filters['module'])
    if filters.get('action'):
        query = query.filter_by(action=filters['action'])
    if filters.get('user_account'):
        query = query.filter(model.account.like(f'%{filters["user_account"]}%'))
    if filters.get('username'):
        query = query.filter(model.username.like(f'%{filters["username"]}%'))
    if filters.get('ip'):
        query = query.filter(model.ip == filters['ip'])
    if filters.get('status'):
        query = query.filter_by(status=filters['status'])
    if filters.get('start_date'):
        query = query.filter(model.created_at >= filters['start_date'])
    if filters.get('end_date'):
        query = query.filter(model.created_at <= filters['end_date'])

    return query


def _paginate(query, page, per_page):
    """Execute paginated query and return standard result dict."""
    pagination = query.order_by(
        (CopyAudit if query.column_descriptions[0]['type'] is CopyAudit else AuditLog).created_at.desc()
    ).paginate(page=page, per_page=per_page, error_out=False)
    return {
        'items': [item.to_dict() for item in pagination.items],
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
        'pages': pagination.pages,
    }


def query_audit_logs(page=1, per_page=50, filters=None):
    """Query general audit logs with filters dict."""
    filters = filters or {}
    query = _apply_common_filters(AuditLog.query, AuditLog, filters)
    return _paginate(query, page, per_page)


def query_copy_audits(page=1, per_page=50, filters=None):
    """Query copy-specific audit logs with filters dict."""
    filters = filters or {}
    query = CopyAudit.query

    if filters.get('hide_deleted'):
        query = query.filter(CopyAudit.account.in_(_active_account_subquery()))
    if filters.get('user_account'):
        query = query.filter(CopyAudit.account.like(f'%{filters["user_account"]}%'))
    if filters.get('copy_type'):
        query = query.filter_by(copy_type=filters['copy_type'])
    if filters.get('start_date'):
        query = query.filter(CopyAudit.created_at >= filters['start_date'])
    if filters.get('end_date'):
        query = query.filter(CopyAudit.created_at <= filters['end_date'])

    return _paginate(query, page, per_page)


def get_filter_options(hide_deleted=False):
    """Return distinct values for filter dropdowns.

    When hide_deleted=True, only return values from logs of active users.
    """
    base_account = db.session.query(AuditLog.account).distinct().filter(AuditLog.account.isnot(None))
    base_username = db.session.query(AuditLog.username).distinct().filter(AuditLog.username.isnot(None))
    base_ip = db.session.query(AuditLog.ip).distinct().filter(AuditLog.ip.isnot(None))

    if hide_deleted:
        active = _active_account_subquery()
        base_account = base_account.filter(AuditLog.account.in_(active))
        base_username = base_username.filter(AuditLog.account.in_(active))
        base_ip = base_ip.filter(AuditLog.account.in_(active))

    return {
        'accounts': sorted(r[0] for r in base_account.all()),
        'usernames': sorted(r[0] for r in base_username.all()),
        'actions': sorted(r[0] for r in db.session.query(AuditLog.action).distinct().all()),
        'modules': sorted(r[0] for r in db.session.query(AuditLog.module).distinct().all()),
        'ips': sorted(r[0] for r in base_ip.all()),
    }
