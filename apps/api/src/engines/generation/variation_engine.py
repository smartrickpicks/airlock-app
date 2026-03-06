"""Structural variation engine for synthetic contract generation."""

from __future__ import annotations

import random
import re
from copy import deepcopy
from typing import Any


def _to_roman(number: int) -> str:
    """Convert integer to Roman numeral."""
    values = [
        (1000, "M"),
        (900, "CM"),
        (500, "D"),
        (400, "CD"),
        (100, "C"),
        (90, "XC"),
        (50, "L"),
        (40, "XL"),
        (10, "X"),
        (9, "IX"),
        (5, "V"),
        (4, "IV"),
        (1, "I"),
    ]
    result = ""
    for value, numeral in values:
        while number >= value:
            result += numeral
            number -= value
    return result


HEADING_STYLES = {
    "ARTICLE_N_DOT": lambda number, title: f"ARTICLE {number}. {title.upper()}",
    "SECTION_N_DASH": lambda number, title: f"Section {number} - {title.title()}",
    "N_DOT_UPPER": lambda number, title: f"{number}. {title.upper()}",
    "N_DOT_TITLE": lambda number, title: f"{number}. {title.title()}",
    "ROMAN_DOT": lambda number, title: f"{_to_roman(number)}. {title.upper()}",
    "LETTER_PAREN": lambda number, title: f"({chr(64 + number)}) {title.title()}",
    "BARE_UPPER": lambda _number, title: title.upper(),
    "BARE_TITLE": lambda _number, title: title.title(),
    "UNDERLINED_TITLE": lambda number, title: f"{number}. {title.title()}\n{'-' * len(title)}",
}

PARAGRAPH_STYLES: dict[str, str | None] = {
    "standard": "\n\n",
    "dense": "\n",
    "indented": "\n\n    ",
    "numbered_sub": None,
}

MERGEABLE_PAIRS: list[tuple[str, str]] = [
    ("term", "territory"),
    ("term", "renewal"),
    ("rights", "restrictions"),
    ("compensation", "payment_terms"),
    ("scope", "territory"),
]

SPLITTABLE_SECTIONS: dict[str, list[str]] = {
    "compensation": [
        "Royalty Rates",
        "Advance Payments",
        "Payment Schedule",
        "Recoupment",
        "Audit Rights",
    ],
    "rights": ["Grant of Rights", "Exploitation Rights", "Reserved Rights"],
    "restrictions": [
        "Use Restrictions",
        "Territory Limitations",
        "Approval Requirements",
    ],
    "term": ["Initial Term", "Renewal Options", "Option Periods"],
}

OPTIONAL_BOILERPLATE: dict[str, str] = {
    "definitions": (
        "## DEFINITIONS\n\n"
        "For purposes of this Agreement, the following terms shall have the meanings set forth below:\n\n"
        '(a) "Net Receipts" means all gross revenues actually received by Label, less customary deductions.\n\n'
        '(b) "Territory" means the geographic area specified in this Agreement.\n\n'
        '(c) "Term" means the period during which this Agreement is in effect.\n\n'
        '(d) "Masters" means the sound recordings delivered under this Agreement.'
    ),
    "entire_agreement": (
        "This Agreement constitutes the entire agreement between the parties with respect to the subject matter hereof "
        "and supersedes all prior negotiations, representations, warranties, commitments, offers, contracts, and writings, "
        "whether written or oral."
    ),
    "severability": (
        "If any provision of this Agreement is held to be invalid or unenforceable, the remaining provisions shall "
        "continue in full force and effect."
    ),
    "counterparts": (
        "This Agreement may be executed in counterparts, each of which shall be deemed an original, and all of which "
        "together shall constitute one and the same instrument."
    ),
    "waiver": (
        "The failure of either party to enforce any provision of this Agreement shall not be construed as a waiver "
        "of such provision or the right to enforce it at a later time."
    ),
    "force_majeure": (
        "Neither party shall be liable for any failure or delay in performing its obligations under this Agreement due "
        "to causes beyond its reasonable control, including but not limited to acts of God, war, terrorism, pandemic, "
        "or natural disaster."
    ),
    "notices": (
        "All notices under this Agreement shall be in writing and shall be deemed given when delivered personally, sent "
        "by confirmed email, or three (3) business days after being sent by certified mail, return receipt requested."
    ),
}


