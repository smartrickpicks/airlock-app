"""DateExtractor — extracts date values from contract text.

Consumes date-related entries from extraction_anchors.json.
Uses anchor-based proximity search: find anchor phrase in text,
then search for date patterns within proximity_chars of the anchor.

Handles patterns like: January 15, 2024 / 01/15/2024 / 2024-01-15 /
15th day of January, 2024 / the ___ day of January 2024
"""

import re
from typing import Any

from .base import extract_context, load_config, make_check

# Date patterns (ordered by specificity)
_DATE_PATTERNS: list[re.Pattern[str]] = [
    # ISO: 2024-01-15
    re.compile(r"\b(\d{4})-(\d{1,2})-(\d{1,2})\b"),
    # US slashed: 01/15/2024 or 1/15/2024
    re.compile(r"\b(\d{1,2})/(\d{1,2})/(\d{2,4})\b"),
    # Long form: January 15, 2024 or January 15 2024
    re.compile(
        r"\b(January|February|March|April|May|June|July|August|September|"
        r"October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?[,\s]+(\d{4})\b",
        re.IGNORECASE,
    ),
    # Day-of form: 15th day of January, 2024
    re.compile(
        r"\b(\d{1,2})(?:st|nd|rd|th)?\s+day\s+of\s+"
        r"(January|February|March|April|May|June|July|August|September|"
        r"October|November|December)[,\s]+(\d{4})\b",
        re.IGNORECASE,
    ),
    # Abbreviated: Jan 15, 2024 or Jan. 15, 2024
    re.compile(
        r"\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+"
        r"(\d{1,2})(?:st|nd|rd|th)?[,\s]+(\d{4})\b",
        re.IGNORECASE,
    ),
    # Blank-day form: the ___ day of January 2024 (common in contracts)
    re.compile(
        r"\bthe\s+[_]+\s+day\s+of\s+"
        r"(January|February|March|April|May|June|July|August|September|"
        r"October|November|December)[,\s]+(\d{4})\b",
        re.IGNORECASE,
    ),
]

# First-pass codes we should skip (already extracted by preflight_engine)
_SKIP_CODES: set[str] = {"OPP_EFFECTIVE_DATE"}


class DateExtractor:
    """Extract date values from contract text using anchor-based proximity."""

    def __init__(self) -> None:
        config = load_config("extraction_anchors.json")
        self._fields: dict[str, dict[str, Any]] = {}
        for entry in config.get("entries", []):
            code = entry.get("check_code", "")
            if (
                entry.get("extraction_type") == "date"
                and entry.get("enabled", True)
                and code not in _SKIP_CODES
            ):
                self._fields[code] = entry

    def extract(
        self, full_text: str, target_codes: set[str] | None = None
    ) -> dict[str, dict[str, Any]]:
        """Extract date values from text.

        Args:
            full_text: Full contract text
            target_codes: Optional set of check codes to extract

        Returns:
            dict[str, check_dict] keyed by check_code
        """
        if not full_text:
            return {}

        text_lower = full_text.lower()
        results: dict[str, dict[str, Any]] = {}

        for code, field in self._fields.items():
            if target_codes and code not in target_codes:
                continue

            check = self._extract_one(code, field, text_lower, full_text)
            if check:
                results[code] = check

        return results

    def _extract_one(
        self,
        code: str,
        field: dict[str, Any],
        text_lower: str,
        full_text: str,
    ) -> dict[str, Any] | None:
        """Extract a single date field."""
        primary_anchors: list[str] = [a.lower() for a in field.get("primary_anchors", [])]
        secondary_anchors: list[str] = [a.lower() for a in field.get("secondary_anchors", [])]
        negative_anchors: list[str] = [a.lower() for a in field.get("negative_anchors", [])]
        proximity: int = field.get("proximity_chars", 500)

        # Find best anchor
        best_pos: int = -1
        best_anchor: str = ""
        anchor_tier: int = 0

        for anchor in primary_anchors:
            pos = text_lower.find(anchor)
            if pos >= 0:
                # Check negative anchors in preceding context only
                window_start = max(0, pos - 80)
                window_end = pos + len(anchor)
                context = text_lower[window_start:window_end]
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
                    window_end = pos + len(anchor)
                    context = text_lower[window_start:window_end]
                    if any(neg in context for neg in negative_anchors if neg != anchor):
                        continue
                    best_pos = pos
                    best_anchor = anchor
                    anchor_tier = 2
                    break

        if best_pos < 0:
            return None

        # Search for date near anchor
        search_start = max(0, best_pos - proximity // 4)
        search_end = min(len(full_text), best_pos + len(best_anchor) + proximity)
        search_window = full_text[search_start:search_end]

        return self._find_date(
            code, search_window, best_anchor, anchor_tier, full_text, search_start
        )

    def _find_date(
        self,
        code: str,
        window: str,
        anchor: str,
        tier: int,
        full_text: str,
        window_offset: int,
    ) -> dict[str, Any] | None:
        """Find a date value in the text window."""
        for pattern in _DATE_PATTERNS:
            m = pattern.search(window)
            if m:
                value = m.group(0).strip()
                conf = 0.80 if tier == 1 else 0.65
                ctx = extract_context(full_text, window_offset + m.start(), window_offset + m.end())
                return make_check(
                    code,
                    "pass",
                    conf,
                    value,
                    f"Date '{value}' found near '{anchor}'",
                    evidence_hit_terms=[anchor, value],
                    evidence_context=ctx,
                )

        return None
