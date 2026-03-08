"""Document route smoke and auth tests."""

from __future__ import annotations

from fastapi.testclient import TestClient

from src.main import app

client = TestClient(app)


def test_document_routes_registered() -> None:
    paths = [route.path for route in app.routes]
    assert "/api/v1/documents" in paths
    assert "/api/v1/documents/upload" in paths
    assert "/api/v1/documents/{document_id}" in paths
    assert "/api/v1/documents/{document_id}/content" in paths


def test_document_upload_requires_auth() -> None:
    response = client.post(
        "/api/v1/documents/upload",
        files={"file": ("contract.pdf", b"%PDF-1.4\n", "application/pdf")},
    )
    assert response.status_code == 401


def test_document_list_requires_auth() -> None:
    response = client.get("/api/v1/documents")
    assert response.status_code == 401
