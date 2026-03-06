"""PicklistExtractor — matches contract text to canonical Salesforce enum values.

Consumes picklist_synonyms.json (which includes both picklist and term entries).
Uses rapidfuzz for fuzzy matching of contract language against canonical options
and their synonym expansions.

Term-type fields (e.g., "1 Year", "18 Months") also match duration patterns
via regex before falling back to fuzzy match.
"""

import logging
import re
from typing import Any

from .base import extract_context, load_config, make_check

logger = logging.getLogger(__name__)

# Duration pattern: matches "one (1) year", "12 months", "thirty (30) days", etc.
_DURATION_PATTERN: re.Pattern[str] = re.compile(
    r"(?:(?:one|two|three|four|five|six|seven|eight|nine|ten|"
    r"eleven|twelve|eighteen|twenty|thirty|forty|forty-five|"
    r"ninety|hundred|hundred and eighty)"
    r"(?:\s*\(\d+\))?\s*(?:days?|months?|years?)"
    r"|\d+\s*(?:days?|months?|years?))",
    re.IGNORECASE,
)

_PERPETUAL_PATTERN: re.Pattern[str] = re.compile(
    r"in\s+perpetuity|perpetual|life\s+of\s+copyright",
    re.IGNORECASE,
)

# Lazy-load rapidfuzz to avoid hard dependency at import time
_fuzz = None


def _get_fuzz() -> Any:
    """Lazy-load rapidfuzz.fuzz module."""
    global _fuzz
    if _fuzz is None:
        try:
            from rapidfuzz import fuzz as _rf

            _fuzz = _rf
        except ImportError:
            logger.warning("rapidfuzz not available, fuzzy matching disabled in PicklistExtractor")
            _fuzz = False  # sentinel: tried and failed
    return _fuzz if _fuzz is not False else None


