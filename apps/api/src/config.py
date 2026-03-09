"""Airlock API configuration — Pydantic BaseSettings (env vars)."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str = "postgresql://airlock:airlock@localhost:5432/airlock"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Auth — per spec: 15-min access tokens + 7-day refresh tokens
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_expire_minutes: int = 15
    jwt_refresh_expire_days: int = 7

    # Google OAuth
    google_client_id: str = ""
    google_client_secret: str = ""

    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]

    # LiteLLM
    litellm_api_base: str = "http://localhost:4000"
    litellm_master_key: str = ""

    # OpenRouter (Otto AI provider)
    openrouter_api_key: str = ""

    # MAGS / Inference Engine
    persona_repo_path: str = "/Users/zacharyholwerda/Desktop/Airlock/repos/airlock-persona"

    # App
    debug: bool = False
    environment: str = "development"
    uploads_dir: str = "uploads"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
    }


settings = Settings()
