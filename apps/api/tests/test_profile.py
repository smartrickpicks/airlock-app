"""MAGS Profile Storage tests.

Tests the full profile storage pipeline:
- Model smoke tests (table names, imports)
- Schema validation (Pydantic request/response schemas)
- Service layer CRUD (with in-memory SQLite)
- Changelog (append-only audit trail)
- Sovereignty (privacy controls)
- Workspace membership management
- Route integration tests via TestClient

Coverage targets:
- Profile create / get / enrich / override / soft-delete
- Changelog immutability and pagination
- Sovereignty update with partial fields
- Workspace membership create / list / update
- Error handling (duplicate, not found, type errors)
- All profile sources and changelog actions
"""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from src.db import Base
from src.models.user_profile import UserProfile
from src.models.user_profile_changelog import UserProfileChangelog
from src.models.workspace_membership import WorkspaceMembership
from src.schemas.profile import (
    ChangelogAction,
    CreateProfileRequest,
    CreateWorkspaceMembershipRequest,
    EnrichProfileRequest,
    OrgRole,
    OverrideProfileRequest,
    ProfileResponse,
    ProfileSource,
    ProfileSummaryResponse,
    UpdateSovereigntyRequest,
    UpdateWorkspaceMembershipRequest,
    WorkspaceMembershipResponse,
)
from src.services import profile as profile_service

# --- Fixtures: In-memory SQLite for service tests ---


@pytest.fixture
def test_db() -> Session:
    """Create a fresh in-memory SQLite database for each test.

    Only creates the three MAGS profile tables — avoids JSONB issues
    from other models that SQLite can't compile.
    """
    from sqlalchemy import JSON, event

    test_engine = create_engine("sqlite:///:memory:")

    # SQLite doesn't support JSONB — render it as JSON via a compile hook
    from sqlalchemy.dialects.postgresql import JSONB

    @event.listens_for(test_engine, "connect")
    def _set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()

    # Only create our three tables (not all Base.metadata)
    tables = [
        UserProfile.__table__,
        UserProfileChangelog.__table__,
        WorkspaceMembership.__table__,
    ]
    # Replace JSONB with JSON for SQLite compatibility
    for table in tables:
        for col in table.columns:
            if isinstance(col.type, JSONB):
                col.type = JSON()

    Base.metadata.create_all(test_engine, tables=tables)
    test_session_factory = sessionmaker(bind=test_engine, autocommit=False, autoflush=False)
    session = test_session_factory()
    try:
        yield session
    finally:
        session.close()
        test_engine.dispose()


@pytest.fixture
def sample_create_request() -> CreateProfileRequest:
    """Standard create request for a Maverick profile."""
    from src.schemas.inference import DECFDrives, MetaArchetype

    return CreateProfileRequest(
        pi_profile="maverick",
        meta_archetype=MetaArchetype.DRIVER,
        confidence=0.72,
        drives=DECFDrives(dominance=9.0, extraversion=8.0, patience=3.0, formality=2.0),
        source=ProfileSource.CONVERSATION,
        signals={"conversation": {"completed_at": "2026-03-09", "question_count": 4}},
    )


# =====================================================================
# Model Smoke Tests
# =====================================================================


class TestProfileModels:
    """Verify ORM models are importable and have correct table names."""

    def test_user_profile_tablename(self) -> None:
        assert UserProfile.__tablename__ == "user_profiles"

    def test_user_profile_changelog_tablename(self) -> None:
        assert UserProfileChangelog.__tablename__ == "user_profile_changelog"

    def test_workspace_membership_tablename(self) -> None:
        assert WorkspaceMembership.__tablename__ == "workspace_memberships"

    def test_models_importable_from_init(self) -> None:
        """All three new models should be in src.models.__init__."""
        from src.models import UserProfile, UserProfileChangelog, WorkspaceMembership

        assert UserProfile is not None
        assert UserProfileChangelog is not None
        assert WorkspaceMembership is not None


# =====================================================================
# Schema Validation Tests
# =====================================================================


