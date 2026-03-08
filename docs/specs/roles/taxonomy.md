# Airlock Official Taxonomy

> **Status:** IN PROGRESS — under active design review
> **Last updated:** 2026-03-08
> **Source of truth for:** all role names, layer definitions, playbook vocabulary

---

## The Eight Layers

```
LAYER 0 — Workspace
LAYER 1 — Org Role
LAYER 2 — Module Role
LAYER 3 — Archetype
LAYER 4 — Skills
LAYER 5 — Recipe
LAYER 6 — Playbook
LAYER 7 — Playbook Chain
```

Each layer is independent. A user carries values at every layer simultaneously.

---

## Layer 0 — Workspace

The workspace is the top-level tenant boundary. Every piece of data is scoped to a workspace via `workspace_id`.

**The Architect** is the workspace creator — the Discord "server owner" equivalent. They are automatically assigned:

- Org Role: `Architect`
- Module Role: `Conductor` in all enabled modules

The Architect is the only person who can install/uninstall Playbooks, promote Conductors per module, and configure workspace-wide defaults.

---

## Layer 1 — Org Role

Controls workspace membership tier. One per user per workspace.

| Role          | Description                                                                                                  | Admin-level? |
| ------------- | ------------------------------------------------------------------------------------------------------------ | ------------ |
| **Architect** | Full workspace control + Conductor in all modules. Installs playbooks, manages billing, promotes Conductors. | Yes          |
| **Member**    | Default membership. Can hold module roles and an archetype. No workspace config access.                      | No           |
| **Billing**   | Finance read-only. Sees billing dashboard, no operational access.                                            | No           |
| **Guest**     | Invite-scoped, time-limited access. Cannot hold module roles beyond what the invite specifies.               | No           |

> **Rule:** Only `Architect` is "admin" in the traditional sense. The word "admin" does not appear in Module Roles.

---

## Layer 2 — Module Role

Operational role within a specific module. One per module per user. Controls which chambers you operate in and which vaults are visible to you.

| Role           | Chambers         | Vault visibility                                |
| -------------- | ---------------- | ----------------------------------------------- |
| **Builder**    | Discover + Build | Vaults they own or are assigned to              |
| **Gatekeeper** | Review           | All vaults in the Review queue for their module |
| **Owner**      | Ship             | All vaults in their module                      |
| **Conductor**  | All (meta)       | All vaults across all chambers — configure only |
| **Viewer**     | Any (read-only)  | Vaults explicitly shared with them              |

> **Conductor is not above Owner in hierarchy** — it is a parallel track. Conductor configures how the system works; Owner operates within it.

### Chamber Access Matrix

| Role       | Discover    | Build       | Review      | Ship        |
| ---------- | ----------- | ----------- | ----------- | ----------- |
| Builder    | ✓ operate   | ✓ operate   | —           | —           |
| Gatekeeper | —           | —           | ✓ operate   | —           |
| Owner      | observe     | observe     | observe     | ✓ operate   |
| Conductor  | ✓ configure | ✓ configure | ✓ configure | ✓ configure |
| Viewer     | read        | read        | read        | read        |

---

## Layer 3 — Archetype

Behavioral profile. One per user, global (not per module). Self-selected or inferred via 5-question Socratic Q&A on first login.

Controls: agent communication style, default skill loadout, UI view density, proactivity level.
Does NOT control: permissions, vault visibility, chamber access.

| Archetype      | Work style                                          | Agent tone                                     | Default view density   |
| -------------- | --------------------------------------------------- | ---------------------------------------------- | ---------------------- |
| **Analyst**    | Data-first, precision, pattern-finding              | Cite numbers, show confidence %, minimal prose | High — tables, charts  |
| **Strategist** | Big picture, connects patterns, plans ahead         | Pattern framing, connects to prior vaults      | Medium — timelines     |
| **Executor**   | Task-driven, action-oriented, moves fast            | Terse, action verbs, one CTA per message       | Low — inbox-first      |
| **Connector**  | Relationship-driven, stakeholder-heavy              | Warm, names stakeholders, narrative context    | Medium — activity feed |
| **Guardian**   | Compliance-minded, risk-aware, process-oriented     | Cautious, flags first, cites policy            | High — audit trails    |
| **Architect**  | Systems thinker, builds structure, designs workflow | Structural, explains reasoning, shows logic    | High — schema/config   |

