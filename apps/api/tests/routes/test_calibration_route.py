"""Integration tests for the calibration route."""

from fastapi.testclient import TestClient


def test_calibration_next_card_tap(client: TestClient):
    """POST /api/v1/calibration/next with a card tap answer returns updated state."""
    resp = client.post(
        "/api/v1/calibration/next",
        json={
            "question_id": "goal_statement",
            "selected_option_id": "close_deals",
            "free_text": None,
            "session_id": "test-1",
        },
    )
    assert resp.status_code == 200
    data = resp.json()

    assert "drives" in data
    assert "confidence" in data
    assert "micro_insight" in data
    assert "next_question" in data
    assert "unlock_events" in data
    assert "phase" in data
    assert data["confidence"] > 0.0
    assert data["drives"]["dominance"] > 5.5


def test_calibration_next_returns_next_question(client: TestClient):
    """Response should include the next question to ask."""
    resp = client.post(
        "/api/v1/calibration/next",
        json={
            "question_id": "goal_statement",
            "selected_option_id": "close_deals",
            "session_id": "test-2",
        },
    )
    data = resp.json()

    assert data["next_question"] is not None
    assert "id" in data["next_question"]
    assert "text" in data["next_question"]
    assert "format" in data["next_question"]


def test_calibration_stateless_with_session_state(client: TestClient):
    """Can pass prior state to maintain continuity across calls."""
    resp1 = client.post(
        "/api/v1/calibration/next",
        json={
            "question_id": "goal_statement",
            "selected_option_id": "close_deals",
            "session_id": "test-3",
        },
    )
    state1 = resp1.json()

    resp2 = client.post(
        "/api/v1/calibration/next",
        json={
            "question_id": "autonomy_pref",
            "selected_option_id": "run_things",
            "session_id": "test-3",
            "prior_state": {
                "drives": state1["drives"],
                "confidence": state1["confidence"],
                "questions_asked": state1["questions_asked"],
                "drives_touched": ["dominance", "patience"],
                "archetype_hypothesis": state1.get("archetype_hypothesis"),
            },
        },
    )
    state2 = resp2.json()

    assert state2["confidence"] > state1["confidence"]
    assert len(state2["questions_asked"]) == 2