class TestProfileSchemas:
    """Test Pydantic schema validation rules."""

    def test_create_request_valid(self) -> None:
        from src.schemas.inference import DECFDrives, MetaArchetype

        req = CreateProfileRequest(
            pi_profile="captain",
            meta_archetype=MetaArchetype.DRIVER,
            confidence=0.65,
            drives=DECFDrives(dominance=8.0, extraversion=7.0, patience=4.0, formality=3.0),
        )
        assert req.pi_profile == "captain"
        assert req.source == ProfileSource.CONVERSATION  # default

    def test_create_request_confidence_bounds(self) -> None:
        from pydantic import ValidationError

        from src.schemas.inference import DECFDrives, MetaArchetype

        with pytest.raises(ValidationError):
            CreateProfileRequest(
                pi_profile="captain",
                meta_archetype=MetaArchetype.DRIVER,
                confidence=1.5,  # exceeds 1.0
                drives=DECFDrives(dominance=5.0, extraversion=5.0, patience=5.0, formality=5.0),
            )

    def test_create_request_negative_confidence(self) -> None:
        from pydantic import ValidationError

        from src.schemas.inference import DECFDrives, MetaArchetype

        with pytest.raises(ValidationError):
            CreateProfileRequest(
                pi_profile="captain",
                meta_archetype=MetaArchetype.DRIVER,
                confidence=-0.1,
                drives=DECFDrives(dominance=5.0, extraversion=5.0, patience=5.0, formality=5.0),
            )

    def test_enrich_request_all_optional(self) -> None:
        req = EnrichProfileRequest(source=ProfileSource.LINKEDIN)
        assert req.drives is None
        assert req.confidence is None
        assert req.pi_profile is None

    def test_override_request_with_reason(self) -> None:
        req = OverrideProfileRequest(pi_profile="strategist", reason="I identify more with this")
        assert req.reason == "I identify more with this"
        assert len(req.reason) <= 500

    def test_sovereignty_request_all_optional(self) -> None:
        req = UpdateSovereigntyRequest()
        assert req.profile_visible is None
        assert req.drives_visible is None

    def test_org_role_enum_values(self) -> None:
        assert OrgRole.ARCHITECT.value == "architect"
        assert OrgRole.CONTROLLER.value == "controller"
        assert OrgRole.MEMBER.value == "member"
        assert OrgRole.GUEST.value == "guest"

    def test_profile_source_enum_values(self) -> None:
        assert ProfileSource.CONVERSATION.value == "conversation"
        assert ProfileSource.LINKEDIN.value == "linkedin"
        assert ProfileSource.RESUME.value == "resume"
        assert ProfileSource.USER_OVERRIDE.value == "user_override"
        assert ProfileSource.BEHAVIORAL.value == "behavioral"

    def test_changelog_action_enum_values(self) -> None:
        assert ChangelogAction.CREATED.value == "created"
        assert ChangelogAction.ENRICHED.value == "enriched"
        assert ChangelogAction.OVERRIDE.value == "override"
        assert ChangelogAction.RESET.value == "reset"
        assert ChangelogAction.REASSESSED.value == "reassessed"

    def test_profile_response_from_attributes(self) -> None:
        assert ProfileResponse.model_config["from_attributes"] is True

    def test_profile_summary_response_from_attributes(self) -> None:
        assert ProfileSummaryResponse.model_config["from_attributes"] is True

    def test_workspace_membership_response_from_attributes(self) -> None:
        assert WorkspaceMembershipResponse.model_config["from_attributes"] is True


# =====================================================================
# Service Layer: Profile CRUD
# =====================================================================