class PicklistExtractor:
    """Extract picklist and term values from contract text."""

    def __init__(self) -> None:
        config = load_config("picklist_synonyms.json")
        self._fields: dict[str, dict[str, Any]] = {}
        for code, entry in config.items():
            if code in ("version", "description"):
                continue
            if not isinstance(entry, dict):
                continue
            if entry.get("enabled", True):
                self._fields[code] = entry

    def extract(
        self, full_text: str, target_codes: set[str] | None = None
    ) -> dict[str, dict[str, Any]]:
        """Extract picklist/term values from text.

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

            ext_type: str = field.get("extraction_type", "picklist")
            if ext_type == "term":
                check = self._extract_term(code, field, text_lower)
            else:
                check = self._extract_picklist(code, field, text_lower)

            if check:
                results[code] = check

        return results

    def _extract_picklist(
        self, code: str, field: dict[str, Any], text_lower: str
    ) -> dict[str, Any] | None:
        """Extract a picklist value using synonym matching then fuzzy fallback."""
        synonyms: dict[str, list[str]] = field.get("synonyms", {})
        canonical_options: list[str] = field.get("canonical_options", [])

        # 1. Exact synonym match (highest confidence)
        for canonical, syn_list in synonyms.items():
            for syn in syn_list:
                pos = text_lower.find(syn.lower())
                if pos >= 0:
                    ctx = extract_context(text_lower, pos, pos + len(syn))
                    return make_check(
                        code,
                        "pass",
                        0.85,
                        canonical,
                        f"Synonym '{syn}' matched for '{canonical}'",
                        evidence_hit_terms=[syn, canonical],
                        evidence_context=ctx,
                    )

        # 2. Direct canonical option match
        for opt in canonical_options:
            pos = text_lower.find(opt.lower())
            if pos >= 0:
                ctx = extract_context(text_lower, pos, pos + len(opt))
                return make_check(
                    code,
                    "pass",
                    0.80,
                    opt,
                    f"Canonical option '{opt}' found in text",
                    evidence_hit_terms=[opt],
                    evidence_context=ctx,
                )

        return None

    def _extract_term(
        self, code: str, field: dict[str, Any], text_lower: str
    ) -> dict[str, Any] | None:
        """Extract a term/duration value using patterns then synonym matching."""
        synonyms: dict[str, list[str]] = field.get("synonyms", {})
        canonical_options: list[str] = field.get("canonical_options", [])

        # 1. Exact synonym match first (highest confidence)
        for canonical, syn_list in synonyms.items():
            for syn in syn_list:
                pos = text_lower.find(syn.lower())
                if pos >= 0:
                    ctx = extract_context(text_lower, pos, pos + len(syn))
                    return make_check(
                        code,
                        "pass",
                        0.85,
                        canonical,
                        f"Term synonym '{syn}' matched for '{canonical}'",
                        evidence_hit_terms=[syn, canonical],
                        evidence_context=ctx,
                    )

        # 2. Check for "Perpetual" via pattern
        if "Perpetual" in canonical_options:
            m = _PERPETUAL_PATTERN.search(text_lower)
            if m:
                ctx = extract_context(text_lower, m.start(), m.end())
                return make_check(
                    code,
                    "pass",
                    0.85,
                    "Perpetual",
                    f"Perpetual term detected: '{m.group(0)}'",
                    evidence_hit_terms=[m.group(0), "Perpetual"],
                    evidence_context=ctx,
                )

        # 3. Duration pattern extraction -> match to closest canonical
        for m in _DURATION_PATTERN.finditer(text_lower):
            raw = m.group(0).strip()
            matched = self._match_duration_to_canonical(raw, canonical_options)
            if matched:
                ctx = extract_context(text_lower, m.start(), m.end())
                return make_check(
                    code,
                    "pass",
                    0.75,
                    matched,
                    f"Duration '{raw}' matched to '{matched}'",
                    evidence_hit_terms=[raw, matched],
                    evidence_context=ctx,
                )

        # 4. Direct canonical option match
        for opt in canonical_options:
            pos = text_lower.find(opt.lower())
            if pos >= 0:
                ctx = extract_context(text_lower, pos, pos + len(opt))
                return make_check(
                    code,
                    "pass",
                    0.75,
                    opt,
                    f"Canonical term '{opt}' found in text",
                    evidence_hit_terms=[opt],
                    evidence_context=ctx,
                )

        return None

    def _match_duration_to_canonical(self, raw: str, canonical_options: list[str]) -> str | None:
        """Match a raw duration string to the closest canonical option."""
        raw_lower = raw.lower().strip()

        # Normalize common written numbers
        num_map: dict[str, str] = {
            "one": "1",
            "two": "2",
            "three": "3",
            "four": "4",
            "five": "5",
            "six": "6",
            "seven": "7",
            "eight": "8",
            "nine": "9",
            "ten": "10",
            "eleven": "11",
            "twelve": "12",
            "eighteen": "18",
            "twenty": "20",
            "thirty": "30",
            "forty": "40",
            "forty-five": "45",
            "ninety": "90",
            "hundred": "100",
            "hundred and eighty": "180",
        }

        # Extract number and unit
        number: int | None = None
        unit: str | None = None

        # Try to extract parenthetical number: "one (1) year"
        paren_m = re.search(r"\((\d+)\)", raw_lower)
        if paren_m:
            number = int(paren_m.group(1))
        else:
            # Try numeric at start: "12 months"
            num_m = re.match(r"(\d+)", raw_lower)
            if num_m:
                number = int(num_m.group(1))
            else:
                # Try written number
                for word, digit in num_map.items():
                    if raw_lower.startswith(word):
                        number = int(digit)
                        break

        if "year" in raw_lower:
            unit = "year"
        elif "month" in raw_lower:
            unit = "month"
        elif "day" in raw_lower:
            unit = "day"

        if number is None or unit is None:
            return None

        # Build candidate strings to match against canonical
        candidates: list[str] = []
        if unit == "year":
            candidates.append(f"{number} year" if number == 1 else f"{number} years")
        elif unit == "month":
            candidates.append(f"{number} months" if number != 1 else f"{number} month")
        elif unit == "day":
            candidates.append(f"{number} days" if number != 1 else f"{number} day")

        # Match against canonical options
        for candidate in candidates:
            for opt in canonical_options:
                if opt.lower() == candidate.lower():
                    return opt

        # Fuzzy fallback on canonical
        fuzz_mod = _get_fuzz()
        if fuzz_mod and candidates:
            best_score: float = 0
            best_opt: str | None = None
            for opt in canonical_options:
                score = fuzz_mod.ratio(candidates[0].lower(), opt.lower())
                if score > best_score:
                    best_score = score
                    best_opt = opt

            if best_score >= 70 and best_opt:
                return best_opt

        return None
