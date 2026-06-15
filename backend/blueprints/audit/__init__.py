from flask import Blueprint

audit_bp = Blueprint('audit', __name__, url_prefix='/api/audit')

from blueprints.audit import routes  # noqa
