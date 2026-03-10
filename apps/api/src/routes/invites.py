"""Invite routes — create, validate, and accept workspace invitations."""

import os
import secrets
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from ulid import ULID

from src.services.email import send_invite_email

router = APIRouter(prefix="/api/v1/invites", tags=["invites"])


# -- Pydantic schemas ---------------------------------------------------------


class CreateInviteRequest(BaseModel):
    email: EmailStr
    workspace_id: str = "ws_brain_brigade"
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


# -- In-memory store (no DB running for demo) ---------------------------------

_invites: dict[str, dict] = {}


# -- Routes --------------------------------------------------------------------


@router.post("", response_model=CreateInviteResponse)
async def create_invite(req: CreateInviteRequest):
    """Admin creates an invite — sends magic link email."""
    invite_id = str(ULID())
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(UTC) + timedelta(days=7)

    invite = {
        "id": invite_id,
        "workspace_id": req.workspace_id,
        "email": req.email,
        "token": token,
        "invited_by": "admin_user_001",
        "org_role": req.org_role,
        "status": "pending",
        "created_at": datetime.now(UTC).isoformat(),
        "expires_at": expires_at.isoformat(),
    }
    _invites[token] = invite

    app_url = os.getenv("APP_URL", "http://localhost:3000")

    try:
        await send_invite_email(
            to_email=req.email,
            workspace_name="Brain Brigade",
            inviter_name="Zach",
            token=token,
        )
    except Exception as e:
        print(f"[INVITE] Email send failed (non-blocking): {e}")

    return CreateInviteResponse(
        id=invite_id,
        token=token,
        email=req.email,
        join_url=f"{app_url}/join/{token}",
        expires_at=expires_at.isoformat(),
    )


@router.get("/{token}", response_model=InviteInfo)
async def validate_invite(token: str):
    """Validate an invite token — returns workspace info if valid."""
    invite = _invites.get(token)
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid or expired invite")

    if invite["status"] != "pending":
        raise HTTPException(status_code=410, detail=f"Invite already {invite['status']}")

    expires = datetime.fromisoformat(invite["expires_at"])
    if datetime.now(UTC) > expires:
        invite["status"] = "expired"
        raise HTTPException(status_code=410, detail="Invite has expired")

    return InviteInfo(
        workspace_name="Brain Brigade",
        inviter_name="Zach",
        email=invite["email"],
        status=invite["status"],
        expires_at=invite["expires_at"],
    )


@router.post("/{token}/accept")
async def accept_invite(token: str, req: AcceptInviteRequest):
    """Accept an invite — create user + workspace membership."""
    invite = _invites.get(token)
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid invite")

    if invite["status"] != "pending":
        raise HTTPException(status_code=410, detail=f"Invite already {invite['status']}")

    invite["status"] = "accepted"
    invite["accepted_at"] = datetime.now(UTC).isoformat()

    user_id = str(ULID())
    return {
        "access_token": f"invite_{token[:16]}",
        "refresh_token": f"refresh_{token[:16]}",
        "user": {
            "id": user_id,
            "email": invite["email"],
            "display_name": req.display_name or invite["email"].split("@")[0],
            "org_role": invite.get("org_role", "member"),
        },
        "redirect_to": "/forge",
    }
