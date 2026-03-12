"""Tests for InferenceService provenance methods.

Validates drive evidence, behavioral tension detection,
all-distances computation, and BMY response provenance integration.
"""

from pathlib import Path

import pytest

from src.schemas.inference import (
    BMYRequest,
    DECFDrives,
    DriveSignals,
    SignalSource,
)
from src.services.inference import InferenceService, ProfileMatchingEngine


@pytest.fixture
def engine():
    persona_path = Path("/Users/zacharyholwerda/Desktop/Airlock/repos/airlock-persona")
    eng = ProfileMatchingEngine(persona_path=persona_path)
    eng.load()
    return eng


@pytest.fixture
def service(engine):
    return InferenceService(engine)


def test_build_drive_evidence(service):
    drives = DECFDrives(dominance=7.5, extraversion=3.0, patience=4.0, formality=6.0)
    raw_adjustments = {
        "goal_statement": {"dominance": 2.1, "patience": -0.6, "extraversion": -1.0},
        "autonomy_preference": {
            "formality": 6,
            "interaction_mode": "collaborative",
            "autonomy_ceiling": 0.55,
        },
        "career": {"dominance_adjust": 0.45, "extraversion_adjust": -0.3, "confidence_bonus": 0.1},
    }
    evidence = service._build_drive_evidence(drives, raw_adjustments)
    assert len(evidence) == 4
    dom_evidence = next(e for e in evidence if e.drive == "dominance")
    assert dom_evidence.value == 7.5
    assert len(dom_evidence.signals) >= 1


def test_detect_behavioral_tensions(service):
    drives = DECFDrives(dominance=8.0, extraversion=3.0, patience=2.0, formality=8.0)
    tensions = service._detect_behavioral_tensions(drives)
    assert len(tensions) >= 1
    assert any("patience" in t.drive_a or "patience" in t.drive_b for t in tensions)


def test_detect_no_tensions_when_balanced(service):
    drives = DECFDrives(dominance=5.0, extraversion=5.0, patience=5.0, formality=5.0)
    tensions = service._detect_behavioral_tensions(drives)
    assert len(tensions) == 0


def test_compute_all_distances(service):
    drives = DECFDrives(dominance=9.0, extraversion=8.0, patience=2.0, formality=2.0)
    distances = service._compute_all_distances(drives, match_id="captain", runner_up_id="maverick")
    assert len(distances) == 17
    captain = next(d for d in distances if d.profile_id == "captain")
    assert captain.is_match is True
    maverick = next(d for d in distances if d.profile_id == "maverick")
    assert maverick.is_runner_up is True
    guardian = next(d for d in distances if d.profile_id == "guardian")
    assert guardian.rejection_reason is not None
    assert not guardian.is_match


def test_bmy_response_includes_provenance(service):
    request = BMYRequest(
        signals=DriveSignals(
            goal_statement="I want to scale my team and close deals faster",
            autonomy_preference="Draft it, I'll review",
            signal_sources=[SignalSource.CONVERSATION],
        )
    )
    response = service.get_bmy_profile(request)
    assert response.provenance is not None
    assert len(response.provenance.all_distances) == 17
    assert len(response.provenance.drive_evidence) == 4
    assert isinstance(response.provenance.raw_adjustments, dict)
