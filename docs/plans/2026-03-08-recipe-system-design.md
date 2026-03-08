# Recipe System — Design Document

> **Date:** 2026-03-08
> **Status:** APPROVED — ready for implementation planning
> **Scope:** Role × Chamber × Vault Type recipe system, workspace setup flow, invite links, task runner, recipe editor

---

## Summary

A **Recipe** is an ordered sequence of nodes defining exactly how a user moves through a chamber for a specific vault type. Recipes are scoped to Role × Chamber × Vault Type. Airlock ships immutable defaults; workspaces own editable copies. Two surfaces: a focused task runner for users and a bird's-eye recipe editor for Conductors.

---

## 1. Data Model

### `airlock_recipes` (Airlock-owned, immutable)

```sql
id           TEXT (ULID)   primary key
vault_type   TEXT          e.g. "distribution_agreement"
chamber      TEXT          discover | build | review | ship
role         TEXT          builder | gatekeeper | owner | conductor | viewer
version      INT           increments on Airlock updates
nodes        JSONB         ordered list of node definitions (see shape below)
created_at   TIMESTAMPTZ
```

Never modified after deploy. Serves as the canonical default and reset target.

### `workspace_recipes` (workspace-owned, editable)

```sql
id            TEXT (ULID)   primary key
workspace_id  TEXT          FK → workspaces
vault_type    TEXT
chamber       TEXT
role          TEXT
sourced_from  TEXT          FK → airlock_recipes.id (audit trail)
nodes         JSONB         Conductor edits this — full node list
updated_at    TIMESTAMPTZ
updated_by    TEXT          FK → users
```

Seeded from `airlock_recipes` on workspace creation. Workspace fully owns their copy. Conductor edits `nodes` directly.

### Node definition shape (stored in JSONB)

```json
{
  "id": "review-entities",
  "type": "review",
  "label": "Review Extracted Entities",
  "skills": ["entity-lookup", "confidence-explainer", "flag-for-gatekeeper"],
  "gate_conditions": [
    {
      "type": "field_threshold",
      "field": "confidence_avg",
      "operator": "gte",
      "value": 0.7
    },
    {
      "type": "signal_count",
      "signal_type": "open_flag",
      "operator": "eq",
      "value": 0
    }
  ],
  "position": 2
}
```

### Node types catalog

| Type         | Purpose                                                 | Common default skills               |
| ------------ | ------------------------------------------------------- | ----------------------------------- |
| `extraction` | AI pulls entities from uploaded docs                    | Entity Lookup, Confidence Explainer |
| `review`     | Human reviews AI output                                 | Flag for Gatekeeper, Accept/Reject  |
| `fill`       | Human completes required fields                         | Field Suggestions, Lookup           |
| `tag`        | Human labels entity relationships                       | Entity Graph, Alias Mapper          |
| `approve`    | Gatekeeper/Owner signs off                              | Diff View, RFI Builder              |
| `notify`     | System sends stakeholder alert                          | Stakeholder Map                     |
| `gate`       | Hard checkpoint — must pass conditions before advancing | Gate Validator                      |

### Gate condition types

Conductor picks from three families — no code required:

| Family          | Examples                                    |
| --------------- | ------------------------------------------- |
| Field value     | required field is not null, confidence ≥ X% |
| Step completion | steps 1–N all marked complete               |
| Signal count    | open flags = 0, open RFIs = 0               |

---

## 2. Default Recipe Catalog

Airlock ships defaults for each vault type × all Role × Chamber combinations that apply.

### Distribution Agreement — Discover — Builder

```
1. extraction   Upload source doc → AI extracts entities
2. review       Review flagged entities            gate: confidence_avg ≥ 70%
3. fill         Complete required fields           gate: all required fields non-null
4. tag          Tag entity relationships
5. gate         Ready for Build                    gate: steps 1–4 complete, open_flags = 0
```

### Distribution Agreement — Review — Gatekeeper

```
1. review       Read AI summary + diff from prior submission
2. approve      Accept, reject, or raise RFI       gate: decision recorded
3. notify       Stakeholders alerted on decision
4. gate         Chamber complete                   gate: approval recorded, open_rfis = 0
```

### Default vault types shipped at launch (music/entertainment industry)

- Distribution Agreement
- Publishing Deal
- License Agreement
- Co-Publishing Agreement
- Artist Management Agreement

Optional (admin enables during setup):

- Sync License
- Work-for-Hire

**Phase C expansion:** template library — admin seeds a workspace recipe from a template instead of Airlock's hardcoded defaults. Same copy-on-write model, different seed source.

---

## 3. Workspace Setup Flow

### Step 1 — Enable Modules

Admin selects which modules to activate. Only enabled modules get recipes seeded.

### Step 2 — Configure Vault Types

For each enabled module, admin selects which vault types they need from the Airlock defaults list. Selecting a vault type seeds `workspace_recipes` for every applicable Role × Chamber pair. Admin can preview the default recipe nodes before enabling.