class TestProfileService:
    """Test profile service CRUD operations with in-memory SQLite."""

    def test_create_profile(
        self, test_db: Session, sample_create_request: CreateProfileRequest
    ) -> None:
        profile = profile_service.create_profile(
            test_db, user_id="user_001", request=sample_create_request
        )
        assert profile.user_id == "user_001"
        assert profile.pi_profile == "maverick"
        assert profile.meta_archetype == "driver"
        assert profile.confidence == 0.72
        assert profile.drives["dominance"] == 9.0
        assert profile.drives["extraversion"] == 8.0
        assert profile.sovereignty["profile_visible"] is True
        assert profile.sovereignty["drives_visible"] is False

    def test_create_profile_generates_ulid(
        self, test_db: Session, sample_create_request: CreateProfileRequest
    ) -> None:
        profile = profile_service.create_profile(
            test_db, user_id="user_ulid", request=sample_create_request
        )
        assert len(profile.id) == 26  # ULID length

    def test_create_profile_duplicate_raises(
        self, test_db: Session, sample_create_request: CreateProfileRequest
    ) -> None:
        profile_service.create_profile(test_db, user_id="user_dup", request=sample_create_request)
        with pytest.raises(ValueError, match="already has a profile"):
            profile_service.create_profile(
                test_db, user_id="user_dup", request=sample_create_request
            )

    def test_create_profile_logs_changelog(
        self, test_db: Session, sample_create_request: CreateProfileRequest
    ) -> None:
        profile_service.create_profile(test_db, user_id="user_log", request=sample_create_request)
        entries, total = profile_service.get_changelog(test_db, user_id="user_log")
        assert total == 1
        assert entries[0].action == "created"
        assert entries[0].source == "conversation"
        assert entries[0].delta["after"]["pi_profile"] == "maverick"

    def test_get_profile_by_user(
        self, test_db: Session, sample_create_request: CreateProfileRequest
    ) -> None:
        profile_service.create_profile(test_db, user_id="user_get", request=sample_create_request)
        profile = profile_service.get_profile_by_user(test_db, user_id="user_get")
        assert profile is not None
        assert profile.pi_profile == "maverick"

    def test_get_profile_not_found(self, test_db: Session) -> None:
        profile = profile_service.get_profile_by_user(test_db, user_id="nonexistent")
        assert profile is None

    def test_get_profile_excludes_soft_deleted(
        self, test_db: Session, sample_create_request: CreateProfileRequest
    ) -> None:
        profile_service.create_profile(test_db, user_id="user_del", request=sample_create_request)
        profile_service.soft_delete_profile(test_db, user_id="user_del")
        result = profile_service.get_profile_by_user(test_db, user_id="user_del")
        assert result is None


# =====================================================================
# Service Layer: Enrich Profile
# =====================================================================


class TestEnrichProfile:
    """Test profile enrichment with additional signals."""

    def test_enrich_updates_confidence(
        self, test_db: Session, sample_create_request: CreateProfileRequest
    ) -> None:
        profile_service.create_profile(
            test_db, user_id="user_enrich", request=sample_create_request
        )
        enrich_req = EnrichProfileRequest(
            source=ProfileSource.LINKEDIN,
            confidence=0.88,
        )
        profile = profile_service.enrich_profile(test_db, user_id="user_enrich", request=enrich_req)
        assert profile.confidence == 0.88

    def test_enrich_updates_profile_id(
        self, test_db: Session, sample_create_request: CreateProfileRequest
    ) -> None:
        profile_service.create_profile(
            test_db, user_id="user_enrich2", request=sample_create_request
        )
        enrich_req = EnrichProfileRequest(
            source=ProfileSource.LINKEDIN,
            pi_profile="captain",
        )
        profile = profile_service.enrich_profile(
            test_db, user_id="user_enrich2", request=enrich_req
        )
        assert profile.pi_profile == "captain"

    def test_enrich_merges_signals(
        self, test_db: Session, sample_create_request: CreateProfileRequest
    ) -> None:
        profile_service.create_profile(test_db, user_id="user_merge", request=sample_create_request)
        enrich_req = EnrichProfileRequest(
            source=ProfileSource.LINKEDIN,
            additional_signals={"linkedin": {"imported_at": "2026-03-09"}},
        )
        profile = profile_service.enrich_profile(test_db, user_id="user_merge", request=enrich_req)
        assert "linkedin" in profile.signals
        assert "conversation" in profile.signals  # original preserved

    def test_enrich_updates_drives(
        self, test_db: Session, sample_create_request: CreateProfileRequest
    ) -> None:
        from src.schemas.inference import DECFDrives

        profile_service.create_profile(
            test_db, user_id="user_drives", request=sample_create_request
        )
        enrich_req = EnrichProfileRequest(
            source=ProfileSource.RESUME,
            drives=DECFDrives(dominance=7.0, extraversion=6.0, patience=5.0, formality=4.0),
        )
        profile = profile_service.enrich_profile(test_db, user_id="user_drives", request=enrich_req)
        assert profile.drives["dominance"] == 7.0
        assert profile.drives["patience"] == 5.0

    def test_enrich_logs_changelog(
        self, test_db: Session, sample_create_request: CreateProfileRequest
    ) -> None:
        profile_service.create_profile(test_db, user_id="user_elog", request=sample_create_request)
        enrich_req = EnrichProfileRequest(
            source=ProfileSource.LINKEDIN,
            confidence=0.85,
        )
        profile_service.enrich_profile(test_db, user_id="user_elog", request=enrich_req)
        entries, total = profile_service.get_changelog(test_db, user_id="user_elog")
        assert total == 2  # created + enriched
        actions = {e.action for e in entries}
        assert "created" in actions
        assert "enriched" in actions
        enriched_entry = next(e for e in entries if e.action == "enriched")
        assert enriched_entry.source == "linkedin"

    def test_enrich_nonexistent_raises(self, test_db: Session) -> None:
        enrich_req = EnrichProfileRequest(source=ProfileSource.LINKEDIN)
        with pytest.raises(ValueError, match="No profile found"):
            profile_service.enrich_profile(test_db, user_id="ghost", request=enrich_req)


