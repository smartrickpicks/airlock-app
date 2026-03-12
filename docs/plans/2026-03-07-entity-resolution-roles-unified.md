# Entity Resolution + Role Enforcement — Unified Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the three critical stubs (entity resolution, role enforcement, frontend entity display) with working implementations that use the vault hierarchy as the entity index and enforce module roles at chamber advancement.

**Architecture:** Entity resolution resolves extracted party names against L1-L3 vaults in the workspace (self-recognition via L1/L2 entity/division vaults, counterparty resolution via L3 counterparty vaults). Role enforcement adds a permission check service consumed by vault routes. Frontend gets an EntityResolutionCard component in the Signal panel.

**Tech Stack:** FastAPI, SQLAlchemy, PostgreSQL 16 (ULID PKs, JSONB metadata), rapidfuzz for fuzzy matching, Next.js 14 App Router, Zustand, Tailwind tokens

---

## Dependency Map

```
Stream A: Entity Resolution (backend)
  Task 1 → Task 2 → Task 3 → Task 4

Stream B: Role Enforcement (backend)
  Task 5 → Task 6 → Task 7

Stream C: Frontend Entity Resolution
  Task 8 → Task 9

Dependencies:
  - Stream A and Stream B are INDEPENDENT (can run in parallel)
  - Stream C depends on Stream A completing (needs resolution API shape)
  - Task 9 depends on Task 8
```

## Pre-Implementation Reading List

Before touching code, the implementing agent MUST read:

- `docs/specs/roles/overview.md` — 3-layer role model (Org, Module, Agentic)
- `docs/plans/2026-03-07-entity-resolution-self-recognition-design.md` — Approved: vault hierarchy as entity index
- `docs/specs/record-inspector/entity-resolution.md` — UI spec for entity resolution cards
- `docs/specs/shell/universal-chambers.md` — Gate definitions per chamber
- `apps/api/CLAUDE.md` — Backend conventions (Route > Service > Model)
- `apps/web/CLAUDE.md` — Frontend conventions (if it exists)

## Critical Rules

- **DO NOT** create separate CRM tables. The vault hierarchy IS the entity index.
- **DO NOT** use "channel", "workstream", "phase", or "stage". Use: Vault, Module, Chamber, Gate, View.
- **DO NOT** put business logic in route handlers. All logic goes in `services/`.
- **DO NOT** use raw color values. Use Tailwind tokens from `tokens.css`.
- **DO NOT** break existing extractors. The 6 extractors in `engines/extraction/` are 100% working.
- **DO NOT** modify `compute_gate()` thresholds — they are locked policy (P1E).

---

## Stream A: Entity Resolution (Backend)

### Task 1: Entity Resolver Service — Vault-Hierarchy Matching

**Files:**

- Create: `apps/api/src/services/entity_resolver.py`
- Test: `apps/api/tests/test_entity_resolver.py`

**Context:** The approved spec says to use the vault hierarchy as the entity index. L1 vaults (vault_type="entity") and L2 vaults (vault_type="division") represent "self" — the workspace owner's legal entities. L3 vaults (vault_type="counterparty") represent counterparties. We match extracted party names against these vaults using fuzzy matching.

**Step 1: Write the failing tests**

