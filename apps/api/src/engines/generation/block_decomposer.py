"""Block decomposition pipeline for contract text."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from .engine import _normalize_contract_type, load_unified_library

_HEADING_PATTERNS = [
    re.compile(r"^##\s+(.+)$", re.MULTILINE),
    re.compile(r"^ARTICLE\s+\d+\.?\s+(.+)$", re.MULTILINE | re.IGNORECASE),
    re.compile(r"^Section\s+\d+\s*[-–]\s*(.+)$", re.MULTILINE | re.IGNORECASE),
    re.compile(r"^\d+\.\s+([A-Z][A-Z\s]{3,})$", re.MULTILINE),
    re.compile(r"^\([A-Z]\)\s+(.+)$", re.MULTILINE),
    re.compile(r"^[IVXLC]+\.\s+(.+)$", re.MULTILINE),
]

_SECTION_KEYWORDS: dict[str, list[str]] = {
    "recitals": ["recital", "preamble", "whereas", "background"],
    "definitions": ["definition"],
    "scope": ["scope", "grant of license", "grant of rights", "engagement"],
    "territory": ["territory", "geographic"],
    "term": ["term", "duration", "period", "option"],
    "compensation": [
        "compensation",
        "payment",
        "royalt",
        "financial",
        "advance",
        "fee",
        "remuneration",
        "commission",
        "license fee",
        "episode fee",
        "director fee",
    ],
    "rights": ["right", "obligation", "grant", "exploitation", "authority", "administration"],
    "restrictions": [
        "restriction",
        "limitation",
        "prohibition",
        "holdback",
        "window",
        "exclusivity",
    ],
    "confidentiality": ["confidential", "non-disclosure", "nda"],
    "indemnification": ["indemnif", "hold harmless"],
    "termination": ["terminat", "expir", "sell-off", "sell off"],
    "governing": ["governing", "law", "jurisdiction", "dispute"],
    "signatures": ["signature", "witness", "execution", "in witness"],
    "talent_billing": ["credit", "billing", "screen credit"],
    "residuals": ["residual", "backend", "participation"],
    "guild": ["guild", "union", "sag", "aftra", "dga", "wga"],
    "creative_control": ["creative control", "final cut", "approval"],
    "deliverables": ["deliver", "material"],
    "notices": ["notice", "notification"],
    "force_majeure": ["force majeure"],
    "general_provisions": [
        "general",
        "miscellaneous",
        "surviving",
        "severability",
        "waiver",
        "counterpart",
        "entire agreement",
    ],
}


def _classify_heading(heading_text: str) -> str:
    lower = heading_text.lower().strip()
    lower = re.sub(
        r"^(?:article\s+\d+\.?\s*|section\s+\d+\s*[-–]\s*|\d+\.?\s*|\([a-z]\)\s*|[ivxlc]+\.\s*)",
        "",
        lower,
    ).strip()
    for section_type, keywords in _SECTION_KEYWORDS.items():
        if any(keyword in lower for keyword in keywords):
            return section_type
    return "other"


class BlockDecomposer:
    """Decompose contract text into clause-level blocks."""

    def __init__(self) -> None:
        self._library: dict[str, Any] | None = None

    def _get_library(self) -> dict[str, Any]:
        if self._library is None:
            self._library = load_unified_library()
        return self._library

    def decompose(
        self,
        text: str,
        contract_type: str,
        known_section_map: dict[str, list[str]] | None = None,
    ) -> list[dict[str, Any]]:
        raw_sections = self._parse_sections(text)
        blocks: list[dict[str, Any]] = []

        for index, section in enumerate(raw_sections):
            heading = section["heading"]
            body = section["body"]
            section_type = section["section_type"]
            matched_clause_id: str | None = None
            matched_clause_type: str | None = None
            confidence = 0.0

            if known_section_map and section_type in known_section_map:
                clause_ids = known_section_map[section_type]
                if clause_ids:
                    matched_clause_id = clause_ids[0]
                    matched_clause_type = self._get_clause_type(matched_clause_id)
                    confidence = 1.0
            else:
                matched_clause_id, matched_clause_type, confidence = self._match_clause(
                    body, section_type, contract_type
                )

            blocks.append(
                {
                    "block_index": index,
                    "section_type": section_type,
                    "heading": heading,
                    "body": body,
                    "matched_clause_id": matched_clause_id,
                    "matched_clause_type": matched_clause_type,
                    "confidence": confidence,
                    "contract_type": _normalize_contract_type(contract_type),
                }
            )

        return blocks

    def _parse_sections(self, text: str) -> list[dict[str, str]]:
        sections: list[dict[str, str]] = []
        for part in re.split(r"\n---\n", text):
            part = part.strip()
            if not part:
                continue

            heading = ""
            body = part
            section_type = "other"
            for pattern in _HEADING_PATTERNS:
                match = pattern.search(part)
                if match:
                    heading = match.group(1).strip()
                    body = part[match.end() :].strip()
                    section_type = _classify_heading(heading)
                    break

            sections.append({"heading": heading, "body": body, "section_type": section_type})
        return sections

    def _get_clause_type(self, clause_id: str) -> str:
        for clause in self._get_library()["clauses"]:
            if clause.get("clause_id") == clause_id:
                return str(clause.get("clause_type", "UNKNOWN"))
        return "UNKNOWN"

    def _match_clause(
        self, body: str, section_type: str, contract_type: str
    ) -> tuple[str | None, str | None, float]:
        if not body or len(body) < 20:
            return None, None, 0.0

        normalized_contract_type = _normalize_contract_type(contract_type)
        best_id: str | None = None
        best_type: str | None = None
        best_score = 0.0
        body_lower = body.lower()

        for clause in self._get_library()["clauses"]:
            clause_contract_types = [
                _normalize_contract_type(str(item)) for item in clause.get("contract_types", [])
            ]
            if normalized_contract_type not in clause_contract_types:
                continue

            score = 0.0
            if clause.get("section") == section_type:
                score += 0.3

            for variable in clause.get("variables", []):
                extraction = variable.get("extraction", {})
                for anchor in extraction.get("anchor_patterns", []):
                    if str(anchor).lower() in body_lower:
                        score += 0.15

            for label in clause.get("cuad_labels", []):
                first_token = str(label).lower().replace("/", " ").split()[0]
                if first_token in body_lower:
                    score += 0.05

            if score > best_score:
                best_score = score
                best_id = clause.get("clause_id")
                best_type = clause.get("clause_type")

        confidence = min(best_score, 1.0)
        if confidence < 0.15:
            return None, None, 0.0
        return str(best_id) if best_id else None, str(best_type) if best_type else None, confidence

    def decompose_corpus(
        self, manifest_path: str | Path, output_path: str | Path | None = None
    ) -> list[dict[str, Any]]:
        manifest_file = Path(manifest_path)
        with manifest_file.open(encoding="utf-8") as file_obj:
            manifest = json.load(file_obj)

        all_blocks: list[dict[str, Any]] = []
        for contract in manifest.get("contracts", []):
            text_path = contract.get("text_path", "")
            if not text_path:
                continue
            source_file = Path(text_path)
            if not source_file.exists():
                continue

            text = source_file.read_text(encoding="utf-8")
            blocks = self.decompose(
                text,
                str(contract["contract_type"]),
                known_section_map=contract.get("section_map"),
            )
            for block in blocks:
                block["contract_id"] = contract["contract_id"]
            all_blocks.extend(blocks)

        if output_path is not None:
            output_file = Path(output_path)
            output_file.parent.mkdir(parents=True, exist_ok=True)
            output_file.write_text(json.dumps(all_blocks, indent=2), encoding="utf-8")

        return all_blocks
