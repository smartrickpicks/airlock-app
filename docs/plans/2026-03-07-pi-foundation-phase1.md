# PI Foundation (Phase 1) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add PI personality assessment storage, scoring matrix, and admin UI so users can be assigned PI profiles that recommend agentic roles and configure UX preferences.

**Architecture:** New `pi_assessments` table stores per-user PI data (profile, meta-archetype, behavioral factors, UX preferences). A pure-function scoring engine maps PI profiles to agentic role recommendations. Frontend adds PI badge atoms and an assessment form to the admin members page. Mock data extended with PI profiles for all 6 existing demo users.

**Tech Stack:** SQLAlchemy 2.0 (model), Alembic (migration), FastAPI (routes), Pydantic (schemas), Zustand (frontend state), Tailwind tokens (styling)

**Design Doc:** `docs/plans/2026-03-07-pi-personality-role-architecture.md`

---

## Task 1: PI Constants Module

**Files:**

- Create: `apps/api/src/services/pi_constants.py`
- Test: `apps/api/tests/test_pi_constants.py`

**Step 1: Write the failing test**

```python
# apps/api/tests/test_pi_constants.py
"""Tests for PI personality constants and scoring matrix."""

from src.services.pi_constants import (
    VALID_PI_PROFILES,
    VALID_META_ARCHETYPES,
    PI_TO_META_ARCHETYPE,
    SCORING_MATRIX,
    get_top_agentic_roles,
    get_meta_archetype,
    get_chamber_affinity,
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
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && python -m pytest tests/test_pi_constants.py -v`
Expected: FAIL with ModuleNotFoundError

**Step 3: Write minimal implementation**

