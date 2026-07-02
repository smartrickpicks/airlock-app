# Roles, Personas & Playbook Presets — Brainstorm

> **Date:** 2026-03-09
> **Status:** BRAINSTORM — not a spec, open for discussion
> **Trigger:** Bolt Playbook Builder presets are all AI-only; need human+AI role system

---

## The Problem

The Playbook Builder in the Skills Marketplace has presets like "Contract Review Pipeline" with nodes: PDF Contract Extraction → Clause Comparison → Risk Assessment → Executive Summary → Slack Gate Notification. **Every node is an AI skill.** There's no concept of "a human does this step" or "this step is assigned to a specific role."

Meanwhile, the Recipe System in Airlock already defines node types that are explicitly human (`review`, `fill`, `tag`, `approve`) vs AI (`extraction`). But the Playbook Builder doesn't know about this distinction.

The gap: **Who does each step — a human role, an Otto persona, or both?**

---

## What We Already Have (Inventory)

### Three-Layer Role System

```
Layer 1: Persona (HOW you use Airlock)
  Controller — business operator, day-to-day user
  Maverick   — power configurator, builds/sells packs
  Builder    — developer, extends the platform

Layer 2: Org Role (WHERE you sit in the hierarchy)
  Architect | Executive | Director | Lead | Member

Layer 3: Module Role (WHAT you can do per module)
  Builder | Gatekeeper | Owner | Designer | Viewer
```

### Functional Roles (per chamber)

Already designed in the Vault Grid Roles doc:

| Chamber  | Functional Roles                                       |
| -------- | ------------------------------------------------------ |
| Discover | Scout, Prospector, Analyst, Intake Operator            |
| Build    | Drafter, Assembler, Data Curator, Integrator           |
| Review   | Verifier, Approver, Auditor, Referee                   |
| Ship     | Publisher, Creative, Campaigner, Distributor, Reporter |

### Otto Agentic Archetypes (cognitive styles)

```
Analyst    — data-focused, investigative
Strategist — big-picture, planning
Executor   — action-oriented, operational
Connector  — relationship-focused, bridging
Guardian   — risk-aware, compliance
Architect  — systems thinking, structural
```

### Recipe Node Types

```
extraction — AI pulls entities from docs
review     — Human reviews AI output
fill       — Human completes required fields
tag        — Human labels entity relationships
approve    — Human approves gate conditions
notify     — System sends notification
gate       — System checks conditions
```

---

## The Insight: Every Workflow Node Has an Actor Type

Right now, nodes in the Playbook Builder are implicitly "Otto does this." But in reality, every node in a workflow has one of three actor types:

```
┌─────────────────────────────────────────────────────┐
│  ACTOR TYPES                                         │
│                                                      │
│  🤖 OTTO (AI)     — autonomous execution             │
│     Uses: skills, MCP tools, LLM inference           │
│     Example: "Extract contract metadata from PDF"    │
│                                                      │
│  👤 HUMAN (Role)  — requires human judgment           │
│     Uses: forms, reviews, approvals, decisions       │
│     Example: "Legal counsel reviews risk assessment" │
│                                                      │
│  🤝 HYBRID        — AI assists, human confirms       │
│     Uses: AI drafts + human reviews/edits            │
│     Example: "Otto drafts summary, rep customizes"   │
│                                                      │
│  ⚡ SYSTEM         — automated, no actor needed       │
│     Uses: webhooks, gates, routing, notifications    │
│     Example: "Send Slack notification to #contracts" │
└─────────────────────────────────────────────────────┘
```

### What This Means for the Playbook Builder

Every node in the React Flow canvas should have an **actor assignment**:

```json
{
  "id": "step-3",
  "skill_id": "review-risk-assessment",
  "actor": {
    "type": "human",
    "role_requirement": "gatekeeper",
    "functional_role": "approver",
    "chamber_affinity": "review",
    "fallback_otto_archetype": "guardian"
  }
}
```

