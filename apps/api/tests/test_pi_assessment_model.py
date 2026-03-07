"""Tests for PIAssessment ORM model."""

from src.models.pi_assessment import PIAssessment


def test_pi_assessment_tablename():
    assert PIAssessment.__tablename__ == "pi_assessments"


def test_pi_assessment_has_required_columns():
    columns = {c.name for c in PIAssessment.__table__.columns}
    required = {
        "id",
        "user_id",
        "workspace_id",
        "pi_profile",
        "meta_archetype",
        "behavioral_factors",
        "ux_preferences",
        "assessment_source",
        "assessed_at",
        "created_at",
    }
    assert required.issubset(columns), f"Missing columns: {required - columns}"


def test_pi_assessment_primary_key():
    pk_columns = [c.name for c in PIAssessment.__table__.primary_key.columns]
    assert pk_columns == ["id"]


def test_pi_assessment_unique_constraint():
    """Each user should have only one active assessment per workspace."""
    unique_constraints = [
        tuple(c.name for c in uc.columns)
        for uc in PIAssessment.__table__.constraints
        if hasattr(uc, "columns") and len(uc.columns) > 1
    ]
    assert ("user_id", "workspace_id") in unique_constraints
