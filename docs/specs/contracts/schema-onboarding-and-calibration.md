# Schema Onboarding & Extraction Calibration

> **Status:** DESIGN BRAINSTORM — ready for review
> **Author:** Claude + Zach (2026-03-07)
> **Depends on:** Extraction engine (`apps/api/src/engines/extraction/`), Turnkey flow (`docs/specs/onboarding/turnkey-flow.md` Phase 3), MCP Registry
> **Problem:** Extractions are loose and grabbing bad data. The 152-entry `extraction_anchors.json` was ported from OrcestrateOS but is not calibrated to each org's contract language, field naming, or CRM schema.

---

## The Core Problem

Right now extraction works like this:

```
Upload PDF → OCR/parse → run 6 extractors against 152 hardcoded anchors → dump results
```

**What's wrong:**

1. **No org-specific schema** — the 442 fields in `field_meta.json` and 152 extraction anchors are a one-size-fits-all superset from the Orchestrate glossary. Every org gets all 152 fields attempted regardless of what they actually track.
2. **No alias layer** — if an org's Salesforce calls it "Deal Type" and we call it "Contract_Subtype\_\_c", there's no mapping. The extractor either finds its hardcoded anchor or misses.
3. **No feedback loop** — when extraction gets it wrong, there's no mechanism to correct, learn, and improve. Each extraction is stateless.
4. **Duplicate file issue** — upload flow may be assigning the same parsed text to multiple vault records (separate bug to fix).

**What OrcestrateOS got right:**

- It was tuned to one specific org's Salesforce schema
- The anchors, picklist synonyms, and field definitions were hand-calibrated over time
- There was an implicit "this org uses these 68 fields" scoping

---

## Proposed Solution: Three-Phase Schema Onboarding

### Phase A: Schema Import (the "what do you track?" step)

**Goal:** Build the org's master field list from their existing source of truth.

**Three import paths:**

| Source                                        | How it works                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------- |
| **CRM connector** (Salesforce, HubSpot, etc.) | MCP server connects via OAuth → reads object metadata → proposes field list     |
| **Spreadsheet upload** (Excel/CSV)            | User uploads their field tracking sheet → we strip columns as field definitions |
| **Manual entry**                              | Start from Airlock's default template, add/remove fields                        |

**What we extract from any source:**

```typescript
interface OrgField {
  id: string; // ULID
  org_field_name: string; // What the org calls it ("Deal Type")
  org_field_key: string; // API name if from CRM ("Deal_Type__c")
  data_type: FieldDataType; // text | number | date | currency | picklist | boolean | address | email | url
  picklist_values?: string[]; // If picklist, the valid options
  section: string; // Which logical group (Accounts, Opportunities, Financials, etc.)
  is_required: boolean; // Does the org consider this required?
  source: "crm" | "spreadsheet" | "manual";
  example_value?: string; // Sample value from their data
}
```

**CRM connector flow (Salesforce example):**

```
1. Admin goes to Connectors → Salesforce → [Connect]
2. OAuth flow → get access token
3. Agent calls Salesforce Metadata API:
   - describe("Opportunity") → get all custom fields
   - describe("Account") → get all custom fields
   - describe("Contract") → get all custom fields
4. Agent proposes: "Found 87 fields across 3 objects. Here's what I recommend tracking:"
5. Admin reviews in Schema Playground (see Phase B)
```

**Spreadsheet flow:**

```
1. Admin uploads Excel file (their internal field tracker / data dictionary)
2. Parser reads column headers → proposes as field names
3. Reads first N rows → infers data types, detects picklist values
4. Agent proposes: "Found 52 columns. Here's the schema I built:"
5. Admin reviews in Schema Playground
```

---

### Phase B: Schema Playground (the "map and tune" step)

**Goal:** Interactive UI where the admin maps their fields to Airlock's extraction anchors, creates aliases, and previews extraction results.

**The mapping problem:**

The org says "Deal Type" → Airlock's extraction anchor is `OPP_CONTRACT_TYPE` with anchors like "distribution agreement", "license agreement", etc. We need to create a bridge.

**Three-column mapping table:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Schema Mapping                                        [Auto-Map] [Save] │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ ORG FIELD              AIRLOCK FIELD           STATUS                    │
│ ──────────────────────────────────────────────────────────────────────── │
│ Deal Type              Contract Type            ● Auto-mapped (92%)     │
│ Territory              Territory                ● Auto-mapped (98%)     │
│ Start Date             Effective Date           ● Auto-mapped (85%)     │
│ Royalty %              Distribution Fee         ○ Needs review          │
│ MG Amount              Minimum Guarantee        ● Auto-mapped (88%)     │
│ Artist PKA             Artist Name (PKA/DBA)    ● Auto-mapped (95%)     │
│ Deal Duration          Term Duration            ○ Needs review          │
│ Payment Freq           —                        ✕ No match              │
│                                                                          │
│ Unmapped Airlock Fields (available):                                    │
│ Sub-licensing Permitted, Force Majeure, Audit Rights, ...               │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Auto-mapping agent logic:**

