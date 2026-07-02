"""Invite service — business logic for workspace invitations."""

import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session
from ulid import ULID

from src.models.invite import Invite


def create_invite(
    db: Session,
    workspace_id: str,
    email: str,
    role: str,
    module_roles: dict,
    invited_by: str,
    expires_hours: int = 168,
) -> Invite:
    """Create a new invite with a unique code. Default expiry: 7 days (168h)."""
    invite = Invite(
        id=str(ULID()),
        workspace_id=workspace_id,
        code=secrets.token_urlsafe(32),
        email=email,
        role=role,
        module_roles=module_roles or {},
        invited_by=invited_by,
        expires_at=datetime.now(UTC) + timedelta(hours=expires_hours),
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)
    return invite


def validate_invite(db: Session, code: str) -> Invite | None:
    """Return the invite if it exists, is not expired, not accepted, and not deleted."""
    invite = (
        db.query(Invite)
        .filter(
            Invite.code == code,
            Invite.deleted_at.is_(None),
        )
        .first()
    )
    if not invite:
        return None

    # Check if already accepted
    if invite.accepted_by is not None:
        return None

    # Check expiration
    if datetime.now(UTC) > invite.expires_at.replace(tzinfo=UTC):
        return None

    return invite


def accept_invite(db: Session, code: str, user_id: str) -> Invite | None:
    """Mark an invite as accepted. Returns the updated invite or None if invalid."""
    invite = validate_invite(db, code)
    if not invite:
        return None

    invite.accepted_by = user_id
    invite.accepted_at = datetime.now(UTC)
    db.commit()
    db.refresh(invite)
    return invite


def list_workspace_invites(db: Session, workspace_id: str) -> list[Invite]:
    """List all non-deleted invites for a workspace (admin view)."""
    return (
        db.query(Invite)
        .filter(
            Invite.workspace_id == workspace_id,
            Invite.deleted_at.is_(None),
        )
        .order_by(Invite.created_at.desc())
        .all()
    )
