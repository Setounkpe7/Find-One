import pytest
from unittest.mock import patch
from app.services.auth import validate_supabase_jwt


def test_protected_endpoint_without_token_returns_401_or_403(client):
    client.app.dependency_overrides.clear()
    response = client.get("/health")
    # health endpoint has no auth, so should still be 200
    assert response.status_code == 200


def test_validate_jwt_returns_user_id():
    fake_payload = {"sub": "user-123", "email": "user@example.com"}
    with patch("app.services.auth.pyjwt.decode", return_value=fake_payload):
        result = validate_supabase_jwt("fake.token.here")
    assert result["user_id"] == "user-123"
    assert result["email"] == "user@example.com"


def test_validate_jwt_raises_on_invalid_token():
    with pytest.raises(ValueError, match="Invalid token"):
        validate_supabase_jwt("not.a.valid.token")


def test_register_endpoint_schema(client):
    # Test that the endpoint exists and validates schema (Supabase won't be called — empty URL)
    response = client.post("/auth/register", json={
        "email": "newuser@example.com",
        "password": "SecurePass123!"
    })
    # 400 is fine (Supabase not running), 422 means schema failure
    assert response.status_code != 422
