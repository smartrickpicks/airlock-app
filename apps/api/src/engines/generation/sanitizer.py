"""PDF text sanitizer for real contract data."""

from __future__ import annotations

import re

from .fake_data import EntertainmentFaker

_CURRENCY_PATTERN = re.compile(
    r"(?:(?:US?\$|USD|GBP|EUR|£|€)\s*)[\d,]+(?:\.\d{1,2})?|[\d,]+(?:\.\d{1,2})?\s*(?:dollars|USD|GBP|EUR)",
    re.IGNORECASE,
)
_PERCENTAGE_PATTERN = re.compile(r"\b\d{1,3}(?:\.\d{1,2})?\s*%|\b\d{1,3}\s*/\s*\d{1,3}\b")
_DATE_PATTERN = re.compile(
    r"\b(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan\.?|Feb\.?|Mar\.?|Apr\.?|May\.?|Jun\.?|Jul\.?|Aug\.?|Sep\.?|Sept\.?|Oct\.?|Nov\.?|Dec\.?)\s+\d{1,2},?\s+\d{4}"
    r"|\b\d{1,2}/\d{1,2}/\d{2,4}\b"
    r"|\b\d{4}-\d{2}-\d{2}\b"
    r"|\b\d{1,2}(?:st|nd|rd|th)\s+day\s+of\s+\w+,?\s+\d{4}",
    re.IGNORECASE,
)
_PHONE_PATTERN = re.compile(r"\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}")
_EMAIL_PATTERN = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")
_ACCOUNT_PATTERN = re.compile(r"\b\d{8,17}\b")
_STREET_PATTERN = re.compile(
    r"\b\d{1,5}\s+(?:[A-Z][a-z]+\s+){1,3}(?:Street|St\.?|Avenue|Ave\.?|Boulevard|Blvd\.?|Drive|Dr\.?|Road|Rd\.?|Lane|Ln\.?|Way|Court|Ct\.?|Circle|Place|Pl\.?|Parkway|Pkwy\.?)\b",
    re.IGNORECASE,
)
_ZIP_PATTERN = re.compile(r"\b\d{5}(?:-\d{4})?\b")


class PDFSanitizer:
    """Sanitize real contract text by replacing PII with fake data."""

    def __init__(self, seed: int = 42) -> None:
        self.faker = EntertainmentFaker(seed=seed)
        self._date_counter = 0
        self._amount_counter = 0
        self._name_counter = 0

    def sanitize(
        self, text: str, contract_type: str = "distribution"
    ) -> tuple[str, dict[str, str]]:
        """Replace PII in text with deterministic fake data."""
        replacements: dict[str, str] = {}
        result = text

        result = self._replace_emails(result, replacements)
        result = self._replace_phones(result, replacements)
        result = self._replace_dates(result, replacements)
        result = self._replace_currency(result, replacements)
        result = self._replace_accounts(result, replacements)
        result = self._replace_streets(result, replacements)
        result = self._replace_zips(result, replacements)
        return result, replacements

    def _replace_emails(self, text: str, replacements: dict[str, str]) -> str:
        def repl(match: re.Match[str]) -> str:
            original = match.group(0)
            if original not in replacements:
                name = self.faker.person_name().lower().replace(" ", ".")
                domain = self.faker._pick(
                    ["gmail.com", "outlook.com", "company.com", "agency.net", "label.com"]
                )
                replacements[original] = f"{name}@{domain}"
            return replacements[original]

        return _EMAIL_PATTERN.sub(repl, text)

    def _replace_phones(self, text: str, replacements: dict[str, str]) -> str:
        def repl(match: re.Match[str]) -> str:
            original = match.group(0)
            if original not in replacements:
                area = self.faker._rng.randint(200, 999)
                mid = self.faker._rng.randint(200, 999)
                last = self.faker._rng.randint(1000, 9999)
                replacements[original] = f"({area}) {mid}-{last}"
            return replacements[original]

        return _PHONE_PATTERN.sub(repl, text)

    def _replace_dates(self, text: str, replacements: dict[str, str]) -> str:
        def repl(match: re.Match[str]) -> str:
            original = match.group(0)
            if original not in replacements:
                self._date_counter += 1
                year_offset = self._date_counter % 5
                replacements[original] = self.faker.effective_date(
                    2020 + year_offset, 2024 + year_offset
                )
            return replacements[original]

        return _DATE_PATTERN.sub(repl, text)

    def _replace_currency(self, text: str, replacements: dict[str, str]) -> str:
        def repl(match: re.Match[str]) -> str:
            original = match.group(0)
            if original not in replacements:
                self._amount_counter += 1
                base = self.faker._rng.randint(1000, 500_000)
                replacements[original] = f"${base:,}"
            return replacements[original]

        return _CURRENCY_PATTERN.sub(repl, text)

    def _replace_accounts(self, text: str, replacements: dict[str, str]) -> str:
        def repl(match: re.Match[str]) -> str:
            original = match.group(0)
            if len(original) < 8:
                return original
            if original not in replacements:
                replacements[original] = "".join(
                    str(self.faker._rng.randint(0, 9)) for _ in range(len(original))
                )
            return replacements[original]

        return _ACCOUNT_PATTERN.sub(repl, text)

    def _replace_streets(self, text: str, replacements: dict[str, str]) -> str:
        def repl(match: re.Match[str]) -> str:
            original = match.group(0)
            if original not in replacements:
                replacements[original] = self.faker.street_address()
            return replacements[original]

        return _STREET_PATTERN.sub(repl, text)

    def _replace_zips(self, text: str, replacements: dict[str, str]) -> str:
        def repl(match: re.Match[str]) -> str:
            original = match.group(0)
            if original not in replacements:
                _city, _state, zip_code = self.faker.city_state_zip()
                replacements[original] = zip_code
            return replacements[original]

        return _ZIP_PATTERN.sub(repl, text)

    def build_ground_truth(
        self, replacements: dict[str, str], contract_type: str = "distribution"
    ) -> dict[str, str]:
        """Build ground truth labels from the replacement map."""
        del contract_type
        ground_truth: dict[str, str] = {}
        for original, fake in replacements.items():
            if _EMAIL_PATTERN.fullmatch(original):
                ground_truth.setdefault("email__c", fake)
            elif _PHONE_PATTERN.fullmatch(original):
                ground_truth.setdefault("phone__c", fake)
            elif _DATE_PATTERN.fullmatch(original):
                ground_truth.setdefault("effective_date__c", fake)
            elif _CURRENCY_PATTERN.fullmatch(original):
                ground_truth.setdefault("advance_amount__c", fake)
        return ground_truth
