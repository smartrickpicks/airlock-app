"""Tests for PI assessment service functions (unit tests, no DB)."""

from src.services.pi_assessment import (
    VALID_ASSESSMENT_SOURCES,
    compute_assessment_recommendation,
)


def test_valid_assessment_sources():
    assert "admin_assigned" in VALID_ASSESSMENT_SOURCES
    assert "self_reported" in VALID_ASSESSMENT_SOURCES
    assert "pi_verified" in VALID_ASSESSMENT_SOURCES


def test_compute_recommendation_analyzer():
    rec = compute_assessment_recommendation("analyzer")
    assert rec["pi_profile"] == "analyzer"
    assert rec["meta_archetype"] == "interpreter"
    assert rec["chamber_affinity"] == ["discover"]
    assert rec["top_agentic_role"] == "evidence_curator"
    assert rec["runner_up_role"] is not None
    assert "ux_preferences" in rec
    assert rec["ux_preferences"]["informationDensity"] == "dense"


def test_compute_recommendation_captain():
    rec = compute_assessment_recommendation("captain")
    assert rec["meta_archetype"] == "driver"
    assert rec["chamber_affinity"] == ["build", "ship"]
    assert rec["top_agentic_role"] == "momentum_builder"


def test_compute_recommendation_guardian():
    rec = compute_assessment_recommendation("guardian")
    assert rec["meta_archetype"] == "enforcer"
    assert rec["chamber_affinity"] == ["review"]
    assert rec["top_agentic_role"] == "cold_route_guardian"


def test_compute_recommendation_invalid():
    rec = compute_assessment_recommendation("nonexistent")
    assert rec is None
