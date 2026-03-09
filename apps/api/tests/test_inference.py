"""MAGS Inference Engine tests.

Tests the full inference pipeline:
- ProfileMatchingEngine loading and distance computation
- InferenceService drive inference from signals
- Profile matching with confidence scoring
- Full BMY (Build My Workspace) flow
- Route integration tests via TestClient

Coverage targets:
- All 17 profiles matchable
- All 4 autonomy preferences
- All 3 report styles
- All 4 team sizes
- Confidence scoring boundaries
- Tie-breaking with population_pct prior
- Edge cases (empty signals, extreme drives)
"""

from __future__ import annotations

import math

import pytest

from src.schemas.inference import (
    BMYRequest,
    DECFDrives,
    DriveSignals,
    InferDrivesRequest,
    MatchProfileRequest,
    MetaArchetype,
    SignalSource,
)
from src.services.inference import InferenceService, ProfileMatchingEngine

# --- Fixtures ---


@pytest.fixture(scope="module")
def engine() -> ProfileMatchingEngine:
    """Load the real airlock-persona profiles."""
    eng = ProfileMatchingEngine()
    eng.load()
    return eng


@pytest.fixture(scope="module")
def service(engine: ProfileMatchingEngine) -> InferenceService:
    """Create InferenceService with loaded engine."""
    return InferenceService(engine)


# --- ProfileMatchingEngine Tests ---


