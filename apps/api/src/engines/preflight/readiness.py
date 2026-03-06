"""Readiness builders and extraction helpers for preflight."""

from __future__ import annotations

import logging
import re
from typing import Any

from .rules import (
    AGREEMENT_TYPE_KEYWORDS,
    SUBTYPE_CANDIDATE_THRESHOLD,
    SUBTYPE_KEYWORD_MAP,
    SUBTYPE_REVIEW_DELTA,
    TYPE_PICKLIST_ALIAS,
    classify_contract,
    get_expected_schedule_types,
    get_schedule_type_priority,
    guess_contract_type,
)

logger = logging.getLogger(__name__)

_TERRITORY_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\bworldwide\b", re.IGNORECASE), "Worldwide"),
    (re.compile(r"\b(?:united states|u\.s\.a?\.?|usa)\b", re.IGNORECASE), "United States"),
    (re.compile(r"\bnorth america\b", re.IGNORECASE), "North America"),
    (re.compile(r"\beurope\b", re.IGNORECASE), "Europe"),
    (re.compile(r"\b(?:united kingdom|uk)\b", re.IGNORECASE), "United Kingdom"),
    (re.compile(r"\blatin america\b", re.IGNORECASE), "Latin America"),
    (re.compile(r"\basia pacific\b", re.IGNORECASE), "Asia Pacific"),
]
_EFFECTIVE_DATE_RE = re.compile(
    r"(?:effective\s+date|dated\s+as\s+of|made\s+effective\s+as\s+of)\s*[:\-]?\s*"
    r"((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}|\d{1,2}/\d{1,2}/\d{2,4}|\d{4}-\d{2}-\d{2})",
    re.IGNORECASE,
)
_TERM_DURATION_RE = re.compile(r"\b(\d{1,3})\s+(days?|months?|years?)\b", re.IGNORECASE)
_TERM_PHRASE_RE = re.compile(r"\bfor a term of (\d{1,3})\b", re.IGNORECASE)
_PERPETUAL_RE = re.compile(r"\bin perpetuity|perpetual|life of copyright\b", re.IGNORECASE)
_FORMAL_TERRITORY_DEF_RE = re.compile(
    r'"?territory"?\s+(?:means|shall mean)\s+(?P<definition>.{1,250})',
    re.IGNORECASE | re.DOTALL,
)
_MAX_EVIDENCE_HITS = 25

_SCHEDULE_TYPE_KEYWORDS: dict[str, list[str]] = {
    "distro_sync_existing_masters": [
        "distro & sync",
        "distribution and sync",
        "existing masters",
        "master exploitation",
        "sync licenses",
    ],
    "catalog_acquisition_masters": [
        "catalog acquisition",
        "acquisition schedule",
        "schedule 1",
        "masters acquisition",
    ],
    "termination_schedule": [
        "termination schedule",
        "termination notice",
        "actual termination date",
    ],
    "general_schedule": ["schedule", "exhibit", "appendix", "annex"],
}

_OWNERSHIP_KEYWORDS = [
    "master ownership",
    "composition ownership",
    "asset owner",
    "acquired",
    "ownership split",
    "rights ownership",
]
_LIFECYCLE_KEYWORDS = [
    "termination notice",
    "offboard date",
    "actual termination date",
    "effective date",
    "delivery date",
    "commencement",
]
_ADDON_TYPE_KW = [
    "add-on",
    "addon",
    "amendment",
    "rider",
    "supplemental",
    "addendum",
    "extension",
]
_ADDON_RIGHTS_KW = [
    "synchronization",
    "mechanical",
    "performance",
    "digital",
    "distribution",
    "streaming",
    "master use",
    "publishing",
]
_ADDON_PRICING_KW = ["additional fee", "supplemental", "per use", "flat fee", "surcharge"]
_ADDON_DATE_KW = ["effective date", "commencement", "renewal", "term extension", "expiration"]


def _find_evidence_context(full_text: str, search_terms: list[str]) -> dict[str, Any]:
    for term in search_terms:
        if not term:
            continue
        match = re.search(re.escape(term), full_text, re.IGNORECASE)
        if match:
            start = max(0, match.start() - 120)
            end = min(len(full_text), match.end() + 120)
            return {
                "evidence_context": full_text[start:end].strip(),
                "evidence_char_offset": match.start(),
            }
    return {}


def _find_all_evidence_hits(
    full_text: str, search_terms: list[str], max_hits: int = _MAX_EVIDENCE_HITS
) -> list[dict[str, Any]]:
    hits: list[dict[str, Any]] = []
    seen_offsets: set[int] = set()
    for term in search_terms:
        if not term:
            continue
        for match in re.finditer(re.escape(term), full_text, re.IGNORECASE):
            if match.start() in seen_offsets:
                continue
            hits.append({"term": term, "offset": match.start()})
            seen_offsets.add(match.start())
            if len(hits) >= max_hits:
                return hits
    return hits


def _enrich_checks_with_evidence(checks: list[dict[str, Any]], full_text: str) -> None:
    for check in checks:
        search_terms: list[str] = []
        search_terms.extend(check.get("_evidence_hit_terms", []))
        search_terms.extend(check.get("_evidence_hints", []))
        value = check.get("value")
        if isinstance(value, str) and value:
            search_terms.append(value)
        label = check.get("label", "")
        if label:
            search_terms.append(str(label))
        check.update(_find_evidence_context(full_text, search_terms))
        hits = _find_all_evidence_hits(full_text, search_terms)
        if hits:
            check["evidence_hits"] = hits


