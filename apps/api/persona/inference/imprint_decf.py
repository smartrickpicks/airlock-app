"""DECF aggregation for the Day-1 three-question imprint flow.

Q4/team size exists in drive-signals.yaml, but is intentionally ignored for Day-1.
"""

from __future__ import annotations

import math
import re
from dataclasses import asdict, dataclass
from pathlib import Path

import yaml

try:
    from inference.imprint_extractor import LanguageStyle, extract_language_style
except ModuleNotFoundError:  # pragma: no cover - supports direct script execution
    from imprint_extractor import LanguageStyle, extract_language_style


ROOT = Path(__file__).resolve().parent
DRIVE_SIGNALS = yaml.safe_load((ROOT / "drive-signals.yaml").read_text()) or {}
PROFILE_MATCHING = yaml.safe_load((ROOT / "profile-matching.yaml").read_text()) or {}
EMPAAKO_MAPPING = yaml.safe_load((ROOT / "empaako-pi-mapping.yaml").read_text()) or {}


@dataclass(frozen=True)
class DECF:
    D: float
    E: float
    C: float
    F: float


@dataclass
class ImprintResult:
    decf: DECF
    profile_id: str
    meta_archetype: str | None
    empaako_primary: str
    empaako_secondary: str
    confidence: float
    provenance: dict


def _clamp(value: float) -> float:
    return max(1.0, min(10.0, value))


def _hits(text: str, needles: list[str]) -> list[str]:
    lowered = text.lower()
    found = []
    for needle in needles:
        pattern = r"\b" + re.escape(needle.lower()) + r"\b"
        if re.search(pattern, lowered):
            found.append(needle)
    return found


def score_q1_keywords(text: str) -> dict:
    signals = DRIVE_SIGNALS["goal_signals"]
    provenance = {}
    d_delta = c_delta = 0.0
    for name, sign, axis in (
        ("high_dominance", 1, "D"),
        ("low_dominance", -1, "D"),
        ("high_patience", 1, "C"),
        ("low_patience", -1, "C"),
    ):
        spec = signals[name]
        found = _hits(text, spec.get("keywords", [])) + _hits(text, spec.get("phrases", []))
        delta = sign * float(spec["weight"]) * 2.0 * len(found)
        if axis == "D":
            d_delta += delta
        else:
            c_delta += delta
        provenance[name] = found
    return {"D_delta": d_delta, "C_delta": c_delta, "hits": provenance}


def score_q2(card_label: str) -> dict:
    try:
        spec = DRIVE_SIGNALS["autonomy_signals"][card_label]
    except KeyError:
        raise ValueError(f"Unknown q2 card label: {card_label!r}") from None
    return {
        "F": float(spec["formality"]),
        "extraversion_hint": spec["extraversion_hint"],
        "autonomy_ceiling": spec["autonomy_ceiling"],
        "interaction_mode": spec["interaction_mode"],
    }


def score_q3(card_label: str) -> dict:
    try:
        spec = DRIVE_SIGNALS["report_style_signals"][card_label]
    except KeyError:
        raise ValueError(f"Unknown q3 card label: {card_label!r}") from None
    return {
        "meta_archetype": spec["meta_archetype"],
        "D_adjust": float(spec.get("dominance_adjust", 0)),
        "C_adjust": float(spec.get("patience_adjust", 0)),
        "E_adjust": float(spec.get("extraversion_adjust", 0)),
        "F_adjust": float(spec.get("formality_adjust", 0)),
    }


def _match_profile(d: int, e: int, c: int, f: int) -> dict:
    profiles = PROFILE_MATCHING.get("profiles", {})
    max_dist = PROFILE_MATCHING.get("max_possible_distance", 18.0)
    results = []
    for pid, vector in profiles.items():
        dist = math.sqrt(
            (d - vector["D"]) ** 2
            + (e - vector["E"]) ** 2
            + (c - vector["C"]) ** 2
            + (f - vector["F"]) ** 2
        )
        results.append(
            {"profile_id": pid, "distance": round(dist, 4), "confidence": round(1.0 - (dist / max_dist), 4)}
        )
    results.sort(key=lambda x: x["distance"])
    top = results[0]["profile_id"]
    top_meta = None
    for meta, profiles_list in PROFILE_MATCHING.get("meta_archetype_mapping", {}).items():
        if top in profiles_list:
            top_meta = meta
            break
    return {"top_match": results[0], "meta_archetype": top_meta, "rankings": results[:5]}


def _round_decf(decf: DECF) -> DECF:
    return DECF(*(int(round(_clamp(value))) for value in (decf.D, decf.E, decf.C, decf.F)))


def _hint_cls(hint: str) -> str | None:
    if hint == "high":
        return "high_extraversion"
    if hint == "low":
        return "low_extraversion"
    return None


def run_imprint(q1_text: str, q2_card: str, q3_card: str, *, extractor=extract_language_style) -> ImprintResult:
    """Run Q1/Q2/Q3 imprint scoring. Q4/team size is ignored for Day-1."""
    style: LanguageStyle = extractor(q1_text)
    q1 = score_q1_keywords(q1_text)
    q2 = score_q2(q2_card)
    q3 = score_q3(q3_card)

    e_base = 8.0 if style.cls == "high_extraversion" else 3.0
    e_value = 5.0 + ((e_base - 5.0) * style.confidence)
    disagreement = _hint_cls(q2["extraversion_hint"]) not in {None, style.cls}
    floats = DECF(
        D=_clamp(5.0 + q1["D_delta"] + q3["D_adjust"]),
        E=_clamp(e_value + q3["E_adjust"]),
        C=_clamp(5.0 + q1["C_delta"] + q3["C_adjust"]),
        F=_clamp(q2["F"] + q3["F_adjust"]),
    )
    rounded = _round_decf(floats)
    match = _match_profile(rounded.D, rounded.E, rounded.C, rounded.F)
    profile_id = match["top_match"]["profile_id"]
    empaako = EMPAAKO_MAPPING["pi_to_empaako"][profile_id]
    provenance = {
        "q1_keywords": q1,
        "q2": q2,
        "q3": q3,
        "language_style": asdict(style),
        "float_decf": asdict(floats),
        "rounded_decf": asdict(rounded),
        "e_tiebreak": "q1_llm_wins",
        "q2_llm_extraversion_disagreement": disagreement,
        "profile_rankings": match["rankings"],
        "matched_profile_meta_archetype": match["meta_archetype"],
    }
    return ImprintResult(
        decf=rounded,
        profile_id=profile_id,
        meta_archetype=match["meta_archetype"],
        empaako_primary=empaako["primary"],
        empaako_secondary=empaako["secondary"],
        confidence=match["top_match"]["confidence"],
        provenance=provenance,
    )
