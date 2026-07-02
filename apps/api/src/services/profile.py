"""Profile service — CRUD operations for MAGS user profiles.

Business logic for:
- Creating profiles from BMY inference results
- Enriching profiles with LinkedIn/resume signals
- User overrides with confidence bump
- Sovereignty (privacy) controls
- Changelog tracking (append-only audit trail)
- Workspace membership management
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session
from ulid import ULID

from src.models.user_profile import UserProfile
from src.models.user_profile_changelog import UserProfileChangelog
from src.models.workspace_membership import WorkspaceMembership
from src.schemas.profile import (
    CreateProfileRequest,
    CreateWorkspaceMembershipRequest,
    EnrichProfileRequest,
    OverrideProfileRequest,
    ProfileSource,
    UpdateSovereigntyRequest,
    UpdateWorkspaceMembershipRequest,
)

logger = logging.getLogger(__name__)

# --- Default sovereignty settings ---
DEFAULT_SOVEREIGNTY = {
    "profile_visible": True,
    "drives_visible": False,
    "archetype_visible": True,
    "export_allowed": False,
}


# =====================================================================
# Profile CRUD
# =====================================================================


def create_profile(db: Session, *, user_id: str, request: CreateProfileRequest) -> UserProfile:
    """Create a new user profile from BMY inference results.

    Also logs a 'created' entry in the changelog.
    """
    # Check for existing profile
    existing = get_profile_by_user(db, user_id=user_id)
    if existing is not None:
        msg = f"User {user_id} already has a profile — use enrich or override instead"
        raise ValueError(msg)

    profile_id = str(ULID())

    profile = UserProfile(
        id=profile_id,
        user_id=user_id,
        pi_profile=request.pi_profile,
        meta_archetype=request.meta_archetype.value,
        confidence=request.confidence,
        drives=request.drives.model_dump(),
        source=request.source.value,
        workspace_config=request.workspace_config.model_dump() if request.workspace_config else {},
        mags_config=request.mags_config,
        signals=request.signals,
        sovereignty={**DEFAULT_SOVEREIGNTY},
    )

    db.add(profile)

    # Log creation in changelog
    _log_change(
        db,
        user_id=user_id,
        action="created",
        source=request.source.value,
        delta={
            "after": {
                "pi_profile": request.pi_profile,
                "meta_archetype": request.meta_archetype.value,
                "confidence": request.confidence,
                "drives": request.drives.model_dump(),
            },
        },
    )

    db.flush()
    logger.info(
        "Profile created: user=%s profile=%s confidence=%.2f",
        user_id,
        request.pi_profile,
        request.confidence,
    )
    return profile


def get_profile_by_user(db: Session, *, user_id: str) -> UserProfile | None:
    """Get a user's profile by user_id. Returns None if not found or soft-deleted."""
    stmt = select(UserProfile).where(
        UserProfile.user_id == user_id,
        UserProfile.deleted_at.is_(None),
    )
    return db.execute(stmt).scalar_one_or_none()


def enrich_profile(db: Session, *, user_id: str, request: EnrichProfileRequest) -> UserProfile:
    """Enrich an existing profile with additional signal data.

    Merges new signals and optionally updates drives/profile/confidence.
    Logs an 'enriched' entry in the changelog.
    """
    profile = get_profile_by_user(db, user_id=user_id)
    if profile is None:
        msg = f"No profile found for user {user_id}"
        raise ValueError(msg)

    before = {
        "pi_profile": profile.pi_profile,
        "confidence": profile.confidence,
        "drives": profile.drives,
    }

    # Apply enrichment updates
    if request.drives is not None:
        profile.drives = request.drives.model_dump()
    if request.confidence is not None:
        profile.confidence = request.confidence
    if request.pi_profile is not None:
        profile.pi_profile = request.pi_profile
    if request.meta_archetype is not None:
        profile.meta_archetype = request.meta_archetype.value
    if request.workspace_config is not None:
        profile.workspace_config = request.workspace_config.model_dump()
    if request.mags_config is not None:
        profile.mags_config = request.mags_config

    # Merge additional signals
    if request.additional_signals:
        merged = {**profile.signals, **request.additional_signals}
        profile.signals = merged

    after = {
        "pi_profile": profile.pi_profile,
        "confidence": profile.confidence,
        "drives": profile.drives,
    }

    _log_change(
        db,
        user_id=user_id,
        action="enriched",
        source=request.source.value,
        delta={"before": before, "after": after},
    )

    db.flush()
    logger.info("Profile enriched: user=%s source=%s", user_id, request.source.value)
    return profile


