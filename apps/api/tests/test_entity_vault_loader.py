"""Tests for entity vault loader — loads self/counterparty vaults from DB."""

from src.services.entity_vault_loader import vault_to_match_dict


class TestVaultToMatchDict:
    """Unit test for vault-to-dict conversion (no DB needed)."""

    def test_converts_vault_attrs(self):
        class FakeVault:
            id = "V1"
            name = "Acme Records"
            vault_type = "entity"
            vault_level = 1
            metadata_ = {"aliases": ["Acme", "Acme Recs"]}

        result = vault_to_match_dict(FakeVault())
        assert result["id"] == "V1"
        assert result["name"] == "Acme Records"
        assert result["vault_type"] == "entity"
        assert result["vault_level"] == 1
        assert result["aliases"] == ["Acme", "Acme Recs"]

    def test_missing_aliases_returns_empty(self):
        class FakeVault:
            id = "V2"
            name = "Test"
            vault_type = "entity"
            vault_level = 1
            metadata_ = {}

        result = vault_to_match_dict(FakeVault())
        assert result["aliases"] == []
