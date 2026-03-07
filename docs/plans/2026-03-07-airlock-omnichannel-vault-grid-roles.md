# The Airlock: Omni-Channel, Vault Grid, and Chamber-Native Roles

> **Status:** BRAINSTORM
> **Date:** 2026-03-07
> **Scope:** Platform architecture, role expansion, vault view system, Ship chamber definition
> **Relationship to entity resolution:** None. This doc is a forward-looking expansion. The entity resolution implementation can proceed independently.

---

## 1. The Airlock — Naming the Omni-Channel

### What It Is

The product is literally named after the concept: an **airlock** is the single controlled gateway between two environments. In the app, the Airlock is the unified, permissioned stream through which all data enters and exits a vault.

Every page render — triage board, record inspector, contract generator, CRM account view, calendar, document viewer — is a **permissioned view of the same underlying stream**. There is one stream per vault. The views are lenses.

```
                    ┌──────────────────────────────────────────┐
                    │              THE AIRLOCK                  │
                    │     (one unified stream per vault)        │
                    │                                           │
   INBOUND          │   ┌─────────┐  ┌──────────┐  ┌────────┐ │          OUTBOUND
   ─────────────►   │   │ Events  │  │Documents │  │ Comms  │ │   ─────────────►
   Forms            │   │ (append │  │ (files,  │  │(iMsg,  │ │   Exports
   iMessage         │   │  only)  │  │  images) │  │ email) │ │   PowerPoints
   Uploads          │   └────┬────┘  └────┬─────┘  └───┬────┘ │   Campaigns
   Webhooks         │        │            │             │      │   Notifications
   Transcripts      │        └────────────┼─────────────┘      │   Published docs
                    │                     │                     │
                    │              UNIFIED STREAM               │
                    │                     │                     │
                    │    ┌────────────────┼────────────────┐    │
                    │    │    PERMISSIONED VIEWS (lenses)  │    │
                    │    │                                  │    │
                    │    │  Triage Board    Record Inspector│    │
                    │    │  Contract Gen    Activity Feed   │    │
                    │    │  CRM Timeline    Document Viewer │    │
                    │    │  Calendar        Task Board      │    │
                    │    │  AI PowerPoint   Campaign Export │    │
                    │    └────────────────────────────────┘    │
                    └──────────────────────────────────────────┘
```

### Why This Matters

This is not a metaphor — it's the architecture. The vault hierarchy already stores everything in one place. The MCP context server already returns only what a user's role permits. The triptych already renders permissioned panels.

What's new is **naming it** and making it a first-class concept in the product language:

- The **Airlock** = the vault's unified data stream (all events, documents, comms, metadata)
- A **View** = a permissioned lens on the Airlock (what you see depends on your role + the tool)
- A **Tool** = a capability that reads from or writes to the Airlock (extraction, generation, export, AI)

The MCP context server is the Airlock's API. It decides what tools and data each role can access. The shell just renders whatever the Airlock returns.

### Vocabulary Update

| Current Term | Stays/Changes    | Notes                                                                       |
| ------------ | ---------------- | --------------------------------------------------------------------------- |
| Vault        | Stays            | The container — the room itself                                             |
| Airlock      | **New concept**  | The vault's unified data stream — one way in, one way out                   |
| View         | Stays (expanded) | Now explicitly: "a permissioned lens on the Airlock"                        |
| Tool         | **New concept**  | A capability that reads/writes the Airlock (skill, export, AI, integration) |
| Triptych     | Stays            | The three-panel layout that renders views                                   |

### "Anyone within the Airlock can create any sort of view/tool"

This is the platform play. Once data is standardized in the Airlock:

1. **First-party views** — the ones we build (Triage, Record Inspector, Generator, etc.)
2. **MCP-powered views** — external tools that read/write via MCP (Google Drive, Salesforce, custom)
3. **Skill-generated views** — admins describe a view to Otto, Otto creates a skill that renders it
4. **User-composed views** — drag tools onto a vault's grid to compose custom dashboards

This is the long arc: **"We took your data, standardized it. What other tools do you use? Let us render them inside the Airlock with the right permissions."**

