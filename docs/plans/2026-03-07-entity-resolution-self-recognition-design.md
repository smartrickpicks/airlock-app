# Entity Resolution: Self-Recognition, Multi-Party, & Hierarchical Index

> **Status:** APPROVED
> **Date:** 2026-03-07
> **Scope:** Backend (extraction + preflight engines), CRM vault hierarchy, org tree viewer
> **Approach:** Vault tree as hierarchical entity index (PageIndex-style traversal)

---

## Problem Statement

When a workspace owner uploads contracts — especially from acquired divisions — the system must answer two questions:

1. **Which party is "me"?** (Self-recognition)
2. **Who are the counterparties, and do I already know them?** (Counterparty resolution)

The current implementation (`_extract_parties()` in `readiness.py:165`) uses positional regex ("between X and Y") to extract exactly two parties, assigns them by position (first = legal entity, second = counterparty), and returns hardcoded confidence scores (0.5/0.45). It has no concept of self-recognition, no vault tree awareness, and no clause library integration.

### Real-World Scenario: Create Music Group (CMG)

CMG is a VC firm with three divisions: Publishing, Distribution, and parent company (Records). They acquire other entities and process those entities' contracts. When CMG uploads Division B's contracts:

- Division B appears as a party name in the contract
- The system must recognize Division B as "belonging to" CMG (self)
- The other party is the counterparty, to be resolved against known L3 vaults
- If Division B is unknown, the system must ask: "Is this a new division?"

---

## Design Decision

**Vault tree as hierarchical entity index.**

Rejected alternatives:

- **Flat entity list in workspace metadata** — duplicates data, gets out of sync with vault hierarchy, doesn't scale for acquisitions with many divisions.
- **Dedicated `workspace_entities` table** — creates a parallel data structure that duplicates what the vault hierarchy already provides. Per CLAUDE.md: "the vault hierarchy IS the CRM."
- **Vector similarity search on entity names** — over-engineered for structured entity matching. The vault tree provides hierarchical context that vectors lose.

The vault hierarchy IS the entity registry. Like PageIndex (github.com/VectifyAI/PageIndex), the system navigates a hierarchical tree structure rather than doing flat similarity search. Each vault node provides structural context — matching "Horizon Records" under "CMG Distribution" tells you the relationship, not just the identity.

---

## Vault Hierarchy as Entity Index

### Tree Structure

```
Workspace: Create Music Group (workspace table)
├── L1 vault (entity):     CMG Records          vault_type="entity"
│   ├── L3 vault (cpty):   Horizon Records      vault_type="counterparty"
│   │   └── L4 vault:      Distribution Agmt    vault_type="contract"
│   └── L3 vault (cpty):   DJ Nova              vault_type="counterparty"
│       └── L4 vault:      Recording Agmt       vault_type="contract"
├── L1 vault (division):   CMG Publishing       vault_type="division"
│   └── L3 vault (cpty):   Summit Writers       vault_type="counterparty"
├── L1 vault (division):   CMG Distribution     vault_type="division"
└── L1 vault (division):   Nova Entertainment   vault_type="division"  [acquired]
    └── ⚠ 3 unresolved counterparties
```

### Level Mapping

| vault_level | vault_type                       | Role                                     | Example                           |
| ----------- | -------------------------------- | ---------------------------------------- | --------------------------------- |
| 1           | `entity` or `division`           | **Self** — workspace owner's entities    | CMG Records, CMG Publishing       |
| 2           | `division`                       | **Self** — sub-divisions (if needed)     | Rarely used; L1 covers most cases |
| 3           | `counterparty`                   | **Other party** — resolved against       | Horizon Records, DJ Nova          |
| 4           | `contract` / `task` / `document` | **Work items** — nest under counterparty | Distribution Agreement            |

### Self-Recognition Rule

**L1 + L2 vaults with `vault_type` in (`entity`, `division`) are "self" entities.** All other parties are counterparties. This is the single rule. No configuration needed beyond creating the vault hierarchy during onboarding.

---

## Two-Pass Resolution Flow

