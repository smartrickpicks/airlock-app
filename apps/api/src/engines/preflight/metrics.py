"""Text quality metrics and corruption detection.

Computes replacement char ratio, control char ratio, and mojibake ratio
from extracted page text. Also extracts corruption samples for UI display.
"""

from __future__ import annotations

import re

# ── Mojibake detection patterns ──────────────────────────────────────────

_MOJIBAKE_SEQUENCES = [
    "\u00c3\u00a9",
    "\u00c3\u00a0",
    "\u00c3\u00a8",
    "\u00c3\u00b1",
    "\u00c3\u00bc",
    "\u00c3\u00b6",
    "\u00c3\u00a4",
    "\u00c3\u00ad",
    "\u00c3\u00b3",
    "\u00c3\u00ba",
    "\u00c3\u0089",
    "\u00c3\u0096",
    "\u00c3\u009c",
    "\u00c2\u00a0",
    "\u00c2\u00ab",
    "\u00c2\u00bb",
    "\u00c2\u00b7",
    "\u00e2\u0080\u0099",
    "\u00e2\u0080\u009c",
    "\u00e2\u0080\u009d",
    "\u00e2\u0080\u0093",
    "\u00e2\u0080\u0094",
    "\u00e2\u0080\u00a2",
    "\u00e2\u0080\u00a6",
    "\u00ef\u00bf\u00bd",
    "\u00ef\u00ac\u0081",
    "\u00ef\u00ac\u0082",
]

_MOJIBAKE_RE = re.compile(
    r"[\u00c0-\u00c3][\u0080-\u00bf]"
    r"|[\u00e2][\u0080-\u0082][\u0080-\u00bf]"
    r"|[\u00ef][\u00ac\u00bf][\u0080-\u00bf]"
    r"|\ufffe|\ufeff"
    r"|\ufffd"
)

_TOFU_RANGES = re.compile(
    r"[\u2400-\u243f]"
    r"|[\ue000-\uf8ff]"
    r"|[\U000f0000-\U000fffff]"
)

_LATIN_EXT_CLUSTER_RE = re.compile(r"[\u0100-\u024F\u0300-\u036F]{3,}")

_REPLACEMENT_CHAR_RE = re.compile(r"\ufffd")

_CONTROL_CHAR_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")

MAX_CORRUPTION_SAMPLES = 20
SAMPLE_SNIPPET_RADIUS = 40


def compute_text_metrics(
    pages_text: list[str],
) -> tuple[float, float, float]:
    """Compute text quality ratios from page text.

    Returns:
        (replacement_char_ratio, control_char_ratio, mojibake_ratio)
    """
    total_chars = 0
    replacement_chars = 0
    control_chars = 0
    mojibake_chars = 0

    for text in pages_text:
        total_chars += len(text)
        replacement_chars += text.count("\ufffd")
        mojibake_hits = _MOJIBAKE_RE.findall(text)
        mojibake_chars += len(mojibake_hits)
        tofu_hits = _TOFU_RANGES.findall(text)
        mojibake_chars += len(tofu_hits)
        for seq in _MOJIBAKE_SEQUENCES:
            mojibake_chars += text.count(seq)
        for cluster in _LATIN_EXT_CLUSTER_RE.finditer(text):
            mojibake_chars += len(cluster.group())
        for ch in text:
            code = ord(ch)
            if code < 32 and code not in (9, 10, 13):
                control_chars += 1

    if total_chars == 0:
        return 0.0, 0.0, 0.0

    replacement_chars += mojibake_chars
    return (
        replacement_chars / total_chars,
        control_chars / total_chars,
        mojibake_chars / total_chars,
    )


def extract_corruption_samples(
    pages_text: list[str],
    max_samples: int = MAX_CORRUPTION_SAMPLES,
) -> list[dict]:
    """Extract sample corruption snippets for UI display."""
    samples: list[dict] = []

    scanners = [
        (_REPLACEMENT_CHAR_RE, "replacement_char"),
        (_CONTROL_CHAR_RE, "control_char"),
        (_LATIN_EXT_CLUSTER_RE, "latin_ext_cluster"),
        (_MOJIBAKE_RE, "mojibake_sequence"),
    ]

    for page_idx, text in enumerate(pages_text):
        if len(samples) >= max_samples:
            break
        page_num = page_idx + 1
        for pattern, issue_type in scanners:
            if len(samples) >= max_samples:
                break
            for m in pattern.finditer(text):
                if len(samples) >= max_samples:
                    break
                start = max(0, m.start() - SAMPLE_SNIPPET_RADIUS)
                end = min(len(text), m.end() + SAMPLE_SNIPPET_RADIUS)
                samples.append(
                    {
                        "page": page_num,
                        "issue_type": issue_type,
                        "char_start": m.start(),
                        "char_end": m.end(),
                        "snippet": text[start:end],
                    }
                )

    return samples