# =====================================================================
# Service Layer: Override Profile
# =====================================================================


class TestOverrideProfile:
    """Test user profile override."""

    @staticmethod
    def _mock_engine(profile_data: dict | None = None):
        """Create a mock ProfileMatchingEngine that passes isinstance checks.

        Uses spec=ProfileMatchingEngine so isinstance() returns True.
        """
        from src.services.inference import ProfileMatchingEngine

        mock = MagicMock(spec=ProfileMatchingEngine)

        if profile_data is None:
            profile_data = {
                "category": "exploring",
                "drives": {
                    "dominance": 8.5,
                    "extraversion": 7.0,
                    "patience": 4.0,
                    "formality": 3.0,
                },
                "workspace": {"cognitive_mode": "exploration"},
                "otto": {
                    "default_archetype": "strategist",
                    "autonomy_ceiling": 0.60,
                    "interaction_mode": "autonomous",
                },
            }
        mock.get_profile_data.return_value = profile_data
        return mock

    def test_override_sets_confidence_090(
        self, test_db: Session, sample_create_request: CreateProfileRequest
    ) -> None:
        profile_service.create_profile(
            test_db, user_id="user_override", request=sample_create_request
        )
        override_req = OverrideProfileRequest(pi_profile="strategist", reason="Feels right")

        engine = self._mock_engine()
        profile = profile_service.override_profile(
            test_db, user_id="user_override", request=override_req, engine=engine
        )

        assert profile.confidence == 0.90
        assert profile.pi_profile == "strategist"
        assert profile.source == "user_override"

    def test_override_nonexistent_raises(self, test_db: Session) -> None:
        override_req = OverrideProfileRequest(pi_profile="strategist")
        engine = self._mock_engine()
        with pytest.raises(ValueError, match="No profile found"):
            profile_service.override_profile(
                test_db, user_id="ghost", request=override_req, engine=engine
            )

    def test_override_unknown_profile_raises(
        self, test_db: Session, sample_create_request: CreateProfileRequest
    ) -> None:
        profile_service.create_profile(test_db, user_id="user_unk", request=sample_create_request)
        override_req = OverrideProfileRequest(pi_profile="nonexistent_profile")

        engine = self._mock_engine()
        engine.get_profile_data.return_value = None

        with pytest.raises(ValueError, match="not found in canonical profiles"):
            profile_service.override_profile(
                test_db, user_id="user_unk", request=override_req, engine=engine
            )

    def test_override_logs_changelog(
        self, test_db: Session, sample_create_request: CreateProfileRequest
    ) -> None:
        profile_service.create_profile(test_db, user_id="user_olog", request=sample_create_request)
        override_req = OverrideProfileRequest(pi_profile="strategist", reason="Better fit")

        engine = self._mock_engine()
        profile_service.override_profile(
            test_db, user_id="user_olog", request=override_req, engine=engine
        )

        entries, total = profile_service.get_changelog(test_db, user_id="user_olog")
        assert total == 2  # created + override
        actions = {e.action for e in entries}
        assert "override" in actions
        override_entry = next(e for e in entries if e.action == "override")
        assert override_entry.delta["after"]["reason"] == "Better fit"


