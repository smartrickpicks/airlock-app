"""Base utilities for the extraction package.

Provides the standard check dict builder and field key normalization
used by all extractors and consumed by _build_schema_mapping().
"""

import functools
import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Rules bundle lives at apps/api/rules/rules_bundle/
# From src/engines/extraction/ → parents[3] = apps/api/
_RULES_BUNDLE = Path(__file__).resolve().parents[3] / "rules" / "rules_bundle"


def make_check(
    code: str,
    status: str,
    confidence: float,
    value: Any,
    reason: str,
    evidence_hit_terms: list[str] | None = None,
    evidence_context: str | None = None,
) -> dict[str, Any]:
    """Build a check dict in the shape consumed by _build_schema_mapping().

    Args:
        code: Check code (e.g. "OPP_FRONT_CATALOG_SPLIT")
        status: One of "pass", "fail", "review", "missing", "suggested"
        confidence: Float 0.0-1.0
        value: Extracted value (str, number, or None)
        reason: Human-readable extraction reason
        evidence_hit_terms: Optional list of matched terms from text
        evidence_context: Optional surrounding text snippet for UI display

    Returns:
        dict matching the check shape from preflight_engine.py
    """
    check: dict[str, Any] = {
        "code": code,
        "status": status,
        "confidence": float(confidence),
        "value": value,
        "reason": reason,
    }
    if evidence_hit_terms:
        check["_evidence_hit_terms"] = evidence_hit_terms
    if evidence_context:
        check["evidence_context"] = evidence_context
    return check


def extract_context(text: str, match_start: int, match_end: int, window: int = 150) -> str:
    """Extract a text snippet around a match for evidence display."""
    start = max(0, match_start - window)
    end = min(len(text), match_end + window)
    snippet = text[start:end].strip()
    if start > 0:
        snippet = "..." + snippet
    if end < len(text):
        snippet = snippet + "..."
    return snippet


def normalize_field_key(check_code: str) -> str:
    """Convert a check_code to the __c suffixed field_key convention.

    Matches the normalization in run_preflight_second_pass (preflight_engine.py:3870):
        excel_col_lower[:-2] + '__c'

    Examples:
        "OPP_FRONT_CATALOG_SPLIT" -> "front_catalog_split__c"
        "ACCT_BILLING_CITY" -> "billing_city__c"
        "ADDON_MATCHING" -> "matching__c"
    """
    # Strip section prefix (OPP_, ACCT_, FIN_, SCH_, ADDON_, ENT_)
    prefixes = ("OPP_", "ACCT_", "FIN_", "SCH_", "ADDON_", "ENT_")
    key = check_code
    for prefix in prefixes:
        if key.startswith(prefix):
            key = key[len(prefix) :]
            break
    return key.lower() + "__c"


def find_anchor(field: dict[str, Any], text_lower: str) -> tuple[int, str, int] | None:
    """Find best anchor match for a field config.

    Shared anchor-proximity search used by all anchor-based extractors.
    Searches primary anchors first (tier 1, higher confidence), then
    secondary anchors (tier 2). Skips matches preceded by negative anchors.

    Args:
        field: Dict with primary_anchors, secondary_anchors, negative_anchors
        text_lower: Lowercased full text to search

    Returns:
        (best_pos, best_anchor, tier) or None if no anchor found.
        tier: 1 = primary, 2 = secondary.
    """
    primary_anchors: list[str] = [a.lower() for a in field.get("primary_anchors", [])]
    secondary_anchors: list[str] = [a.lower() for a in field.get("secondary_anchors", [])]
    negative_anchors: list[str] = [a.lower() for a in field.get("negative_anchors", [])]

    best_pos: int = -1
    best_anchor: str = ""
    anchor_tier: int = 0

    for anchor in primary_anchors:
        pos = text_lower.find(anchor)
        if pos >= 0:
            window_start = max(0, pos - 80)
            context = text_lower[window_start : pos + len(anchor)]
            if any(neg in context for neg in negative_anchors if neg != anchor):
                continue
            if best_pos < 0 or anchor_tier > 1:
                best_pos = pos
                best_anchor = anchor
                anchor_tier = 1

    if best_pos < 0:
        for anchor in secondary_anchors:
            pos = text_lower.find(anchor)
            if pos >= 0:
                window_start = max(0, pos - 80)
                context = text_lower[window_start : pos + len(anchor)]
                if any(neg in context for neg in negative_anchors if neg != anchor):
                    continue
                best_pos = pos
                best_anchor = anchor
                anchor_tier = 2
                break

    if best_pos < 0:
        return None
    return (best_pos, best_anchor, anchor_tier)


def confidence_bucket(pct: int | float) -> str:
    """Convert confidence percentage to bucket label.

    Matches the bucketing in _build_schema_mapping third-pass.
    """
    if pct >= 75:
        return "HIGH"
    if pct >= 40:
        return "MEDIUM"
    return "LOW"


@functools.lru_cache(maxsize=16)
def load_config(filename: str) -> dict[str, Any]:
    """Load a JSON config file from rules/rules_bundle/. Cached after first read."""
    path = _RULES_BUNDLE / filename
    with open(path, encoding="utf-8") as f:
        return json.load(f)
