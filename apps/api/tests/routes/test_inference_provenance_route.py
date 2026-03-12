"""Integration test — BMY endpoint returns full provenance data."""


def test_bmy_endpoint_returns_provenance(client):
    """POST /api/v1/inference/bmy should include provenance in response."""
    response = client.post(
        "/api/v1/inference/bmy",
        json={
            "signals": {
                "goal_statement": "I want to lead a team and ship fast",
                "autonomy_preference": "Draft it, I'll review",
                "signal_sources": ["conversation"],
            }
        },
    )
    assert response.status_code == 200
    data = response.json()

    # Core BMY fields still present
    assert "drives" in data
    assert "profile" in data
    assert "confidence" in data

    # Provenance is present
    assert "provenance" in data
    provenance = data["provenance"]
    assert provenance is not None

    # All 17 distances
    assert len(provenance["all_distances"]) == 17
    match_count = sum(1 for d in provenance["all_distances"] if d["is_match"])
    assert match_count == 1

    # 4 drive evidence entries
    assert len(provenance["drive_evidence"]) == 4
    drives_covered = {e["drive"] for e in provenance["drive_evidence"]}
    assert drives_covered == {"dominance", "extraversion", "patience", "formality"}

    # Each drive evidence has at least one signal
    for ev in provenance["drive_evidence"]:
        assert len(ev["signals"]) >= 1

    # Behavioral tensions are a list (may be empty depending on inferred drives)
    assert isinstance(provenance["behavioral_tensions"], list)

    # Raw adjustments present
    assert "goal_statement" in provenance["raw_adjustments"]
