# apps/api/src/schemas/calibration.py
"""Schemas for Otto's adaptive calibration journey."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, model_validator


class CalibrationAnswer(BaseModel):
    """User's answer to a calibration question."""

    question_id: str = Field(description="ID of the question being answered")
    selected_option_id: str | None = Field(
        default=None, description="Selected card option ID (for card_tap questions)"
    )
    free_text: str | None = Field(
        default=None, description="Free text response (for conversational questions or custom goal)"
    )
    session_id: str = Field(description="Calibration session identifier")

    @model_validator(mode="after")
    def require_one_input(self) -> CalibrationAnswer:
        if self.selected_option_id is None and self.free_text is None:
            raise ValueError("Answer must have either selected_option_id or free_text")
        return self


class QuestionOption(BaseModel):
    """A tappable option for a card_tap question."""

    id: str
    label: str
    description: str | None = None
    emoji: str | None = None


class NextQuestion(BaseModel):
    """The next question Otto should ask."""

    id: str
    text: str
    format: str = Field(description="card_tap or conversational")
    options: list[QuestionOption] = Field(
        default_factory=list, description="Options for card_tap format"
    )


class UnlockEvent(BaseModel):
    """A confidence threshold was crossed, triggering a visual unlock."""

    threshold: float
    message: str
    visual: str = Field(
        description="Visual event type: first_drive_bar, archetype_silhouette, full_profile_reveal, provenance_unlock"
    )


class CalibrationResponse(BaseModel):
    """Response from the calibration engine after processing an answer."""

    drives: dict[str, float] = Field(
        description="Current DECF drives {dominance, extraversion, patience, formality}"
    )
    confidence: float = Field(ge=0.0, le=1.0)
    micro_insight: str = Field(description="Otto's behavioral insight about the user's answer")
    unlock_events: list[UnlockEvent] = Field(
        default_factory=list, description="Thresholds crossed by this answer"
    )
    next_question: NextQuestion | None = Field(
        default=None, description="Next question to ask, or null if phase complete"
    )
    bmy_complete: bool = Field(default=False, description="True when confidence >= 0.75")
    profile_match: dict[str, Any] | None = Field(
        default=None, description="Profile match data when bmy_complete"
    )
    phase: str = Field(description="in_progress, bmy_complete, deep_calibration, fully_calibrated")
    questions_asked: list[str] = Field(
        default_factory=list, description="IDs of questions already asked"
    )
    archetype_hypothesis: str | None = Field(
        default=None, description="Current archetype guess if confidence >= 0.65"
    )
