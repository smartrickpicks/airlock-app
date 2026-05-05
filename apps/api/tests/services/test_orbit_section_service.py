"""Tests for OrbitSectionService — CRUD, reorder, visibility."""

import uuid

import pytest
from sqlalchemy import JSON, create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from src.db import Base
from src.models.orbit_profile import OrbitProfile
from src.models.orbit_section import OrbitSection
from src.models.user import User
from src.services.orbit_section_service import InvalidSectionTypeError, OrbitSectionService

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


def _make_profile(db: Session) -> OrbitProfile:
    user = _make_user(db)
    profile = OrbitProfile(
        id=_uid(),
        user_id=user.id,
        slug=f"test-{uuid.uuid4().hex[:8]}",
        display_name="Test Creator",
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestCreate:
    def test_create_section(self, db):
        profile = _make_profile(db)
        section = OrbitSectionService.create(
            db, profile.id, "hero", "Welcome", {"heading": "Hello"}
        )
        assert section.section_type == "hero"
        assert section.title == "Welcome"
        assert section.content == {"heading": "Hello"}
        assert section.order_index == 0
        assert section.is_visible is True

    def test_auto_increment_order(self, db):
        profile = _make_profile(db)
        s1 = OrbitSectionService.create(db, profile.id, "hero", "First")
        s2 = OrbitSectionService.create(db, profile.id, "links", "Second")
        s3 = OrbitSectionService.create(db, profile.id, "contact", "Third")
        assert s1.order_index == 0
        assert s2.order_index == 1
        assert s3.order_index == 2

    def test_reject_invalid_type(self, db):
        profile = _make_profile(db)
        with pytest.raises(InvalidSectionTypeError, match="Invalid section type"):
            OrbitSectionService.create(db, profile.id, "banana", "Bad Type")


class TestListForProfile:
    def test_list_ordered(self, db):
        profile = _make_profile(db)
        OrbitSectionService.create(db, profile.id, "contact", "Contact")
        OrbitSectionService.create(db, profile.id, "hero", "Hero")
        OrbitSectionService.create(db, profile.id, "links", "Links")
        db.commit()

        sections = OrbitSectionService.list_for_profile(db, profile.id)
        assert len(sections) == 3
        assert [s.order_index for s in sections] == [0, 1, 2]

    def test_list_visible_only(self, db):
        profile = _make_profile(db)
        s1 = OrbitSectionService.create(db, profile.id, "hero", "Visible")
        s2 = OrbitSectionService.create(db, profile.id, "links", "Hidden")
        OrbitSectionService.toggle_visibility(db, s2.id, False)
        db.commit()

        all_sections = OrbitSectionService.list_for_profile(db, profile.id, visible_only=False)
        assert len(all_sections) == 2

        visible = OrbitSectionService.list_for_profile(db, profile.id, visible_only=True)
        assert len(visible) == 1
        assert visible[0].id == s1.id


class TestReorder:
    def test_reorder_sections(self, db):
        profile = _make_profile(db)
        s1 = OrbitSectionService.create(db, profile.id, "hero", "First")
        s2 = OrbitSectionService.create(db, profile.id, "links", "Second")
        s3 = OrbitSectionService.create(db, profile.id, "contact", "Third")
        db.commit()

        # Reverse order
        OrbitSectionService.reorder(db, [(s1.id, 2), (s2.id, 1), (s3.id, 0)])
        db.commit()

        sections = OrbitSectionService.list_for_profile(db, profile.id)
        assert sections[0].id == s3.id
        assert sections[1].id == s2.id
        assert sections[2].id == s1.id


class TestToggleVisibility:
    def test_toggle_visibility(self, db):
        profile = _make_profile(db)
        section = OrbitSectionService.create(db, profile.id, "hero", "Test")
        assert section.is_visible is True

        updated = OrbitSectionService.toggle_visibility(db, section.id, False)
        assert updated.is_visible is False

        updated = OrbitSectionService.toggle_visibility(db, section.id, True)
        assert updated.is_visible is True


class TestUpdateContent:
    def test_update_content(self, db):
        profile = _make_profile(db)
        section = OrbitSectionService.create(db, profile.id, "hero", "Test", {"old": True})
        db.commit()

        updated = OrbitSectionService.update_content(db, section.id, {"new": True, "data": 42})
        assert updated.content == {"new": True, "data": 42}


class TestDelete:
    def test_delete_section(self, db):
        profile = _make_profile(db)
        section = OrbitSectionService.create(db, profile.id, "hero", "Delete Me")
        db.commit()

        OrbitSectionService.delete(db, section.id)
        db.commit()

        assert OrbitSectionService.get(db, section.id) is None

    def test_delete_nonexistent_is_noop(self, db):
        OrbitSectionService.delete(db, "nonexistent-id")  # Should not raise
