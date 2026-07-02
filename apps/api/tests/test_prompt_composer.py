"""Tests for the MAGS Prompt Composer.

Covers:
- Fragment loading (base, archetype, module, chamber)
- Archetype resolution (profile → meta → fallback)
- Prompt composition (full assembly, section ordering)
- User profile injection (drives, interaction mode, autonomy)
- Vault context injection
- Edge cases (unknown values, missing profile, empty context)
- Route endpoints
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.services.mags.prompt_composer import (
    INTERACTION_MODE_GUIDANCE,
    META_ARCHETYPE_DEFAULTS,
    PROFILE_ARCHETYPE_MAP,
    VALID_ARCHETYPES,
    VALID_CHAMBERS,
    VALID_MODULES,
    clear_fragment_cache,
    compose_prompt,
    compose_prompt_for_user,
    load_archetype,
    load_base,
    load_chamber,
    load_module,
    resolve_archetype,
)

# Removed compose_prompt_for_user import from route (no longer used directly)


@pytest.fixture(autouse=True)
def _clear_cache():
    """Clear fragment cache before each test."""
    clear_fragment_cache()
    yield
    clear_fragment_cache()


# ---------------------------------------------------------------------------
# Fragment Loading
# ---------------------------------------------------------------------------


class TestFragmentLoading:
    """Tests for loading individual prompt fragments."""

    def test_load_base(self):
        base = load_base()
        assert len(base) > 100
        assert "Otto" in base
        assert "Airlock" in base

    @pytest.mark.parametrize("archetype", sorted(VALID_ARCHETYPES))
    def test_load_all_archetypes(self, archetype: str):
        fragment = load_archetype(archetype)
        assert len(fragment) > 50
        assert archetype.title() in fragment or f"Archetype: {archetype.title()}" in fragment

    @pytest.mark.parametrize("module", sorted(VALID_MODULES))
    def test_load_all_modules(self, module: str):
        fragment = load_module(module)
        assert len(fragment) > 50
        assert "Module Context" in fragment

    @pytest.mark.parametrize("chamber", sorted(VALID_CHAMBERS))
    def test_load_all_chambers(self, chamber: str):
        fragment = load_chamber(chamber)
        assert len(fragment) > 50
        assert "Chamber Context" in fragment or "chamber" in fragment.lower()

    def test_load_unknown_archetype_falls_back_to_executor(self):
        fragment = load_archetype("nonexistent_archetype")
        assert "Executor" in fragment

    def test_load_unknown_module_returns_empty(self):
        fragment = load_module("nonexistent_module")
        assert fragment == ""

    def test_load_unknown_chamber_returns_empty(self):
        fragment = load_chamber("nonexistent_chamber")
        assert fragment == ""


# ---------------------------------------------------------------------------
# Archetype Resolution
# ---------------------------------------------------------------------------


class TestArchetypeResolution:
    """Tests for resolving Otto archetype from profile data."""

    def test_explicit_archetype_takes_priority(self):
        result = resolve_archetype(
            pi_profile="captain",
            meta_archetype="driver",
            explicit_archetype="analyst",
        )
        assert result == "analyst"

    def test_pi_profile_maps_correctly(self):
        for profile, expected in PROFILE_ARCHETYPE_MAP.items():
            result = resolve_archetype(pi_profile=profile)
            assert result == expected, (
                f"Profile '{profile}' should map to '{expected}', got '{result}'"
            )

    def test_meta_archetype_maps_correctly(self):
        for meta, expected in META_ARCHETYPE_DEFAULTS.items():
            result = resolve_archetype(meta_archetype=meta)
            assert result == expected

    def test_fallback_to_executor(self):
        result = resolve_archetype()
        assert result == "executor"

    def test_unknown_pi_profile_falls_through_to_meta(self):
        result = resolve_archetype(
            pi_profile="nonexistent_profile",
            meta_archetype="enforcer",
        )
        assert result == "guardian"

    def test_unknown_everything_falls_to_executor(self):
        result = resolve_archetype(
            pi_profile="nonexistent",
            meta_archetype="nonexistent",
            explicit_archetype="nonexistent",
        )
        assert result == "executor"

    def test_case_insensitive(self):
        assert resolve_archetype(explicit_archetype="ANALYST") == "analyst"
        assert resolve_archetype(pi_profile="CAPTAIN") == "executor"
        assert resolve_archetype(meta_archetype="DRIVER") == "executor"


# ---------------------------------------------------------------------------
# Prompt Composition
# ---------------------------------------------------------------------------


class TestPromptComposition:
    """Tests for assembling full prompts from fragments."""

    def test_basic_composition(self):
        prompt = compose_prompt(
            archetype="executor",
            module="contracts",
            chamber="discover",
        )
        assert "Otto" in prompt  # Base
        assert "Executor" in prompt  # Archetype
        assert "Contracts" in prompt  # Module
        assert "Discover" in prompt  # Chamber

    def test_all_sections_separated_by_divider(self):
        prompt = compose_prompt(
            archetype="analyst",
            module="crm",
            chamber="review",
        )
        sections = prompt.split("\n\n---\n\n")
        # Should have base + archetype + module + chamber = 4 sections
        assert len(sections) >= 4

    def test_prompt_varies_by_archetype(self):
        executor_prompt = compose_prompt(
            archetype="executor", module="contracts", chamber="discover"
        )
        guardian_prompt = compose_prompt(
            archetype="guardian", module="contracts", chamber="discover"
        )
        assert executor_prompt != guardian_prompt
        assert "action" in executor_prompt.lower() or "Action" in executor_prompt
        assert "risk" in guardian_prompt.lower() or "Risk" in guardian_prompt

    def test_prompt_varies_by_module(self):
        contracts_prompt = compose_prompt(
            archetype="executor", module="contracts", chamber="discover"
        )
        crm_prompt = compose_prompt(archetype="executor", module="crm", chamber="discover")
        assert contracts_prompt != crm_prompt

    def test_prompt_varies_by_chamber(self):
        discover_prompt = compose_prompt(
            archetype="executor", module="contracts", chamber="discover"
        )
        ship_prompt = compose_prompt(archetype="executor", module="contracts", chamber="ship")
        assert discover_prompt != ship_prompt

    def test_composition_with_user_profile(self):
        profile = {
            "pi_profile": "captain",
            "meta_archetype": "driver",
            "drives": {"dominance": 9, "extraversion": 8, "patience": 3, "formality": 2},
            "confidence": 0.85,
            "mags_config": {
                "archetype": "executor",
                "interaction_mode": "draft_then_review",
                "autonomy_ceiling": 0.75,
            },
        }
        prompt = compose_prompt(
            user_profile=profile,
            archetype="executor",
            module="contracts",
            chamber="build",
        )
        assert "Captain" in prompt
        assert "Driver" in prompt
        assert "D=9" in prompt
        assert "85%" in prompt
        assert "draft_then_review" in prompt
        assert "75%" in prompt

    def test_composition_with_vault_context(self):
        vault_ctx = {
            "vault_id": "01ARZ3NDEK...",
            "gate_color": "yellow",
            "health_score": 0.72,
            "pass_count": 15,
            "fail_count": 3,
            "review_count": 5,
            "open_patches": 2,
        }
        prompt = compose_prompt(
            archetype="guardian",
            module="contracts",
            chamber="review",
            vault_context=vault_ctx,
        )
        assert "01ARZ3NDEK" in prompt
        assert "YELLOW" in prompt
        assert "72%" in prompt
        assert "15 pass" in prompt
        assert "3 fail" in prompt
        assert "Open Patches: 2" in prompt

    def test_composition_without_optional_fields(self):
        """Compose with minimum params — should not crash."""
        prompt = compose_prompt()
        assert "Otto" in prompt
        assert len(prompt) > 200

    def test_interaction_mode_guidance_included(self):
        profile = {
            "pi_profile": "guardian",
            "mags_config": {
                "interaction_mode": "supervised",
                "autonomy_ceiling": 0.3,
            },
        }
        prompt = compose_prompt(
            user_profile=profile,
            archetype="guardian",
            module="contracts",
            chamber="review",
        )
        assert "approval" in prompt.lower() or "supervised" in prompt.lower()


# ---------------------------------------------------------------------------
# Auto-Resolve Composition
# ---------------------------------------------------------------------------


class TestAutoResolveComposition:
    """Tests for compose_prompt_for_user (auto-resolve archetype)."""

    def test_auto_resolves_from_pi_profile(self):
        profile = {"pi_profile": "maverick", "meta_archetype": "driver"}
        prompt = compose_prompt_for_user(
            user_profile=profile, module="contracts", chamber="discover"
        )
        assert "Strategist" in prompt  # Maverick → strategist

    def test_auto_resolves_from_meta_archetype(self):
        profile = {"meta_archetype": "enforcer"}
        prompt = compose_prompt_for_user(user_profile=profile, module="contracts", chamber="review")
        assert "Guardian" in prompt  # Enforcer → guardian

    def test_auto_resolves_with_explicit_override_in_mags_config(self):
        profile = {
            "pi_profile": "guardian",
            "mags_config": {"archetype": "analyst"},
        }
        prompt = compose_prompt_for_user(user_profile=profile, module="contracts", chamber="build")
        assert "Analyst" in prompt  # Explicit override wins

    def test_auto_resolves_fallback_without_profile(self):
        prompt = compose_prompt_for_user(user_profile=None, module="contracts", chamber="discover")
        assert "Executor" in prompt  # Fallback


# ---------------------------------------------------------------------------
# All 120 Combinations
# ---------------------------------------------------------------------------


class TestAllCombinations:
    """Verify all archetype × module × chamber combinations compose without error."""

    @pytest.mark.parametrize("archetype", sorted(VALID_ARCHETYPES))
    @pytest.mark.parametrize("module", sorted(VALID_MODULES))
    @pytest.mark.parametrize("chamber", sorted(VALID_CHAMBERS))
    def test_all_combinations(self, archetype: str, module: str, chamber: str):
        prompt = compose_prompt(archetype=archetype, module=module, chamber=chamber)
        assert len(prompt) > 200
        # Should have at least 4 sections (base + archetype + module + chamber)
        sections = prompt.split("\n\n---\n\n")
        assert len(sections) >= 4


# ---------------------------------------------------------------------------
# Interaction Mode Coverage
# ---------------------------------------------------------------------------


class TestInteractionModes:
    """Tests for all interaction mode guidance strings."""

    @pytest.mark.parametrize("mode", sorted(INTERACTION_MODE_GUIDANCE.keys()))
    def test_all_modes_have_guidance(self, mode: str):
        guidance = INTERACTION_MODE_GUIDANCE[mode]
        assert len(guidance) > 20


# ---------------------------------------------------------------------------
# Route Tests
# ---------------------------------------------------------------------------


class TestMAGSRoutes:
    """Tests for the MAGS API endpoints."""

    @pytest.fixture
    def client(self):
        with TestClient(app) as c:
            yield c

    def test_list_fragments(self, client: TestClient):
        resp = client.get("/api/v1/mags/prompts/fragments")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["archetypes"]) == 6
        assert len(data["modules"]) == 5
        assert len(data["chambers"]) == 4

    def test_preview_prompt_default(self, client: TestClient):
        resp = client.get("/api/v1/mags/prompts/preview")
        assert resp.status_code == 200
        data = resp.json()
        assert "Otto" in data["prompt"]
        assert data["archetype"] == "executor"
        assert data["char_count"] > 200

    def test_preview_prompt_with_params(self, client: TestClient):
        resp = client.get(
            "/api/v1/mags/prompts/preview",
            params={"archetype": "guardian", "module": "triage", "chamber": "ship"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "Guardian" in data["prompt"]
        assert "Triage" in data["prompt"]
        assert "Ship" in data["prompt"]

    def test_compose_prompt_endpoint(self, client: TestClient):
        resp = client.post(
            "/api/v1/mags/prompts/compose",
            json={
                "archetype": "analyst",
                "module": "contracts",
                "chamber": "review",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["archetype_used"] == "analyst"
        assert data["fragment_count"] >= 4
        assert "Analyst" in data["prompt"]

    def test_compose_prompt_with_profile(self, client: TestClient):
        resp = client.post(
            "/api/v1/mags/prompts/compose",
            json={
                "user_profile": {
                    "pi_profile": "maverick",
                    "meta_archetype": "driver",
                    "drives": {"dominance": 10, "extraversion": 8, "patience": 1, "formality": 1},
                    "confidence": 0.90,
                    "mags_config": {"interaction_mode": "autonomous", "autonomy_ceiling": 0.80},
                },
                "module": "contracts",
                "chamber": "discover",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["archetype_used"] == "strategist"  # Maverick → strategist
        assert "Maverick" in data["prompt"]
        assert data["fragment_count"] >= 5  # base + profile + archetype + module + chamber

    def test_resolve_archetype_endpoint(self, client: TestClient):
        resp = client.post(
            "/api/v1/mags/prompts/resolve-archetype",
            json={"pi_profile": "captain"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["archetype"] == "executor"
        assert data["source"] == "pi_profile"

    def test_resolve_archetype_fallback(self, client: TestClient):
        resp = client.post(
            "/api/v1/mags/prompts/resolve-archetype",
            json={},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["archetype"] == "executor"
        assert data["source"] == "fallback"
