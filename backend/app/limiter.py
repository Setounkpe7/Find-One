from starlette.requests import Request
from slowapi import Limiter
from slowapi.util import get_remote_address


def get_client_ip(request: Request) -> str:
    """Resolve the real client IP behind Vercel's proxy.

    Vercel forwards the original client in X-Forwarded-For (comma-separated,
    client first). Without this, request.client.host is Vercel's internal IP
    and every user would share a single rate-limit bucket.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        first = forwarded.split(",")[0].strip()
        if first:
            return first
    return get_remote_address(request)


limiter = Limiter(key_func=get_client_ip)