def _run_salesforce_match(
    extracted_headers: list[str], full_text: str = ""
) -> list[dict[str, Any]]:
    del extracted_headers, full_text
    logger.debug("Salesforce matching is stubbed until DB connectivity is ported")
    return []


def _extract_parties(full_text: str) -> tuple[str | None, str | None]:
    between_match = re.search(
        r"between\s+(?P<party_a>[^,\n]+?)\s+and\s+(?P<party_b>[^,\n]+)",
        full_text,
        re.IGNORECASE,
    )
    if between_match:
        return between_match.group("party_a").strip(), between_match.group("party_b").strip()

    lines = [line.strip() for line in full_text.splitlines() if line.strip()]
    title_zone = " ".join(lines[:12])
    by_match = re.search(
        r"by and between\s+(.+?)\s+and\s+(.+?)(?:\.|,|\n)", title_zone, re.IGNORECASE
    )
    if by_match:
        return by_match.group(1).strip(), by_match.group(2).strip()

    return None, None


def build_resolution_story(
    sf_match_results: list[dict[str, Any]], full_text: str
) -> dict[str, Any]:
    """Build a lightweight entity-resolution story without DB matching."""
    del sf_match_results
    party_a, party_b = _extract_parties(full_text)
    legal_entity_account = None
    counterparties: list[dict[str, Any]] = []
    unresolved_counterparties: list[str] = []

    if party_a:
        legal_entity_account = {"name": party_a, "match_status": "review", "confidence": 0.5}
    if party_b:
        counterparties.append({"name": party_b, "match_status": "review", "confidence": 0.45})
    else:
        title_guess = next(
            (line.strip() for line in full_text.splitlines() if len(line.strip()) <= 80), ""
        )
        if title_guess:
            unresolved_counterparties.append(title_guess)

    new_entry_detected = not counterparties
    story = {
        "legal_entity_account": legal_entity_account,
        "counterparties": counterparties,
        "unresolved_counterparties": unresolved_counterparties,
        "requires_manual_confirmation": True,
        "new_entry_detected": new_entry_detected,
        "primary_counterparty": counterparties[0] if counterparties else None,
    }
    if new_entry_detected:
        story["onboarding_recommendation"] = {
            "suggested_account_type": "New account",
            "reason": "No confident counterparty match without CRM-backed resolution",
        }
    return story


def build_entity_resolution(
    resolution_story: dict[str, Any], sf_match: list[dict[str, Any]], full_text: str | None = None
) -> dict[str, Any]:
    del full_text
    checks: list[dict[str, Any]] = []

    legal = resolution_story.get("legal_entity_account")
    if legal:
        checks.append(
            {
                "code": "ENT_LEGAL_ENTITY",
                "label": "Legal Entity (CMG)",
                "status": "review",
                "value": legal.get("name", ""),
                "confidence": float(legal.get("confidence", 0)),
            }
        )
    else:
        checks.append(
            {
                "code": "ENT_LEGAL_ENTITY",
                "label": "Legal Entity (CMG)",
                "status": "fail",
                "value": "",
                "confidence": 0.0,
            }
        )

    counterparties = resolution_story.get("counterparties") or []
    if counterparties:
        primary = counterparties[0]
        checks.append(
            {
                "code": "ENT_COUNTERPARTY",
                "label": "Counterparty",
                "status": "review",
                "value": primary.get("name", ""),
                "confidence": float(primary.get("confidence", 0)),
            }
        )
    else:
        unresolved = resolution_story.get("unresolved_counterparties") or []
        checks.append(
            {
                "code": "ENT_COUNTERPARTY",
                "label": "Counterparty",
                "status": "review" if unresolved else "fail",
                "value": unresolved[0] if unresolved else "",
                "confidence": 0.0,
            }
        )

    checks.append(
        {
            "code": "ENT_SF_MATCH",
            "label": "Salesforce Match",
            "status": "fail" if not sf_match else "review",
            "value": "New account - requires account creation" if not sf_match else "Review needed",
            "confidence": 0.0 if not sf_match else 0.5,
        }
    )
    checks.append(
        {
            "code": "ENT_NEW_ENTRY",
            "label": "New Entry Detection",
            "status": "review" if resolution_story.get("new_entry_detected") else "pass",
            "value": "New account"
            if resolution_story.get("new_entry_detected")
            else "No new entries",
            "confidence": 0.3 if resolution_story.get("new_entry_detected") else 1.0,
        }
    )

    passed = sum(1 for check in checks if check["status"] == "pass")
    review = sum(1 for check in checks if check["status"] == "review")
    failed = sum(1 for check in checks if check["status"] == "fail")
    overall = "fail" if failed > 0 else "review" if review > 0 else "pass"
    return {
        "status": overall,
        "checks": checks,
        "summary": {"passed": passed, "review": review, "failed": failed, "suggested": 0},
    }


