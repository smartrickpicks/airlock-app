"""Routes for Otto's adaptive calibration journey."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from src.schemas.calibration import (
    CalibrationResponse,
    NextQuestion,
    QuestionOption,
    UnlockEvent,
)
from src.services.calibration import CalibrationEngine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/calibration", tags=["calibration"])

_engine: CalibrationEngine | None = None


def init_calibration_engine() -> None:
    """Initialize the calibration engine. Called during app startup."""
    global _engine  # noqa: PLW0603
    if _engine is not None and _engine.is_loaded:
        logger.info("Calibration engine already initialized — skipping")
        return

    from pathlib import Path

    from src.config import settings

    persona_path = Path(settings.persona_repo_path) if settings.persona_repo_path else Path("")
    _engine = CalibrationEngine(persona_path=persona_path)
    _engine.load()
    logger.info(
        "Calibration engine initialized: %d questions loaded",
        _engine.question_count,
    )


def get_engine() -> CalibrationEngine:
    """Get the CalibrationEngine singleton."""
    if _engine is None:
        init_calibration_engine()
    assert _engine is not None
    return _engine


class CalibrationNextRequest(BaseModel):
    """Request to process an answer and get the next question."""

    question_id: str
    selected_option_id: str | None = None
    free_text: str | None = None
    session_id: str
    prior_state: dict[str, Any] | None = Field(
        default=None,
        description="Prior calibration state for continuity across calls",
    )


@router.post("/next", response_model=CalibrationResponse)
async def calibration_next(request: CalibrationNextRequest) -> CalibrationResponse:
    """Process an answer and return updated drives, next question, insight, and unlocks."""
    engine = get_engine()

    # Reconstruct state from prior_state or start fresh
    if request.prior_state:
        state = {
            "drives": request.prior_state.get("drives", engine.new_session()["drives"]),
            "confidence": request.prior_state.get("confidence", 0.10),
            "answered": request.prior_state.get("questions_asked", []),
            "signal_count": len(request.prior_state.get("questions_asked", [])),
            "drives_touched": set(request.prior_state.get("drives_touched", [])),
            "archetype_hypothesis": request.prior_state.get("archetype_hypothesis"),
            "archetype_confirmations": request.prior_state.get("archetype_confirmations", 0),
            "unlocks_emitted": request.prior_state.get("unlocks_emitted", []),
        }
    else:
        state = engine.new_session()

    # Process the answer through the engine
    result = engine.process_answer(
        state=state,
        question_id=request.question_id,
        selected_option_id=request.selected_option_id,
        free_text=request.free_text,
    )

    # If the engine returned an error (unknown question), use current state
    if "error" in result:
        logger.warning("Calibration engine error: %s", result["error"])

    # The engine updates state in-place AND returns a result dict
    # State is mutated: drives, answered, confidence, etc.
    # Result has: drives, confidence, micro_insight, unlock_events, archetype_hypothesis, profile_match

    # Select next question
    next_q_id = engine.select_next_question(state)
    next_question = None
    if next_q_id:
        q_data = engine.get_question(next_q_id)
        if q_data:
            next_question = NextQuestion(
                id=next_q_id,
                text=q_data["text"],
                format=q_data.get("format", "card_tap"),
                options=[
                    QuestionOption(id=o["id"], label=o["label"]) for o in q_data.get("options", [])
                ],
            )

    # Determine phase
    confidence = state["confidence"]
    phase = "bmy_complete" if confidence >= 0.75 else "in_progress"

    return CalibrationResponse(
        drives=state["drives"],
        confidence=state["confidence"],
        micro_insight=result.get("micro_insight", "Processing..."),
        unlock_events=[
            UnlockEvent(
                threshold=e["threshold"],
                message=e.get("otto_says", ""),
                visual=e.get("visual", ""),
            )
            for e in result.get("unlock_events", [])
        ],
        next_question=next_question,
        bmy_complete=confidence >= 0.75,
        profile_match=result.get("profile_match"),
        phase=phase,
        questions_asked=list(state["answered"]),
        archetype_hypothesis=state.get("archetype_hypothesis"),
    )
