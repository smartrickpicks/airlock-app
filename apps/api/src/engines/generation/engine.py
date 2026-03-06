"""Unified contract generation engine."""

from __future__ import annotations

import json
import random
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

RULES_DIR = Path(__file__).resolve().parents[3] / "rules"


@lru_cache(maxsize=1)
def load_unified_library() -> dict[str, Any]:
    """Load the unified clause library v2."""
    path = RULES_DIR / "generation" / "clause_library_v2.json"
    with path.open(encoding="utf-8") as file_obj:
        return json.load(file_obj)


@lru_cache(maxsize=1)
def _build_clause_index() -> dict[str, dict[str, list[dict[str, Any]]]]:
    """Build lookup indexes for fast clause selection."""
    lib = load_unified_library()
    by_section: dict[str, list[dict[str, Any]]] = {}
    by_type: dict[str, list[dict[str, Any]]] = {}
    by_contract_type: dict[str, list[dict[str, Any]]] = {}

    for clause in lib["clauses"]:
        sec = str(clause.get("section", "other"))
        by_section.setdefault(sec, []).append(clause)

        clause_type = str(clause.get("clause_type", "UNKNOWN"))
        by_type.setdefault(clause_type, []).append(clause)

        for contract_type in clause.get("contract_types", []):
            by_contract_type.setdefault(str(contract_type), []).append(clause)

    return {
        "by_section": by_section,
        "by_type": by_type,
        "by_contract_type": by_contract_type,
    }


@lru_cache(maxsize=16)
def load_template(contract_type: str) -> dict[str, Any]:
    """Load a contract template. Falls back to an auto-generated template."""
    path = RULES_DIR / "generation" / "templates" / f"{contract_type}.json"
    try:
        with path.open(encoding="utf-8") as file_obj:
            return json.load(file_obj)
    except FileNotFoundError:
        return _auto_template(contract_type)


@lru_cache(maxsize=4)
def load_generation_pairs() -> dict[str, Any]:
    """Load legacy generation pairs if present."""
    path = RULES_DIR / "rules_bundle" / "generation_pairs.json"
    with path.open(encoding="utf-8") as file_obj:
        return json.load(file_obj)


@lru_cache(maxsize=4)
def load_clause_library() -> dict[str, Any]:
    """Load the legacy clause library if present."""
    path = RULES_DIR / "generation" / "clause_library.json"
    with path.open(encoding="utf-8") as file_obj:
        return json.load(file_obj)


_DEFAULT_SECTIONS: list[tuple[str, str, int]] = [
    ("recitals", "RECITALS", 1),
    ("definitions", "DEFINITIONS", 2),
    ("scope", "SCOPE OF AGREEMENT", 3),
    ("territory", "TERRITORY", 4),
    ("term", "TERM", 5),
    ("compensation", "COMPENSATION", 6),
    ("rights", "RIGHTS AND OBLIGATIONS", 7),
    ("restrictions", "RESTRICTIONS", 8),
    ("confidentiality", "CONFIDENTIALITY", 9),
    ("indemnification", "INDEMNIFICATION", 10),
    ("warranties", "REPRESENTATIONS AND WARRANTIES", 11),
    ("termination", "TERMINATION", 12),
    ("dispute_resolution", "DISPUTE RESOLUTION", 13),
    ("general_provisions", "GENERAL PROVISIONS", 14),
    ("notices", "NOTICES", 15),
    ("signatures", "SIGNATURES", 99),
]


def _auto_template(contract_type: str) -> dict[str, Any]:
    """Generate a template from the clause library for a given contract type."""
    idx = _build_clause_index()
    contract_key = contract_type.replace("-", "_")
    available_clauses = idx["by_contract_type"].get(contract_key, [])

    available_sections = {str(clause.get("section", "other")) for clause in available_clauses}
    sections: list[dict[str, Any]] = []
    for section_id, title, order in _DEFAULT_SECTIONS:
        if section_id in available_sections or section_id in {"recitals", "signatures"}:
            sections.append(
                {
                    "id": section_id,
                    "title": f"{order}. {title}" if order < 99 else title,
                    "order": order,
                    "type": "clause_driven",
                }
            )

    return {
        "template_id": f"{contract_type}-auto-v1",
        "contract_type": contract_type,
        "display_name": contract_type.replace("-", " ").replace("_", " ").title(),
        "sections": sections,
        "required_fields": ["OPP_CONTRACT_TYPE"],
        "auto_generated": True,
    }


