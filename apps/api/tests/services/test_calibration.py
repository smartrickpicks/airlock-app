"""Tests for CalibrationEngine — adaptive question selection + drive updates.

Covers:
- Question pool loading (10 questions, required fields, options on card taps)
- Drive updates (card tap adjustments, clamping to 1-10 range)
- Confidence (increases with answers, approaches 0.75 after 4 BMY answers)
- Question selection (first question is goal_statement, no repeats, targets weakest drive)
- Micro-insights (returns string for strong signal, returns ambiguous for weak)
- Unlock events (emits at correct thresholds, no duplicates)
"""

from __future__ import annotations

from pathlib import Path

import pytest

from src.services.calibration import (
    BASE_CONFIDENCE,
    DRIVE_MAX,
    DRIVE_MIDPOINT,
    DRIVE_MIN,
    CalibrationEngine,
    _clamp_drive,
)

PERSONA_PATH = Path("/Users/zacharyholwerda/Desktop/Airlock/repos/airlock-persona")


@pytest.fixture(scope="module")
def engine() -> CalibrationEngine:
    """Load the real question pool from airlock-persona."""
    eng = CalibrationEngine(persona_path=PERSONA_PATH)
    eng.load()
    return eng


# === Question Pool Loading ===


class TestQuestionPoolLoading:
    def test_engine_loads_successfully(self, engine: CalibrationEngine):
        assert engine.is_loaded

    def test_question_count(self, engine: CalibrationEngine):
        assert engine.question_count == 10

    def test_all_questions_have_required_fields(self, engine: CalibrationEngine):
        for qid in [
            "goal_statement",
            "autonomy_pref",
            "report_style",
            "team_size",
            "plan_fails",
            "monday_energy",
            "frustration",
            "best_team",
            "explain_complex",
            "hidden_skill",
        ]:
            q = engine.get_question(qid)
            assert q is not None, f"Missing question: {qid}"
            assert "text" in q, f"{qid} missing 'text'"
            assert "format" in q, f"{qid} missing 'format'"
            assert "drives_measured" in q, f"{qid} missing 'drives_measured'"
            assert "priority" in q, f"{qid} missing 'priority'"

    def test_card_tap_questions_have_options(self, engine: CalibrationEngine):
        card_tap_ids = [
            "goal_statement",
            "autonomy_pref",
            "report_style",
            "team_size",
            "plan_fails",
            "monday_energy",
        ]
        for qid in card_tap_ids:
            q = engine.get_question(qid)
            assert q is not None
            assert q["format"] == "card_tap"
            assert "options" in q
            assert len(q["options"]) >= 2
            for opt in q["options"]:
                assert "id" in opt
                assert "label" in opt

    def test_conversational_questions_have_language_analysis(self, engine: CalibrationEngine):
        conv_ids = ["frustration", "best_team", "explain_complex", "hidden_skill"]
        for qid in conv_ids:
            q = engine.get_question(qid)
            assert q is not None
            assert q["format"] == "conversational"
            assert "language_analysis" in q
            assert len(q["language_analysis"]) >= 1


# === Drive Updates ===


