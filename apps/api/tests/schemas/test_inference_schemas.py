from src.schemas.inference import (
    BehavioralTension,
    BMYResponse,
    CognitiveMode,
    DECFDrives,
    DriveEvidence,
    ExplanationStyle,
    InformationDensity,
    InteractionMode,
    InterfaceStructure,
    MetaArchetype,
    OttoConfig,
    ProfileDistance,
    ProfileMatch,
    ProvenanceData,
    UpdatePace,
    WorkspaceConfig,
)


def test_drive_evidence_schema():
    evidence = DriveEvidence(
        drive="dominance",
        value=7.2,
        signals=[
            {
                "source": "goal_statement",
                "contribution": 1.4,
                "reason": "Action-oriented language: 'scale', 'grow', 'lead'",
            },
            {
                "source": "career",
                "contribution": 0.6,
                "reason": "CEO/Founder title → high dominance target",
            },
        ],
    )
    assert evidence.drive == "dominance"
    assert len(evidence.signals) == 2
    assert evidence.signals[0]["contribution"] == 1.4


def test_behavioral_tension_schema():
    tension = BehavioralTension(
        drive_a="patience",
        value_a=3.2,
        drive_b="formality",
        value_b=8.0,
        description="Your stated goals suggest urgency (low patience), but your autonomy preference suggests high structure (high formality).",
    )
    assert tension.drive_a == "patience"
    assert tension.drive_b == "formality"


def test_profile_distance_schema():
    dist = ProfileDistance(
        profile_id="maverick",
        profile_name="Maverick",
        distance=2.34,
        meta_archetype=MetaArchetype.DRIVER,
        is_match=False,
        is_runner_up=False,
        rejection_reason="Higher extraversion divergence (inferred E:3 vs canonical E:8)",
    )
    assert dist.rejection_reason is not None
    assert not dist.is_match


def test_provenance_data_schema():
    provenance = ProvenanceData(
        all_distances=[
            ProfileDistance(
                profile_id="captain",
                profile_name="Captain",
                distance=1.2,
                meta_archetype=MetaArchetype.DRIVER,
                is_match=True,
                is_runner_up=False,
            ),
        ],
        drive_evidence=[
            DriveEvidence(drive="dominance", value=8.0, signals=[]),
        ],
        behavioral_tensions=[],
        raw_adjustments={"goal_statement": {"dominance": 2.1}},
    )
    assert len(provenance.all_distances) == 1
    assert provenance.all_distances[0].is_match


def test_bmy_response_includes_provenance():
    drives = DECFDrives(dominance=8.0, extraversion=6.0, patience=3.0, formality=2.0)
    ws = WorkspaceConfig(
        cognitive_mode=CognitiveMode.VISUAL,
        information_density=InformationDensity.MEDIUM,
        interface_structure=InterfaceStructure.EXPLORATORY,
        update_pace=UpdatePace.ALERTS,
        explanation_style=ExplanationStyle.SUMMARY_FIRST,
    )
    otto = OttoConfig(
        default_archetype="executor",
        autonomy_ceiling=0.7,
        interaction_mode=InteractionMode.DRAFT_THEN_REVIEW,
    )
    match = ProfileMatch(
        profile_id="captain",
        profile_name="Captain",
        distance=1.2,
        confidence=0.75,
        meta_archetype=MetaArchetype.DRIVER,
        drives=drives,
        workspace_config=ws,
        otto_config=otto,
    )
    resp = BMYResponse(
        drives=drives,
        signal_count=3,
        profile=match,
        workspace_config=ws,
        otto_config=otto,
        confidence=0.75,
        explanation="Test",
        provenance=ProvenanceData(
            all_distances=[],
            drive_evidence=[],
            behavioral_tensions=[],
            raw_adjustments={},
        ),
    )
    assert resp.provenance is not None