def _extract_contract_type(full_text: str) -> dict[str, Any]:
    if not full_text:
        return {"status": "fail", "confidence": 0.0, "value": None, "reason": "No text available"}
    result = guess_contract_type(full_text)
    if result == "unknown":
        return {
            "status": "fail",
            "confidence": 0.0,
            "value": None,
            "reason": "Contract type not detected in text",
        }
    text_lower = full_text.lower()
    all_keywords = [
        keyword for keyword in AGREEMENT_TYPE_KEYWORDS.get(result, []) if keyword in text_lower
    ]
    picklist_value = TYPE_PICKLIST_ALIAS.get(result)
    if picklist_value:
        return {
            "status": "review",
            "confidence": 0.55,
            "value": picklist_value,
            "reason": f"Detected '{result}' - mapped to '{picklist_value}' (review needed)",
            "_evidence_hit_terms": all_keywords,
        }
    title_zone = "\n".join(text_lower.splitlines()[:10])
    best_keyword = next(
        (keyword for keyword in AGREEMENT_TYPE_KEYWORDS.get(result, []) if keyword in title_zone),
        "",
    )
    if best_keyword:
        return {
            "status": "pass",
            "confidence": 0.95,
            "value": result,
            "reason": f"'{best_keyword}' found in title block",
            "_evidence_hit_terms": all_keywords,
        }
    return {
        "status": "review",
        "confidence": 0.6,
        "value": result,
        "reason": "Contract type inferred from body text only",
        "_evidence_hit_terms": all_keywords,
    }


def _extract_contract_subtype(full_text: str) -> dict[str, Any]:
    if not full_text:
        return {
            "status": "fail",
            "confidence": 0.0,
            "value": None,
            "reason": "No text available",
            "candidates": [],
        }

    text_lower = full_text.lower()
    title_zone = "\n".join(text_lower.splitlines()[:10])
    preamble_zone = "\n".join(text_lower.splitlines()[:35])
    scores: dict[str, float] = {}
    evidence_map: dict[str, list[str]] = {}

    for canonical, keywords in SUBTYPE_KEYWORD_MAP.items():
        best_score = 0.0
        hits: list[str] = []
        for keyword in keywords:
            if keyword in title_zone:
                weight = 0.40
                hits.append(f"title: {keyword}")
            elif keyword in preamble_zone:
                weight = 0.25
                hits.append(f"preamble: {keyword}")
            elif keyword in text_lower:
                weight = 0.20
                hits.append(f"body: {keyword}")
            else:
                weight = 0.0
            best_score = max(best_score, weight)
        if hits:
            bonus = min(len(hits) - 1, 3) * 0.08
            scores[canonical] = round(min(best_score + bonus, 1.0), 4)
            evidence_map[canonical] = hits

    ranked = sorted(scores.items(), key=lambda item: (-item[1], item[0]))
    candidates = [
        {
            "value": value,
            "confidence": round(confidence, 2),
            "evidence": evidence_map.get(value, []),
        }
        for value, confidence in ranked
        if confidence >= SUBTYPE_CANDIDATE_THRESHOLD
    ]
    if not candidates:
        return {
            "status": "review",
            "confidence": 0.3,
            "value": None,
            "reason": "No specific subtype phrase detected",
            "candidates": [],
        }

    top = candidates[0]
    if len(candidates) == 1:
        status = "pass"
        reason = f"Subtype '{top['value']}' detected"
    else:
        delta = top["confidence"] - candidates[1]["confidence"]
        if delta > SUBTYPE_REVIEW_DELTA:
            status = "pass"
            reason = f"Subtype '{top['value']}' detected (clear winner)"
        else:
            status = "review"
            alternatives = ", ".join(candidate["value"] for candidate in candidates[:3])
            reason = f"Multiple plausible subtypes detected - analyst confirmation required ({alternatives})"

    hit_terms = [hit.split(": ", 1)[-1] for hits in evidence_map.values() for hit in hits]
    return {
        "status": status,
        "confidence": top["confidence"],
        "value": top["value"],
        "reason": reason,
        "candidates": candidates,
        "_evidence_hit_terms": list(dict.fromkeys(hit_terms)),
    }


def _extract_effective_date(full_text: str) -> dict[str, Any]:
    if not full_text:
        return {"status": "fail", "confidence": 0.0, "value": None, "reason": "No text available"}
    match = _EFFECTIVE_DATE_RE.search(full_text[:5000])
    if not match:
        return {
            "status": "fail",
            "confidence": 0.0,
            "value": None,
            "reason": "No effective date found",
        }
    date_str = match.group(1).strip().rstrip(",. ")
    all_matches = list(_EFFECTIVE_DATE_RE.finditer(full_text[:5000]))
    return {
        "status": "pass",
        "confidence": 0.9,
        "value": date_str,
        "reason": "Date found near effective date marker",
        "_evidence_hit_terms": list(dict.fromkeys(found.group(0)[:80] for found in all_matches)),
    }


def _extract_term(full_text: str) -> dict[str, Any]:
    if not full_text:
        return {"status": "fail", "confidence": 0.0, "value": None, "reason": "No text available"}
    perpetual_matches = list(_PERPETUAL_RE.finditer(full_text))
    if perpetual_matches:
        return {
            "status": "pass",
            "confidence": 0.9,
            "value": "Perpetual",
            "reason": "Perpetual/life-of-copyright term detected",
            "_evidence_hit_terms": [match.group(0) for match in perpetual_matches],
        }

    duration_match = _TERM_DURATION_RE.search(full_text)
    if duration_match:
        value = f"{duration_match.group(1)} {duration_match.group(2).lower()}"
        return {
            "status": "pass",
            "confidence": 0.85,
            "value": value,
            "reason": f"Term duration '{value}' detected",
            "_evidence_hit_terms": [duration_match.group(0)],
        }

    phrase_match = _TERM_PHRASE_RE.search(full_text)
    if phrase_match:
        value = f"{phrase_match.group(1)} year(s)"
        return {
            "status": "review",
            "confidence": 0.6,
            "value": value,
            "reason": f"Possible term '{value}' detected from phrase pattern",
            "_evidence_hit_terms": [phrase_match.group(0)],
        }

    return {"status": "fail", "confidence": 0.0, "value": None, "reason": "No term/duration found"}