### Pass 1: Self-Recognition (L1/L2 Scan)

```python
def resolve_self(extracted_parties: list[str], workspace_id: str) -> SelfResolution:
    """Check each extracted party against L1/L2 'self' vaults."""

    # 1. Get all L1/L2 vaults for this workspace where vault_type in (entity, division)
    self_vaults = get_self_vaults(workspace_id)

    # 2. For each extracted party, check against self vaults
    for party_name in extracted_parties:
        for vault in self_vaults:
            # Exact match on name
            if normalize(party_name) == normalize(vault.name):
                return SelfResolution(match=vault, confidence=1.0, evidence=["name_exact"])

            # Exact match on aliases
            if normalize(party_name) in [normalize(a) for a in vault.metadata_.get("aliases", [])]:
                return SelfResolution(match=vault, confidence=1.0, evidence=["alias"])

            # Fuzzy match on name
            score = fuzzy_score(party_name, vault.name)
            if score > 0.80:
                return SelfResolution(match=vault, confidence=score, evidence=["name_fuzzy"])

    # 3. Fallback: check workspace default entity
    default = workspace.metadata_.get("default_entity")
    if default:
        for party_name in extracted_parties:
            score = fuzzy_score(party_name, default)
            if score > 0.80:
                return SelfResolution(match=None, confidence=score, evidence=["workspace_default"])

    # 4. No match — gate trigger
    return SelfResolution(match=None, confidence=0.0, gate="ENT_SELF_RECOGNITION")
```

**Gate trigger when self is unknown:**

- UI shows: "Neither party matches a known division. Which is yours?"
- Options: Select from existing divisions | Create new division | Skip (external contract)
- User action creates/maps the L1 vault + alias for future instant resolution

### Pass 2: Counterparty Resolution (L3 Scan)

```python
def resolve_counterparties(
    remaining_parties: list[str],
    self_vault_id: str,
    workspace_id: str
) -> list[CounterpartyResolution]:
    """Check remaining parties against L3 counterparty vaults."""

    results = []
    for party_name in remaining_parties:
        # Search L3 vaults under the matched self vault (and workspace-wide)
        candidates = search_counterparty_vaults(workspace_id, party_name)

        if not candidates:
            results.append(CounterpartyResolution(
                extracted_name=party_name,
                status="new_customer",
                confidence=0.0
            ))
        elif candidates[0].confidence == 1.0:
            results.append(CounterpartyResolution(
                extracted_name=party_name,
                status="exact_match",
                matched_vault=candidates[0],
                confidence=1.0,
                evidence=candidates[0].evidence
            ))
        elif candidates[0].confidence > 0.80:
            results.append(CounterpartyResolution(
                extracted_name=party_name,
                status="high_confidence",
                matched_vault=candidates[0],
                confidence=candidates[0].confidence,
                evidence=candidates[0].evidence
            ))
        else:
            results.append(CounterpartyResolution(
                extracted_name=party_name,
                status="ambiguous",
                candidates=candidates[:5],  # Top 5 for disambiguation
                confidence=candidates[0].confidence
            ))

    return results
```

**Resolution states map directly to the entity resolution spec (record-inspector/entity-resolution.md):**

| Confidence  | Status            | Signal Panel Card              |
| ----------- | ----------------- | ------------------------------ |
| = 1.0       | `exact_match`     | Green border, auto-resolved    |
| > 0.80      | `high_confidence` | Green + amber "Confirm?" badge |
| 0.40 - 0.80 | `ambiguous`       | Amber border, candidate list   |
| < 0.40      | `no_match`        | Red border, search box         |
| N/A         | `new_customer`    | Blue border, "Create in CRM"   |

---

## Clause Library Integration

### `enrich_from_clause_library()` Implementation

The stub at `dispatcher.py:180` becomes the bridge between clause structure and extraction.

