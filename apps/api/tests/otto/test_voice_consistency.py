"""Voice consistency tests for Otto — WS6.5.

Covers:
- Anti-sycophancy guard (6.3): pattern detection and response cleaning
- Channel-aware voice mode (6.2): Work vs DM injection in prompts
- Persona voice traits (6.4): trait injection across all 17 profiles
- Voice baseline presence: every prompt includes the baseline
"""

import pytest

from src.otto.agent import (
    OTTO_VOICE_BASELINE,
    PERSONA_VOICE_TRAITS,
    VOICE_MODE_DM,
    VOICE_MODE_WORK,
    get_voice_mode,
)
from src.otto.deps import OttoState
from src.otto.graph.prompts import (
    build_conductor_prompt,
    build_general_prompt,
    build_recipe_prompt,
    build_vault_prompt,
)
from src.otto.voice_guard import (
    SYCOPHANCY_PATTERNS,
    check_sycophancy,
    clean_response,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_state(**overrides) -> OttoState:
    defaults = dict(
        user_id="usr_01",
        workspace_id="ws_01",
        org_role="member",
        module_roles={},
        surface="task_runner",
        session_id="ots_01",
        messages=[],
    )
    defaults.update(overrides)
    return OttoState(**defaults)


ALL_PROMPT_BUILDERS = [
    build_recipe_prompt,
    build_vault_prompt,
    build_general_prompt,
    build_conductor_prompt,
]


# ---------------------------------------------------------------------------
# 6.3: Anti-sycophancy guard
# ---------------------------------------------------------------------------


class TestAntiSycophancy:
    """Verify that sycophantic patterns are detected and stripped."""

    @pytest.mark.parametrize(
        "text,expected_label",
        [
            ("Great question! Let me explain.", "Great question!"),
            ("I'd be happy to help with that.", "I'd be happy to help"),
            ("Absolutely! Here's what I found.", "Absolutely!"),
            ("That's a fantastic idea, let's do it.", "That's a great idea/point"),
            ("I apologize for the confusion.", "I apologize for the confusion"),
            ("Certainly! I can do that.", "Certainly!"),
            ("That's really interesting point.", "That's really interesting"),
            ("Good question, here's the answer.", "Good question!"),
            ("Of course! Right away.", "Of course!"),
        ],
    )
    def test_detects_sycophantic_pattern(self, text: str, expected_label: str):
        violations = check_sycophancy(text)
        assert expected_label in violations, f"Expected '{expected_label}' in {violations}"

    def test_clean_text_has_no_violations(self):
        clean = "Three fields failed validation. The health score dropped to 72%."
        assert check_sycophancy(clean) == []

    def test_detects_enthusiasm_exclamation(self):
        assert "Enthusiasm exclamation" in check_sycophancy("Wow! That's a big change.")
        assert "Enthusiasm exclamation" in check_sycophancy("Amazing! Let me check.")
        assert "Enthusiasm exclamation" in check_sycophancy("Perfect! Done.")

    def test_clean_response_strips_patterns(self):
        dirty = "Great question! The vault health is 85%. Absolutely! Let me check."
        cleaned = clean_response(dirty)
        assert "Great question" not in cleaned
        assert "Absolutely" not in cleaned
        assert "85%" in cleaned  # data preserved

    def test_clean_response_preserves_substance(self):
        text = "Three fields failed. Gate is red. Risk level: high."
        assert clean_response(text) == text

    def test_clean_response_collapses_whitespace(self):
        dirty = "I'd be happy to help with the analysis."
        cleaned = clean_response(dirty)
        assert "  " not in cleaned  # no double spaces
        assert cleaned  # not empty

    def test_minimum_sycophancy_pattern_count(self):
        """Ensure we have meaningful coverage — at least 10 distinct patterns."""
        assert len(SYCOPHANCY_PATTERNS) >= 10

    def test_case_insensitive(self):
        assert check_sycophancy("GREAT QUESTION!") != []
        assert check_sycophancy("i'd be Happy To Help") != []

    def test_otto_voice_baseline_bans_sycophancy(self):
        """Voice baseline itself contains anti-sycophancy rules."""
        assert "Great question" in OTTO_VOICE_BASELINE
        assert "happy to help" in OTTO_VOICE_BASELINE

    def test_clean_response_preserves_mid_sentence_phrases(self):
        """Phrases like 'to be honest' mid-sentence must not be corrupted."""
        text = "To be honest is a value the team stated in their operating principles."
        cleaned = clean_response(text)
        # Mid-sentence "to be honest" should survive since it's part of content
        assert "operating principles" in cleaned

    def test_clean_response_preserves_newlines(self):
        """Enthusiasm bang cleanup must not merge lines."""
        text = "Context line.\nAmazing! Let me check.\nNext line."
        cleaned = clean_response(text)
        assert "Context line." in cleaned
        assert "Next line." in cleaned


# ---------------------------------------------------------------------------
# 6.2: Channel-aware voice mode
# ---------------------------------------------------------------------------


class TestChannelAwareVoice:
    """Verify Work vs DM mode injection."""

    def test_task_runner_gets_work_mode(self):
        assert get_voice_mode("task_runner") == VOICE_MODE_WORK

    def test_context_menu_gets_work_mode(self):
        assert get_voice_mode("context_menu") == VOICE_MODE_WORK

    def test_messenger_gets_dm_mode(self):
        assert get_voice_mode("messenger") == VOICE_MODE_DM

    def test_unknown_surface_defaults_to_dm(self):
        assert get_voice_mode("unknown") == VOICE_MODE_DM

    def test_work_mode_mentions_persona_switching(self):
        assert "persona" in VOICE_MODE_WORK.lower() or "Persona" in VOICE_MODE_WORK

    def test_dm_mode_mentions_single_voice(self):
        assert "one consistent voice" in VOICE_MODE_DM.lower()

    @pytest.mark.parametrize("builder", ALL_PROMPT_BUILDERS)
    def test_task_runner_prompts_include_work_mode(self, builder):
        state = _make_state(
            surface="task_runner",
            archetype="analyst",
            vault_id="vlt_01",
            chamber="review",
            module="contracts",
            active_recipe_id="rcp_01",
            current_node_index=0,
            total_recipe_nodes=3,
            current_node={"type": "review", "config": {}, "gate_conditions": []},
        )
        prompt = builder(state)
        assert "Work Mode" in prompt

    @pytest.mark.parametrize("builder", ALL_PROMPT_BUILDERS)
    def test_messenger_prompts_include_dm_mode(self, builder):
        state = _make_state(
            surface="messenger",
            archetype="analyst",
            vault_id="vlt_01",
            chamber="review",
            module="contracts",
            active_recipe_id="rcp_01",
            current_node_index=0,
            total_recipe_nodes=3,
            current_node={"type": "review", "config": {}, "gate_conditions": []},
        )
        prompt = builder(state)
        assert "DM Mode" in prompt


# ---------------------------------------------------------------------------
# 6.4: Persona voice traits
# ---------------------------------------------------------------------------


class TestPersonaVoiceTraits:
    """Verify all 17 profiles have voice traits and they're injected."""

    EXPECTED_PROFILES = [
        "scholar",
        "maverick",
        "analyzer",
        "guardian",
        "captain",
        "venturer",
        "controller",
        "strategist",
        "artisan",
        "specialist",
        "collaborator",
        "adapter",
        "altruist",
        "promoter",
        "persuader",
        "operator",
        "individualist",
    ]

    def test_all_17_profiles_have_traits(self):
        for profile in self.EXPECTED_PROFILES:
            assert profile in PERSONA_VOICE_TRAITS, f"Missing voice trait for {profile}"
        assert len(PERSONA_VOICE_TRAITS) == 17

    @pytest.mark.parametrize("profile", EXPECTED_PROFILES)
    def test_trait_is_nonempty(self, profile: str):
        trait = PERSONA_VOICE_TRAITS[profile]
        assert isinstance(trait, str)
        assert len(trait) > 10, f"Trait for {profile} is too short"

    def test_vault_prompt_includes_archetype_modulation(self):
        state = _make_state(
            vault_id="vlt_01", chamber="review", module="contracts", archetype="guardian"
        )
        prompt = build_vault_prompt(state)
        assert "Voice modulation" in prompt
        assert "guardian" in prompt.lower()

    def test_recipe_prompt_includes_archetype_modulation(self):
        state = _make_state(
            archetype="scholar",
            active_recipe_id="rcp_01",
            current_node_index=0,
            total_recipe_nodes=5,
            current_node={"type": "review", "config": {}, "gate_conditions": []},
        )
        prompt = build_recipe_prompt(state)
        assert "Voice modulation" in prompt
        assert "scholar" in prompt.lower()

    def test_no_modulation_when_archetype_missing(self):
        state = _make_state(vault_id="vlt_01", chamber="review", module="contracts")
        prompt = build_vault_prompt(state)
        assert "Voice modulation" not in prompt


# ---------------------------------------------------------------------------
# Voice baseline presence
# ---------------------------------------------------------------------------


class TestVoiceBaseline:
    """Every prompt must include the Otto voice baseline."""

    @pytest.mark.parametrize("builder", ALL_PROMPT_BUILDERS)
    def test_all_prompts_include_baseline(self, builder):
        state = _make_state(
            archetype="analyst",
            vault_id="vlt_01",
            chamber="review",
            module="contracts",
            active_recipe_id="rcp_01",
            current_node_index=0,
            total_recipe_nodes=3,
            current_node={"type": "review", "config": {}, "gate_conditions": []},
        )
        prompt = builder(state)
        # Check key voice rules are present
        assert "Otto" in prompt
        assert "Front-load information" in prompt
        assert "Great question" in prompt  # anti-sycophancy rule in baseline

    def test_baseline_contains_identity(self):
        assert "otter" in OTTO_VOICE_BASELINE.lower()
        assert "constellation" in OTTO_VOICE_BASELINE.lower()

    def test_baseline_contains_data_rule(self):
        assert "real data" in OTTO_VOICE_BASELINE.lower()

    def test_baseline_contains_question_rule(self):
        assert "one question at a time" in OTTO_VOICE_BASELINE.lower()
