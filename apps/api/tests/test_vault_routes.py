"""Smoke tests for vault route registration."""

from src.main import app


def test_vault_routes_registered():
    """Verify vault CRUD routes are registered on the app."""
    paths = [route.path for route in app.routes]
    assert "/api/v1/vaults" in paths
    assert "/api/v1/vaults/{vault_id}" in paths
    assert "/api/v1/vaults/{vault_id}/children" in paths
    assert "/api/v1/vaults/{vault_id}/advance" in paths
    assert "/api/v1/vaults/{vault_id}/archive" in paths
