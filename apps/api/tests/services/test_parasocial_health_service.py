"""Tests for ParasocialHealthService — 3-tier parasocial health nudge engine."""

from src.services.parasocial_health_service import NudgeTier, ParasocialHealthService

# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def _evaluate(**kwargs) -> dict | None:
    """Call evaluate() with sensible defaults that produce no nudge."""
    defaults = dict(
        fan_visit_count=5,
        mean_visits=10.0,
        std_visits=5.0,
        creators_followed=5,
        top_topic_pct=0.0,
    )
    defaults.update(kwargs)
    return ParasocialHealthService.evaluate(**defaults)


# ---------------------------------------------------------------------------
# No nudge — normal engagement
# ---------------------------------------------------------------------------


class TestNoNudge:
    def test_normal_engagement_returns_none(self):
        result = _evaluate(
            fan_visit_count=10,
            mean_visits=10.0,
            std_visits=5.0,
            creators_followed=5,
            top_topic_pct=0.0,
        )
        assert result is None

    def test_visit_count_exactly_at_2sigma_not_triggered(self):
        """Boundary: exactly at 2σ should NOT trigger TOUCH_GRASS (must be strictly >)."""
        result = _evaluate(
            fan_visit_count=20,  # 10 + 2*5 = 20, not >
            mean_visits=10.0,
            std_visits=5.0,
        )
        assert result is None

    def test_zero_std_skips_touch_grass(self):
        """std_visits == 0 must not trigger even if visits are high."""
        result = _evaluate(
            fan_visit_count=9999,
            mean_visits=0.0,
            std_visits=0.0,
        )
        assert result is None

    def test_high_topic_pct_but_low_visits_no_nudge(self):
        result = _evaluate(top_topic_pct=0.90, fan_visit_count=20)
        # fan_visit_count must be > 20 for CHANNEL_IT
        assert result is None

    def test_few_creators_but_low_visits_no_nudge(self):
        result = _evaluate(creators_followed=1, fan_visit_count=10)
        # must be > 10 for CHECK_YOUR_ORBIT
        assert result is None


# ---------------------------------------------------------------------------
# CHECK_YOUR_ORBIT
# ---------------------------------------------------------------------------


class TestCheckYourOrbit:
    def test_single_creator_follower_triggers(self):
        result = _evaluate(creators_followed=1, fan_visit_count=11)
        assert result is not None
        assert result["tier"] == NudgeTier.CHECK_YOUR_ORBIT

    def test_two_creator_follower_triggers(self):
        result = _evaluate(creators_followed=2, fan_visit_count=15)
        assert result is not None
        assert result["tier"] == NudgeTier.CHECK_YOUR_ORBIT

    def test_three_creator_follower_no_nudge(self):
        result = _evaluate(creators_followed=3, fan_visit_count=15)
        assert result is None

    def test_message_present(self):
        result = _evaluate(creators_followed=1, fan_visit_count=50)
        assert result is not None
        assert "message" in result
        assert isinstance(result["message"], str)
        assert len(result["message"]) > 0


# ---------------------------------------------------------------------------
# CHANNEL_IT
# ---------------------------------------------------------------------------


class TestChannelIt:
    def test_high_topic_concentration_triggers(self):
        # Use high mean so TOUCH_GRASS does not fire (21 << 100 + 2*5 = 110)
        result = _evaluate(
            top_topic_pct=0.80,
            fan_visit_count=21,
            mean_visits=100.0,
            std_visits=5.0,
        )
        assert result is not None
        assert result["tier"] == NudgeTier.CHANNEL_IT

    def test_exactly_75_pct_no_nudge(self):
        """top_topic_pct must be strictly > 0.75."""
        result = _evaluate(
            top_topic_pct=0.75,
            fan_visit_count=21,
            mean_visits=100.0,
            std_visits=5.0,
        )
        assert result is None

    def test_message_present(self):
        result = _evaluate(
            top_topic_pct=0.90,
            fan_visit_count=25,
            mean_visits=100.0,
            std_visits=5.0,
        )
        assert result is not None
        assert "message" in result
        assert isinstance(result["message"], str)

    def test_valid_message_from_pool(self):
        from src.services.parasocial_health_service import _MESSAGES

        result = _evaluate(
            top_topic_pct=0.90,
            fan_visit_count=25,
            mean_visits=100.0,
            std_visits=5.0,
        )
        assert result["message"] in _MESSAGES[NudgeTier.CHANNEL_IT]