def override_profile(
    db: Session, *, user_id: str, request: OverrideProfileRequest, engine: object
) -> UserProfile:
    """User manually selects a different profile.

    Sets confidence to 0.90 per confidence-rules.yaml override_impact.
    Requires the ProfileMatchingEngine to look up the new profile's canonical data.
    """
    from src.services.inference import ProfileMatchingEngine

    if not isinstance(engine, ProfileMatchingEngine):
        msg = "Engine must be a ProfileMatchingEngine"
        raise TypeError(msg)

    profile = get_profile_by_user(db, user_id=user_id)
    if profile is None:
        msg = f"No profile found for user {user_id}"
        raise ValueError(msg)

    # Validate the chosen profile exists
    profile_data = engine.get_profile_data(request.pi_profile)
    if profile_data is None:
        msg = f"Profile '{request.pi_profile}' not found in canonical profiles"
        raise ValueError(msg)

    before = {
        "pi_profile": profile.pi_profile,
        "confidence": profile.confidence,
    }

    # Apply override
    profile.pi_profile = request.pi_profile
    profile.meta_archetype = _resolve_archetype_from_data(profile_data)
    profile.confidence = 0.90  # Per confidence-rules.yaml
    profile.source = ProfileSource.USER_OVERRIDE.value

    # Update drives to canonical values
    drives = profile_data["drives"]
    profile.drives = {
        "dominance": float(drives["dominance"]),
        "extraversion": float(drives["extraversion"]),
        "patience": float(drives["patience"]),
        "formality": float(drives["formality"]),
    }

    # Update workspace and otto configs from canonical profile
    ws = profile_data.get("workspace", {})
    profile.workspace_config = ws

    otto = profile_data.get("otto", {})
    profile.mags_config = {
        "archetype": otto.get("default_archetype", "executor"),
        "autonomy_ceiling": otto.get("autonomy_ceiling", 0.50),
        "interaction_mode": otto.get("interaction_mode", "collaborative"),
    }

    after = {
        "pi_profile": profile.pi_profile,
        "confidence": profile.confidence,
        "reason": request.reason,
    }

    _log_change(
        db,
        user_id=user_id,
        action="override",
        source=ProfileSource.USER_OVERRIDE.value,
        delta={"before": before, "after": after},
    )

    db.flush()
    logger.info("Profile overridden: user=%s → %s", user_id, request.pi_profile)
    return profile


def update_sovereignty(
    db: Session, *, user_id: str, request: UpdateSovereigntyRequest
) -> UserProfile:
    """Update privacy/sovereignty controls for a user's profile."""
    profile = get_profile_by_user(db, user_id=user_id)
    if profile is None:
        msg = f"No profile found for user {user_id}"
        raise ValueError(msg)

    sovereignty = dict(profile.sovereignty)
    if request.profile_visible is not None:
        sovereignty["profile_visible"] = request.profile_visible
    if request.drives_visible is not None:
        sovereignty["drives_visible"] = request.drives_visible
    if request.archetype_visible is not None:
        sovereignty["archetype_visible"] = request.archetype_visible
    if request.export_allowed is not None:
        sovereignty["export_allowed"] = request.export_allowed

    profile.sovereignty = sovereignty
    db.flush()
    logger.info("Sovereignty updated: user=%s", user_id)
    return profile


def soft_delete_profile(db: Session, *, user_id: str) -> None:
    """Soft-delete a user's profile (set deleted_at)."""
    profile = get_profile_by_user(db, user_id=user_id)
    if profile is None:
        msg = f"No profile found for user {user_id}"
        raise ValueError(msg)

    profile.deleted_at = datetime.now(tz=UTC)

    _log_change(
        db,
        user_id=user_id,
        action="reset",
        source=ProfileSource.USER_OVERRIDE.value,
        delta={"before": {"pi_profile": profile.pi_profile}, "after": None},
    )

    db.flush()
    logger.info("Profile soft-deleted: user=%s", user_id)


