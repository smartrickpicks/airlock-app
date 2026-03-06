"""Preflight rules and lightweight classification helpers."""

from __future__ import annotations

AGREEMENT_TYPE_KEYWORDS: dict[str, list[str]] = {
    "distribution": ["distribution agreement", "digital distribution", "distribution deal"],
    "recording": ["recording agreement", "exclusive recording"],
    "publishing": ["publishing agreement", "music publishing", "co-publishing"],
    "license": ["license agreement", "licensing agreement", "master license"],
    "management": ["management agreement", "personal management"],
    "producer": ["producer agreement", "production agreement"],
    "director": ["director agreement", "director services"],
    "film_distribution": ["film distribution", "motion picture distribution"],
    "talent_actor": ["actor agreement", "talent agreement", "performer agreement"],
    "tv_licensing": ["television license", "tv licensing"],
    "tv_talent": ["series regular", "screen credit", "episode fee"],
    "nda": ["non-disclosure agreement", "confidentiality agreement", "nda"],
    "termination": ["termination agreement", "notice of termination"],
}

TYPE_PICKLIST_ALIAS: dict[str, str] = {
    "film_distribution": "distribution",
    "talent_actor": "talent-actor",
    "tv_licensing": "tv-licensing",
    "tv_talent": "tv-talent",
}

SUBTYPE_KEYWORD_MAP: dict[str, list[str]] = {
    "exclusive": ["exclusive", "sole and exclusive"],
    "non-exclusive": ["non-exclusive", "nonexclusive"],
    "catalog": ["catalog", "back catalog", "existing masters"],
    "new-release": ["new release", "newly recorded"],
    "digital": ["digital", "streaming", "download"],
    "physical": ["physical", "vinyl", "compact disc", "cd"],
}

SUBTYPE_REVIEW_DELTA = 0.15
SUBTYPE_CANDIDATE_THRESHOLD = 0.20

SCHEDULE_EXPECTATIONS: dict[str, list[str]] = {
    "distribution": ["distro_sync_existing_masters", "general_schedule"],
    "termination": ["termination_schedule"],
    "recording": ["general_schedule"],
    "publishing": ["general_schedule"],
}

SCHEDULE_PRIORITY = [
    "distro_sync_existing_masters",
    "catalog_acquisition_masters",
    "termination_schedule",
    "general_schedule",
]


def classify_contract(
    contract_type_value: str | None, full_text: str
) -> dict[str, str | list[str]]:
    """Classify contract with a lightweight rule-based label."""
    normalized = (contract_type_value or "").strip().lower().replace(" ", "_").replace("-", "_")
    if normalized:
        return {
            "normalized_contract_type": normalized,
            "expected_schedule_types": get_expected_schedule_types(normalized),
        }

    guess = guess_contract_type(full_text)
    return {
        "normalized_contract_type": guess,
        "expected_schedule_types": get_expected_schedule_types(guess),
    }


def get_expected_schedule_types(contract_type_value: str | None) -> list[str]:
    normalized = (contract_type_value or "").strip().lower().replace(" ", "_").replace("-", "_")
    return SCHEDULE_EXPECTATIONS.get(normalized, ["general_schedule"])


def get_schedule_type_priority() -> list[str]:
    return list(SCHEDULE_PRIORITY)


def guess_contract_type(full_text: str) -> str:
    """Guess a contract type from title and body keywords."""
    if not full_text:
        return "unknown"

    text_lower = full_text.lower()
    title_zone = "\n".join(text_lower.splitlines()[:10])
    best_type = "unknown"
    best_weight = 0.0

    for agreement_type, keywords in AGREEMENT_TYPE_KEYWORDS.items():
        for keyword in keywords:
            title_weight = 3.0 if keyword in title_zone else 0.0
            body_weight = 1.0 if keyword in text_lower else 0.0
            weight = title_weight + body_weight
            if weight > best_weight:
                best_weight = weight
                best_type = agreement_type

    return best_type
