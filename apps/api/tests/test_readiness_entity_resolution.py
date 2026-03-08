"""Tests for entity resolution integration in readiness module."""

from src.engines.preflight.readiness import (
    build_entity_resolution,
    build_resolution_story,
)


class TestBuildResolutionStoryWithResolver:
    """Tests that resolution story uses resolver when vault data is provided."""

    def test_resolved_self_and_counterparty(self):
        """When vault data is provided, resolver should produce real confidence scores."""
        self_vaults = [
            {"id": "V1", "name": "Capitol Music Group", "vault_type": "entity", "vault_level": 1},
        ]
        counterparty_vaults = [
            {
                "id": "V3",
                "name": "Summit Publishing",
                "vault_type": "counterparty",
                "vault_level": 3,
            },
        ]
        full_text = "This agreement is between Capitol Music Group and Summit Publishing."

        story = build_resolution_story(
            sf_match_results=[],
            full_text=full_text,
            self_vaults=self_vaults,
            counterparty_vaults=counterparty_vaults,
        )
        assert story["legal_entity_account"] is not None
        assert story["legal_entity_account"]["confidence"] >= 0.90
        assert story["legal_entity_account"]["match_status"] == "resolved"
        assert story["requires_manual_confirmation"] is False

    def test_fallback_without_vault_data(self):
        """Without vault data, falls back to regex extraction with review status."""
        full_text = "This agreement is between Party A Inc and Party B LLC."
        story = build_resolution_story(sf_match_results=[], full_text=full_text)
        assert story["legal_entity_account"] is not None
        assert story["legal_entity_account"]["match_status"] == "review"
        assert story["requires_manual_confirmation"] is True

    def test_no_parties_in_text(self):
        """When no parties are found, everything is unresolved."""
        story = build_resolution_story(sf_match_results=[], full_text="Short text.")
        assert story["legal_entity_account"] is None
        assert story["counterparties"] == []


class TestBuildEntityResolution:
    """Tests that entity_resolution checks reflect actual resolution."""

    def test_resolved_entity_produces_pass(self):
        story = {
            "legal_entity_account": {
                "name": "Capitol Music Group",
                "match_status": "resolved",
                "confidence": 1.0,
                "vault_id": "V1",
            },
            "counterparties": [
                {
                    "name": "Summit Publishing",
                    "match_status": "resolved",
                    "confidence": 1.0,
                    "vault_id": "V3",
                }
            ],
            "unresolved_counterparties": [],
            "new_entry_detected": False,
            "requires_manual_confirmation": False,
            "primary_counterparty": {
                "name": "Summit Publishing",
                "match_status": "resolved",
                "confidence": 1.0,
            },
        }
        result = build_entity_resolution(story, sf_match=[], full_text="")
        ent_check = next(c for c in result["checks"] if c["code"] == "ENT_LEGAL_ENTITY")
        assert ent_check["status"] == "pass"
        assert ent_check["confidence"] >= 0.90

        cp_check = next(c for c in result["checks"] if c["code"] == "ENT_COUNTERPARTY")
        assert cp_check["status"] == "pass"
        assert cp_check["confidence"] >= 0.90

    def test_unresolved_entity_produces_fail(self):
        story = {
            "legal_entity_account": {
                "name": "Unknown Corp",
                "match_status": "unresolved",
                "confidence": 0.0,
            },
            "counterparties": [],
            "unresolved_counterparties": ["Some Name"],
            "new_entry_detected": True,
            "requires_manual_confirmation": True,
        }
        result = build_entity_resolution(story, sf_match=[], full_text="")
        ent_check = next(c for c in result["checks"] if c["code"] == "ENT_LEGAL_ENTITY")
        assert ent_check["status"] == "fail"


class TestRunPreflightWithVaultContext:
    """Tests that run_preflight can accept workspace context for entity resolution."""

    def test_preflight_accepts_optional_vault_context(self):
        """run_preflight should accept self_vaults and counterparty_vaults kwargs."""
        from src.engines.preflight.engine import run_preflight

        pages_data = [
            {
                "page": 1,
                "text": "This agreement is between Acme Records and Summit Publishing...",
                "char_count": 200,
                "image_coverage_ratio": 0.0,
            }
        ]
        result = run_preflight(
            pages_data,
            self_vaults=[
                {"id": "V1", "name": "Acme Records", "vault_type": "entity", "vault_level": 1}
            ],
            counterparty_vaults=[
                {
                    "id": "V3",
                    "name": "Summit Publishing",
                    "vault_type": "counterparty",
                    "vault_level": 3,
                }
            ],
        )
        assert result["gate_color"] in ("RED", "YELLOW", "GREEN")
        er = result.get("entity_resolution", {})
        if er:
            ent_check = next(
                (c for c in er.get("checks", []) if c["code"] == "ENT_LEGAL_ENTITY"), None
            )
            if ent_check:
                assert ent_check["confidence"] > 0.5