> **Framework note:** Archetypes are inspired by PI (Predictive Index) Reference Profiles. Lead with PI in external/investor contexts — stronger psychometric backing than MBTI.

---

## Layer 4 — Skills

**Skills are `function + UI component` — not just capabilities.** When a Conductor assigns a skill to a recipe node, they are composing the UI that renders inside the Triptych when the user reaches that node. The Triptych shell is fixed and inviolable (like Replit's editor container). The contents of each panel are assembled from skill renders.

```
skill = capability (what the AI/agent does)
      + render spec (what component renders, in which Triptych slot)

Conductor assigns skill to node
  → user reaches node in task runner
  → Triptych renders skill's component in its designated slot
  → different conductors = different UI inside the same container
```

### The three constraints that never break

| Constraint    | What it means                                                                         |
| ------------- | ------------------------------------------------------------------------------------- |
| **Container** | Triptych shell (Signal \| Orchestrate \| Control) is fixed — never broken or bypassed |
| **Catalog**   | Skills must come from the approved skill library — no arbitrary UI injection          |
| **Schema**    | Skill props must conform to the component schema — validated render spec              |

This is the generative UI thesis applied to Airlock. The Conductor is composing interfaces from skill blocks, not writing code. The user experiences a custom UI without knowing it was assembled.

Composable capabilities. Additive on top of archetype defaults. Conductor assigns skills to recipe nodes. Multiple skills can be active at any node.

### Skill render spec (shape of every skill)

Each skill in the catalog defines both its capability and its render target:

```json
{
  "id": "entity-lookup",
  "capability": "Search and resolve entity references against known data",
  "slot": "signal",
  "component": "EntityLookupPanel",
  "props": {
    "searchable": true,
    "showConfidence": true,
    "maxResults": 10
  },
  "archetypeAffinity": ["analyst", "architect"],
  "chamberAffinity": ["discover", "build"]
}
```

**Slots** map to Triptych panels:

- `signal` — left panel (task runner, alerts, active skill actions)
- `orchestrate` — center panel (primary work surface, data entry, editing)
- `control` — right panel (context, config, metadata, relationships)

A recipe node can have multiple skills across multiple slots. The Triptych composes them all simultaneously — one skill renders in Signal, another in Control, another surfaces actions in Orchestrate.

### Skill catalog (v1)

| Skill                  | Slot        | Component rendered       | Description                                   |
| ---------------------- | ----------- | ------------------------ | --------------------------------------------- |
| `entity-lookup`        | signal      | `EntityLookupPanel`      | Search and resolve entity references          |
| `confidence-explainer` | signal      | `ConfidencePanel`        | Explain AI extraction scores with reasoning   |
| `flag-for-gatekeeper`  | signal      | `FlagAction`             | Raise a handoff signal to the Review queue    |
| `field-suggestions`    | orchestrate | `FieldSuggestionOverlay` | AI-suggested values inline on fields          |
| `lookup`               | control     | `ExternalLookupPanel`    | External data (CRM, Spotify, ASCAP, registry) |
| `entity-graph`         | orchestrate | `EntityGraphView`        | Visualize entity relationship network         |
| `alias-mapper`         | control     | `AliasMappingPanel`      | Map name variations to canonical entities     |
| `diff-view`            | orchestrate | `DiffViewer`             | Side-by-side vault version comparison         |
| `rfi-builder`          | signal      | `RFIComposer`            | Compose and send a Request for Information    |
| `stakeholder-map`      | control     | `StakeholderPanel`       | Identify and notify relevant stakeholders     |
| `gate-validator`       | signal      | `GateStatusPanel`        | Run gate checks and surface pass/fail results |

### Archetype default skill loadout (5–10 per archetype)

Each archetype ships with a curated default set. Conductor can add or suppress per node.

| Archetype      | Default skills (in priority order)                                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Analyst**    | `entity-lookup` · `confidence-explainer` · `alias-mapper` · `diff-view` · `field-suggestions` · `entity-graph` · `gate-validator`       |
| **Strategist** | `entity-graph` · `stakeholder-map` · `diff-view` · `lookup` · `field-suggestions` · `confidence-explainer`                              |
| **Executor**   | `field-suggestions` · `flag-for-gatekeeper` · `gate-validator` · `rfi-builder` · `stakeholder-map` · `entity-lookup`                    |
| **Connector**  | `stakeholder-map` · `rfi-builder` · `lookup` · `entity-lookup` · `flag-for-gatekeeper` · `diff-view`                                    |
| **Guardian**   | `gate-validator` · `diff-view` · `confidence-explainer` · `flag-for-gatekeeper` · `rfi-builder` · `alias-mapper` · `entity-lookup`      |
| **Architect**  | `entity-graph` · `alias-mapper` · `gate-validator` · `entity-lookup` · `confidence-explainer` · `field-suggestions` · `stakeholder-map` |

> **Muting pattern:** Conductor can suppress specific skills per chamber without changing the underlying archetype defaults. Example: suppress `flag-for-gatekeeper` in Ship to prevent blocking the publish flow.

---

## Layer 5 — Recipe

An ordered sequence of nodes defining exactly how a user moves through a chamber for a specific vault type.

**Scoped to:** Role × Chamber × Vault Type
**Owned by:** Workspace (editable copy of Airlock defaults)
**Executed by:** The user (task runner in Signal panel)
**Configured by:** Conductor (recipe editor in Admin overlay)

### Node types

| Type         | Purpose                                                 |
| ------------ | ------------------------------------------------------- |
| `extraction` | AI pulls entities from uploaded documents               |
| `review`     | Human reviews AI output                                 |
| `fill`       | Human completes required fields                         |
| `tag`        | Human labels entity relationships                       |
| `approve`    | Gatekeeper or Owner signs off                           |
| `notify`     | System sends stakeholder alert                          |
| `gate`       | Hard checkpoint — must pass conditions before advancing |

### Gate condition families

| Family          | Examples                                    |
| --------------- | ------------------------------------------- |
| Field value     | required field is not null, confidence ≥ X% |
| Step completion | steps 1–N all marked complete               |
| Signal count    | open flags = 0, open RFIs = 0               |

### Copy-on-write model

Airlock ships immutable default recipes (`airlock_recipes`). On workspace creation, all defaults for enabled vault types are copied into `workspace_recipes`. The workspace fully owns their copy — Conductor edits from there. `[Reset to Airlock Default]` is always available.

---

## Layer 6 — Playbook

A named, pre-configured bundle for a specific use case. The unit of "here's what you need to make this work."

**Bundles:**

- Roles needed (which module roles + how many of each)
- Vault types (which vault types to seed)
- Recipes (pre-configured for all Role × Chamber × Vault Type combinations)
- Skills (pre-loaded per role archetype)
- Invite links (generated, one per role, single-use, non-expiring)

**The prescriptive model:** Airlock tells the Architect what they need — "this playbook requires 1 Owner, 1 Gatekeeper, and 2 Builders." The Architect doesn't configure; they approve and send links.

### Out-of-the-box Playbooks (music/entertainment industry)

| Playbook              | Roles                                    | Vault Types                             | Use case                       |
| --------------------- | ---------------------------------------- | --------------------------------------- | ------------------------------ |
| **Contract Review**   | Builder + Gatekeeper + Owner             | Distribution Agreement, Publishing Deal | Legal review of incoming deals |
| **Sales Discovery**   | Builder + Owner + Conductor              | Opportunity, Meeting Notes, Proposal    | New business pipeline          |
| **Artist Onboarding** | Builder + Gatekeeper + Owner             | Artist Management Agreement             | New artist intake              |
| **Label Deal Flow**   | Builder + Gatekeeper + Owner + Conductor | Distribution Agreement, Co-Publishing   | Full label deal lifecycle      |
| **Sync Licensing**    | Builder + Gatekeeper + Owner             | Sync License                            | Film/TV sync placement         |
| **Publishing Admin**  | Builder + Gatekeeper + Owner             | Publishing Deal, Work-for-Hire          | Publishing administration      |

> **Phase C:** Template library — Architect browses a catalog of community/industry playbooks and installs any. Same copy-on-write model as recipes — workspace owns their copy after install.

---

## Layer 7 — Playbook Chain

A sequence of playbooks connected by handoff conditions. Multiple teams, one pipeline. The Conductor defines when one playbook's output triggers the next playbook's intake — and how work is assigned when it arrives.

**What a chain defines:**

- Sequence of playbooks (ordered)
- Handoff condition per link (what triggers the next playbook — vault state, field values, signal counts)
- Assignment mode per link (how incoming work is routed to the receiving team)

### Assignment modes

| Mode            | Behavior                                                                           |
| --------------- | ---------------------------------------------------------------------------------- |
| **Manual**      | Receiving team sees unassigned vault, claims it                                    |
| **Round-robin** | Auto-assigned to next Builder in rotation                                          |
| **Rule-based**  | Conductor defines routing conditions (e.g., contract_value > $100k → Senior Legal) |
| **Auto**        | Fully automatic based on entity matching or field values                           |

### Example: Label Deal Pipeline

```
Sales Discovery ──[vault ships]──▶ Contract Review ──[vault ships]──▶ Publishing Admin
  SDR + AE                          Legal team                         Royalties team
  auto-creates vault                rule-based assign                  round-robin assign
  in Contract Review    →           (value > $50k → Sr. Legal)  →     to admin team
```

### Conductor-built Skills — the Schema Adapter

The Conductor's most powerful capability: creating custom skills that map the customer's existing data schema to Airlock's standard vocabulary. This is the adapter layer that makes Airlock fit any organization's data without requiring them to change their systems.

**What Conductor-built skills can define:**

| Skill type           | What it does                                    | Example                                   |
| -------------------- | ----------------------------------------------- | ----------------------------------------- |
| **Field mapping**    | Customer field name → Airlock standard          | `OPP_ACCOUNT_NAME` → `company`            |
| **Entity aliasing**  | Customer vocabulary → Airlock vocabulary        | "Account" → Company, "Opp" → Vault        |
| **Extraction rules** | How to parse customer-specific document formats | Parse ISRC codes from PDF footnotes       |
| **Routing rules**    | Auto-assign vaults to roles based on conditions | territory = "EU" → EU Legal Gatekeeper    |
| **Friction tuning**  | Adjust gate conditions per vault type or team   | require 2 approvals for contracts > $500k |

The result: Builders, Gatekeepers, and Owners see clean, normalized Airlock-standard data and workflows. They never interact with raw customer schema. The Conductor handles the translation once — invisibly to everyone else.

---

## How the Layers Interact

```
User joins workspace via invite link
  → Org Role assigned (from token)
  → Module Role assigned (from token)
  → Archetype Q&A (5 Socratic questions)
  → Default skill loadout applied
  → Task runner pre-loaded with first recipe node

Conductor customizes workspace
  → Edits workspace_recipes (steps, skills, gate conditions)
  → Assigns/mutes skills per node
  → Adjusts gate condition thresholds

Architect installs playbook
  → Vault types seeded
  → workspace_recipes copied from airlock_recipes
  → Invite links generated (1 per role in playbook)
  → Sends links to pilot super users (single-use, non-expiring)
```

---

## Vocabulary Reference

| Term        | Meaning                                                       | Do NOT use                      |
| ----------- | ------------------------------------------------------------- | ------------------------------- |
| Module      | Top-level domain (Contracts, CRM, Tasks, Calendar, Documents) | Channel, workspace, section     |
| Vault       | Workflow instance — the primary unit of work                  | Deal, case, ticket, record      |
| Chamber     | Lifecycle stage (Discover → Build → Review → Ship)            | Phase, stage, step, status      |
| Gate        | Chamber checkpoint — must pass before advancing               | Milestone, approval             |
| View        | Screen within a chamber                                       | Page, tab, panel                |
| Triptych    | Three-panel layout (Signal \| Orchestrate \| Control)         | Dashboard, layout, workspace    |
| Signal      | Left Triptych panel — task runner, alerts, activity           | Sidebar, inbox                  |
| Orchestrate | Center Triptych panel — primary work surface                  | Main, content, canvas           |
| Control     | Right Triptych panel — context, config, metadata              | Details, inspector, sidebar     |
| Playbook    | Named bundle of roles + recipes + skills for a use case       | Template, preset, configuration |
| Recipe      | Ordered node sequence for a Role × Chamber × Vault Type       | Workflow, process, checklist    |
| Archetype   | User's behavioral profile (Analyst, Executor, etc.)           | Persona, type, role             |
| Architect   | Workspace creator — full control + Conductor in all modules   | Admin, super admin, owner       |
| Conductor   | Module-level AI/recipe configurator                           | Admin, manager, power user      |

---

## Screen Matrix — Global vs Specialty

Every screen is either **global** (all authenticated users) or **specialty** (gated by role, archetype, or playbook).

### Global screens (all users regardless of role)

| Screen              | Path                  | Purpose                                                                                                   |
| ------------------- | --------------------- | --------------------------------------------------------------------------------------------------------- |
| Home / Dashboard    | `/`                   | Personalized by archetype — Executor sees task inbox, Analyst sees data summary, Strategist sees pipeline |
| Vault list          | `/(module)/`          | Filtered by module role — Builder sees own vaults, Gatekeeper sees review queue                           |
| Vault detail        | `/(module)/[vaultId]` | Triptych — Signal (task runner) \| Orchestrate (work surface) \| Control (context)                        |
| Notifications       | `/notifications`      | Role-aware — Gatekeeper sees RFIs, Owner sees SLA alerts                                                  |
| Global search       | `cmd+k`               | Searches vaults, entities, people — results filtered by visibility                                        |
| Profile + archetype | `/profile`            | Archetype selector, skill preferences, notification settings                                              |

### Specialty screens by Module Role

| Screen               | Path                  | Visible to                                |
| -------------------- | --------------------- | ----------------------------------------- |
| Review Queue         | `/contracts/review`   | Gatekeeper                                |
| Ship Queue           | `/contracts/ship`     | Owner                                     |
| RFI Inbox            | `/signals/rfi`        | Builder (receiving), Gatekeeper (sending) |
| Analytics / Pipeline | `/(module)/analytics` | Owner, Architect                          |
| Recipe Editor        | `/admin/recipes/...`  | Conductor                                 |
| Skill Library        | `/admin/skills`       | Conductor                                 |
| Chain Builder        | `/admin/chains`       | Conductor                                 |
| Playbook Catalog     | `/admin/playbooks`    | Architect, Conductor                      |
| Member Management    | `/admin/members`      | Architect                                 |
| Invite Management    | `/admin/invite`       | Architect, Conductor                      |
| Workspace Settings   | `/admin/settings`     | Architect                                 |
| Roles Config         | `/admin/roles`        | Architect                                 |
| Billing              | `/admin/billing`      | Architect, Billing                        |

### Specialty screens by Archetype (UI Lens)

Archetype modifies the _default view_ on shared screens — same data, different rendering. Not separate routes.

| Archetype      | Home default                         | Vault list default      | Vault detail default                  |
| -------------- | ------------------------------------ | ----------------------- | ------------------------------------- |
| **Analyst**    | Confidence + data quality dashboard  | Table, dense, sortable  | Orchestrate-first, all fields visible |
| **Strategist** | Pipeline timeline, pattern summary   | Grouped by status/age   | Signal-first, pattern highlights      |
| **Executor**   | My tasks, next action, SLA countdown | Kanban, urgency-sorted  | Signal-first, CTA prominent           |
| **Connector**  | Activity feed, stakeholder pings     | Card view, contact-rich | Control-first, stakeholder context    |
| **Guardian**   | Risk flags, compliance status        | Table, risk-sorted      | Control-first, audit trail            |
| **Architect**  | System health, config status         | Schema/type grouped     | Config surfaces visible               |

### Screens to build (not yet in codebase)

Priority order — things that tie the taxonomy to the product:

| Screen                       | Why it's needed                                            | Depends on         |
| ---------------------------- | ---------------------------------------------------------- | ------------------ |
| `Archetype onboarding Q&A`   | Users can't get skill loadout without archetype assignment | Taxonomy           |
| `Playbook catalog + install` | Architects can't set up workspace without playbook UI      | Taxonomy + recipes |
| `Admin roles page (updated)` | Must reflect new 8-layer taxonomy, not old flat role list  | Taxonomy           |
| `Admin members page`         | Roster with org role + module roles + archetype per member | Taxonomy           |
| `Admin invite page`          | Generate + manage role-scoped invite links                 | Invite tokens      |
| `Skill library browser`      | Conductor discovery surface — the n8n node catalog         | Skills catalog     |
| `Chain builder`              | Connect playbooks into multi-team pipelines                | Playbook chains    |
| `Home lens variants`         | 6 archetype-specific dashboard layouts                     | Archetype system   |

---

## Build Priorities

### Priority 1 — Contract Review (full playbook, end-to-end)

The first complete Airlock case study. All 4 chambers working, real vault lifecycle, task runner wired.

**Scope:**

- Vault types: Distribution Agreement, Publishing Deal
- Roles: Builder (Discover + Build) → Gatekeeper (Review) → Owner (Ship)
- Recipes: default nodes for each Role × Chamber combination
- Task runner: Signal panel wired to recipe nodes
- Invite links: 3 links generated (one per role) from workspace setup
- Gate conditions: enforced — vault cannot advance without meeting conditions

**Why first:** Proves the core thesis end-to-end. Builder creates a vault, fills it, Gatekeeper reviews it, Owner ships it. Every layer of the taxonomy gets exercised.

### Priority 2 — CRM Prospecting (dogfood the Airlock case study)

Use Airlock's own CRM module to run Airlock's sales pipeline. The product IS the case study.

**Scope:**

- Leads table with score, source, stage
- Pipeline board (Sales Discovery playbook)
- Contact enrichment (Connector + lookup skill)
- Prospecting → Discovery vault chain: CRM lead → auto-create Sales Discovery vault
- The Airlock pitch itself modeled as a vault moving through chambers

**Why second:** Eating our own cooking. Real usage generates real feedback. The CRM prospecting flow also validates the Playbook Chain concept (CRM lead → Contract vault) end-to-end.

---

## Resolved Questions

| Question                                                           | Answer                                                                                                                                                                          |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Can a Member hold roles from multiple playbooks simultaneously?    | **Yes** — cross-playbook membership is supported. A person can be Builder in Contract Review AND Builder in Sales Discovery.                                                    |
| Can a playbook be installed more than once with different configs? | **Yes if needed** — e.g., "Contract Review — US" and "Contract Review — EU" as separate named instances. Each gets its own `workspace_recipes` copy.                            |
| Is the Conductor skill creation UI node-based or form-based?       | **Hybrid** — form-based for simple skills (field mapping, routing rules), node-based canvas (ReactFlow, evolved from WorkflowBuilder) for complex multi-step skills and chains. |
| Does archetype affect recipe nodes or only skill behavior?         | Skills are the UI renders — archetype shapes which skills are in the default loadout and how they render, not which nodes exist. (Phase 4 may add node-level affinity.)         |

## Open Questions

- Schema adapter / org mapping: how do customer job titles map to Airlock roles during workspace setup? (separate spec)
- Playbook instance naming: how does the Architect name/distinguish multiple instances of the same playbook type?