def _normalize_contract_type(contract_type: str) -> str:
    """Normalize contract type for matching."""
    return contract_type.lower().replace("-", "_").replace(" ", "_")


def _clause_matches_contract(clause: dict[str, Any], contract_type: str) -> bool:
    """Check if a clause applies to this contract type."""
    normalized = _normalize_contract_type(contract_type)
    for clause_contract_type in clause.get("contract_types", []):
        if _normalize_contract_type(str(clause_contract_type)) == normalized:
            return True
    return False


def _evaluate_triggers(clause: dict[str, Any], form_values: dict[str, Any]) -> bool:
    """Check whether a clause's triggers are satisfied."""
    triggers = clause.get("triggers", [])
    if not triggers:
        return True

    for trigger in triggers:
        field = str(trigger.get("field", ""))
        condition = str(trigger.get("condition", "equals"))
        value = str(trigger.get("value", ""))
        form_value = form_values.get(field, "")

        if condition == "equals":
            if str(form_value).strip().lower() != value.strip().lower():
                return False
        elif condition == "in":
            allowed = [item.strip().lower() for item in value.split(",")]
            if str(form_value).strip().lower() not in allowed:
                return False
        elif condition == "not_equals":
            if str(form_value).strip().lower() == value.strip().lower():
                return False
        elif condition == "exists":
            if not form_value:
                return False
        elif condition == "not_exists" and form_value:
            return False

    return True


def select_clauses(
    contract_type: str, form_values: dict[str, Any], seed: int = 42
) -> dict[str, list[dict[str, Any]]]:
    """Select the best matching clause for each section."""
    rng = random.Random(seed)
    idx = _build_clause_index()
    normalized_contract_type = _normalize_contract_type(contract_type)
    all_clauses = idx["by_contract_type"].get(normalized_contract_type, [])

    candidates: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for clause in all_clauses:
        if not _evaluate_triggers(clause, form_values):
            continue
        key = (
            str(clause.get("section", "other")),
            str(clause.get("clause_type", "UNKNOWN")),
        )
        candidates.setdefault(key, []).append(clause)

    selected_by_section: dict[str, list[dict[str, Any]]] = {}
    for (section, _clause_type), variants in candidates.items():
        variants.sort(
            key=lambda clause: clause.get("generation_config", {}).get("priority", 50),
            reverse=True,
        )
        chosen = rng.choice(variants)
        selected_by_section.setdefault(section, []).append(chosen)

    for section in selected_by_section:
        selected_by_section[section].sort(
            key=lambda clause: clause.get("generation_config", {}).get("priority", 50),
            reverse=True,
        )

    return selected_by_section


def interpolate(template_str: str, values: dict[str, Any]) -> str:
    """Replace ``{{variable}}`` placeholders with dict values."""

    def replacer(match: re.Match[str]) -> str:
        key = match.group(1).strip()
        return str(values.get(key, "[TO_BE_DEFINED]"))

    return re.sub(r"\{\{(.+?)\}\}", replacer, template_str)


def render_clause(clause: dict[str, Any], form_values: dict[str, Any]) -> str:
    """Render a single clause by interpolating its body with form values."""
    merged = dict(form_values)
    for variable in clause.get("variables", []):
        field = str(variable.get("field", ""))
        if field and field not in merged and variable.get("default") is not None:
            merged[field] = variable["default"]

    body = str(clause.get("body", "[TO_BE_DEFINED]"))
    return interpolate(body, merged)


def _match_expansion(expansion: dict[str, Any], value: Any) -> bool:
    if expansion.get("default"):
        return True
    when = expansion.get("when", {})
    if "equals" in when:
        return str(value).strip().lower() == str(when["equals"]).strip().lower()
    if "pattern" in when:
        return bool(re.match(str(when["pattern"]), str(value)))
    if "contains" in when:
        value_lower = str(value).lower()
        return all(keyword.lower() in value_lower for keyword in when["contains"])
    return False


