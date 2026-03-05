"""Smoke tests for event route registration."""

from src.main import app


def test_event_routes_registered():
    paths = [route.path for route in app.routes]
    assert "/api/v1/events/vault/{vault_id}" in paths
    assert "/api/v1/events/recent" in paths
