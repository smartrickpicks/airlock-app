"""Route-level tests for Orbit API endpoints.

Tests cover:
- Auth gating on creator routes (401 without token)
- 404 on non-existent public pages (with mocked DB)
- Router structure verification
"""

from unittest.mock import patch

from fastapi.testclient import TestClient

from src.routes.orbit import router

AUTH_HEADERS = {"Authorization": "Bearer dev_mock_token"}


# ---------------------------------------------------------------------------
# Router structure tests (no DB needed)
# ---------------------------------------------------------------------------


def test_orbit_router_exists():
    assert router.prefix == "/api/v1/orbit"


def test_orbit_router_has_public_slug_route():
    routes = [r.path for r in router.routes]
    assert any("/p/{slug}" in r for r in routes)


def test_orbit_router_has_creator_me_routes():
    routes = [r.path for r in router.routes]
    assert any(r.endswith("/me") for r in routes)


def test_orbit_router_has_quiz_routes():
    routes = [r.path for r in router.routes]
    assert any("quiz/start" in r for r in routes)
    assert any("quiz/answer" in r for r in routes)
    assert any("quiz/{session_token}" in r for r in routes)


def test_orbit_router_has_link_click_route():
    routes = [r.path for r in router.routes]
    assert any("links/{link_id}/click" in r for r in routes)


def test_orbit_router_has_section_routes():
    routes = [r.path for r in router.routes]
    assert any("/me/sections" in r for r in routes)
    assert any("/me/sections/{section_id}" in r for r in routes)
    assert any("/me/sections/reorder" in r for r in routes)


def test_orbit_router_has_link_and_persona_routes():
    routes = [r.path for r in router.routes]
    assert any("/me/links" in r for r in routes)
    assert any("/me/personas/{persona_id}" in r for r in routes)


# ---------------------------------------------------------------------------
# Auth gating tests (no DB needed — fails at auth before DB)
# ---------------------------------------------------------------------------


def test_create_orbit_requires_auth(client: TestClient):
    """POST /orbit/me without auth returns 401."""
    resp = client.post(
        "/api/v1/orbit/me",
        json={"slug": "test-creator", "display_name": "Test Creator"},
    )
    assert resp.status_code == 401


def test_get_own_orbit_requires_auth(client: TestClient):
    """GET /orbit/me without auth returns 401."""
    resp = client.get("/api/v1/orbit/me")
    assert resp.status_code == 401


def test_update_orbit_requires_auth(client: TestClient):
    """PATCH /orbit/me without auth returns 401."""
    resp = client.patch(
        "/api/v1/orbit/me",
        json={"display_name": "New Name"},
    )
    assert resp.status_code == 401


def test_add_section_requires_auth(client: TestClient):
    """POST /orbit/me/sections without auth returns 401."""
    resp = client.post(
        "/api/v1/orbit/me/sections",
        json={"section_type": "hero", "title": "Hero"},
    )
    assert resp.status_code == 401


def test_add_link_requires_auth(client: TestClient):
    """POST /orbit/me/links without auth returns 401."""
    resp = client.post(
        "/api/v1/orbit/me/links",
        json={"title": "My Link", "url": "https://example.com"},
    )
    assert resp.status_code == 401


def test_update_persona_requires_auth(client: TestClient):
    """PATCH /orbit/me/personas/{id} without auth returns 401."""
    resp = client.patch(
        "/api/v1/orbit/me/personas/fake-id",
        json={"display_name": "New Name"},
    )
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Public route 404 tests (mocked DB — OrbitService returns None)
# ---------------------------------------------------------------------------


@patch("src.routes.orbit.OrbitService")
def test_get_nonexistent_orbit_page_returns_404(mock_svc, client: TestClient):
    """GET /orbit/p/{slug} with non-existent slug returns 404."""
    mock_svc.get_by_slug.return_value = None
    resp = client.get("/api/v1/orbit/p/does-not-exist")
    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()


@patch("src.routes.orbit.OrbitService")
def test_start_quiz_nonexistent_page_returns_404(mock_svc, client: TestClient):
    """POST /orbit/p/{slug}/quiz/start on non-existent page returns 404."""
    mock_svc.get_by_slug.return_value = None
    resp = client.post("/api/v1/orbit/p/no-such-page/quiz/start")
    assert resp.status_code == 404


@patch("src.routes.orbit.OrbitService")
def test_quiz_answer_nonexistent_page_returns_404(mock_svc, client: TestClient):
    """POST /orbit/p/{slug}/quiz/answer on non-existent page returns 404."""
    mock_svc.get_by_slug.return_value = None
    resp = client.post(
        "/api/v1/orbit/p/no-such-page/quiz/answer",
        json={"session_token": "fake", "question_id": 1, "answer": "a"},
    )
    assert resp.status_code == 404


@patch("src.routes.orbit.OrbitService")
def test_quiz_result_nonexistent_page_returns_404(mock_svc, client: TestClient):
    """GET /orbit/p/{slug}/quiz/{token} on non-existent page returns 404."""
    mock_svc.get_by_slug.return_value = None
    resp = client.get("/api/v1/orbit/p/no-such-page/quiz/fake-token")
    assert resp.status_code == 404


@patch("src.routes.orbit.OrbitService")
def test_link_click_nonexistent_page_returns_404(mock_svc, client: TestClient):
    """POST /orbit/p/{slug}/links/{id}/click on non-existent page returns 404."""
    mock_svc.get_by_slug.return_value = None
    resp = client.post("/api/v1/orbit/p/no-such-page/links/fake-link/click")
    assert resp.status_code == 404
