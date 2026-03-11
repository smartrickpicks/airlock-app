"""Invite routes — create, validate, and accept workspace invitations.

Database-backed invite records with real auth for acceptance.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from src.config import settings
from src.db import get_db
from src.middleware.auth import get_current_user
from src.models.user import User
from src.models.workspace import Workspace
from src.services import invite_service
from src.services.auth import authenticate_google_user
from src.services.email import send_invite_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/invites", tags=["invites"])


# -- Request / Response schemas (route-specific) ------------------------------


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


# -- Routes -------------------------------------------------------------------


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

    invite = invite_service.create_invite(
        db=db,
        workspace_id=workspace_id,
        email=req.email,
        role=req.org_role,
        module_roles={},
        invited_by=user_id,
    )

    # Store workspace/inviter info in metadata for later retrieval
    invite.metadata_ = {
        "workspace_name": workspace_name,
        "inviter_name": inviter_name,
    }
    db.commit()

    try:
        await send_invite_email(
            to_email=req.email,
            workspace_name=workspace_name,
            inviter_name=inviter_name,
            token=invite.code,
        )
    except Exception as e:
        logger.warning("Email send failed (non-blocking): %s", e)

    return CreateInviteResponse(
        id=invite.id,
        token=invite.code,
        email=invite.email,
        join_url=f"{settings.app_url}/join/{invite.code}",
        expires_at=invite.expires_at.isoformat(),
    )


@router.get("/{token}", response_model=InviteInfo)
async def validate_invite(
    token: str,
    db: Session = Depends(get_db),  # noqa: B008
):
    """Validate an invite token — returns workspace info if valid."""
    invite = invite_service.validate_invite(db, code=token)
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid or expired invite")

    meta = invite.metadata_ or {}
    status_str = "accepted" if invite.accepted_by else "pending"

    return InviteInfo(
        workspace_name=meta.get("workspace_name", "Airlock"),
        inviter_name=meta.get("inviter_name", "Team"),
        email=invite.email,
        status=status_str,
        expires_at=invite.expires_at.isoformat(),
    )


@router.post("/{token}/accept")
async def accept_invite(
    token: str,
    req: AcceptInviteRequest,
    db: Session = Depends(get_db),  # noqa: B008
):
    """Accept an invite — verify Google credential, create real user + JWT."""
    invite = invite_service.validate_invite(db, code=token)
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid invite")

    # Use the real Google OAuth flow to verify credential and create/upsert user
    result = authenticate_google_user(
        credential=req.google_credential,
        workspace_id=invite.workspace_id,
        db=db,
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google authentication failed",
        )

    # Update display name and role if provided
    if req.display_name or invite.role:
        user = db.query(User).filter(User.id == result["user"]["id"]).first()
        if user:
            if req.display_name:
                user.display_name = req.display_name
            user.org_role = invite.role or "member"
            db.commit()
            result["user"]["display_name"] = user.display_name
            result["user"]["org_role"] = user.org_role

    # Mark invite as accepted
    invite_service.accept_invite(db, code=token, user_id=result["user"]["id"])

    return {
        "access_token": result["access_token"],
        "refresh_token": result["refresh_token"],
        "user": result["user"],
        "redirect_to": "/contracts/triage",
    }