# ---------------------------------------------------------------------------
# TOUCH_GRASS
# ---------------------------------------------------------------------------


class TestTouchGrass:
    def test_engagement_above_2sigma_triggers(self):
        # mean=10, std=5 → threshold > 20; use 21
        result = _evaluate(
            fan_visit_count=21,
            mean_visits=10.0,
            std_visits=5.0,
        )
        assert result is not None
        assert result["tier"] == NudgeTier.TOUCH_GRASS

    def test_severity_is_gentle(self):
        result = _evaluate(
            fan_visit_count=21,
            mean_visits=10.0,
            std_visits=5.0,
        )
        assert result is not None
        assert result.get("severity") == "gentle"

    def test_message_present(self):
        result = _evaluate(
            fan_visit_count=21,
            mean_visits=10.0,
            std_visits=5.0,
        )
        assert result is not None
        assert "message" in result
        assert isinstance(result["message"], str)

    def test_valid_message_from_pool(self):
        from src.services.parasocial_health_service import _MESSAGES

        result = _evaluate(
            fan_visit_count=21,
            mean_visits=10.0,
            std_visits=5.0,
        )
        assert result["message"] in _MESSAGES[NudgeTier.TOUCH_GRASS]


# ---------------------------------------------------------------------------
# Priority ordering — TOUCH_GRASS beats lower tiers
# ---------------------------------------------------------------------------


class TestPriority:
    def test_touch_grass_beats_channel_it(self):
        """When both TOUCH_GRASS and CHANNEL_IT conditions are met, TOUCH_GRASS wins."""
        result = _evaluate(
            fan_visit_count=21,
            mean_visits=10.0,
            std_visits=5.0,
            top_topic_pct=0.90,  # would trigger CHANNEL_IT
        )
        assert result is not None
        assert result["tier"] == NudgeTier.TOUCH_GRASS

    def test_touch_grass_beats_check_your_orbit(self):
        """TOUCH_GRASS takes priority over CHECK_YOUR_ORBIT."""
        result = _evaluate(
            fan_visit_count=21,
            mean_visits=10.0,
            std_visits=5.0,
            creators_followed=1,  # would trigger CHECK_YOUR_ORBIT
        )
        assert result is not None
        assert result["tier"] == NudgeTier.TOUCH_GRASS

    def test_channel_it_beats_check_your_orbit(self):
        """CHANNEL_IT takes priority over CHECK_YOUR_ORBIT."""
        result = _evaluate(
            fan_visit_count=21,
            mean_visits=100.0,  # low relative — no TOUCH_GRASS
            std_visits=5.0,
            top_topic_pct=0.90,
            creators_followed=1,
        )
        assert result is not None
        assert result["tier"] == NudgeTier.CHANNEL_IT


# ---------------------------------------------------------------------------
# NudgeTier enum
# ---------------------------------------------------------------------------


class TestNudgeTierEnum:
    def test_enum_values_are_strings(self):
        assert NudgeTier.CHECK_YOUR_ORBIT == "CHECK_YOUR_ORBIT"
        assert NudgeTier.CHANNEL_IT == "CHANNEL_IT"
        assert NudgeTier.TOUCH_GRASS == "TOUCH_GRASS"

    def test_tier_in_result_is_nudgetier_instance(self):
        result = _evaluate(creators_followed=1, fan_visit_count=15)
        assert isinstance(result["tier"], NudgeTier)