```python
def enrich_from_clause_library(contract_type: str) -> PartySchema:
    """Look up PARTIES_IDENTIFICATION clauses to get party schema."""

    # Filter clause_library_v2.json for this contract type
    party_clauses = [
        c for c in clause_library["clauses"]
        if c["clause_type"] == "PARTIES_IDENTIFICATION"
        and contract_type in c["contract_types"]
    ]

    if not party_clauses:
        return PartySchema(party_fields=[], expected_party_count=2)  # fallback

    clause = party_clauses[0]
    party_fields = []

    for var in clause["variables"]:
        if var["field"].startswith("ACCT_") or var["field"].startswith("OPP_") and "ENTITY" in var["field"]:
            # Extract role label from clause body: {{FIELD}} ("RoleLabel")
            role_label = extract_role_label(clause["body"], var["placeholder"])
            party_fields.append(PartyField(
                field=var["field"],
                role_label=role_label,  # "Label", "Artist", "Assignor", etc.
                anchor_patterns=var["extraction"]["anchor_patterns"],
                proximity_chars=var["extraction"]["proximity_chars"],
                confidence_floor=var["extraction"]["confidence_floor"]
            ))

    return PartySchema(
        party_fields=party_fields,
        expected_party_count=len(party_fields)
    )
```

### Contract Type to Party Schema Examples

| Contract Type | Party Fields                                              | Role Labels                               | Expected Count |
| ------------- | --------------------------------------------------------- | ----------------------------------------- | -------------- |
| distribution  | ACCT_LEGAL_ENTITY, ACCT_COUNTERPARTY                      | Label, Artist                             | 2              |
| license       | ACCT_LEGAL_ENTITY, ACCT_COUNTERPARTY                      | Licensor, Licensee                        | 2              |
| recording     | ACCT_LEGAL_ENTITY, ACCT_COUNTERPARTY                      | Label, Artist                             | 2              |
| publishing    | ACCT_LEGAL_ENTITY, ACCT_COUNTERPARTY                      | Publisher, Writer                         | 2              |
| assignment    | ACCT_LEGAL_ENTITY, OPP_ASSIGNEE_ENTITY, ACCT_COUNTERPARTY | Assignor, Assignee, Original Counterparty | 3              |
| talent_actor  | ACCT_LEGAL_ENTITY, OPP_TALENT_NAME, ACCT_COUNTERPARTY     | Producer, Talent, Artist                  | 3              |
| nda           | ACCT_LEGAL_ENTITY, ACCT_COUNTERPARTY                      | Disclosing Party, Receiving Party         | 2              |

### Role-Label Anchored Extraction

Instead of positional regex ("between X and Y"), the extraction uses role labels from the clause library as anchors:

```
Document text: '...by and between Acme Records LLC ("Label") and DJ Nova ("Artist")...'

Old approach:
  regex("between (.+) and (.+)") → party_a="Acme Records LLC", party_b="DJ Nova"
  (positional, fragile, only 2 parties)

New approach:
  1. Detect contract_type = "recording"
  2. enrich_from_clause_library("recording") → expects "Label" and "Artist" roles
  3. Search document for ("Label") → extract name before it → "Acme Records LLC"
  4. Search document for ("Artist") → extract name before it → "DJ Nova"
  5. Each party carries its clause role for downstream resolution
```

**Benefits:**

- Semantic, not positional — handles contracts with different formatting
- Knows expected party count per contract type
- Role labels provide extraction anchors with higher confidence than generic regex
- Naturally extends to 3+ party contracts (assignment, talent, sample clearance)

### Preserving Contract Roles

Per design decision: **self-recognition is about ownership, not contract role.** If CMG acquires a division that was the "Artist" side of a recording contract, the system recognizes the division as "self" (ownership) but preserves "Artist" as the clause role. The clause role is metadata on the resolution, not a determinant of self vs. counterparty.

---

## Data Model

### No New Tables

Everything lives in the existing vault hierarchy + JSONB metadata + append-only events.

### Workspace Metadata Addition

```python
workspace.metadata_ = {
    "default_entity": "Create Music Group",  # Set during onboarding
    # Fallback for self-recognition before any L1 vaults exist
}
```

### Vault Metadata Additions