---

## 2. Vault Grid — Composable View Surfaces

### The Concept

Each vault gets a **grid** — a configurable canvas where views and tools can be arranged. Think of it as the workflow builder, but for vault UI composition instead of automation flows.

Currently, the triptych is fixed: Signal | Orchestrate | Control. The vault grid makes this composable.

### How It Connects to the Workflow Builder

The workflow builder (React Flow canvas) already has:

- A node palette (sidebar with draggable items)
- A canvas (where nodes are placed and connected)
- Node configuration (right panel on click)
- Categories (Triggers, Functions, Actions)

The vault grid reuses the same paradigm but for **views** instead of automation nodes:

```
+------------------------------------------------------------------+
| Vault: "Distribution Agreement — Acme × Summit"      [Edit Grid] |
|------------------------------------------------------------------|
| VIEW TOOLS       |   VAULT GRID (customizable layout)             |
| +-----------+    |   ┌──────────────────┬─────────────────────┐   |
| | Signal    |    |   │ Activity Feed    │  Contract Details   │   |
| |  Activity |    |   │ (Signal panel)   │  (Field cards)      │   |
| |  Feed     |    |   │                  │                     │   |
| +-----------+    |   │  [event]         │  Type: Distribution │   |
| | Orchestrate|   |   │  [event]         │  Territory: WW      │   |
| |  Inspector |   |   │  [event]         │  Effective: 2026-01 │   |
| |  Generator |   |   │                  │                     │   |
| |  Editor    |   |   ├──────────────────┼──────────┬──────────┤   |
| +-----------+    |   │ Document Viewer  │ Tasks    │ AI Chat  │   |
| | Control   |    |   │ (PDF render)     │ (linked) │ (Otto)   │   |
| |  Details  |    |   │                  │          │          │   |
| |  Audit    |    |   │  [page 1]        │ □ Review │ Ask Otto │   |
| |  Tasks    |    |   │  [page 2]        │ □ Export │ about    │   |
| +-----------+    |   │                  │ ☑ Extract│ this     │   |
| | Tools     |    |   │                  │          │ contract │   |
| |  Export   |    |   └──────────────────┴──────────┴──────────┘   |
| |  AI PPT   |    |                                                |
| |  Campaign |    |                                                |
| +-----------+    |                                                |
+------------------------------------------------------------------+
```

### Default Grids per Chamber

Each chamber has a sensible default grid. Users/admins can customize.

| Chamber      | Default Grid Layout                                | Primary Tools                                   |
| ------------ | -------------------------------------------------- | ----------------------------------------------- |
| **Discover** | Activity Feed + Lead Details + AI Chat             | Intake, qualification, routing                  |
| **Build**    | Document Viewer + Field Cards + Extraction Results | Data extraction, drafting, assembly             |
| **Review**   | Diff Viewer + Approval Chain + Audit Trail         | Patch review, evidence replay, gate checks      |
| **Ship**     | Published View + Export Tools + Distribution       | PowerPoint gen, campaign export, canonical copy |

### Grid Configuration is a Workflow Output

Here's where workflows and grids connect: a workflow can **configure a vault's grid** as an action node.

```
Trigger: Vault enters Review chamber
  → Action: Set vault grid to "Review Layout"
  → Action: Add "Compliance Checklist" tool to grid
  → Action: Notify Gatekeeper with deep link
```

This means workflow admins control what people see at each lifecycle point — not just what happens, but what the UI shows.

### Implementation Note

The vault grid is an evolution of the triptych, not a replacement. The triptych remains the default three-panel layout. The grid is a **superset** — the triptych is one possible grid configuration (3 columns: Signal, Orchestrate, Control). Custom grids can have 1-6 cells with different tools.

Grid layouts are stored in vault metadata:

```python
vault.metadata_ = {
    "grid_layout": {
        "columns": 3,
        "rows": 2,
        "cells": [
            {"id": "c1", "col": 0, "row": 0, "rowSpan": 2, "tool": "activity_feed"},
            {"id": "c2", "col": 1, "row": 0, "tool": "field_cards"},
            {"id": "c3", "col": 2, "row": 0, "tool": "ai_chat"},
            {"id": "c4", "col": 1, "row": 1, "colSpan": 2, "tool": "document_viewer"}
        ]
    }
}
```

