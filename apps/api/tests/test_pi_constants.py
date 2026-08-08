"""Tests for PI personality constants and scoring matrix."""

from src.services.pi_constants import (
    PI_TO_META_ARCHETYPE,
    SCORING_MATRIX,
    VALID_META_ARCHETYPES,
    VALID_PI_PROFILES,
    get_chamber_affinity,
    get_meta_archetype,
    get_top_agentic_roles,
)


def test_all_17_profiles_defined():
    assert len(VALID_PI_PROFILES) == 17


def test_all_3_meta_archetypes_defined():
    assert VALID_META_ARCHETYPES == ("interpreter", "enforcer", "driver")


def test_every_profile_maps_to_meta_archetype():
    for profile in VALID_PI_PROFILES:
        assert profile in PI_TO_META_ARCHETYPE
        assert PI_TO_META_ARCHETYPE[profile] in VALID_META_ARCHETYPES


def test_scoring_matrix_has_all_profiles():
    for profile in VALID_PI_PROFILES:
        assert profile in SCORING_MATRIX
        assert len(SCORING_MATRIX[profile]) == 16  # 16 agentic roles


def test_get_top_agentic_roles_returns_sorted():
    top = get_top_agentic_roles("analyzer", n=3)
    assert len(top) == 3
    # Scores should be descending
    assert top[0][1] >= top[1][1] >= top[2][1]


def test_get_top_agentic_roles_analyzer():
    top = get_top_agentic_roles("analyzer", n=1)
    assert top[0][0] == "evidence_curator"  # Highest scoring role for analyzer


def test_get_top_agentic_roles_guardian():
    top = get_top_agentic_roles("guardian", n=1)
    assert top[0][0] == "cold_route_guardian"


def test_get_meta_archetype():
    assert get_meta_archetype("analyzer") == "interpreter"
    assert get_meta_archetype("captain") == "driver"
    assert get_meta_archetype("guardian") == "enforcer"


def test_get_meta_archetype_invalid():
    assert get_meta_archetype("nonexistent") is None


def test_get_chamber_affinity():
    assert get_chamber_affinity("interpreter") == ["discover"]
    assert get_chamber_affinity("driver") == ["build", "ship"]
    assert get_chamber_affinity("enforcer") == ["review"]


def test_get_chamber_affinity_invalid():
    assert get_chamber_affinity("nonexistent") == []


def test_scoring_values_in_range():
    for profile, scores in SCORING_MATRIX.items():
        for role, score in scores.items():
            assert 0.0 <= score <= 1.0, f"{profile}/{role} score {score} out of range"
