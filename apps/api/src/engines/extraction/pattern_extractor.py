"""PatternExtractor — generic anchor-proximity extractor for number/url/email fields.

Consumes entries from extraction_anchors.json where extraction_type is one of
'number', 'url', or 'email'. Uses the same anchor-based proximity search as
SplitExtractor and DateExtractor, applying the entry's value_pattern regex
within the anchor's proximity window.
"""

import logging
import re
from typing import Any

from .base import extract_context, find_anchor, load_config, make_check

logger = logging.getLogger(__name__)

# Types this extractor handles — all have well-bounded regex patterns
_HANDLED_TYPES: set[str] = {"number", "url", "email"}


class PatternExtractor:
    """Extract number, URL, and email values from contract text."""

    def __init__(self) -> None:
        config = load_config("extraction_anchors.json")
        self._fields: dict[str, dict[str, Any]] = {}
        for entry in config.get("entries", []):
            ext_type = entry.get("extraction_type", "")
            if ext_type in _HANDLED_TYPES and entry.get("enabled", True):
                code: str = entry["check_code"]
                # Pre-compile the value_pattern for performance
                pattern_str: str = entry.get("value_pattern", "")
                if not pattern_str:
                    continue
                try:
                    entry["_compiled_pattern"] = re.compile(pattern_str, re.IGNORECASE)
                except re.error:
                    logger.warning("Invalid value_pattern for %s: %s", code, pattern_str)
                    continue
                self._fields[code] = entry

    def extract(
        self, full_text: str, target_codes: set[str] | None = None
    ) -> dict[str, dict[str, Any]]:
        """Extract number/url/email values from text.

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
        """Extract a single field using anchor proximity + value_pattern."""
        anchor_result = find_anchor(field, text_lower)
        if not anchor_result:
            return None

        best_pos, best_anchor, tier = anchor_result
        proximity: int = field.get("proximity_chars", 400)

        # Asymmetric window: look back 1/4, forward full proximity
        search_start = max(0, best_pos - proximity // 4)
        search_end = min(len(full_text), best_pos + len(best_anchor) + proximity)
        window = full_text[search_start:search_end]

        # Apply compiled value_pattern in the window
        pattern: re.Pattern[str] | None = field.get("_compiled_pattern")
        if not pattern:
            return None

        m = pattern.search(window)
        if not m:
            return None

        value = m.group(0).strip()
        if not value:
            return None

        # Skip trivially short number matches that are likely noise
        ext_type: str = field.get("extraction_type", "")
        if ext_type == "number" and len(value) == 1 and value == "0":
            return None

        conf = 0.80 if tier == 1 else 0.65
        ctx = extract_context(full_text, search_start + m.start(), search_start + m.end())
        return make_check(
            code,
            "pass",
            conf,
            value,
            f"Pattern match near '{best_anchor}'",
            evidence_hit_terms=[best_anchor, value],
            evidence_context=ctx,
        )
