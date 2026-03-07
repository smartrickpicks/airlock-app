# Contract-First Entity Resolver — Design Spec

> **Status:** Design — pending approval
> **Author:** Claude + Zach (2026-03-07)
> **Depends on:** Extraction engine, Preflight engine, CRM module (react-admin)
> **Problem:** Entity resolution is stubbed (`_run_salesforce_match()` returns `[]`). No known_entities table. No way to resolve "who is this contract about?" without Salesforce.

---

## Design Decision

**Contract-first entity resolution using a local `known_entities` table.**

The resolver does not depend on Salesforce. It matches extracted party names against a locally-maintained entities table seeded from spreadsheet import and enriched by confirmed contract extractions. Salesforce becomes a future sync source, not a dependency.

---

## Architecture

```
Contract PDF
    ↓
Extraction Engine (existing) → extracts ACCT_* fields (names, addresses, types)
    ↓
Entity Resolver (NEW) → fuzzy matches against known_entities table
    ↓
Confidence score + candidate list → Signal Panel card (NEW UI)
    ↓
User confirms/overrides → writes back to known_entities + aliases
```

### Data Flow

```
Tier 1: Contract text → extract parties (_extract_parties + ACCT_* fields)
Tier 2: Match against known_entities table (fuzzy name + address + type)
Tier 3: No match → "Flag as New" with extracted fields pre-filled
Tier 4: (Future) MCP server adds SF connector, syncs known_entities table
```

---

## Data Model

### `known_entities` table

| Column               | Type        | Description                                                                |
| -------------------- | ----------- | -------------------------------------------------------------------------- |
| `id`                 | TEXT (ULID) | Primary key                                                                |
| `workspace_id`       | TEXT (ULID) | FK workspaces, RLS                                                         |
| `canonical_name`     | TEXT        | Primary display name                                                       |
| `entity_type`        | TEXT        | Picklist: Label, Publisher, Artist, Agency, etc.                           |
| `legal_name`         | TEXT        | Full legal entity name                                                     |
| `dba_name`           | TEXT        | DBA / PKA name                                                             |
| `billing_street`     | TEXT        |                                                                            |
| `billing_city`       | TEXT        |                                                                            |
| `billing_state`      | TEXT        |                                                                            |
| `billing_zip`        | TEXT        |                                                                            |
| `billing_country`    | TEXT        |                                                                            |
| `state_of_formation` | TEXT        |                                                                            |
| `type_of_company`    | TEXT        | LLC, Corp, etc.                                                            |
| `external_id`        | TEXT        | SF Account ID (NULL until SF connected)                                    |
| `source`             | TEXT        | `spreadsheet_import` / `contract_extracted` / `salesforce_sync` / `manual` |
| `vault_count`        | INTEGER     | How many vaults reference this entity (denormalized)                       |
| `created_at`         | TIMESTAMPTZ |                                                                            |
| `updated_at`         | TIMESTAMPTZ |                                                                            |
| `deleted_at`         | TIMESTAMPTZ | Soft delete                                                                |
| `metadata`           | JSONB       | Flexible store                                                             |

### `entity_aliases` table

| Column         | Type        | Description                                       |
| -------------- | ----------- | ------------------------------------------------- |
| `id`           | TEXT (ULID) | Primary key                                       |
| `workspace_id` | TEXT (ULID) | FK workspaces, RLS                                |
| `entity_id`    | TEXT (ULID) | FK known_entities                                 |
| `alias_name`   | TEXT        | Alternative name seen in contracts                |
| `alias_source` | TEXT        | `contract_extracted` / `manual` / `none_of_these` |
| `created_at`   | TIMESTAMPTZ |                                                   |
| `metadata`     | JSONB       |                                                   |

### `entity_resolutions` table (append-only log)