def _apply_capture_groups(template_str: str, value: Any) -> str:
    result = template_str
    for expansion_pattern in re.findall(r"\{\{\$(\d+)\}\}", template_str):
        index = int(expansion_pattern)
        parts = str(value).split("/")
        if index <= len(parts):
            result = result.replace(f"{{{{${expansion_pattern}}}}}", parts[index - 1])
    return result


def render_pair(pair: dict[str, Any], form_values: dict[str, Any]) -> str:
    """Render a legacy generation pair."""
    field = str(pair["field"])
    generation = pair["generation"]
    value = form_values.get(field)
    if value is None or str(value).strip() == "":
        return str(generation.get("fallback", "[TO_BE_DEFINED]"))
    for expansion in generation["expansions"]:
        if _match_expansion(expansion, value):
            template = str(expansion["template"])
            rendered = template.replace("{{value}}", str(value))
            rendered = _apply_capture_groups(rendered, value)
            rendered = interpolate(rendered, form_values)
            return rendered
    return str(generation.get("fallback", "[TO_BE_DEFINED]"))


def generate_contract(form_values: dict[str, Any], contract_type: str, seed: int = 42) -> str:
    """Generate a contract from form values using the unified clause library."""
    template = load_template(contract_type)
    selected = select_clauses(contract_type, form_values, seed=seed)

    try:
        pairs_data = load_generation_pairs()
        pairs = pairs_data.get("pairs", [])
    except (FileNotFoundError, json.JSONDecodeError):
        pairs = []

    sections: list[str] = []
    for section in template["sections"]:
        section_id = str(section["id"])
        title = str(section["title"])
        matched_clauses = selected.get(section_id, [])

        if matched_clauses:
            texts = [render_clause(clause, form_values) for clause in matched_clauses]
            text = "\n\n".join(item for item in texts if item and item != "[TO_BE_DEFINED]")
            if not text:
                text = "[TO_BE_DEFINED]"
        else:
            field_pairs = [pair for pair in pairs if pair.get("section") == section_id]
            field_pairs.sort(key=lambda pair: pair.get("order", 99))
            if field_pairs:
                texts = [render_pair(pair, form_values) for pair in field_pairs]
                text = "\n\n".join(item for item in texts if item != "[TO_BE_DEFINED]")
                if not text:
                    text = "[TO_BE_DEFINED]"
            else:
                default_clause = section.get("default_clause")
                if default_clause:
                    try:
                        legacy_library = load_clause_library()
                        legacy_clauses = legacy_library.get("clauses", {})
                        if default_clause in legacy_clauses:
                            text = interpolate(
                                str(legacy_clauses[default_clause].get("text", "[TO_BE_DEFINED]")),
                                form_values,
                            )
                        else:
                            text = "[TO_BE_DEFINED]"
                    except (FileNotFoundError, json.JSONDecodeError):
                        text = "[TO_BE_DEFINED]"
                else:
                    text = "[TO_BE_DEFINED]"

        sections.append(f"## {title}\n\n{text}")

    return "\n\n---\n\n".join(sections)


def generate_contract_with_metadata(
    form_values: dict[str, Any], contract_type: str, seed: int = 42
) -> dict[str, Any]:
    """Generate a contract and return both text and generation metadata."""
    selected = select_clauses(contract_type, form_values, seed=seed)
    text = generate_contract(form_values, contract_type, seed=seed)

    clause_ids: list[str] = []
    cuad_labels: set[str] = set()
    section_map: dict[str, list[str]] = {}
    for section_id, clauses in selected.items():
        section_map[section_id] = []
        for clause in clauses:
            clause_id = str(clause.get("clause_id", "UNKNOWN"))
            clause_ids.append(clause_id)
            section_map[section_id].append(clause_id)
            cuad_labels.update(str(label) for label in clause.get("cuad_labels", []))

    return {
        "text": text,
        "contract_type": _normalize_contract_type(contract_type),
        "form_values": form_values,
        "selected_clauses": clause_ids,
        "cuad_labels": sorted(cuad_labels),
        "section_map": section_map,
        "seed": seed,
    }
