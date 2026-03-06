"""Gate computation — determines RED/YELLOW/GREEN document health gate.

Locked policy (P1E):
  RED:    replacement_char_ratio > 0.05 OR control_char_ratio > 0.03
          OR doc_mode == SCANNED
          OR (MIXED + avg_chars < 30 + >80% sparse)
  YELLOW: Phase 2 field quality checks (SF match, counterparty, entity)
  GREEN:  all checks passed
"""

from __future__ import annotations

from typing import Any

# ── Thresholds ───────────────────────────────────────────────────────────

GATE_RED_REPLACEMENT_RATIO = 0.05
GATE_RED_CONTROL_RATIO = 0.03
GATE_YELLOW_AVG_CHARS = 30
GATE_YELLOW_SPARSE_RATIO = 0.80
GATE_YELLOW_SPARSE_CHARS = 10
GATE_GREEN_COUNTERPARTY_CONF = 0.70
GATE_GREEN_ENTITY_SCORE = 0.60

# ── Section weights for health score ─────────────────────────────────────

SECTION_WEIGHTS = {
    "opportunities_readiness": 0.25,
    "schedule_readiness": 0.15,
    "financials_readiness": 0.25,
    "addons_readiness": 0.15,
    "entity_resolution": 0.20,
}

GATE_PENALTIES = {"GREEN": 0.0, "YELLOW": 0.10, "RED": 0.40}