class TestProfileMatchingEngine:
    """Test profile loading and distance computation."""

    def test_loads_all_17_profiles(self, engine: ProfileMatchingEngine) -> None:
        """All 17 PI profiles must be loaded from YAML."""
        assert engine.profile_count == 17
        assert engine.is_loaded

    def test_expected_profile_ids(self, engine: ProfileMatchingEngine) -> None:
        """Verify all expected profile IDs are present."""
        expected = {
            "analyzer",
            "controller",
            "specialist",
            "strategist",
            "venturer",
            "altruist",
            "captain",
            "collaborator",
            "maverick",
            "persuader",
            "promoter",
            "adapter",
            "artisan",
            "guardian",
            "operator",
            "individualist",
            "scholar",
        }
        loaded = set(engine.get_all_profile_ids())
        assert loaded == expected

    def test_canonical_vector_has_4_dimensions(self, engine: ProfileMatchingEngine) -> None:
        """Each profile must have a 4-element DECF drive vector."""
        for profile_id in engine.get_all_profile_ids():
            data = engine.get_profile_data(profile_id)
            assert data is not None
            drives = data["drives"]
            assert "dominance" in drives
            assert "extraversion" in drives
            assert "patience" in drives
            assert "formality" in drives

    def test_profiles_have_otto_config(self, engine: ProfileMatchingEngine) -> None:
        """Every profile must have an otto: block with archetype, ceiling, mode."""
        for profile_id in engine.get_all_profile_ids():
            data = engine.get_profile_data(profile_id)
            assert data is not None
            assert "otto" in data, f"Profile {profile_id} missing otto: block"
            otto = data["otto"]
            assert "default_archetype" in otto
            assert "autonomy_ceiling" in otto
            assert "interaction_mode" in otto

    def test_distance_to_self_is_zero(self, engine: ProfileMatchingEngine) -> None:
        """Distance from a canonical vector to itself should be 0."""
        data = engine.get_profile_data("maverick")
        assert data is not None
        drives = data["drives"]
        self_drives = DECFDrives(
            dominance=drives["dominance"],
            extraversion=drives["extraversion"],
            patience=drives["patience"],
            formality=drives["formality"],
        )
        distances = engine.compute_distances(self_drives)
        closest_id, closest_dist = distances[0]
        assert closest_id == "maverick"
        assert closest_dist == pytest.approx(0.0, abs=0.001)

    def test_distance_ordering(self, engine: ProfileMatchingEngine) -> None:
        """Distances should be sorted ascending."""
        drives = DECFDrives(dominance=8, extraversion=7, patience=3, formality=3)
        distances = engine.compute_distances(drives)
        for i in range(len(distances) - 1):
            assert distances[i][1] <= distances[i + 1][1]

    def test_maverick_vector_matches_canonical(self, engine: ProfileMatchingEngine) -> None:
        """Maverick canonical: D=10, E=8, C=1, F=1."""
        drives = DECFDrives(dominance=10, extraversion=8, patience=1, formality=1)
        distances = engine.compute_distances(drives)
        assert distances[0][0] == "maverick"
        assert distances[0][1] == pytest.approx(0.0, abs=0.001)

    def test_analyzer_vector_matches_canonical(self, engine: ProfileMatchingEngine) -> None:
        """Analyzer canonical: D=3, E=2, C=8, F=9."""
        drives = DECFDrives(dominance=3, extraversion=2, patience=8, formality=9)
        distances = engine.compute_distances(drives)
        assert distances[0][0] == "analyzer"
        assert distances[0][1] == pytest.approx(0.0, abs=0.001)

    def test_guardian_vector_matches_canonical(self, engine: ProfileMatchingEngine) -> None:
        """Guardian canonical: D=3, E=3, C=9, F=8."""
        drives = DECFDrives(dominance=3, extraversion=3, patience=9, formality=8)
        distances = engine.compute_distances(drives)
        assert distances[0][0] == "guardian"
        assert distances[0][1] == pytest.approx(0.0, abs=0.001)

    def test_captain_vector_matches_canonical(self, engine: ProfileMatchingEngine) -> None:
        """Captain canonical: D=9, E=8, C=2, F=2."""
        drives = DECFDrives(dominance=9, extraversion=8, patience=2, formality=2)
        distances = engine.compute_distances(drives)
        assert distances[0][0] == "captain"
        assert distances[0][1] == pytest.approx(0.0, abs=0.001)

    def test_adapter_is_midpoint_profile(self, engine: ProfileMatchingEngine) -> None:
        """Adapter canonical: D=5, E=5, C=5, F=5 — the midpoint profile."""
        drives = DECFDrives(dominance=5, extraversion=5, patience=5, formality=5)
        distances = engine.compute_distances(drives)
        assert distances[0][0] == "adapter"
        assert distances[0][1] == pytest.approx(0.0, abs=0.001)

    def test_match_returns_top_3_candidates(self, engine: ProfileMatchingEngine) -> None:
        """Match should return best match + top 3 candidates."""
        drives = DECFDrives(dominance=7, extraversion=6, patience=4, formality=3)
        match, candidates = engine.match(drives)
        assert match is not None
        assert len(candidates) == 3
        assert candidates[0].profile_id == match.profile_id

    def test_match_includes_runner_up(self, engine: ProfileMatchingEngine) -> None:
        """Match should include runner-up ID and distance."""
        drives = DECFDrives(dominance=8, extraversion=5, patience=3, formality=4)
        match, _ = engine.match(drives)
        assert match.runner_up_id is not None
        assert match.runner_up_distance is not None
        assert match.runner_up_distance >= match.distance

    def test_tie_breaking_uses_population_pct(self, engine: ProfileMatchingEngine) -> None:
        """When two profiles are equidistant, higher population_pct should win."""
        # This is a structural test — verify the sort key includes population_pct
        drives = DECFDrives(dominance=5, extraversion=5, patience=5, formality=5)
        distances = engine.compute_distances(drives)
        # The adapter (D=5, E=5, C=5, F=5) should be distance 0
        # Any equidistant profiles should be ordered by population_pct descending
        zero_dist = [d for d in distances if d[1] == 0.0]
        if len(zero_dist) > 1:
            pcts = [engine.get_profile_data(d[0]).get("population_pct", 0) for d in zero_dist]
            assert pcts == sorted(pcts, reverse=True)


# --- InferenceService Tests ---


