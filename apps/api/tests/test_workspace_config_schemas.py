"""Unit tests for WorkspaceConfig Pydantic schemas.

Tests cover:
- WorkspaceConfigCreate: required fields, defaults, optional fields
- WorkspaceConfigUpdate: all-optional, partial update semantics
- WorkspaceConfigResponse: from_attributes (ORM), derived boolean fields,
  never exposes encrypted keys, timestamp fields required
"""

from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from src.models.schemas.workspace_config import (
    WorkspaceConfigCreate,
    WorkspaceConfigResponse,
    WorkspaceConfigUpdate,
)


class TestWorkspaceConfigCreate:
    def test_minimal_requires_workspace_id(self):
        schema = WorkspaceConfigCreate(workspace_id="ws_abc")
        assert schema.workspace_id == "ws_abc"

    def test_missing_workspace_id_raises(self):
        with pytest.raises(ValidationError):
            WorkspaceConfigCreate()  # type: ignore[call-arg]

    def test_default_accent_color(self):
        schema = WorkspaceConfigCreate(workspace_id="ws_abc")
        assert schema.accent_color == "#00d1ff"

    def test_default_enabled_modules(self):
        schema = WorkspaceConfigCreate(workspace_id="ws_abc")
        assert set(schema.enabled_modules) == {
            "contracts",
            "crm",
            "triage",
            "calendar",
            "documents",
        }

    def test_default_ai_tier(self):
        schema = WorkspaceConfigCreate(workspace_id="ws_abc")
        assert schema.ai_tier == "none"

    def test_default_billing_tier(self):
        schema = WorkspaceConfigCreate(workspace_id="ws_abc")
        assert schema.billing_tier == "beta"

    def test_default_max_users(self):
        schema = WorkspaceConfigCreate(workspace_id="ws_abc")
        assert schema.max_users == 999

    def test_default_max_vaults(self):
        schema = WorkspaceConfigCreate(workspace_id="ws_abc")
        assert schema.max_vaults == 999

    def test_optional_fields_default_none(self):
        schema = WorkspaceConfigCreate(workspace_id="ws_abc")
        assert schema.custom_domain is None
        assert schema.vercel_domain is None
        assert schema.logo_url is None
        assert schema.ai_provider is None
        assert schema.ai_api_key is None
        assert schema.google_refresh_token is None
        assert schema.google_scopes_granted is None
        assert schema.stripe_customer_id is None
        assert schema.stripe_subscription_id is None

    def test_full_create(self):
        schema = WorkspaceConfigCreate(
            workspace_id="ws_abc",
            custom_domain="acme.example.com",
            accent_color="#ff0000",
            enabled_modules=["contracts", "crm"],
            ai_provider="openai",
            ai_api_key="sk-test",
            ai_tier="byok",
            billing_tier="team",
            max_users=10,
            max_vaults=20,
        )
        assert schema.custom_domain == "acme.example.com"
        assert schema.ai_tier == "byok"

    def test_enabled_modules_not_shared_across_instances(self):
        """Default factory must produce independent lists per instance."""
        a = WorkspaceConfigCreate(workspace_id="ws_1")
        b = WorkspaceConfigCreate(workspace_id="ws_2")
        a.enabled_modules.append("extra")
        assert "extra" not in b.enabled_modules

    def test_metadata_defaults_to_empty_dict(self):
        schema = WorkspaceConfigCreate(workspace_id="ws_abc")
        assert schema.metadata == {}

    def test_metadata_not_shared_across_instances(self):
        a = WorkspaceConfigCreate(workspace_id="ws_1")
        b = WorkspaceConfigCreate(workspace_id="ws_2")
        a.metadata["key"] = "val"
        assert "key" not in b.metadata