```python
def auto_map(org_fields: list[OrgField], airlock_fields: list[AirlockField]) -> list[Mapping]:
    """
    Three-pass mapping:

    Pass 1: Exact key match
      org "contract_type__c" == airlock "contract_type__c" → 100% confidence

    Pass 2: Semantic label match (fuzzy + embeddings)
      org "Deal Type" ↔ airlock "Contract Type" → cosine similarity score
      org "MG Amount" ↔ airlock "Minimum Guarantee" → embedding match

    Pass 3: Data type + section heuristic
      If same data type + same section + no better match → suggest with lower confidence
    """
```

**Alias creation:**

When a mapping is confirmed, we create an alias record:

```typescript
interface FieldAlias {
  id: string;
  workspace_id: string;
  org_field_key: string; // "deal_type"
  airlock_check_code: string; // "OPP_CONTRACT_TYPE"
  alias_anchors?: string[]; // Additional anchors from org's contract language
  picklist_mappings?: Record<string, string>; // org value → airlock value
  confidence_override?: number; // Optional floor/ceiling
  created_at: string;
}
```

**Picklist value mapping (critical for accuracy):**

If the org's Salesforce has `Deal_Type__c` with values `["Distro", "License", "Admin", "Sync"]` and Airlock expects `["Distribution", "License", "Administration", "Synchronization"]`, we need:

```
┌─────────────────────────────────────────────────┐
│ Map Picklist: Deal Type → Contract Type         │
├─────────────────────────────────────────────────┤
│ ORG VALUE          AIRLOCK VALUE        STATUS  │
│ Distro             Distribution         ● Auto  │
│ License            License              ● Exact │
│ Admin              Administration       ● Auto  │
│ Sync               Synchronization      ● Auto  │
│ Co-Pub             —                    ✕ New   │
│                    [+ Add to picklist]           │
└─────────────────────────────────────────────────┘
```

**Live preview ("playground" part):**

Right panel shows extraction preview against a sample document:

```
┌─────────────────────────────────────────────────┐
│ EXTRACTION PREVIEW              [Upload Sample] │
│ Using: NDA_sample_acme.pdf                      │
├─────────────────────────────────────────────────┤
│                                                 │
│ Deal Type: "Distribution"           ✓ 0.98      │
│   matched anchor: "distribution agreement"      │
│   evidence: "This DISTRIBUTION AGREEMENT..."    │
│                                                 │
│ Territory: "Worldwide"              ✓ 0.91      │
│   matched anchor: "territory"                   │
│   evidence: "...shall be Worldwide..."          │
│                                                 │
│ Royalty %: "15%"                    ⚠ 0.62      │
│   matched anchor: "distribution fee"            │
│   ⚠ Org calls this "Royalty %" but contract     │
│     says "distribution fee" — alias needed?     │
│   [Add alias anchor: "royalty"]                  │
│                                                 │
│ Payment Freq: —                     ✕ missing   │
│   No extraction anchor configured.              │
│   [Create extraction rule →]                    │
│                                                 │
│ ─────────────────────────────────────────────── │
│ Coverage: 14/16 fields (87.5%)                  │
│ Avg confidence: 0.82                            │
│ Fields needing review: 2                        │
└─────────────────────────────────────────────────┘
```

---

### Phase C: Calibration (the "dial it in" step)

**Goal:** Iteratively improve extraction accuracy by running against real documents, collecting corrections, and tuning anchors/thresholds.

**Calibration loop:**

```
         ┌──────────────┐
         │ Upload doc(s) │
         └──────┬───────┘
                ▼
         ┌──────────────┐
         │ Run extraction│
         └──────┬───────┘
                ▼
    ┌───────────────────────┐
    │ Human reviews results │
    │ • Accept correct ones │
    │ • Correct wrong ones  │
    │ • Flag missing ones   │
    └───────────┬───────────┘
                ▼
    ┌───────────────────────┐
    │ Calibration agent     │
    │ analyzes corrections: │
    │ • Adds new anchors    │
    │ • Adjusts thresholds  │
    │ • Creates aliases     │
    │ • Expands picklists   │
    └───────────┬───────────┘
                ▼
    ┌───────────────────────┐
    │ Re-run extraction     │
    │ Show before/after     │
    └───────────┬───────────┘
                ▼
         ┌──────────────┐
         │ Satisfied?   │──No──→ (loop back to review)
         └──────┬───────┘
                │ Yes
                ▼
         ┌──────────────┐
         │ Lock config  │
         └──────────────┘
```

