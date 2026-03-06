"""Engine route tests."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_preflight_route(client: TestClient) -> None:
    response = client.post(
        "/api/v1/engines/preflight/run",
        json={
            "pages_data": [
                {
                    "page": 1,
                    "text": "Distribution Agreement\nEffective Date: January 15, 2024\nTerritory: Worldwide",
                    "char_count": 78,
                    "image_coverage_ratio": 0.05,
                }
            ]
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["doc_mode"] == "SEARCHABLE"
    assert "gate_color" in data


def test_extraction_route(client: TestClient) -> None:
    response = client.post(
        "/api/v1/engines/extraction/run",
        json={
            "full_text": "Effective Date: January 15, 2024\nTerritory: Worldwide\nExclusive: Yes",
            "call_site": "test",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "results" in data


def test_generation_route(client: TestClient) -> None:
    response = client.post(
        "/api/v1/engines/generation/run",
        json={
            "contract_type": "distribution",
            "seed": 7,
            "use_fake_data": True,
            "include_metadata": True,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["contract_type"] == "distribution"
    assert data["text"]
    assert data["metadata"] is not None
