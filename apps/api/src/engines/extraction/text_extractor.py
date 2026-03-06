"""TextExtractor — extracts text values using NER, address parsing, and heuristics.

Consumes text-type entries from extraction_anchors.json. Routes fields to
sub-strategies based on check_code:
  - Name fields (ACCT_ARTIST_NAME, etc.) -> spaCy NER for PERSON/ORG entities
  - Music codes (SCH_ISRC, SCH_UPC, SCH_ISWC) -> specific ISO format regex
  - Music text (SCH_ALBUM_NAME, SCH_NAME) -> quoted text or title-case extraction
  - Address components -> usaddress library for parsing
  - Free text (advance details, notes) -> clause-boundary extraction
"""

import logging
import re
from typing import Any

from .base import extract_context, find_anchor, load_config, make_check

logger = logging.getLogger(__name__)

# -- Lazy-loaded optional dependencies --
_nlp: Any = None
_usaddress: Any = None
_pycountry: Any = None


def _get_nlp() -> Any:
    """Lazy-load spaCy model (only when name extraction is needed)."""
    global _nlp
    if _nlp is None:
        try:
            import spacy

            _nlp = spacy.load("en_core_web_sm", disable=["parser", "lemmatizer"])
        except Exception as exc:
            logger.warning("spaCy not available, name extraction disabled: %s", exc)
            _nlp = False  # sentinel: tried and failed
    return _nlp if _nlp is not False else None


def _get_usaddress() -> Any:
    """Lazy-load usaddress library."""
    global _usaddress
    if _usaddress is None:
        try:
            import usaddress as ua

            _usaddress = ua
        except ImportError:
            logger.warning("usaddress not available, address parsing disabled")
            _usaddress = False
    return _usaddress if _usaddress is not False else None


def _get_pycountry() -> Any:
    """Lazy-load pycountry library."""
    global _pycountry
    if _pycountry is None:
        try:
            import pycountry as pc

            _pycountry = pc
        except ImportError:
            logger.warning("pycountry not available, country normalization disabled")
            _pycountry = False
    return _pycountry if _pycountry is not False else None


# -- Field classification sets --
_NAME_CODES: set[str] = {
    "ACCT_ARTIST_NAME_PKA_OR_DBA",
    "ACCT_ACCOUNT_NAME",
    "ACCT_COMPANY_NAME",
    "ACCT_LEGAL_NAME",
    "ACCT_LEGAL_FIRST_NAME",
    "ACCT_LEGAL_LAST_NAME",
    "ACCT_ARTISTS",
    "SCH_ARTIST_NAME",
    "SCH_WRITER_NAME",
    "SCH_REMIXER",
}

_MUSIC_CODE_PATTERNS: dict[str, re.Pattern[str]] = {
    "SCH_ISRC": re.compile(r"[A-Z]{2}[A-Z0-9]{3}\d{2}\d{5}"),
    "SCH_ISWC": re.compile(r"T[-\u2013]\d{9,10}[-\u2013]\d"),
    "SCH_UPC": re.compile(r"\b\d{12,13}\b"),
}

_MUSIC_TEXT_CODES: set[str] = {"SCH_ALBUM_NAME", "SCH_NAME"}

_ADDRESS_COMPONENT_CODES: set[str] = {
    "ACCT_BILLING_STREET",
    "ACCT_BILLING_CITY",
    "ACCT_BILLING_STATE_PROVINCE",
    "ACCT_BILLING_ZIP_POSTAL_CODE",
    "ACCT_BILLING_COUNTRY",
}

# -- Shared patterns --
_QUOTE_PATTERN: re.Pattern[str] = re.compile(
    r'["\u201c]([^"\u201d]{3,200})["\u201d]'
    r"|'([^']{3,150})'"
    r"|\u00ab([^\u00bb]{3,200})\u00bb",
    re.DOTALL,
)

_CLAUSE_BOUNDARIES: re.Pattern[str] = re.compile(r"[.;:\n]|\)\s")

