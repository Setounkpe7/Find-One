from types import SimpleNamespace
from app.limiter import get_client_ip


def _req(headers, client_host="10.0.0.1"):
    return SimpleNamespace(
        headers=headers,
        client=SimpleNamespace(host=client_host),
    )


def test_uses_first_xff_ip_behind_proxy():
    req = _req({"x-forwarded-for": "203.0.113.7, 70.41.3.18, 150.172.238.178"})
    assert get_client_ip(req) == "203.0.113.7"


def test_falls_back_to_client_host_without_xff():
    req = _req({})
    assert get_client_ip(req) == "10.0.0.1"


def test_ignores_empty_xff_header():
    req = _req({"x-forwarded-for": "  "})
    assert get_client_ip(req) == "10.0.0.1"
