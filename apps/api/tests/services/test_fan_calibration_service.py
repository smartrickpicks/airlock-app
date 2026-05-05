"""Tests for FanCalibrationService — 5-question behavioral quiz engine."""

import uuid

import pytest
from sqlalchemy import JSON, create_engine, event
from sqlalchemy.orm import sessionmaker

from src.db import Base
from src.models.fan_calibration import FanCalibration
from src.models.orbit_persona import OrbitPersona
from src.models.orbit_profile import OrbitProfile
from src.models.user import User
from src.services.fan_calibration_service import QUIZ_QUESTIONS, FanCalibrationService
from src.services.orbit_persona_service import OrbitPersonaService

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:")

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_conn, _connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    for model in [User, OrbitProfile, OrbitPersona, FanCalibration]:
        for col in model.__table__.columns:
            if hasattr(col.type, "__class__") and col.type.__class__.__name__ == "JSONB":
                col.type = JSON()

    Base.metadata.create_all(
        engine,
        tables=[
            User.__table__,
            OrbitProfile.__table__,
            OrbitPersona.__table__,
            FanCalibration.__table__,
        ],
    )
    session = sessionmaker(bind=engine)()
    yield session
    session.close()
    engine.dispose()


def _uid() -> str:
    return str(uuid.uuid4())


def _make_profile_with_personas(db) -> OrbitProfile:
    """Create a profile with the 5 default personas."""
    user = User(
        id=_uid(),
        workspace_id=_uid(),
        email=f"{_uid()[:8]}@test.com",
        display_name="Test User",
    )
    db.add(user)
    db.flush()
    profile = OrbitProfile(
        id=_uid(),
        user_id=user.id,
        slug=f"test-{_uid()[:8]}",
        display_name="Test Creator",
    )
    db.add(profile)
    db.flush()
    OrbitPersonaService.generate_defaults(db, profile.id)
    db.commit()
    return profile


def _complete_quiz(db, profile_id: str, choices: list[str]) -> dict:
    """Run through the full quiz with specified choices ('a' or 'b')."""
    result = FanCalibrationService.start_quiz(db, profile_id)
    token = result["session_token"]
    for i, choice in enumerate(choices):
        result = FanCalibrationService.answer(db, token, QUIZ_QUESTIONS[i]["id"], choice)
    return result


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestStartQuiz:
    def test_start_returns_token_and_first_question(self, db):
        profile = _make_profile_with_personas(db)
        result = FanCalibrationService.start_quiz(db, profile.id)

        assert "session_token" in result
        assert len(result["session_token"]) > 20
        assert result["question"]["id"] == 1
        assert result["question_number"] == 1
        assert result["total_questions"] == 5

    def test_start_creates_calibration_row(self, db):
        profile = _make_profile_with_personas(db)
        result = FanCalibrationService.start_quiz(db, profile.id)

        cal = db.execute(
            FanCalibration.__table__.select().where(
                FanCalibration.session_token == result["session_token"]
            )
        ).first()
        assert cal is not None


class TestAnswer:
    def test_answer_updates_drives(self, db):
        profile = _make_profile_with_personas(db)
        result = FanCalibrationService.start_quiz(db, profile.id)
        token = result["session_token"]

        # Answer question 1 with 'a' (E+2, D+1)
        result = FanCalibrationService.answer(db, token, 1, "a")
        assert result["question_number"] == 2

        # Verify drives were updated
        from sqlalchemy import select

        stmt = select(FanCalibration).where(FanCalibration.session_token == token)
        cal = db.execute(stmt).scalar_one()
        assert cal.drives["E"] == 7  # 5 + 2
        assert cal.drives["D"] == 6  # 5 + 1

    def test_answer_records_answer(self, db):
        profile = _make_profile_with_personas(db)
        result = FanCalibrationService.start_quiz(db, profile.id)
        token = result["session_token"]

        FanCalibrationService.answer(db, token, 1, "b")

        from sqlalchemy import select

        stmt = select(FanCalibration).where(FanCalibration.session_token == token)
        cal = db.execute(stmt).scalar_one()
        assert len(cal.answers) == 1
        assert cal.answers[0]["question_id"] == 1
        assert cal.answers[0]["answer"] == "b"

    def test_invalid_answer_raises(self, db):
        profile = _make_profile_with_personas(db)
        result = FanCalibrationService.start_quiz(db, profile.id)

        with pytest.raises(ValueError, match="Invalid answer"):
            FanCalibrationService.answer(db, result["session_token"], 1, "c")

    def test_invalid_token_raises(self, db):
        with pytest.raises(ValueError, match="Calibration not found"):
            FanCalibrationService.answer(db, "bad-token", 1, "a")

    def test_invalid_question_id_raises(self, db):
        profile = _make_profile_with_personas(db)
        result = FanCalibrationService.start_quiz(db, profile.id)

        with pytest.raises(ValueError, match="Invalid question_id"):
            FanCalibrationService.answer(db, result["session_token"], 99, "a")


class TestCompleteQuiz:
    def test_all_a_matches_persuader(self, db):
        """All 'a' answers push D and E high, should match persuader."""
        profile = _make_profile_with_personas(db)
        result = _complete_quiz(db, profile.id, ["a", "a", "a", "a", "a"])

        assert result["completed"] is True
        assert result["persona_name"] == "The Influencer"  # persuader
        assert 0.55 <= result["confidence"] <= 0.85

    def test_all_b_matches_guardian_or_analyzer(self, db):
        """All 'b' answers push C and F high, should match guardian or analyzer."""
        profile = _make_profile_with_personas(db)
        result = _complete_quiz(db, profile.id, ["b", "b", "b", "b", "b"])

        assert result["completed"] is True
        assert result["persona_name"] in ("The Loyal One", "The Strategist")
        assert 0.55 <= result["confidence"] <= 0.85

    def test_confidence_in_range(self, db):
        profile = _make_profile_with_personas(db)
        result = _complete_quiz(db, profile.id, ["a", "b", "a", "b", "a"])

        assert 0.55 <= result["confidence"] <= 0.85

    def test_persona_id_set_on_calibration(self, db):
        profile = _make_profile_with_personas(db)
        result = _complete_quiz(db, profile.id, ["a", "a", "a", "a", "a"])

        assert result["persona_id"] is not None

        from sqlalchemy import select

        stmt = select(FanCalibration).where(FanCalibration.session_token == result["session_token"])
        cal = db.execute(stmt).scalar_one()
        assert cal.persona_id == result["persona_id"]


class TestGetResult:
    def test_get_result_after_completion(self, db):
        profile = _make_profile_with_personas(db)
        result = _complete_quiz(db, profile.id, ["a", "a", "a", "a", "a"])
        db.commit()

        fetched = FanCalibrationService.get_result(db, result["session_token"])
        assert fetched is not None
        assert fetched["completed"] is True
        assert fetched["persona_id"] == result["persona_id"]
        assert fetched["confidence"] == result["confidence"]

    def test_get_result_not_found(self, db):
        result = FanCalibrationService.get_result(db, "nonexistent-token")
        assert result is None

    def test_get_result_incomplete_returns_none(self, db):
        profile = _make_profile_with_personas(db)
        start = FanCalibrationService.start_quiz(db, profile.id)
        db.commit()

        result = FanCalibrationService.get_result(db, start["session_token"])
        assert result is None