**What the calibration agent does with corrections:**

| Correction type       | Agent action                                                                                                            |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Wrong value extracted | Analyze why — bad anchor? wrong proximity? → adjust `proximity_chars` or add `negative_anchors`                         |
| Value not found       | Find the text passage where it appears → propose new `primary_anchors` or `secondary_anchors`                           |
| Wrong field matched   | The text matched the wrong field → add `negative_anchors` to the wrong field, add the correct anchor to the right field |
| Picklist mismatch     | Org uses different term → add to `picklist_synonyms.json` workspace overlay                                             |
| Confidence too low    | Value is correct but confidence is low → adjust `confidence_floor` for this workspace                                   |

**Workspace-scoped config overlay:**

Instead of modifying the global `extraction_anchors.json`, each workspace gets an overlay:

```python
# Resolution order (highest priority wins):
1. workspace_extraction_overrides[workspace_id][check_code]  # org-specific tuning
2. workspace_field_aliases[workspace_id]                      # org field mappings
3. extraction_anchors.json                                    # global defaults
4. field_meta.json                                            # canonical definitions
```

```typescript
interface WorkspaceExtractionConfig {
  workspace_id: string;

  // Which of the 152 check codes are active for this org
  enabled_fields: string[]; // subset of check codes

  // Per-field overrides
  field_overrides: Record<
    string,
    {
      additional_primary_anchors?: string[];
      additional_secondary_anchors?: string[];
      additional_negative_anchors?: string[];
      proximity_chars_override?: number;
      confidence_floor_override?: number;
      picklist_additions?: string[];
      picklist_mappings?: Record<string, string>;
    }
  >;

  // Field aliases (org name → airlock check code)
  aliases: FieldAlias[];

  // Calibration state
  calibration: {
    status: "uncalibrated" | "in_progress" | "calibrated";
    documents_tested: number;
    last_calibrated_at: string;
    accuracy_score: number; // % of fields correctly extracted on last test run
  };
}
```

---

## Data Model

### New tables

```sql
-- Workspace-scoped extraction configuration
CREATE TABLE workspace_extraction_configs (
    id TEXT PRIMARY KEY,          -- ULID
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    enabled_check_codes TEXT[] NOT NULL DEFAULT '{}',
    field_overrides JSONB NOT NULL DEFAULT '{}',
    calibration_status TEXT NOT NULL DEFAULT 'uncalibrated',
    documents_tested INTEGER NOT NULL DEFAULT 0,
    last_calibrated_at TIMESTAMPTZ,
    accuracy_score NUMERIC(5,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'
);

-- Field alias mappings (org field → airlock check code)
CREATE TABLE field_aliases (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    org_field_name TEXT NOT NULL,
    org_field_key TEXT NOT NULL,
    airlock_check_code TEXT NOT NULL,
    alias_anchors TEXT[] DEFAULT '{}',
    picklist_mappings JSONB DEFAULT '{}',
    confidence_override NUMERIC(3,2),
    mapping_confidence NUMERIC(3,2),    -- how confident the auto-mapper was
    mapping_source TEXT NOT NULL,        -- 'auto' | 'manual' | 'calibration'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'
);

-- Calibration runs (append-only log)
CREATE TABLE calibration_runs (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    document_id TEXT,             -- FK to uploaded document
    actor_id TEXT NOT NULL,       -- who ran it
    fields_tested INTEGER NOT NULL,
    fields_correct INTEGER NOT NULL,
    fields_corrected INTEGER NOT NULL,
    corrections JSONB NOT NULL,   -- detailed correction log
    config_delta JSONB NOT NULL,  -- what changed in extraction config
    accuracy_before NUMERIC(5,2),
    accuracy_after NUMERIC(5,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'
);
```

---

## How It Fits in the Turnkey Flow

This maps directly to **Phase 3: Data Mapping** from `turnkey-flow.md`:

```
Phase 3 (23 min estimated):
  Step 3.1: Schema Mapping  →  Phase A (Schema Import) + Phase B (Schema Playground)
  Step 3.2: Chamber Config  →  (already specced, separate concern)

Post-onboarding (ongoing):
  Calibration  →  Phase C (runs after first real documents are uploaded)
```

**Onboarding wizard integration:**

