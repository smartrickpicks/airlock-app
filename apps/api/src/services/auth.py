"""Authentication service — Google OAuth verification + user upsert."""

import logging

from google.auth.exceptions import GoogleAuthError, TransportError
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from ulid import ULID

from src.config import settings
from src.models.user import User
from src.services.jwt import create_access_token, create_refresh_token

logger = logging.getLogger(__name__)


class GoogleAuthConfigurationError(Exception):
    """Raised when the API is missing required Google OAuth configuration."""


class GoogleAuthUnavailableError(Exception):
    """Raised when Google token verification cannot be completed."""


class GoogleAuthPersistenceError(Exception):
    """Raised when the authenticated user cannot be persisted."""


def authenticate_google_user(
    credential: str,
    workspace_id: str,
    db: Session,
) -> dict | None:
    """Verify Google ID token, upsert user, return JWT pair."""
    if not settings.google_client_id:
        logger.error("Google OAuth verify requested but GOOGLE_CLIENT_ID is not configured")
        raise GoogleAuthConfigurationError("GOOGLE_CLIENT_ID is not configured")

    try:
        idinfo = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            settings.google_client_id,
        )
    except ValueError as e:
        logger.warning("Google token verification failed: %s", e)
        return None
    except (TransportError, GoogleAuthError) as e:
        logger.exception("Google token verification unavailable: %s", e)
        raise GoogleAuthUnavailableError("Google token verification is unavailable") from e

    email = idinfo.get("email", "").strip().lower()
    google_sub = idinfo.get("sub", "")
    name = idinfo.get("name", "")
    picture = idinfo.get("picture", "")

    if not email:
        logger.warning("Google token missing email claim")
        return None

    stmt = select(User).where(User.email == email)
    user = db.execute(stmt).scalar_one_or_none()

    try:
        if user is None:
            user = User(
                id=str(ULID()),
                workspace_id=workspace_id,
                email=email,
                display_name=name or email,
                avatar_url=picture,
                google_sub=google_sub,
                org_role="member",
            )
            db.add(user)
        else:
            user.google_sub = google_sub
            if picture:
                user.avatar_url = picture
            if name and not user.display_name:
                user.display_name = name

        db.commit()
        db.refresh(user)
    except SQLAlchemyError as e:
        db.rollback()
        logger.exception("Failed to persist Google-authenticated user %s", email)
        raise GoogleAuthPersistenceError("Failed to persist Google-authenticated user") from e

    token_data = {
        "sub": user.id,
        "email": user.email,
        "workspace_id": user.workspace_id,
        "org_role": user.org_role,
    }

    return {
        "access_token": create_access_token(token_data),
        "refresh_token": create_refresh_token(token_data),
        "workspace_id": user.workspace_id,
        "user": {
            "id": user.id,
            "email": user.email,
            "display_name": user.display_name,
            "avatar_url": user.avatar_url,
            "org_role": user.org_role,
        },
    }