Chamber-default grids are workspace-level config (MCP resource: `org://{ws_id}/grids/{chamber}`).

---

## 3. Expanded Roles — Chamber-Native Role Types

### The Problem with Current Roles

Current roles map to chambers:

- **Builder** → Discover + Build
- **Gatekeeper** → Review
- **Owner** → Ship

This works for contract adjudication but breaks when we add CRM, sales, marketing, and creative use cases. A sales rep lives in Discover but isn't a "Builder" in the contract sense. A marketer lives in Ship but isn't an "Owner."

### The Expansion: Functional Roles per Chamber

The 5 base module roles (Builder, Gatekeeper, Owner, Designer, Viewer) stay as **permission templates**. On top of them, we add **functional roles** — named personas that map to real job functions and carry chamber affinity, default grid layouts, and learning paths.

#### Discover Chamber — Intake & Qualification

| Functional Role     | Base Template | Job Function  | What They Do in the Airlock                                    |
| ------------------- | ------------- | ------------- | -------------------------------------------------------------- |
| **Scout**           | Builder       | SDR, BDR      | Qualifies inbound leads, runs intake workflows, routes to reps |
| **Prospector**      | Builder       | Sales Rep, AE | Manages pipeline, engages prospects, moves deals forward       |
| **Analyst**         | Builder       | Research, BI  | Enriches data, runs discovery queries, surfaces insights       |
| **Intake Operator** | Builder       | Ops, Admin    | Processes form submissions, manages intake queue, triages      |

#### Build Chamber — Assembly & Drafting

| Functional Role  | Base Template | Job Function     | What They Do in the Airlock                                  |
| ---------------- | ------------- | ---------------- | ------------------------------------------------------------ |
| **Drafter**      | Builder       | Contract Analyst | Drafts contracts, assembles clauses, maps extraction results |
| **Assembler**    | Builder       | Deal Desk        | Combines templates + data into complete documents            |
| **Data Curator** | Builder       | Data Analyst     | Cleans extracted data, resolves entities, patches fields     |
| **Integrator**   | Builder       | Systems          | Connects external data sources, maps fields, syncs           |

#### Review Chamber — Verification & Approval

| Functional Role | Base Template        | Job Function         | What They Do in the Airlock                                    |
| --------------- | -------------------- | -------------------- | -------------------------------------------------------------- |
| **Verifier**    | Gatekeeper           | QA, Compliance       | Reviews patches, checks extraction quality, enforces standards |
| **Approver**    | Gatekeeper           | Legal, Manager       | Approves high-risk changes, signs off on contracts             |
| **Auditor**     | Viewer + audit perms | Compliance, External | Read-only + audit trail access, can flag but not edit          |
| **Referee**     | Gatekeeper           | Senior Analyst       | Resolves disputes between Builder and Gatekeeper               |

#### Ship Chamber — Output & Distribution

This is the big expansion. **Ship is not just "publish contract."** Ship is where standardized data becomes outputs:

| Functional Role | Base Template    | Job Function    | What They Do in the Airlock                                               |
| --------------- | ---------------- | --------------- | ------------------------------------------------------------------------- |
| **Publisher**   | Owner            | Contract Admin  | Publishes canonical copy, promotes truth to baseline                      |
| **Creative**    | Builder + export | Designer, Brand | Uses AI to generate presentations, decks, brand materials from vault data |
| **Campaigner**  | Builder + export | Marketing       | Pulls standardized data into campaign tools, generates marketing assets   |
| **Distributor** | Owner            | Ops, Logistics  | Manages distribution, sends finalized documents, tracks delivery          |
| **Reporter**    | Viewer + export  | Executive, PM   | Generates reports, dashboards, summaries from Airlock data                |

### Ship Chamber — What It Really Means

Ship is where the **value of standardization pays off**. The data went through Discover (intake) → Build (extraction, structuring) → Review (verification, approval). Now it's clean, trusted, and ready to be weaponized:

