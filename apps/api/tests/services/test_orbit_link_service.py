"""Tests for OrbitLinkService — CRUD and click tracking."""

import uuid

import pytest
from sqlalchemy import JSON, create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from src.db import Base
from src.models.orbit_link import OrbitLink
from src.models.orbit_profile import OrbitProfile
from src.models.user import User
from src.services.orbit_link_service import OrbitLinkService

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

    for model in [User, OrbitProfile, OrbitLink]:
        for col in model.__table__.columns:
            if hasattr(col.type, "__class__") and col.type.__class__.__name__ == "JSONB":
                col.type = JSON()

    Base.metadata.create_all(
        engine, tables=[User.__table__, OrbitProfile.__table__, OrbitLink.__table__]
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
    def test_create_link(self, db):
        profile = _make_profile(db)
        link = OrbitLinkService.create(db, profile.id, "My Site", "https://example.com")
        assert link.title == "My Site"
        assert link.url == "https://example.com"
        assert link.icon is None
        assert link.order_index == 0
        assert link.click_count == 0

    def test_create_with_icon(self, db):
        profile = _make_profile(db)
        link = OrbitLinkService.create(
            db, profile.id, "Twitter", "https://twitter.com", icon="twitter"
        )
        assert link.icon == "twitter"

    def test_auto_increment_order(self, db):
        profile = _make_profile(db)
        l1 = OrbitLinkService.create(db, profile.id, "First", "https://a.com")
        l2 = OrbitLinkService.create(db, profile.id, "Second", "https://b.com")
        l3 = OrbitLinkService.create(db, profile.id, "Third", "https://c.com")
        assert l1.order_index == 0
        assert l2.order_index == 1
        assert l3.order_index == 2


class TestRecordClick:
    def test_record_click_increments(self, db):
        profile = _make_profile(db)
        link = OrbitLinkService.create(db, profile.id, "Clickable", "https://click.me")
        db.commit()
        assert link.click_count == 0

        OrbitLinkService.record_click(db, link.id, profile.id)
        db.commit()
        db.refresh(link)
        assert link.click_count == 1

        OrbitLinkService.record_click(db, link.id, profile.id)
        db.commit()
        db.refresh(link)
        assert link.click_count == 2

    def test_record_click_with_metadata(self, db):
        profile = _make_profile(db)
        link = OrbitLinkService.create(db, profile.id, "Tracked", "https://track.me")
        db.commit()

        OrbitLinkService.record_click(
            db,
            link.id,
            profile.id,
            fan_id="fan-123",
            referrer="https://google.com",
            user_agent="Mozilla/5.0",
            utm_source="twitter",
            utm_medium="social",
            utm_campaign="launch",
        )
        db.commit()
        db.refresh(link)
        assert link.click_count == 1

    def test_record_click_not_found(self, db):
        profile = _make_profile(db)
        with pytest.raises(ValueError, match="Link not found"):
            OrbitLinkService.record_click(db, "nonexistent", profile.id)


class TestGetStats:
    def test_get_link_stats(self, db):
        profile = _make_profile(db)
        l1 = OrbitLinkService.create(db, profile.id, "Link A", "https://a.com")
        l2 = OrbitLinkService.create(db, profile.id, "Link B", "https://b.com")
        db.commit()

        OrbitLinkService.record_click(db, l1.id, profile.id)
        OrbitLinkService.record_click(db, l1.id, profile.id)
        OrbitLinkService.record_click(db, l2.id, profile.id)
        db.commit()

        stats = OrbitLinkService.get_link_stats(db, profile.id)
        assert len(stats) == 2
        assert stats[0]["title"] == "Link A"
        assert stats[0]["click_count"] == 2
        assert stats[1]["title"] == "Link B"
        assert stats[1]["click_count"] == 1

    def test_get_link_stats_empty(self, db):
        profile = _make_profile(db)
        stats = OrbitLinkService.get_link_stats(db, profile.id)
        assert stats == []


class TestReorder:
    def test_reorder_links(self, db):
        profile = _make_profile(db)
        l1 = OrbitLinkService.create(db, profile.id, "First", "https://a.com")
        l2 = OrbitLinkService.create(db, profile.id, "Second", "https://b.com")
        db.commit()

        OrbitLinkService.reorder(db, [(l1.id, 1), (l2.id, 0)])
        db.commit()

        stats = OrbitLinkService.get_link_stats(db, profile.id)
        assert stats[0]["title"] == "Second"
        assert stats[1]["title"] == "First"


class TestDelete:
    def test_delete_link(self, db):
        profile = _make_profile(db)
        link = OrbitLinkService.create(db, profile.id, "Delete Me", "https://del.com")
        db.commit()

        OrbitLinkService.delete(db, link.id)
        db.commit()

        stats = OrbitLinkService.get_link_stats(db, profile.id)
        assert len(stats) == 0

    def test_delete_nonexistent_is_noop(self, db):
        OrbitLinkService.delete(db, "nonexistent-id")  # Should not raise
