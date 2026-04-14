from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    database_url: str = "postgresql://findone:findone@localhost:5432/findone"
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_key: str = ""
    supabase_jwt_secret: str = ""
    anthropic_api_key: str = ""
    jsearch_api_key: str = ""
    frontend_url: str = "http://localhost:5173"


settings = Settings()