1. **Creatives** can generate AI-powered PowerPoints using brand guidelines + vault data:
   - "Generate a pitch deck for the Acme Distribution deal using our brand template"
   - The AI has access to: deal terms, counterparty info, territory, effective dates
   - Brand guidelines are an MCP resource: `org://{ws_id}/brand`
   - Output: branded PPTX with consistent data, no copy-paste errors

2. **Marketers** can get deterministic recall for campaigns:
   - "Pull all active distribution deals in NA territory for the Q2 campaign"
   - The query hits the Airlock's standardized fields (not raw contract text)
   - Output: structured data export, ready for campaign tools

3. **Executives** can get reports without asking anyone:
   - "Show me all contracts entering Ship this quarter with deal value > $100K"
   - Self-serve because the data is clean and permissioned

4. **Publishers** do what they always did — promote truth to baseline, publish canonical copies

### How This Maps to the Existing Role System

The functional roles don't replace the permission system — they **compose with it**:

```
Functional Role = Base Module Role + Default Grid Layout + Learning Path + Tool Presets

Example:
  "Creative" = Builder (base permissions)
             + Ship Grid (AI PPT, Brand Assets, Export Tools)
             + Creative Learning Path (brand guidelines, template system, AI tools)
             + Tool Presets (PPT Generator, Brand Checker, Asset Library)
```

In the database, functional roles are custom roles (using the existing `custom_roles` table) with additional metadata:

```python
custom_role.metadata_ = {
    "functional_type": "creative",
    "chamber_affinity": "ship",          # Primary chamber
    "default_grid": "ship_creative",     # Grid layout preset
    "learning_path_id": "lp_creative",   # Role-based learning path
    "tool_presets": ["ppt_generator", "brand_checker", "asset_library"],
    "onboarding_flow": "creative_onboarding"  # Custom onboarding
}
```

### Permission Computation (Updated)

No change to the Discord-style computation. Functional roles are just custom roles with richer metadata. The permission engine already handles multiple roles per user with additive permissions.

---

## 4. Role-Based Learning

### The Concept

Each functional role gets a **learning path** — a progressive disclosure sequence that teaches the user their specific workflow in the Airlock.

This extends the existing onboarding spec (which already has progressive complexity: Day 1 → Week 1 → Week 2+) by making it **role-specific**.

### Learning Path Structure

```yaml
learning_path:
  id: lp_creative
  role: creative
  chamber: ship
  stages:
    - stage: 1
      title: "Your Workspace"
      trigger: first_login
      content:
        - type: tooltip
          target: module_bar
          text: "This is your module bar. As a Creative, you'll mostly work in Ship."
        - type: tooltip
          target: ship_chamber
          text: "Ship is where approved data becomes outputs — decks, reports, campaigns."
        - type: task
          action: "View a published contract vault"
          completion: vault_viewed_in_ship

    - stage: 2
      title: "Your Tools"
      trigger: stage_1_complete
      content:
        - type: tooltip
          target: vault_grid
          text: "Your vault grid is pre-configured for creative work. You can customize it."
        - type: task
          action: "Generate your first AI presentation"
          completion: ppt_generated
        - type: tooltip
          target: brand_assets
          text: "Brand guidelines live here. The AI uses them automatically."

    - stage: 3
      title: "Advanced"
      trigger: stage_2_complete + 5_exports_created
      content:
        - type: unlock
          feature: custom_templates
          text: "You've created 5 exports. Custom templates are now available."
        - type: task
          action: "Create a custom presentation template"
          completion: template_created
```

### Per-Role Learning Examples

| Functional Role | Stage 1 (Day 1)                               | Stage 2 (Week 1)                    | Stage 3 (Week 2+)                    |
| --------------- | --------------------------------------------- | ----------------------------------- | ------------------------------------ |
| **Scout**       | View triage board, understand lead cards      | Qualify a lead, use intake workflow | Create custom qualification criteria |
| **Drafter**     | View a vault in Build, see extraction results | Draft a contract using generator    | Configure clause preferences         |
| **Verifier**    | View review queue, understand patch cards     | Approve/reject a patch              | Configure review checklists          |
| **Creative**    | View published vault, see export options      | Generate an AI presentation         | Create custom templates              |
| **Campaigner**  | View CRM data, understand field structure     | Export data for a campaign          | Build custom data queries            |