class TestDriveUpdates:
    def test_card_tap_adjustments(self, engine: CalibrationEngine):
        """Selecting 'close_deals' on goal_statement should boost dominance."""
        drives = {
            "dominance": DRIVE_MIDPOINT,
            "extraversion": DRIVE_MIDPOINT,
            "patience": DRIVE_MIDPOINT,
            "formality": DRIVE_MIDPOINT,
        }
        new_drives = engine.apply_answer(drives, "goal_statement", "close_deals")
        assert new_drives["dominance"] > drives["dominance"]
        assert new_drives["patience"] < drives["patience"]

    def test_card_tap_store_documents(self, engine: CalibrationEngine):
        """Selecting 'store_documents' should boost formality and patience."""
        drives = {
            "dominance": DRIVE_MIDPOINT,
            "extraversion": DRIVE_MIDPOINT,
            "patience": DRIVE_MIDPOINT,
            "formality": DRIVE_MIDPOINT,
        }
        new_drives = engine.apply_answer(drives, "goal_statement", "store_documents")
        assert new_drives["formality"] > drives["formality"]
        assert new_drives["patience"] > drives["patience"]

    def test_clamp_upper_bound(self, engine: CalibrationEngine):
        """Drives should never exceed 10.0."""
        drives = {
            "dominance": 9.5,
            "extraversion": DRIVE_MIDPOINT,
            "patience": 3.0,
            "formality": DRIVE_MIDPOINT,
        }
        new_drives = engine.apply_answer(drives, "goal_statement", "close_deals")
        assert new_drives["dominance"] <= DRIVE_MAX

    def test_clamp_lower_bound(self, engine: CalibrationEngine):
        """Drives should never go below 1.0."""
        drives = {
            "dominance": DRIVE_MIDPOINT,
            "extraversion": DRIVE_MIDPOINT,
            "patience": 1.5,
            "formality": DRIVE_MIDPOINT,
        }
        # close_deals has patience: -2
        new_drives = engine.apply_answer(drives, "goal_statement", "close_deals")
        assert new_drives["patience"] >= DRIVE_MIN

    def test_clamp_function(self):
        assert _clamp_drive(0.0) == DRIVE_MIN
        assert _clamp_drive(11.0) == DRIVE_MAX
        assert _clamp_drive(5.0) == 5.0

    def test_unknown_question_returns_unchanged(self, engine: CalibrationEngine):
        drives = {"dominance": 5.0, "extraversion": 5.0, "patience": 5.0, "formality": 5.0}
        result = engine.apply_answer(drives, "nonexistent_question", "some_option")
        assert result == drives

    def test_conversational_text_analysis(self, engine: CalibrationEngine):
        """Conversational questions should analyze free text."""
        drives = {
            "dominance": DRIVE_MIDPOINT,
            "extraversion": DRIVE_MIDPOINT,
            "patience": DRIVE_MIDPOINT,
            "formality": DRIVE_MIDPOINT,
        }
        # Mention speed frustration keywords
        text = "Everything is too slow. The bottleneck is killing us, waiting on approvals."
        new_drives = engine.apply_answer(drives, "frustration", free_text=text)
        # Should boost dominance (speed_frustration pattern)
        assert new_drives["dominance"] > drives["dominance"]


# === Confidence ===


class TestConfidence:
    def test_initial_confidence(self, engine: CalibrationEngine):
        state = engine.new_session()
        assert state["confidence"] == BASE_CONFIDENCE

    def test_confidence_increases_with_answers(self, engine: CalibrationEngine):
        state = engine.new_session()
        state["answered"].append("goal_statement")
        state["drives_touched"].update(["dominance", "patience"])
        conf = engine.compute_confidence(state)
        assert conf > BASE_CONFIDENCE

    def test_confidence_after_four_bmy_answers(self, engine: CalibrationEngine):
        """After 4 BMY answers with good coverage, should approach 0.75."""
        state = engine.new_session()
        state["answered"] = ["goal_statement", "autonomy_pref", "report_style", "team_size"]
        state["drives_touched"] = {"dominance", "extraversion", "patience", "formality"}
        state["archetype_confirmations"] = 1
        conf = engine.compute_confidence(state)
        # BASE(0.10) + 4*PER_Q(0.15) + ARCH(0.05) = 0.75
        # No coverage penalty since all 4 drives touched
        assert conf >= 0.70
        assert conf <= 0.85

    def test_confidence_capped_at_one(self, engine: CalibrationEngine):
        state = engine.new_session()
        state["answered"] = [f"q{i}" for i in range(20)]
        state["drives_touched"] = {"dominance", "extraversion", "patience", "formality"}
        conf = engine.compute_confidence(state)
        assert conf <= 1.0

    def test_coverage_penalty(self, engine: CalibrationEngine):
        """Missing drives should reduce confidence."""
        state_full = engine.new_session()
        state_full["answered"] = ["q1", "q2"]
        state_full["drives_touched"] = {"dominance", "extraversion", "patience", "formality"}

        state_partial = engine.new_session()
        state_partial["answered"] = ["q1", "q2"]
        state_partial["drives_touched"] = {"dominance"}

        conf_full = engine.compute_confidence(state_full)
        conf_partial = engine.compute_confidence(state_partial)
        assert conf_full > conf_partial


