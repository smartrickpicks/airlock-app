"""Auth routes — Google OAuth, JWT refresh, dev bypass."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ulid import ULID

from src.config import settings
from src.db import get_db
from src.middleware.auth import get_current_user
from src.models.user import User
from src.services.auth import (
    GoogleAuthConfigurationError,
    GoogleAuthPersistenceError,
    GoogleAuthUnavailableError,
    authenticate_google_user,
)
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
    try:
        result = authenticate_google_user(body.credential, body.workspace_id, db)
    except GoogleAuthConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured on the API",
        ) from exc
    except GoogleAuthUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google token verification is temporarily unavailable",
        ) from exc
    except GoogleAuthPersistenceError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to persist Google-authenticated user",
        ) from exc

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
def refresh_token(
    body: RefreshRequest,
    db: Session = Depends(get_db),  # noqa: B008
) -> dict:
    """Exchange a valid refresh token for a new access token.

    Looks up current user from DB so the new token reflects changes
    like workspace_id updated after workspace creation.
    """
    payload = verify_token(body.refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    # Look up current user state from DB (workspace_id may have changed)
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first() if user_id else None

    token_data = {
        "sub": payload["sub"],
        "email": user.email if user else payload.get("email", ""),
        "workspace_id": user.workspace_id if user else payload.get("workspace_id", ""),
        "org_role": user.org_role if user else payload.get("org_role", ""),
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

    from sqlalchemy import select

    from src.models.workspace import Workspace

    # Use the first real workspace if one exists, otherwise fall back to "ws_dev"
    first_ws = db.execute(
        select(Workspace).where(Workspace.deleted_at.is_(None)).limit(1)
    ).scalar_one_or_none()
    workspace_id = first_ws.id if first_ws else "ws_dev"

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
    elif user.workspace_id != workspace_id:
        # Update dev user to point to real workspace if it was stale
        user.workspace_id = workspace_id
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


# ---------------------------------------------------------------------------
# Passkey (WebAuthn) routes
# ---------------------------------------------------------------------------


class PasskeyRegisterVerifyRequest(BaseModel):
    credential: dict
    device_name: str | None = None


class PasskeyAuthenticateRequest(BaseModel):
    email: str | None = None


class PasskeyAuthenticateVerifyRequest(BaseModel):
    credential: dict
    session_key: str


@router.post("/passkey/register/options")
def passkey_register_options(
    db: Session = Depends(get_db),  # noqa: B008
    current_user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Generate WebAuthn registration options (requires existing auth)."""
    from src.services.passkey import get_registration_options

    user = db.query(User).filter(User.id == current_user["sub"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return get_registration_options(user)


@router.post("/passkey/register/verify")
def passkey_register_verify(
    body: PasskeyRegisterVerifyRequest,
    db: Session = Depends(get_db),  # noqa: B008
    current_user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Verify WebAuthn registration and store credential."""
    from src.services.passkey import verify_registration

    user = db.query(User).filter(User.id == current_user["sub"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    credential = verify_registration(user, body.credential, db, body.device_name)
    if not credential:
        raise HTTPException(status_code=400, detail="Registration verification failed")

    return {"status": "registered", "credential_id": credential.id}


@router.post("/passkey/authenticate/options")
def passkey_authenticate_options(
    body: PasskeyAuthenticateRequest,
    db: Session = Depends(get_db),  # noqa: B008
) -> dict:
    """Generate WebAuthn authentication options (no auth required)."""
    from src.services.passkey import get_authentication_options

    return get_authentication_options(db, body.email)


@router.post("/passkey/authenticate/verify")
def passkey_authenticate_verify(
    body: PasskeyAuthenticateVerifyRequest,
    db: Session = Depends(get_db),  # noqa: B008
) -> dict:
    """Verify WebAuthn authentication and return JWT pair."""
    from src.services.passkey import verify_authentication

    result = verify_authentication(body.credential, body.session_key, db)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Passkey authentication failed",
        )
    return result


@router.get("/passkey/credentials")
def passkey_list(
    db: Session = Depends(get_db),  # noqa: B008
    current_user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """List user's registered passkeys."""
    from src.services.passkey import list_credentials

    return {"credentials": list_credentials(db, current_user["sub"])}


@router.delete("/passkey/credentials/{credential_id}")
def passkey_delete(
    credential_id: str,
    db: Session = Depends(get_db),  # noqa: B008
    current_user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Remove a passkey."""
    from src.services.passkey import delete_credential

    success = delete_credential(db, current_user["sub"], credential_id)
    if not success:
        raise HTTPException(status_code=404, detail="Credential not found")
    return {"status": "deleted"}
