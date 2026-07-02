"""Tests for ConstellationBench scoring engine."""

from src.benchmarks.models import DECFProfile, Perspective
from src.benchmarks.scorer import Scorer


def test_json_compliance_score():
    """Valid JSON responses score 1.0, invalid score 0.0."""
    scorer = Scorer()
    valid = Perspective(
        persona="scholar",
        position="test",
        conviction=7.5,
        concerns=["a"],
        opportunities=["b"],
        recommends_action=True,
        json_valid=True,
    )
    invalid = Perspective(
        persona="scholar",
        position="test",
        conviction=5.0,
        concerns=[],
        opportunities=[],
        recommends_action=False,
        json_valid=False,
    )
    assert scorer.score_json_compliance(valid) == 1.0
    assert scorer.score_json_compliance(invalid) == 0.0


def test_persona_adherence_high_dominance():
    """High-D persona should have assertive, action-oriented language."""
    scorer = Scorer()
    profile = DECFProfile("venturer", dominance=10, extraversion=3, patience=1, formality=3)
    assertive = Perspective(
        persona="venturer",
        position="We must act immediately. Ship it now. No time for debate.",
        conviction=9.5,
        concerns=["delay"],
        opportunities=["first mover"],
        recommends_action=True,
        json_valid=True,
    )
    score = scorer.score_persona_adherence(assertive, profile)
    assert score > 0.5


def test_deliberation_diversity():
    """Perspectives from different personas should diverge."""
    scorer = Scorer()
    perspectives = [
        Perspective(
            "scholar",
            "We need thorough research first.",
            6.0,
            ["gaps"],
            ["study"],
            False,
            json_valid=True,
        ),
        Perspective(
            "venturer",
            "Ship it now, iterate later.",
            9.5,
            ["delay"],
            ["speed"],
            True,
            json_valid=True,
        ),
        Perspective(
            "guardian",
            "Too risky without security review.",
            3.0,
            ["risk"],
            ["audit"],
            False,
            json_valid=True,
        ),
    ]
    diversity = scorer.score_deliberation_diversity(perspectives)
    assert diversity > 0.5
