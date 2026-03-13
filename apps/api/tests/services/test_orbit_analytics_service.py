"""Tests for the confidence-gated analytics service."""

from src.services.orbit_analytics_service import ConfidenceGate, build_analytics, get_gate

# ---------------------------------------------------------------------------
# get_gate tests — boundary values
# ---------------------------------------------------------------------------


class TestGetGate:
    def test_zero_interactions_is_none(self):
        assert get_gate(0) == ConfidenceGate.NONE

    def test_below_low_threshold_is_none(self):
        assert get_gate(4) == ConfidenceGate.NONE

    def test_at_low_threshold(self):
        assert get_gate(5) == ConfidenceGate.LOW

    def test_between_low_and_medium(self):
        assert get_gate(15) == ConfidenceGate.LOW

    def test_at_medium_threshold(self):
        assert get_gate(20) == ConfidenceGate.MEDIUM

    def test_between_medium_and_high(self):
        assert get_gate(75) == ConfidenceGate.MEDIUM

    def test_at_high_threshold(self):
        assert get_gate(100) == ConfidenceGate.HIGH

    def test_well_above_high(self):
        assert get_gate(1000) == ConfidenceGate.HIGH

    def test_just_below_low(self):
        assert get_gate(4) == ConfidenceGate.NONE

    def test_just_below_medium(self):
        assert get_gate(19) == ConfidenceGate.LOW

    def test_just_below_high(self):
        assert get_gate(99) == ConfidenceGate.MEDIUM


# ---------------------------------------------------------------------------
# build_analytics tests — filtering by gate
# ---------------------------------------------------------------------------

SAMPLE_PERSONA_DIST = {"The Influencer": 0.35, "The Strategist": 0.25}
SAMPLE_HEATMAP = {"D": 6.5, "E": 7.2, "C": 4.1, "F": 3.8}


class TestBuildAnalytics:
    def test_none_gate_only_page_views(self):
        result = build_analytics(
            interaction_count=3,
            page_views=42,
            persona_distribution=SAMPLE_PERSONA_DIST,
            drive_heatmap=SAMPLE_HEATMAP,
        )
        assert result["gate"] == "none"
        assert result["page_views"] == 42
        assert result["interaction_count"] == 3
        assert "persona_distribution" not in result
        assert "drive_heatmap" not in result
        assert "full_intelligence" not in result

    def test_low_gate_adds_persona_distribution(self):
        result = build_analytics(
            interaction_count=10,
            page_views=100,
            persona_distribution=SAMPLE_PERSONA_DIST,
            drive_heatmap=SAMPLE_HEATMAP,
        )
        assert result["gate"] == "low"
        assert result["page_views"] == 100
        assert result["persona_distribution"] == SAMPLE_PERSONA_DIST
        assert "drive_heatmap" not in result
        assert "full_intelligence" not in result

    def test_medium_gate_adds_heatmap(self):
        result = build_analytics(
            interaction_count=50,
            page_views=500,
            persona_distribution=SAMPLE_PERSONA_DIST,
            drive_heatmap=SAMPLE_HEATMAP,
        )
        assert result["gate"] == "medium"
        assert result["persona_distribution"] == SAMPLE_PERSONA_DIST
        assert result["drive_heatmap"] == SAMPLE_HEATMAP
        assert "full_intelligence" not in result

    def test_high_gate_includes_everything(self):
        result = build_analytics(
            interaction_count=200,
            page_views=2000,
            persona_distribution=SAMPLE_PERSONA_DIST,
            drive_heatmap=SAMPLE_HEATMAP,
        )
        assert result["gate"] == "high"
        assert result["persona_distribution"] == SAMPLE_PERSONA_DIST
        assert result["drive_heatmap"] == SAMPLE_HEATMAP
        assert result["full_intelligence"] is True

    def test_none_defaults_when_data_is_none(self):
        result = build_analytics(interaction_count=0, page_views=0)
        assert result["gate"] == "none"
        assert result["page_views"] == 0
        assert "persona_distribution" not in result

    def test_low_defaults_empty_when_data_is_none(self):
        result = build_analytics(interaction_count=5, page_views=10)
        assert result["gate"] == "low"
        assert result["persona_distribution"] == {}

    def test_medium_defaults_empty_when_data_is_none(self):
        result = build_analytics(interaction_count=20, page_views=50)
        assert result["gate"] == "medium"
        assert result["persona_distribution"] == {}
        assert result["drive_heatmap"] == {}

    def test_result_always_has_gate_and_counts(self):
        """Every result includes gate, interaction_count, and page_views."""
        for count in [0, 5, 20, 100]:
            result = build_analytics(interaction_count=count, page_views=count * 10)
            assert "gate" in result
            assert "interaction_count" in result
            assert "page_views" in result