def compute_gate(
    doc_mode: str,
    replacement_char_ratio: float,
    control_char_ratio: float,
    avg_chars_per_page: float,
    page_char_counts: list[int],
    entity_resolution: dict[str, Any] | None = None,
    opportunities_readiness: dict[str, Any] | None = None,
    sf_match: dict[str, Any] | None = None,
) -> tuple[str, list[str], list[dict]]:
    """Two-phase gate (v2).

    Phase 1 — technical blockers → RED
    Phase 2 — field quality → GREEN vs YELLOW

    Returns: (gate_color, reasons, decision_trace)
    """
    reasons: list[str] = []
    trace: list[dict] = []

    # ── Phase 1: RED blockers ────────────────────────────────────────────

    r1 = replacement_char_ratio > GATE_RED_REPLACEMENT_RATIO
    trace.append(
        {
            "rule": f"replacement_char_ratio > {GATE_RED_REPLACEMENT_RATIO:.2f}",
            "value": round(replacement_char_ratio, 6),
            "threshold": GATE_RED_REPLACEMENT_RATIO,
            "result": "FAIL" if r1 else "PASS",
            "level": "RED",
        }
    )
    if r1:
        reasons.append(
            f"replacement_char_ratio_exceeded:{replacement_char_ratio:.4f}>{GATE_RED_REPLACEMENT_RATIO:.4f}"
        )

    r2 = control_char_ratio > GATE_RED_CONTROL_RATIO
    trace.append(
        {
            "rule": f"control_char_ratio > {GATE_RED_CONTROL_RATIO:.2f}",
            "value": round(control_char_ratio, 6),
            "threshold": GATE_RED_CONTROL_RATIO,
            "result": "FAIL" if r2 else "PASS",
            "level": "RED",
        }
    )
    if r2:
        reasons.append(
            f"control_char_ratio_exceeded:{control_char_ratio:.4f}>{GATE_RED_CONTROL_RATIO:.4f}"
        )

    r3 = doc_mode == "SCANNED"
    trace.append(
        {
            "rule": "doc_mode == SCANNED",
            "value": doc_mode,
            "threshold": "SCANNED",
            "result": "FAIL" if r3 else "PASS",
            "level": "RED",
        }
    )
    if r3:
        reasons.append("doc_mode_scanned")

    sparse_ratio = 0.0
    if page_char_counts:
        sparse_pages = sum(1 for c in page_char_counts if c < GATE_YELLOW_SPARSE_CHARS)
        sparse_ratio = sparse_pages / len(page_char_counts)
    r4 = (
        doc_mode == "MIXED"
        and avg_chars_per_page < GATE_YELLOW_AVG_CHARS
        and sparse_ratio > GATE_YELLOW_SPARSE_RATIO
    )
    trace.append(
        {
            "rule": f"MIXED + avg_chars < {GATE_YELLOW_AVG_CHARS} + >{GATE_YELLOW_SPARSE_RATIO * 100:.0f}% sparse",
            "value": f"doc_mode={doc_mode} avg={avg_chars_per_page:.1f} sparse={sparse_ratio:.2f}",
            "threshold": f"MIXED + <{GATE_YELLOW_AVG_CHARS} + >{GATE_YELLOW_SPARSE_RATIO:.2f}",
            "result": "FAIL" if r4 else "PASS",
            "level": "RED",
        }
    )
    if r4:
        reasons.append("unreadable_mixed_sparse")

    if reasons:
        return "RED", reasons, trace

    # ── Phase 2: Field quality → GREEN vs YELLOW ─────────────────────────
    if entity_resolution is None and opportunities_readiness is None:
        return "GREEN", ["all_checks_passed"], trace

    yellow_reasons: list[str] = []
    er_checks = (entity_resolution or {}).get("checks", [])
    opp_checks = (opportunities_readiness or {}).get("checks", [])

    def _find_check(checks: list[dict], code: str) -> dict | None:
        for c in checks:
            if c.get("code") == code:
                return c
        return None

    # 2a: Salesforce match
    sf_check = _find_check(er_checks, "ENT_SF_MATCH")
    sf_pass = sf_check is not None and sf_check.get("status") == "pass"
    trace.append(
        {
            "rule": "ENT_SF_MATCH == pass",
            "value": (sf_check or {}).get("status", "missing"),
            "threshold": "pass",
            "result": "PASS" if sf_pass else "FAIL",
            "level": "YELLOW",
        }
    )
    if not sf_pass:
        yellow_reasons.append("sf_match_missing")

    # 2b: Counterparty confidence
    cp_check = _find_check(er_checks, "ENT_COUNTERPARTY")
    cp_conf = float((cp_check or {}).get("confidence", 0))
    cp_pass = cp_conf >= GATE_GREEN_COUNTERPARTY_CONF
    trace.append(
        {
            "rule": f"ENT_COUNTERPARTY confidence >= {GATE_GREEN_COUNTERPARTY_CONF:.2f}",
            "value": round(cp_conf, 4),
            "threshold": GATE_GREEN_COUNTERPARTY_CONF,
            "result": "PASS" if cp_pass else "FAIL",
            "level": "YELLOW",
        }
    )
    if not cp_pass:
        yellow_reasons.append(
            f"counterparty_low_confidence:{cp_conf:.2f}<{GATE_GREEN_COUNTERPARTY_CONF:.2f}"
        )

    # 2c: New customer detection
    ne_check = _find_check(er_checks, "ENT_NEW_ENTRY")
    ne_pass = ne_check is not None and ne_check.get("status") == "pass"
    trace.append(
        {
            "rule": "ENT_NEW_ENTRY == pass (no new customer)",
            "value": (ne_check or {}).get("status", "missing"),
            "threshold": "pass",
            "result": "PASS" if ne_pass else "FAIL",
            "level": "YELLOW",
        }
    )
    if not ne_pass:
        yellow_reasons.append("new_customer_detected")

    # 2d: Contract type identified
    ct_check = _find_check(opp_checks, "OPP_CONTRACT_TYPE")
    ct_pass = ct_check is not None and ct_check.get("status") != "fail"
    trace.append(
        {
            "rule": "OPP_CONTRACT_TYPE != fail",
            "value": (ct_check or {}).get("status", "missing"),
            "threshold": "not fail",
            "result": "PASS" if ct_pass else "FAIL",
            "level": "YELLOW",
        }
    )
    if not ct_pass:
        yellow_reasons.append("contract_type_unidentified")

    # 2e: doc_mode SEARCHABLE
    dm_pass = doc_mode == "SEARCHABLE"
    trace.append(
        {
            "rule": "doc_mode == SEARCHABLE",
            "value": doc_mode,
            "threshold": "SEARCHABLE",
            "result": "PASS" if dm_pass else "FAIL",
            "level": "YELLOW",
        }
    )
    if not dm_pass:
        yellow_reasons.append("doc_mode_mixed")

    # 2f: Entity resolution section score
    er_score = module_score(entity_resolution) if entity_resolution else 0.0
    er_pass = er_score >= GATE_GREEN_ENTITY_SCORE
    trace.append(
        {
            "rule": f"entity_resolution score >= {GATE_GREEN_ENTITY_SCORE:.2f}",
            "value": round(er_score, 4),
            "threshold": GATE_GREEN_ENTITY_SCORE,
            "result": "PASS" if er_pass else "FAIL",
            "level": "YELLOW",
        }
    )
    if not er_pass:
        yellow_reasons.append(f"entity_resolution_low:{er_score:.2f}<{GATE_GREEN_ENTITY_SCORE:.2f}")

    if yellow_reasons:
        return "YELLOW", yellow_reasons, trace

    return "GREEN", ["all_checks_passed"], trace