# =====================================================================
# Changelog Queries
# =====================================================================


def get_changelog(
    db: Session, *, user_id: str, limit: int = 50, offset: int = 0
) -> tuple[list[UserProfileChangelog], int]:
    """Get paginated changelog for a user."""
    count_stmt = (
        select(func.count())
        .select_from(UserProfileChangelog)
        .where(UserProfileChangelog.user_id == user_id)
    )
    total = db.execute(count_stmt).scalar_one()

    stmt = (
        select(UserProfileChangelog)
        .where(UserProfileChangelog.user_id == user_id)
        .order_by(UserProfileChangelog.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    entries = list(db.execute(stmt).scalars().all())
    return entries, total


# =====================================================================
# Workspace Memberships
# =====================================================================


def create_workspace_membership(
    db: Session, *, request: CreateWorkspaceMembershipRequest
) -> WorkspaceMembership:
    """Add a user to a workspace with a role."""
    # Check for existing membership
    existing = get_workspace_membership(
        db, workspace_id=request.workspace_id, user_id=request.user_id
    )
    if existing is not None:
        msg = f"User {request.user_id} is already a member of workspace {request.workspace_id}"
        raise ValueError(msg)

    membership = WorkspaceMembership(
        id=str(ULID()),
        workspace_id=request.workspace_id,
        user_id=request.user_id,
        org_role=request.org_role.value,
        module_roles=request.module_roles,
    )

    db.add(membership)
    db.flush()
    logger.info(
        "Membership created: user=%s workspace=%s role=%s",
        request.user_id,
        request.workspace_id,
        request.org_role.value,
    )
    return membership


def get_workspace_membership(
    db: Session, *, workspace_id: str, user_id: str
) -> WorkspaceMembership | None:
    """Get a specific user's membership in a workspace."""
    stmt = select(WorkspaceMembership).where(
        WorkspaceMembership.workspace_id == workspace_id,
        WorkspaceMembership.user_id == user_id,
        WorkspaceMembership.deleted_at.is_(None),
    )
    return db.execute(stmt).scalar_one_or_none()


def list_workspace_memberships(db: Session, *, workspace_id: str) -> list[WorkspaceMembership]:
    """List all memberships for a workspace."""
    stmt = (
        select(WorkspaceMembership)
        .where(
            WorkspaceMembership.workspace_id == workspace_id,
            WorkspaceMembership.deleted_at.is_(None),
        )
        .order_by(WorkspaceMembership.created_at)
    )
    return list(db.execute(stmt).scalars().all())


def update_workspace_membership(
    db: Session, *, workspace_id: str, user_id: str, request: UpdateWorkspaceMembershipRequest
) -> WorkspaceMembership:
    """Update a workspace membership."""
    membership = get_workspace_membership(db, workspace_id=workspace_id, user_id=user_id)
    if membership is None:
        msg = f"Membership not found for user {user_id} in workspace {workspace_id}"
        raise ValueError(msg)

    if request.org_role is not None:
        membership.org_role = request.org_role.value
    if request.module_roles is not None:
        membership.module_roles = request.module_roles
    if request.team_type_visible is not None:
        membership.team_type_visible = request.team_type_visible
    if request.drives_visible is not None:
        membership.drives_visible = request.drives_visible

    db.flush()
    return membership


# =====================================================================
# Internal Helpers
# =====================================================================


def _log_change(
    db: Session,
    *,
    user_id: str,
    action: str,
    source: str,
    delta: dict,
) -> None:
    """Append a changelog entry. Never updates or deletes."""
    entry = UserProfileChangelog(
        id=str(ULID()),
        user_id=user_id,
        action=action,
        source=source,
        delta=delta,
    )
    db.add(entry)


def _resolve_archetype_from_data(profile_data: dict) -> str:
    """Extract meta-archetype from raw profile YAML data."""
    category = profile_data.get("category", "")
    if category in ("exploring", "producing"):
        return "driver"
    if category in ("stabilizing", "anchoring"):
        return "enforcer"
    return "interpreter"
