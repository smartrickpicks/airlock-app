"""Tests for Orbit creator ORM models.

Uses an in-memory SQLite database with JSONB -> JSON compatibility
to verify model structure, constraints, and basic CRUD.
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

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def db():
    """In-memory SQLite session with Orbit tables created.

    Patches JSONB columns to JSON for SQLite compatibility.
    """
    engine = create_engine("sqlite:///:memory:")

    # Enable FK enforcement in SQLite
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_conn, _connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    # Swap JSONB -> JSON so SQLite can handle it
    orbit_tables = []
    for model in [User, OrbitProfile, OrbitSection, OrbitLink, OrbitPersona, FanCalibration]:
        for col in model.__table__.columns:
            if hasattr(col.type, "__class__") and col.type.__class__.__name__ == "JSONB":
                col.type = JSON()
        orbit_tables.append(model.__table__)

    # Only create Orbit tables (+ users for FK), not the entire metadata
    Base.metadata.create_all(engine, tables=orbit_tables)
    session = sessionmaker(bind=engine)()
    yield session
    session.close()
    engine.dispose()


def _uid() -> str:
    return str(uuid.uuid4())


def _make_user(db: Session, user_id: str | None = None) -> User:
    uid = user_id or _uid()
    user = User(
        id=uid,
        workspace_id=_uid(),
        email=f"{uid[:8]}@test.com",
        display_name="Test User",
    )
    db.add(user)
    db.flush()
    return user


def _make_profile(db: Session, **overrides) -> OrbitProfile:
    user_id = overrides.pop("user_id", None)
    if user_id is None:
        user = _make_user(db)
        user_id = user.id
    else:
        existing = db.get(User, user_id)
        if existing is None:
            _make_user(db, user_id=user_id)
    defaults = {
        "id": _uid(),
        "user_id": user_id,
        "slug": f"test-{uuid.uuid4().hex[:8]}",
        "display_name": "Test Creator",
        "tagline": "Building cool things",
    }
    defaults.update(overrides)
    profile = OrbitProfile(**defaults)
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


# ---------------------------------------------------------------------------
# OrbitProfile
# ---------------------------------------------------------------------------


class TestOrbitProfile:
    def test_tablename(self):
        assert OrbitProfile.__tablename__ == "orbit_profiles"

    def test_create_with_slug(self, db):
        profile = _make_profile(db, slug="my-orbit")
        assert profile.slug == "my-orbit"
        assert profile.display_name == "Test Creator"
        assert profile.page_views == 0

    def test_explicit_published_false(self, db):
        """Boolean server_default only works on Postgres; test explicit set."""
        profile = _make_profile(db, is_published=False)
        assert profile.is_published is False

    def test_slug_uniqueness(self, db):
        _make_profile(db, slug="unique-slug")
        with pytest.raises(IntegrityError):
            _make_profile(db, slug="unique-slug")

    def test_user_id_uniqueness(self, db):
        shared_user = _uid()
        _make_profile(db, user_id=shared_user, slug="slug-a")
        with pytest.raises(IntegrityError):
            _make_profile(db, user_id=shared_user, slug="slug-b")

    def test_theme_set(self, db):
        theme = {"primary_color": "#ff0000", "accent_color": "#00ff00", "layout_preset": "minimal"}
        profile = _make_profile(db, theme=theme)
        assert profile.theme["primary_color"] == "#ff0000"


# ---------------------------------------------------------------------------
# OrbitSection
# ---------------------------------------------------------------------------


class TestOrbitSection:
    def test_tablename(self):
        assert OrbitSection.__tablename__ == "orbit_sections"

    def test_create_with_content(self, db):
        profile = _make_profile(db)
        section = OrbitSection(
            id=_uid(),
            orbit_profile_id=profile.id,
            section_type="hero",
            title="Welcome",
            order_index=0,
            content={"heading": "Hello World", "subtext": "Welcome to my Orbit"},
        )
        db.add(section)
        db.commit()
        db.refresh(section)

        assert section.section_type == "hero"
        assert section.content["heading"] == "Hello World"
        assert section.is_visible is True

    def test_cascade_delete(self, db):
        profile = _make_profile(db)
        section = OrbitSection(
            id=_uid(),
            orbit_profile_id=profile.id,
            section_type="bio",
            title="About",
        )
        db.add(section)
        db.commit()

        db.delete(profile)
        db.commit()

        remaining = db.query(OrbitSection).all()
        assert len(remaining) == 0


# ---------------------------------------------------------------------------
# OrbitLink
# ---------------------------------------------------------------------------


class TestOrbitLink:
    def test_tablename(self):
        assert OrbitLink.__tablename__ == "orbit_links"

    def test_create_link(self, db):
        profile = _make_profile(db)
        link = OrbitLink(
            id=_uid(),
            orbit_profile_id=profile.id,
            title="My Website",
            url="https://example.com",
            icon="globe",
        )
        db.add(link)
        db.commit()
        db.refresh(link)

        assert link.title == "My Website"
        assert link.click_count == 0


# ---------------------------------------------------------------------------
# OrbitPersona
# ---------------------------------------------------------------------------


class TestOrbitPersona:
    def test_tablename(self):
        assert OrbitPersona.__tablename__ == "orbit_personas"

    def test_create_with_traits(self, db):
        profile = _make_profile(db)
        persona = OrbitPersona(
            id=_uid(),
            orbit_profile_id=profile.id,
            pi_profile="maverick",
            display_name="The Trailblazer",
            description="Bold and independent",
            traits=["decisive", "fast-paced", "risk-taker"],
            emoji="🚀",
        )
        db.add(persona)
        db.commit()
        db.refresh(persona)

        assert persona.pi_profile == "maverick"
        assert persona.display_name == "The Trailblazer"
        assert "decisive" in persona.traits


# ---------------------------------------------------------------------------
# FanCalibration
# ---------------------------------------------------------------------------


class TestFanCalibration:
    def test_tablename(self):
        assert FanCalibration.__tablename__ == "fan_calibrations"

    def test_create_with_drives_and_answers(self, db):
        profile = _make_profile(db)
        persona = OrbitPersona(
            id=_uid(),
            orbit_profile_id=profile.id,
            pi_profile="captain",
            display_name="The Captain",
        )
        db.add(persona)
        db.commit()

        calibration = FanCalibration(
            id=_uid(),
            orbit_profile_id=profile.id,
            persona_id=persona.id,
            session_token=f"tok_{uuid.uuid4().hex}",
            drives={"dominance": 8.5, "extraversion": 7.0, "patience": 3.0, "formality": 2.5},
            answers=[
                {"question_id": "q1", "choice": "a"},
                {"question_id": "q2", "choice": "c"},
            ],
            confidence=0.87,
        )
        db.add(calibration)
        db.commit()
        db.refresh(calibration)

        assert calibration.drives["dominance"] == 8.5
        assert len(calibration.answers) == 2
        assert calibration.confidence == pytest.approx(0.87)

    def test_session_token_uniqueness(self, db):
        profile = _make_profile(db)
        token = f"tok_{uuid.uuid4().hex}"

        cal1 = FanCalibration(
            id=_uid(),
            orbit_profile_id=profile.id,
            session_token=token,
            drives={},
            answers=[],
            confidence=0.0,
        )
        db.add(cal1)
        db.commit()

        cal2 = FanCalibration(
            id=_uid(),
            orbit_profile_id=profile.id,
            session_token=token,
            drives={},
            answers=[],
            confidence=0.0,
        )
        db.add(cal2)
        with pytest.raises(IntegrityError):
            db.commit()


# ---------------------------------------------------------------------------
# Import smoke test
# ---------------------------------------------------------------------------


class TestImports:
    def test_models_importable_from_init(self):
        from src.models import (
            FanCalibration,
            OrbitLink,
            OrbitPersona,
            OrbitProfile,
            OrbitSection,
        )

        assert OrbitProfile is not None
        assert OrbitSection is not None
        assert OrbitLink is not None
        assert OrbitPersona is not None
        assert FanCalibration is not None