def _extract_territory(full_text: str) -> dict[str, Any]:
    if not full_text:
        return {"status": "fail", "confidence": 0.0, "value": None, "reason": "No text available"}

    formal_match = _FORMAL_TERRITORY_DEF_RE.search(full_text)
    if formal_match:
        definition_zone = formal_match.group("definition").strip()
        found = [label for pattern, label in _TERRITORY_PATTERNS if pattern.search(definition_zone)]
        if found:
            unique = list(dict.fromkeys(found))
            hit_terms = [
                match.group(0)
                for pattern, _label in _TERRITORY_PATTERNS
                for match in pattern.finditer(full_text)
            ]
            return {
                "status": "pass" if len(unique) == 1 or "Worldwide" in unique else "review",
                "confidence": 0.9 if "Worldwide" in unique else 0.86,
                "value": "Worldwide" if "Worldwide" in unique else ", ".join(unique[:4]),
                "reason": "Territory extracted from formal definition clause",
                "_evidence_hit_terms": hit_terms,
            }

    found = [label for pattern, label in _TERRITORY_PATTERNS if pattern.search(full_text)]
    if not found:
        return {
            "status": "fail",
            "confidence": 0.0,
            "value": None,
            "reason": "No territory references found",
        }
    unique = list(dict.fromkeys(found))
    hit_terms = [
        match.group(0)
        for pattern, _label in _TERRITORY_PATTERNS
        for match in pattern.finditer(full_text)
    ]
    if len(unique) == 1:
        return {
            "status": "review",
            "confidence": 0.55,
            "value": unique[0],
            "reason": "Territory inferred from body-wide scan; analyst confirmation required",
            "_evidence_hit_terms": hit_terms,
        }
    return {
        "status": "review",
        "confidence": 0.55,
        "value": ", ".join(unique[:4]),
        "reason": f"Multiple territories inferred from body-wide scan: {', '.join(unique[:4])}",
        "_evidence_hit_terms": hit_terms,
    }


def _check_role_linkage(resolution_story: dict[str, Any]) -> dict[str, Any]:
    legal = resolution_story.get("legal_entity_account")
    counterparties = resolution_story.get("counterparties", [])
    unresolved = resolution_story.get("unresolved_counterparties", [])
    if legal and counterparties:
        return {
            "status": "pass",
            "confidence": 0.9,
            "value": "Legal entity + counterparty resolved",
            "reason": "Both legal entity and counterparty identified",
        }
    if legal and unresolved:
        return {
            "status": "review",
            "confidence": 0.6,
            "value": "Legal entity resolved, counterparty unresolved",
            "reason": "Legal entity found; counterparty requires manual confirmation",
        }
    if legal:
        return {
            "status": "review",
            "confidence": 0.4,
            "value": "Legal entity only",
            "reason": "Legal entity found but no counterparty identified",
        }
    return {
        "status": "fail",
        "confidence": 0.0,
        "value": None,
        "reason": "No role linkage - neither legal entity nor counterparty resolved",
    }


def build_opportunities_readiness(
    full_text: str, resolution_story: dict[str, Any]
) -> dict[str, Any]:
    checks = [
        {
            "code": "OPP_CONTRACT_TYPE",
            "label": "Contract Type",
            **_extract_contract_type(full_text),
        },
        {
            "code": "OPP_CONTRACT_SUBTYPE",
            "label": "Contract Subtype",
            **_extract_contract_subtype(full_text),
        },
        {
            "code": "OPP_EFFECTIVE_DATE",
            "label": "Effective Date",
            **_extract_effective_date(full_text),
        },
        {"code": "OPP_TERM", "label": "Term", **_extract_term(full_text)},
        {"code": "OPP_TERRITORY", "label": "Territory", **_extract_territory(full_text)},
        {
            "code": "OPP_ROLE_LINKAGE",
            "label": "Role Linkage",
            **_check_role_linkage(resolution_story),
        },
    ]
    _enrich_checks_with_evidence(checks, full_text)

    passed = sum(1 for check in checks if check["status"] == "pass")
    review = sum(1 for check in checks if check["status"] == "review")
    failed = sum(1 for check in checks if check["status"] == "fail")
    overall = (
        "fail"
        if any(
            check["status"] == "fail" and check["code"] in {"OPP_CONTRACT_TYPE", "OPP_ROLE_LINKAGE"}
            for check in checks
        )
        else "review"
        if failed > 0 or review > 0
        else "pass"
    )
    return {
        "status": overall,
        "checks": checks,
        "summary": {"passed": passed, "review": review, "failed": failed},
    }


def _opp_check_value(opportunities_readiness: dict[str, Any] | None, check_code: str) -> Any:
    if not opportunities_readiness:
        return None
    for check in opportunities_readiness.get("checks", []):
        if check.get("code") == check_code:
            return check.get("value")
    return None


def _extract_schedule_presence(
    full_text: str, opportunities_readiness: dict[str, Any]
) -> dict[str, Any]:
    match = re.search(r"\b(schedule|exhibit|appendix|annex)\b", full_text, re.IGNORECASE)
    contract_type = str(
        _opp_check_value(opportunities_readiness, "OPP_CONTRACT_TYPE") or ""
    ).lower()
    if match:
        return {
            "status": "pass",
            "confidence": 0.9,
            "value": "Schedule references detected",
            "reason": "Found schedule/exhibit references in document text",
            "_evidence_hints": [match.group(0)],
        }
    if "termination" in contract_type:
        return {
            "status": "review",
            "confidence": 0.5,
            "value": None,
            "reason": "No explicit schedule markers; may be valid for termination form",
        }
    return {
        "status": "fail",
        "confidence": 0.0,
        "value": None,
        "reason": "No schedule/exhibit markers detected",
    }