```python
# L1/L2 vaults (divisions — "self" entities)
vault.metadata_ = {
    "aliases": ["CMG Records", "CMG Records LLC", "Create Music Group Records"],
    "letterhead": "CMG Records, a division of Create Music Group",
    "issuing_entity": True,   # Marks this vault as a "self" entity for resolution
    "entity_type": "division" # parent | division | subsidiary | dba
}

# L3 vaults (counterparties)
vault.metadata_ = {
    "aliases": ["Horizon Records", "Horizon Records LLC", "Horizon Rec"],
    "entity_type": "counterparty",
    "resolution_source": "auto",  # auto | manual | alias
    "first_seen_in": "vault_id_of_first_contract"
}
```

### New Event Types

```python
# Self-recognition resolved
{
    "event_type": "entity.self_resolved",
    "vault_id": "<contract vault>",
    "payload": {
        "extracted_name": "CMG Records LLC",
        "matched_vault_id": "<L1 division vault>",
        "confidence": 0.95,
        "evidence": ["name_fuzzy", "alias"],
        "clause_role": "Label"
    }
}

# Counterparty resolved
{
    "event_type": "entity.counterparty_resolved",
    "vault_id": "<contract vault>",
    "payload": {
        "extracted_name": "DJ Nova",
        "matched_vault_id": "<L3 counterparty vault>",
        "confidence": 1.0,
        "evidence": ["name_exact"],
        "clause_role": "Artist"
    }
}

# Unknown self — gate trigger
{
    "event_type": "entity.unknown_self",
    "vault_id": "<contract vault>",
    "payload": {
        "extracted_parties": ["Nova Entertainment Ltd", "Vendor X"],
        "action_required": "identify_self",
        "gate": "ENT_SELF_RECOGNITION"
    }
}

# Alias created — system learning
{
    "event_type": "entity.alias_created",
    "vault_id": "<L1 or L3 vault that received the alias>",
    "payload": {
        "alias": "Nova Entertainment Ltd",
        "canonical_name": "Nova Entertainment",
        "created_by": "user_id",
        "source": "manual_resolution"
    }
}
```

### Resolution Story Output (Enriched)

Replaces the current stub output from `build_resolution_story()`:

```python
{
    "self_entity": {
        "extracted_name": "CMG Records LLC",
        "matched_vault_id": "vault_abc",
        "matched_vault_name": "CMG Records",
        "confidence": 0.95,
        "evidence": ["name_fuzzy", "alias"],
        "clause_role": "Label",
        "vault_level": 1
    },
    "counterparties": [
        {
            "extracted_name": "DJ Nova",
            "matched_vault_id": "vault_xyz",
            "matched_vault_name": "DJ Nova",
            "confidence": 1.0,
            "evidence": ["name_exact"],
            "clause_role": "Artist",
            "vault_level": 3
        }
    ],
    "unresolved": [],
    "gate_status": "pass",
    "contract_type": "recording",
    "party_schema_source": "clause_library"
}
```

---

## Org Tree Viewer

The vault hierarchy visualized as an interactive org chart in the CRM module.

```
Org Tree Viewer (CRM Module — Signal panel or standalone view)

Create Music Group (L0 - Workspace)
├── CMG Records (L1 - Division) ·········· 47 contracts · 12 counterparties
│   ├── Horizon Records (L3) ············· 3 contracts · Distribution + License
│   ├── DJ Nova (L3) ···················· 1 contract · Recording
│   └── + 10 more
├── CMG Publishing (L1 - Division) ······· 31 contracts · 8 counterparties
│   ├── Summit Writers Group (L3) ········ 2 contracts · Publishing
│   └── + 7 more
├── CMG Distribution (L1 - Division) ····· 23 contracts · 6 counterparties
└── [Acquired] Nova Entertainment (L1) ··· 15 contracts · importing...
    └── ⚠ 3 unresolved counterparties
```

**Capabilities:**

- Click any node to drill into its vault triptych
- Unresolved entities surface as warnings at the division level
- New acquisitions show import progress and resolution status
- Aggregate counts (contracts, counterparties) roll up the tree
- Each node is a vault — no separate data structure

