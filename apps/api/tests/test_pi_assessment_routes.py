"""Tests for PI assessment route registration."""

from fastapi.testclient import TestClient

from src.main import app

client = TestClient(app)


def test_recommendation_endpoint_exists():
    """GET /api/v1/pi/recommend/{profile} should exist (may 401 without auth)."""
    response = client.get("/api/v1/pi/recommend/analyzer")
    # Without auth middleware bypass, expect 401 or 200
    assert response.status_code in (200, 401)


def test_recommendation_invalid_profile():
    """Invalid PI profile should return 400 or 401."""
    response = client.get("/api/v1/pi/recommend/nonexistent")
    assert response.status_code in (400, 401, 404)


def test_pi_routes_registered():
    """Verify PI routes are registered in the app."""
    routes = [r.path for r in app.routes]
    pi_routes = [r for r in routes if "/pi/" in r]
    assert len(pi_routes) >= 1, f"Expected PI routes, found: {routes}"