```python
# apps/api/src/services/pi_constants.py
"""PI personality constants, meta-archetype mappings, and scoring matrix.

Reference: docs/plans/2026-03-07-pi-personality-role-architecture.md
"""

VALID_PI_PROFILES = (
    "analyzer", "strategist", "specialist", "venturer", "scholar",
    "individualist", "captain", "persuader", "promoter", "maverick",
    "collaborator", "altruist", "adapter", "guardian", "controller",
    "operator", "artisan",
)

VALID_META_ARCHETYPES = ("interpreter", "enforcer", "driver")

PI_TO_META_ARCHETYPE: dict[str, str] = {
    # Interpreters (SENSE) — Discovery-native
    "analyzer": "interpreter",
    "strategist": "interpreter",
    "scholar": "interpreter",
    "specialist": "interpreter",
    "individualist": "interpreter",
    # Drivers (DECIDE) — Build/Ship-native
    "captain": "driver",
    "venturer": "driver",
    "maverick": "driver",
    "persuader": "driver",
    "promoter": "driver",
    "collaborator": "driver",
    "adapter": "driver",
    # Enforcers (VALIDATE) — Review-native
    "guardian": "enforcer",
    "controller": "enforcer",
    "operator": "enforcer",
    "artisan": "enforcer",
    "altruist": "enforcer",
}

META_ARCHETYPE_CHAMBER_AFFINITY: dict[str, list[str]] = {
    "interpreter": ["discover"],
    "driver": ["build", "ship"],
    "enforcer": ["review"],
}

VALID_AGENTIC_ROLES = (
    "truth_keeper", "system_architect", "momentum_builder",
    "evidence_curator", "fast_path_executor", "maverick_innovator",
    "verifier", "friction_taxonomist", "authority_validator",
    "cold_route_guardian", "semantic_sheriff", "process_facilitator",
    "compliance_analyst", "observer", "drift_detective", "team_orchestrator",
)

# 17 PI profiles × 16 agentic roles scoring matrix (0.0–1.0)
# From design doc Section 3
SCORING_MATRIX: dict[str, dict[str, float]] = {
    "analyzer": {
        "truth_keeper": 0.6, "system_architect": 0.5, "momentum_builder": 0.2,
        "evidence_curator": 0.9, "fast_path_executor": 0.3, "maverick_innovator": 0.1,
        "verifier": 0.7, "friction_taxonomist": 0.4, "authority_validator": 0.5,
        "cold_route_guardian": 0.6, "semantic_sheriff": 0.7, "process_facilitator": 0.3,
        "compliance_analyst": 0.8, "observer": 0.7, "drift_detective": 0.8, "team_orchestrator": 0.2,
    },
    "strategist": {
        "truth_keeper": 0.7, "system_architect": 0.9, "momentum_builder": 0.5,
        "evidence_curator": 0.6, "fast_path_executor": 0.4, "maverick_innovator": 0.6,
        "verifier": 0.5, "friction_taxonomist": 0.5, "authority_validator": 0.6,
        "cold_route_guardian": 0.5, "semantic_sheriff": 0.6, "process_facilitator": 0.4,
        "compliance_analyst": 0.5, "observer": 0.6, "drift_detective": 0.7, "team_orchestrator": 0.3,
    },
    "specialist": {
        "truth_keeper": 0.7, "system_architect": 0.6, "momentum_builder": 0.2,
        "evidence_curator": 0.8, "fast_path_executor": 0.2, "maverick_innovator": 0.1,
        "verifier": 0.8, "friction_taxonomist": 0.4, "authority_validator": 0.5,
        "cold_route_guardian": 0.6, "semantic_sheriff": 0.8, "process_facilitator": 0.3,
        "compliance_analyst": 0.9, "observer": 0.7, "drift_detective": 0.7, "team_orchestrator": 0.1,
    },
    "venturer": {
        "truth_keeper": 0.3, "system_architect": 0.5, "momentum_builder": 0.9,
        "evidence_curator": 0.3, "fast_path_executor": 0.8, "maverick_innovator": 0.7,
        "verifier": 0.2, "friction_taxonomist": 0.3, "authority_validator": 0.4,
        "cold_route_guardian": 0.2, "semantic_sheriff": 0.2, "process_facilitator": 0.4,
        "compliance_analyst": 0.2, "observer": 0.3, "drift_detective": 0.3, "team_orchestrator": 0.3,
    },
    "scholar": {
        "truth_keeper": 0.8, "system_architect": 0.6, "momentum_builder": 0.2,
        "evidence_curator": 0.7, "fast_path_executor": 0.2, "maverick_innovator": 0.3,
        "verifier": 0.6, "friction_taxonomist": 0.5, "authority_validator": 0.4,
        "cold_route_guardian": 0.5, "semantic_sheriff": 0.7, "process_facilitator": 0.3,
        "compliance_analyst": 0.6, "observer": 0.8, "drift_detective": 0.7, "team_orchestrator": 0.2,
    },
    "individualist": {
        "truth_keeper": 0.7, "system_architect": 0.8, "momentum_builder": 0.3,
        "evidence_curator": 0.5, "fast_path_executor": 0.3, "maverick_innovator": 0.8,
        "verifier": 0.5, "friction_taxonomist": 0.6, "authority_validator": 0.5,
        "cold_route_guardian": 0.5, "semantic_sheriff": 0.6, "process_facilitator": 0.3,
        "compliance_analyst": 0.4, "observer": 0.6, "drift_detective": 0.7, "team_orchestrator": 0.2,
    },
    "captain": {
        "truth_keeper": 0.5, "system_architect": 0.5, "momentum_builder": 0.9,
        "evidence_curator": 0.3, "fast_path_executor": 0.7, "maverick_innovator": 0.5,
        "verifier": 0.3, "friction_taxonomist": 0.4, "authority_validator": 0.6,
        "cold_route_guardian": 0.3, "semantic_sheriff": 0.3, "process_facilitator": 0.5,
        "compliance_analyst": 0.3, "observer": 0.4, "drift_detective": 0.3, "team_orchestrator": 0.7,
    },
    "persuader": {
        "truth_keeper": 0.3, "system_architect": 0.3, "momentum_builder": 0.7,
        "evidence_curator": 0.3, "fast_path_executor": 0.9, "maverick_innovator": 0.5,
        "verifier": 0.2, "friction_taxonomist": 0.5, "authority_validator": 0.3,
        "cold_route_guardian": 0.2, "semantic_sheriff": 0.2, "process_facilitator": 0.6,
        "compliance_analyst": 0.2, "observer": 0.3, "drift_detective": 0.2, "team_orchestrator": 0.5,
    },
    "promoter": {
        "truth_keeper": 0.3, "system_architect": 0.2, "momentum_builder": 0.7,
        "evidence_curator": 0.2, "fast_path_executor": 0.7, "maverick_innovator": 0.4,
        "verifier": 0.2, "friction_taxonomist": 0.5, "authority_validator": 0.2,
        "cold_route_guardian": 0.1, "semantic_sheriff": 0.2, "process_facilitator": 0.8,
        "compliance_analyst": 0.2, "observer": 0.3, "drift_detective": 0.2, "team_orchestrator": 0.6,
    },
    "maverick": {
        "truth_keeper": 0.3, "system_architect": 0.5, "momentum_builder": 0.7,
        "evidence_curator": 0.3, "fast_path_executor": 0.6, "maverick_innovator": 1.0,
        "verifier": 0.2, "friction_taxonomist": 0.4, "authority_validator": 0.3,
        "cold_route_guardian": 0.2, "semantic_sheriff": 0.2, "process_facilitator": 0.3,
        "compliance_analyst": 0.2, "observer": 0.4, "drift_detective": 0.4, "team_orchestrator": 0.3,
    },
    "collaborator": {
        "truth_keeper": 0.4, "system_architect": 0.4, "momentum_builder": 0.6,
        "evidence_curator": 0.4, "fast_path_executor": 0.5, "maverick_innovator": 0.4,
        "verifier": 0.4, "friction_taxonomist": 0.6, "authority_validator": 0.3,
        "cold_route_guardian": 0.3, "semantic_sheriff": 0.3, "process_facilitator": 0.7,
        "compliance_analyst": 0.3, "observer": 0.4, "drift_detective": 0.3, "team_orchestrator": 0.9,
    },
    "altruist": {
        "truth_keeper": 0.5, "system_architect": 0.3, "momentum_builder": 0.3,
        "evidence_curator": 0.4, "fast_path_executor": 0.3, "maverick_innovator": 0.2,
        "verifier": 0.4, "friction_taxonomist": 0.8, "authority_validator": 0.3,
        "cold_route_guardian": 0.4, "semantic_sheriff": 0.3, "process_facilitator": 0.6,
        "compliance_analyst": 0.4, "observer": 0.5, "drift_detective": 0.4, "team_orchestrator": 0.8,
    },
    "adapter": {
        "truth_keeper": 0.4, "system_architect": 0.4, "momentum_builder": 0.6,
        "evidence_curator": 0.5, "fast_path_executor": 0.6, "maverick_innovator": 0.4,
        "verifier": 0.5, "friction_taxonomist": 0.5, "authority_validator": 0.4,
        "cold_route_guardian": 0.4, "semantic_sheriff": 0.4, "process_facilitator": 0.7,
        "compliance_analyst": 0.4, "observer": 0.5, "drift_detective": 0.4, "team_orchestrator": 0.5,
    },
    "guardian": {
        "truth_keeper": 0.6, "system_architect": 0.4, "momentum_builder": 0.2,
        "evidence_curator": 0.5, "fast_path_executor": 0.2, "maverick_innovator": 0.1,
        "verifier": 0.7, "friction_taxonomist": 0.5, "authority_validator": 0.7,
        "cold_route_guardian": 1.0, "semantic_sheriff": 0.7, "process_facilitator": 0.5,
        "compliance_analyst": 0.7, "observer": 0.6, "drift_detective": 0.6, "team_orchestrator": 0.3,
    },
    "controller": {
        "truth_keeper": 0.6, "system_architect": 0.6, "momentum_builder": 0.3,
        "evidence_curator": 0.5, "fast_path_executor": 0.3, "maverick_innovator": 0.2,
        "verifier": 0.7, "friction_taxonomist": 0.4, "authority_validator": 0.9,
        "cold_route_guardian": 0.7, "semantic_sheriff": 0.8, "process_facilitator": 0.4,
        "compliance_analyst": 0.6, "observer": 0.5, "drift_detective": 0.6, "team_orchestrator": 0.2,
    },
    "operator": {
        "truth_keeper": 0.4, "system_architect": 0.4, "momentum_builder": 0.4,
        "evidence_curator": 0.4, "fast_path_executor": 0.5, "maverick_innovator": 0.2,
        "verifier": 0.6, "friction_taxonomist": 0.5, "authority_validator": 0.5,
        "cold_route_guardian": 0.6, "semantic_sheriff": 0.5, "process_facilitator": 0.8,
        "compliance_analyst": 0.6, "observer": 0.6, "drift_detective": 0.5, "team_orchestrator": 0.4,
    },
    "artisan": {
        "truth_keeper": 0.5, "system_architect": 0.5, "momentum_builder": 0.3,
        "evidence_curator": 0.6, "fast_path_executor": 0.3, "maverick_innovator": 0.3,
        "verifier": 0.8, "friction_taxonomist": 0.5, "authority_validator": 0.5,
        "cold_route_guardian": 0.6, "semantic_sheriff": 0.6, "process_facilitator": 0.4,
        "compliance_analyst": 0.7, "observer": 0.6, "drift_detective": 0.6, "team_orchestrator": 0.2,
    },
}


def get_meta_archetype(pi_profile: str) -> str | None:
    """Get the meta-archetype for a PI profile. Returns None if invalid."""
    return PI_TO_META_ARCHETYPE.get(pi_profile)


def get_chamber_affinity(meta_archetype: str) -> list[str]:
    """Get chamber affinity list for a meta-archetype."""
    return META_ARCHETYPE_CHAMBER_AFFINITY.get(meta_archetype, [])


def get_top_agentic_roles(pi_profile: str, n: int = 3) -> list[tuple[str, float]]:
    """Return top N agentic roles for a PI profile, sorted by score descending.

    Returns list of (role_name, score) tuples.
    """
    scores = SCORING_MATRIX.get(pi_profile, {})
    sorted_roles = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return sorted_roles[:n]
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && python -m pytest tests/test_pi_constants.py -v`
Expected: All 10 tests PASS

**Step 5: Commit**

```bash
git add apps/api/src/services/pi_constants.py apps/api/tests/test_pi_constants.py
git commit -m "feat(api): add PI personality constants and scoring matrix"
```

---

## Task 2: PI UX Preferences Constants

**Files:**

- Create: `apps/api/src/services/pi_ux_preferences.py`
- Test: `apps/api/tests/test_pi_ux_preferences.py`

**Step 1: Write the failing test**