| Column            | Type         | Description                                          |
| ----------------- | ------------ | ---------------------------------------------------- |
| `id`              | TEXT (ULID)  | Primary key                                          |
| `workspace_id`    | TEXT (ULID)  |                                                      |
| `vault_id`        | TEXT (ULID)  | FK vaults                                            |
| `entity_id`       | TEXT (ULID)  | FK known_entities (NULL if flagged new)              |
| `extracted_name`  | TEXT         | Name as found in contract                            |
| `party_role`      | TEXT         | `legal_entity` / `counterparty`                      |
| `resolution_type` | TEXT         | `auto` / `confirmed` / `manual` / `new` / `override` |
| `confidence`      | NUMERIC(3,2) | Match confidence score                               |
| `evidence`        | JSONB        | Evidence signals used                                |
| `actor_id`        | TEXT         | User who confirmed (NULL for auto)                   |
| `created_at`      | TIMESTAMPTZ  |                                                      |
| `metadata`        | JSONB        |                                                      |

---

## Resolver Logic

### Match Algorithm

```python
def resolve_entity(extracted_name: str, extracted_fields: dict, workspace_id: str) -> list[Candidate]:
    """
    Four-pass matching:

    Pass 1: Exact alias match → confidence 1.0
      Search entity_aliases for exact match on extracted_name

    Pass 2: Exact canonical name match → confidence 0.95
      Search known_entities.canonical_name exact match

    Pass 3: Fuzzy name match → confidence 0.50-0.90
      rapidfuzz.fuzz.ratio(extracted_name, canonical_name)
      Threshold: > 70% similarity

    Pass 4: Address + type boost → adds 0.05-0.15 to base score
      If billing_city matches → +0.05
      If billing_state matches → +0.05
      If entity_type matches → +0.05
    """
```

### Evidence Signals

| Signal                    | Score Impact   | Source                         |
| ------------------------- | -------------- | ------------------------------ |
| `name_exact`              | 1.0 (terminal) | Alias or canonical exact match |
| `name_fuzzy`              | 0.50-0.90      | rapidfuzz ratio                |
| `address_verified`        | +0.10          | Full address match             |
| `address_partial`         | +0.05          | City + state match             |
| `entity_type_match`       | +0.05          | Account type matches           |
| `service_context_penalty` | -0.10          | Service terms detected         |

### Confidence Tiers (per existing spec)

| Range       | Resolution State | UI Behavior                               |
| ----------- | ---------------- | ----------------------------------------- |
| 1.0         | Auto-resolved    | Green border, checkmark, no action needed |
| > 0.80      | High confidence  | Green + amber "Confirm?" badge            |
| 0.40 - 0.80 | Ambiguous        | Amber border, candidate list (top 5)      |
| < 0.40      | No match         | Red border, "Flag as New" button          |

---

## UI Design Spec

### Design Tokens (from existing `tokens.css`)

All new components use these exclusively — no raw values:

- **Surfaces:** `--surface-base`, `--surface-raised`, `--surface-overlay`
- **Borders:** `--surface-border`, `--surface-border-subtle`
- **Text:** `--text-primary`, `--text-secondary`, `--text-muted`
- **Accents:** `--accent-success` (green), `--accent-warning` (amber), `--accent-danger` (red), `--accent-primary` (cyan)
- **Spacing:** `--space-sm` through `--space-xl`
- **Radius:** `--radius-md`, `--radius-lg`
- **Transitions:** `--transition-fast`, `--transition-normal`
- **Font:** `--font-sans` for UI, `--font-mono` for data values

---

### Screen 1: Entity Resolution Card (Signal Panel)

**Location:** Signal panel (left side of Triptych), `--triptych-signal-width: 280px`
**Component:** `src/components/organisms/EntityResolutionCard.tsx`
**Atomic level:** Organism

