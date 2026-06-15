from flask import Blueprint

file_bp = Blueprint('file', __name__, url_prefix='/api/files')

from blueprints.file import routes  # noqa