```python
# apps/api/tests/test_pi_ux_preferences.py
"""Tests for PI UX preference defaults per profile."""

from src.services.pi_ux_preferences import (
    UX_PROFILES,
    get_ux_preferences,
    VALID_DENSITY_VALUES,
    VALID_STRUCTURE_VALUES,
    VALID_PACE_VALUES,
)
from src.services.pi_constants import VALID_PI_PROFILES


def test_every_profile_has_ux_preferences():
    for profile in VALID_PI_PROFILES:
        assert profile in UX_PROFILES, f"Missing UX profile for {profile}"


def test_ux_preferences_have_required_keys():
    required_keys = {
        "informationDensity", "structurePreference", "pacePreference",
        "compensationPatterns", "explanationStyle", "notificationFrequency",
        "feedbackPreference", "defaultAutonomyLevel", "aiExplanationDepth",
        "aiConfirmationStyle", "defaultTriptychWeights", "preferredPanelFocus",
    }
    for profile, prefs in UX_PROFILES.items():
        assert set(prefs.keys()) == required_keys, f"{profile} missing keys: {required_keys - set(prefs.keys())}"


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
    for profile, prefs in UX_PROFILES.items():
        assert prefs["informationDensity"] in VALID_DENSITY_VALUES


def test_structure_values_valid():
    for profile, prefs in UX_PROFILES.items():
        assert prefs["structurePreference"] in VALID_STRUCTURE_VALUES


def test_pace_values_valid():
    for profile, prefs in UX_PROFILES.items():
        assert prefs["pacePreference"] in VALID_PACE_VALUES
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && python -m pytest tests/test_pi_ux_preferences.py -v`
Expected: FAIL with ModuleNotFoundError

**Step 3: Write minimal implementation**