def _extract_schedule_type(
    full_text: str, contract_type_value: str | None = None
) -> dict[str, Any]:
    text_lower = full_text.lower()
    title_zone = "\n".join(text_lower.splitlines()[:10])
    preamble_zone = "\n".join(text_lower.splitlines()[:35])
    scores: dict[str, float] = {}
    evidence_map: dict[str, list[str]] = {}

    for schedule_type, keywords in _SCHEDULE_TYPE_KEYWORDS.items():
        best = 0.0
        hits: list[str] = []
        for keyword in keywords:
            if keyword in title_zone:
                weight = 0.40
                hits.append(f"title: {keyword}")
            elif keyword in preamble_zone:
                weight = 0.25
                hits.append(f"preamble: {keyword}")
            elif keyword in text_lower:
                weight = 0.20
                hits.append(f"body: {keyword}")
            else:
                weight = 0.0
            best = max(best, weight)
        if hits:
            scores[schedule_type] = round(min(best + min(len(hits) - 1, 3) * 0.08, 1.0), 4)
            evidence_map[schedule_type] = hits

    expected = get_expected_schedule_types(contract_type_value)
    priority_order = get_schedule_type_priority()
    specific_types = [schedule for schedule in scores if schedule != "general_schedule"]
    if specific_types and "general_schedule" in scores:
        best_specific_score = max(scores[schedule] for schedule in specific_types)
        if best_specific_score >= scores["general_schedule"] or any(
            schedule in expected for schedule in specific_types
        ):
            scores.pop("general_schedule", None)
            evidence_map.pop("general_schedule", None)

    ranked = sorted(
        scores.items(),
        key=lambda item: (
            -item[1],
            priority_order.index(item[0]) if item[0] in priority_order else len(priority_order),
            item[0],
        ),
    )
    candidates = [
        {
            "value": value,
            "confidence": round(confidence, 2),
            "evidence": evidence_map.get(value, []),
        }
        for value, confidence in ranked
        if confidence >= SUBTYPE_CANDIDATE_THRESHOLD
    ]
    if not candidates and ranked:
        value, confidence = ranked[0]
        candidates = [
            {
                "value": value,
                "confidence": round(confidence, 2),
                "evidence": evidence_map.get(value, []),
            }
        ]

    if not candidates:
        return {
            "status": "review",
            "confidence": 0.3,
            "value": None,
            "reason": "No clear schedule type markers found",
            "candidates": [],
        }

    top = candidates[0]
    if len(candidates) == 1:
        return {
            "status": "pass",
            "confidence": top["confidence"],
            "value": top["value"],
            "reason": f"Schedule type '{top['value']}' detected",
            "candidates": candidates,
        }
    delta = top["confidence"] - candidates[1]["confidence"]
    if delta > SUBTYPE_REVIEW_DELTA:
        return {
            "status": "pass",
            "confidence": top["confidence"],
            "value": top["value"],
            "reason": f"Schedule type '{top['value']}' detected (clear winner)",
            "candidates": candidates,
        }
    alternatives = ", ".join(candidate["value"] for candidate in candidates[:3])
    return {
        "status": "review",
        "confidence": top["confidence"],
        "value": top["value"],
        "reason": f"Multiple schedule types detected - analyst confirmation required ({alternatives})",
        "candidates": candidates,
    }


def _extract_ownership_signals(full_text: str) -> dict[str, Any]:
    hits = [keyword for keyword in _OWNERSHIP_KEYWORDS if keyword in full_text.lower()]
    if len(hits) >= 2:
        return {
            "status": "pass",
            "confidence": 0.85,
            "value": ", ".join(hits[:3]),
            "reason": f"Ownership markers detected ({len(hits)} hits)",
            "_evidence_hints": hits[:3],
        }
    if len(hits) == 1:
        return {
            "status": "review",
            "confidence": 0.55,
            "value": hits[0],
            "reason": "Limited ownership evidence; verify schedule rows manually",
            "_evidence_hints": hits,
        }
    return {
        "status": "fail",
        "confidence": 0.0,
        "value": None,
        "reason": "No ownership markers detected",
    }


def _extract_lifecycle_signals(full_text: str) -> dict[str, Any]:
    hits = [keyword for keyword in _LIFECYCLE_KEYWORDS if keyword in full_text.lower()]
    if len(hits) >= 2:
        return {
            "status": "pass",
            "confidence": 0.8,
            "value": ", ".join(hits[:3]),
            "reason": f"Lifecycle timing markers detected ({len(hits)} hits)",
            "_evidence_hints": hits[:3],
        }
    if len(hits) == 1:
        return {
            "status": "review",
            "confidence": 0.5,
            "value": hits[0],
            "reason": "Single lifecycle marker detected; review timing fields",
            "_evidence_hints": hits,
        }
    return {
        "status": "review",
        "confidence": 0.35,
        "value": None,
        "reason": "No lifecycle markers detected",
    }