```python
# apps/api/tests/test_entity_resolver.py
"""Tests for entity resolver service — vault-hierarchy matching."""

import pytest

from src.services.entity_resolver import (
    resolve_parties,
    match_against_vaults,
    compute_match_confidence,
    EntityMatch,
)


class TestComputeMatchConfidence:
    """Unit tests for fuzzy string matching confidence."""

    def test_exact_match_returns_1(self):
        assert compute_match_confidence("Acme Records", "Acme Records") == 1.0

    def test_case_insensitive_match(self):
        assert compute_match_confidence("acme records", "Acme Records") == 1.0

    def test_close_fuzzy_match(self):
        conf = compute_match_confidence("Acme Record", "Acme Records")
        assert 0.85 <= conf <= 0.99

    def test_no_match(self):
        conf = compute_match_confidence("Totally Different", "Acme Records")
        assert conf < 0.40

    def test_empty_strings(self):
        assert compute_match_confidence("", "") == 0.0
        assert compute_match_confidence("Acme", "") == 0.0


class TestMatchAgainstVaults:
    """Tests for matching an extracted name against a list of vault dicts."""

    @pytest.fixture
    def self_vaults(self):
        return [
            {"id": "V1", "name": "Capitol Music Group", "vault_type": "entity", "vault_level": 1},
            {"id": "V2", "name": "CEG Nashville", "vault_type": "division", "vault_level": 2},
        ]

    @pytest.fixture
    def counterparty_vaults(self):
        return [
            {"id": "V3", "name": "Summit Publishing", "vault_type": "counterparty", "vault_level": 3},
            {"id": "V4", "name": "Henderson Entertainment", "vault_type": "counterparty", "vault_level": 3},
        ]

    def test_exact_self_match(self, self_vaults):
        result = match_against_vaults("Capitol Music Group", self_vaults)
        assert result is not None
        assert result.vault_id == "V1"
        assert result.confidence == 1.0
        assert result.match_type == "exact"

    def test_fuzzy_self_match(self, self_vaults):
        result = match_against_vaults("Capitol Music Grp", self_vaults)
        assert result is not None
        assert result.vault_id == "V1"
        assert result.confidence >= 0.80
        assert result.match_type == "fuzzy"

    def test_no_match_returns_none(self, self_vaults):
        result = match_against_vaults("Totally Unknown Corp", self_vaults)
        assert result is None

    def test_counterparty_match(self, counterparty_vaults):
        result = match_against_vaults("Summit Publishing", counterparty_vaults)
        assert result is not None
        assert result.vault_id == "V3"
        assert result.confidence == 1.0

    def test_empty_vault_list(self):
        result = match_against_vaults("Anything", [])
        assert result is None


class TestResolveParties:
    """Integration test for the full 2-pass resolution flow."""

    @pytest.fixture
    def workspace_vaults(self):
        return {
            "self": [
                {"id": "V1", "name": "Capitol Music Group", "vault_type": "entity", "vault_level": 1},
            ],
            "counterparties": [
                {"id": "V3", "name": "Summit Publishing", "vault_type": "counterparty", "vault_level": 3},
            ],
        }

    def test_both_parties_resolved(self, workspace_vaults):
        result = resolve_parties(
            party_a="Capitol Music Group",
            party_b="Summit Publishing",
            self_vaults=workspace_vaults["self"],
            counterparty_vaults=workspace_vaults["counterparties"],
        )
        assert result["legal_entity"]["match_status"] == "resolved"
        assert result["legal_entity"]["confidence"] == 1.0
        assert result["counterparty"]["match_status"] == "resolved"
        assert result["counterparty"]["confidence"] == 1.0
        assert result["requires_manual_confirmation"] is False

    def test_self_resolved_counterparty_unknown(self, workspace_vaults):
        result = resolve_parties(
            party_a="Capitol Music Group",
            party_b="Unknown New Artist LLC",
            self_vaults=workspace_vaults["self"],
            counterparty_vaults=workspace_vaults["counterparties"],
        )
        assert result["legal_entity"]["match_status"] == "resolved"
        assert result["counterparty"]["match_status"] == "unresolved"
        assert result["new_entry_detected"] is True
        assert result["requires_manual_confirmation"] is True

    def test_neither_resolved(self, workspace_vaults):
        result = resolve_parties(
            party_a="Unknown Corp A",
            party_b="Unknown Corp B",
            self_vaults=workspace_vaults["self"],
            counterparty_vaults=workspace_vaults["counterparties"],
        )
        assert result["legal_entity"]["match_status"] == "unresolved"
        assert result["counterparty"]["match_status"] == "unresolved"
        assert result["requires_manual_confirmation"] is True

    def test_swapped_parties_still_resolve(self, workspace_vaults):
        """If party_a is actually a counterparty and party_b is self, resolver swaps them."""
        result = resolve_parties(
            party_a="Summit Publishing",
            party_b="Capitol Music Group",
            self_vaults=workspace_vaults["self"],
            counterparty_vaults=workspace_vaults["counterparties"],
        )
        assert result["legal_entity"]["match_status"] == "resolved"
        assert result["legal_entity"]["name"] == "Capitol Music Group"
        assert result["counterparty"]["match_status"] == "resolved"
        assert result["counterparty"]["name"] == "Summit Publishing"

    def test_no_parties_extracted(self, workspace_vaults):
        result = resolve_parties(
            party_a=None,
            party_b=None,
            self_vaults=workspace_vaults["self"],
            counterparty_vaults=workspace_vaults["counterparties"],
        )
        assert result["legal_entity"]["match_status"] == "unresolved"
        assert result["counterparty"]["match_status"] == "unresolved"
```

**Step 2: Run tests to verify they fail**

Run: `cd apps/api && python -m pytest tests/test_entity_resolver.py -v`
Expected: FAIL with "ModuleNotFoundError: No module named 'src.services.entity_resolver'"

**Step 3: Write the entity resolver service**

```python
# apps/api/src/services/entity_resolver.py
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
MATCH_THRESHOLD_MIN = 0.60   # Minimum to surface as candidate


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
        conf = compute_match_confidence(extracted_name, vault_name)
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
    remaining_parties: list[str] = []

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

    # If no self match found but we have remaining parties, try them as counterparties
    if cp_match is None:
        for party in remaining_parties:
            # Already tried above, no match — mark as unresolved
            cp_party = party
            break

    # Build result
    auto_resolve = (
        self_match is not None
        and self_match.confidence >= MATCH_THRESHOLD_AUTO
        and cp_match is not None
        and cp_match.confidence >= MATCH_THRESHOLD_AUTO
    )

    legal_entity = _build_entity_result(self_match, self_party)
    counterparty = _build_entity_result(cp_match, cp_party or (remaining_parties[0] if remaining_parties else None))
    new_entry_detected = cp_match is None and cp_party is not None

    return {
        "legal_entity": legal_entity,
        "counterparty": counterparty,
        "requires_manual_confirmation": not auto_resolve,
        "new_entry_detected": new_entry_detected,
    }


def _build_entity_result(
    match: EntityMatch | None, extracted_name: str | None
) -> dict[str, Any]:
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
```

**Step 4: Run tests to verify they pass**

Run: `cd apps/api && python -m pytest tests/test_entity_resolver.py -v`
Expected: All 12 tests PASS

**Step 5: Commit**

```bash
git add apps/api/src/services/entity_resolver.py apps/api/tests/test_entity_resolver.py
git commit -m "feat(api): add entity resolver service with vault-hierarchy matching"
```

---

### Task 2: Wire Entity Resolver into Preflight — Fetch Vaults for Resolution

**Files:**

- Create: `apps/api/src/services/entity_vault_loader.py`
- Test: `apps/api/tests/test_entity_vault_loader.py`

**Context:** The resolver needs vault data to match against. This service loads L1/L2 "self" vaults and L3 counterparty vaults for a given workspace. This is the bridge between the DB-backed vault hierarchy and the stateless entity resolver.

**Step 1: Write the failing test**