```python
# apps/api/src/services/pi_ux_preferences.py
"""Default UX preference profiles per PI personality type.

Reference: docs/plans/2026-03-07-pi-personality-role-architecture.md, Section 4
"""

import copy

VALID_DENSITY_VALUES = ("minimal", "moderate", "dense")
VALID_STRUCTURE_VALUES = ("hierarchical", "narrative", "visual", "tabular")
VALID_PACE_VALUES = ("deliberate", "moderate", "rapid")

UX_PROFILES: dict[str, dict] = {
    "analyzer": {
        "informationDensity": "dense",
        "structurePreference": "tabular",
        "pacePreference": "deliberate",
        "compensationPatterns": [
            "add_decision_deadlines",
            "show_progress_momentum_indicators",
            "surface_action_recommendations",
            "add_collaboration_prompts",
        ],
        "explanationStyle": "data-first",
        "notificationFrequency": "batch-daily",
        "feedbackPreference": "detailed-written",
        "defaultAutonomyLevel": 2,
        "aiExplanationDepth": "detailed",
        "aiConfirmationStyle": "always-ask",
        "defaultTriptychWeights": [25, 40, 35],
        "preferredPanelFocus": "orchestrate",
    },
    "strategist": {
        "informationDensity": "moderate",
        "structurePreference": "hierarchical",
        "pacePreference": "moderate",
        "compensationPatterns": [
            "add_implementation_checklists",
            "show_team_sentiment_indicators",
            "surface_detail_level_warnings",
            "add_delegation_suggestions",
        ],
        "explanationStyle": "context-first",
        "notificationFrequency": "periodic",
        "feedbackPreference": "visual-summary",
        "defaultAutonomyLevel": 3,
        "aiExplanationDepth": "standard",
        "aiConfirmationStyle": "ask-on-risk",
        "defaultTriptychWeights": [30, 40, 30],
        "preferredPanelFocus": "signal",
    },
    "specialist": {
        "informationDensity": "dense",
        "structurePreference": "hierarchical",
        "pacePreference": "deliberate",
        "compensationPatterns": [
            "add_broader_context_summaries",
            "show_impact_beyond_specialty",
            "surface_cross_team_dependencies",
            "add_flexibility_prompts",
        ],
        "explanationStyle": "data-first",
        "notificationFrequency": "batch-daily",
        "feedbackPreference": "detailed-written",
        "defaultAutonomyLevel": 2,
        "aiExplanationDepth": "detailed",
        "aiConfirmationStyle": "always-ask",
        "defaultTriptychWeights": [20, 50, 30],
        "preferredPanelFocus": "orchestrate",
    },
    "venturer": {
        "informationDensity": "minimal",
        "structurePreference": "visual",
        "pacePreference": "rapid",
        "compensationPatterns": [
            "add_risk_assessment_gates",
            "show_team_impact_warnings",
            "surface_compliance_requirements",
            "add_reflection_checkpoints",
        ],
        "explanationStyle": "action-first",
        "notificationFrequency": "real-time",
        "feedbackPreference": "quick-status",
        "defaultAutonomyLevel": 4,
        "aiExplanationDepth": "brief",
        "aiConfirmationStyle": "notify-only",
        "defaultTriptychWeights": [20, 55, 25],
        "preferredPanelFocus": "orchestrate",
    },
    "scholar": {
        "informationDensity": "dense",
        "structurePreference": "hierarchical",
        "pacePreference": "deliberate",
        "compensationPatterns": [
            "add_action_deadline_prompts",
            "show_practical_application_links",
            "surface_team_needs_indicators",
            "add_synthesis_checkpoints",
        ],
        "explanationStyle": "data-first",
        "notificationFrequency": "batch-daily",
        "feedbackPreference": "detailed-written",
        "defaultAutonomyLevel": 2,
        "aiExplanationDepth": "detailed",
        "aiConfirmationStyle": "always-ask",
        "defaultTriptychWeights": [30, 40, 30],
        "preferredPanelFocus": "signal",
    },
    "individualist": {
        "informationDensity": "moderate",
        "structurePreference": "hierarchical",
        "pacePreference": "moderate",
        "compensationPatterns": [
            "add_team_alignment_checks",
            "show_consensus_indicators",
            "surface_collaboration_opportunities",
            "add_communication_prompts",
        ],
        "explanationStyle": "context-first",
        "notificationFrequency": "periodic",
        "feedbackPreference": "detailed-written",
        "defaultAutonomyLevel": 3,
        "aiExplanationDepth": "detailed",
        "aiConfirmationStyle": "ask-on-risk",
        "defaultTriptychWeights": [25, 45, 30],
        "preferredPanelFocus": "orchestrate",
    },
    "captain": {
        "informationDensity": "moderate",
        "structurePreference": "visual",
        "pacePreference": "rapid",
        "compensationPatterns": [
            "add_patience_indicators",
            "show_detail_coverage_gaps",
            "surface_quiet_team_voices",
            "add_process_compliance_checks",
        ],
        "explanationStyle": "action-first",
        "notificationFrequency": "real-time",
        "feedbackPreference": "visual-summary",
        "defaultAutonomyLevel": 4,
        "aiExplanationDepth": "standard",
        "aiConfirmationStyle": "ask-on-risk",
        "defaultTriptychWeights": [30, 40, 30],
        "preferredPanelFocus": "signal",
    },
    "persuader": {
        "informationDensity": "moderate",
        "structurePreference": "narrative",
        "pacePreference": "rapid",
        "compensationPatterns": [
            "add_data_validation_prompts",
            "show_follow_through_tracking",
            "surface_analytical_gaps",
            "add_depth_before_breadth_nudges",
        ],
        "explanationStyle": "action-first",
        "notificationFrequency": "real-time",
        "feedbackPreference": "quick-status",
        "defaultAutonomyLevel": 4,
        "aiExplanationDepth": "brief",
        "aiConfirmationStyle": "notify-only",
        "defaultTriptychWeights": [25, 50, 25],
        "preferredPanelFocus": "orchestrate",
    },
    "promoter": {
        "informationDensity": "minimal",
        "structurePreference": "narrative",
        "pacePreference": "rapid",
        "compensationPatterns": [
            "add_structured_task_lists",
            "show_detail_completion_tracking",
            "surface_analytical_requirements",
            "add_focus_mode_suggestions",
        ],
        "explanationStyle": "action-first",
        "notificationFrequency": "real-time",
        "feedbackPreference": "quick-status",
        "defaultAutonomyLevel": 5,
        "aiExplanationDepth": "brief",
        "aiConfirmationStyle": "notify-only",
        "defaultTriptychWeights": [35, 40, 25],
        "preferredPanelFocus": "signal",
    },
    "maverick": {
        "informationDensity": "moderate",
        "structurePreference": "visual",
        "pacePreference": "rapid",
        "compensationPatterns": [
            "add_consensus_building_tools",
            "show_stakeholder_alignment_status",
            "surface_process_requirements",
            "add_completion_tracking",
        ],
        "explanationStyle": "action-first",
        "notificationFrequency": "real-time",
        "feedbackPreference": "visual-summary",
        "defaultAutonomyLevel": 4,
        "aiExplanationDepth": "brief",
        "aiConfirmationStyle": "ask-on-risk",
        "defaultTriptychWeights": [20, 55, 25],
        "preferredPanelFocus": "orchestrate",
    },
    "collaborator": {
        "informationDensity": "moderate",
        "structurePreference": "narrative",
        "pacePreference": "moderate",
        "compensationPatterns": [
            "add_individual_accountability_markers",
            "show_decision_urgency_timers",
            "surface_when_consensus_delays",
            "add_assertiveness_prompts",
        ],
        "explanationStyle": "context-first",
        "notificationFrequency": "periodic",
        "feedbackPreference": "visual-summary",
        "defaultAutonomyLevel": 3,
        "aiExplanationDepth": "standard",
        "aiConfirmationStyle": "ask-on-risk",
        "defaultTriptychWeights": [30, 35, 35],
        "preferredPanelFocus": "signal",
    },
    "altruist": {
        "informationDensity": "moderate",
        "structurePreference": "narrative",
        "pacePreference": "moderate",
        "compensationPatterns": [
            "add_priority_ranking_tools",
            "show_personal_capacity_warnings",
            "surface_boundary_reminders",
            "add_delegation_suggestions",
        ],
        "explanationStyle": "context-first",
        "notificationFrequency": "periodic",
        "feedbackPreference": "visual-summary",
        "defaultAutonomyLevel": 2,
        "aiExplanationDepth": "standard",
        "aiConfirmationStyle": "always-ask",
        "defaultTriptychWeights": [35, 30, 35],
        "preferredPanelFocus": "control",
    },
    "adapter": {
        "informationDensity": "moderate",
        "structurePreference": "visual",
        "pacePreference": "moderate",
        "compensationPatterns": [
            "add_personal_preference_anchoring",
            "show_consistency_tracking",
            "surface_when_flexibility_is_overextending",
            "add_identity_reinforcement_prompts",
        ],
        "explanationStyle": "context-first",
        "notificationFrequency": "periodic",
        "feedbackPreference": "visual-summary",
        "defaultAutonomyLevel": 3,
        "aiExplanationDepth": "standard",
        "aiConfirmationStyle": "ask-on-risk",
        "defaultTriptychWeights": [30, 40, 30],
        "preferredPanelFocus": "orchestrate",
    },
    "guardian": {
        "informationDensity": "dense",
        "structurePreference": "hierarchical",
        "pacePreference": "deliberate",
        "compensationPatterns": [
            "add_innovation_opportunity_alerts",
            "show_when_flexibility_is_safe",
            "surface_team_morale_indicators",
            "add_speed_vs_quality_tradeoff_tools",
        ],
        "explanationStyle": "data-first",
        "notificationFrequency": "batch-daily",
        "feedbackPreference": "detailed-written",
        "defaultAutonomyLevel": 1,
        "aiExplanationDepth": "detailed",
        "aiConfirmationStyle": "always-ask",
        "defaultTriptychWeights": [25, 35, 40],
        "preferredPanelFocus": "control",
    },
    "controller": {
        "informationDensity": "dense",
        "structurePreference": "hierarchical",
        "pacePreference": "deliberate",
        "compensationPatterns": [
            "add_empathy_context_for_decisions",
            "show_team_sentiment_before_enforcement",
            "surface_flexibility_opportunities",
            "add_delegation_vs_control_prompts",
        ],
        "explanationStyle": "data-first",
        "notificationFrequency": "periodic",
        "feedbackPreference": "detailed-written",
        "defaultAutonomyLevel": 2,
        "aiExplanationDepth": "detailed",
        "aiConfirmationStyle": "always-ask",
        "defaultTriptychWeights": [25, 35, 40],
        "preferredPanelFocus": "control",
    },
    "operator": {
        "informationDensity": "moderate",
        "structurePreference": "tabular",
        "pacePreference": "moderate",
        "compensationPatterns": [
            "add_strategic_context_summaries",
            "show_when_process_changes_needed",
            "surface_ownership_opportunities",
            "add_initiative_suggestion_prompts",
        ],
        "explanationStyle": "data-first",
        "notificationFrequency": "periodic",
        "feedbackPreference": "visual-summary",
        "defaultAutonomyLevel": 3,
        "aiExplanationDepth": "standard",
        "aiConfirmationStyle": "ask-on-risk",
        "defaultTriptychWeights": [25, 45, 30],
        "preferredPanelFocus": "orchestrate",
    },
    "artisan": {
        "informationDensity": "dense",
        "structurePreference": "hierarchical",
        "pacePreference": "deliberate",
        "compensationPatterns": [
            "add_deadline_urgency_indicators",
            "show_good_enough_vs_perfect_tradeoffs",
            "surface_team_pace_awareness",
            "add_scope_limitation_reminders",
        ],
        "explanationStyle": "data-first",
        "notificationFrequency": "batch-daily",
        "feedbackPreference": "detailed-written",
        "defaultAutonomyLevel": 2,
        "aiExplanationDepth": "detailed",
        "aiConfirmationStyle": "always-ask",
        "defaultTriptychWeights": [20, 50, 30],
        "preferredPanelFocus": "orchestrate",
    },
}


def get_ux_preferences(pi_profile: str) -> dict | None:
    """Get default UX preferences for a PI profile. Returns a deep copy, or None if invalid."""
    prefs = UX_PROFILES.get(pi_profile)
    if prefs is None:
        return None
    return copy.deepcopy(prefs)
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && python -m pytest tests/test_pi_ux_preferences.py -v`
Expected: All 9 tests PASS

**Step 5: Commit**

```bash
git add apps/api/src/services/pi_ux_preferences.py apps/api/tests/test_pi_ux_preferences.py
git commit -m "feat(api): add PI UX preference profiles for all 17 personality types"
```

---

## Task 3: PIAssessment SQLAlchemy Model

**Files:**

- Create: `apps/api/src/models/pi_assessment.py`
- Modify: `apps/api/src/models/__init__.py`
- Test: `apps/api/tests/test_pi_assessment_model.py`

**Step 1: Write the failing test**

