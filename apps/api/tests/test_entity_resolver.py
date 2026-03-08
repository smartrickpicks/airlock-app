"""Tests for entity resolver service — vault-hierarchy matching."""

import pytest

from src.services.entity_resolver import (
    compute_match_confidence,
    match_against_vaults,
    resolve_parties,
)


class TestComputeMatchConfidence:
    """Unit tests for fuzzy string matching confidence."""

    def test_exact_match_returns_1(self):
        assert compute_match_confidence("Acme Records", "Acme Records") == 1.0

    def test_case_insensitive_match(self):
        assert compute_match_confidence("acme records", "Acme Records") == 1.0

    def test_close_fuzzy_match(self):
        conf = compute_match_confidence("Acme Record", "Acme Records")
        assert 0.85 <= conf <= 0.99

    def test_no_match(self):
        conf = compute_match_confidence("Totally Different", "Acme Records")
        assert conf < 0.40

    def test_empty_strings(self):
        assert compute_match_confidence("", "") == 0.0
        assert compute_match_confidence("Acme", "") == 0.0


class TestMatchAgainstVaults:
    """Tests for matching an extracted name against a list of vault dicts."""

    @pytest.fixture()
    def self_vaults(self):
        return [
            {"id": "V1", "name": "Capitol Music Group", "vault_type": "entity", "vault_level": 1},
            {"id": "V2", "name": "CMG Nashville", "vault_type": "division", "vault_level": 2},
        ]

    @pytest.fixture()
    def counterparty_vaults(self):
        return [
            {
                "id": "V3",
                "name": "Summit Publishing",
                "vault_type": "counterparty",
                "vault_level": 3,
            },
            {
                "id": "V4",
                "name": "Henderson Entertainment",
                "vault_type": "counterparty",
                "vault_level": 3,
            },
        ]

    def test_exact_self_match(self, self_vaults):
        result = match_against_vaults("Capitol Music Group", self_vaults)
        assert result is not None
        assert result.vault_id == "V1"
        assert result.confidence == 1.0
        assert result.match_type == "exact"

    def test_fuzzy_self_match(self, self_vaults):
        result = match_against_vaults("Capitol Music Grp", self_vaults)
        assert result is not None
        assert result.vault_id == "V1"
        assert result.confidence >= 0.80
        assert result.match_type == "fuzzy"

    def test_no_match_returns_none(self, self_vaults):
        result = match_against_vaults("Totally Unknown Corp", self_vaults)
        assert result is None

    def test_counterparty_match(self, counterparty_vaults):
        result = match_against_vaults("Summit Publishing", counterparty_vaults)
        assert result is not None
        assert result.vault_id == "V3"
        assert result.confidence == 1.0

    def test_alias_match(self):
        """Aliases in vault metadata should be checked for matches."""
        vaults = [
            {
                "id": "V1",
                "name": "Capitol Music Group",
                "vault_type": "entity",
                "vault_level": 1,
                "aliases": ["CMG", "Capitol"],
            },
        ]
        result = match_against_vaults("CMG", vaults)
        assert result is not None
        assert result.vault_id == "V1"
        assert result.confidence == 1.0
        assert result.vault_name == "Capitol Music Group"

    def test_empty_vault_list(self):
        result = match_against_vaults("Anything", [])
        assert result is None


class TestResolveParties:
    """Integration test for the full 2-pass resolution flow."""

    @pytest.fixture()
    def workspace_vaults(self):
        return {
            "self": [
                {
                    "id": "V1",
                    "name": "Capitol Music Group",
                    "vault_type": "entity",
                    "vault_level": 1,
                },
            ],
            "counterparties": [
                {
                    "id": "V3",
                    "name": "Summit Publishing",
                    "vault_type": "counterparty",
                    "vault_level": 3,
                },
            ],
        }

    def test_both_parties_resolved(self, workspace_vaults):
        result = resolve_parties(
            party_a="Capitol Music Group",
            party_b="Summit Publishing",
            self_vaults=workspace_vaults["self"],
            counterparty_vaults=workspace_vaults["counterparties"],
        )
        assert result["legal_entity"]["match_status"] == "resolved"
        assert result["legal_entity"]["confidence"] == 1.0
        assert result["counterparty"]["match_status"] == "resolved"
        assert result["counterparty"]["confidence"] == 1.0
        assert result["requires_manual_confirmation"] is False

    def test_self_resolved_counterparty_unknown(self, workspace_vaults):
        result = resolve_parties(
            party_a="Capitol Music Group",
            party_b="Unknown New Artist LLC",
            self_vaults=workspace_vaults["self"],
            counterparty_vaults=workspace_vaults["counterparties"],
        )
        assert result["legal_entity"]["match_status"] == "resolved"
        assert result["counterparty"]["match_status"] == "unresolved"
        assert result["new_entry_detected"] is True
        assert result["requires_manual_confirmation"] is True

    def test_neither_resolved(self, workspace_vaults):
        result = resolve_parties(
            party_a="Unknown Corp A",
            party_b="Unknown Corp B",
            self_vaults=workspace_vaults["self"],
            counterparty_vaults=workspace_vaults["counterparties"],
        )
        assert result["legal_entity"]["match_status"] == "unresolved"
        assert result["legal_entity"]["name"] == "Unknown Corp A"
        assert result["counterparty"]["match_status"] == "unresolved"
        assert result["counterparty"]["name"] == "Unknown Corp B"
        assert result["requires_manual_confirmation"] is True

    def test_swapped_parties_still_resolve(self, workspace_vaults):
        """If party_a is actually a counterparty and party_b is self, resolver swaps them."""
        result = resolve_parties(
            party_a="Summit Publishing",
            party_b="Capitol Music Group",
            self_vaults=workspace_vaults["self"],
            counterparty_vaults=workspace_vaults["counterparties"],
        )
        assert result["legal_entity"]["match_status"] == "resolved"
        assert result["legal_entity"]["name"] == "Capitol Music Group"
        assert result["counterparty"]["match_status"] == "resolved"
        assert result["counterparty"]["name"] == "Summit Publishing"

    def test_no_parties_extracted(self, workspace_vaults):
        result = resolve_parties(
            party_a=None,
            party_b=None,
            self_vaults=workspace_vaults["self"],
            counterparty_vaults=workspace_vaults["counterparties"],
        )
        assert result["legal_entity"]["match_status"] == "unresolved"
        assert result["counterparty"]["match_status"] == "unresolved"