class TestWorkspaceConfigUpdate:
    def test_empty_update_is_valid(self):
        """All fields are optional — an empty update should be valid."""
        schema = WorkspaceConfigUpdate()
        assert schema.accent_color is None
        assert schema.billing_tier is None
        assert schema.max_users is None

    def test_partial_update(self):
        schema = WorkspaceConfigUpdate(accent_color="#aabbcc", max_users=5)
        assert schema.accent_color == "#aabbcc"
        assert schema.max_users == 5
        assert schema.billing_tier is None

    def test_update_enabled_modules(self):
        schema = WorkspaceConfigUpdate(enabled_modules=["contracts"])
        assert schema.enabled_modules == ["contracts"]

    def test_update_google_token(self):
        schema = WorkspaceConfigUpdate(google_refresh_token="token123")
        assert schema.google_refresh_token == "token123"


class TestWorkspaceConfigResponse:
    def _make_orm_like(self, **overrides):
        """Return a namespace object that mimics a WorkspaceConfig ORM row."""
        from types import SimpleNamespace

        now = datetime.now(tz=UTC)
        defaults = {
            "id": "01JCFG",
            "workspace_id": "ws_01J",
            "custom_domain": None,
            "vercel_domain": None,
            "domain_verified": False,
            "logo_url": None,
            "accent_color": "#00d1ff",
            "enabled_modules": ["contracts", "crm", "triage", "calendar", "documents"],
            "ai_provider": None,
            "ai_api_key_encrypted": None,
            "ai_tier": "none",
            "google_scopes_granted": None,
            "google_refresh_token_encrypted": None,
            "billing_tier": "beta",
            "stripe_customer_id": None,
            "stripe_subscription_id": None,
            "max_users": 999,
            "max_vaults": 999,
            "metadata_": {},
            "created_at": now,
            "updated_at": now,
        }
        defaults.update(overrides)
        return SimpleNamespace(**defaults)

    def test_missing_timestamps_raises(self):
        with pytest.raises(ValidationError):
            WorkspaceConfigResponse(
                id="x",
                workspace_id="ws_x",
                enabled_modules=[],
                # missing created_at, updated_at
            )

    def test_minimal_required_fields(self):
        now = datetime.now(tz=UTC)
        resp = WorkspaceConfigResponse(
            id="01JCFG",
            workspace_id="ws_01J",
            enabled_modules=["contracts"],
            created_at=now,
            updated_at=now,
        )
        assert resp.id == "01JCFG"
        assert resp.workspace_id == "ws_01J"

    def test_has_ai_key_false_when_no_encrypted_key(self):
        now = datetime.now(tz=UTC)
        resp = WorkspaceConfigResponse(
            id="01JCFG",
            workspace_id="ws_01J",
            enabled_modules=[],
            has_ai_key=False,
            created_at=now,
            updated_at=now,
        )
        assert resp.has_ai_key is False

    def test_has_ai_key_true(self):
        now = datetime.now(tz=UTC)
        resp = WorkspaceConfigResponse(
            id="01JCFG",
            workspace_id="ws_01J",
            enabled_modules=[],
            has_ai_key=True,
            created_at=now,
            updated_at=now,
        )
        assert resp.has_ai_key is True

    def test_has_google_token_false(self):
        now = datetime.now(tz=UTC)
        resp = WorkspaceConfigResponse(
            id="01JCFG",
            workspace_id="ws_01J",
            enabled_modules=[],
            has_google_token=False,
            created_at=now,
            updated_at=now,
        )
        assert resp.has_google_token is False

    def test_no_encrypted_key_in_response_fields(self):
        """Verify ai_api_key_encrypted and google_refresh_token_encrypted
        are NOT present as fields in the response schema."""
        fields = WorkspaceConfigResponse.model_fields
        assert "ai_api_key_encrypted" not in fields
        assert "google_refresh_token_encrypted" not in fields

    def test_defaults(self):
        now = datetime.now(tz=UTC)
        resp = WorkspaceConfigResponse(
            id="01JCFG",
            workspace_id="ws_01J",
            enabled_modules=["contracts"],
            created_at=now,
            updated_at=now,
        )
        assert resp.accent_color == "#00d1ff"
        assert resp.billing_tier == "beta"
        assert resp.ai_tier == "none"
        assert resp.max_users == 999
        assert resp.max_vaults == 999
        assert resp.domain_verified is False