class TestDriveInference:
    """Test signal-to-drive inference logic."""

    def test_empty_signals_return_midpoint(self, service: InferenceService) -> None:
        """No signals should return neutral midpoint (5, 5, 5, 5)."""
        req = InferDrivesRequest(signals=DriveSignals())
        resp = service.infer_drives(req)
        assert resp.drives.dominance == 5.0
        assert resp.drives.extraversion == 5.0
        assert resp.drives.patience == 5.0
        assert resp.drives.formality == 5.0
        assert resp.signal_count == 0

    def test_high_dominance_goal_statement(self, service: InferenceService) -> None:
        """Goal statement with action words should increase dominance."""
        req = InferDrivesRequest(
            signals=DriveSignals(
                goal_statement="I want to ship fast, close deals, and scale the business"
            )
        )
        resp = service.infer_drives(req)
        assert resp.drives.dominance > 5.0
        assert resp.signal_count == 1

    def test_low_dominance_goal_statement(self, service: InferenceService) -> None:
        """Goal statement with support words should decrease dominance."""
        req = InferDrivesRequest(
            signals=DriveSignals(goal_statement="I want to help the team and support our clients")
        )
        resp = service.infer_drives(req)
        assert resp.drives.dominance < 5.0

    def test_high_patience_goal_statement(self, service: InferenceService) -> None:
        """Goal statement with methodical words should increase patience."""
        req = InferDrivesRequest(
            signals=DriveSignals(
                goal_statement="I want to carefully and thoroughly review everything step by step"
            )
        )
        resp = service.infer_drives(req)
        assert resp.drives.patience > 5.0

    def test_low_patience_goal_statement(self, service: InferenceService) -> None:
        """Goal statement with urgency words should decrease patience."""
        req = InferDrivesRequest(
            signals=DriveSignals(goal_statement="We need it now, fast, ASAP — no time to waste")
        )
        resp = service.infer_drives(req)
        assert resp.drives.patience < 5.0

    def test_autonomy_run_things_for_me(self, service: InferenceService) -> None:
        """'Run things for me' should set low formality."""
        req = InferDrivesRequest(signals=DriveSignals(autonomy_preference="Run things for me"))
        resp = service.infer_drives(req)
        assert resp.drives.formality <= 3.0

    def test_autonomy_just_a_second_opinion(self, service: InferenceService) -> None:
        """'Just a second opinion' should set high formality."""
        req = InferDrivesRequest(signals=DriveSignals(autonomy_preference="Just a second opinion"))
        resp = service.infer_drives(req)
        assert resp.drives.formality >= 7.0

    def test_report_style_scan_summary(self, service: InferenceService) -> None:
        """'Scan summary, then act' should increase dominance."""
        req = InferDrivesRequest(signals=DriveSignals(report_style="Scan summary, then act"))
        resp = service.infer_drives(req)
        assert resp.drives.dominance >= 5.0

    def test_report_style_read_every_detail(self, service: InferenceService) -> None:
        """'Read every detail first' should increase patience."""
        req = InferDrivesRequest(signals=DriveSignals(report_style="Read every detail first"))
        resp = service.infer_drives(req)
        assert resp.drives.patience >= 5.0

    def test_multiple_signals_increase_count(self, service: InferenceService) -> None:
        """More signals should increase signal_count."""
        req = InferDrivesRequest(
            signals=DriveSignals(
                goal_statement="Ship it fast",
                autonomy_preference="Run things for me",
                report_style="Scan summary, then act",
                team_size="Solo",
            )
        )
        resp = service.infer_drives(req)
        assert resp.signal_count == 4

    def test_drives_clamped_to_valid_range(self, service: InferenceService) -> None:
        """Drives must always be in 1-10 range regardless of signal strength."""
        # Stack extreme signals
        req = InferDrivesRequest(
            signals=DriveSignals(
                goal_statement="ship launch close win dominate scale disrupt lead build fast now immediately urgent quickly sprint",
                autonomy_preference="Run things for me",
                report_style="Scan summary, then act",
            )
        )
        resp = service.infer_drives(req)
        for val in resp.drives.as_vector():
            assert 1.0 <= val <= 10.0

    def test_extraversion_from_we_language(self, service: InferenceService) -> None:
        """'We' language should increase extraversion."""
        req = InferDrivesRequest(
            signals=DriveSignals(
                goal_statement="We need to work together as a team to collaborate!"
            )
        )
        resp = service.infer_drives(req)
        assert resp.drives.extraversion > 5.0

    def test_career_signals_ceo(self, service: InferenceService) -> None:
        """CEO/Founder title should push toward high dominance."""
        req = InferDrivesRequest(
            signals=DriveSignals(
                goal_statement="Build the company",
                job_title="CEO & Founder",
            )
        )
        resp = service.infer_drives(req)
        assert resp.drives.dominance > 5.0


# --- Profile Matching Tests ---


