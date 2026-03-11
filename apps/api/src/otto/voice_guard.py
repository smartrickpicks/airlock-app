"""Anti-sycophancy response guard for Otto voice enforcement.

Scans Otto responses for sycophantic patterns and strips them.
Patterns sourced from otto-voice-baseline.md and persona-drift-prevention.md.

Wire into the LLM response pipeline when it's built (M25 LLM integration).
Until then, available as a utility for testing and validation.

Usage:
    from src.otto.voice_guard import clean_response, check_sycophancy

    # Check for violations (returns list of matched patterns)
    violations = check_sycophancy(response_text)

    # Strip sycophantic patterns from a response
    cleaned = clean_response(response_text)
"""

import re

# ---------------------------------------------------------------------------
# Detection patterns — used by check_sycophancy() to flag violations.
# These are broader than the cleaning patterns because detection is informational.
# ---------------------------------------------------------------------------

# Each tuple: (compiled regex, human-readable label)
SYCOPHANCY_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\bgreat question\b", re.IGNORECASE), "Great question!"),
    (re.compile(r"\bgood question\b", re.IGNORECASE), "Good question!"),
    (re.compile(r"\bexcellent question\b", re.IGNORECASE), "Excellent question!"),
    (re.compile(r"\bi'?d be happy to help\b", re.IGNORECASE), "I'd be happy to help"),
    (re.compile(r"\bhappy to assist\b", re.IGNORECASE), "Happy to assist"),
    (re.compile(r"\babsolutely\s*!", re.IGNORECASE), "Absolutely!"),
    (re.compile(r"\bof course\s*!", re.IGNORECASE), "Of course!"),
    (re.compile(r"\bcertainly\s*!", re.IGNORECASE), "Certainly!"),
    (
        re.compile(
            r"\bthat'?s a (?:great|fantastic|wonderful|excellent) (?:idea|point|question)\b",
            re.IGNORECASE,
        ),
        "That's a great idea/point",
    ),
    (
        re.compile(r"\bi apologize for (?:the |any )?confusion\b", re.IGNORECASE),
        "I apologize for the confusion",
    ),
    (
        re.compile(r"\bthat'?s (?:a )?really (?:interesting|insightful)\b", re.IGNORECASE),
        "That's really interesting",
    ),
    (re.compile(r"\blet me think about that\b", re.IGNORECASE), "Let me think about that"),
    (re.compile(r"\bto be honest\b", re.IGNORECASE), "To be honest"),
]

# Enthusiasm exclamation: sentences starting with a short exclamatory phrase
_ENTHUSIASM_BANG = re.compile(
    r"(?:^|\n)(?:Wow|Amazing|Awesome|Perfect|Fantastic|Wonderful|Brilliant|Love it|Nice)\s*!",
    re.IGNORECASE,
)

# ---------------------------------------------------------------------------
# Cleaning patterns — scoped to sentence-initial position to avoid corrupting
# mid-sentence usage of phrases like "to be honest" or "let me think about that".
# ---------------------------------------------------------------------------

_SENTENCE_START_PATTERNS: list[re.Pattern[str]] = [
    # Sentence-initial sycophancy (preceded by start-of-string, newline, or period+space)
    re.compile(r"(?:^|(?<=\.\s)|(?<=\n))Great question[!.]?\s*", re.IGNORECASE),
    re.compile(r"(?:^|(?<=\.\s)|(?<=\n))Good question[!.]?\s*", re.IGNORECASE),
    re.compile(r"(?:^|(?<=\.\s)|(?<=\n))Excellent question[!.]?\s*", re.IGNORECASE),
    re.compile(r"(?:^|(?<=\.\s)|(?<=\n))I'?d be happy to help[!.]?\s*", re.IGNORECASE),
    re.compile(r"(?:^|(?<=\.\s)|(?<=\n))Happy to assist[!.]?\s*", re.IGNORECASE),
    re.compile(r"(?:^|(?<=\.\s)|(?<=\n))Absolutely!\s*", re.IGNORECASE),
    re.compile(r"(?:^|(?<=\.\s)|(?<=\n))Of course!\s*", re.IGNORECASE),
    re.compile(r"(?:^|(?<=\.\s)|(?<=\n))Certainly!\s*", re.IGNORECASE),
    re.compile(
        r"(?:^|(?<=\.\s)|(?<=\n))That'?s a (?:great|fantastic|wonderful|excellent) (?:idea|point|question)[!.]?\s*",
        re.IGNORECASE,
    ),
    re.compile(
        r"(?:^|(?<=\.\s)|(?<=\n))I apologize for (?:the |any )?confusion[!.]?\s*", re.IGNORECASE
    ),
    re.compile(
        r"(?:^|(?<=\.\s)|(?<=\n))That'?s (?:a )?really (?:interesting|insightful)[!.]?\s*",
        re.IGNORECASE,
    ),
    re.compile(r"(?:^|(?<=\.\s)|(?<=\n))Let me think about that[!.]?\s*", re.IGNORECASE),
    re.compile(r"(?:^|(?<=\.\s)|(?<=\n))To be honest,?\s*", re.IGNORECASE),
]

# Enthusiasm bang — uses lookahead so the newline itself is preserved
_ENTHUSIASM_BANG_CLEAN = re.compile(
    r"(?<=\n)(?:Wow|Amazing|Awesome|Perfect|Fantastic|Wonderful|Brilliant|Love it|Nice)\s*!\s*",
    re.IGNORECASE,
)
_ENTHUSIASM_BANG_START = re.compile(
    r"^(?:Wow|Amazing|Awesome|Perfect|Fantastic|Wonderful|Brilliant|Love it|Nice)\s*!\s*",
    re.IGNORECASE,
)


def check_sycophancy(text: str) -> list[str]:
    """Return list of matched sycophantic pattern labels found in *text*.

    Empty list means the text is clean.
    """
    violations: list[str] = []
    for pattern, label in SYCOPHANCY_PATTERNS:
        if pattern.search(text):
            violations.append(label)
    if _ENTHUSIASM_BANG.search(text):
        violations.append("Enthusiasm exclamation")
    return violations


def clean_response(text: str) -> str:
    """Strip sycophantic patterns from an Otto response.

    Only removes patterns at sentence boundaries to avoid corrupting
    mid-sentence phrases. Collapses resulting whitespace artifacts.
    """
    cleaned = text

    # Remove sentence-initial sycophancy
    for pattern in _SENTENCE_START_PATTERNS:
        cleaned = pattern.sub("", cleaned)

    # Remove enthusiasm bangs (preserve newlines)
    cleaned = _ENTHUSIASM_BANG_START.sub("", cleaned)
    cleaned = _ENTHUSIASM_BANG_CLEAN.sub("", cleaned)

    # Collapse artifacts: double spaces, leading spaces on lines, blank line runs
    cleaned = re.sub(r"  +", " ", cleaned)
    cleaned = re.sub(r"(?m)^ +", "", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()
