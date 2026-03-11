"""Invite routes — create, validate, and accept workspace invitations.

Uses database-backed auth for invite acceptance (real user creation + JWT).
Invite records still in-memory (DB table migration planned).
"""

import logging
import secrets
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from ulid import ULID

from src.config import settings
from src.db import get_db
from src.middleware.auth import get_current_user
from src.models.user import User
from src.models.workspace import Workspace
from src.services.auth import authenticate_google_user
from src.services.email import send_invite_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/invites", tags=["invites"])


# -- Pydantic schemas ---------------------------------------------------------


class CreateInviteRequest(BaseModel):
    email: EmailStr
    org_role: str = "member"


class CreateInviteResponse(BaseModel):
    id: str
    token: str
    email: str
    join_url: str
    expires_at: str


class InviteInfo(BaseModel):
    workspace_name: str
    inviter_name: str
    email: str
    status: str
    expires_at: str


class AcceptInviteRequest(BaseModel):
    google_credential: str
    display_name: str | None = None


# -- In-memory invite store (migrate to DB table in future migration) ----------

_invites: dict[str, dict] = {}


# -- Routes --------------------------------------------------------------------


@router.post("", response_model=CreateInviteResponse)
async def create_invite(
    req: CreateInviteRequest,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
):
    """Admin creates an invite — sends magic link email."""
    workspace_id = current_user.get("workspace_id")
    user_id = current_user.get("sub")

    # Look up workspace name and inviter name from DB
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    workspace_name = workspace.name if workspace else "Airlock"

    inviter = db.query(User).filter(User.id == user_id).first()
    inviter_name = inviter.display_name if inviter else "Team"

    invite_id = str(ULID())
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(UTC) + timedelta(days=7)

    invite = {
        "id": invite_id,
        "workspace_id": workspace_id,
        "email": req.email,
        "token": token,
        "invited_by": user_id,
        "inviter_name": inviter_name,
        "workspace_name": workspace_name,
        "org_role": req.org_role,
        "status": "pending",
        "created_at": datetime.now(UTC).isoformat(),
        "expires_at": expires_at.isoformat(),
    }
    _invites[token] = invite

    try:
        await send_invite_email(
            to_email=req.email,
            workspace_name=workspace_name,
            inviter_name=inviter_name,
            token=token,
        )
    except Exception as e:
        logger.warning("Email send failed (non-blocking): %s", e)

    return CreateInviteResponse(
        id=invite_id,
        token=token,
        email=req.email,
        join_url=f"{settings.app_url}/join/{token}",
        expires_at=expires_at.isoformat(),
    )


@router.get("/{token}", response_model=InviteInfo)
async def validate_invite(token: str):
    """Validate an invite token — returns workspace info if valid."""
    invite = _invites.get(token)
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid or expired invite")

    if invite["status"] != "pending":
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail=f"Invite already {invite['status']}",
        )

    expires = datetime.fromisoformat(invite["expires_at"])
    if datetime.now(UTC) > expires:
        invite["status"] = "expired"
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Invite has expired")

    return InviteInfo(
        workspace_name=invite.get("workspace_name", "Airlock"),
        inviter_name=invite.get("inviter_name", "Team"),
        email=invite["email"],
        status=invite["status"],
        expires_at=invite["expires_at"],
    )


@router.post("/{token}/accept")
async def accept_invite(
    token: str,
    req: AcceptInviteRequest,
    db: Session = Depends(get_db),  # noqa: B008
):
    """Accept an invite — verify Google credential, create real user + JWT."""
    invite = _invites.get(token)
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid invite")

    if invite["status"] != "pending":
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail=f"Invite already {invite['status']}",
        )

    # Use the real Google OAuth flow to verify credential and create/upsert user
    result = authenticate_google_user(
        credential=req.google_credential,
        workspace_id=invite["workspace_id"],
        db=db,
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google authentication failed",
        )

    # Update display name and role if provided
    if req.display_name or invite.get("org_role"):
        user = db.query(User).filter(User.id == result["user"]["id"]).first()
        if user:
            if req.display_name:
                user.display_name = req.display_name
            user.org_role = invite.get("org_role", "member")
            db.commit()
            result["user"]["display_name"] = user.display_name
            result["user"]["org_role"] = user.org_role

    # Mark invite as accepted
    invite["status"] = "accepted"
    invite["accepted_at"] = datetime.now(UTC).isoformat()

    return {
        "access_token": result["access_token"],
        "refresh_token": result["refresh_token"],
        "user": result["user"],
        "redirect_to": "/contracts/triage",
    }
