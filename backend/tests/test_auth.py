import pytest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from app.services.auth import validate_supabase_jwt


def test_health_endpoint_requires_no_auth(client):
    client.app.dependency_overrides.clear()
    response = client.get("/health")
    # health endpoint has no auth requirement, so should return 200
    assert response.status_code == 200


def test_validate_jwt_hs256_returns_user_id():
    fake_payload = {"sub": "user-123", "email": "user@example.com"}
    with patch(
        "app.services.auth.pyjwt.get_unverified_header",
        return_value={"alg": "HS256"},
    ), patch("app.services.auth.pyjwt.decode", return_value=fake_payload):
        result = validate_supabase_jwt("fake.token.here")
    assert result["user_id"] == "user-123"
    assert result["email"] == "user@example.com"


def test_validate_jwt_es256_uses_jwks():
    """Modern Supabase projects sign with ES256 via JWKS — verify the path."""
    fake_payload = {"sub": "user-456", "email": "user2@example.com"}

    class FakeKey:
        key = "fake-public-key"

    class FakeJwksClient:
        def get_signing_key_from_jwt(self, token):
            return FakeKey()

    with patch(
        "app.services.auth.pyjwt.get_unverified_header",
        return_value={"alg": "ES256"},
    ), patch(
        "app.services.auth._get_jwks_client", return_value=FakeJwksClient()
    ), patch("app.services.auth.pyjwt.decode", return_value=fake_payload):
        result = validate_supabase_jwt("fake.token.here")
    assert result["user_id"] == "user-456"


def test_validate_jwt_rejects_unsupported_algorithm():
    with patch(
        "app.services.auth.pyjwt.get_unverified_header",
        return_value={"alg": "none"},
    ):
        with pytest.raises(ValueError, match="Unsupported JWT algorithm"):
            validate_supabase_jwt("any.token.here")


def test_validate_jwt_raises_on_invalid_token():
    with pytest.raises(ValueError, match="Invalid token"):
        validate_supabase_jwt("not.a.valid.token")


def _make_supabase_auth_result(user_id="user-abc", email="new@example.com", access_token="test.jwt.token"):
    return SimpleNamespace(
        user=SimpleNamespace(id=user_id, email=email),
        session=SimpleNamespace(access_token=access_token),
    )


def _patch_supabase_client(auth_method, return_value=None, side_effect=None):
    """Patch _get_supabase_client to return a MagicMock whose .auth.<method> is configured."""
    fake = MagicMock()
    if side_effect is not None:
        getattr(fake.auth, auth_method).side_effect = side_effect
    else:
        getattr(fake.auth, auth_method).return_value = return_value
    return patch("app.api.auth._get_supabase_client", return_value=fake)


# /auth/register — behavior tests

def test_register_happy_path_returns_token_response(client):
    result = _make_supabase_auth_result(user_id="new-user-1", email="new@example.com")
    with _patch_supabase_client("sign_up", return_value=result):
        response = client.post("/auth/register", json={
            "email": "new@example.com",
            "password": "SecurePass123!",
        })
    assert response.status_code == 200
    body = response.json()
    assert body == {
        "access_token": "test.jwt.token",
        "token_type": "bearer",
        "user_id": "new-user-1",
        "email": "new@example.com",
    }


def test_register_returns_400_when_supabase_user_is_none(client):
    result = SimpleNamespace(user=None, session=None)
    with _patch_supabase_client("sign_up", return_value=result):
        response = client.post("/auth/register", json={
            "email": "new@example.com",
            "password": "SecurePass123!",
        })
    assert response.status_code == 400
    assert response.json()["detail"] == "Registration failed"


def test_register_returns_400_when_supabase_raises(client):
    with _patch_supabase_client("sign_up", side_effect=Exception("supabase boom")):
        response = client.post("/auth/register", json={
            "email": "new@example.com",
            "password": "SecurePass123!",
        })
    assert response.status_code == 400
    assert response.json()["detail"] == "Registration failed"


# /auth/login — behavior tests

def test_login_happy_path_returns_token_response(client):
    result = _make_supabase_auth_result(user_id="existing-1", email="existing@example.com")
    with _patch_supabase_client("sign_in_with_password", return_value=result):
        response = client.post("/auth/login", json={
            "email": "existing@example.com",
            "password": "SecurePass123!",
        })
    assert response.status_code == 200
    body = response.json()
    assert body == {
        "access_token": "test.jwt.token",
        "token_type": "bearer",
        "user_id": "existing-1",
        "email": "existing@example.com",
    }


def test_login_returns_401_when_supabase_user_is_none(client):
    result = SimpleNamespace(user=None, session=None)
    with _patch_supabase_client("sign_in_with_password", return_value=result):
        response = client.post("/auth/login", json={
            "email": "existing@example.com",
            "password": "wrong",
        })
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"


def test_login_returns_401_when_supabase_raises(client):
    with _patch_supabase_client("sign_in_with_password", side_effect=Exception("supabase boom")):
        response = client.post("/auth/login", json={
            "email": "existing@example.com",
            "password": "SecurePass123!",
        })
    assert response.status_code == 401
    assert response.json()["detail"] == "Authentication failed"


# Schema validation — no Supabase mock needed, rejections happen before the handler runs

@pytest.mark.parametrize("path", ["/auth/register", "/auth/login"])
def test_missing_email_returns_422(client, path):
    response = client.post(path, json={"password": "SecurePass123!"})
    assert response.status_code == 422


@pytest.mark.parametrize("path", ["/auth/register", "/auth/login"])
def test_missing_password_returns_422(client, path):
    response = client.post(path, json={"email": "user@example.com"})
    assert response.status_code == 422


@pytest.mark.parametrize("path", ["/auth/register", "/auth/login"])
def test_malformed_email_returns_422(client, path):
    response = client.post(path, json={"email": "not-an-email", "password": "SecurePass123!"})
    assert response.status_code == 422


@pytest.mark.parametrize("path", ["/auth/register", "/auth/login"])
def test_extra_field_returns_422(client, path):
    response = client.post(path, json={
        "email": "user@example.com",
        "password": "SecurePass123!",
        "totally_unexpected": "xyz",
    })
    assert response.status_code == 422
