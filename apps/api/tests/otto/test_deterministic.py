"""Tests for deterministic intent resolver — Tier 0 execution."""

from src.otto.deterministic import DeterministicResult, fuzzy_match_intent


def test_gate_status_match():
    match, confidence = fuzzy_match_intent("what's the gate status?")
    assert match is not None
    assert match == "gate_status"
    assert confidence >= 0.85


def test_recipe_progress_match():
    match, confidence = fuzzy_match_intent("where am I in the recipe?")
    assert match is not None
    assert match == "recipe_progress"


def test_node_advance_match():
    match, confidence = fuzzy_match_intent("I'm done, next step")
    assert match is not None
    assert match == "node_advance"


def test_ambiguous_no_match():
    match, confidence = fuzzy_match_intent("why is the health score dropping?")
    assert match is None or confidence < 0.85


def test_field_progress_match():
    match, confidence = fuzzy_match_intent("how many fields are complete?")
    assert match is not None
    assert match == "field_progress"


def test_deterministic_result_dataclass():
    result = DeterministicResult(intent="gate_status", text="Gate: GREEN")
    assert result.intent == "gate_status"
    assert result.advanced is False
    assert result.metadata is None
