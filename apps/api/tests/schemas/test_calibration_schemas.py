# apps/api/tests/schemas/test_calibration_schemas.py
"""Tests for calibration schemas."""

import pytest
from pydantic import ValidationError


def test_calibration_answer_card_tap():
    """Card tap answer has question_id and selected_option_id."""
    from src.schemas.calibration import CalibrationAnswer

    answer = CalibrationAnswer(
        question_id="goal_statement",
        selected_option_id="close_deals",
        free_text=None,
        session_id="test-session-1",
    )
    assert answer.question_id == "goal_statement"
    assert answer.selected_option_id == "close_deals"
    assert answer.free_text is None


def test_calibration_answer_conversational():
    """Conversational answer has question_id and free_text."""
    from src.schemas.calibration import CalibrationAnswer

    answer = CalibrationAnswer(
        question_id="frustration",
        selected_option_id=None,
        free_text="Waiting on approvals drives me crazy",
        session_id="test-session-1",
    )
    assert answer.free_text is not None
    assert answer.selected_option_id is None


def test_calibration_answer_requires_one_input():
    """Answer must have either selected_option_id or free_text."""
    from src.schemas.calibration import CalibrationAnswer

    with pytest.raises(ValidationError):
        CalibrationAnswer(
            question_id="goal_statement",
            selected_option_id=None,
            free_text=None,
            session_id="test-session-1",
        )


def test_calibration_response_structure():
    """Response includes drives, confidence, next question, insight, unlocks."""
    from src.schemas.calibration import (
        CalibrationResponse,
        NextQuestion,
        QuestionOption,
        UnlockEvent,
    )

    response = CalibrationResponse(
        drives={"dominance": 7.0, "extraversion": 5.0, "patience": 3.0, "formality": 4.0},
        confidence=0.58,
        micro_insight="You don't wait for permission. That's rare.",
        unlock_events=[
            UnlockEvent(
                threshold=0.55, message="I'm starting to see something...", visual="first_drive_bar"
            )
        ],
        next_question=NextQuestion(
            id="autonomy_pref",
            text="How hands-on do you want Otto?",
            format="card_tap",
            options=[
                QuestionOption(id="run_things", label="Run things for me"),
                QuestionOption(id="draft_review", label="Draft it, I'll review"),
            ],
        ),
        bmy_complete=False,
        profile_match=None,
        phase="in_progress",
        questions_asked=["goal_statement"],
        archetype_hypothesis=None,
    )
    assert response.confidence == 0.58
    assert len(response.unlock_events) == 1
    assert response.next_question is not None
    assert response.next_question.format == "card_tap"
    assert len(response.next_question.options) == 2


def test_calibration_response_bmy_complete():
    """When BMY complete, profile_match is populated and next_question offers choice."""
    from src.schemas.calibration import CalibrationResponse

    response = CalibrationResponse(
        drives={"dominance": 7.0, "extraversion": 5.0, "patience": 3.0, "formality": 4.0},
        confidence=0.76,
        micro_insight="Meet your profile.",
        unlock_events=[],
        next_question=None,
        bmy_complete=True,
        profile_match={
            "profile_id": "persuader",
            "profile_name": "Persuader",
            "distance": 1.8,
            "confidence": 0.76,
            "meta_archetype": "driver",
        },
        phase="bmy_complete",
        questions_asked=["goal_statement", "autonomy_pref", "report_style", "monday_energy"],
        archetype_hypothesis="driver",
    )
    assert response.bmy_complete is True
    assert response.profile_match is not None
    assert response.phase == "bmy_complete"


def test_unlock_event_model():
    """UnlockEvent captures threshold, message, and visual type."""
    from src.schemas.calibration import UnlockEvent

    event = UnlockEvent(
        threshold=0.65, message="You might be a Driver...", visual="archetype_silhouette"
    )
    assert event.threshold == 0.65
    assert event.visual == "archetype_silhouette"
