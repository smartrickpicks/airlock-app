"""Unit tests for the Action Resolver — scores catalog entries and picks top 3."""

from pathlib import Path

import pytest

from src.services.action_resolver import ActionResolver

CATALOG_PATH = Path(
    "/Users/zacharyholwerda/Desktop/Airlock/repos/airlock-persona/actions/catalog.yaml"
)


@pytest.fixture
def resolver() -> ActionResolver:
    return ActionResolver(catalog_path=CATALOG_PATH)


@pytest.fixture
def driver_signals() -> dict:
    return {
        "meta_archetype": "driver",
        "role": "VP of Sales",
        "industry": "SaaS",
        "company_size": "50-200",
        "seniority": "executive",
        "goals": ["close_deals", "grow_revenue"],
    }


@pytest.fixture
def enforcer_signals() -> dict:
    return {
        "meta_archetype": "enforcer",
        "role": "Operations Manager",
        "industry": "Healthcare",
        "company_size": "200-1000",
        "seniority": "manager",
        "goals": ["optimize_ops", "compliance"],
    }


@pytest.fixture
def interpreter_signals() -> dict:
    return {
        "meta_archetype": "interpreter",
        "role": "HR Director",
        "industry": "Education",
        "company_size": "50-200",
        "seniority": "director",
        "goals": ["build_team", "manage_people"],
    }


class TestActionResolverLoading:
    def test_loads_catalog(self, resolver: ActionResolver):
        assert len(resolver.actions) == 15

    def test_loads_hooks(self, resolver: ActionResolver):
        assert "driver" in resolver.hooks
        assert "enforcer" in resolver.hooks
        assert "interpreter" in resolver.hooks


class TestActionResolverScoring:
    def test_returns_three_actions(self, resolver: ActionResolver, driver_signals: dict):
        result = resolver.resolve(driver_signals)
        assert len(result.actions) == 3

    def test_driver_gets_driver_actions(self, resolver: ActionResolver, driver_signals: dict):
        result = resolver.resolve(driver_signals)
        action_ids = [a.id for a in result.actions]
        driver_ids = {
            "cold_outbound_sequence",
            "execution_plan_90day",
            "competitive_landscape",
            "deal_qualification",
            "hiring_scorecard",
        }
        overlap = set(action_ids) & driver_ids
        assert len(overlap) >= 2

    def test_enforcer_gets_enforcer_actions(self, resolver: ActionResolver, enforcer_signals: dict):
        result = resolver.resolve(enforcer_signals)
        action_ids = [a.id for a in result.actions]
        enforcer_ids = {
            "workflow_bottleneck_audit",
            "compliance_checklist",
            "risk_assessment",
            "process_documentation",
            "vendor_evaluation",
        }
        overlap = set(action_ids) & enforcer_ids
        assert len(overlap) >= 2

    def test_interpreter_gets_interpreter_actions(
        self, resolver: ActionResolver, interpreter_signals: dict
    ):
        result = resolver.resolve(interpreter_signals)
        action_ids = [a.id for a in result.actions]
        interpreter_ids = {
            "team_communication_map",
            "stakeholder_alignment",
            "feedback_collection",
            "meeting_rhythm",
            "onboarding_experience",
        }
        overlap = set(action_ids) & interpreter_ids
        assert len(overlap) >= 2


class TestActionResolverPersonalization:
    def test_title_is_personalized(self, resolver: ActionResolver, driver_signals: dict):
        result = resolver.resolve(driver_signals)
        titles = [a.title for a in result.actions]
        has_personalized = any("SaaS" in t for t in titles)
        assert has_personalized

    def test_description_is_personalized(self, resolver: ActionResolver, driver_signals: dict):
        result = resolver.resolve(driver_signals)
        descriptions = [a.description for a in result.actions]
        has_personalized = any("SaaS" in d or "VP of Sales" in d for d in descriptions)
        assert has_personalized

    def test_output_type_is_set(self, resolver: ActionResolver, driver_signals: dict):
        result = resolver.resolve(driver_signals)
        for action in result.actions:
            assert action.output_type in ("artifact", "playbook")

    def test_instant_vs_guided_tag(self, resolver: ActionResolver, driver_signals: dict):
        result = resolver.resolve(driver_signals)
        for action in result.actions:
            assert action.tag in ("Instant", "Guided")


class TestActionResolverHookText:
    def test_driver_hook(self, resolver: ActionResolver, driver_signals: dict):
        result = resolver.resolve(driver_signals)
        assert "three moves" in result.hook_text

    def test_enforcer_hook(self, resolver: ActionResolver, enforcer_signals: dict):
        result = resolver.resolve(enforcer_signals)
        assert "ran the numbers" in result.hook_text

    def test_interpreter_hook(self, resolver: ActionResolver, interpreter_signals: dict):
        result = resolver.resolve(interpreter_signals)
        assert "Three things" in result.hook_text

    def test_escape_text_present(self, resolver: ActionResolver, driver_signals: dict):
        result = resolver.resolve(driver_signals)
        assert "not going anywhere" in result.escape_text