---

## Search Integration

Entity resolution queries leverage the specced MeiliSearch index (search/overview.md):

- Vault names + `metadata_.aliases` are indexed in the `vaults` MeiliSearch index
- Fuzzy matching for self-recognition and counterparty resolution uses MeiliSearch (< 50ms) when available
- Falls back to PostgreSQL `pg_trgm` `similarity()` when MeiliSearch is unavailable
- Every alias created through manual resolution automatically updates the search index via the existing `pg_notify` → BullMQ → MeiliSearch pipeline

---

## Implementation Guidance for Coding Agents

### Skills to Use

| Phase               | Skill           | Purpose                                                                    |
| ------------------- | --------------- | -------------------------------------------------------------------------- |
| Pre-implementation  | `/search-first` | Find existing implementations before writing new code; prevent duplication |
| Implementation      | `/tdd`          | Write tests first for resolution logic; enforce 80%+ coverage              |
| Post-implementation | `/verify`       | Run verification commands, confirm output before claiming success          |
| Post-implementation | `/code-review`  | Review for bugs, security, adherence to project conventions                |

### Key Files to Modify

| File                                            | Change                                                                              |
| ----------------------------------------------- | ----------------------------------------------------------------------------------- |
| `apps/api/src/engines/preflight/readiness.py`   | Replace `_extract_parties()`, `build_resolution_story()`, `_run_salesforce_match()` |
| `apps/api/src/engines/extraction/dispatcher.py` | Implement `enrich_from_clause_library()` stub                                       |
| `apps/api/src/models/workspace.py`              | Document `metadata_.default_entity` convention                                      |
| `apps/api/src/engines/preflight/gate.py`        | Add `ENT_SELF_RECOGNITION` gate check                                               |

### Key Files to Read First

| File                                                  | Why                                             |
| ----------------------------------------------------- | ----------------------------------------------- |
| `docs/specs/record-inspector/entity-resolution.md`    | Full UI spec for Signal panel cards             |
| `docs/specs/vault-hierarchy/overview.md`              | Vault levels and vault_type definitions         |
| `apps/api/rules/generation/clause_library_v2.json`    | PARTIES_IDENTIFICATION clauses with role labels |
| `apps/api/rules/rules_bundle/extraction_anchors.json` | Existing extraction anchor patterns             |
| `apps/api/src/engines/extraction/text_extractor.py`   | spaCy NER for PERSON/ORG extraction             |

### Testing Strategy

1. **Unit tests** for `resolve_self()` — exact match, fuzzy match, alias match, no match (gate trigger)
2. **Unit tests** for `resolve_counterparties()` — all 5 resolution states
3. **Unit tests** for `enrich_from_clause_library()` — each contract type returns correct party schema
4. **Integration test** for full flow: upload contract → extract parties → resolve self → resolve counterparties → emit events
5. **Edge cases**: unknown contract type (fallback to regex), 3-party assignment contracts, acquired division with no prior vaults

---

## Related Specs

- [Record Inspector / Entity Resolution](../specs/record-inspector/entity-resolution.md) — Signal panel card UI
- [Vault Hierarchy](../specs/vault-hierarchy/overview.md) — vault_level, vault_type definitions
- [Schema Onboarding & Calibration](../specs/contracts/schema-onboarding-and-calibration.md) — Phase A workspace config
- [Search & Command Palette](../specs/search/overview.md) — MeiliSearch integration for fuzzy matching
- [Security / OGC](../specs/security/overview.md) — Chunk-based knowledge layer, deterministic recall

---

## Future: Workflow Audit Trail Viewer

> **Next pass** — not part of this design, noted for continuity.

The append-only events from entity resolution (and all other vault lifecycle events) can be visualized as a locked workflow flowchart using the React workflow builder. Each event is a node, edges represent state transitions, and the entire history is immutable. This pairs with the org tree: the tree shows structure, the workflow viewer shows lifecycle events flowing through that structure.