def module_score(module: dict[str, Any] | None) -> float:
    """Compute normalized score for a readiness module."""
    if not module:
        return 0.0
    checks = module.get("checks", [])
    if not checks:
        return 0.0
    total = 0.0
    for c in checks:
        st = c.get("status", "fail")
        conf = float(c.get("confidence", 0))
        if st == "pass":
            total += conf
        elif st == "review":
            total += conf * 0.5
    return total / len(checks)


def entity_score(story: dict[str, Any] | None) -> float:
    """Compute score for entity resolution from resolution story."""
    if not story:
        return 0.0
    has_legal = bool(story.get("legal_entity_account"))
    has_counter = bool(story.get("counterparties"))
    if has_legal and has_counter:
        return 1.0
    if has_legal:
        return 0.6
    if has_counter:
        return 0.3
    return 0.0


def compute_health_score(
    gate_color: str,
    opportunities_readiness: dict[str, Any] | None,
    schedule_readiness: dict[str, Any] | None,
    financials_readiness: dict[str, Any] | None,
    addons_readiness: dict[str, Any] | None,
    resolution_story: dict[str, Any] | None,
    entity_resolution: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Compute weighted preflight health score.

    Stubbed calibration — returns raw score without server-side calibration.
    Full calibration requires contract_health_runtime (post-M25).
    """
    section_scores = {
        "opportunities_readiness": module_score(opportunities_readiness),
        "schedule_readiness": module_score(schedule_readiness),
        "financials_readiness": module_score(financials_readiness),
        "addons_readiness": module_score(addons_readiness),
        "entity_resolution": (
            module_score(entity_resolution) if entity_resolution else entity_score(resolution_story)
        ),
    }

    raw = sum(section_scores[k] * SECTION_WEIGHTS[k] for k in SECTION_WEIGHTS)
    gate_penalty = GATE_PENALTIES.get(gate_color, 0.0)
    penalized = max(0.0, raw - gate_penalty)

    # Stubbed calibration — identity function until runtime is ported
    calibrated = penalized
    band = (
        "critical"
        if calibrated < 0.30
        else "poor"
        if calibrated < 0.50
        else "fair"
        if calibrated < 0.70
        else "good"
        if calibrated < 0.85
        else "excellent"
    )

    return {
        "raw_score": round(raw, 6),
        "calibrated_score": round(calibrated, 6),
        "band": band,
        "calibration_version": "v1-stub",
        "section_scores": {k: round(v, 6) for k, v in section_scores.items()},
        "gate_penalty": gate_penalty,
    }
