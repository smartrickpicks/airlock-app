"""Admin aggregation route — workspace members, feature flags, audit log."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.db import get_db
from src.middleware.auth import get_current_user
from src.models.user import User
from src.models.workspace import WorkspaceMembership

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


@router.get("")
async def get_admin_dashboard(
    db: Session = Depends(get_db),  # noqa: B008
    current_user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Aggregated admin dashboard data: members, feature flags, audit log."""
    workspace_id = current_user.get("workspace_id", "")

    # Fetch real workspace members
    stmt = (
        select(WorkspaceMembership, User)
        .join(User, WorkspaceMembership.user_id == User.id)
        .where(WorkspaceMembership.workspace_id == workspace_id)
    )
    rows = db.execute(stmt).all()

    members = []
    for membership, user in rows:
        members.append(
            {
                "id": user.id,
                "email": user.email,
                "displayName": user.display_name or user.email.split("@")[0],
                "avatarUrl": user.avatar_url,
                "orgRole": membership.org_role or "member",
                "moduleRoles": membership.metadata_.get("module_roles", {})
                if membership.metadata_
                else {},
                "status": "active",
                "joinedAt": membership.created_at.isoformat() if membership.created_at else "",
            }
        )

    # Feature flags and audit log will come from dedicated tables later
    return {
        "members": members,
        "featureFlags": [],
        "auditLog": [],
    }
