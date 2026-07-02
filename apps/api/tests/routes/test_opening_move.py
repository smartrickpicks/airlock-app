"""Integration test — opening-move endpoint returns personalized first message."""

from unittest.mock import MagicMock, patch


def _mock_profile(
    pi_profile="captain",
    meta_archetype="driver",
    confidence=0.85,
    mags_config=None,
    signals=None,
):
    p = MagicMock()
    p.pi_profile = pi_profile
    p.meta_archetype = meta_archetype
    p.confidence = confidence
    p.mags_config = mags_config or {
        "default_archetype": "executor",
        "autonomy_ceiling": 0.8,
        "interaction_mode": "autonomous_with_checkpoints",
    }
    # signals on the ORM model is source-provenance metadata, not onboarding signals
    p.signals = signals or {}
    return p


def test_opening_move_no_auth(client):
    """Returns 401 when no Authorization header is provided."""
    response = client.get("/api/v1/onboarding/opening-move")
    assert response.status_code == 401


def test_opening_move_no_profile(client):
    """Returns 404 when user has no profile."""
    with patch("src.routes.onboarding.profile_service") as mock_ps:
        mock_ps.get_profile_by_user.return_value = None

        response = client.get(
            "/api/v1/onboarding/opening-move",
            headers={"Authorization": "Bearer dev_mock_token"},
        )
        assert response.status_code == 404


def test_opening_move_returns_full_payload(client):
    """Returns hook text, 3 actions, and escape text."""
    with patch("src.routes.onboarding.profile_service") as mock_ps:
        mock_ps.get_profile_by_user.return_value = _mock_profile()

        response = client.get(
            "/api/v1/onboarding/opening-move",
            headers={"Authorization": "Bearer dev_mock_token"},
        )
        assert response.status_code == 200
        data = response.json()

        assert "hook_text" in data
        assert "actions" in data
        assert "escape_text" in data
        assert len(data["actions"]) == 3

        for action in data["actions"]:
            assert "id" in action
            assert "title" in action
            assert "description" in action
            assert "output_type" in action
            assert action["output_type"] in ("artifact", "playbook")
            assert "tag" in action
            assert action["tag"] in ("Instant", "Guided")


def test_opening_move_driver_hook_text(client):
    """Driver gets driver-appropriate hook text."""
    with patch("src.routes.onboarding.profile_service") as mock_ps:
        mock_ps.get_profile_by_user.return_value = _mock_profile(
            pi_profile="maverick",
            meta_archetype="driver",
        )

        response = client.get(
            "/api/v1/onboarding/opening-move",
            headers={"Authorization": "Bearer dev_mock_token"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "workspace is live" in data["hook_text"]


def test_opening_move_enforcer(client):
    """Enforcer gets enforcer-appropriate hook text."""
    with patch("src.routes.onboarding.profile_service") as mock_ps:
        mock_ps.get_profile_by_user.return_value = _mock_profile(
            pi_profile="guardian",
            meta_archetype="enforcer",
        )

        response = client.get(
            "/api/v1/onboarding/opening-move",
            headers={"Authorization": "Bearer dev_mock_token"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "ran the numbers" in data["hook_text"]