```
Step 4 of 6: Map Your Schema

How do you want to define your fields?

┌─────────────────────────────────────────────┐
│ 🔗 Connect to CRM              [Select →]  │
│   Import fields from Salesforce, HubSpot,   │
│   or another CRM platform                  │
│   ⭐ Fastest — auto-maps most fields       │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ 📊 Upload Spreadsheet           [Select →]  │
│   Upload an Excel/CSV with your field       │
│   definitions or data dictionary            │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ ✏️  Start from Template          [Select →]  │
│   Use Airlock's default contract fields     │
│   and customize from there                  │
└─────────────────────────────────────────────┘
```

---

## Extraction Pipeline Change

Current:

```python
def run_extraction(full_text, target_codes=None, ...):
    # Uses global extraction_anchors.json for ALL workspaces
    boolean_ext = BooleanExtractor()  # reads from rules_bundle/
    ...
```

Proposed:

```python
def run_extraction(full_text, target_codes=None, workspace_id=None, ...):
    # Load workspace-specific config overlay
    ws_config = load_workspace_extraction_config(workspace_id)

    # Merge global anchors + workspace overrides + aliases
    effective_anchors = merge_extraction_config(
        base=load_config("extraction_anchors.json"),
        overrides=ws_config.field_overrides,
        aliases=ws_config.aliases,
        enabled_only=ws_config.enabled_check_codes,
    )

    # Pass effective config to extractors
    boolean_ext = BooleanExtractor(config=effective_anchors)
    ...
```

**Key change:** Extractors currently read directly from `rules_bundle/` JSON files. They need to accept an optional config override so workspace-specific tuning takes effect.

---

## The Calibration Agent (Otto-powered)

When the user corrects extraction results, Otto analyzes the delta:

```
User corrects: "Term Duration" was extracted as "3 years" but should be "5 years"
Otto sees the evidence context and finds: "initial term of five (5) years"

Otto's analysis:
  - The extractor matched "term of" anchor correctly (anchor was fine)
  - But it grabbed "three (3) years" from a DIFFERENT paragraph about renewal
  - Root cause: proximity_chars too large (400 → picking up wrong instance)
  - Fix: reduce proximity_chars from 400 to 200 for this check code
  - OR: add negative_anchor "renewal" to avoid the renewal paragraph

Otto proposes config change → admin approves → re-run → verify
```

This is NOT an LLM re-extraction. It's **tuning the rule-based extractors** by adjusting anchors, proximity, and thresholds. The extractors stay deterministic — Otto just helps find the right knobs to turn.

---

## Immediate Bug Fixes Needed

Before building the schema onboarding flow, these extraction issues need fixing:

1. **Duplicate file upload** — same file text assigned to two different vault records. Investigate the upload route + vault creation flow in `apps/api/src/routes/vaults.py`.

2. **All 152 fields attempted** — even though `field_meta.json` marks 272 fields as `not_needed`, the extraction anchors have 145 entries enabled. Need a workspace-scoped `enabled_check_codes` filter as the first step.

3. **No confidence thresholds** — extractions below 0.4 confidence are shown to users as real results. Need a `confidence_floor` per workspace (default: 0.4) below which results are hidden or marked as "low confidence suggestion."

---

## Implementation Priority

| Step | What                                                             | Why first                         |
| ---- | ---------------------------------------------------------------- | --------------------------------- |
| 1    | Fix duplicate upload bug                                         | Data integrity                    |
| 2    | Add `workspace_extraction_configs` table + enabled field scoping | Stop extracting irrelevant fields |
| 3    | Build Schema Playground UI (mapping table + live preview)        | Core onboarding experience        |
| 4    | Add `field_aliases` table + alias resolution in extractors       | Enable org-specific field names   |
| 5    | Build calibration loop (corrections → config delta)              | Iterative accuracy improvement    |
| 6    | Build auto-mapping agent (CRM connector → field proposals)       | Fastest onboarding path           |
| 7    | Build spreadsheet import parser                                  | Alternative onboarding path       |

---

## Open Questions

1. **Should calibration corrections be stored as events?** The events table is append-only and already tracks vault-level actions. Calibration corrections could go there as `event_type: "calibration_correction"` — or they could live in the separate `calibration_runs` table for cleaner separation.

2. **How much LLM involvement in extraction?** Currently all 6 extractors are rule-based (regex, fuzzy match, anchor proximity). Should the calibration agent use LLM to propose new anchors, or should it stay purely heuristic? LLM-proposed anchors could be more creative but less predictable.

3. **Multi-document calibration** — should the system batch-test against N documents and report aggregate accuracy, or is single-document iterative testing sufficient for MVP?

4. **Schema versioning** — when an org's CRM schema changes (new fields added in Salesforce), how do we detect and surface that? Periodic re-sync via MCP connector, or manual "re-import schema" action?