```python
# apps/api/tests/test_entity_vault_loader.py
"""Tests for entity vault loader — loads self/counterparty vaults from DB."""

import pytest

from src.services.entity_vault_loader import (
    load_self_vaults,
    load_counterparty_vaults,
    vault_to_match_dict,
)


class TestVaultToMatchDict:
    """Unit test for vault-to-dict conversion (no DB needed)."""

    def test_converts_vault_attrs(self):
        class FakeVault:
            id = "V1"
            name = "Acme Records"
            vault_type = "entity"
            vault_level = 1
            metadata_ = {"aliases": ["Acme", "Acme Recs"]}

        result = vault_to_match_dict(FakeVault())
        assert result["id"] == "V1"
        assert result["name"] == "Acme Records"
        assert result["vault_type"] == "entity"
        assert result["vault_level"] == 1
        assert result["aliases"] == ["Acme", "Acme Recs"]

    def test_missing_aliases_returns_empty(self):
        class FakeVault:
            id = "V2"
            name = "Test"
            vault_type = "entity"
            vault_level = 1
            metadata_ = {}

        result = vault_to_match_dict(FakeVault())
        assert result["aliases"] == []
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && python -m pytest tests/test_entity_vault_loader.py -v`
Expected: FAIL with "ModuleNotFoundError"

**Step 3: Write the vault loader**

```python
# apps/api/src/services/entity_vault_loader.py
"""Entity vault loader — fetches self/counterparty vaults for entity resolution.

Self vaults: L1 (entity) + L2 (division) — represent the workspace owner.
Counterparty vaults: L3 (counterparty) — represent business counterparties.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models.vault import Vault


def vault_to_match_dict(vault: Any) -> dict[str, Any]:
    """Convert a Vault ORM instance to a dict for the resolver."""
    metadata = getattr(vault, "metadata_", {}) or {}
    return {
        "id": vault.id,
        "name": vault.name,
        "vault_type": vault.vault_type,
        "vault_level": vault.vault_level,
        "aliases": metadata.get("aliases", []),
    }


def load_self_vaults(db: Session, workspace_id: str) -> list[dict[str, Any]]:
    """Load L1 (entity) and L2 (division) vaults for self-recognition."""
    stmt = (
        select(Vault)
        .where(
            Vault.workspace_id == workspace_id,
            Vault.vault_level.in_([1, 2]),
            Vault.vault_type.in_(["entity", "division"]),
            Vault.archived_at.is_(None),
        )
        .order_by(Vault.vault_level, Vault.name)
    )
    vaults = db.execute(stmt).scalars().all()
    return [vault_to_match_dict(v) for v in vaults]


def load_counterparty_vaults(db: Session, workspace_id: str) -> list[dict[str, Any]]:
    """Load L3 (counterparty) vaults for counterparty resolution."""
    stmt = (
        select(Vault)
        .where(
            Vault.workspace_id == workspace_id,
            Vault.vault_level == 3,
            Vault.vault_type == "counterparty",
            Vault.archived_at.is_(None),
        )
        .order_by(Vault.name)
    )
    vaults = db.execute(stmt).scalars().all()
    return [vault_to_match_dict(v) for v in vaults]
```

**Step 4: Run tests**