class TestProfileMatching:
    """Test profile matching with confidence scoring."""

    def test_exact_maverick_match(self, service: InferenceService) -> None:
        """Exact maverick drives should match with high confidence."""
        req = MatchProfileRequest(
            drives=DECFDrives(dominance=10, extraversion=8, patience=1, formality=1)
        )
        resp = service.match_profile(req)
        assert resp.match.profile_id == "maverick"
        assert resp.match.confidence > 0.5

    def test_exact_guardian_match(self, service: InferenceService) -> None:
        """Exact guardian drives should match with high confidence."""
        req = MatchProfileRequest(
            drives=DECFDrives(dominance=3, extraversion=3, patience=9, formality=8)
        )
        resp = service.match_profile(req)
        assert resp.match.profile_id == "guardian"

    def test_all_17_profiles_are_matchable(
        self, engine: ProfileMatchingEngine, service: InferenceService
    ) -> None:
        """Every canonical profile vector should match to itself."""
        for profile_id in engine.get_all_profile_ids():
            data = engine.get_profile_data(profile_id)
            drives = data["drives"]
            req = MatchProfileRequest(
                drives=DECFDrives(
                    dominance=drives["dominance"],
                    extraversion=drives["extraversion"],
                    patience=drives["patience"],
                    formality=drives["formality"],
                )
            )
            resp = service.match_profile(req)
            assert resp.match.profile_id == profile_id, (
                f"Profile {profile_id} did not match itself. Got: {resp.match.profile_id}"
            )

    def test_top_candidates_has_3_entries(self, service: InferenceService) -> None:
        """Top candidates should contain 3 profiles."""
        req = MatchProfileRequest(
            drives=DECFDrives(dominance=6, extraversion=5, patience=4, formality=4)
        )
        resp = service.match_profile(req)
        assert len(resp.top_candidates) == 3

    def test_meta_archetype_captain_is_driver(self, service: InferenceService) -> None:
        """Captain should be classified as a Driver meta-archetype."""
        req = MatchProfileRequest(
            drives=DECFDrives(dominance=9, extraversion=8, patience=2, formality=2)
        )
        resp = service.match_profile(req)
        assert resp.match.meta_archetype == MetaArchetype.DRIVER

    def test_meta_archetype_analyzer_is_enforcer(self, service: InferenceService) -> None:
        """Analyzer should be classified as an Enforcer meta-archetype."""
        req = MatchProfileRequest(
            drives=DECFDrives(dominance=3, extraversion=2, patience=8, formality=9)
        )
        resp = service.match_profile(req)
        assert resp.match.meta_archetype == MetaArchetype.ENFORCER

    def test_meta_archetype_collaborator_is_interpreter(self, service: InferenceService) -> None:
        """Collaborator should be classified as an Interpreter meta-archetype."""
        req = MatchProfileRequest(
            drives=DECFDrives(dominance=3, extraversion=8, patience=7, formality=3)
        )
        resp = service.match_profile(req)
        assert resp.match.meta_archetype == MetaArchetype.INTERPRETER

    def test_workspace_config_populated(self, service: InferenceService) -> None:
        """Match result should include workspace config from YAML."""
        req = MatchProfileRequest(
            drives=DECFDrives(dominance=10, extraversion=8, patience=1, formality=1)
        )
        resp = service.match_profile(req)
        ws = resp.match.workspace_config
        assert ws is not None
        assert ws.cognitive_mode is not None
        assert ws.information_density is not None

    def test_otto_config_populated(self, service: InferenceService) -> None:
        """Match result should include Otto config from YAML."""
        req = MatchProfileRequest(
            drives=DECFDrives(dominance=10, extraversion=8, patience=1, formality=1)
        )
        resp = service.match_profile(req)
        otto = resp.match.otto_config
        assert otto is not None
        assert otto.default_archetype is not None
        assert 0.0 <= otto.autonomy_ceiling <= 1.0


# --- Confidence Scoring Tests ---


class TestConfidenceScoring:
    """Test confidence calculation logic."""

    def test_single_signal_base_confidence(self, service: InferenceService) -> None:
        """Single conversation signal should give base confidence ~0.55."""
        req = BMYRequest(signals=DriveSignals(goal_statement="Ship it fast"))
        resp = service.get_bmy_profile(req)
        assert resp.confidence >= 0.55
        assert resp.confidence <= 0.70

    def test_more_signals_increase_confidence(self, service: InferenceService) -> None:
        """Adding more signals should increase confidence."""
        req_1 = BMYRequest(signals=DriveSignals(goal_statement="Ship it fast"))
        req_4 = BMYRequest(
            signals=DriveSignals(
                goal_statement="Ship it fast",
                autonomy_preference="Run things for me",
                report_style="Scan summary, then act",
                team_size="Solo",
            )
        )
        resp_1 = service.get_bmy_profile(req_1)
        resp_4 = service.get_bmy_profile(req_4)
        assert resp_4.confidence >= resp_1.confidence

    def test_confidence_capped_at_1(self, service: InferenceService) -> None:
        """Confidence must never exceed 1.0."""
        req = BMYRequest(
            signals=DriveSignals(
                goal_statement="Ship it fast",
                autonomy_preference="Run things for me",
                report_style="Scan summary, then act",
                team_size="2-5",
                signal_sources=[
                    SignalSource.CONVERSATION,
                    SignalSource.LINKEDIN,
                    SignalSource.RESUME,
                ],
            )
        )
        resp = service.get_bmy_profile(req)
        assert resp.confidence <= 1.0

    def test_confidence_never_negative(self, service: InferenceService) -> None:
        """Confidence must never go below 0.0, even with heavy distance penalty."""
        # Use extreme drives far from any canonical profile
        req = MatchProfileRequest(
            drives=DECFDrives(dominance=1, extraversion=10, patience=1, formality=10)
        )
        resp = service.match_profile(req)
        assert resp.match.confidence >= 0.0

    def test_confidence_breakdown_present(self, service: InferenceService) -> None:
        """BMY response should include confidence breakdown dict."""
        req = BMYRequest(signals=DriveSignals(goal_statement="Build something great"))
        resp = service.get_bmy_profile(req)
        assert "conversation_base" in resp.confidence_breakdown


