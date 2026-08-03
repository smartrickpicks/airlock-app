"""LLM extraction for the Day-1 three-question imprint flow."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

import yaml


ROOT = Path(__file__).resolve().parent
DRIVE_SIGNALS = yaml.safe_load((ROOT / "drive-signals.yaml").read_text()) or {}
LANGUAGE_SIGNALS = DRIVE_SIGNALS["language_style_signals"]
BASE = "https://openrouter.ai/api/v1"


class ImprintExtractionError(RuntimeError):
    """Raised when the language-style extractor cannot return valid JSON."""


@dataclass(frozen=True)
class LanguageStyle:
    cls: Literal["high_extraversion", "low_extraversion"]
    confidence: float
    reasoning: str
    raw_indicators: list[str]


def _indicator_block() -> str:
    high = "\n".join(f"- {item}" for item in LANGUAGE_SIGNALS["high_extraversion"]["indicators"])
    low = "\n".join(f"- {item}" for item in LANGUAGE_SIGNALS["low_extraversion"]["indicators"])
    return f"""high_extraversion indicators:
{high}

low_extraversion indicators:
{low}"""


SYSTEM = """You classify the language style of a user's answer to:
"What are you here to accomplish?"

Use ONLY these indicators from drive-signals.yaml:
""" + _indicator_block() + """

Return STRICT JSON:
{
  "cls": "high_extraversion|low_extraversion",
  "confidence": 0.0-1.0,
  "reasoning": "<brief explanation>",
  "raw_indicators": ["<matched indicator or textual cue>", "..."]
}
"""


def extract_language_style(
    q1_text: str,
    model: str = "anthropic/claude-haiku-4-5",
) -> LanguageStyle:
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise ImprintExtractionError(
            "OPENROUTER_API_KEY missing from env. Load from airlock-config/secrets/.env.constellation"
        )
    from openai import OpenAI

    client = OpenAI(base_url=BASE, api_key=api_key)
    resp = client.chat.completions.create(
        model=model,
        temperature=0,
        messages=[
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": q1_text},
        ],
        response_format={"type": "json_object"},
    )
    try:
        raw = resp.choices[0].message.content or "{}"
        # Strip non-JSON wrapping. Some providers (Anthropic via OpenRouter) return
        # markdown-fenced JSON like ```json\n{...}\n``` even when response_format=json_object
        # is requested. Bracket-slice is provider-agnostic.
        start = raw.find("{")
        end = raw.rfind("}")
        if start >= 0 and end > start:
            raw = raw[start:end + 1]
        data = json.loads(raw)
        cls = data["cls"]
        if cls not in {"high_extraversion", "low_extraversion"}:
            raise ValueError(f"invalid cls: {cls}")
        confidence = max(0.0, min(1.0, float(data["confidence"])))
        indicators = data.get("raw_indicators", [])
        if not isinstance(indicators, list):
            raise ValueError("raw_indicators must be a list")
        return LanguageStyle(
            cls=cls,
            confidence=confidence,
            reasoning=str(data.get("reasoning", "")),
            raw_indicators=[str(item) for item in indicators],
        )
    except Exception as exc:
        raise ImprintExtractionError(f"failed to parse language-style extraction: {exc}") from exc