def _check_schedule_role_alignment(resolution_story: dict[str, Any]) -> dict[str, Any]:
    legal = resolution_story.get("legal_entity_account")
    counterparties = resolution_story.get("counterparties", [])
    unresolved = resolution_story.get("unresolved_counterparties", [])
    if legal and counterparties:
        return {
            "status": "pass",
            "confidence": 0.9,
            "value": "Legal + counterparty resolved",
            "reason": "Schedule routing can be anchored to resolved parties",
        }
    if legal and unresolved:
        return {
            "status": "review",
            "confidence": 0.6,
            "value": "Counterparty unresolved",
            "reason": "Legal entity resolved but counterparty needs manual onboarding",
        }
    if legal:
        return {
            "status": "review",
            "confidence": 0.5,
            "value": "Legal entity only",
            "reason": "Counterparty not resolved; schedule ownership requires review",
        }
    return {
        "status": "fail",
        "confidence": 0.2,
        "value": "No legal entity",
        "reason": "No legal entity resolved for schedule alignment",
    }


def build_schedule_readiness(
    full_text: str, resolution_story: dict[str, Any], opportunities_readiness: dict[str, Any]
) -> dict[str, Any]:
    contract_type_value = _opp_check_value(opportunities_readiness, "OPP_CONTRACT_TYPE")
    checks = [
        {
            "code": "SCH_PRESENCE",
            "label": "Schedule Presence",
            **_extract_schedule_presence(full_text, opportunities_readiness),
        },
        {
            "code": "SCH_TYPE",
            "label": "Schedule Type",
            **_extract_schedule_type(
                full_text, str(contract_type_value) if contract_type_value else None
            ),
        },
        {
            "code": "SCH_OWNERSHIP",
            "label": "Ownership Signals",
            **_extract_ownership_signals(full_text),
        },
        {
            "code": "SCH_LIFECYCLE",
            "label": "Lifecycle Signals",
            **_extract_lifecycle_signals(full_text),
        },
        {
            "code": "SCH_ROLE_ALIGNMENT",
            "label": "Role Alignment",
            **_check_schedule_role_alignment(resolution_story),
        },
    ]
    _enrich_checks_with_evidence(checks, full_text)
    passed = sum(1 for check in checks if check["status"] == "pass")
    review = sum(1 for check in checks if check["status"] == "review")
    failed = sum(1 for check in checks if check["status"] == "fail")
    overall = (
        "fail"
        if any(
            check["status"] == "fail" and check["code"] in {"SCH_PRESENCE", "SCH_ROLE_ALIGNMENT"}
            for check in checks
        )
        else "review"
        if failed > 0 or review > 0
        else "pass"
    )
    return {
        "status": overall,
        "checks": checks,
        "summary": {"passed": passed, "review": review, "failed": failed},
    }


def _extract_financial_amounts(text: str) -> dict[str, Any]:
    amounts = re.findall(
        r"[\$€£¥]\s*[\d,]+(?:\.\d+)?|\d[\d,]*(?:\.\d+)?\s*(?:dollars|usd|eur|gbp)",
        text,
        re.IGNORECASE,
    )
    if len(amounts) >= 2:
        return {
            "status": "pass",
            "confidence": 0.85,
            "value": f"{len(amounts)} amounts",
            "reason": "Financial amounts detected",
            "_evidence_hints": amounts[:3],
        }
    if len(amounts) == 1:
        return {
            "status": "review",
            "confidence": 0.5,
            "value": amounts[0],
            "reason": "Single financial amount detected",
            "_evidence_hints": amounts,
        }
    return {
        "status": "fail",
        "confidence": 0.0,
        "value": None,
        "reason": "No financial amounts detected",
    }


def _extract_financial_rates(text: str) -> dict[str, Any]:
    rates = re.findall(r"\d+(?:\.\d+)?\s*%", text)
    if len(rates) >= 2:
        return {
            "status": "pass",
            "confidence": 0.8,
            "value": f"{len(rates)} rates",
            "reason": "Financial rates detected",
            "_evidence_hints": rates[:3],
        }
    if len(rates) == 1:
        return {
            "status": "review",
            "confidence": 0.45,
            "value": rates[0],
            "reason": "Single financial rate detected",
            "_evidence_hints": rates,
        }
    return {
        "status": "fail",
        "confidence": 0.0,
        "value": None,
        "reason": "No financial rates detected",
    }


def _extract_payment_terms(text: str) -> dict[str, Any]:
    lower = text.lower()
    hits = [
        keyword
        for keyword in ["payable", "quarterly", "monthly", "net 30", "net 60", "payment terms"]
        if keyword in lower
    ]
    if len(hits) >= 2:
        return {
            "status": "pass",
            "confidence": 0.8,
            "value": ", ".join(hits[:3]),
            "reason": "Payment terms detected",
            "_evidence_hints": hits[:3],
        }
    if len(hits) == 1:
        return {
            "status": "review",
            "confidence": 0.45,
            "value": hits[0],
            "reason": "Single payment term signal detected",
            "_evidence_hints": hits,
        }
    return {
        "status": "fail",
        "confidence": 0.0,
        "value": None,
        "reason": "No payment terms detected",
    }


def _extract_currency_signals(text: str) -> dict[str, Any]:
    hits = re.findall(r"\b(?:usd|eur|gbp|cad|aud)\b|[$€£¥]", text, re.IGNORECASE)
    if len(hits) >= 2:
        return {
            "status": "pass",
            "confidence": 0.75,
            "value": ", ".join(hits[:3]),
            "reason": "Currency signals detected",
            "_evidence_hints": hits[:3],
        }
    if len(hits) == 1:
        return {
            "status": "review",
            "confidence": 0.4,
            "value": hits[0],
            "reason": "Single currency signal detected",
            "_evidence_hints": hits,
        }
    return {
        "status": "fail",
        "confidence": 0.0,
        "value": None,
        "reason": "No currency signals detected",
    }