```
┌─────────────────────────────────┐  ← surface-raised bg, radius-lg
│ ┌─┐ Entity Resolution          │  ← text-primary, font-sans 14px semibold
│ └─┘                             │
│                                 │
│ ▌ Legal Entity                  │  ← text-muted 11px uppercase tracking-wide
│ ▌ Henderson Music Group         │  ← text-primary 14px, mono for entity names
│ ▌ ┌────────┐ ┌──────────┐      │
│ ▌ │● 0.92  │ │ Confirm? │      │  ← green bg chip + amber badge
│ ▌ └────────┘ └──────────┘      │
│ ▌                               │
│ ▌ Evidence:                     │  ← text-muted 11px
│ ▌ [name_fuzzy 0.88] [addr ✓]   │  ← chips: green=strong, amber=partial
│ ▌                               │
│ ├───────────────────────────────│  ← border-subtle divider
│ ▌ Counterparty                  │  ← text-muted 11px uppercase
│ ▌ Summit Publishing LLC         │
│ ▌ ┌────────┐                    │
│ ▌ │⚠ 0.62  │ Ambiguous          │  ← amber bg chip
│ ▌ └────────┘                    │
│ ▌                               │
│ ▌ ○ Summit Publishing Inc  0.62 │  ← candidate list, radio-style
│ ▌ ○ Summit Media Group     0.48 │
│ ▌ ○ Summit Records         0.41 │
│ ▌                               │
│ ▌ [None of these]               │  ← text-muted link → search/flag-new
│ └───────────────────────────────│
│                                 │
│ ┌───────────────────────────────│  ← New entity section
│ ▌ Artist (Party 3)              │
│ ▌ "DJ Nexus"                    │
│ ▌ ┌──────────┐                  │
│ ▌ │✕ No match│                  │  ← red chip
│ ▌ └──────────┘                  │
│ ▌                               │
│ ▌ [🔍 Search] [Flag as New]    │  ← accent-primary btn + outline btn
│ └───────────────────────────────│
└─────────────────────────────────┘
```

**States:**

| State                   | Border Color                 | Badge            | Actions                          |
| ----------------------- | ---------------------------- | ---------------- | -------------------------------- |
| Auto-resolved (1.0)     | `accent-success` left border | Checkmark        | None — display only              |
| High confidence (>0.80) | `accent-success` left border | "Confirm?" amber | [Confirm] [Override]             |
| Ambiguous (0.40-0.80)   | `accent-warning` left border | Score amber      | Candidate list + [None of these] |
| No match (<0.40)        | `accent-danger` left border  | "No match" red   | [Search] [Flag as New]           |
| Flagged as New          | `accent-primary` left border | "New" cyan       | Entity name + type pre-filled    |

**Evidence Chips:**

- Green bg (`accent-success/20`): `name_exact`, `address_verified`
- Amber bg (`accent-warning/20`): `name_fuzzy`, `address_partial`, `entity_type_match`
- Red bg (`accent-danger/20`): `service_context_penalty`
- Chip text: `--font-mono` 11px

---

### Screen 2: Accounts Import Modal (Overlay)

**Location:** Overlay → Entity Management → "Import Accounts" button
**Component:** `src/components/organisms/AccountsImportModal.tsx`
**Atomic level:** Organism (modal)
**Z-index:** `--z-modal` (400)

```
┌─────────────────────────────────────────────────────────────┐
│                    Import Accounts                     [✕]  │ ← surface-overlay bg
│─────────────────────────────────────────────────────────────│
│                                                             │
│  Step 1 of 3: Upload File                                   │ ← stepper: 3 steps
│  ─────●─────────○─────────○──────                           │ ← accent-primary active
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                     │    │
│  │         Drag & drop CSV or Excel file here          │    │ ← dashed border
│  │               or [Browse Files]                     │    │ ← surface-border dashed
│  │                                                     │    │
│  │  Supported: .csv, .xlsx, .xls                       │    │ ← text-muted 12px
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─ Template ──────────────────────────────────────────┐    │
│  │ Download our template with required columns:        │    │
│  │ [Download CSV Template]                             │    │ ← outline btn
│  │ Required: Name, Entity Type                         │    │
│  │ Optional: Address, State, DBA, Company Type         │    │ ← text-muted
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│                                          [Cancel] [Next →]  │
└─────────────────────────────────────────────────────────────┘
```

