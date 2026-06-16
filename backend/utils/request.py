import ipaddress
import logging
from flask import request

logger = logging.getLogger(__name__)

_LOOPBACK = {'127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost'}


def _is_valid_ip(ip_str):
    """验证IP地址格式是否合法（支持IPv4和IPv6）"""
    try:
        ipaddress.ip_address(ip_str)
        return True
    except ValueError:
        return False


def _is_loopback_or_private(ip_str):
    """检查是否为环回地址或私有地址"""
    if ip_str in _LOOPBACK:
        return True
    try:
        ip = ipaddress.ip_address(ip_str)
        # 只过滤环回地址，保留私有IP（因为内网部署需要）
        return ip.is_loopback
    except ValueError:
        return False


def get_client_ip():
    """Get the real client IP safely to prevent IP spoofing.
    
    优先级顺序:
    1. X-Real-IP (最安全 - Nginx直接重写)
    2. X-Forwarded-For 最右侧IP (次安全 - 从右向左读取)
    3. request.remote_addr (直接连接IP)
    4. 'unknown' (兜底)
    
    Returns:
        str: 客户端IP地址，验证后的合法格式
    """
    xri = request.headers.get('X-Real-IP', '').strip()
    xff = request.headers.get('X-Forwarded-For', '')
    remote = request.remote_addr or ''
    
    # 调试日志（生产环境可关闭）
    logger.debug(f"IP Sources - X-Real-IP: [{xri}], X-Forwarded-For: [{xff}], remote_addr: [{remote}]")
    
    # 1. 优先使用 X-Real-IP
    # 在使用 Nginx 等反向代理时，通常会通过 proxy_set_header X-Real-IP $remote_addr; 强制重写该头。
    # 由于是直接重写而不是追加，伪造难度最高，最安全。
    if xri and _is_valid_ip(xri) and not _is_loopback_or_private(xri):
        logger.debug(f"Using X-Real-IP: {xri}")
        return xri

    # 2. 回退使用 X-Forwarded-For
    # 标准格式为: client_ip, proxy1_ip, proxy2_ip
    # 攻击者可以伪造请求头 "X-Forwarded-For: 8.8.8.8"，经过真实代理后会变成 "8.8.8.8, 真实IP"
    # 因此从左向右读取是不安全的。从右向左读取最靠近服务器的可信IP。
    if xff:
        ips = [ip.strip() for ip in xff.split(',') if ip.strip()]
        # 从右往左寻找第一个合法且非环回的IP
        for ip in reversed(ips):
            if _is_valid_ip(ip) and not _is_loopback_or_private(ip):
                logger.debug(f"Using X-Forwarded-For IP: {ip}")
                return ip

    # 3. 最后回退到直接连接的 IP
    if remote and _is_valid_ip(remote) and not _is_loopback_or_private(remote):
        logger.debug(f"Using remote_addr: {remote}")
        return remote
    
    # 4. 如果所有来源都是环回地址（开发环境场景），返回remote_addr
    if remote and _is_valid_ip(remote):
        logger.debug(f"Using loopback remote_addr: {remote}")
        return remote

    logger.warning(f"Unable to determine valid IP - X-Real-IP: [{xri}], XFF: [{xff}], remote: [{remote}]")
    return 'unknown'


def get_client_ua():
    """Get user-agent, truncated to 500 chars."""
    return (request.headers.get('User-Agent', '') or '')[:500]
