"""Tests for OrbitPersonaService — contextual persona generation."""

import uuid

import pytest
from sqlalchemy import JSON, create_engine, event
from sqlalchemy.orm import sessionmaker

from src.db import Base
from src.models.orbit_persona import OrbitPersona
from src.models.orbit_profile import OrbitProfile
from src.models.user import User
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

    for model in [User, OrbitProfile, OrbitPersona]:
        for col in model.__table__.columns:
            if hasattr(col.type, "__class__") and col.type.__class__.__name__ == "JSONB":
                col.type = JSON()

    Base.metadata.create_all(
        engine, tables=[User.__table__, OrbitProfile.__table__, OrbitPersona.__table__]
    )
    session = sessionmaker(bind=engine)()
    yield session
    session.close()
    engine.dispose()


def _uid() -> str:
    return str(uuid.uuid4())


def _make_profile(db) -> OrbitProfile:
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
    return profile


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestGenerateDefaults:
    def test_creates_five_personas(self, db):
        profile = _make_profile(db)
        personas = OrbitPersonaService.generate_defaults(db, profile.id)
        assert len(personas) == 5

    def test_personas_have_correct_profiles(self, db):
        profile = _make_profile(db)
        personas = OrbitPersonaService.generate_defaults(db, profile.id)
        pi_profiles = [p.pi_profile for p in personas]
        assert pi_profiles == ["persuader", "analyzer", "guardian", "venturer", "collaborator"]

    def test_personas_have_traits(self, db):
        profile = _make_profile(db)
        personas = OrbitPersonaService.generate_defaults(db, profile.id)
        for persona in personas:
            assert isinstance(persona.traits, list)
            assert len(persona.traits) == 3

    def test_niche_appended_to_description(self, db):
        profile = _make_profile(db)
        personas = OrbitPersonaService.generate_defaults(db, profile.id, niche="fitness")
        for persona in personas:
            assert "fitness" in persona.description

    def test_no_niche_no_dash(self, db):
        profile = _make_profile(db)
        personas = OrbitPersonaService.generate_defaults(db, profile.id)
        for persona in personas:
            assert " — " not in persona.description

    def test_order_indices_sequential(self, db):
        profile = _make_profile(db)
        personas = OrbitPersonaService.generate_defaults(db, profile.id)
        indices = [p.order_index for p in personas]
        assert indices == [0, 1, 2, 3, 4]


class TestListForProfile:
    def test_returns_ordered_personas(self, db):
        profile = _make_profile(db)
        OrbitPersonaService.generate_defaults(db, profile.id)
        db.commit()

        result = OrbitPersonaService.list_for_profile(db, profile.id)
        assert len(result) == 5
        assert [p.order_index for p in result] == [0, 1, 2, 3, 4]

    def test_empty_for_unknown_profile(self, db):
        result = OrbitPersonaService.list_for_profile(db, "nonexistent")
        assert result == []


class TestUpdate:
    def test_update_display_name(self, db):
        profile = _make_profile(db)
        personas = OrbitPersonaService.generate_defaults(db, profile.id)
        db.commit()

        updated = OrbitPersonaService.update(db, personas[0].id, display_name="Custom Name")
        assert updated.display_name == "Custom Name"

    def test_update_traits(self, db):
        profile = _make_profile(db)
        personas = OrbitPersonaService.generate_defaults(db, profile.id)
        db.commit()

        new_traits = ["bold", "creative", "fearless"]
        updated = OrbitPersonaService.update(db, personas[0].id, traits=new_traits)
        assert updated.traits == new_traits

    def test_update_not_found(self, db):
        with pytest.raises(ValueError, match="Persona not found"):
            OrbitPersonaService.update(db, "nonexistent", display_name="Fail")

    def test_update_disallowed_field(self, db):
        profile = _make_profile(db)
        personas = OrbitPersonaService.generate_defaults(db, profile.id)
        db.commit()

        with pytest.raises(ValueError, match="Cannot update field"):
            OrbitPersonaService.update(db, personas[0].id, pi_profile="hacker")


class TestReorder:
    def test_reorder_personas(self, db):
        profile = _make_profile(db)
        personas = OrbitPersonaService.generate_defaults(db, profile.id)
        db.commit()

        reversed_ids = [p.id for p in reversed(personas)]
        reordered = OrbitPersonaService.reorder(db, reversed_ids)
        assert [p.order_index for p in reordered] == [0, 1, 2, 3, 4]
        # First in new order should be what was last
        assert reordered[0].id == personas[-1].id

    def test_reorder_not_found(self, db):
        with pytest.raises(ValueError, match="Persona not found"):
            OrbitPersonaService.reorder(db, ["nonexistent"])