**Step 2: Column Mapping**

```
┌─────────────────────────────────────────────────────────────┐
│                    Import Accounts                     [✕]  │
│─────────────────────────────────────────────────────────────│
│                                                             │
│  Step 2 of 3: Map Columns                                   │
│  ─────●─────────●─────────○──────                           │
│                                                             │
│  Found 47 rows, 8 columns                                   │ ← text-secondary
│                                                             │
│  YOUR COLUMN          AIRLOCK FIELD         STATUS          │ ← text-muted 11px header
│  ─────────────────────────────────────────────────────────  │
│  Account Name         → Canonical Name       ● Auto         │ ← accent-success dot
│  Account Type         → Entity Type          ● Auto         │
│  Legal Name           → Legal Name           ● Auto         │
│  Billing Address      → Billing Street       ● Auto         │
│  City                 → Billing City         ● Auto         │
│  State                → Billing State        ● Auto         │
│  SF Account ID        → External ID         ● Auto         │
│  Notes                → [Select field ▾]     ○ Unmapped     │ ← dropdown, amber dot
│                                                             │
│  Preview (first 3 rows):                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Henderson Music │ Label  │ Henderson Music Grp LLC   │   │ ← surface-raised
│  │ Summit Publish  │ Publis │ Summit Publishing LLC      │   │ ← mono font, truncated
│  │ Nova Entertainm │ Agency │ Nova Entertainment Inc     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│                                     [← Back] [Import →]     │
└─────────────────────────────────────────────────────────────┘
```

**Step 3: Import Summary**

```
┌─────────────────────────────────────────────────────────────┐
│                    Import Accounts                     [✕]  │
│─────────────────────────────────────────────────────────────│
│                                                             │
│  Step 3 of 3: Results                                       │
│  ─────●─────────●─────────●──────                           │
│                                                             │
│           ┌──────────────────────┐                          │
│           │    ✓  Import Complete │                          │ ← accent-success
│           └──────────────────────┘                          │
│                                                             │
│  47 accounts processed:                                     │
│    ✓ 42 imported successfully                               │ ← accent-success
│    ⚠  3 duplicates merged                                   │ ← accent-warning
│    ✕  2 skipped (missing required fields)                   │ ← accent-danger
│                                                             │
│  Duplicates merged:                                         │
│  • "Henderson Music" → merged with "Henderson Music Group"  │
│  • "Summit Pub" → merged with "Summit Publishing LLC"       │
│  • "Nova Ent" → merged with "Nova Entertainment Inc"        │
│                                                             │
│                                                [Done]       │
└─────────────────────────────────────────────────────────────┘
```

**Key design decisions:**

- 3-step wizard (upload → map → results)
- Auto-column mapping with fuzzy label matching
- Duplicate detection on import using same resolver logic
- Template download for clean imports
- Merge preview before committing

---

### Screen 3: Entity Management (CRM Module)

**Location:** CRM module → Accounts view (`/crm/accounts`)
**Implementation:** react-admin `<Resource>` with custom components
**Component:** `src/features/crm/resources/accounts/`

**List View:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Accounts                                    [Import] [+ New Account]   │
│─────────────────────────────────────────────────────────────────────────│
│ 🔍 Search accounts...          [Type ▾] [Source ▾] [All ▾]            │
│─────────────────────────────────────────────────────────────────────────│
│ □  NAME                  TYPE        SOURCE      VAULTS  LAST SEEN    │
│ ── ────────────────────── ────────── ──────────── ─────── ──────────  │
│ □  Henderson Music Group  Label      spreadsheet  12      2026-03-01  │
│ □  Summit Publishing LLC  Publisher  contract     8       2026-03-05  │
│ □  Nova Entertainment     Agency     spreadsheet  5       2026-02-28  │
│ □  DJ Nexus               Artist     contract     2       2026-03-06  │
│ □  Apex Records           Label      manual       0       —           │
│                                                                        │
│ Showing 1-47 of 47                                      [< 1 >]       │
│                                                                        │
│ ── With selected: [Merge] [Delete] ──                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

