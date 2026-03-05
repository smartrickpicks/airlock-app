"""Unit tests for vault service — logic tests that don't need a database."""

from src.services.vault import (
    CHAMBER_ORDER,
    GATES_BY_CHAMBER,
    VALID_CHAMBERS,
    VALID_VAULT_TYPES,
    slugify,
)


def test_slugify_basic():
    assert slugify("Henderson MSA") == "henderson-msa"


def test_slugify_special_chars():
    assert slugify("Sony-BigBooty Dist. Agreement (2026)") == "sony-bigbooty-dist-agreement-2026"


def test_slugify_extra_spaces():
    assert slugify("  lots   of   spaces  ") == "lots-of-spaces"


def test_valid_chambers_order():
    assert VALID_CHAMBERS == ("discover", "build", "review", "ship")


def test_chamber_order_indices():
    assert CHAMBER_ORDER["discover"] == 0
    assert CHAMBER_ORDER["ship"] == 3


def test_gates_exist_for_all_chambers():
    for chamber in VALID_CHAMBERS:
        assert chamber in GATES_BY_CHAMBER
        assert len(GATES_BY_CHAMBER[chamber]) > 0


def test_valid_vault_types():
    assert "contract" in VALID_VAULT_TYPES
    assert "entity" in VALID_VAULT_TYPES