vs.

```json
{
  "id": "step-1",
  "skill_id": "extract-contract-metadata",
  "actor": {
    "type": "otto",
    "archetype": "analyst",
    "risk_tier": "read",
    "auto_execute": true
  }
}
```

vs.

```json
{
  "id": "step-4",
  "skill_id": "draft-executive-summary",
  "actor": {
    "type": "hybrid",
    "otto_archetype": "strategist",
    "human_role": "builder",
    "interaction": "draft_then_review",
    "auto_approve_threshold": 0.95
  }
}
```

---

## Playbook Presets: Role-Based, Not Just AI-Based

### Current Problem

The Bolt Playbook Builder has presets like:

- Contract Review Pipeline
- Due Diligence Workflow
- Risk Assessment Pipeline

All nodes are AI skills. This is like having a factory with only robots and no workers.

### Proposed: Presets Organized by WHO Uses Them

Instead of presets by "what the pipeline does," organize by **who the pipeline is for**:

```
┌─────────────────────────────────────────────────────┐
│  PRESET CATEGORIES                                   │
│                                                      │
│  📋 BY FUNCTIONAL ROLE                               │
│     Scout Pipeline      — lead qualification flow    │
│     Drafter Pipeline    — contract assembly flow     │
│     Verifier Pipeline   — QA review flow             │
│     Creative Pipeline   — asset generation flow      │
│     Reporter Pipeline   — executive reporting flow   │
│                                                      │
│  🏢 BY DEPARTMENT                                    │
│     Legal Ops           — contract lifecycle         │
│     Sales Ops           — CRM pipeline management    │
│     Marketing Ops       — campaign data extraction   │
│     Finance Ops         — audit & compliance         │
│                                                      │
│  🔄 BY CHAMBER                                       │
│     Discover Playbooks  — intake & qualification     │
│     Build Playbooks     — assembly & drafting        │
│     Review Playbooks    — verification & approval    │
│     Ship Playbooks      — output & distribution      │
│                                                      │
│  🤖 BY OTTO ARCHETYPE                               │
│     Analyst Mode        — deep research workflows    │
│     Guardian Mode       — compliance-first workflows │
│     Executor Mode       — fast-action workflows      │
└─────────────────────────────────────────────────────┘
```

### Example: "Verifier Pipeline" Preset

```
Node 1: 🤖 Otto (Analyst)     → "Pull extraction results"
Node 2: 🤖 Otto (Guardian)    → "Run compliance checks"
Node 3: 🤝 Hybrid             → "Otto flags risks, Verifier reviews"
Node 4: 👤 Human (Approver)   → "Legal counsel approves or rejects"
Node 5: ⚡ System              → "Gate: all flags resolved?"
Node 6: ⚡ System              → "Notify: Slack #contracts-approved"
```

This shows the **human-AI collaboration** that makes Airlock different from a pure automation tool.

---

## Otto Personas in Workflows

### The Key Idea: Otto's Archetype Changes Per Node

Otto isn't one personality. In a playbook, Otto shifts archetype based on what the node requires:

| Node Task               | Otto Archetype | Behavior                                       |
| ----------------------- | -------------- | ---------------------------------------------- |
| Extract data from PDF   | **Analyst**    | Careful, thorough, cites sources               |
| Check compliance rules  | **Guardian**   | Conservative, flags everything, risk-aware     |
| Draft executive summary | **Strategist** | Big-picture, concise, prioritizes key insights |
| Route to right reviewer | **Connector**  | Matches skills to people, relationship-aware   |
| Execute bulk operations | **Executor**   | Fast, action-oriented, minimal confirmation    |
| Design workflow logic   | **Architect**  | Systems-thinking, patterns, structure          |

### This Is Already Designed

In `OttoState`, the `archetype` field already exists. The recipe system can set it per-node:

```python
# In recipe node config
{
  "id": "compliance-check",
  "type": "extraction",
  "otto_archetype": "guardian",  # ← Otto switches persona here
  "skills": ["compliance-checker", "risk-scorer"],
  "gate_conditions": [...]
}
```

---

## Member Settings Worktree: Skills & Playbooks

### What a User's Settings Should Look Like

Every member has a personal "worktree" of skills and playbooks, independent of the global workspace:

```
👤 User Settings
├── 📋 My Profile
│   ├── Display name, headline, bio, avatar
│   ├── Persona: Controller | Maverick | Builder
│   ├── Timezone, pronouns
│   └── Response style preference (concise | detailed | technical)
│
├── 🔧 My Skills
│   ├── Installed Skills (from marketplace)
│   │   ├── PDF Contract Extractor ✅ enabled
│   │   ├── Clause Comparator ✅ enabled
│   │   └── Risk Scorer ⬜ disabled
│   ├── Custom Skills (user-created)
│   │   └── My Territory Mapper v1.2
│   └── Skill Preferences
│       ├── Default extraction depth: deep
│       └── Auto-run read-tier skills: yes
│
├── 📚 My Playbooks
│   ├── Active Playbooks (running on my vaults)
│   │   └── Contract Ingestion Pipeline → 3 vaults in progress
│   ├── Saved Playbooks (favorites / bookmarks)
│   │   ├── Due Diligence Flow
│   │   └── Quarterly Report Generator
│   └── Custom Playbooks (user-created)
│       └── My Quick Review Pipeline
│
├── 🤖 Otto Preferences
│   ├── Default archetype: analyst
│   ├── Auto-approve read-tier tools: yes
│   ├── Notification preferences: slack + in-app
│   └── Response style: concise
│
├── 🔗 Connections (personal integrations)
│   ├── Google Workspace ✅ connected
│   ├── Slack ✅ connected
│   └── Jira ⬜ not connected
│
└── 🔑 Security
    ├── Passkeys (WebAuthn)
    ├── Connected devices
    └── Session management
```

### Activation Model: Global vs. Per-User

```
┌────────────────────────────────────────────────────┐
│  SKILL/PLAYBOOK ACTIVATION LAYERS                   │
│                                                     │
│  Layer 1: PLATFORM                                  │
│    Airlock ships default skills/playbooks            │
│    Available to all workspaces                       │
│    Cannot be modified, only overridden               │
│                                                     │
│  Layer 2: WORKSPACE (Conductor manages)             │
│    Conductor installs marketplace skills             │
│    Conductor creates workspace playbooks             │
│    Global API key enables AI features                │
│    Skills available to all workspace members         │
│                                                     │
│  Layer 3: USER (Member manages)                     │
│    User enables/disables available skills            │
│    User saves/favorites playbooks                    │
│    User creates personal playbooks                   │
│    User sets per-skill preferences                   │
│    Personal skills NOT shared with workspace         │
│                                                     │
│  Resolution: User > Workspace > Platform             │
│  (User prefs override workspace defaults)            │
│  (Workspace overrides platform defaults)             │
└────────────────────────────────────────────────────┘
```

### The API Key Question

AI-powered skills need an API key (OpenRouter, Anthropic, etc). Three models:

| Model             | How It Works                                                                                          | Who Pays          | Complexity               |
| ----------------- | ----------------------------------------------------------------------------------------------------- | ----------------- | ------------------------ |
| **Workspace Key** | Conductor sets one API key in Overlay → Settings. All Otto calls use this key.                        | Workspace/company | Low — one config         |
| **Per-User Key**  | Each user adds their own API key in Member Settings. Their Otto calls use their key.                  | Individual user   | Medium — per-user config |
| **Hybrid**        | Workspace key as default. Users can override with personal key for higher limits or different models. | Both              | Higher — fallback logic  |

**Recommendation:** Start with **Workspace Key** (simplest). Add per-user override later if users demand it. The Capability Tree already has an `ai_provider` section for this:

```json
{
  "ai_provider": {
    "enabled": true,
    "provider": "openrouter",
    "api_key_ref": "vault://secrets/openrouter_key",
    "default_model": "anthropic/claude-sonnet-4-20250514",
    "budget_limit_monthly": 500
  }
}
```

---

## The Matrix: Human Role × Otto Archetype × Node Type

This is the core insight. Every workflow node sits at an intersection:

```
                    OTTO ARCHETYPE
                    Analyst  Guardian  Strategist  Executor  Connector  Architect
HUMAN ROLE         ┌────────┬─────────┬───────────┬─────────┬──────────┬─────────┐
Scout (Discover)   │ Enrich │ Screen  │ Qualify   │ Route   │ Intro    │ Map     │
Prospector (Disc.) │ Research│ Risk   │ Strategy  │ Outreach│ Network  │ Plan    │
Drafter (Build)    │ Extract│ Comply  │ Structure │ Draft   │ Collab   │ Design  │
Verifier (Review)  │ Audit  │ Verify  │ Assess    │ Process │ Escalate │ Pattern │
Approver (Review)  │ Brief  │ Check   │ Evaluate  │ Decide  │ Notify   │ Review  │
Creative (Ship)    │ Data   │ Brand   │ Narrative │ Generate│ Share    │ Template│
Reporter (Ship)    │ Analyze│ Comply  │ Summarize │ Export  │ Present  │ Dashboard│
└────────┴─────────┴───────────┴─────────┴──────────┴─────────┘
```

Each cell is a **micro-workflow** — a specific human+AI collaboration pattern. For example:

- **Verifier × Guardian** = "Otto runs compliance checks, Verifier reviews flags"
- **Creative × Strategist** = "Otto drafts executive narrative, Creative refines messaging"
- **Scout × Analyst** = "Otto enriches lead data, Scout qualifies based on enrichment"

### Presets From the Matrix

Instead of generic "Contract Review Pipeline," the Playbook Builder offers presets derived from this matrix:

```
"As a [Functional Role], I need a playbook for [Chamber] work"

→ Scout Qualification Flow (Discover)
→ Drafter Assembly Pipeline (Build)
→ Verifier QA Checklist (Review)
→ Creative Asset Generator (Ship)
→ Reporter Dashboard Builder (Ship)
```

Each preset auto-fills:

1. The right node types (extraction, review, fill, approve, etc.)
2. The right Otto archetypes per node
3. The right human role assignments
4. The right gate conditions for the chamber

---

## Playbook Node Schema (Updated)

```json
{
  "id": "node-uuid",
  "type": "extraction | review | fill | tag | approve | notify | gate",
  "label": "Human-readable step name",
  "actor": {
    "type": "otto | human | hybrid | system",
    "otto_archetype": "analyst | guardian | strategist | executor | connector | architect",
    "human_role": "builder | gatekeeper | owner",
    "functional_role": "verifier | approver | drafter | scout | ...",
    "interaction_mode": "autonomous | draft_then_review | assist | confirm_only"
  },
  "skill_id": "reference to skill manifest",
  "config": {},
  "inputs": {},
  "outputs": {},
  "gate_conditions": [],
  "position": { "x": 0, "y": 0 }
}
```

### Interaction Modes

| Mode                | Description                        | UX                                           |
| ------------------- | ---------------------------------- | -------------------------------------------- |
| `autonomous`        | Otto runs, no human in loop        | Auto-execute, log result                     |
| `draft_then_review` | Otto drafts, human reviews/edits   | Show draft, await approval                   |
| `assist`            | Human leads, Otto suggests         | Human fills form, Otto auto-completes fields |
| `confirm_only`      | Otto decides, human clicks approve | Show decision, one-click confirm             |

---

## What This Means for the Bolt App

The Bolt Playbook Builder needs two additions:

### 1. Actor Type Selector on Each Node

When you drag a skill onto the canvas, a node config panel should include:

```
┌─────────────────────────────────────┐
│  Node: Risk Assessment              │
│                                     │
│  Actor Type: [🤖 Otto ▼]           │
│    ○ 🤖 Otto (AI autonomous)       │
│    ○ 👤 Human (role-assigned)       │
│    ○ 🤝 Hybrid (AI + human)        │
│    ○ ⚡ System (automated)          │
│                                     │
│  If Otto:                           │
│    Archetype: [Analyst ▼]           │
│    Risk tier: [read ▼]              │
│    Auto-execute: [✓]               │
│                                     │
│  If Human:                          │
│    Required role: [Gatekeeper ▼]    │
│    Functional: [Verifier ▼]         │
│                                     │
│  If Hybrid:                         │
│    Otto archetype: [Guardian ▼]     │
│    Human role: [Approver ▼]         │
│    Mode: [Draft then review ▼]      │
└─────────────────────────────────────┘
```

### 2. Preset Templates by Role

Replace "Preset Pipelines" dropdown with role-organized presets:

```
┌──────────────────────────────────────────────┐
│  Choose a Preset                              │
│                                               │
│  🔍 Discover                                  │
│    Scout — Lead Qualification Flow            │
│    Prospector — Pipeline Management           │
│    Analyst — Market Research Pipeline          │
│                                               │
│  🔨 Build                                     │
│    Drafter — Contract Assembly                 │
│    Data Curator — Entity Resolution            │
│    Integrator — Data Sync Pipeline             │
│                                               │
│  🔍 Review                                    │
│    Verifier — QA Checklist                     │
│    Approver — Multi-Stage Approval             │
│    Auditor — Compliance Audit Trail            │
│                                               │
│  🚀 Ship                                      │
│    Creative — Asset Generation                 │
│    Reporter — Executive Dashboard              │
│    Distributor — Document Delivery             │
│                                               │
│  🤖 Otto Workflows                            │
│    Full Automation — End-to-End AI Pipeline    │
│    Analyst Deep Dive — Research & Enrichment   │
│    Guardian Sweep — Compliance Scan            │
└──────────────────────────────────────────────┘
```

---

## Open Questions

1. **Should functional roles be assignable in the Playbook Builder or only in Airlock proper?**
   - Bolt is frontend-only, so functional roles are metadata in the JSON export
   - Airlock resolves them at runtime against the workspace's role assignments

2. **Can a user create a personal playbook that assigns work to other roles?**
   - Yes — but assignment is a suggestion. Airlock's recipe engine handles actual routing.
   - Personal playbooks with human nodes become "request templates" — the user is saying "this is how I want my workflow to go, Conductor please approve"

3. **How do Otto archetypes affect the LLM call?**
   - System prompt injection: `"You are Otto in {archetype} mode. Prioritize {archetype_traits}..."`
   - Model selection: Guardian might prefer Opus (careful), Executor might prefer Haiku (fast)
   - Temperature: Analyst = 0.1 (precise), Strategist = 0.7 (creative)

4. **Member settings vs. workspace settings — who wins?**
   - Already decided: User > Workspace > Platform
   - But Conductor can LOCK certain settings (e.g., "all contracts must use Guardian archetype for compliance checks")
   - Locked settings = workspace overrides user, shown as "Managed by admin" in member settings

5. **What goes in the exported playbook.json?**
   - Actor metadata is exported (type, archetype, role requirement)
   - But it's advisory — the consuming Airlock workspace maps it to their own role assignments
   - A "Verifier" in one workspace might be called "QA Analyst" in another — the functional role is the common language

---

## Next Steps

1. **Update Bolt Playbook Builder** — add actor type selector to node config panel
2. **Update playbook.json schema** — include actor metadata per step
3. **Update preset list** — organize by functional role / chamber / department
4. **Design Member Settings UI** — skills/playbooks worktree in user profile
5. **Wire Otto archetype to system prompt** — per-node archetype injection in recipe engine