def _check_financial_completeness(
    text: str, opportunities_readiness: dict[str, Any]
) -> dict[str, Any]:
    lower = text.lower()
    contract_type = _opp_check_value(opportunities_readiness, "OPP_CONTRACT_TYPE")
    is_termination = contract_type and "termination" in str(contract_type).lower()
    has_amounts = bool(re.search(r"[\$€£¥]\s*[\d,]+|\d[\d,]+\s*(?:dollars|usd)", lower))
    has_rates = bool(re.search(r"\d+(?:\.\d+)?\s*%", lower))
    has_terms = any(
        keyword in lower
        for keyword in [
            "payable",
            "quarterly",
            "monthly",
            "net 30",
            "net 60",
            "payment terms",
            "accounting period",
        ]
    )
    pillars = sum([has_amounts, has_rates, has_terms])
    if is_termination:
        if pillars >= 1:
            return {
                "status": "pass",
                "confidence": 0.8,
                "value": f"{pillars}/3 pillars (termination lenient)",
                "reason": "Termination contract - reduced financial requirements",
            }
        return {
            "status": "review",
            "confidence": 0.5,
            "value": f"{pillars}/3 pillars (termination)",
            "reason": "Termination with no financial signals",
        }
    if pillars >= 3:
        return {
            "status": "pass",
            "confidence": 0.95,
            "value": "3/3 pillars",
            "reason": "Full financial completeness",
        }
    if pillars >= 2:
        return {
            "status": "pass",
            "confidence": 0.75,
            "value": f"{pillars}/3 pillars",
            "reason": "Most financial pillars present",
        }
    if pillars >= 1:
        return {
            "status": "review",
            "confidence": 0.45,
            "value": f"{pillars}/3 pillars",
            "reason": "Partial financial coverage",
        }
    return {
        "status": "fail",
        "confidence": 0.1,
        "value": "0/3 pillars",
        "reason": "No financial completeness",
    }


def build_financials_readiness(
    full_text: str, opportunities_readiness: dict[str, Any]
) -> dict[str, Any]:
    checks = [
        {
            "code": "FIN_AMOUNTS",
            "label": "Financial Amounts",
            **_extract_financial_amounts(full_text),
        },
        {"code": "FIN_RATES", "label": "Financial Rates", **_extract_financial_rates(full_text)},
        {
            "code": "FIN_PAYMENT_TERMS",
            "label": "Payment Terms",
            **_extract_payment_terms(full_text),
        },
        {
            "code": "FIN_CURRENCY",
            "label": "Currency Signals",
            **_extract_currency_signals(full_text),
        },
        {
            "code": "FIN_COMPLETENESS",
            "label": "Financial Completeness",
            **_check_financial_completeness(full_text, opportunities_readiness),
        },
    ]
    _enrich_checks_with_evidence(checks, full_text)
    passed = sum(1 for check in checks if check["status"] == "pass")
    review = sum(1 for check in checks if check["status"] == "review")
    failed = sum(1 for check in checks if check["status"] == "fail")
    overall = "pass" if passed >= 4 else "fail" if failed >= 3 else "review"
    return {
        "status": overall,
        "checks": checks,
        "summary": {"passed": passed, "review": review, "failed": failed},
    }


def _extract_addon_type_signals(text: str) -> dict[str, Any]:
    lower = text.lower()
    matched = [keyword for keyword in _ADDON_TYPE_KW if keyword in lower]
    if len(matched) >= 3:
        return {
            "status": "pass",
            "confidence": min(0.95, 0.6 + len(matched) * 0.07),
            "value": f"{len(matched)} addon type signals",
            "reason": "Add-on type clearly identified",
            "_evidence_hints": matched[:3],
        }
    if matched:
        return {
            "status": "review",
            "confidence": 0.3 + len(matched) * 0.1,
            "value": f"{len(matched)} addon type signals",
            "reason": "Partial add-on type signals",
            "_evidence_hints": matched[:3],
        }
    return {"status": "fail", "confidence": 0.1, "value": None, "reason": "No add-on type signals"}


def _extract_addon_rights(text: str) -> dict[str, Any]:
    lower = text.lower()
    matched = [keyword for keyword in _ADDON_RIGHTS_KW if keyword in lower]
    if len(matched) >= 3:
        return {
            "status": "pass",
            "confidence": min(0.95, 0.65 + len(matched) * 0.05),
            "value": f"{len(matched)} rights signals",
            "reason": "Rights well-defined",
            "_evidence_hints": matched[:3],
        }
    if matched:
        return {
            "status": "review",
            "confidence": 0.3 + len(matched) * 0.1,
            "value": f"{len(matched)} rights signals",
            "reason": "Partial rights coverage",
            "_evidence_hints": matched[:3],
        }
    return {"status": "fail", "confidence": 0.1, "value": None, "reason": "No rights signals"}


def _extract_addon_pricing(text: str) -> dict[str, Any]:
    lower = text.lower()
    amounts = re.findall(
        r"[\$€£¥]\s*[\d,]+(?:\.\d+)?|\d[\d,]*(?:\.\d+)?\s*(?:dollars|usd|eur|gbp)", lower
    )
    matched = [keyword for keyword in _ADDON_PRICING_KW if keyword in lower]
    hints = amounts[:2] + matched[:2]
    if amounts and matched:
        return {
            "status": "pass",
            "confidence": min(0.95, 0.6 + len(matched) * 0.1),
            "value": f"{len(amounts)} amounts, {len(matched)} pricing keywords",
            "reason": "Add-on pricing identified",
            "_evidence_hints": hints,
        }
    if amounts or matched:
        return {
            "status": "review",
            "confidence": 0.35,
            "value": f"{len(amounts)} amounts, {len(matched)} pricing keywords",
            "reason": "Partial pricing signals",
            "_evidence_hints": hints,
        }
    return {"status": "review", "confidence": 0.2, "value": None, "reason": "No explicit pricing"}


