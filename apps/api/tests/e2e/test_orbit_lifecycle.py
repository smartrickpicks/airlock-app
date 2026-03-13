"""Integration test — full Orbit lifecycle exercised through the service layer.

No HTTP routes. Uses in-memory SQLite with JSONB→JSON patching.
Exercises all Orbit services working together end-to-end.
"""

import uuid

import pytest
from sqlalchemy import JSON, create_engine, event
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker

from src.db import Base
from src.models.fan_calibration import FanCalibration
from src.models.orbit_link import OrbitLink
from src.models.orbit_persona import OrbitPersona
from src.models.orbit_profile import OrbitProfile
from src.models.orbit_section import OrbitSection
from src.models.user import User
from src.services.fan_calibration_service import QUIZ_QUESTIONS, FanCalibrationService
from src.services.orbit_analytics_service import build_analytics
from src.services.orbit_link_service import OrbitLinkService
from src.services.orbit_persona_service import OrbitPersonaService
from src.services.orbit_service import OrbitService
from src.services.parasocial_health_service import ParasocialHealthService

# ---------------------------------------------------------------------------
# All models touched by the lifecycle tests
# ---------------------------------------------------------------------------

_ALL_MODELS = [User, OrbitProfile, OrbitSection, OrbitPersona, OrbitLink, FanCalibration]


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def db():
    """In-memory SQLite session with JSONB→JSON patching and FK enforcement."""
    engine = create_engine("sqlite:///:memory:")

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_conn, _connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    # Patch JSONB → JSON so SQLite can handle the columns
    for model in _ALL_MODELS:
        for col in model.__table__.columns:
            if hasattr(col.type, "__class__") and col.type.__class__.__name__ == "JSONB":
                col.type = JSON()

    Base.metadata.create_all(engine, tables=[m.__table__ for m in _ALL_MODELS])
    session = sessionmaker(bind=engine)()
    yield session
    session.close()
    engine.dispose()


def _uid() -> str:
    return str(uuid.uuid4())


def _make_user(db: Session) -> User:
    uid = _uid()
    user = User(
        id=uid,
        workspace_id=_uid(),
        email=f"{uid[:8]}@test.com",
        display_name="Test Creator",
    )
    db.add(user)
    db.flush()
    return user


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestFullCreatorFlow:
    def test_full_creator_flow(self, db):
        user = _make_user(db)

        # 1. Creator creates Orbit profile
        profile = OrbitService.create_profile(
            db,
            user_id=user.id,
            slug="datingcoach",
            display_name="The Dating Coach",
            tagline="Helping you find love",
        )
        assert profile.id is not None
        assert profile.slug == "datingcoach"
        assert profile.tagline == "Helping you find love"

        # 2. Add default sections
        sections = OrbitService.add_default_sections(db, profile.id)
        assert len(sections) >= 4

        # 3. Generate personas
        personas = OrbitPersonaService.generate_defaults(db, profile.id, niche="dating")
        assert len(personas) == 5

        db.commit()

        # 4. Add a link
        link = OrbitLinkService.create(db, profile.id, "My YouTube", "https://youtube.com/@dating")
        assert link.click_count == 0
        db.commit()

        # 5. Publish
        updated = OrbitService.update_profile(db, profile.id, is_published=True)
        assert updated.is_published is True

        # 6. Fan takes quiz (all 5 questions)
        quiz = FanCalibrationService.start_quiz(db, profile.id)
        token = quiz["session_token"]
        assert token is not None
        assert len(token) > 20

        result = None
        for q in QUIZ_QUESTIONS:
            result = FanCalibrationService.answer(db, token, q["id"], "a")

        assert result is not None
        assert result["completed"] is True
        assert result["persona_name"] is not None

        # 7. Track a link click
        OrbitLinkService.record_click(db, link.id, profile.id, referrer="https://tiktok.com")
        db.commit()
        db.refresh(link)
        assert link.click_count == 1

        # 8. Check analytics gating — 1 interaction is below LOW threshold
        analytics = build_analytics(
            interaction_count=1,
            page_views=50,
            persona_distribution={},
            drive_heatmap={},
        )
        assert analytics["gate"] == "none"
        assert "persona_distribution" not in analytics


class TestSlugCollision:
    def test_slug_collision_rejected(self, db):
        user_a = _make_user(db)
        OrbitService.create_profile(
            db, user_id=user_a.id, slug="datingcoach", display_name="Original"
        )
        db.commit()

        user_b = _make_user(db)
        with pytest.raises(IntegrityError):
            OrbitService.create_profile(
                db, user_id=user_b.id, slug="datingcoach", display_name="Duplicate"
            )
            db.flush()


class TestParasocialNudge:
    def test_parasocial_nudge_touch_grass(self):
        """Fan visiting 30× when mean is 10 and std is 5 → touch_grass tier."""
        nudge = ParasocialHealthService.evaluate(
            fan_visit_count=30,
            mean_visits=10.0,
            std_visits=5.0,
        )
        assert nudge is not None
        # 30 > 10 + 2*5 = 20 → TOUCH_GRASS
        assert nudge["tier"] == "TOUCH_GRASS"

    def test_normal_engagement_no_nudge(self):
        nudge = ParasocialHealthService.evaluate(
            fan_visit_count=5,
            mean_visits=10.0,
            std_visits=5.0,
        )
        assert nudge is None
