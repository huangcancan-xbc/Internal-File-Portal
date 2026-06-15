from flask import Blueprint

announce_bp = Blueprint('announce', __name__, url_prefix='/api/announcements')

from blueprints.announce import routes  # noqa
