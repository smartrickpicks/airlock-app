"""Tests for PI assessment Pydantic schemas."""

import pytest
from pydantic import ValidationError

from src.schemas.pi_assessment import (
    CreatePIAssessmentRequest,
    PIRecommendationResponse,
)


def test_create_request_valid():
    req = CreatePIAssessmentRequest(pi_profile="analyzer")
    assert req.pi_profile == "analyzer"
    assert req.assessment_source == "admin_assigned"
    assert req.behavioral_factors == {}


def test_create_request_with_factors():
    req = CreatePIAssessmentRequest(
        pi_profile="captain",
        behavioral_factors={"dominance": 0.8, "extraversion": 0.7},
        assessment_source="pi_verified",
    )
    assert req.behavioral_factors["dominance"] == 0.8


def test_create_request_invalid_profile():
    with pytest.raises(ValidationError):
        CreatePIAssessmentRequest(pi_profile="nonexistent")


def test_create_request_invalid_source():
    with pytest.raises(ValidationError):
        CreatePIAssessmentRequest(pi_profile="analyzer", assessment_source="invalid")


def test_recommendation_response_fields():
    resp = PIRecommendationResponse(
        pi_profile="analyzer",
        meta_archetype="interpreter",
        chamber_affinity=["discover"],
        top_agentic_role="evidence_curator",
        top_agentic_role_score=0.9,
        runner_up_role="drift_detective",
        runner_up_role_score=0.8,
        ux_preferences={"informationDensity": "dense"},
    )
    assert resp.meta_archetype == "interpreter"
    assert resp.chamber_affinity == ["discover"]
