"""Health check endpoint tests."""

from fastapi.testclient import TestClient


def test_health_check(client: TestClient) -> None:
    """Health endpoint returns 200 with service name."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "airlock-api"
