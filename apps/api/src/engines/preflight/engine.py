"""Preflight orchestration engine."""

from __future__ import annotations

from typing import Any

from .classifier import classify_document, classify_page
from .gate import compute_gate, compute_health_score
from .metrics import compute_text_metrics, extract_corruption_samples
from .readiness import (
    build_addons_readiness,
    build_entity_resolution,
    build_financials_readiness,
    build_opportunities_readiness,
    build_resolution_story,
    build_schedule_readiness,
    classify_contract,
    extract_candidate_headers,
)

_TRUNC_LIMIT = 50_000
_READINESS_SEC_CODES = {
    "entity_resolution": ["SEC_PREAMBLE", "SEC_ENTITY"],
    "opportunities_readiness": [
        "SEC_SCOPE",
        "SEC_RIGHTS",
        "SEC_TERRITORY",
        "SEC_TERM",
        "SEC_TERMINATION",
        "SEC_RESTRICTIONS",
    ],
    "schedule_readiness": ["SEC_SCHEDULE"],
    "financials_readiness": ["SEC_COMPENSATION"],
    "addons_readiness": ["SEC_ADDONS"],
}


def run_preflight(pages_data: list[dict[str, Any]]) -> dict[str, Any]:
    """Run preflight checks across extracted page data."""
    if not pages_data:
        return {
            "doc_mode": "MIXED",
            "gate_color": "RED",
            "gate_reasons": ["no_pages"],
            "decision_trace": [],
            "corruption_samples": [],
            "page_classifications": [],
            "metrics": {},
        }

    page_modes: list[str] = []
    page_char_counts: list[int] = []
    pages_text: list[str] = []
    page_results: list[dict[str, Any]] = []

    for page in pages_data:
        text = str(page.get("text", ""))
        char_count = int(page.get("char_count", len(text)))
        image_ratio = float(page.get("image_coverage_ratio", 0.0))
        mode = classify_page(char_count, image_ratio)
        page_modes.append(mode)
        page_char_counts.append(char_count)
        pages_text.append(text)
        page_results.append(
            {
                "page": int(page.get("page", len(page_results) + 1)),
                "mode": mode,
                "char_count": char_count,
                "image_coverage_ratio": image_ratio,
            }
        )

    doc_mode = classify_document(page_modes)
    replacement_ratio, control_ratio, mojibake_ratio = compute_text_metrics(pages_text)
    total_chars = sum(page_char_counts)
    avg_chars = total_chars / len(page_char_counts) if page_char_counts else 0.0
    corruption_samples = extract_corruption_samples(pages_text)

    base_metrics = {
        "total_pages": len(pages_data),
        "total_chars": total_chars,
        "avg_chars_per_page": round(avg_chars, 2),
        "replacement_char_ratio": round(replacement_ratio, 6),
        "control_char_ratio": round(control_ratio, 6),
        "mojibake_ratio": round(mojibake_ratio, 6),
        "searchable_pages": sum(1 for mode in page_modes if mode == "SEARCHABLE"),
        "scanned_pages": sum(1 for mode in page_modes if mode == "SCANNED"),
        "mixed_pages": sum(1 for mode in page_modes if mode == "MIXED"),
    }

    red_gate, red_reasons, red_trace = compute_gate(
        doc_mode, replacement_ratio, control_ratio, avg_chars, page_char_counts
    )
    full_text = "\n".join(pages_text)
    if red_gate == "RED":
        return {
            "doc_mode": doc_mode,
            "gate_color": "RED",
            "gate_reasons": red_reasons,
            "decision_trace": red_trace,
            "corruption_samples": corruption_samples,
            "salesforce_match": None,
            "resolution_story": None,
            "entity_resolution": None,
            "opportunities_readiness": None,
            "schedule_readiness": None,
            "contract_classification": None,
            "financials_readiness": None,
            "addons_readiness": None,
            "health_score": compute_health_score("RED", None, None, None, None, None, None),
            "page_classifications": page_results,
            "extracted_text": full_text[:_TRUNC_LIMIT],
            "text_truncated": len(full_text) > _TRUNC_LIMIT,
            "original_text_length": len(full_text),
            "extracted_headers": [],
            "low_signal_headers": [],
            "metrics": base_metrics,
        }

    extracted_headers, low_signal_headers = extract_candidate_headers(full_text)
    salesforce_match: list[dict[str, Any]] = []
    resolution_story = build_resolution_story(salesforce_match, full_text)
    entity_resolution = build_entity_resolution(
        resolution_story, salesforce_match, full_text=full_text
    )
    opportunities_readiness = build_opportunities_readiness(full_text, resolution_story)
    schedule_readiness = build_schedule_readiness(
        full_text, resolution_story, opportunities_readiness
    )
    contract_type_value = next(
        (
            check.get("value")
            for check in opportunities_readiness.get("checks", [])
            if check.get("code") == "OPP_CONTRACT_TYPE"
        ),
        None,
    )
    contract_classification = classify_contract(
        str(contract_type_value) if contract_type_value else None, full_text
    )
    financials_readiness = build_financials_readiness(full_text, opportunities_readiness)
    addons_readiness = build_addons_readiness(full_text, opportunities_readiness)

    gate_color, gate_reasons, decision_trace = compute_gate(
        doc_mode,
        replacement_ratio,
        control_ratio,
        avg_chars,
        page_char_counts,
        entity_resolution=entity_resolution,
        opportunities_readiness=opportunities_readiness,
        sf_match=salesforce_match,
    )
    health_score = compute_health_score(
        gate_color,
        opportunities_readiness,
        schedule_readiness,
        financials_readiness,
        addons_readiness,
        resolution_story,
        entity_resolution,
    )

    result = {
        "doc_mode": doc_mode,
        "gate_color": gate_color,
        "gate_reasons": gate_reasons,
        "decision_trace": decision_trace,
        "corruption_samples": corruption_samples,
        "salesforce_match": salesforce_match,
        "resolution_story": resolution_story,
        "entity_resolution": entity_resolution,
        "opportunities_readiness": opportunities_readiness,
        "schedule_readiness": schedule_readiness,
        "contract_classification": contract_classification,
        "financials_readiness": financials_readiness,
        "addons_readiness": addons_readiness,
        "health_score": health_score,
        "page_classifications": page_results,
        "extracted_text": full_text[:_TRUNC_LIMIT],
        "text_truncated": len(full_text) > _TRUNC_LIMIT,
        "original_text_length": len(full_text),
        "extracted_headers": extracted_headers,
        "low_signal_headers": low_signal_headers,
        "metrics": base_metrics,
    }

    for readiness_key, sec_codes in _READINESS_SEC_CODES.items():
        section = result.get(readiness_key)
        if isinstance(section, dict):
            section["sec_codes"] = sec_codes

    if len(full_text) > _TRUNC_LIMIT:
        for section_key in (
            "opportunities_readiness",
            "schedule_readiness",
            "financials_readiness",
            "addons_readiness",
        ):
            section = result.get(section_key) or {}
            for check in section.get("checks", []):
                offset = check.get("evidence_char_offset")
                if offset is not None and offset >= _TRUNC_LIMIT:
                    check["evidence_offset_clamped"] = True
                    check["evidence_char_offset_original"] = offset
                    check["evidence_char_offset"] = 0

    return result
