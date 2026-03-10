"""Airlock API configuration — Pydantic BaseSettings (env vars)."""

import logging
import sys

from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)


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

    # Token encryption (Fernet)
    token_encryption_key: str = ""

    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]

    # LiteLLM
    litellm_api_base: str = "http://localhost:4000"
    litellm_master_key: str = ""

    # OpenRouter (Otto AI provider)
    openrouter_api_key: str = ""

    # MAGS / Inference Engine
    persona_repo_path: str = ""

    # Feature flags
    feature_billing: bool = False

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


def validate_production_settings() -> None:
    """Abort startup if critical secrets are missing in production."""
    if settings.environment != "production":
        return

    errors: list[str] = []

    if settings.jwt_secret == "change-me-in-production" or len(settings.jwt_secret) < 32:
        errors.append("JWT_SECRET must be set to a strong secret (>= 32 chars) in production")

    if not settings.token_encryption_key:
        errors.append(
            "TOKEN_ENCRYPTION_KEY must be set in production. "
            'Generate with: python -c "from cryptography.fernet import Fernet; '
            'print(Fernet.generate_key().decode())"'
        )

    if errors:
        for err in errors:
            logger.critical("STARTUP BLOCKED: %s", err)
        sys.exit(1)


# Run validation on import (server startup)
validate_production_settings()
