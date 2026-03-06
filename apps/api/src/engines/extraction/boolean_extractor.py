"""BooleanExtractor — detects Yes/No toggle fields from contract text.

Consumes boolean_signals.json. Scans text for yes_signals/no_signals
near field-specific anchor phrases. Returns Yes/No with confidence.

These are toggle parents that gate downstream fields via conditional_toggles.json.
"""

import re
from typing import Any

from .base import extract_context, load_config, make_check


class BooleanExtractor:
    """Extract boolean/toggle field values from contract text."""

    def __init__(self) -> None:
        config = load_config("boolean_signals.json")
        self._fields: dict[str, dict[str, Any]] = config.get("fields", {})

    def extract(
        self, full_text: str, target_codes: set[str] | None = None
    ) -> dict[str, dict[str, Any]]:
        """Extract boolean values from text.

        Args:
            full_text: Full contract text (lowercase matching is internal)
            target_codes: Optional set of check codes to extract (None = all)

        Returns:
            dict[str, check_dict] keyed by check_code
        """
        if not full_text:
            return {}

        text_lower = full_text.lower()
        results: dict[str, dict[str, Any]] = {}

        for code, field in self._fields.items():
            if not field.get("enabled", True):
                continue
            if target_codes and code not in target_codes:
                continue

            check = self._extract_one(code, field, text_lower)
            if check:
                results[code] = check

        return results

    def _extract_one(
        self, code: str, field: dict[str, Any], text_lower: str
    ) -> dict[str, Any] | None:
        """Extract a single boolean field."""
        yes_signals: list[str] = [s.lower() for s in field.get("yes_signals", [])]
        no_signals: list[str] = [s.lower() for s in field.get("no_signals", [])]

        yes_hits: list[str] = []
        no_hits: list[str] = []
        first_match_pos: int = -1

        for signal in yes_signals:
            m = re.search(r"\b" + re.escape(signal) + r"\b", text_lower)
            if m:
                yes_hits.append(signal)
                if first_match_pos < 0:
                    first_match_pos = m.start()

        for signal in no_signals:
            m = re.search(r"\b" + re.escape(signal) + r"\b", text_lower)
            if m:
                no_hits.append(signal)
                if first_match_pos < 0:
                    first_match_pos = m.start()

        conf_found: int = field.get("confidence_when_found", 80)
        conf_default: int = field.get("confidence_default", 70)

        # Build evidence context from first match position
        ctx: str | None = None
        if first_match_pos >= 0:
            first_term = (yes_hits or no_hits)[0]
            ctx = extract_context(text_lower, first_match_pos, first_match_pos + len(first_term))

        if yes_hits and not no_hits:
            return make_check(
                code,
                "pass",
                conf_found / 100.0,
                "Yes",
                f"Found yes signals: {', '.join(yes_hits[:3])}",
                evidence_hit_terms=yes_hits,
                evidence_context=ctx,
            )

        if no_hits and not yes_hits:
            return make_check(
                code,
                "pass",
                conf_found / 100.0,
                "No",
                f"Found no signals: {', '.join(no_hits[:3])}",
                evidence_hit_terms=no_hits,
                evidence_context=ctx,
            )

        if yes_hits and no_hits:
            if len(yes_hits) > len(no_hits):
                return make_check(
                    code,
                    "review",
                    0.55,
                    "Yes",
                    f"Ambiguous: yes={len(yes_hits)}, no={len(no_hits)}",
                    evidence_hit_terms=yes_hits + no_hits,
                    evidence_context=ctx,
                )
            else:
                return make_check(
                    code,
                    "review",
                    0.55,
                    "No",
                    f"Ambiguous: yes={len(yes_hits)}, no={len(no_hits)}",
                    evidence_hit_terms=yes_hits + no_hits,
                    evidence_context=ctx,
                )

        # No signals found — use default
        default_val: str = field.get("default_if_absent", "No")
        return make_check(
            code,
            "suggested",
            conf_default / 100.0,
            default_val,
            f"No signals found, using default: {default_val}",
        )
