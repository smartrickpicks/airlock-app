"""PI assessment service — CRUD operations and recommendation engine."""

from sqlalchemy import select
from sqlalchemy.orm import Session
from ulid import ULID

from src.models.pi_assessment import PIAssessment
from src.services.pi_constants import (
    VALID_PI_PROFILES,
    get_chamber_affinity,
    get_meta_archetype,
    get_top_agentic_roles,
)
from src.services.pi_ux_preferences import get_ux_preferences

VALID_ASSESSMENT_SOURCES = ("admin_assigned", "self_reported", "pi_verified")


def compute_assessment_recommendation(pi_profile: str) -> dict | None:
    """Compute full recommendation for a PI profile (no DB needed).

    Returns dict with meta_archetype, chamber_affinity, top roles, and UX preferences.
    Returns None if the profile is invalid.
    """
    meta = get_meta_archetype(pi_profile)
    if meta is None:
        return None

    top_roles = get_top_agentic_roles(pi_profile, n=2)
    ux_prefs = get_ux_preferences(pi_profile)

    return {
        "pi_profile": pi_profile,
        "meta_archetype": meta,
        "chamber_affinity": get_chamber_affinity(meta),
        "top_agentic_role": top_roles[0][0] if top_roles else None,
        "top_agentic_role_score": top_roles[0][1] if top_roles else None,
        "runner_up_role": top_roles[1][0] if len(top_roles) > 1 else None,
        "runner_up_role_score": top_roles[1][1] if len(top_roles) > 1 else None,
        "ux_preferences": ux_prefs,
    }


def create_pi_assessment(
    db: Session,
    *,
    user_id: str,
    workspace_id: str,
    pi_profile: str,
    behavioral_factors: dict | None = None,
    assessment_source: str = "admin_assigned",
) -> PIAssessment:
    """Create or update a PI assessment for a user in a workspace.

    Uses upsert semantics: if an assessment already exists for the user+workspace,
    it is replaced (unique constraint on user_id + workspace_id).

    Raises ValueError if pi_profile is invalid.
    """
    if pi_profile not in VALID_PI_PROFILES:
        raise ValueError(f"Invalid PI profile: {pi_profile}. Must be one of {VALID_PI_PROFILES}")

    if assessment_source not in VALID_ASSESSMENT_SOURCES:
        raise ValueError(f"Invalid assessment source: {assessment_source}")

    meta = get_meta_archetype(pi_profile)
    ux_prefs = get_ux_preferences(pi_profile) or {}

    # Check for existing assessment (upsert)
    existing = db.execute(
        select(PIAssessment).where(
            PIAssessment.user_id == user_id,
            PIAssessment.workspace_id == workspace_id,
        )
    ).scalar_one_or_none()

    if existing:
        existing.pi_profile = pi_profile
        existing.meta_archetype = meta
        existing.behavioral_factors = behavioral_factors or {}
        existing.ux_preferences = ux_prefs
        existing.assessment_source = assessment_source
        db.commit()
        db.refresh(existing)
        return existing

    assessment = PIAssessment(
        id=str(ULID()),
        user_id=user_id,
        workspace_id=workspace_id,
        pi_profile=pi_profile,
        meta_archetype=meta,
        behavioral_factors=behavioral_factors or {},
        ux_preferences=ux_prefs,
        assessment_source=assessment_source,
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return assessment


def get_pi_assessment(db: Session, user_id: str, workspace_id: str) -> PIAssessment | None:
    """Get the PI assessment for a user in a workspace."""
    return db.execute(
        select(PIAssessment).where(
            PIAssessment.user_id == user_id,
            PIAssessment.workspace_id == workspace_id,
        )
    ).scalar_one_or_none()


def list_pi_assessments(db: Session, workspace_id: str) -> list[PIAssessment]:
    """List all PI assessments in a workspace."""
    return list(
        db.execute(
            select(PIAssessment)
            .where(PIAssessment.workspace_id == workspace_id)
            .order_by(PIAssessment.created_at.desc())
        )
        .scalars()
        .all()
    )


def delete_pi_assessment(db: Session, user_id: str, workspace_id: str) -> bool:
    """Delete a PI assessment. Returns True if deleted, False if not found."""
    assessment = get_pi_assessment(db, user_id, workspace_id)
    if assessment is None:
        return False
    db.delete(assessment)
    db.commit()
    return True