### Storage

Learning paths are MCP resources: `org://{ws_id}/learning_paths/{role}`. Progress is stored per-user in `user.metadata_.learning_progress`:

```python
user.metadata_ = {
    "learning_progress": {
        "lp_creative": {
            "current_stage": 2,
            "completed_tasks": ["vault_viewed_in_ship", "ppt_generated"],
            "started_at": "2026-03-01T00:00:00Z",
            "stage_2_started_at": "2026-03-03T00:00:00Z"
        }
    }
}
```

---

## 5. Admin Skills — Making It Work for Demo

### Current State

- `apps/web/src/app/(shell)/admin/skills/page.tsx` — renders `SkillsList` component
- `apps/web/src/components/organisms/SkillsList.tsx` — reads from `MOCK_SKILLS` in `mock-connectors.ts`
- Skills display: name, description, status (active/inactive), role scoping, module scoping, tool chain
- "Create Skill" button exists but is non-functional
- "Edit" button exists but is non-functional

### What Needs to Work for Demo

1. **Skills list populated with realistic demo skills** — the MOCK_SKILLS array needs entries that demonstrate the Airlock concept:
   - "Generate Deal Deck" — Ship chamber creative tool (Brand + vault data → PPTX)
   - "Qualify Inbound Lead" — Discover chamber intake tool (Form data → score → route)
   - "Extract Contract Parties" — Build chamber extraction tool (PDF → parties → entity resolution)
   - "Run Compliance Check" — Review chamber verification tool (Vault data → compliance checklist)
   - "Export Campaign Data" — Ship chamber marketing tool (Vault query → structured CSV)

2. **Skill Creator flow (conversational)** — the "Create Skill" button opens an Otto conversation panel where:
   - Admin describes what they want in plain language
   - Otto generates a skill definition (JSON with steps, input/output, permissions)
   - Admin reviews and activates
   - For demo: this can be a guided modal with pre-filled examples

3. **Skill → Tool chain visualization** — the existing tool chain display in SkillCard works, just needs better demo data showing multi-step chains:
   - `fetch_brand_guidelines → generate_pptx → upload_to_drive`
   - `extract_text → classify_intent → score_lead → route_to_pool`

### Demo Priority

Skills are part of the admin/connectors package. For the demo production line, skills need to show:

- That custom tools can be created by admins without code
- That tools are scoped to roles and modules (permission model)
- That the Airlock concept works: standardized data → custom tools → any output

---

## 6. Putting It All Together — The Exercise

### "Each vault has a grid and you can put different views there"

Here's the full picture for each chamber, with functional roles and their default vault grids:

#### Discover Vault Grid (Scout's View)

```
┌────────────────────┬────────────────────┬───────────────┐
│ Intake Feed        │ Lead Card          │ AI Chat       │
│ (Signal)           │ (Orchestrate)      │ (Control)     │
│                    │                    │               │
│ [form submission]  │ Name: Jane Doe     │ Otto: "This   │
│ [iMessage]         │ Company: Acme      │ looks like a  │
│ [transcript]       │ Intent: Contracts  │ mid-market    │
│                    │ Score: 72          │ lead..."      │
│                    │ Source: Web Form   │               │
├────────────────────┼────────────────────┤               │
│ Qualification      │ Similar Leads      │               │
│ Workflow Status    │ (entity matches)   │               │
│                    │                    │               │
│ ☑ Intent scored    │ • Acme Records (L3)│               │
│ ☑ Contact created  │ • Acme Corp (new)  │               │
│ □ Routed to rep    │                    │               │
└────────────────────┴────────────────────┴───────────────┘
```

#### Build Vault Grid (Drafter's View)