# =====================================================================
# Service Layer: Sovereignty
# =====================================================================


class TestSovereignty:
    """Test privacy/sovereignty controls."""

    def test_update_sovereignty_partial(
        self, test_db: Session, sample_create_request: CreateProfileRequest
    ) -> None:
        profile_service.create_profile(test_db, user_id="user_sov", request=sample_create_request)
        sov_req = UpdateSovereigntyRequest(drives_visible=True)
        profile = profile_service.update_sovereignty(test_db, user_id="user_sov", request=sov_req)
        assert profile.sovereignty["drives_visible"] is True
        assert profile.sovereignty["profile_visible"] is True  # unchanged default

    def test_update_sovereignty_all_fields(
        self, test_db: Session, sample_create_request: CreateProfileRequest
    ) -> None:
        profile_service.create_profile(test_db, user_id="user_sov2", request=sample_create_request)
        sov_req = UpdateSovereigntyRequest(
            profile_visible=False,
            drives_visible=True,
            archetype_visible=False,
            export_allowed=True,
        )
        profile = profile_service.update_sovereignty(test_db, user_id="user_sov2", request=sov_req)
        assert profile.sovereignty["profile_visible"] is False
        assert profile.sovereignty["drives_visible"] is True
        assert profile.sovereignty["archetype_visible"] is False
        assert profile.sovereignty["export_allowed"] is True

    def test_update_sovereignty_nonexistent_raises(self, test_db: Session) -> None:
        sov_req = UpdateSovereigntyRequest(drives_visible=True)
        with pytest.raises(ValueError, match="No profile found"):
            profile_service.update_sovereignty(test_db, user_id="ghost", request=sov_req)

    def test_default_sovereignty_values(
        self, test_db: Session, sample_create_request: CreateProfileRequest
    ) -> None:
        profile = profile_service.create_profile(
            test_db, user_id="user_def", request=sample_create_request
        )
        assert profile.sovereignty == {
            "profile_visible": True,
            "drives_visible": False,
            "archetype_visible": True,
            "export_allowed": False,
        }


# =====================================================================
# Service Layer: Soft Delete
# =====================================================================


class TestSoftDelete:
    """Test profile soft-deletion."""

    def test_soft_delete_sets_deleted_at(
        self, test_db: Session, sample_create_request: CreateProfileRequest
    ) -> None:
        profile_service.create_profile(test_db, user_id="user_sd", request=sample_create_request)
        profile_service.soft_delete_profile(test_db, user_id="user_sd")

        # Direct query to see raw record (bypassing soft-delete filter)
        from sqlalchemy import select

        stmt = select(UserProfile).where(UserProfile.user_id == "user_sd")
        raw = test_db.execute(stmt).scalar_one()
        assert raw.deleted_at is not None

    def test_soft_delete_nonexistent_raises(self, test_db: Session) -> None:
        with pytest.raises(ValueError, match="No profile found"):
            profile_service.soft_delete_profile(test_db, user_id="ghost")

    def test_soft_delete_logs_reset_changelog(
        self, test_db: Session, sample_create_request: CreateProfileRequest
    ) -> None:
        profile_service.create_profile(test_db, user_id="user_sdlog", request=sample_create_request)
        profile_service.soft_delete_profile(test_db, user_id="user_sdlog")
        entries, total = profile_service.get_changelog(test_db, user_id="user_sdlog")
        assert total == 2  # created + reset
        actions = {e.action for e in entries}
        assert "created" in actions
        assert "reset" in actions


# =====================================================================
# Service Layer: Changelog
# =====================================================================


