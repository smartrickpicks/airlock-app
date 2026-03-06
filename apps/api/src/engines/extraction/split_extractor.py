"""SplitExtractor — extracts percentage splits and currency amounts.

Consumes percentage and currency entries from extraction_anchors.json.
Uses anchor-based proximity search: find anchor phrase in text, then
look for a numeric value within proximity_chars of the anchor.

Handles patterns like: 80/20, 80%, eighty percent (80%), $50,000, EUR100,000
"""

import re
from typing import Any

from .base import extract_context, load_config, make_check

# Regex patterns for different value types
_SPLIT_PATTERN: re.Pattern[str] = re.compile(
    r"(\d{1,3})\s*/\s*(\d{1,3})"  # 80/20
    r"|(\d{1,3}(?:\.\d{1,2})?)\s*(?:%|percent)"  # 80% or 80 percent
    r"|(?:(?:one|two|three|four|five|six|seven|eight|nine|ten|"
    r"twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)"
    r"(?:\s*[-]?\s*(?:one|two|three|four|five|six|seven|eight|nine))?)"
    r"\s*(?:percent|\(\d{1,3}%?\))",  # eighty percent or eighty (80%)
    re.IGNORECASE,
)

_CURRENCY_PATTERN: re.Pattern[str] = re.compile(
    r"[$\u20ac\u00a3\u00a5]\s*([\d,]+(?:\.\d{2})?)"  # $50,000.00
    r"|([\d,]+(?:\.\d{2})?)\s*(?:dollars|USD|EUR|GBP|usd|eur|gbp)",
    re.IGNORECASE,
)

_PAREN_PCT: re.Pattern[str] = re.compile(r"\((\d{1,3}(?:\.\d{1,2})?)%?\)")  # (80%) or (80)


class SplitExtractor:
    """Extract percentage splits and currency amounts from contract text."""

    def __init__(self) -> None:
        config = load_config("extraction_anchors.json")
        self._fields: dict[str, dict[str, Any]] = {}
        for entry in config.get("entries", []):
            ext_type = entry.get("extraction_type", "")
            if ext_type in ("percentage", "currency") and entry.get("enabled", True):
                self._fields[entry["check_code"]] = entry

    def extract(
        self, full_text: str, target_codes: set[str] | None = None
    ) -> dict[str, dict[str, Any]]:
        """Extract split/currency values from text.

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
        """Extract a single split or currency field."""
        ext_type: str = field.get("extraction_type", "percentage")
        primary_anchors: list[str] = [a.lower() for a in field.get("primary_anchors", [])]
        secondary_anchors: list[str] = [a.lower() for a in field.get("secondary_anchors", [])]
        negative_anchors: list[str] = [a.lower() for a in field.get("negative_anchors", [])]
        proximity: int = field.get("proximity_chars", 500)

        # Find best anchor hit
        best_pos: int = -1
        best_anchor: str = ""
        anchor_tier: int = 0  # 1=primary, 2=secondary

        for anchor in primary_anchors:
            pos = text_lower.find(anchor)
            if pos >= 0:
                # Check for negative anchors in preceding context only
                # (negative anchors after the anchor are separate mentions)
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
            return None  # No anchor found

        # Search for value near the anchor
        search_start = max(0, best_pos - proximity // 4)
        search_end = min(len(text_lower), best_pos + len(best_anchor) + proximity)
        search_window = full_text[search_start:search_end]

        if ext_type == "currency":
            return self._find_currency(
                code, search_window, best_anchor, anchor_tier, full_text, search_start
            )
        else:
            return self._find_split(
                code, search_window, best_anchor, anchor_tier, full_text, search_start
            )

    def _find_split(
        self,
        code: str,
        window: str,
        anchor: str,
        tier: int,
        full_text: str,
        window_offset: int,
    ) -> dict[str, Any] | None:
        """Find a percentage/split value in the text window."""
        # Try split pattern first (80/20)
        for m in _SPLIT_PATTERN.finditer(window):
            if m.group(1) and m.group(2):
                value = f"{m.group(1)}/{m.group(2)}"
                conf = 0.80 if tier == 1 else 0.65
                ctx = extract_context(full_text, window_offset + m.start(), window_offset + m.end())
                return make_check(
                    code,
                    "pass",
                    conf,
                    value,
                    f"Split '{value}' found near '{anchor}'",
                    evidence_hit_terms=[anchor, value],
                    evidence_context=ctx,
                )
            elif m.group(3):
                value = f"{m.group(3)}%"
                conf = 0.80 if tier == 1 else 0.65
                ctx = extract_context(full_text, window_offset + m.start(), window_offset + m.end())
                return make_check(
                    code,
                    "pass",
                    conf,
                    value,
                    f"Percentage '{value}' found near '{anchor}'",
                    evidence_hit_terms=[anchor, value],
                    evidence_context=ctx,
                )

        # Try parenthetical percentage (80%)
        for m in _PAREN_PCT.finditer(window):
            value = f"{m.group(1)}%"
            conf = 0.75 if tier == 1 else 0.60
            ctx = extract_context(full_text, window_offset + m.start(), window_offset + m.end())
            return make_check(
                code,
                "pass",
                conf,
                value,
                f"Percentage '{value}' found near '{anchor}'",
                evidence_hit_terms=[anchor, value],
                evidence_context=ctx,
            )

        return None

    def _find_currency(
        self,
        code: str,
        window: str,
        anchor: str,
        tier: int,
        full_text: str,
        window_offset: int,
    ) -> dict[str, Any] | None:
        """Find a currency value in the text window."""
        for m in _CURRENCY_PATTERN.finditer(window):
            raw = m.group(1) or m.group(2)
            if raw:
                conf = 0.80 if tier == 1 else 0.65
                ctx = extract_context(full_text, window_offset + m.start(), window_offset + m.end())
                return make_check(
                    code,
                    "pass",
                    conf,
                    m.group(0).strip(),
                    f"Currency value found near '{anchor}'",
                    evidence_hit_terms=[anchor, m.group(0).strip()],
                    evidence_context=ctx,
                )

        return None
