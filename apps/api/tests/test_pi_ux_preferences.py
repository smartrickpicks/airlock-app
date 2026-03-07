"""Tests for PI UX preference defaults per profile."""

from src.services.pi_constants import VALID_PI_PROFILES
from src.services.pi_ux_preferences import (
    UX_PROFILES,
    VALID_DENSITY_VALUES,
    VALID_PACE_VALUES,
    VALID_STRUCTURE_VALUES,
    get_ux_preferences,
)


def test_every_profile_has_ux_preferences():
    for profile in VALID_PI_PROFILES:
        assert profile in UX_PROFILES, f"Missing UX profile for {profile}"


def test_ux_preferences_have_required_keys():
    required_keys = {
        "informationDensity",
        "structurePreference",
        "pacePreference",
        "compensationPatterns",
        "explanationStyle",
        "notificationFrequency",
        "feedbackPreference",
        "defaultAutonomyLevel",
        "aiExplanationDepth",
        "aiConfirmationStyle",
        "defaultTriptychWeights",
        "preferredPanelFocus",
    }
    for profile, prefs in UX_PROFILES.items():
        assert set(prefs.keys()) == required_keys, (
            f"{profile} missing keys: {required_keys - set(prefs.keys())}"
        )


def test_autonomy_level_in_range():
    for profile, prefs in UX_PROFILES.items():
        assert 1 <= prefs["defaultAutonomyLevel"] <= 5, f"{profile} autonomy out of range"


def test_triptych_weights_sum_to_100():
    for profile, prefs in UX_PROFILES.items():
        weights = prefs["defaultTriptychWeights"]
        assert len(weights) == 3
        assert sum(weights) == 100, f"{profile} triptych weights sum to {sum(weights)}, not 100"


def test_get_ux_preferences_returns_copy():
    prefs1 = get_ux_preferences("analyzer")
    prefs2 = get_ux_preferences("analyzer")
    assert prefs1 == prefs2
    prefs1["informationDensity"] = "minimal"
    assert prefs2["informationDensity"] == "dense"  # Original unchanged


def test_get_ux_preferences_invalid_profile():
    assert get_ux_preferences("nonexistent") is None


def test_density_values_valid():
    for _profile, prefs in UX_PROFILES.items():
        assert prefs["informationDensity"] in VALID_DENSITY_VALUES


def test_structure_values_valid():
    for _profile, prefs in UX_PROFILES.items():
        assert prefs["structurePreference"] in VALID_STRUCTURE_VALUES


def test_pace_values_valid():
    for _profile, prefs in UX_PROFILES.items():
        assert prefs["pacePreference"] in VALID_PACE_VALUES