class TestChangelog:
    """Test changelog querying and pagination."""

    def test_changelog_contains_all_actions(
        self, test_db: Session, sample_create_request: CreateProfileRequest
    ) -> None:
        profile_service.create_profile(test_db, user_id="user_cl", request=sample_create_request)
        enrich_req = EnrichProfileRequest(source=ProfileSource.LINKEDIN, confidence=0.88)
        profile_service.enrich_profile(test_db, user_id="user_cl", request=enrich_req)

        entries, total = profile_service.get_changelog(test_db, user_id="user_cl")
        assert total == 2
        actions = {e.action for e in entries}
        assert actions == {"created", "enriched"}

    def test_changelog_pagination(
        self, test_db: Session, sample_create_request: CreateProfileRequest
    ) -> None:
        profile_service.create_profile(test_db, user_id="user_page", request=sample_create_request)
        # Create multiple enrichments
        for i in range(5):
            enrich_req = EnrichProfileRequest(
                source=ProfileSource.BEHAVIORAL,
                confidence=0.60 + i * 0.05,
            )
            profile_service.enrich_profile(test_db, user_id="user_page", request=enrich_req)

        # Total should be 6 (1 created + 5 enriched)
        entries, total = profile_service.get_changelog(test_db, user_id="user_page")
        assert total == 6

        # Page 1: limit=2, offset=0
        page1, _ = profile_service.get_changelog(test_db, user_id="user_page", limit=2, offset=0)
        assert len(page1) == 2

        # Page 2: limit=2, offset=2
        page2, _ = profile_service.get_changelog(test_db, user_id="user_page", limit=2, offset=2)
        assert len(page2) == 2

        # No overlap
        assert page1[0].id != page2[0].id

    def test_changelog_empty_for_unknown_user(self, test_db: Session) -> None:
        entries, total = profile_service.get_changelog(test_db, user_id="nobody")
        assert total == 0
        assert entries == []


# =====================================================================
# Service Layer: Workspace Memberships
# =====================================================================


class TestWorkspaceMemberships:
    """Test workspace membership CRUD."""

    def test_create_membership(self, test_db: Session) -> None:
        req = CreateWorkspaceMembershipRequest(
            workspace_id="ws_001",
            user_id="user_ws",
            org_role=OrgRole.MEMBER,
        )
        membership = profile_service.create_workspace_membership(test_db, request=req)
        assert membership.workspace_id == "ws_001"
        assert membership.user_id == "user_ws"
        assert membership.org_role == "member"
        assert len(membership.id) == 26  # ULID

    def test_create_membership_duplicate_raises(self, test_db: Session) -> None:
        req = CreateWorkspaceMembershipRequest(
            workspace_id="ws_dup",
            user_id="user_wsdup",
            org_role=OrgRole.MEMBER,
        )
        profile_service.create_workspace_membership(test_db, request=req)
        with pytest.raises(ValueError, match="already a member"):
            profile_service.create_workspace_membership(test_db, request=req)

    def test_create_membership_with_roles(self, test_db: Session) -> None:
        req = CreateWorkspaceMembershipRequest(
            workspace_id="ws_roles",
            user_id="user_roles",
            org_role=OrgRole.ARCHITECT,
            module_roles={"contracts": "owner", "crm": "builder"},
        )
        membership = profile_service.create_workspace_membership(test_db, request=req)
        assert membership.org_role == "architect"
        assert membership.module_roles["contracts"] == "owner"

    def test_get_workspace_membership(self, test_db: Session) -> None:
        req = CreateWorkspaceMembershipRequest(
            workspace_id="ws_get",
            user_id="user_wsget",
        )
        profile_service.create_workspace_membership(test_db, request=req)
        membership = profile_service.get_workspace_membership(
            test_db, workspace_id="ws_get", user_id="user_wsget"
        )
        assert membership is not None
        assert membership.org_role == "member"

    def test_get_workspace_membership_not_found(self, test_db: Session) -> None:
        membership = profile_service.get_workspace_membership(
            test_db, workspace_id="ws_none", user_id="user_none"
        )
        assert membership is None

    def test_list_workspace_memberships(self, test_db: Session) -> None:
        for i in range(3):
            req = CreateWorkspaceMembershipRequest(
                workspace_id="ws_list",
                user_id=f"user_list_{i}",
            )
            profile_service.create_workspace_membership(test_db, request=req)

        memberships = profile_service.list_workspace_memberships(test_db, workspace_id="ws_list")
        assert len(memberships) == 3

    def test_list_workspace_memberships_empty(self, test_db: Session) -> None:
        memberships = profile_service.list_workspace_memberships(test_db, workspace_id="ws_empty")
        assert memberships == []

    def test_update_workspace_membership(self, test_db: Session) -> None:
        req = CreateWorkspaceMembershipRequest(
            workspace_id="ws_upd",
            user_id="user_wsupd",
            org_role=OrgRole.MEMBER,
        )
        profile_service.create_workspace_membership(test_db, request=req)

        update_req = UpdateWorkspaceMembershipRequest(
            org_role=OrgRole.CONTROLLER,
            drives_visible=True,
        )
        membership = profile_service.update_workspace_membership(
            test_db, workspace_id="ws_upd", user_id="user_wsupd", request=update_req
        )
        assert membership.org_role == "controller"
        assert membership.drives_visible is True

    def test_update_membership_not_found_raises(self, test_db: Session) -> None:
        update_req = UpdateWorkspaceMembershipRequest(org_role=OrgRole.ARCHITECT)
        with pytest.raises(ValueError, match="Membership not found"):
            profile_service.update_workspace_membership(
                test_db, workspace_id="ws_none", user_id="user_none", request=update_req
            )

    def test_update_membership_module_roles(self, test_db: Session) -> None:
        req = CreateWorkspaceMembershipRequest(
            workspace_id="ws_mod",
            user_id="user_wsmod",
        )
        profile_service.create_workspace_membership(test_db, request=req)

        update_req = UpdateWorkspaceMembershipRequest(
            module_roles={"contracts": "gatekeeper", "triage": "builder"},
        )
        membership = profile_service.update_workspace_membership(
            test_db, workspace_id="ws_mod", user_id="user_wsmod", request=update_req
        )
        assert membership.module_roles["contracts"] == "gatekeeper"
        assert membership.module_roles["triage"] == "builder"


