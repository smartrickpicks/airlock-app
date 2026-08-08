"""Pydantic schemas for PI assessment request/response validation."""

from datetime import datetime

from pydantic import BaseModel, Field

_VALID_PROFILES = (
    "analyzer|strategist|specialist|venturer|scholar|individualist|"
    "captain|persuader|promoter|maverick|collaborator|altruist|"
    "adapter|guardian|controller|operator|artisan"
)


class CreatePIAssessmentRequest(BaseModel):
    pi_profile: str = Field(
        ...,
        pattern=rf"^({_VALID_PROFILES})$",
        description="One of 17 PI personality profiles",
    )
    behavioral_factors: dict = Field(
        default_factory=dict,
        description="PI behavioral factor scores (dominance, extraversion, patience, formality)",
    )
    assessment_source: str = Field(
        default="admin_assigned",
        pattern=r"^(admin_assigned|self_reported|pi_verified)$",
    )


class PIAssessmentResponse(BaseModel):
    id: str
    user_id: str
    workspace_id: str
    pi_profile: str
    meta_archetype: str
    behavioral_factors: dict
    ux_preferences: dict
    assessment_source: str
    assessed_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class PIRecommendationResponse(BaseModel):
    pi_profile: str
    meta_archetype: str
    chamber_affinity: list[str]
    top_agentic_role: str | None
    top_agentic_role_score: float | None
    runner_up_role: str | None
    runner_up_role_score: float | None
    ux_preferences: dict


class PIAssessmentListResponse(BaseModel):
    assessments: list[PIAssessmentResponse]
    total: int