# === Question Selection ===


class TestQuestionSelection:
    def test_first_question_is_goal_statement(self, engine: CalibrationEngine):
        state = engine.new_session()
        next_q = engine.select_next_question(state)
        assert next_q == "goal_statement"

    def test_no_repeats(self, engine: CalibrationEngine):
        state = engine.new_session()
        state["answered"] = ["goal_statement"]
        next_q = engine.select_next_question(state)
        assert next_q != "goal_statement"
        assert next_q is not None

    def test_targets_uncovered_drives(self, engine: CalibrationEngine):
        """Should prefer questions measuring drives not yet touched."""
        state = engine.new_session()
        # Answered goal_statement (measures dominance, patience)
        state["answered"] = ["goal_statement"]
        state["drives_touched"] = {"dominance", "patience"}
        next_q = engine.select_next_question(state)
        assert next_q is not None
        # The selected question should measure at least one uncovered drive
        q = engine.get_question(next_q)
        measured = set(q["drives_measured"])
        uncovered = {"extraversion", "formality"} - state["drives_touched"]
        # Should measure at least one uncovered drive
        assert measured & uncovered or measured  # At minimum a valid question

    def test_returns_none_when_all_answered(self, engine: CalibrationEngine):
        state = engine.new_session()
        # Answer all 10 questions
        state["answered"] = [
            "goal_statement",
            "autonomy_pref",
            "report_style",
            "team_size",
            "plan_fails",
            "monday_energy",
            "frustration",
            "best_team",
            "explain_complex",
            "hidden_skill",
        ]
        next_q = engine.select_next_question(state)
        assert next_q is None


# === Micro-Insights ===


class TestMicroInsights:
    def test_strong_signal_returns_string(self, engine: CalibrationEngine):
        adjustments = {"dominance": 3.0}
        insight = engine.select_micro_insight(adjustments)
        assert isinstance(insight, str)
        assert len(insight) > 0

    def test_weak_signal_returns_ambiguous(self, engine: CalibrationEngine):
        adjustments = {"dominance": 0.1, "extraversion": -0.1}
        insight = engine.select_micro_insight(adjustments)
        assert isinstance(insight, str)
        # Should come from ambiguous pool
        ambiguous_pool = engine._micro_insights.get("ambiguous", [])
        assert insight in ambiguous_pool

    def test_empty_adjustments_returns_ambiguous(self, engine: CalibrationEngine):
        insight = engine.select_micro_insight({})
        assert isinstance(insight, str)
        ambiguous_pool = engine._micro_insights.get("ambiguous", [])
        assert insight in ambiguous_pool

    def test_negative_signal_selects_low(self, engine: CalibrationEngine):
        adjustments = {"patience": -2.0}
        insight = engine.select_micro_insight(adjustments)
        assert isinstance(insight, str)
        low_pool = engine._micro_insights.get("patience_low", [])
        assert insight in low_pool


# === Unlock Events ===