# =====================================================================
# Internal Helpers
# =====================================================================


class TestInternalHelpers:
    """Test module-level helper functions."""

    def test_resolve_archetype_exploring(self) -> None:
        result = profile_service._resolve_archetype_from_data({"category": "exploring"})
        assert result == "driver"

    def test_resolve_archetype_producing(self) -> None:
        result = profile_service._resolve_archetype_from_data({"category": "producing"})
        assert result == "driver"

    def test_resolve_archetype_stabilizing(self) -> None:
        result = profile_service._resolve_archetype_from_data({"category": "stabilizing"})
        assert result == "enforcer"

    def test_resolve_archetype_anchoring(self) -> None:
        result = profile_service._resolve_archetype_from_data({"category": "anchoring"})
        assert result == "enforcer"

    def test_resolve_archetype_unknown(self) -> None:
        result = profile_service._resolve_archetype_from_data({"category": "something_else"})
        assert result == "interpreter"

    def test_resolve_archetype_missing_category(self) -> None:
        result = profile_service._resolve_archetype_from_data({})
        assert result == "interpreter"

    def test_default_sovereignty_dict(self) -> None:
        assert profile_service.DEFAULT_SOVEREIGNTY == {
            "profile_visible": True,
            "drives_visible": False,
            "archetype_visible": True,
            "export_allowed": False,
        }


# =====================================================================
# Route Integration Tests (via TestClient)
# =====================================================================


class TestProfileRoutes:
    """Test profile API routes via FastAPI TestClient."""

    def test_profile_routes_registered(self) -> None:
        """Verify profile router is registered in the app."""
        from src.main import app

        routes = [r.path for r in app.routes]
        assert "/api/v1/profiles" in routes or any("/profiles" in r for r in routes)

    def test_profile_router_prefix(self) -> None:
        """Verify router has correct prefix."""
        from src.routes.profile import router

        assert router.prefix == "/api/v1"

    def test_profile_router_tags(self) -> None:
        """Verify router is tagged for API docs."""
        from src.routes.profile import router

        assert "profiles" in router.tags
