from flask import request

_LOOPBACK = {'127.0.0.1', '::1', '::ffff:127.0.0.1'}


def get_client_ip():
    """Get the real client LAN IP, skipping loopback addresses."""
    # 1. Try X-Forwarded-For (set by reverse proxy / load balancer)
    xff = request.headers.get('X-Forwarded-For', '')
    if xff:
        for part in xff.split(','):
            ip = part.strip()
            if ip and ip not in _LOOPBACK:
                return ip

    # 2. Try X-Real-IP (set by some proxies like nginx)
    xri = request.headers.get('X-Real-IP', '').strip()
    if xri and xri not in _LOOPBACK:
        return xri

    # 3. Fallback to remote_addr, skip loopback
    addr = request.remote_addr or ''
    if addr and addr not in _LOOPBACK:
        return addr

    # 4. All loopback — return as-is rather than 'unknown'
    return addr or 'unknown'


def get_client_ua():
    """Get user-agent, truncated to 500 chars."""
    return (request.headers.get('User-Agent', '') or '')[:500]