```
┌────────────────────┬────────────────────┬───────────────┐
│ Activity Feed      │ Document Viewer    │ Field Cards   │
│ (Signal)           │ (Orchestrate)      │ (Control)     │
│                    │                    │               │
│ [extraction ran]   │ ┌──────────────┐  │ Contract Type │
│ [parties resolved] │ │ PDF Page 1   │  │ [Distribution]│
│ [field patched]    │ │              │  │               │
│                    │ │ Highlighted: │  │ Territory     │
│                    │ │ "Label" ←────│──│ [Worldwide]   │
│                    │ │ "Artist" ←───│──│               │
│                    │ └──────────────┘  │ Parties       │
│                    │                    │ Self: CMG     │
│                    │                    │ Cpty: DJ Nova │
└────────────────────┴────────────────────┴───────────────┘
```

#### Review Vault Grid (Verifier's View)

```
┌────────────────────┬────────────────────┬───────────────┐
│ Audit Trail        │ Diff Viewer        │ Gate Checklist│
│ (Signal)           │ (Orchestrate)      │ (Control)     │
│                    │                    │               │
│ [patch submitted]  │ Field: Territory   │ ☑ Parties OK  │
│ [review requested] │ - Was: "US Only"   │ ☑ Fields >80% │
│ [gate check ran]   │ + Now: "Worldwide" │ □ Legal review│
│                    │                    │ □ Owner sign  │
│                    │ Evidence:          │               │
│                    │ [page 3, line 12]  │ Risk: Medium  │
│                    │ "worldwide rights" │ SLA: 2d left  │
└────────────────────┴────────────────────┴───────────────┘
```

#### Ship Vault Grid (Creative's View)

```
┌────────────────────┬────────────────────┬───────────────┐
│ Published Data     │ AI Workspace       │ Brand Assets  │
│ (Signal)           │ (Orchestrate)      │ (Control)     │
│                    │                    │               │
│ Canonical fields:  │ Generate:          │ Brand Kit:    │
│ • Type: Distrib.   │ [□ Pitch Deck   ] │ • Logo (SVG)  │
│ • Value: $2.4M     │ [□ One-Pager    ] │ • Colors      │
│ • Territory: WW    │ [□ Campaign Brief] │ • Fonts       │
│ • Effective: Q1    │ [□ Data Export   ] │ • Templates   │
│                    │                    │               │
│ Recent exports:    │ [Generate with AI] │ Export format: │
│ • Deck v2 (Mar 5)  │                    │ [PPTX ▼]     │
│ • CSV (Mar 4)      │ Preview:           │               │
│                    │ [AI-generated      │ Audience:     │
│                    │  slide preview]    │ [Executive ▼] │
└────────────────────┴────────────────────┴───────────────┘
```

#### Ship Vault Grid (Campaigner's View)

```
┌────────────────────┬──────────────────────────────────────┐
│ Data Quality       │ Campaign Builder                      │
│ (Signal)           │ (Orchestrate — full width)            │
│                    │                                       │
│ Field coverage:    │ Query: "Active distribution deals     │
│ 94% complete       │         in NA territory, Q2 2026"     │
│                    │                                       │
│ Trusted fields:    │ Results: 23 vaults matched            │
│ ☑ Contract type    │ ┌──────────┬──────────┬──────────┐   │
│ ☑ Territory        │ │ Deal     │ Value    │ Entity   │   │
│ ☑ Counterparty     │ ├──────────┼──────────┼──────────┤   │
│ ☑ Effective date   │ │ Acme Dist│ $2.4M    │ CMG Rec  │   │
│ ⚠ Deal value (est) │ │ Summit   │ $1.1M    │ CMG Pub  │   │
│                    │ │ Horizon  │ $800K    │ CMG Rec  │   │
│ Last refresh:      │ └──────────┴──────────┴──────────┘   │
│ 2 min ago          │                                       │
│                    │ [Export CSV] [Export to HubSpot]       │
│                    │ [Generate Campaign Brief with AI]     │
└────────────────────┴──────────────────────────────────────┘
```

---

## 7. Workflow Visualization — Vault Lifecycle as Flowchart

### Each Vault Gets a Workflow View