```python
# apps/api/tests/test_pi_assessment_model.py
"""Tests for PIAssessment ORM model."""

from src.models.pi_assessment import PIAssessment
from src.services.pi_constants import VALID_PI_PROFILES, VALID_META_ARCHETYPES


def test_pi_assessment_tablename():
    assert PIAssessment.__tablename__ == "pi_assessments"


def test_pi_assessment_has_required_columns():
    columns = {c.name for c in PIAssessment.__table__.columns}
    required = {
        "id", "user_id", "workspace_id", "pi_profile", "meta_archetype",
        "behavioral_factors", "ux_preferences", "assessment_source",
        "assessed_at", "created_at",
    }
    assert required.issubset(columns), f"Missing columns: {required - columns}"


def test_pi_assessment_primary_key():
    pk_columns = [c.name for c in PIAssessment.__table__.primary_key.columns]
    assert pk_columns == ["id"]


def test_pi_assessment_unique_constraint():
    """Each user should have only one active assessment per workspace."""
    unique_constraints = [
        tuple(c.name for c in uc.columns)
        for uc in PIAssessment.__table__.constraints
        if hasattr(uc, "columns") and len(uc.columns) > 1
    ]
    assert ("user_id", "workspace_id") in unique_constraints
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && python -m pytest tests/test_pi_assessment_model.py -v`
Expected: FAIL with ModuleNotFoundError

**Step 3: Write minimal implementation**

```python
# apps/api/src/models/pi_assessment.py
"""PIAssessment model — per-user PI personality profile and UX preferences."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.db import Base


class PIAssessment(Base):
    __tablename__ = "pi_assessments"
    __table_args__ = (
        UniqueConstraint("user_id", "workspace_id", name="uq_pi_assessment_user_workspace"),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    user_id: Mapped[str] = mapped_column(Text, ForeignKey("users.id"), nullable=False)
    workspace_id: Mapped[str] = mapped_column(
        Text, ForeignKey("workspaces.id"), nullable=False, index=True
    )
    pi_profile: Mapped[str] = mapped_column(String(30), nullable=False)
    meta_archetype: Mapped[str] = mapped_column(String(20), nullable=False)
    behavioral_factors: Mapped[dict] = mapped_column(JSONB, server_default="{}", nullable=False)
    ux_preferences: Mapped[dict] = mapped_column(JSONB, server_default="{}", nullable=False)
    assessment_source: Mapped[str] = mapped_column(
        String(30), server_default="admin_assigned", nullable=False
    )
    assessed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

**Step 4: Register model in `__init__.py`**

Add to `apps/api/src/models/__init__.py`:

```python
"""Airlock ORM models."""

from src.models.event import Event
from src.models.pi_assessment import PIAssessment
from src.models.user import User
from src.models.user_module_role import UserModuleRole
from src.models.vault import Vault
from src.models.vault_member import VaultMember
from src.models.workspace import Workspace