**Detail View (click on entity):**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ← Back to Accounts                                                     │
│                                                                        │
│ Henderson Music Group                            [Edit] [Merge Into]   │
│ Label · Imported from spreadsheet · 12 vaults                          │
│─────────────────────────────────────────────────────────────────────────│
│                                                                        │
│ ┌─ Details ────────────────────────┐ ┌─ Aliases ──────────────────┐   │
│ │ Legal Name: Henderson Music LLC  │ │ henderson music            │   │
│ │ DBA: HMG                         │ │ Henderson Music Grp        │   │
│ │ Type: Label                      │ │ HMG LLC                    │   │
│ │ Company: LLC                     │ │ [+ Add alias]              │   │
│ │ State: California                │ └────────────────────────────┘   │
│ │ Address: 123 Sunset Blvd         │                                  │
│ │ City: Los Angeles                │ ┌─ Resolution History ─────┐   │
│ │ SF ID: —                         │ │ 2026-03-06 auto (0.95)   │   │
│ └──────────────────────────────────┘ │   Vault: Dist. Agreement  │   │
│                                       │ 2026-03-01 confirmed      │   │
│                                       │   Vault: License Deal     │   │
│                                       │ 2026-02-28 manual         │   │
│                                       │   Vault: Sync License     │   │
│                                       └──────────────────────────┘   │
│                                                                        │
│ ┌─ Linked Vaults ──────────────────────────────────────────────────┐   │
│ │ Distribution Agreement — HMG × Summit   Review    2026-03-01    │   │
│ │ License Deal — HMG × Nova               Build     2026-02-28    │   │
│ │ Sync License — HMG × Apex               Discover  2026-02-15    │   │
│ └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key design decisions:**

- react-admin resource with custom list/detail components
- Checkbox multi-select for bulk merge
- "Import" button opens the Accounts Import Modal (shared component)
- Aliases inline-editable
- Resolution history shows how this entity was matched over time
- Linked vaults show which contracts reference this entity

---

## Self-Learning Loop

```
1. Contract uploaded → extraction runs → parties extracted
2. Resolver matches against known_entities → confidence score
3. If auto-resolved (>0.80) → resolution logged, entity vault_count++
4. If ambiguous → user picks candidate → alias created from extracted_name
5. If no match → user flags as new → new known_entity created from extraction
6. Next contract with same name → alias lookup → instant match (1.0)
```

After 200 contracts, the entities table is battle-tested. When SF connects later, it enriches what's already there via `source: salesforce_sync`.

---

## Implementation Priority

| #   | Task                                                              | Why First                 |
| --- | ----------------------------------------------------------------- | ------------------------- |
| 1   | `known_entities` + `entity_aliases` + `entity_resolutions` tables | Foundation for everything |
| 2   | Resolver service (`resolve_entity()` with 4-pass matching)        | Core logic                |
| 3   | Wire resolver into `readiness.py` (replace stub)                  | Existing code calls it    |
| 4   | Entity Resolution Card component (Signal panel)                   | Core user interaction     |
| 5   | Accounts Import Modal (Overlay)                                   | Seed from spreadsheets    |
| 6   | Entity Management CRM resource (react-admin)                      | Daily account management  |
| 7   | Self-learning writeback (confirm/flag-new → entities table)       | Closes the loop           |

---

## Open Decisions

1. **Merge strategy** — when merging two entities, keep the one with more vaults as canonical? Or let user pick?
2. **Bulk import dedup threshold** — what fuzzy score triggers "duplicate detected" during import? Suggest 0.85.
3. **SF Account ID** — when you have it in spreadsheets, should we use it as a hard match key (score 1.0)?