def _extract_addon_dates(text: str) -> dict[str, Any]:
    lower = text.lower()
    matched = [keyword for keyword in _ADDON_DATE_KW if keyword in lower]
    dates = re.findall(
        r"(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}|\d{1,2}/\d{1,2}/\d{4}|\d{4}-\d{2}-\d{2}",
        lower,
    )
    total = len(matched) + len(dates)
    hints = matched[:2] + dates[:2]
    if total >= 2:
        return {
            "status": "pass",
            "confidence": min(0.95, 0.5 + total * 0.1),
            "value": f"{len(matched)} date keywords, {len(dates)} dates",
            "reason": "Add-on dates well-defined",
            "_evidence_hints": hints,
        }
    if total >= 1:
        return {
            "status": "review",
            "confidence": 0.35,
            "value": f"{len(matched)} date keywords, {len(dates)} dates",
            "reason": "Partial date coverage",
            "_evidence_hints": hints,
        }
    return {"status": "review", "confidence": 0.2, "value": None, "reason": "No explicit dates"}


def _check_addon_completeness(text: str, opportunities_readiness: dict[str, Any]) -> dict[str, Any]:
    contract_type = _opp_check_value(opportunities_readiness, "OPP_CONTRACT_TYPE")
    if contract_type and "termination" in str(contract_type).lower():
        return {
            "status": "pass",
            "confidence": 0.8,
            "value": "N/A (termination)",
            "reason": "Add-on completeness not applicable for termination contracts",
        }
    lower = text.lower()
    has_type = any(keyword in lower for keyword in _ADDON_TYPE_KW)
    has_rights = any(keyword in lower for keyword in _ADDON_RIGHTS_KW)
    has_pricing = any(keyword in lower for keyword in _ADDON_PRICING_KW) or bool(
        re.search(r"[\$€£¥]\s*[\d,]+", text)
    )
    pillars = sum([has_type, has_rights, has_pricing])
    if pillars >= 3:
        return {
            "status": "pass",
            "confidence": 0.9,
            "value": "3/3 pillars",
            "reason": "Full add-on completeness",
        }
    if pillars >= 2:
        return {
            "status": "pass",
            "confidence": 0.7,
            "value": f"{pillars}/3 pillars",
            "reason": "Most add-on pillars present",
        }
    if pillars >= 1:
        return {
            "status": "review",
            "confidence": 0.4,
            "value": f"{pillars}/3 pillars",
            "reason": "Partial add-on coverage",
        }
    return {
        "status": "fail",
        "confidence": 0.1,
        "value": "0/3 pillars",
        "reason": "No add-on completeness",
    }


def build_addons_readiness(
    full_text: str, opportunities_readiness: dict[str, Any]
) -> dict[str, Any]:
    checks = [
        {
            "code": "ADDON_TYPE",
            "label": "Add-on Type Signals",
            **_extract_addon_type_signals(full_text),
        },
        {"code": "ADDON_RIGHTS", "label": "Add-on Rights", **_extract_addon_rights(full_text)},
        {"code": "ADDON_PRICING", "label": "Add-on Pricing", **_extract_addon_pricing(full_text)},
        {"code": "ADDON_DATES", "label": "Add-on Dates", **_extract_addon_dates(full_text)},
        {
            "code": "ADDON_COMPLETENESS",
            "label": "Add-on Completeness",
            **_check_addon_completeness(full_text, opportunities_readiness),
        },
    ]
    _enrich_checks_with_evidence(checks, full_text)
    passed = sum(1 for check in checks if check["status"] == "pass")
    review = sum(1 for check in checks if check["status"] == "review")
    failed = sum(1 for check in checks if check["status"] == "fail")
    overall = "pass" if passed >= 4 else "fail" if failed >= 3 else "review"
    return {
        "status": overall,
        "checks": checks,
        "summary": {"passed": passed, "review": review, "failed": failed},
    }


def extract_candidate_headers(full_text: str) -> tuple[list[str], list[str]]:
    raw_candidates: set[str] = set()
    for raw_line in full_text.splitlines():
        line = raw_line.strip()
        if not line or len(line) > 80 or len(line) < 3:
            continue
        if len(line.split()) <= 5:
            raw_candidates.add(re.sub(r"[:\-\s]+$", "", line).strip())
        for part in re.split(r"\t|  {2,}|\|", line):
            part = part.strip()
            if 3 <= len(part) <= 60 and len(part.split()) <= 5:
                raw_candidates.add(part)

    filtered = sorted(
        candidate for candidate in raw_candidates if not re.fullmatch(r"[\W_]+", candidate)
    )[:200]
    low_signal = sorted(
        candidate for candidate in raw_candidates if re.fullmatch(r"[\W_]+", candidate or "")
    )[:50]
    return filtered, low_signal


__all__ = [
    "build_addons_readiness",
    "build_entity_resolution",
    "build_financials_readiness",
    "build_opportunities_readiness",
    "build_resolution_story",
    "build_schedule_readiness",
    "classify_contract",
    "extract_candidate_headers",
]