__all__ = [
    "Event", "PIAssessment", "User", "UserModuleRole",
    "Vault", "VaultMember", "Workspace",
]
```

**Step 5: Run test to verify it passes**

Run: `cd apps/api && python -m pytest tests/test_pi_assessment_model.py -v`
Expected: All 4 tests PASS

**Step 6: Commit**

```bash
git add apps/api/src/models/pi_assessment.py apps/api/src/models/__init__.py apps/api/tests/test_pi_assessment_model.py
git commit -m "feat(api): add PIAssessment ORM model"
```

---

## Task 4: Alembic Migration for pi_assessments Table

**Files:**

- Create: `apps/api/src/migrations/versions/004_add_pi_assessments.py`

**Step 1: Write the migration**

```python
# apps/api/src/migrations/versions/004_add_pi_assessments.py
"""Add pi_assessments table.

Revision ID: 004
Revises: 003
Create Date: 2026-03-07
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "004"
down_revision: str = "003"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.create_table(
        "pi_assessments",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("pi_profile", sa.String(30), nullable=False),
        sa.Column("meta_archetype", sa.String(20), nullable=False),
        sa.Column(
            "behavioral_factors",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "ux_preferences",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "assessment_source",
            sa.String(30),
            nullable=False,
            server_default="admin_assigned",
        ),
        sa.Column(
            "assessed_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name="fk_pi_assessments_user_id"
        ),
        sa.ForeignKeyConstraint(
            ["workspace_id"],
            ["workspaces.id"],
            name="fk_pi_assessments_workspace_id",
        ),
        sa.UniqueConstraint(
            "user_id", "workspace_id", name="uq_pi_assessment_user_workspace"
        ),
    )
    op.create_index(
        "ix_pi_assessments_workspace_id",
        "pi_assessments",
        ["workspace_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_pi_assessments_workspace_id", table_name="pi_assessments")
    op.drop_table("pi_assessments")
```

**Step 2: Verify migration file is syntactically valid**

Run: `cd apps/api && python -c "import src.migrations.versions as v; print('OK')"`
Expected: OK (no syntax errors)

**Step 3: Commit**

```bash
git add apps/api/src/migrations/versions/004_add_pi_assessments.py
git commit -m "feat(api): add migration 004 for pi_assessments table"
```

---

## Task 5: PI Assessment Service (CRUD)

**Files:**

- Create: `apps/api/src/services/pi_assessment.py`
- Test: `apps/api/tests/test_pi_assessment_service.py`

**Step 1: Write the failing test**

```python
# apps/api/tests/test_pi_assessment_service.py
"""Tests for PI assessment service functions (unit tests, no DB)."""

from src.services.pi_assessment import (
    compute_assessment_recommendation,
    VALID_ASSESSMENT_SOURCES,
)


def test_valid_assessment_sources():
    assert "admin_assigned" in VALID_ASSESSMENT_SOURCES
    assert "self_reported" in VALID_ASSESSMENT_SOURCES
    assert "pi_verified" in VALID_ASSESSMENT_SOURCES


def test_compute_recommendation_analyzer():
    rec = compute_assessment_recommendation("analyzer")
    assert rec["pi_profile"] == "analyzer"
    assert rec["meta_archetype"] == "interpreter"
    assert rec["chamber_affinity"] == ["discover"]
    assert rec["top_agentic_role"] == "evidence_curator"
    assert rec["runner_up_role"] is not None
    assert "ux_preferences" in rec
    assert rec["ux_preferences"]["informationDensity"] == "dense"


def test_compute_recommendation_captain():
    rec = compute_assessment_recommendation("captain")
    assert rec["meta_archetype"] == "driver"
    assert rec["chamber_affinity"] == ["build", "ship"]
    assert rec["top_agentic_role"] == "momentum_builder"


def test_compute_recommendation_guardian():
    rec = compute_assessment_recommendation("guardian")
    assert rec["meta_archetype"] == "enforcer"
    assert rec["chamber_affinity"] == ["review"]
    assert rec["top_agentic_role"] == "cold_route_guardian"


def test_compute_recommendation_invalid():
    rec = compute_assessment_recommendation("nonexistent")
    assert rec is None
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && python -m pytest tests/test_pi_assessment_service.py -v`
Expected: FAIL with ModuleNotFoundError

**Step 3: Write minimal implementation**

```python
# apps/api/src/services/pi_assessment.py
"""PI assessment service — CRUD operations and recommendation engine."""

from sqlalchemy import select
from sqlalchemy.orm import Session
from ulid import ULID

from src.models.pi_assessment import PIAssessment
from src.services.pi_constants import (
    VALID_PI_PROFILES,
    get_chamber_affinity,
    get_meta_archetype,
    get_top_agentic_roles,
)
from src.services.pi_ux_preferences import get_ux_preferences

VALID_ASSESSMENT_SOURCES = ("admin_assigned", "self_reported", "pi_verified")


def compute_assessment_recommendation(pi_profile: str) -> dict | None:
    """Compute full recommendation for a PI profile (no DB needed).

    Returns dict with meta_archetype, chamber_affinity, top roles, and UX preferences.
    Returns None if the profile is invalid.
    """
    meta = get_meta_archetype(pi_profile)
    if meta is None:
        return None

    top_roles = get_top_agentic_roles(pi_profile, n=2)
    ux_prefs = get_ux_preferences(pi_profile)

    return {
        "pi_profile": pi_profile,
        "meta_archetype": meta,
        "chamber_affinity": get_chamber_affinity(meta),
        "top_agentic_role": top_roles[0][0] if top_roles else None,
        "top_agentic_role_score": top_roles[0][1] if top_roles else None,
        "runner_up_role": top_roles[1][0] if len(top_roles) > 1 else None,
        "runner_up_role_score": top_roles[1][1] if len(top_roles) > 1 else None,
        "ux_preferences": ux_prefs,
    }


def create_pi_assessment(
    db: Session,
    *,
    user_id: str,
    workspace_id: str,
    pi_profile: str,
    behavioral_factors: dict | None = None,
    assessment_source: str = "admin_assigned",
) -> PIAssessment:
    """Create or update a PI assessment for a user in a workspace.

    Uses upsert semantics: if an assessment already exists for the user+workspace,
    it is replaced (unique constraint on user_id + workspace_id).

    Raises ValueError if pi_profile is invalid.
    """
    if pi_profile not in VALID_PI_PROFILES:
        raise ValueError(f"Invalid PI profile: {pi_profile}. Must be one of {VALID_PI_PROFILES}")

    if assessment_source not in VALID_ASSESSMENT_SOURCES:
        raise ValueError(f"Invalid assessment source: {assessment_source}")

    meta = get_meta_archetype(pi_profile)
    ux_prefs = get_ux_preferences(pi_profile) or {}

    # Check for existing assessment (upsert)
    existing = db.execute(
        select(PIAssessment).where(
            PIAssessment.user_id == user_id,
            PIAssessment.workspace_id == workspace_id,
        )
    ).scalar_one_or_none()

    if existing:
        existing.pi_profile = pi_profile
        existing.meta_archetype = meta
        existing.behavioral_factors = behavioral_factors or {}
        existing.ux_preferences = ux_prefs
        existing.assessment_source = assessment_source
        db.commit()
        db.refresh(existing)
        return existing

    assessment = PIAssessment(
        id=str(ULID()),
        user_id=user_id,
        workspace_id=workspace_id,
        pi_profile=pi_profile,
        meta_archetype=meta,
        behavioral_factors=behavioral_factors or {},
        ux_preferences=ux_prefs,
        assessment_source=assessment_source,
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return assessment


def get_pi_assessment(db: Session, user_id: str, workspace_id: str) -> PIAssessment | None:
    """Get the PI assessment for a user in a workspace."""
    return db.execute(
        select(PIAssessment).where(
            PIAssessment.user_id == user_id,
            PIAssessment.workspace_id == workspace_id,
        )
    ).scalar_one_or_none()


def list_pi_assessments(db: Session, workspace_id: str) -> list[PIAssessment]:
    """List all PI assessments in a workspace."""
    return list(
        db.execute(
            select(PIAssessment)
            .where(PIAssessment.workspace_id == workspace_id)
            .order_by(PIAssessment.created_at.desc())
        ).scalars().all()
    )


def delete_pi_assessment(db: Session, user_id: str, workspace_id: str) -> bool:
    """Delete a PI assessment. Returns True if deleted, False if not found."""
    assessment = get_pi_assessment(db, user_id, workspace_id)
    if assessment is None:
        return False
    db.delete(assessment)
    db.commit()
    return True
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && python -m pytest tests/test_pi_assessment_service.py -v`
Expected: All 5 tests PASS

**Step 5: Commit**

```bash
git add apps/api/src/services/pi_assessment.py apps/api/tests/test_pi_assessment_service.py
git commit -m "feat(api): add PI assessment service with recommendation engine"
```

---

## Task 6: Pydantic Schemas for PI Assessment API

**Files:**

- Create: `apps/api/src/schemas/pi_assessment.py`
- Test: `apps/api/tests/test_pi_assessment_schemas.py`

**Step 1: Write the failing test**

```python
# apps/api/tests/test_pi_assessment_schemas.py
"""Tests for PI assessment Pydantic schemas."""

import pytest
from pydantic import ValidationError

from src.schemas.pi_assessment import (
    CreatePIAssessmentRequest,
    PIAssessmentResponse,
    PIRecommendationResponse,
)


def test_create_request_valid():
    req = CreatePIAssessmentRequest(pi_profile="analyzer")
    assert req.pi_profile == "analyzer"
    assert req.assessment_source == "admin_assigned"
    assert req.behavioral_factors == {}


def test_create_request_with_factors():
    req = CreatePIAssessmentRequest(
        pi_profile="captain",
        behavioral_factors={"dominance": 0.8, "extraversion": 0.7},
        assessment_source="pi_verified",
    )
    assert req.behavioral_factors["dominance"] == 0.8


def test_create_request_invalid_profile():
    with pytest.raises(ValidationError):
        CreatePIAssessmentRequest(pi_profile="nonexistent")


def test_create_request_invalid_source():
    with pytest.raises(ValidationError):
        CreatePIAssessmentRequest(pi_profile="analyzer", assessment_source="invalid")


def test_recommendation_response_fields():
    resp = PIRecommendationResponse(
        pi_profile="analyzer",
        meta_archetype="interpreter",
        chamber_affinity=["discover"],
        top_agentic_role="evidence_curator",
        top_agentic_role_score=0.9,
        runner_up_role="drift_detective",
        runner_up_role_score=0.8,
        ux_preferences={"informationDensity": "dense"},
    )
    assert resp.meta_archetype == "interpreter"
    assert resp.chamber_affinity == ["discover"]
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && python -m pytest tests/test_pi_assessment_schemas.py -v`
Expected: FAIL with ModuleNotFoundError

**Step 3: Write minimal implementation**

```python
# apps/api/src/schemas/pi_assessment.py
"""Pydantic schemas for PI assessment request/response validation."""

from datetime import datetime

from pydantic import BaseModel, Field

_VALID_PROFILES = (
    "analyzer|strategist|specialist|venturer|scholar|individualist|"
    "captain|persuader|promoter|maverick|collaborator|altruist|"
    "adapter|guardian|controller|operator|artisan"
)


class CreatePIAssessmentRequest(BaseModel):
    pi_profile: str = Field(
        ...,
        pattern=rf"^({_VALID_PROFILES})$",
        description="One of 17 PI personality profiles",
    )
    behavioral_factors: dict = Field(
        default_factory=dict,
        description="PI behavioral factor scores (dominance, extraversion, patience, formality)",
    )
    assessment_source: str = Field(
        default="admin_assigned",
        pattern=r"^(admin_assigned|self_reported|pi_verified)$",
    )


class PIAssessmentResponse(BaseModel):
    id: str
    user_id: str
    workspace_id: str
    pi_profile: str
    meta_archetype: str
    behavioral_factors: dict
    ux_preferences: dict
    assessment_source: str
    assessed_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class PIRecommendationResponse(BaseModel):
    pi_profile: str
    meta_archetype: str
    chamber_affinity: list[str]
    top_agentic_role: str | None
    top_agentic_role_score: float | None
    runner_up_role: str | None
    runner_up_role_score: float | None
    ux_preferences: dict


class PIAssessmentListResponse(BaseModel):
    assessments: list[PIAssessmentResponse]
    total: int
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && python -m pytest tests/test_pi_assessment_schemas.py -v`
Expected: All 5 tests PASS

**Step 5: Commit**

```bash
git add apps/api/src/schemas/pi_assessment.py apps/api/tests/test_pi_assessment_schemas.py
git commit -m "feat(api): add Pydantic schemas for PI assessment endpoints"
```

---

## Task 7: PI Assessment API Routes

**Files:**

- Create: `apps/api/src/routes/pi_assessments.py`
- Modify: `apps/api/src/main.py` (register router)
- Test: `apps/api/tests/test_pi_assessment_routes.py`

**Step 1: Write the failing test**

```python
# apps/api/tests/test_pi_assessment_routes.py
"""Tests for PI assessment route registration."""

from fastapi.testclient import TestClient

from src.main import app

client = TestClient(app)


def test_recommendation_endpoint_exists():
    """GET /api/v1/pi/recommend/{profile} should exist (may 401 without auth)."""
    response = client.get("/api/v1/pi/recommend/analyzer")
    # Without auth middleware bypass, expect 401 or 200
    assert response.status_code in (200, 401)


def test_recommendation_invalid_profile():
    """Invalid PI profile should return 400 or 401."""
    response = client.get("/api/v1/pi/recommend/nonexistent")
    assert response.status_code in (400, 401, 404)


def test_pi_routes_registered():
    """Verify PI routes are registered in the app."""
    routes = [r.path for r in app.routes]
    pi_routes = [r for r in routes if "/pi/" in r]
    assert len(pi_routes) >= 1, f"Expected PI routes, found: {routes}"
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && python -m pytest tests/test_pi_assessment_routes.py -v`
Expected: FAIL (no PI routes registered yet)

**Step 3: Write the route handler**

```python
# apps/api/src/routes/pi_assessments.py
"""PI assessment API routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.db import get_db
from src.middleware.auth import get_current_user
from src.schemas.pi_assessment import (
    CreatePIAssessmentRequest,
    PIAssessmentListResponse,
    PIAssessmentResponse,
    PIRecommendationResponse,
)
from src.services.event import create_event
from src.services.pi_assessment import (
    compute_assessment_recommendation,
    create_pi_assessment,
    delete_pi_assessment,
    get_pi_assessment,
    list_pi_assessments,
)