The workflow builder (React Flow) isn't just for admin automation. It can also **visualize a vault's lifecycle** as a locked flowchart:

```
┌─────────────────────────────────────────────────────────────┐
│ Vault Lifecycle: "Distribution Agreement — Acme × Summit"   │
│ Current: Review Chamber  ·  7 events  ·  3 days active      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐                                            │
│  │ DISCOVER    │ ← Chamber (red)                            │
│  │ Web Form    │                                            │
│  └──────┬──────┘                                            │
│         │                                                    │
│  ┌──────▼──────┐     ┌──────────────┐                       │
│  │ Lead Scored │────►│ Routed to    │                       │
│  │ Score: 85   │     │ Ana (AE)     │                       │
│  └──────┬──────┘     └──────────────┘                       │
│         │                                                    │
│  ┌──────▼──────┐                                            │
│  │ BUILD       │ ← Chamber (yellow)                         │
│  │ PDF Upload  │                                            │
│  └──────┬──────┘                                            │
│         │                                                    │
│  ┌──────▼──────┐     ┌──────────────┐                       │
│  │ Extraction  │────►│ Parties      │                       │
│  │ Complete    │     │ Resolved     │                       │
│  └──────┬──────┘     └──────────────┘                       │
│         │                                                    │
│  ┌──────▼──────┐                                            │
│  │ REVIEW      │ ← Chamber (purple) ★ CURRENT              │
│  │ Gate Check  │                                            │
│  └──────┬──────┘                                            │
│         │                                                    │
│  ┌──────▼──────┐                                            │
│  │ ⏳ SHIP     │ ← Chamber (green) — not yet reached       │
│  │ (pending)   │                                            │
│  └─────────────┘                                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

This is the **audit trail as a visual flowchart** — built from the append-only events table. Every event is a node, edges represent transitions, chamber boundaries are visual groups.

It lives as a view tool that can be placed on any vault's grid. The rendering uses the same React Flow canvas as the workflow builder, but in read-only mode.

---

## 8. Secondary Task: Admin Skills in Demo Package

### What Needs to Ship

The admin skills page (`/admin/skills`) needs to be part of the demo production line. Currently it reads from `MOCK_SKILLS` which may be empty or minimal.

### Action Items (for coding agent)

1. **Populate `MOCK_SKILLS`** in `apps/web/src/lib/mock-connectors.ts` with 5-7 realistic skills that demonstrate the Airlock concept across chambers
2. **Wire "Create Skill" button** to open a conversational modal (can be mock/guided for demo)
3. **Ensure skills page is accessible** from admin sidebar navigation
4. **Add skill execution indicators** — show which skills are active, last run time, role scoping

### Does Not Conflict With

- Entity resolution implementation (different files, different engine layer)
- Workflow builder (skills are tools, not workflows — they compose into workflows)
- Vault hierarchy (skills read from vaults, don't modify the hierarchy)

---

## 9. Open Questions

- [ ] Should "Airlock" be a user-facing term or just internal architecture language?
- [ ] Should the vault grid be editable by end users, or only by admins/Designers?
- [ ] How do functional roles interact with the existing 16 agentic roles? (Are functional roles a replacement, or do they layer on top?)
- [ ] For the demo: do we need live AI generation in Ship, or is a mock preview sufficient?
- [ ] Role-based learning: should the notebook content be integrated here, or is it a separate spec?

---

## 10. Relationship to Other Work

| Work Item                       | Relationship                                    | Conflicts?                      |
| ------------------------------- | ----------------------------------------------- | ------------------------------- |
| Entity resolution (in-progress) | None — different engine layer                   | No                              |
| Workflow builder (specced)      | Vault grid reuses React Flow canvas             | No — additive                   |
| MCP registry + skills (planned) | Skills page is the admin surface for MCP tools  | No — this extends it            |
| Role architecture (specced)     | Functional roles are custom roles with metadata | No — uses existing custom_roles |
| Onboarding (specced)            | Learning paths extend onboarding per-role       | No — additive                   |
| Demo readiness (in-progress)    | Skills page needs to work for demo              | Coordination needed             |