_CAP_WORDS: re.Pattern[str] = re.compile(r"(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)")

# Address-related: zip, street suffix patterns
_ZIP_PATTERN: re.Pattern[str] = re.compile(r"\b\d{5}(?:-\d{4})?\b")
_US_STATE_ABBREVS: set[str] = {
    "AL",
    "AK",
    "AZ",
    "AR",
    "CA",
    "CO",
    "CT",
    "DE",
    "FL",
    "GA",
    "HI",
    "ID",
    "IL",
    "IN",
    "IA",
    "KS",
    "KY",
    "LA",
    "ME",
    "MD",
    "MA",
    "MI",
    "MN",
    "MS",
    "MO",
    "MT",
    "NE",
    "NV",
    "NH",
    "NJ",
    "NM",
    "NY",
    "NC",
    "ND",
    "OH",
    "OK",
    "OR",
    "PA",
    "RI",
    "SC",
    "SD",
    "TN",
    "TX",
    "UT",
    "VT",
    "VA",
    "WA",
    "WV",
    "WI",
    "WY",
    "DC",
}


class TextExtractor:
    """Extract text values from contract text using sub-strategies."""

    def __init__(self) -> None:
        config = load_config("extraction_anchors.json")
        self._fields: dict[str, dict[str, Any]] = {}
        for entry in config.get("entries", []):
            if entry.get("extraction_type") == "text" and entry.get("enabled", True):
                self._fields[entry["check_code"]] = entry

    def extract(
        self, full_text: str, target_codes: set[str] | None = None
    ) -> dict[str, dict[str, Any]]:
        """Extract text values from text.

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

            check = self._route(code, field, text_lower, full_text)
            if check:
                results[code] = check

        return results

    def _route(
        self,
        code: str,
        field: dict[str, Any],
        text_lower: str,
        full_text: str,
    ) -> dict[str, Any] | None:
        """Route to the appropriate sub-strategy based on field code."""
        if code in _MUSIC_CODE_PATTERNS:
            return self._extract_music_code(code, field, text_lower, full_text)
        if code in _NAME_CODES:
            return self._extract_name(code, field, text_lower, full_text)
        if code in _MUSIC_TEXT_CODES:
            return self._extract_quoted_or_title(code, field, text_lower, full_text)
        if code in _ADDRESS_COMPONENT_CODES:
            return self._extract_address_component(code, field, text_lower, full_text)
        return self._extract_clause(code, field, text_lower, full_text)

    # -- Music code extraction (ISRC, ISWC, UPC) --

    def _extract_music_code(
        self,
        code: str,
        field: dict[str, Any],
        text_lower: str,
        full_text: str,
    ) -> dict[str, Any] | None:
        """Extract ISO music codes with specific regex patterns."""
        anchor_result = find_anchor(field, text_lower)
        if not anchor_result:
            return None

        best_pos, best_anchor, tier = anchor_result
        proximity: int = field.get("proximity_chars", 300)
        search_start = max(0, best_pos - proximity // 4)
        search_end = min(len(full_text), best_pos + len(best_anchor) + proximity)
        window = full_text[search_start:search_end]

        pattern = _MUSIC_CODE_PATTERNS[code]
        m = pattern.search(window)
        if not m:
            return None

        value = m.group(0).strip()
        conf = 0.90 if tier == 1 else 0.75
        ctx = extract_context(full_text, search_start + m.start(), search_start + m.end())
        return make_check(
            code,
            "pass",
            conf,
            value,
            f"Music code pattern near '{best_anchor}'",
            evidence_hit_terms=[best_anchor, value],
            evidence_context=ctx,
        )

    # -- Name extraction (spaCy NER + fallbacks) --

    def _extract_name(
        self,
        code: str,
        field: dict[str, Any],
        text_lower: str,
        full_text: str,
    ) -> dict[str, Any] | None:
        """Extract person/org names using spaCy NER then fallbacks."""
        anchor_result = find_anchor(field, text_lower)
        if not anchor_result:
            return None

        best_pos, best_anchor, tier = anchor_result
        proximity: int = field.get("proximity_chars", 300)
        search_start = max(0, best_pos - proximity // 4)
        search_end = min(len(full_text), best_pos + len(best_anchor) + proximity)
        window = full_text[search_start:search_end]

        # Strategy 1: spaCy NER
        nlp = _get_nlp()
        if nlp:
            value = self._ner_extract(code, window, best_anchor)
            if value:
                conf = 0.80 if tier == 1 else 0.65
                ctx = extract_context(full_text, search_start, search_end)
                return make_check(
                    code,
                    "pass",
                    conf,
                    value,
                    f"NER entity near '{best_anchor}'",
                    evidence_hit_terms=[best_anchor, value],
                    evidence_context=ctx,
                )

        # Strategy 2: Quoted text near anchor
        value = self._find_quoted(window)
        if value:
            conf = 0.75 if tier == 1 else 0.60
            ctx = extract_context(full_text, search_start, search_end)
            return make_check(
                code,
                "pass",
                conf,
                value,
                f"Quoted text near '{best_anchor}'",
                evidence_hit_terms=[best_anchor, value],
                evidence_context=ctx,
            )

        # Strategy 3: Capitalized word sequence
        value = self._find_capitalized(window, best_anchor)
        if value:
            conf = 0.65 if tier == 1 else 0.50
            ctx = extract_context(full_text, search_start, search_end)
            return make_check(
                code,
                "pass",
                conf,
                value,
                f"Capitalized name near '{best_anchor}'",
                evidence_hit_terms=[best_anchor, value],
                evidence_context=ctx,
            )

        return None

    def _ner_extract(self, code: str, window: str, anchor: str) -> str | None:
        """Find the nearest PERSON or ORG entity to the anchor in the window."""
        nlp = _get_nlp()
        if not nlp:
            return None

        doc = nlp(window)
        target_labels: set[str] = {"PERSON", "ORG"}
        if code in ("ACCT_LEGAL_FIRST_NAME", "ACCT_LEGAL_LAST_NAME"):
            target_labels = {"PERSON"}
        elif code in ("ACCT_COMPANY_NAME",):
            target_labels = {"ORG"}

        # Find anchor position in window
        anchor_pos = window.lower().find(anchor.lower())
        if anchor_pos < 0:
            anchor_pos = 0

        best_ent: Any = None
        best_dist: float = float("inf")

        for ent in doc.ents:
            if ent.label_ not in target_labels:
                continue
            # Skip very short entities (likely noise)
            if len(ent.text.strip()) < 2:
                continue
            dist = abs(ent.start_char - anchor_pos)
            if dist < best_dist:
                best_dist = dist
                best_ent = ent

        if not best_ent:
            return None

        value: str = best_ent.text.strip()

        # For first/last name, try to split
        if code == "ACCT_LEGAL_FIRST_NAME" and " " in value:
            value = value.split()[0]
        elif code == "ACCT_LEGAL_LAST_NAME" and " " in value:
            value = value.split()[-1]

        return value if len(value) >= 2 else None

    # -- Quoted text / title-case extraction --

    def _extract_quoted_or_title(
        self,
        code: str,
        field: dict[str, Any],
        text_lower: str,
        full_text: str,
    ) -> dict[str, Any] | None:
        """Extract quoted text or title-cased phrases near anchor."""
        anchor_result = find_anchor(field, text_lower)
        if not anchor_result:
            return None

        best_pos, best_anchor, tier = anchor_result
        proximity: int = field.get("proximity_chars", 300)
        search_start = max(0, best_pos - proximity // 4)
        search_end = min(len(full_text), best_pos + len(best_anchor) + proximity)
        window = full_text[search_start:search_end]

        # Try quoted text first
        value = self._find_quoted(window)
        if value:
            conf = 0.80 if tier == 1 else 0.65
            ctx = extract_context(full_text, search_start, search_end)
            return make_check(
                code,
                "pass",
                conf,
                value,
                f"Quoted text near '{best_anchor}'",
                evidence_hit_terms=[best_anchor, value],
                evidence_context=ctx,
            )

        # Try capitalized word sequence
        value = self._find_capitalized(window, best_anchor)
        if value:
            conf = 0.70 if tier == 1 else 0.55
            ctx = extract_context(full_text, search_start, search_end)
            return make_check(
                code,
                "pass",
                conf,
                value,
                f"Title text near '{best_anchor}'",
                evidence_hit_terms=[best_anchor, value],
                evidence_context=ctx,
            )

        return None

    # -- Address component extraction --

    def _extract_address_component(
        self,
        code: str,
        field: dict[str, Any],
        text_lower: str,
        full_text: str,
    ) -> dict[str, Any] | None:
        """Extract address components using usaddress library."""
        # First find the address anchor (ACCT_BILLING_ADDRESS)
        anchor_result = find_anchor(field, text_lower)
        if not anchor_result:
            return None

        best_pos, best_anchor, tier = anchor_result
        proximity: int = field.get("proximity_chars", 400)
        search_start = max(0, best_pos - proximity // 4)
        search_end = min(len(full_text), best_pos + len(best_anchor) + proximity)
        window = full_text[search_start:search_end]

        # Route to specific component extractor
        if code == "ACCT_BILLING_ZIP_POSTAL_CODE":
            return self._extract_zip(code, window, best_anchor, tier, full_text, search_start)
        if code == "ACCT_BILLING_COUNTRY":
            return self._extract_country(code, window, best_anchor, tier, full_text, search_start)
        if code == "ACCT_BILLING_STATE_PROVINCE":
            return self._extract_state(code, window, best_anchor, tier, full_text, search_start)

        # For street and city, try usaddress
        ua = _get_usaddress()
        if ua:
            return self._extract_with_usaddress(
                code, window, best_anchor, tier, full_text, search_start
            )

        return None

    def _extract_zip(
        self,
        code: str,
        window: str,
        anchor: str,
        tier: int,
        full_text: str,
        offset: int,
    ) -> dict[str, Any] | None:
        """Extract zip/postal code from window."""
        m = _ZIP_PATTERN.search(window)
        if not m:
            return None
        value = m.group(0)
        conf = 0.80 if tier == 1 else 0.65
        ctx = extract_context(full_text, offset + m.start(), offset + m.end())
        return make_check(
            code,
            "pass",
            conf,
            value,
            f"Zip code near '{anchor}'",
            evidence_hit_terms=[anchor, value],
            evidence_context=ctx,
        )

    def _extract_country(
        self,
        code: str,
        window: str,
        anchor: str,
        tier: int,
        full_text: str,
        offset: int,
    ) -> dict[str, Any] | None:
        """Extract country name from window using pycountry."""
        pc = _get_pycountry()
        if not pc:
            return None

        # Search for known country names in the window
        for country in pc.countries:
            name: str = country.name
            pos = window.lower().find(name.lower())
            if pos >= 0:
                conf = 0.80 if tier == 1 else 0.65
                ctx = extract_context(full_text, offset + pos, offset + pos + len(name))
                return make_check(
                    code,
                    "pass",
                    conf,
                    name,
                    f"Country '{name}' near '{anchor}'",
                    evidence_hit_terms=[anchor, name],
                    evidence_context=ctx,
                )
        return None

    def _extract_state(
        self,
        code: str,
        window: str,
        anchor: str,
        tier: int,
        full_text: str,
        offset: int,
    ) -> dict[str, Any] | None:
        """Extract US state abbreviation from window."""
        for m in re.finditer(r"\b([A-Z]{2})\b", window):
            if m.group(1) in _US_STATE_ABBREVS:
                value = m.group(1)
                conf = 0.70 if tier == 1 else 0.55
                ctx = extract_context(full_text, offset + m.start(), offset + m.end())
                return make_check(
                    code,
                    "pass",
                    conf,
                    value,
                    f"State abbreviation near '{anchor}'",
                    evidence_hit_terms=[anchor, value],
                    evidence_context=ctx,
                )
        return None

    def _extract_with_usaddress(
        self,
        code: str,
        window: str,
        anchor: str,
        tier: int,
        full_text: str,
        offset: int,
    ) -> dict[str, Any] | None:
        """Extract street/city using usaddress library."""
        ua = _get_usaddress()
        if not ua:
            return None

        try:
            tagged, _ = ua.tag(window)
        except Exception:
            return None

        if code == "ACCT_BILLING_STREET":
            parts: list[str] = []
            for key in (
                "AddressNumber",
                "StreetNamePreDirectional",
                "StreetName",
                "StreetNamePostType",
                "OccupancyType",
                "OccupancyIdentifier",
            ):
                if key in tagged:
                    parts.append(tagged[key])
            value = " ".join(parts).strip()
        elif code == "ACCT_BILLING_CITY":
            value = tagged.get("PlaceName", "").strip()
        else:
            return None

        if not value or len(value) < 2:
            return None

        conf = 0.70 if tier == 1 else 0.55
        ctx = extract_context(full_text, offset, offset + len(window))
        return make_check(
            code,
            "pass",
            conf,
            value,
            f"Address component near '{anchor}'",
            evidence_hit_terms=[anchor, value],
            evidence_context=ctx,
        )

    # -- Free text / clause extraction --

    def _extract_clause(
        self,
        code: str,
        field: dict[str, Any],
        text_lower: str,
        full_text: str,
    ) -> dict[str, Any] | None:
        """Extract free text up to the next clause boundary."""
        anchor_result = find_anchor(field, text_lower)
        if not anchor_result:
            return None

        best_pos, best_anchor, tier = anchor_result
        proximity: int = field.get("proximity_chars", 400)

        # Start after the anchor phrase
        clause_start = best_pos + len(best_anchor)
        clause_end = min(len(full_text), clause_start + proximity)
        after_anchor = full_text[clause_start:clause_end]

        # Skip leading whitespace and punctuation
        after_anchor = after_anchor.lstrip(" \t:,;-\u2013\u2014")

        # Find clause boundary
        boundary = _CLAUSE_BOUNDARIES.search(after_anchor)
        if boundary:
            value = after_anchor[: boundary.start()].strip()
        else:
            # No boundary found -- take up to 200 chars, truncate at word
            value = after_anchor[:200].strip()
            last_space = value.rfind(" ")
            if last_space > 50:
                value = value[:last_space]

        if not value or len(value) < 3:
            return None

        # Cap at 200 chars
        if len(value) > 200:
            value = value[:197] + "..."

        conf = 0.60 if tier == 1 else 0.45
        ctx = extract_context(full_text, clause_start, clause_start + len(value))
        return make_check(
            code,
            "pass",
            conf,
            value,
            f"Clause text after '{best_anchor}'",
            evidence_hit_terms=[best_anchor, value[:50]],
            evidence_context=ctx,
        )

    # -- Shared helpers --

    def _find_quoted(self, window: str) -> str | None:
        """Find quoted text in the window."""
        m = _QUOTE_PATTERN.search(window)
        if m:
            value = (m.group(1) or m.group(2) or m.group(3) or "").strip()
            if len(value) >= 2:
                return value
        return None

    def _find_capitalized(self, window: str, anchor: str) -> str | None:
        """Find capitalized word sequences, excluding the anchor itself."""
        anchor_lower = anchor.lower()
        for m in _CAP_WORDS.finditer(window):
            candidate = m.group(0).strip()
            if candidate.lower() == anchor_lower:
                continue
            if len(candidate) >= 3:
                return candidate
        return None
