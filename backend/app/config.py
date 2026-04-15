from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Look for .env in repo root (parent of backend/), then in CWD as fallback.
# This keeps working whether uvicorn is launched from repo root or from backend/.
_REPO_ROOT_ENV = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(_REPO_ROOT_ENV), ".env"),
        extra="ignore",
    )

    database_url: str = "postgresql://findone:findone@localhost:5432/findone"
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_key: str = ""
    supabase_jwt_secret: str = ""
    anthropic_api_key: str = ""
    jsearch_api_key: str = ""
    frontend_url: str = "http://localhost:5173"


settings = Settings()