router = APIRouter(prefix="/api/v1/pi", tags=["pi-assessments"])


def _assessment_to_response(a) -> PIAssessmentResponse:
    return PIAssessmentResponse(
        id=a.id,
        user_id=a.user_id,
        workspace_id=a.workspace_id,
        pi_profile=a.pi_profile,
        meta_archetype=a.meta_archetype,
        behavioral_factors=a.behavioral_factors,
        ux_preferences=a.ux_preferences,
        assessment_source=a.assessment_source,
        assessed_at=a.assessed_at,
        created_at=a.created_at,
    )


@router.get("/recommend/{pi_profile}")
def get_recommendation(
    pi_profile: str,
    current_user: dict = Depends(get_current_user),  # noqa: B008
) -> PIRecommendationResponse:
    """Get PI role recommendation without saving an assessment."""
    rec = compute_assessment_recommendation(pi_profile)
    if rec is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid PI profile: {pi_profile}",
        )
    return PIRecommendationResponse(**rec)


@router.post("/users/{user_id}/assessment", status_code=status.HTTP_201_CREATED)
def create_assessment(
    user_id: str,
    body: CreatePIAssessmentRequest,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> PIAssessmentResponse:
    """Create or update a PI assessment for a user."""
    workspace_id = current_user.get("workspace_id", "")
    try:
        assessment = create_pi_assessment(
            db,
            user_id=user_id,
            workspace_id=workspace_id,
            pi_profile=body.pi_profile,
            behavioral_factors=body.behavioral_factors,
            assessment_source=body.assessment_source,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        ) from None

    create_event(
        db,
        vault_id=None,
        workspace_id=workspace_id,
        event_type="pi_assessment_created",
        actor_id=current_user.get("sub"),
        payload={
            "target_user_id": user_id,
            "pi_profile": body.pi_profile,
            "meta_archetype": assessment.meta_archetype,
        },
    )
    return _assessment_to_response(assessment)


@router.get("/users/{user_id}/assessment")
def get_user_assessment(
    user_id: str,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> PIAssessmentResponse:
    """Get the PI assessment for a specific user."""
    workspace_id = current_user.get("workspace_id", "")
    assessment = get_pi_assessment(db, user_id, workspace_id)
    if assessment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No PI assessment found for this user",
        )
    return _assessment_to_response(assessment)


@router.get("/assessments")
def list_assessments(
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> PIAssessmentListResponse:
    """List all PI assessments in the workspace."""
    workspace_id = current_user.get("workspace_id", "")
    assessments = list_pi_assessments(db, workspace_id)
    return PIAssessmentListResponse(
        assessments=[_assessment_to_response(a) for a in assessments],
        total=len(assessments),
    )


@router.delete("/users/{user_id}/assessment", status_code=status.HTTP_204_NO_CONTENT)
def remove_assessment(
    user_id: str,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> None:
    """Remove a PI assessment for a user."""
    workspace_id = current_user.get("workspace_id", "")
    deleted = delete_pi_assessment(db, user_id, workspace_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No PI assessment found for this user",
        )
```

**Step 4: Register router in main.py**

Add to `apps/api/src/main.py` after the existing imports (line 13):

```python
from src.routes.pi_assessments import router as pi_router
```

Add to the `create_app()` function after line 51:

```python
    app.include_router(pi_router)
```

**Step 5: Run test to verify it passes**

Run: `cd apps/api && python -m pytest tests/test_pi_assessment_routes.py -v`
Expected: All 3 tests PASS

**Step 6: Commit**

```bash
git add apps/api/src/routes/pi_assessments.py apps/api/src/main.py apps/api/tests/test_pi_assessment_routes.py
git commit -m "feat(api): add PI assessment API routes with recommendation endpoint"
```

---

## Task 8: Frontend PI Types and Mock Data

**Files:**

- Modify: `apps/web/src/lib/mock-admin.ts` (add PI types + mock PI data for existing users)

**Step 1: Add PI types and constants to mock-admin.ts**

Add these types after line 24 (after `WorkspaceMember` interface closing brace):

```typescript
// ─── PI Personality Types ───────────────────────────────────────────

export type PIProfile =
  | "analyzer"
  | "strategist"
  | "specialist"
  | "venturer"
  | "scholar"
  | "individualist"
  | "captain"
  | "persuader"
  | "promoter"
  | "maverick"
  | "collaborator"
  | "altruist"
  | "adapter"
  | "guardian"
  | "controller"
  | "operator"
  | "artisan";

export type MetaArchetype = "interpreter" | "enforcer" | "driver";

export interface PIAssessment {
  userId: string;
  piProfile: PIProfile;
  metaArchetype: MetaArchetype;
  chamberAffinity: string[];
  topAgenticRole: string;
  runnerUpRole: string;
  assessmentSource: "admin_assigned" | "self_reported" | "pi_verified";
  assessedAt: string;
}
```

Add PI constants after `ORG_ROLE_LABELS` (after line 97):

```typescript
export const PI_PROFILE_LABELS: Record<PIProfile, string> = {
  analyzer: "Analyzer",
  strategist: "Strategist",
  specialist: "Specialist",
  venturer: "Venturer",
  scholar: "Scholar",
  individualist: "Individualist",
  captain: "Captain",
  persuader: "Persuader",
  promoter: "Promoter",
  maverick: "Maverick",
  collaborator: "Collaborator",
  altruist: "Altruist",
  adapter: "Adapter",
  guardian: "Guardian",
  controller: "Controller",
  operator: "Operator",
  artisan: "Artisan",
};

export const META_ARCHETYPE_CONFIG: Record<
  MetaArchetype,
  { label: string; color: string; chamber: string }
> = {
  interpreter: {
    label: "Interpreter",
    color: "text-chamber-discover",
    chamber: "Discover",
  },
  driver: {
    label: "Driver",
    color: "text-chamber-build",
    chamber: "Build + Ship",
  },
  enforcer: {
    label: "Enforcer",
    color: "text-chamber-review",
    chamber: "Review",
  },
};

export const MOCK_PI_ASSESSMENTS: PIAssessment[] = [
  {
    userId: "user_001",
    piProfile: "captain",
    metaArchetype: "driver",
    chamberAffinity: ["build", "ship"],
    topAgenticRole: "momentum_builder",
    runnerUpRole: "team_orchestrator",
    assessmentSource: "admin_assigned",
    assessedAt: "2026-03-05T10:00:00Z",
  },
  {
    userId: "user_002",
    piProfile: "guardian",
    metaArchetype: "enforcer",
    chamberAffinity: ["review"],
    topAgenticRole: "cold_route_guardian",
    runnerUpRole: "verifier",
    assessmentSource: "admin_assigned",
    assessedAt: "2026-03-05T10:00:00Z",
  },
  {
    userId: "user_003",
    piProfile: "analyzer",
    metaArchetype: "interpreter",
    chamberAffinity: ["discover"],
    topAgenticRole: "evidence_curator",
    runnerUpRole: "drift_detective",
    assessmentSource: "pi_verified",
    assessedAt: "2026-03-04T14:00:00Z",
  },
  {
    userId: "user_004",
    piProfile: "specialist",
    metaArchetype: "interpreter",
    chamberAffinity: ["discover"],
    topAgenticRole: "compliance_analyst",
    runnerUpRole: "evidence_curator",
    assessmentSource: "admin_assigned",
    assessedAt: "2026-03-05T10:00:00Z",
  },
];
```

**Step 2: Verify build passes**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No type errors

**Step 3: Commit**

```bash
git add apps/web/src/lib/mock-admin.ts
git commit -m "feat(web): add PI personality types and mock assessment data"
```

---

## Task 9: PIProfileBadge Atom Component

**Files:**

- Create: `apps/web/src/components/atoms/PIProfileBadge.tsx`

**Step 1: Create the component**

```typescript
// apps/web/src/components/atoms/PIProfileBadge.tsx
"use client";

import type { MetaArchetype, PIProfile } from "@/lib/mock-admin";
import { META_ARCHETYPE_CONFIG, PI_PROFILE_LABELS } from "@/lib/mock-admin";

interface PIProfileBadgeProps {
  piProfile: PIProfile;
  metaArchetype: MetaArchetype;
  size?: "sm" | "md";
}

export default function PIProfileBadge({
  piProfile,
  metaArchetype,
  size = "sm",
}: PIProfileBadgeProps) {
  const config = META_ARCHETYPE_CONFIG[metaArchetype];
  const label = PI_PROFILE_LABELS[piProfile];

  const sizeClasses = size === "sm"
    ? "px-2 py-0.5 text-[10px]"
    : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-surface-border ${sizeClasses} font-medium`}
      title={`${label} (${config.label}) — ${config.chamber} affinity`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.color.replace("text-", "bg-")}`} />
      <span className="text-text-secondary">{label}</span>
    </span>
  );
}
```

**Step 2: Verify build passes**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No type errors

**Step 3: Commit**

```bash
git add apps/web/src/components/atoms/PIProfileBadge.tsx
git commit -m "feat(web): add PIProfileBadge atom component"
```

---

## Task 10: Add PI Badge to MembersTable

**Files:**

- Modify: `apps/web/src/components/organisms/MembersTable.tsx`

**Step 1: Update MembersTable to show PI badges**

Add imports at the top of `apps/web/src/components/organisms/MembersTable.tsx` (after line 8):

```typescript
import PIProfileBadge from "@/components/atoms/PIProfileBadge";
import { MOCK_PI_ASSESSMENTS, type PIAssessment } from "@/lib/mock-admin";
```

Add lookup helper inside the component (after `const { members, updateMemberRole } = useAdminStore();` at line 31):

```typescript
const piByUserId = MOCK_PI_ASSESSMENTS.reduce<Record<string, PIAssessment>>(
  (acc, a) => ({ ...acc, [a.userId]: a }),
  {},
);
```

Add a "PI Profile" column header in the `<thead>` (after the "Module Roles" th at line 59):

```typescript
              <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-text-muted">
                PI Profile
              </th>
```

Add PI badge cell in the `<tbody>` row (after the module roles td at line 111):

```typescript
                  <td className="px-4 py-3">
                    {piByUserId[member.id] ? (
                      <PIProfileBadge
                        piProfile={piByUserId[member.id].piProfile}
                        metaArchetype={piByUserId[member.id].metaArchetype}
                      />
                    ) : (
                      <span className="text-[10px] text-text-muted">Not assessed</span>
                    )}
                  </td>
```

**Step 2: Verify build passes**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No type errors

**Step 3: Verify it renders**

Run: `cd /home/user/airlock-app && pnpm build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add apps/web/src/components/organisms/MembersTable.tsx
git commit -m "feat(web): show PI profile badges in admin members table"
```

---

## Task 11: Final Verification and Push

**Step 1: Run all backend tests**

Run: `cd apps/api && python -m pytest tests/ -v`
Expected: All tests pass (existing + new PI tests)

**Step 2: Run frontend type check**

Run: `cd /home/user/airlock-app && pnpm type-check`
Expected: No errors

**Step 3: Run lint**

Run: `cd /home/user/airlock-app && pnpm lint`
Expected: No errors (or only pre-existing warnings)

**Step 4: Push**

```bash
git push -u origin claude/review-demo-readiness-plan-Tt4Ai
```

---

## Summary

| Task | What                          | Files                                  | Tests |
| ---- | ----------------------------- | -------------------------------------- | ----- |
| 1    | PI constants + scoring matrix | `services/pi_constants.py`             | 10    |
| 2    | UX preferences per profile    | `services/pi_ux_preferences.py`        | 9     |
| 3    | PIAssessment ORM model        | `models/pi_assessment.py`              | 4     |
| 4    | Alembic migration 004         | `migrations/versions/004_*.py`         | —     |
| 5    | PI assessment service (CRUD)  | `services/pi_assessment.py`            | 5     |
| 6    | Pydantic schemas              | `schemas/pi_assessment.py`             | 5     |
| 7    | API routes + register         | `routes/pi_assessments.py` + `main.py` | 3     |
| 8    | Frontend types + mock data    | `mock-admin.ts`                        | —     |
| 9    | PIProfileBadge component      | `atoms/PIProfileBadge.tsx`             | —     |
| 10   | Badge in MembersTable         | `organisms/MembersTable.tsx`           | —     |
| 11   | Verification + push           | —                                      | —     |

**Total new tests:** 36
**Total new files:** 8
**Total modified files:** 3