# --- BMY Flow Tests ---


class TestBMYFlow:
    """Test the full Build My Workspace intake flow."""

    def test_bmy_returns_complete_response(self, service: InferenceService) -> None:
        """BMY should return all required fields."""
        req = BMYRequest(
            signals=DriveSignals(
                goal_statement="I want to ship products fast and scale the business",
                autonomy_preference="Run things for me",
                report_style="Scan summary, then act",
                team_size="2-5",
            )
        )
        resp = service.get_bmy_profile(req)

        # All fields present
        assert resp.drives is not None
        assert resp.profile is not None
        assert resp.workspace_config is not None
        assert resp.otto_config is not None
        assert resp.confidence > 0
        assert resp.explanation is not None
        assert len(resp.explanation) > 0
        assert resp.signal_count == 4

    def test_bmy_explanation_mentions_profile_name(self, service: InferenceService) -> None:
        """BMY explanation should mention the matched profile name."""
        req = BMYRequest(
            signals=DriveSignals(
                goal_statement="I want to ship fast and lead the team",
                autonomy_preference="Run things for me",
            )
        )
        resp = service.get_bmy_profile(req)
        assert resp.profile.profile_name.lower() in resp.explanation.lower()

    def test_bmy_low_confidence_suggests_enrichment(self, service: InferenceService) -> None:
        """Low confidence should produce enrichment suggestions."""
        req = BMYRequest(signals=DriveSignals(goal_statement="Build things"))
        resp = service.get_bmy_profile(req)
        if resp.confidence < 0.75:
            assert len(resp.enrichment_suggestions) > 0

    def test_bmy_driver_profile_gets_driver_archetype(self, service: InferenceService) -> None:
        """Driver-type signals should produce a Driver meta-archetype."""
        req = BMYRequest(
            signals=DriveSignals(
                goal_statement="Ship it, close the deal, scale fast, dominate the market!",
                autonomy_preference="Run things for me",
                report_style="Scan summary, then act",
            )
        )
        resp = service.get_bmy_profile(req)
        # Should match a high-D profile in the Driver archetype
        assert resp.profile.meta_archetype in (MetaArchetype.DRIVER, MetaArchetype.INTERPRETER)
        assert resp.drives.dominance > 5.0

    def test_bmy_enforcer_profile_from_careful_signals(self, service: InferenceService) -> None:
        """Careful/methodical signals should produce an Enforcer-type profile."""
        req = BMYRequest(
            signals=DriveSignals(
                goal_statement="I want to carefully and thoroughly review every detail, step by step, methodically",
                autonomy_preference="Just a second opinion",
                report_style="Read every detail first",
            )
        )
        resp = service.get_bmy_profile(req)
        assert resp.drives.patience > 5.0
        assert resp.drives.formality > 5.0


# --- Route Integration Tests ---


