import jwt as pyjwt
from jwt import PyJWKClient, PyJWKClientError
from jwt.exceptions import InvalidTokenError
from app.config import settings

_ASYMMETRIC_ALGS = {"ES256", "RS256"}
_SYMMETRIC_ALGS = {"HS256"}
_ACCEPTED_ALGS = _ASYMMETRIC_ALGS | _SYMMETRIC_ALGS

_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    """Cached JWKS client for asymmetric Supabase keys."""
    global _jwks_client
    if _jwks_client is None:
        base = settings.supabase_url.rstrip("/")
        _jwks_client = PyJWKClient(f"{base}/auth/v1/.well-known/jwks.json")
    return _jwks_client


def validate_supabase_jwt(token: str) -> dict:
    """
    Validates a Supabase-issued JWT and returns a dict with user_id + email.

    Supports both legacy HS256 (shared secret) and modern ES256/RS256
    (asymmetric, public key fetched from the project's JWKS endpoint).
    Raises ValueError if the token is invalid, expired, or unsupported.
    """
    try:
        header = pyjwt.get_unverified_header(token)
        alg = header.get("alg")

        if alg not in _ACCEPTED_ALGS:
            raise ValueError(f"Unsupported JWT algorithm: {alg}")

        if alg in _ASYMMETRIC_ALGS:
            signing_key = _get_jwks_client().get_signing_key_from_jwt(token).key
            payload = pyjwt.decode(
                token,
                signing_key,
                algorithms=[alg],
                options={"verify_aud": False},
            )
        else:
            payload = pyjwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )

        user_id = payload.get("sub")
        if not user_id:
            raise ValueError("Token missing sub claim")
        return {"user_id": user_id, "email": payload.get("email", "")}

    except (InvalidTokenError, PyJWKClientError) as e:
        raise ValueError(f"Invalid token: {e}")