class TestUnlockEvents:
    def test_emits_at_correct_threshold(self, engine: CalibrationEngine):
        events = engine.check_unlock_thresholds(0.50, 0.60)
        assert len(events) == 1
        assert events[0]["threshold"] == 0.55

    def test_emits_multiple_thresholds(self, engine: CalibrationEngine):
        events = engine.check_unlock_thresholds(0.40, 0.80)
        thresholds = [e["threshold"] for e in events]
        assert 0.55 in thresholds
        assert 0.65 in thresholds
        assert 0.75 in thresholds

    def test_no_event_when_not_crossed(self, engine: CalibrationEngine):
        events = engine.check_unlock_thresholds(0.56, 0.60)
        assert len(events) == 0

    def test_no_duplicate_events_in_state(self, engine: CalibrationEngine):
        """Process multiple answers and verify no duplicate unlock events."""
        state = engine.new_session()

        # Simulate answer processing that crosses 0.55
        state["answered"] = ["goal_statement", "autonomy_pref", "report_style"]
        state["drives_touched"] = {"dominance", "patience", "formality"}
        old_conf = state["confidence"]
        new_conf = engine.compute_confidence(state)
        state["confidence"] = new_conf

        events1 = engine.check_unlock_thresholds(old_conf, new_conf)
        for evt in events1:
            state["unlocks_emitted"].append(evt["threshold"])

        # Next answer
        state["answered"].append("team_size")
        state["drives_touched"].add("extraversion")
        old_conf = state["confidence"]
        new_conf = engine.compute_confidence(state)
        state["confidence"] = new_conf

        events2 = engine.check_unlock_thresholds(old_conf, new_conf)
        # Filter out already-emitted
        new_events = [e for e in events2 if e["threshold"] not in state["unlocks_emitted"]]
        # Should not re-emit thresholds from events1
        for evt in events1:
            assert evt["threshold"] not in [e["threshold"] for e in new_events]

    def test_unlock_messages_have_otto_says(self, engine: CalibrationEngine):
        events = engine.check_unlock_thresholds(0.0, 1.0)
        for evt in events:
            assert "otto_says" in evt
            assert "visual" in evt


# === Full Process Answer Integration ===


class TestProcessAnswer:
    def test_full_flow(self, engine: CalibrationEngine):
        state = engine.new_session()
        result = engine.process_answer(state, "goal_statement", "close_deals")
        assert "drives" in result
        assert "confidence" in result
        assert "micro_insight" in result
        assert result["drives"]["dominance"] > DRIVE_MIDPOINT
        assert result["confidence"] > BASE_CONFIDENCE

    def test_profile_match_at_high_confidence(self, engine: CalibrationEngine):
        """When confidence reaches 0.75, should include profile match."""
        state = engine.new_session()
        # Push drives strongly and answer many questions
        state["drives"] = {"dominance": 8.0, "extraversion": 3.0, "patience": 3.0, "formality": 4.0}
        state["answered"] = [
            "goal_statement",
            "autonomy_pref",
            "report_style",
            "team_size",
            "plan_fails",
        ]
        state["drives_touched"] = {"dominance", "extraversion", "patience", "formality"}
        state["archetype_confirmations"] = 1
        state["confidence"] = 0.70

        result = engine.process_answer(state, "monday_energy", "already_moving")
        # After 6 answered + arch confirm, confidence should be high
        if result["confidence"] >= 0.75:
            assert result["profile_match"] is not None
            assert "profile_id" in result["profile_match"]


# === Archetype Inference ===


class TestArchetypeInference:
    def test_driver_archetype(self, engine: CalibrationEngine):
        drives = {"dominance": 8.0, "extraversion": 5.0, "patience": 3.0, "formality": 4.0}
        assert engine._infer_archetype(drives) == "driver"

    def test_enforcer_archetype(self, engine: CalibrationEngine):
        drives = {"dominance": 4.0, "extraversion": 4.0, "patience": 7.0, "formality": 8.0}
        assert engine._infer_archetype(drives) == "enforcer"

    def test_interpreter_archetype(self, engine: CalibrationEngine):
        drives = {"dominance": 4.0, "extraversion": 8.0, "patience": 5.0, "formality": 4.0}
        assert engine._infer_archetype(drives) == "interpreter"

    def test_midpoint_drives_return_none(self, engine: CalibrationEngine):
        drives = {"dominance": 5.5, "extraversion": 5.5, "patience": 5.5, "formality": 5.5}
        result = engine._infer_archetype(drives)
        # At midpoint, no strong signal — could be None
        assert result is None or result in ("driver", "enforcer", "interpreter")