class VariationEngine:
    """Apply structural variations to generated contract text."""

    def __init__(self, seed: int = 42) -> None:
        self._rng = random.Random(seed)

    def apply(self, contract_text: str, seed: int | None = None) -> tuple[str, dict[str, Any]]:
        """Apply random structural variations to a contract."""
        if seed is not None:
            self._rng = random.Random(seed)

        sections = self._parse_sections(contract_text)
        details: dict[str, Any] = {}

        sections, order = self._reorder_sections(sections)
        details["section_order"] = order

        style_name = self._rng.choice(list(HEADING_STYLES.keys()))
        sections = self._restyle_headings(sections, style_name)
        details["heading_style"] = style_name

        paragraph_style = self._rng.choice(list(PARAGRAPH_STYLES.keys()))
        sections = self._vary_paragraph_density(sections, paragraph_style)
        details["paragraph_style"] = paragraph_style

        inject, remove = self._boilerplate_variation(sections)
        sections = self._apply_boilerplate(sections, inject, remove)
        details["boilerplate_injected"] = inject
        details["boilerplate_removed"] = remove

        if self._rng.random() < 0.3:
            sections, merged = self._merge_sections(sections)
            details["merged_sections"] = merged
        else:
            details["merged_sections"] = []

        if self._rng.random() < 0.2:
            sections, split = self._split_sections(sections)
            details["split_sections"] = split
        else:
            details["split_sections"] = []

        return self._reassemble(sections), details

    def _parse_sections(self, text: str) -> list[dict[str, Any]]:
        sections: list[dict[str, Any]] = []
        for part in re.split(r"\n---\n", text):
            part = part.strip()
            if not part:
                continue

            match = re.match(r"^##\s+(.+?)(?:\n\n|\n)(.*)", part, re.DOTALL)
            if match:
                title = match.group(1).strip()
                body = match.group(2).strip()
                section_type = self._classify_section(title)
                sections.append(
                    {
                        "title": title,
                        "body": body,
                        "type": section_type,
                        "original_index": len(sections),
                    }
                )
            else:
                sections.append(
                    {
                        "title": "",
                        "body": part,
                        "type": "unknown",
                        "original_index": len(sections),
                    }
                )
        return sections

    def _classify_section(self, title: str) -> str:
        title_lower = title.lower()
        classifications = {
            "recitals": ["recital", "preamble", "whereas", "background"],
            "definitions": ["definition"],
            "scope": ["scope", "grant of license", "grant of rights"],
            "territory": ["territory", "geographic"],
            "term": ["term", "duration", "period"],
            "compensation": [
                "compensation",
                "payment",
                "royalt",
                "financial",
                "advance",
                "fee",
                "remuneration",
            ],
            "rights": ["right", "obligation", "grant"],
            "restrictions": ["restriction", "limitation", "prohibition"],
            "termination": ["terminat", "expir"],
            "governing": ["governing", "law", "jurisdiction", "dispute"],
            "signatures": ["signature", "witness", "execution", "in witness"],
            "confidentiality": ["confidential", "non-disclosure", "nda"],
            "indemnification": ["indemnif", "hold harmless"],
            "notices": ["notice", "notification"],
            "force_majeure": ["force majeure", "act of god"],
            "talent_billing": ["credit", "billing", "screen credit"],
            "residuals": ["residual", "backend", "participation"],
            "guild": ["guild", "union", "sag", "aftra", "dga", "wga"],
            "episode_schedule": ["episode", "season", "series order"],
        }

        for section_type, keywords in classifications.items():
            if any(keyword in title_lower for keyword in keywords):
                return section_type
        return "other"

    def _reorder_sections(
        self, sections: list[dict[str, Any]]
    ) -> tuple[list[dict[str, Any]], list[int]]:
        if len(sections) <= 2:
            return sections, list(range(len(sections)))

        first: list[tuple[int, dict[str, Any]]] = []
        last: list[tuple[int, dict[str, Any]]] = []
        middle: list[tuple[int, dict[str, Any]]] = []

        for index, section in enumerate(sections):
            if section["type"] in {"recitals", "definitions"}:
                first.append((index, section))
            elif section["type"] == "signatures":
                last.append((index, section))
            else:
                middle.append((index, section))

        self._rng.shuffle(middle)
        reordered = first + middle + last
        return [section for _, section in reordered], [index for index, _ in reordered]

    def _restyle_headings(
        self, sections: list[dict[str, Any]], style_name: str
    ) -> list[dict[str, Any]]:
        style_fn = HEADING_STYLES[style_name]
        result: list[dict[str, Any]] = []
        counter = 1
        for section in sections:
            updated = deepcopy(section)
            if updated["title"] and updated["type"] != "signatures":
                base = re.sub(
                    r"^(?:ARTICLE\s+\d+\.?\s*|Section\s+\d+\s*[-–]\s*|\d+\.?\s*|\([A-Z]\)\s*|[IVXLC]+\.\s*)",
                    "",
                    updated["title"],
                ).strip()
                updated["title"] = style_fn(counter, base or updated["title"])
                counter += 1
            result.append(updated)
        return result

    def _vary_paragraph_density(
        self, sections: list[dict[str, Any]], style: str
    ) -> list[dict[str, Any]]:
        if style == "numbered_sub":
            return self._number_sub_paragraphs(sections)

        joiner = PARAGRAPH_STYLES.get(style, "\n\n") or "\n\n"
        result: list[dict[str, Any]] = []
        for section in sections:
            updated = deepcopy(section)
            if updated["body"]:
                paragraphs = updated["body"].split("\n\n")
                updated["body"] = joiner.join(paragraphs)
            result.append(updated)
        return result

    def _number_sub_paragraphs(self, sections: list[dict[str, Any]]) -> list[dict[str, Any]]:
        result: list[dict[str, Any]] = []
        for section in sections:
            updated = deepcopy(section)
            if updated["body"] and updated["type"] not in {"recitals", "signatures"}:
                paragraphs = updated["body"].split("\n\n")
                if len(paragraphs) > 1:
                    numbered: list[str] = []
                    for index, paragraph in enumerate(paragraphs, 1):
                        style = self._rng.choice(["letter", "number", "roman"])
                        if style == "letter":
                            prefix = f"({chr(96 + index)})"
                        elif style == "roman":
                            prefix = f"({_to_roman(index).lower()})"
                        else:
                            prefix = f"({index})"
                        numbered.append(f"{prefix} {paragraph}")
                    updated["body"] = "\n\n".join(numbered)
            result.append(updated)
        return result

    def _boilerplate_variation(self, sections: list[dict[str, Any]]) -> tuple[list[str], list[str]]:
        existing_types = {str(section["type"]) for section in sections}
        injectable = [key for key in OPTIONAL_BOILERPLATE if key not in existing_types]
        inject_count = self._rng.randint(0, min(3, len(injectable)))
        inject = self._rng.sample(injectable, inject_count) if injectable else []

        removable_types = {
            "force_majeure",
            "notices",
            "counterparts",
            "waiver",
            "severability",
            "entire_agreement",
        }
        removable = [
            str(section["type"]) for section in sections if section["type"] in removable_types
        ]
        remove_count = self._rng.randint(0, min(1, len(removable)))
        remove = self._rng.sample(removable, remove_count) if removable else []
        return inject, remove

    def _apply_boilerplate(
        self, sections: list[dict[str, Any]], inject: list[str], remove: list[str]
    ) -> list[dict[str, Any]]:
        updated_sections = [section for section in sections if section["type"] not in remove]

        signature_index: int | None = None
        for index, section in enumerate(updated_sections):
            if section["type"] == "signatures":
                signature_index = index
                break

        for key in inject:
            new_section = {
                "title": key.replace("_", " ").title(),
                "body": OPTIONAL_BOILERPLATE[key],
                "type": key,
                "original_index": -1,
            }
            if signature_index is not None:
                updated_sections.insert(signature_index, new_section)
                signature_index += 1
            else:
                updated_sections.append(new_section)

        return updated_sections

    def _merge_sections(
        self, sections: list[dict[str, Any]]
    ) -> tuple[list[dict[str, Any]], list[tuple[str, str]]]:
        merged_pairs: list[tuple[str, str]] = []
        type_map = {str(section["type"]): index for index, section in enumerate(sections)}

        mutable_sections: list[dict[str, Any] | None] = list(sections)
        for type_a, type_b in MERGEABLE_PAIRS:
            if type_a in type_map and type_b in type_map and self._rng.random() < 0.5:
                index_a = type_map[type_a]
                index_b = type_map[type_b]
                if index_a < len(mutable_sections) and index_b < len(mutable_sections):
                    section_a = deepcopy(mutable_sections[index_a])
                    section_b = mutable_sections[index_b]
                    if section_a and section_b:
                        section_a["title"] = f"{section_a['title']} and {section_b['title']}"
                        section_a["body"] = f"{section_a['body']}\n\n{section_b['body']}"
                        mutable_sections[index_a] = section_a
                        mutable_sections[index_b] = None
                        merged_pairs.append((type_a, type_b))
                break

        return [section for section in mutable_sections if section is not None], merged_pairs

    def _split_sections(
        self, sections: list[dict[str, Any]]
    ) -> tuple[list[dict[str, Any]], list[str]]:
        split_info: list[str] = []
        result: list[dict[str, Any]] = []

        for section in sections:
            if section["type"] in SPLITTABLE_SECTIONS and self._rng.random() < 0.5:
                sub_names = SPLITTABLE_SECTIONS[str(section["type"])]
                paragraphs = str(section["body"]).split("\n\n")
                if len(paragraphs) >= 2:
                    sub_count = min(len(sub_names), len(paragraphs))
                    chunk_size = max(1, len(paragraphs) // sub_count)
                    for index in range(sub_count):
                        start = index * chunk_size
                        end = start + chunk_size if index < sub_count - 1 else len(paragraphs)
                        sub_section = deepcopy(section)
                        sub_section["title"] = f"{section['title']} - {sub_names[index]}"
                        sub_section["body"] = "\n\n".join(paragraphs[start:end])
                        sub_section["type"] = f"{section['type']}_sub"
                        result.append(sub_section)
                    split_info.append(str(section["type"]))
                    continue
            result.append(section)

        return result, split_info

    def _reassemble(self, sections: list[dict[str, Any]]) -> str:
        parts: list[str] = []
        for section in sections:
            if section["title"]:
                parts.append(f"## {section['title']}\n\n{section['body']}")
            else:
                parts.append(str(section["body"]))
        return "\n\n---\n\n".join(parts)


def apply_variations(contract_text: str, seed: int = 42) -> tuple[str, dict[str, Any]]:
    """Apply structural variations to generated contract text."""
    engine = VariationEngine(seed=seed)
    return engine.apply(contract_text, seed=seed)
