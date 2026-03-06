"""Extraction dispatcher — runs all 6 extractors and returns unified results.

Instantiates BooleanExtractor, SplitExtractor, PicklistExtractor,
DateExtractor, PatternExtractor, and TextExtractor. Routes fields by
extraction_type from configs. Applies normalize_field_key() for _c/__c
consistency. Respects per-field enabled flags.
"""

import json
import logging
import time
from typing import Any

from .base import confidence_bucket, normalize_field_key
from .boolean_extractor import BooleanExtractor
from .date_extractor import DateExtractor
from .pattern_extractor import PatternExtractor
from .picklist_extractor import PicklistExtractor
from .split_extractor import SplitExtractor
from .text_extractor import TextExtractor

logger = logging.getLogger(__name__)


def run_extraction(
    full_text: str,
    target_codes: set[str] | None = None,
    contract_id: str | None = None,
    workspace_id: str | None = None,
    call_site: str = "unknown",
) -> dict[str, dict[str, Any]]:
    """Run all extractors against the given text.

    Args:
        full_text: Full contract text to extract from
        target_codes: Optional set of check codes to restrict extraction to
        contract_id: Optional contract ID for metrics tracking
        workspace_id: Optional workspace ID for metrics tracking
        call_site: Caller identifier (kiwi_payload, readiness_map, export_profile)

    Returns:
        dict[str, check_dict] keyed by check_code, with field_key added
    """
    if not full_text:
        return {}

    t0 = time.monotonic()

    # Instantiate all extractors
    boolean_ext = BooleanExtractor()
    split_ext = SplitExtractor()
    picklist_ext = PicklistExtractor()
    date_ext = DateExtractor()
    pattern_ext = PatternExtractor()
    text_ext = TextExtractor()

    results: dict[str, dict[str, Any]] = {}
    extractor_errors: dict[str, str] = {}

    # Count total eligible fields across all extractors
    fields_attempted: int = sum(
        len(getattr(ext, "_fields", getattr(ext, "_entries", {})))
        for ext in [boolean_ext, split_ext, picklist_ext, date_ext, pattern_ext, text_ext]
    )

    # Run each extractor (first extractor wins for each code)
    for ext in [boolean_ext, split_ext, picklist_ext, date_ext, pattern_ext, text_ext]:
        try:
            ext_results = ext.extract(full_text, target_codes=target_codes)
            for code, check in ext_results.items():
                if code not in results:  # first extractor wins
                    check["field_key"] = normalize_field_key(code)
                    results[code] = check
        except Exception as exc:
            ext_name = type(ext).__name__
            logger.warning("Extractor %s failed: %s", ext_name, exc)
            extractor_errors[ext_name] = str(exc)
            continue

    duration_ms = (time.monotonic() - t0) * 1000

    # Record metrics (fire-and-forget, no-op until DB is connected)
    try:
        _record_extraction_metrics(
            contract_id=contract_id,
            workspace_id=workspace_id or "system",
            call_site=call_site,
            text_length_chars=len(full_text),
            duration_ms=duration_ms,
            fields_attempted=fields_attempted,
            fields_extracted=len(results),
            extractor_errors=extractor_errors,
            results=results,
        )
    except Exception as metrics_exc:
        logger.debug("Metrics recording skipped: %s", metrics_exc)

    return results


def _record_extraction_metrics(
    *,
    contract_id: str | None,
    workspace_id: str,
    call_site: str,
    text_length_chars: int,
    duration_ms: float,
    fields_attempted: int,
    fields_extracted: int,
    extractor_errors: dict[str, str],
    results: dict[str, dict[str, Any]],
) -> None:
    """Persist one metrics row to extraction_metrics table.

    Currently a NO-OP stub -- DB integration will be added when the
    database layer is connected. Logs summary at DEBUG level.
    """
    # Build distribution summaries (for future DB storage)
    conf_dist: dict[str, int] = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
    status_dist: dict[str, int] = {}
    field_hit_map: dict[str, str] = {}

    for code, check in results.items():
        conf = check.get("confidence", 0)
        bucket = confidence_bucket(round(conf * 100))
        conf_dist[bucket] = conf_dist.get(bucket, 0) + 1

        st = check.get("status", "unknown")
        status_dist[st] = status_dist.get(st, 0) + 1

        field_hit_map[code] = st

    logger.debug(
        "Extraction metrics: contract=%s call_site=%s duration=%.1fms "
        "attempted=%d extracted=%d conf_dist=%s errors=%s",
        contract_id,
        call_site,
        duration_ms,
        fields_attempted,
        fields_extracted,
        json.dumps(conf_dist),
        json.dumps(extractor_errors),
    )

    if extractor_errors:
        logger.warning(
            "Extractor crashes during extraction: contract=%s errors=%s",
            contract_id,
            json.dumps(extractor_errors),
        )

    if fields_extracted == 0 and text_length_chars > 500:
        logger.warning(
            "Zero extraction coverage on non-trivial document: "
            "contract=%s text_length=%d call_site=%s",
            contract_id,
            text_length_chars,
            call_site,
        )


# ---------------------------------------------------------------------------
# Unified clause library enrichment
# ---------------------------------------------------------------------------


def enrich_from_clause_library() -> list[dict[str, Any]]:
    """Load supplemental extraction config from the unified clause library.

    For each clause variable that has an extraction block, synthesize an
    extraction_anchors-format entry. These can be merged with the existing
    extraction_anchors.json entries to extend coverage for new fields.

    Returns:
        list[dict]: Supplemental extraction entries, each with:
            check_code, field_key, extraction_type, enabled,
            primary_anchors, secondary_anchors, negative_anchors,
            preferred_zones, proximity_chars, confidence_floor, source
    """
    # NO-OP stub: clause library loader not yet ported
    logger.debug("enrich_from_clause_library: clause library not yet available")
    return []