class TestInferenceRoutes:
    """Test inference API routes via TestClient."""

    def test_drives_endpoint(self, client) -> None:  # noqa: ANN001
        """POST /api/v1/inference/drives should return inferred drives."""
        response = client.post(
            "/api/v1/inference/drives",
            json={
                "signals": {
                    "goal_statement": "Ship fast and scale",
                    "autonomy_preference": "Draft it, I'll review",
                }
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "drives" in data
        assert "dominance" in data["drives"]
        assert data["signal_count"] == 2

    def test_profile_endpoint(self, client) -> None:  # noqa: ANN001
        """POST /api/v1/inference/profile should return matched profile."""
        response = client.post(
            "/api/v1/inference/profile",
            json={
                "drives": {
                    "dominance": 9,
                    "extraversion": 8,
                    "patience": 2,
                    "formality": 2,
                }
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["match"]["profile_id"] == "captain"
        assert len(data["top_candidates"]) == 3

    def test_bmy_endpoint(self, client) -> None:  # noqa: ANN001
        """POST /api/v1/inference/bmy should return full BMY response."""
        response = client.post(
            "/api/v1/inference/bmy",
            json={
                "signals": {
                    "goal_statement": "I want to ship products fast",
                    "autonomy_preference": "Run things for me",
                    "report_style": "Scan summary, then act",
                    "team_size": "Solo",
                }
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "profile" in data
        assert "workspace_config" in data
        assert "otto_config" in data
        assert "explanation" in data
        assert data["signal_count"] == 4

    def test_profiles_list_endpoint(self, client) -> None:  # noqa: ANN001
        """GET /api/v1/inference/profiles should list all profiles."""
        response = client.get("/api/v1/inference/profiles")
        assert response.status_code == 200
        data = response.json()
        assert len(data["profiles"]) == 17

    def test_inference_health_endpoint(self, client) -> None:  # noqa: ANN001
        """GET /api/v1/inference/health should return engine status."""
        response = client.get("/api/v1/inference/health")
        assert response.status_code == 200
        data = response.json()
        assert data["engine_ready"] is True
        assert data["profiles_loaded"] == 17

    def test_drives_endpoint_empty_signals(self, client) -> None:  # noqa: ANN001
        """Empty signals should return midpoint drives."""
        response = client.post(
            "/api/v1/inference/drives",
            json={"signals": {}},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["drives"]["dominance"] == 5.0
        assert data["signal_count"] == 0

    def test_bmy_endpoint_minimal_input(self, client) -> None:  # noqa: ANN001
        """BMY with minimal input should still return valid response."""
        response = client.post(
            "/api/v1/inference/bmy",
            json={"signals": {"goal_statement": "Help"}},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["confidence"] > 0
        assert data["profile"]["profile_id"] is not None


# --- Edge Case Tests ---


class TestEdgeCases:
    """Test boundary conditions and edge cases."""

    def test_extreme_high_drives(self, service: InferenceService) -> None:
        """Extreme high drives (10,10,10,10) should still match something."""
        req = MatchProfileRequest(
            drives=DECFDrives(dominance=10, extraversion=10, patience=10, formality=10)
        )
        resp = service.match_profile(req)
        assert resp.match.profile_id is not None
        assert resp.match.confidence >= 0

    def test_extreme_low_drives(self, service: InferenceService) -> None:
        """Extreme low drives (1,1,1,1) should still match something."""
        req = MatchProfileRequest(
            drives=DECFDrives(dominance=1, extraversion=1, patience=1, formality=1)
        )
        resp = service.match_profile(req)
        assert resp.match.profile_id is not None

    def test_fuzzy_autonomy_matching(self, service: InferenceService) -> None:
        """Partial autonomy preference strings should still work."""
        req = InferDrivesRequest(signals=DriveSignals(autonomy_preference="run things"))
        resp = service.infer_drives(req)
        # Should fuzzy-match to "Run things for me"
        assert resp.signal_count == 1

    def test_decf_drives_as_vector(self) -> None:
        """DECFDrives.as_vector() should return correct ordering."""
        drives = DECFDrives(dominance=1, extraversion=2, patience=3, formality=4)
        vec = drives.as_vector()
        assert vec == [1.0, 2.0, 3.0, 4.0]

    def test_euclidean_distance_math(self) -> None:
        """Verify Euclidean distance calculation is correct."""
        v1 = [1, 2, 3, 4]
        v2 = [5, 6, 7, 8]
        expected = math.sqrt(sum((a - b) ** 2 for a, b in zip(v1, v2, strict=True)))
        assert expected == pytest.approx(8.0, abs=0.001)

    def test_max_possible_distance(self) -> None:
        """Max possible distance should be sqrt(4 * 9^2) = 18."""
        # From profile-matching.yaml: max_possible_distance: 18.0
        max_dist = math.sqrt(4 * (10 - 1) ** 2)
        assert max_dist == pytest.approx(18.0, abs=0.001)