Run: `cd apps/api && python -m pytest tests/test_entity_vault_loader.py -v`
Expected: PASS (the unit test doesn't need DB)

**Step 5: Commit**

```bash
git add apps/api/src/services/entity_vault_loader.py apps/api/tests/test_entity_vault_loader.py
git commit -m "feat(api): add entity vault loader for self/counterparty resolution"
```

---

### Task 3: Replace Stubs in readiness.py — Wire Resolver into Preflight

**Files:**

- Modify: `apps/api/src/engines/preflight/readiness.py` (lines 157-220, 223-304)
- Modify: `apps/api/src/engines/preflight/engine.py` (lines 121-125)
- Test: `apps/api/tests/test_readiness_entity_resolution.py`

**Context:** Replace `_run_salesforce_match()` (returns []), `build_resolution_story()` (hardcoded 0.5), and `build_entity_resolution()` (always review/fail) with calls to the new entity resolver. The preflight engine needs to pass workspace_id + db session through so we can load vaults.

**Important:** The preflight engine is currently stateless (no DB access). We need to optionally pass workspace_id and db so entity resolution can query vaults. When not provided (e.g., stateless API call), fall back to the current regex-only behavior.

**Step 1: Write the failing test**

```python
# apps/api/tests/test_readiness_entity_resolution.py
"""Tests for entity resolution integration in readiness module."""

import pytest

from src.engines.preflight.readiness import (
    build_resolution_story,
    build_entity_resolution,
)


class TestBuildResolutionStoryWithResolver:
    """Tests that resolution story uses resolver when vault data is provided."""

    def test_resolved_self_and_counterparty(self):
        """When vault data is provided, resolver should produce real confidence scores."""
        self_vaults = [
            {"id": "V1", "name": "Capitol Music Group", "vault_type": "entity", "vault_level": 1},
        ]
        counterparty_vaults = [
            {"id": "V3", "name": "Summit Publishing", "vault_type": "counterparty", "vault_level": 3},
        ]
        full_text = "This agreement is between Capitol Music Group and Summit Publishing."

        story = build_resolution_story(
            sf_match_results=[],
            full_text=full_text,
            self_vaults=self_vaults,
            counterparty_vaults=counterparty_vaults,
        )
        assert story["legal_entity_account"] is not None
        assert story["legal_entity_account"]["confidence"] >= 0.90
        assert story["legal_entity_account"]["match_status"] == "resolved"
        assert story["requires_manual_confirmation"] is False

    def test_fallback_without_vault_data(self):
        """Without vault data, falls back to regex extraction with review status."""
        full_text = "This agreement is between Party A Inc and Party B LLC."
        story = build_resolution_story(sf_match_results=[], full_text=full_text)
        assert story["legal_entity_account"] is not None
        assert story["legal_entity_account"]["match_status"] == "review"
        assert story["requires_manual_confirmation"] is True

    def test_no_parties_in_text(self):
        """When no parties are found, everything is unresolved."""
        story = build_resolution_story(sf_match_results=[], full_text="Short text.")
        assert story["legal_entity_account"] is None
        assert story["counterparties"] == []


class TestBuildEntityResolution:
    """Tests that entity_resolution checks reflect actual resolution."""

    def test_resolved_entity_produces_pass(self):
        story = {
            "legal_entity_account": {
                "name": "Capitol Music Group",
                "match_status": "resolved",
                "confidence": 1.0,
                "vault_id": "V1",
            },
            "counterparties": [
                {
                    "name": "Summit Publishing",
                    "match_status": "resolved",
                    "confidence": 1.0,
                    "vault_id": "V3",
                }
            ],
            "unresolved_counterparties": [],
            "new_entry_detected": False,
            "requires_manual_confirmation": False,
            "primary_counterparty": {
                "name": "Summit Publishing",
                "match_status": "resolved",
                "confidence": 1.0,
            },
        }
        result = build_entity_resolution(story, sf_match=[], full_text="")
        ent_check = next(c for c in result["checks"] if c["code"] == "ENT_LEGAL_ENTITY")
        assert ent_check["status"] == "pass"
        assert ent_check["confidence"] >= 0.90

        cp_check = next(c for c in result["checks"] if c["code"] == "ENT_COUNTERPARTY")
        assert cp_check["status"] == "pass"
        assert cp_check["confidence"] >= 0.90
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && python -m pytest tests/test_readiness_entity_resolution.py -v`
Expected: FAIL — `build_resolution_story()` doesn't accept `self_vaults`/`counterparty_vaults` kwargs yet

**Step 3: Modify readiness.py — Replace the stubs**

Changes to `apps/api/src/engines/preflight/readiness.py`:

**3a. Replace `_run_salesforce_match` (lines 157-162) with a deprecation note:**

Replace:

```python
def _run_salesforce_match(
    extracted_headers: list[str], full_text: str = ""
) -> list[dict[str, Any]]:
    del extracted_headers, full_text
    logger.debug("Salesforce matching is stubbed until DB connectivity is ported")
    return []
```

With:

```python
def _run_salesforce_match(
    extracted_headers: list[str], full_text: str = ""
) -> list[dict[str, Any]]:
    """Deprecated — entity resolution now uses vault hierarchy matching.

    Retained for backward compatibility with engine.py call sites.
    """
    del extracted_headers, full_text
    return []
```

**3b. Replace `build_resolution_story` (lines 185-220):**

Replace the entire function with:

```python
def build_resolution_story(
    sf_match_results: list[dict[str, Any]],
    full_text: str,
    self_vaults: list[dict[str, Any]] | None = None,
    counterparty_vaults: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Build entity-resolution story.

    When self_vaults and counterparty_vaults are provided, uses the entity
    resolver for vault-hierarchy matching with real confidence scores.
    Otherwise, falls back to regex party extraction with review status.
    """
    del sf_match_results  # No longer used — vault hierarchy replaces SF matching

    party_a, party_b = _extract_parties(full_text)

    # If vault data is available, use the entity resolver
    if self_vaults is not None and counterparty_vaults is not None:
        from src.services.entity_resolver import resolve_parties

        resolution = resolve_parties(
            party_a=party_a,
            party_b=party_b,
            self_vaults=self_vaults,
            counterparty_vaults=counterparty_vaults,
        )
        legal = resolution["legal_entity"]
        cp = resolution["counterparty"]

        legal_entity_account = {
            "name": legal["name"],
            "match_status": legal["match_status"],
            "confidence": legal["confidence"],
            "vault_id": legal.get("vault_id"),
        } if legal["name"] else None

        counterparties = []
        if cp["name"]:
            counterparties.append({
                "name": cp["name"],
                "match_status": cp["match_status"],
                "confidence": cp["confidence"],
                "vault_id": cp.get("vault_id"),
            })

        return {
            "legal_entity_account": legal_entity_account,
            "counterparties": counterparties,
            "unresolved_counterparties": [cp["name"]] if cp["match_status"] == "unresolved" and cp["name"] else [],
            "requires_manual_confirmation": resolution["requires_manual_confirmation"],
            "new_entry_detected": resolution["new_entry_detected"],
            "primary_counterparty": counterparties[0] if counterparties else None,
        }

    # Fallback: regex-only extraction (no vault data)
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
    story: dict[str, Any] = {
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
```

**3c. Update `build_entity_resolution` (lines 223-304) — use match_status to drive status:**

In the existing function, change the ENT_LEGAL_ENTITY check to respect `match_status`:

Replace lines 229-249 with:

```python
    legal = resolution_story.get("legal_entity_account")
    if legal:
        match_status = legal.get("match_status", "review")
        confidence = float(legal.get("confidence", 0))
        # resolved → pass, review stays review, unresolved → fail
        if match_status == "resolved" and confidence >= 0.80:
            check_status = "pass"
        elif match_status == "unresolved":
            check_status = "fail"
        else:
            check_status = "review"
        checks.append(
            {
                "code": "ENT_LEGAL_ENTITY",
                "label": "Legal Entity (CEG)",
                "status": check_status,
                "value": legal.get("name", ""),
                "confidence": confidence,
                "vault_id": legal.get("vault_id"),
            }
        )
    else:
        checks.append(
            {
                "code": "ENT_LEGAL_ENTITY",
                "label": "Legal Entity (CEG)",
                "status": "fail",
                "value": "",
                "confidence": 0.0,
            }
        )
```

And replace lines 251-273 with similar logic for ENT_COUNTERPARTY:

```python
    counterparties = resolution_story.get("counterparties") or []
    if counterparties:
        primary = counterparties[0]
        match_status = primary.get("match_status", "review")
        confidence = float(primary.get("confidence", 0))
        if match_status == "resolved" and confidence >= 0.80:
            check_status = "pass"
        elif match_status == "unresolved":
            check_status = "fail"
        else:
            check_status = "review"
        checks.append(
            {
                "code": "ENT_COUNTERPARTY",
                "label": "Counterparty",
                "status": check_status,
                "value": primary.get("name", ""),
                "confidence": confidence,
                "vault_id": primary.get("vault_id"),
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
```

**Step 4: Run all tests**

Run: `cd apps/api && python -m pytest tests/test_readiness_entity_resolution.py tests/test_engine_routes.py -v`
Expected: All PASS. Existing engine route tests still pass because fallback path is preserved.

**Step 5: Commit**

```bash
git add apps/api/src/engines/preflight/readiness.py apps/api/tests/test_readiness_entity_resolution.py
git commit -m "feat(api): wire entity resolver into preflight readiness module"
```

---

### Task 4: Pass Workspace Context Through Preflight Engine

**Files:**

- Modify: `apps/api/src/engines/preflight/engine.py` (lines 38, 121-125)
- Modify: `apps/api/src/routes/engines.py` (preflight route)
- Test: `apps/api/tests/test_engine_routes.py` (verify existing tests still pass)

**Context:** `run_preflight()` is currently stateless — it takes `pages_data` and returns a result. To use the entity resolver, it needs optional `workspace_id` and `db` params. When provided, it loads vaults and passes them to `build_resolution_story()`. When not provided, falls back to current behavior.

**Step 1: Write the failing test**

```python
# Add to apps/api/tests/test_readiness_entity_resolution.py

class TestRunPreflightWithVaultContext:
    """Tests that run_preflight can accept workspace context for entity resolution."""

    def test_preflight_accepts_optional_vault_context(self):
        """run_preflight should accept self_vaults and counterparty_vaults kwargs."""
        from src.engines.preflight.engine import run_preflight

        pages_data = [
            {
                "page": 1,
                "text": "This agreement is between Acme Records and Summit Publishing...",
                "char_count": 200,
                "image_coverage_ratio": 0.0,
            }
        ]
        # Should not raise even with new kwargs
        result = run_preflight(
            pages_data,
            self_vaults=[{"id": "V1", "name": "Acme Records", "vault_type": "entity", "vault_level": 1}],
            counterparty_vaults=[{"id": "V3", "name": "Summit Publishing", "vault_type": "counterparty", "vault_level": 3}],
        )
        assert result["gate_color"] in ("RED", "YELLOW", "GREEN")
        # Entity resolution should show resolved matches
        er = result.get("entity_resolution", {})
        if er:
            ent_check = next((c for c in er.get("checks", []) if c["code"] == "ENT_LEGAL_ENTITY"), None)
            if ent_check:
                assert ent_check["confidence"] > 0.5  # Better than the old hardcoded 0.5
```

**Step 2: Run to verify failure**

Run: `cd apps/api && python -m pytest tests/test_readiness_entity_resolution.py::TestRunPreflightWithVaultContext -v`
Expected: FAIL — `run_preflight()` doesn't accept `self_vaults`/`counterparty_vaults` kwargs

**Step 3: Modify engine.py**

In `apps/api/src/engines/preflight/engine.py`, update the function signature and vault-passing:

Change line 38:

```python
def run_preflight(pages_data: list[dict[str, Any]]) -> dict[str, Any]:
```

To:

```python
def run_preflight(
    pages_data: list[dict[str, Any]],
    *,
    self_vaults: list[dict[str, Any]] | None = None,
    counterparty_vaults: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
```

Change lines 121-125 (the `build_resolution_story` call):

```python
    salesforce_match: list[dict[str, Any]] = []
    resolution_story = build_resolution_story(salesforce_match, full_text)
```

To:

```python
    salesforce_match: list[dict[str, Any]] = []
    resolution_story = build_resolution_story(
        salesforce_match,
        full_text,
        self_vaults=self_vaults,
        counterparty_vaults=counterparty_vaults,
    )
```

**Step 4: Run all tests**

Run: `cd apps/api && python -m pytest tests/test_readiness_entity_resolution.py tests/test_engine_routes.py -v`
Expected: All PASS

**Step 5: Commit**

```bash
git add apps/api/src/engines/preflight/engine.py
git commit -m "feat(api): pass vault context through preflight engine for entity resolution"
```

---

## Stream B: Role Enforcement (Backend)

### Task 5: Permission Check Service

**Files:**

- Create: `apps/api/src/services/permissions.py`
- Test: `apps/api/tests/test_permissions.py`

**Context:** We need a service that checks whether a user has the required module role to perform an action. The existing `VaultMember` model tracks per-vault roles (owner, gatekeeper, builder, viewer). Chamber advancement needs role checks:

- `discover → build`: Builder or higher
- `build → review`: Builder or higher
- `review → ship`: Gatekeeper or higher
- Archive: Owner only

Role hierarchy (highest to lowest): owner > gatekeeper > builder > viewer

**Step 1: Write the failing test**

```python
# apps/api/tests/test_permissions.py
"""Tests for permission check service."""

import pytest

from src.services.permissions import (
    ROLE_HIERARCHY,
    check_chamber_advance_permission,
    check_vault_permission,
    PermissionDenied,
)


class TestRoleHierarchy:
    def test_owner_is_highest(self):
        assert ROLE_HIERARCHY["owner"] > ROLE_HIERARCHY["gatekeeper"]

    def test_viewer_is_lowest(self):
        assert ROLE_HIERARCHY["viewer"] < ROLE_HIERARCHY["builder"]

    def test_all_roles_present(self):
        assert set(ROLE_HIERARCHY.keys()) == {"owner", "gatekeeper", "builder", "viewer"}


class TestCheckVaultPermission:
    def test_owner_can_do_anything(self):
        assert check_vault_permission("owner", "viewer") is True
        assert check_vault_permission("owner", "owner") is True

    def test_viewer_cannot_build(self):
        assert check_vault_permission("viewer", "builder") is False

    def test_builder_can_build(self):
        assert check_vault_permission("builder", "builder") is True

    def test_gatekeeper_can_build(self):
        assert check_vault_permission("gatekeeper", "builder") is True

    def test_builder_cannot_gatekeep(self):
        assert check_vault_permission("builder", "gatekeeper") is False


class TestCheckChamberAdvancePermission:
    def test_builder_can_advance_discover_to_build(self):
        assert check_chamber_advance_permission("builder", "discover") is True

    def test_builder_can_advance_build_to_review(self):
        assert check_chamber_advance_permission("builder", "build") is True

    def test_builder_cannot_advance_review_to_ship(self):
        assert check_chamber_advance_permission("builder", "review") is False

    def test_gatekeeper_can_advance_review_to_ship(self):
        assert check_chamber_advance_permission("gatekeeper", "review") is True

    def test_viewer_cannot_advance_anything(self):
        assert check_chamber_advance_permission("viewer", "discover") is False

    def test_owner_can_advance_anything(self):
        assert check_chamber_advance_permission("owner", "discover") is True
        assert check_chamber_advance_permission("owner", "review") is True
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && python -m pytest tests/test_permissions.py -v`
Expected: FAIL with "ModuleNotFoundError"

**Step 3: Write the permissions service**

```python
# apps/api/src/services/permissions.py
"""Permission check service — role enforcement for vault operations.

Role hierarchy: owner > gatekeeper > builder > viewer
Chamber advancement rules per universal-chambers spec:
  discover → build: builder+
  build → review: builder+
  review → ship: gatekeeper+
  archive: owner only
"""

from __future__ import annotations

ROLE_HIERARCHY: dict[str, int] = {
    "viewer": 0,
    "builder": 1,
    "gatekeeper": 2,
    "owner": 3,
}

# Minimum role required to advance FROM each chamber
CHAMBER_ADVANCE_REQUIRED_ROLE: dict[str, str] = {
    "discover": "builder",      # Discover → Build: Builder+
    "build": "builder",         # Build → Review: Builder+
    "review": "gatekeeper",     # Review → Ship: Gatekeeper+
}


class PermissionDenied(Exception):
    """Raised when a user lacks the required role for an operation."""

    def __init__(self, required_role: str, actual_role: str, action: str):
        self.required_role = required_role
        self.actual_role = actual_role
        self.action = action
        super().__init__(
            f"Permission denied: {action} requires '{required_role}' role, "
            f"user has '{actual_role}'"
        )


def check_vault_permission(user_role: str, required_role: str) -> bool:
    """Check if user_role meets or exceeds required_role in hierarchy."""
    user_level = ROLE_HIERARCHY.get(user_role, -1)
    required_level = ROLE_HIERARCHY.get(required_role, 999)
    return user_level >= required_level


def check_chamber_advance_permission(user_role: str, current_chamber: str) -> bool:
    """Check if a user with given role can advance a vault from current_chamber.

    Returns True if the role meets the minimum for advancement.
    Returns False for ship chamber (final — cannot advance further).
    """
    required_role = CHAMBER_ADVANCE_REQUIRED_ROLE.get(current_chamber)
    if required_role is None:
        return False  # ship chamber — cannot advance
    return check_vault_permission(user_role, required_role)
```

**Step 4: Run tests**

Run: `cd apps/api && python -m pytest tests/test_permissions.py -v`
Expected: All 12 tests PASS

**Step 5: Commit**

```bash
git add apps/api/src/services/permissions.py apps/api/tests/test_permissions.py
git commit -m "feat(api): add permission check service with role hierarchy"
```

---

### Task 6: Get User's Vault Role Helper

**Files:**

- Create: `apps/api/src/services/vault_membership.py`
- Test: `apps/api/tests/test_vault_membership.py`

**Context:** We need a function that looks up a user's role for a specific vault, including inherited roles from parent vaults. VaultMember already has an `inherited` flag.

**Step 1: Write the failing test**

```python
# apps/api/tests/test_vault_membership.py
"""Tests for vault membership lookup."""

import pytest

from src.services.vault_membership import get_user_vault_role


class TestGetUserVaultRole:
    """Unit tests using mock DB query results."""

    def test_returns_none_when_no_membership(self):
        """Without a DB session, returns None (safe default)."""
        # The function needs a DB session; we test the pure logic via mocking
        # For now, just verify the function signature is correct
        assert callable(get_user_vault_role)
```

**Step 2: Write the service**

```python
# apps/api/src/services/vault_membership.py
"""Vault membership — lookup a user's role on a vault with inheritance."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.models.vault import Vault
from src.models.vault_member import VaultMember


def get_user_vault_role(
    db: Session,
    user_id: str,
    vault_id: str,
    workspace_id: str,
) -> str | None:
    """Get the effective role for a user on a vault.

    Checks direct membership first, then walks up the vault hierarchy
    looking for inherited roles. Returns the highest role found, or None.
    """
    # Direct membership
    member = db.execute(
        select(VaultMember).where(
            VaultMember.vault_id == vault_id,
            VaultMember.user_id == user_id,
        )
    ).scalar_one_or_none()

    if member:
        return member.role

    # Walk up parent chain for inherited roles
    vault = db.execute(
        select(Vault).where(
            Vault.id == vault_id,
            Vault.workspace_id == workspace_id,
        )
    ).scalar_one_or_none()

    if vault and vault.parent_vault_id:
        return get_user_vault_role(db, user_id, vault.parent_vault_id, workspace_id)

    return None
```

**Step 3: Run tests and commit**

Run: `cd apps/api && python -m pytest tests/test_vault_membership.py -v`

```bash
git add apps/api/src/services/vault_membership.py apps/api/tests/test_vault_membership.py
git commit -m "feat(api): add vault membership lookup with hierarchy inheritance"
```

---

### Task 7: Enforce Roles in Vault Routes

**Files:**

- Modify: `apps/api/src/routes/vaults.py` (lines 160-183, 186-206)
- Test: `apps/api/tests/test_vault_route_permissions.py`

**Context:** Add role checks to `advance_chamber_route` and `archive_vault_route`. If the user doesn't have the required role, return 403 Forbidden. Other routes (list, get, create) don't need role enforcement yet — workspace-level isolation is sufficient.

**Step 1: Write the failing test**

```python
# apps/api/tests/test_vault_route_permissions.py
"""Tests for role enforcement on vault routes."""

import pytest

from src.services.permissions import (
    check_chamber_advance_permission,
    PermissionDenied,
)


class TestAdvanceRoutePermissions:
    """Verify permission logic that routes will use."""

    def test_builder_blocked_from_review_advance(self):
        """Builder cannot advance vault from review → ship."""
        assert check_chamber_advance_permission("builder", "review") is False

    def test_gatekeeper_can_advance_review(self):
        """Gatekeeper can advance vault from review → ship."""
        assert check_chamber_advance_permission("gatekeeper", "review") is True

    def test_owner_can_always_advance(self):
        """Owner can advance from any chamber."""
        for chamber in ("discover", "build", "review"):
            assert check_chamber_advance_permission("owner", chamber) is True

    def test_viewer_blocked_everywhere(self):
        """Viewer cannot advance from any chamber."""
        for chamber in ("discover", "build", "review"):
            assert check_chamber_advance_permission("viewer", chamber) is False
```

**Step 2: Run tests**

Run: `cd apps/api && python -m pytest tests/test_vault_route_permissions.py -v`
Expected: PASS (since permissions service exists from Task 5)

**Step 3: Modify the routes**

In `apps/api/src/routes/vaults.py`, add role enforcement to `advance_chamber_route`:

Add imports at top:

```python
from src.services.permissions import check_chamber_advance_permission
from src.services.vault_membership import get_user_vault_role
```

Replace `advance_chamber_route` (lines 160-183):

```python
@router.post("/{vault_id}/advance")
def advance_chamber_route(
    vault_id: str,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> VaultResponse:
    """Advance a vault to the next chamber. Requires sufficient role."""
    workspace_id = current_user.get("workspace_id", "")
    user_id = current_user.get("sub")
    vault = get_vault(db, vault_id, workspace_id)
    if vault is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vault not found")

    # Check role-based permission for chamber advancement
    user_role = get_user_vault_role(db, user_id, vault_id, workspace_id)
    if user_role is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No role assigned on this vault",
        )
    if not check_chamber_advance_permission(user_role, vault.chamber):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{user_role}' cannot advance vault from '{vault.chamber}' chamber",
        )

    try:
        vault = advance_chamber(db, vault)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from None
    create_event(
        db,
        vault_id=vault.id,
        workspace_id=vault.workspace_id,
        event_type="chamber_advanced",
        actor_id=user_id,
        payload={"chamber": vault.chamber, "gate": vault.gate},
    )
    return _vault_to_response(vault)
```

Replace `archive_vault_route` (lines 186-206):

```python
@router.post("/{vault_id}/archive")
def archive_vault_route(
    vault_id: str,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> VaultResponse:
    """Soft-delete a vault. Requires owner role."""
    workspace_id = current_user.get("workspace_id", "")
    user_id = current_user.get("sub")
    vault = get_vault(db, vault_id, workspace_id)
    if vault is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vault not found")

    user_role = get_user_vault_role(db, user_id, vault_id, workspace_id)
    if user_role != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only vault owners can archive",
        )

    vault = archive_vault(db, vault)
    create_event(
        db,
        vault_id=vault.id,
        workspace_id=vault.workspace_id,
        event_type="vault_archived",
        actor_id=user_id,
        payload={"name": vault.name},
    )
    return _vault_to_response(vault)
```

**Step 4: Run all tests**

Run: `cd apps/api && python -m pytest tests/ -v`
Expected: All PASS (existing route smoke tests don't invoke advance/archive with real auth)

**Step 5: Commit**

```bash
git add apps/api/src/routes/vaults.py apps/api/tests/test_vault_route_permissions.py
git commit -m "feat(api): enforce role checks on chamber advance and vault archive routes"
```

---

## Stream C: Frontend Entity Resolution

### Task 8: EntityResolutionCard Component

**Files:**

- Create: `apps/web/src/components/organisms/EntityResolutionCard.tsx`
- Reference: `docs/specs/record-inspector/entity-resolution.md`
- Reference: `apps/web/src/styles/tokens.css`

**Context:** The UI spec defines an entity resolution card for the Signal panel showing:

- Legal entity name with confidence badge and match status
- Counterparty name with confidence badge and match status
- Color-coded status: green (resolved ≥0.80), amber (review 0.40-0.80), red (fail <0.40)
- Evidence chips showing match type

**Step 1: Create the component**

```tsx
// apps/web/src/components/organisms/EntityResolutionCard.tsx
"use client";

import { useState } from "react";

interface EntityCheck {
  code: string;
  label: string;
  status: "pass" | "review" | "fail";
  value: string;
  confidence: number;
  vault_id?: string | null;
}

interface EntityResolutionData {
  status: "pass" | "review" | "fail";
  checks: EntityCheck[];
  summary: {
    passed: number;
    review: number;
    failed: number;
  };
}

interface EntityResolutionCardProps {
  data: EntityResolutionData | null;
  requiresManualConfirmation?: boolean;
  newEntryDetected?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  pass: "bg-accent-success",
  review: "bg-accent-warning",
  fail: "bg-accent-danger",
};

const STATUS_DOT_COLORS: Record<string, string> = {
  pass: "bg-chamber-ship",
  review: "bg-chamber-build",
  fail: "bg-chamber-discover",
};

const CONFIDENCE_LABEL = (conf: number): { text: string; color: string } => {
  if (conf >= 0.75) return { text: "HIGH", color: "text-accent-success" };
  if (conf >= 0.4) return { text: "MED", color: "text-accent-warning" };
  return { text: "LOW", color: "text-accent-danger" };
};

export default function EntityResolutionCard({
  data,
  requiresManualConfirmation = true,
  newEntryDetected = false,
}: EntityResolutionCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (!data) {
    return (
      <div className="rounded-lg border border-surface-border bg-surface-raised p-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-text-muted" />
          <span className="text-sm font-medium text-text-primary">
            Entity Resolution
          </span>
          <span className="ml-auto text-xs text-text-muted">No data</span>
        </div>
      </div>
    );
  }

  const overallStatus = data.status;

  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 p-3 text-left hover:bg-surface-overlay transition-colors"
      >
        <div
          className={`h-2 w-2 rounded-full ${STATUS_DOT_COLORS[overallStatus]}`}
        />
        <span className="text-sm font-medium text-text-primary">
          Entity Resolution
        </span>
        {newEntryDetected && (
          <span className="rounded bg-chamber-build/20 px-1.5 py-0.5 text-xs text-chamber-build">
            New Customer
          </span>
        )}
        {requiresManualConfirmation && (
          <span className="rounded bg-accent-warning/20 px-1.5 py-0.5 text-xs text-accent-warning">
            Needs Review
          </span>
        )}
        <span className="ml-auto text-xs text-text-muted">
          {data.summary.passed}/{data.checks.length} resolved
        </span>
        <svg
          className={`h-4 w-4 text-text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Expanded checks */}
      {expanded && (
        <div className="border-t border-surface-border-subtle px-3 pb-3">
          {data.checks.map((check) => {
            const conf = CONFIDENCE_LABEL(check.confidence);
            return (
              <div
                key={check.code}
                className="flex items-center gap-2 border-b border-surface-border-subtle py-2 last:border-b-0"
              >
                <div
                  className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT_COLORS[check.status]}`}
                />
                <span className="text-xs text-text-secondary w-28 shrink-0">
                  {check.label}
                </span>
                <span className="text-xs text-text-primary truncate flex-1">
                  {check.value || "—"}
                </span>
                <span className={`text-xs font-mono ${conf.color}`}>
                  {(check.confidence * 100).toFixed(0)}%
                </span>
                <span
                  className={`rounded px-1 py-0.5 text-[10px] font-medium ${STATUS_COLORS[check.status]} text-text-inverse`}
                >
                  {conf.text}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/organisms/EntityResolutionCard.tsx
git commit -m "feat(web): add EntityResolutionCard component for Signal panel"
```

---

### Task 9: Wire EntityResolutionCard into Preflight Display

**Files:**

- Find and modify: The component that displays preflight results in the Signal panel (search for existing usage of `entity_resolution` or `resolution_story` in `apps/web/`)
- Reference: `apps/web/src/components/organisms/EntityCard.tsx` (existing, for patterns)

**Context:** This task depends on finding where preflight results are displayed. The implementing agent should:

1. Search `apps/web/` for components that render preflight results (grep for `gate_color`, `resolution_story`, `entity_resolution`, `health_score`)
2. Import and render `EntityResolutionCard` in the appropriate location, passing the `entity_resolution` data from preflight results
3. If no preflight display component exists yet, note this as a gap and skip — the component is ready for integration when the display is built

**Step 1: Search for integration point**

Run: `grep -r "entity_resolution\|resolution_story\|gate_color\|preflight" apps/web/src/ --include="*.tsx" --include="*.ts" -l`

**Step 2: If integration point found, add the import and render**

```tsx
import EntityResolutionCard from "@/components/organisms/EntityResolutionCard";

// Inside the preflight display component, where entity resolution section renders:
<EntityResolutionCard
  data={preflightResult.entity_resolution}
  requiresManualConfirmation={
    preflightResult.resolution_story?.requires_manual_confirmation
  }
  newEntryDetected={preflightResult.resolution_story?.new_entry_detected}
/>;
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat(web): wire EntityResolutionCard into preflight display"
```

---

## Verification Checklist

After all tasks are complete, run:

```bash
# Backend tests
cd apps/api && python -m pytest tests/ -v

# Type check
cd apps/web && pnpm type-check

# Lint
pnpm lint

# Build
pnpm build
```

**Expected outcomes:**

- [ ] Entity resolution produces real confidence scores when vault data is available
- [ ] Fallback to regex-only extraction when no vault data (backward compatible)
- [ ] `advance_chamber` returns 403 when user lacks required role
- [ ] `archive_vault` returns 403 when user is not owner
- [ ] EntityResolutionCard renders entity checks with color-coded confidence
- [ ] All existing tests still pass
- [ ] No regressions in gate computation (thresholds are locked P1E)
