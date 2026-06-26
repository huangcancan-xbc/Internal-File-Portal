"""
Middleware module for request/response processing.

Provides CORS initialization for the Flask app. Additional middleware
(request logging, rate limiting, request ID tracking) can be added here.
"""

from flask_cors import CORS


def init_cors(app):
    """Initialize CORS for the Flask application.

    Reads allowed origins from the CORS_ORIGINS config (comma-separated).
    Defaults to localhost dev origins. In production, set CORS_ORIGINS env var
    e.g. "https://example.com,https://app.example.com".
    Use '*' to allow all origins (disables credentials mode).
    """
    origins = app.config.get('CORS_ORIGINS', 'http://localhost:5173,http://localhost:3000')
    use_creds = True
    if isinstance(origins, str):
        if origins == '*':
            use_creds = False
        else:
            origins = [o.strip() for o in origins.split(',') if o.strip()]
    CORS(app, resources={r"/api/*": {"origins": origins}}, supports_credentials=use_creds)
