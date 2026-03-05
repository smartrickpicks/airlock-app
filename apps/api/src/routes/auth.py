"""Auth routes — Google OAuth, JWT refresh, dev bypass."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ulid import ULID

from src.config import settings
from src.db import get_db
from src.middleware.auth import get_current_user
from src.models.user import User
from src.services.auth import authenticate_google_user
from src.services.jwt import create_access_token, create_refresh_token, verify_token

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------


class GoogleVerifyRequest(BaseModel):
    credential: str
    workspace_id: str


class RefreshRequest(BaseModel):
    refresh_token: str


# ---------------------------------------------------------------------------
# GET /api/v1/auth/config — public
# ---------------------------------------------------------------------------


@router.get("/config")
async def auth_config() -> dict:
    """Return OAuth configuration (no auth required)."""
    return {
        "google_client_id": settings.google_client_id,
        "configured": bool(settings.google_client_id),
    }


# ---------------------------------------------------------------------------
# POST /api/v1/auth/google/verify
# ---------------------------------------------------------------------------


@router.post("/google/verify")
def google_verify(
    body: GoogleVerifyRequest,
    db: Session = Depends(get_db),  # noqa: B008
) -> dict:
    """Verify a Google ID token and return JWT pair + user info."""
    result = authenticate_google_user(body.credential, body.workspace_id, db)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google authentication failed",
        )
    return result


# ---------------------------------------------------------------------------
# POST /api/v1/auth/refresh
# ---------------------------------------------------------------------------


@router.post("/refresh")
async def refresh_token(body: RefreshRequest) -> dict:
    """Exchange a valid refresh token for a new access token."""
    payload = verify_token(body.refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    token_data = {
        "sub": payload["sub"],
        "email": payload.get("email", ""),
        "workspace_id": payload.get("workspace_id", ""),
        "org_role": payload.get("org_role", ""),
    }
    return {
        "access_token": create_access_token(token_data),
    }


# ---------------------------------------------------------------------------
# GET /api/v1/auth/me — requires auth
# ---------------------------------------------------------------------------


@router.get("/me")
async def auth_me(current_user: dict = Depends(get_current_user)) -> dict:  # noqa: B008
    """Return identity from the current JWT."""
    return {
        "user_id": current_user.get("sub"),
        "email": current_user.get("email"),
        "workspace_id": current_user.get("workspace_id"),
        "org_role": current_user.get("org_role"),
    }


# ---------------------------------------------------------------------------
# POST /api/v1/auth/dev/login — dev only
# ---------------------------------------------------------------------------


@router.post("/dev/login")
def dev_login(db: Session = Depends(get_db)) -> dict:  # noqa: B008
    """Dev-only endpoint: create/fetch a dev user and return JWT pair."""
    if settings.environment != "development":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    email = "dev@airlock.local"
    workspace_id = "ws_dev"

    from sqlalchemy import select

    stmt = select(User).where(User.email == email)
    user = db.execute(stmt).scalar_one_or_none()

    if user is None:
        user = User(
            id=str(ULID()),
            workspace_id=workspace_id,
            email=email,
            display_name="Dev User",
            org_role="executive",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token_data = {
        "sub": user.id,
        "email": user.email,
        "workspace_id": user.workspace_id,
        "org_role": user.org_role,
    }

    return {
        "access_token": create_access_token(token_data),
        "refresh_token": create_refresh_token(token_data),
        "user": {
            "id": user.id,
            "email": user.email,
            "display_name": user.display_name,
            "avatar_url": user.avatar_url,
            "org_role": user.org_role,
        },
    }