### Step 3 — Generate Role Invite Links

After vault types are configured, admin sees the lifecycle diagram for their first module — a horizontal flow showing which role operates in each chamber:

```
[Discover]──────[Build]──────[Review]──────[Ship]
  Builder         Builder      Gatekeeper    Owner
     ↓               ↓             ↓           ↓
  [Copy link]    [Copy link]  [Copy link]  [Copy link]
```

Each "Copy link" generates a single-use, non-expiring role invite token.

### Invite token shape

```
https://app.airlock.io/invite/[token]

encodes:
  workspace_id
  module
  role
  vault_types[]    which vault types this role is invited to work on
  max_uses   1     single use — burns after first accept
  expires_at NULL  no expiration (forever, like Discord)
```

### Invitee onboarding (on link click)

1. Google OAuth → account created
2. Role assignment written automatically — no admin action needed
3. Archetype discovery Q&A (5 questions, Socratic, one at a time) → default skill loadout assigned
4. User lands in their task runner with first recipe node loaded — not an empty shell

**Pilot model:** admin generates one link per person for their 3 super users (one per key role). Single-use ensures only the intended recipient can join. Once pilot validates, admin generates additional links for department rollout.

---

## 4. The Two Surfaces

### Surface A — Task Runner (user's view)

Lives in the Triptych Signal panel. Shown when a user opens a vault.

```
┌─ Signal ──────────────────────┐
│  Distribution Agreement       │
│  Discover · Step 2 of 5       │
│  ████████░░░░░░░░░  40%       │
│                               │
│  ▶ Review Extracted Entities  │
│  ─────────────────────────── │
│  AI pulled 14 entities.       │
│  3 flagged for review.        │
│                               │
│  [Accept All High Confidence] │
│  [Review Flagged →]           │
│                               │
│  ── Available Skills ──       │
│  ⚡ Entity Lookup             │
│  ⚡ Confidence Explainer      │
│  ⚡ Flag for Gatekeeper       │
└───────────────────────────────┘
```

- Shows **current node only** — no visibility into future steps
- Progress bar: step N of N
- Skills surface at bottom — only skills assigned to this node by Conductor
- Gate conditions enforced silently — Next action disabled with reason if unmet

### Surface B — Recipe Editor (Conductor's view)

Lives in Admin overlay.

```
┌─ Recipe Editor ────────────────────────────────────────────────────┐
│  Contracts › Distribution Agreement › Discover › Builder           │
│  Last edited by J. Chen · 2 days ago   [Reset to Airlock Default]  │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  [+]    │
│  │ 1        │─▶│ 2        │─▶│ 3        │─▶│ 4        │         │
│  │ Upload   │  │ Review   │  │ Fill     │  │ Tag      │         │
│  │ Source   │  │ Entities │  │ Required │  │ Relations│         │
│  │          │  │          │  │ Fields   │  │          │         │
│  │ Skills 2 │  │ Skills 3 │  │ Skills 1 │  │ Skills 2 │         │
│  │ Gates  0 │  │ Gates  2 │  │ Gates  3 │  │ Gates  1 │         │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘         │
│                                                                     │
│  Click any node to edit skills + gate conditions                   │
└─────────────────────────────────────────────────────────────────────┘
```

- Bird's-eye horizontal flow — all nodes visible
- Click node → right panel for skills checklist + condition builder
- Drag to reorder
- `[+]` → node type picker (extraction, review, fill, approve, notify, gate)
- `[Reset to Airlock Default]` → replaces `workspace_recipes.nodes` with `airlock_recipes.nodes`, requires confirm

### Routing

```
/admin/recipes                                              vault type index
/admin/recipes/[module]/[vaultType]                         chamber × role matrix
/admin/recipes/[module]/[vaultType]/[chamber]/[role]        recipe editor
```

---

## 5. How It Connects to the Role Taxonomy

```
Org Role      are you in this workspace?
Module Role   which chambers do you operate in? (drives which recipes apply to you)
Archetype     which default skill loadout do you start with?
Recipe        the exact node sequence you follow in your chamber, per vault type
Skills        tools available at each node (set by Conductor per node)
Conductor     edits recipes: reorders steps, swaps skills, sets gate conditions
```

The admin setup flow (Step 3) shows the lifecycle diagram so the admin understands the hand-off chain before generating invite links. The diagram IS the recipe — the same node flow the user will execute.

---

## 6. Open Questions (deferred)

- **Schema adapter / org mapping:** mapping customer job titles (VP of Legal, Contract Coordinator) to Airlock roles during workspace setup. Separate spec.
- **Recipe versioning:** when Airlock updates a default recipe, how does a workspace learn about it and optionally pull in changes? Phase C.
- **Cross-vault-type recipes:** some workspaces may want one recipe that applies to multiple vault types. Not in scope for Phase 1.
- **Archetype → recipe affinity:** does a user's archetype change which nodes are shown or how skills are presented at each node? Phase 4 (behavioral signals).
