"""Entity resolver — matches extracted parties against vault hierarchy.

Two-pass resolution:
  Pass 1: Self-recognition — match against L1/L2 vaults (entity, division)
  Pass 2: Counterparty resolution — match against L3 vaults (counterparty)

Uses rapidfuzz for fuzzy string matching. No new DB tables — vault hierarchy
IS the entity index.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from rapidfuzz import fuzz

# Minimum confidence to consider a match viable
MATCH_THRESHOLD_AUTO = 0.90  # Auto-resolve (no manual confirmation)
MATCH_THRESHOLD_HIGH = 0.80  # High confidence (suggest, needs confirm)
MATCH_THRESHOLD_MIN = 0.60  # Minimum to surface as candidate


@dataclass
class EntityMatch:
    vault_id: str
    vault_name: str
    confidence: float
    match_type: str  # "exact" | "fuzzy"
    vault_level: int
    vault_type: str


def compute_match_confidence(extracted: str, candidate: str) -> float:
    """Compute normalized similarity between extracted name and candidate.

    Returns 0.0-1.0 confidence score using token-sort ratio for
    robustness against word reordering.
    """
    if not extracted or not candidate:
        return 0.0
    score = fuzz.token_sort_ratio(extracted.lower(), candidate.lower())
    return round(score / 100.0, 4)


def match_against_vaults(
    extracted_name: str,
    vaults: list[dict[str, Any]],
) -> EntityMatch | None:
    """Match an extracted party name against a list of vault dicts.

    Args:
        extracted_name: Name extracted from contract text.
        vaults: List of vault dicts with keys: id, name, vault_type, vault_level.

    Returns:
        Best EntityMatch if confidence >= MATCH_THRESHOLD_MIN, else None.
    """
    if not extracted_name or not vaults:
        return None

    best: EntityMatch | None = None
    best_conf = 0.0

    for vault in vaults:
        vault_name = vault.get("name", "")
        # Score against canonical name + any aliases, take the max
        candidates = [vault_name] + [a for a in vault.get("aliases", []) if a]
        conf = max(compute_match_confidence(extracted_name, c) for c in candidates)
        if conf >= MATCH_THRESHOLD_MIN and conf > best_conf:
            best_conf = conf
            best = EntityMatch(
                vault_id=vault["id"],
                vault_name=vault_name,
                confidence=conf,
                match_type="exact" if conf == 1.0 else "fuzzy",
                vault_level=vault.get("vault_level", 0),
                vault_type=vault.get("vault_type", ""),
            )

    return best


def resolve_parties(
    *,
    party_a: str | None,
    party_b: str | None,
    self_vaults: list[dict[str, Any]],
    counterparty_vaults: list[dict[str, Any]],
) -> dict[str, Any]:
    """Two-pass entity resolution against vault hierarchy.

    Pass 1: Try to match each party against self_vaults (L1/L2).
    Pass 2: Match remaining party against counterparty_vaults (L3).
    If party_a matches counterparty and party_b matches self, swap them.

    Returns resolution story dict compatible with build_resolution_story() shape.
    """
    parties = [p for p in [party_a, party_b] if p]

    if not parties:
        return _unresolved_story()

    # Pass 1: Self-recognition — match against L1/L2 vaults
    self_match: EntityMatch | None = None
    self_party: str | None = None

    for party in parties:
        match = match_against_vaults(party, self_vaults)
        if match and (self_match is None or match.confidence > self_match.confidence):
            self_match = match
            self_party = party

    remaining_parties = [p for p in parties if p != self_party]

    # Pass 2: Counterparty resolution — match remaining against L3 vaults
    cp_match: EntityMatch | None = None
    cp_party: str | None = None

    for party in remaining_parties:
        match = match_against_vaults(party, counterparty_vaults)
        if match and (cp_match is None or match.confidence > cp_match.confidence):
            cp_match = match
            cp_party = party

    # Handle swap: if party_a matched counterparty but not self, check party_b for self
    if self_match is None and cp_match is not None:
        other_parties = [p for p in parties if p != cp_party]
        for party in other_parties:
            swap_check = match_against_vaults(party, self_vaults)
            if swap_check:
                self_match = swap_check
                self_party = party
                break

    # When neither resolved: assign party names for display
    # party_a is conventionally self (legal entity), party_b is counterparty
    if self_match is None and self_party is None and len(parties) >= 1:
        self_party = parties[0]
    if cp_match is None and cp_party is None and len(parties) >= 2:
        cp_party = parties[1]

    # Build result
    auto_resolve = (
        self_match is not None
        and self_match.confidence >= MATCH_THRESHOLD_AUTO
        and cp_match is not None
        and cp_match.confidence >= MATCH_THRESHOLD_AUTO
    )

    legal_entity = _build_entity_result(self_match, self_party)
    counterparty = _build_entity_result(
        cp_match, cp_party or (remaining_parties[0] if remaining_parties else None)
    )
    new_entry_detected = cp_match is None and cp_party is not None

    return {
        "legal_entity": legal_entity,
        "counterparty": counterparty,
        "requires_manual_confirmation": not auto_resolve,
        "new_entry_detected": new_entry_detected,
    }


def _build_entity_result(match: EntityMatch | None, extracted_name: str | None) -> dict[str, Any]:
    """Build entity result dict from match result."""
    if match:
        return {
            "name": match.vault_name,
            "extracted_name": extracted_name or match.vault_name,
            "vault_id": match.vault_id,
            "confidence": match.confidence,
            "match_status": "resolved",
            "match_type": match.match_type,
        }
    return {
        "name": extracted_name or "",
        "extracted_name": extracted_name or "",
        "vault_id": None,
        "confidence": 0.0,
        "match_status": "unresolved",
        "match_type": "none",
    }


def _unresolved_story() -> dict[str, Any]:
    """Return a fully unresolved resolution result."""
    empty = {
        "name": "",
        "extracted_name": "",
        "vault_id": None,
        "confidence": 0.0,
        "match_status": "unresolved",
        "match_type": "none",
    }
    return {
        "legal_entity": dict(empty),
        "counterparty": dict(empty),
        "requires_manual_confirmation": True,
        "new_entry_detected": False,
    }
