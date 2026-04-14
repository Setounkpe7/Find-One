from fastapi import APIRouter, HTTPException
from app.config import settings
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


def _get_supabase_client():
    from supabase import create_client
    return create_client(settings.supabase_url, settings.supabase_anon_key)


@router.post("/register", response_model=TokenResponse)
def register(body: RegisterRequest):
    try:
        supabase = _get_supabase_client()
        result = supabase.auth.sign_up({"email": body.email, "password": body.password})
        if result.user is None:
            raise HTTPException(status_code=400, detail="Registration failed")
        return TokenResponse(
            access_token=result.session.access_token,
            user_id=str(result.user.id),
            email=result.user.email,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest):
    try:
        supabase = _get_supabase_client()
        result = supabase.auth.sign_in_with_password({"email": body.email, "password": body.password})
        if result.user is None:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        return TokenResponse(
            access_token=result.session.access_token,
            user_id=str(result.user.id),
            email=result.user.email,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))
