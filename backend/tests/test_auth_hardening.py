import time
import jwt as pyjwt
import pytest
import app.services.auth as auth_mod
from app.services.auth import validate_supabase_jwt

SECRET = "test-jwt-secret-padded-to-32-bytes!!"
URL = "https://proj.supabase.co"
ISS = f"{URL}/auth/v1"


@pytest.fixture(autouse=True)
def _pin_settings(monkeypatch):
    monkeypatch.setattr(auth_mod.settings, "supabase_jwt_secret", SECRET)
    monkeypatch.setattr(auth_mod.settings, "supabase_url", URL)


def _token(**overrides):
    claims = {
        "sub": "user-123",
        "email": "user@example.com",
        "aud": "authenticated",
        "iss": ISS,
        "exp": int(time.time()) + 3600,
    }
    claims.update(overrides)
    claims = {k: v for k, v in claims.items() if v is not None}
    return pyjwt.encode(claims, SECRET, algorithm="HS256")


def test_valid_token_passes():
    result = validate_supabase_jwt(_token())
    assert result == {"user_id": "user-123", "email": "user@example.com"}


def test_wrong_audience_rejected():
    with pytest.raises(ValueError):
        validate_supabase_jwt(_token(aud="anon"))


def test_wrong_issuer_rejected():
    with pytest.raises(ValueError):
        validate_supabase_jwt(_token(iss="https://evil.example.com/auth/v1"))


def test_expired_token_rejected():
    with pytest.raises(ValueError):
        validate_supabase_jwt(_token(exp=int(time.time()) - 10))


def test_missing_sub_rejected():
    with pytest.raises(ValueError):
        validate_supabase_jwt(_token(sub=None))
