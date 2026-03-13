"""Tests for OrbitService — profile CRUD + slug validation."""

import uuid

import pytest
from sqlalchemy import JSON, create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from src.db import Base
from src.models.orbit_profile import OrbitProfile
from src.models.orbit_section import OrbitSection
from src.models.user import User
from src.services.orbit_service import InvalidSlugError, OrbitService

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

    for model in [User, OrbitProfile, OrbitSection]:
        for col in model.__table__.columns:
            if hasattr(col.type, "__class__") and col.type.__class__.__name__ == "JSONB":
                col.type = JSON()

    Base.metadata.create_all(
        engine, tables=[User.__table__, OrbitProfile.__table__, OrbitSection.__table__]
    )
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
        display_name="Test User",
    )
    db.add(user)
    db.flush()
    return user


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestSlugValidation:
    def test_valid_slug(self):
        assert OrbitService.validate_slug("my-cool-orbit") is True

    def test_slug_too_short(self):
        with pytest.raises(InvalidSlugError, match="must be"):
            OrbitService.validate_slug("ab")

    def test_slug_uppercase_rejected(self):
        with pytest.raises(InvalidSlugError, match="must be"):
            OrbitService.validate_slug("MyOrbit")

    def test_slug_with_spaces_rejected(self):
        with pytest.raises(InvalidSlugError, match="must be"):
            OrbitService.validate_slug("my orbit")

    def test_reserved_slug_rejected(self):
        with pytest.raises(InvalidSlugError, match="reserved"):
            OrbitService.validate_slug("admin")

    def test_all_reserved_slugs_rejected(self):
        for slug in ["api", "app", "blog", "help", "login", "orbit", "otto", "settings", "signup"]:
            with pytest.raises(InvalidSlugError, match="reserved"):
                OrbitService.validate_slug(slug)


class TestCreateProfile:
    def test_create_profile(self, db):
        user = _make_user(db)
        profile = OrbitService.create_profile(
            db, user_id=user.id, slug="test-creator", display_name="Test Creator"
        )
        assert profile.slug == "test-creator"
        assert profile.display_name == "Test Creator"
        assert profile.tagline == ""
        assert profile.id is not None

    def test_create_with_tagline(self, db):
        user = _make_user(db)
        profile = OrbitService.create_profile(
            db, user_id=user.id, slug="creator-two", display_name="Creator", tagline="Hello world"
        )
        assert profile.tagline == "Hello world"

    def test_create_with_invalid_slug_rejected(self, db):
        user = _make_user(db)
        with pytest.raises(InvalidSlugError):
            OrbitService.create_profile(db, user_id=user.id, slug="NO", display_name="Bad Slug")

    def test_create_with_reserved_slug_rejected(self, db):
        user = _make_user(db)
        with pytest.raises(InvalidSlugError, match="reserved"):
            OrbitService.create_profile(db, user_id=user.id, slug="admin", display_name="Admin")


class TestGetProfile:
    def test_get_by_slug(self, db):
        user = _make_user(db)
        OrbitService.create_profile(db, user.id, "find-me", "Find Me")
        db.commit()

        found = OrbitService.get_by_slug(db, "find-me")
        assert found is not None
        assert found.slug == "find-me"

    def test_get_by_slug_not_found(self, db):
        result = OrbitService.get_by_slug(db, "nonexistent")
        assert result is None

    def test_get_by_user_id(self, db):
        user = _make_user(db)
        OrbitService.create_profile(db, user.id, "user-orbit", "User Orbit")
        db.commit()

        found = OrbitService.get_by_user_id(db, user.id)
        assert found is not None
        assert found.display_name == "User Orbit"

    def test_get_by_user_id_not_found(self, db):
        result = OrbitService.get_by_user_id(db, "no-such-user")
        assert result is None


class TestUpdateProfile:
    def test_update_display_name(self, db):
        user = _make_user(db)
        profile = OrbitService.create_profile(db, user.id, "update-me", "Original")
        db.commit()

        updated = OrbitService.update_profile(db, profile.id, display_name="Updated Name")
        assert updated.display_name == "Updated Name"

    def test_update_multiple_fields(self, db):
        user = _make_user(db)
        profile = OrbitService.create_profile(db, user.id, "multi-update", "Original")
        db.commit()

        updated = OrbitService.update_profile(
            db, profile.id, display_name="New Name", tagline="New tagline"
        )
        assert updated.display_name == "New Name"
        assert updated.tagline == "New tagline"

    def test_update_not_found(self, db):
        with pytest.raises(ValueError, match="Profile not found"):
            OrbitService.update_profile(db, "nonexistent-id", display_name="Fail")


class TestDefaultSections:
    def test_add_default_sections(self, db):
        user = _make_user(db)
        profile = OrbitService.create_profile(db, user.id, "with-sections", "Sections Test")
        db.commit()

        sections = OrbitService.add_default_sections(db, profile.id)
        assert len(sections) == 4

        types = [s.section_type for s in sections]
        assert types == ["hero", "links", "persona_quiz", "contact"]

        indices = [s.order_index for s in sections]
        assert indices == [0, 1, 2, 3]
