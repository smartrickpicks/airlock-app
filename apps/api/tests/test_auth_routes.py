"""Auth route integration tests."""

import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.services.auth import (
    GoogleAuthConfigurationError,
    GoogleAuthPersistenceError,
    GoogleAuthUnavailableError,
)
from src.services.jwt import create_access_token, create_refresh_token

client = TestClient(app)


def test_auth_config_endpoint():
    resp = client.get("/api/v1/auth/config")
    assert resp.status_code == 200
    data = resp.json()
    assert "configured" in data


def test_auth_me_without_token():
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401


def test_auth_me_with_valid_token():
    token = create_access_token(
        {
            "sub": "user_123",
            "email": "test@example.com",
            "workspace_id": "ws_test",
            "org_role": "member",
        }
    )
    resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["user_id"] == "user_123"


def test_auth_refresh():
    refresh = create_refresh_token({"sub": "user_123", "email": "test@example.com"})
    resp = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh},
    )
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_google_verify_missing_credential():
    resp = client.post("/api/v1/auth/google/verify", json={"workspace_id": "ws_test"})
    assert resp.status_code == 422


@pytest.mark.parametrize(
    ("error", "status_code", "detail"),
    [
        (
            GoogleAuthConfigurationError("missing google client id"),
            503,
            "Google OAuth is not configured on the API",
        ),
        (
            GoogleAuthUnavailableError("google transport failure"),
            503,
            "Google token verification is temporarily unavailable",
        ),
        (
            GoogleAuthPersistenceError("db failure"),
            500,
            "Failed to persist Google-authenticated user",
        ),
    ],
)
def test_google_verify_maps_service_errors(monkeypatch, error, status_code, detail):
    def raise_error(*args, **kwargs):
        raise error

    monkeypatch.setattr("src.routes.auth.authenticate_google_user", raise_error)

    resp = client.post(
        "/api/v1/auth/google/verify",
        json={"credential": "fake-google-token", "workspace_id": "ws_test"},
    )

    assert resp.status_code == status_code
    assert resp.json()["detail"] == detail
