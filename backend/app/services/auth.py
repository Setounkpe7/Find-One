import jwt as pyjwt
from jwt.exceptions import InvalidTokenError
from app.config import settings


def validate_supabase_jwt(token: str) -> dict:
    """
    Validates a Supabase-issued JWT. Returns the decoded payload with user_id.
    Raises ValueError if the token is invalid or expired.
    """
    try:
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
    except InvalidTokenError as e:
        raise ValueError(f"Invalid token: {e}")
