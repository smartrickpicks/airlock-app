"""Integration tests for GET /api/v1/workspaces/resolve.

Tests cover:
- Route is registered on the app
- Missing `domain` query param returns 422
- Invalid domain format returns 422 (regex validation)
- Valid domain that resolves returns 200 with PublicResolveResponse shape
- Domain not found returns 404
- Response does NOT include encrypted key fields, billing, or Stripe data
- No auth is required for domain resolution
"""

from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from src.main import app


def _make_config(domain: str = "acme.example.com") -> SimpleNamespace:
    """Return a SimpleNamespace mimicking a WorkspaceConfig ORM row."""
    return SimpleNamespace(
        id="cfg_test01",
        workspace_id="ws_test01",
        custom_domain=domain,
        vercel_domain=None,
        domain_verified=True,
        logo_url=None,
        accent_color="#00d1ff",
        enabled_modules=["contracts", "crm", "triage", "calendar", "documents"],
        ai_provider=None,
        ai_api_key_encrypted=None,
        ai_tier="none",
        google_scopes_granted=None,
        google_refresh_token_encrypted=None,
        billing_tier="beta",
        stripe_customer_id="cus_secret123",
        stripe_subscription_id="sub_secret456",
        max_users=999,
        max_vaults=999,
        metadata_={},
    )


class TestResolveRouteRegistration:
    def test_resolve_route_registered(self):
        paths = [route.path for route in app.routes]
        assert "/api/v1/workspaces/resolve" in paths


class TestResolveRouteValidation:
    def test_missing_domain_param_returns_422(self):
        with TestClient(app) as client:
            resp = client.get("/api/v1/workspaces/resolve")
        assert resp.status_code == 422

    def test_empty_domain_param_returns_422(self):
        """Empty string domain is rejected by regex pattern validation."""
        with TestClient(app) as client:
            resp = client.get("/api/v1/workspaces/resolve?domain=")
        assert resp.status_code == 422

    def test_invalid_domain_with_special_chars_returns_422(self):
        """Domains with special characters are rejected by regex pattern."""
        with TestClient(app) as client:
            resp = client.get("/api/v1/workspaces/resolve?domain=<script>alert(1)</script>")
        assert resp.status_code == 422

    def test_domain_too_long_returns_422(self):
        """Domain exceeding 253 chars is rejected."""
        long_domain = "a" * 254 + ".com"
        with TestClient(app) as client:
            resp = client.get(f"/api/v1/workspaces/resolve?domain={long_domain}")
        assert resp.status_code == 422


class TestResolveRouteHappyPath:
    def test_found_domain_returns_200(self):
        config = _make_config()
        with (
            patch(
                "src.routes.workspaces.resolve_domain",
                new=AsyncMock(return_value=config),
            ),
            TestClient(app) as client,
        ):
            resp = client.get("/api/v1/workspaces/resolve?domain=acme.example.com")

        assert resp.status_code == 200

    def test_response_shape(self):
        config = _make_config()
        with (
            patch(
                "src.routes.workspaces.resolve_domain",
                new=AsyncMock(return_value=config),
            ),
            TestClient(app) as client,
        ):
            resp = client.get("/api/v1/workspaces/resolve?domain=acme.example.com")

        data = resp.json()
        assert data["id"] == "cfg_test01"
        assert data["workspace_id"] == "ws_test01"
        assert data["custom_domain"] == "acme.example.com"
        assert data["domain_verified"] is True
        assert "enabled_modules" in data
        assert isinstance(data["enabled_modules"], list)

    def test_response_does_not_expose_encrypted_keys(self):
        config = _make_config()
        with (
            patch(
                "src.routes.workspaces.resolve_domain",
                new=AsyncMock(return_value=config),
            ),
            TestClient(app) as client,
        ):
            resp = client.get("/api/v1/workspaces/resolve?domain=acme.example.com")

        data = resp.json()
        assert "ai_api_key_encrypted" not in data
        assert "google_refresh_token_encrypted" not in data

    def test_response_does_not_expose_billing_data(self):
        """Public resolve endpoint must not leak Stripe IDs or billing details."""
        config = _make_config()
        with (
            patch(
                "src.routes.workspaces.resolve_domain",
                new=AsyncMock(return_value=config),
            ),
            TestClient(app) as client,
        ):
            resp = client.get("/api/v1/workspaces/resolve?domain=acme.example.com")

        data = resp.json()
        assert "stripe_customer_id" not in data
        assert "stripe_subscription_id" not in data
        assert "billing_tier" not in data
        assert "max_users" not in data
        assert "max_vaults" not in data
        assert "has_ai_key" not in data
        assert "has_google_token" not in data
        assert "google_scopes_granted" not in data

    def test_accent_color_in_response(self):
        config = _make_config()
        config.accent_color = "#ff0000"
        with (
            patch(
                "src.routes.workspaces.resolve_domain",
                new=AsyncMock(return_value=config),
            ),
            TestClient(app) as client,
        ):
            resp = client.get("/api/v1/workspaces/resolve?domain=acme.example.com")

        assert resp.json()["accent_color"] == "#ff0000"

    def test_enabled_modules_in_response(self):
        config = _make_config()
        config.enabled_modules = ["contracts", "crm"]
        with (
            patch(
                "src.routes.workspaces.resolve_domain",
                new=AsyncMock(return_value=config),
            ),
            TestClient(app) as client,
        ):
            resp = client.get("/api/v1/workspaces/resolve?domain=acme.example.com")

        assert resp.json()["enabled_modules"] == ["contracts", "crm"]


class TestResolveRouteNotFound:
    def test_unknown_domain_returns_404(self):
        with (
            patch(
                "src.routes.workspaces.resolve_domain",
                new=AsyncMock(return_value=None),
            ),
            TestClient(app) as client,
        ):
            resp = client.get("/api/v1/workspaces/resolve?domain=notfound.example.com")

        assert resp.status_code == 404

    def test_404_detail_message(self):
        with (
            patch(
                "src.routes.workspaces.resolve_domain",
                new=AsyncMock(return_value=None),
            ),
            TestClient(app) as client,
        ):
            resp = client.get("/api/v1/workspaces/resolve?domain=notfound.example.com")

        assert "not found" in resp.json()["detail"].lower()


class TestResolveRouteNoAuth:
    def test_no_auth_cookie_still_returns_200(self):
        """Domain resolution must work before the user is authenticated."""
        config = _make_config()
        with (
            patch(
                "src.routes.workspaces.resolve_domain",
                new=AsyncMock(return_value=config),
            ),
            TestClient(app) as client,
        ):
            resp = client.get(
                "/api/v1/workspaces/resolve?domain=acme.example.com",
                # Deliberately no auth cookies or Authorization headers
            )

        assert resp.status_code == 200
