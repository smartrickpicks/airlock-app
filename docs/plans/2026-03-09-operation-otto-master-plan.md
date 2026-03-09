# Operation OTTO — Master Architecture Plan

> **Date:** 2026-03-09
> **Status:** DRAFT — In active development, not yet approved
> **Scope:** Complete architecture for people intelligence, individual onboarding, controller hierarchy, coordination layer, and playbook integration
> **Predecessor:** Liftoff Design (2026-03-08, APPROVED)
> **Foundation:** Workspace Forge & PI Engine Design (2026-03-09, APPROVED)

---

## Executive Summary

Operation OTTO is the architectural blueprint for Airlock's people intelligence and agent coordination system. It answers one question: **How does Airlock understand who you are, what you need, and how to help — whether you're a solo founder or a 1000-person enterprise?**

The system comprises four interconnected layers:

| Layer  | Name                            | Scope                                           | Status        |
| ------ | ------------------------------- | ----------------------------------------------- | ------------- |
| **L1** | Otto Learns You                 | Individual user profiling (per-person)          | Design needed |
| **L2** | Workspace Forge + PI Engine     | Workspace configuration (per-workspace)         | APPROVED      |
| **L3** | Controller Hierarchy (Org Tree) | Permission and delegation structure             | Design needed |
| **L4** | Coordination Layer (Hive)       | Multi-agent orchestration, coverage computation | Design needed |

These layers stack: L1 feeds L2, L2 feeds L3, L3 governs L4.

The Playbook Builder/Viewer consumes all four layers — it's the primary UX surface where coverage, team composition, and agent coordination become visible.

---

## The Core Equation

```
Playbook Complexity − Human Coverage = Otto's Workload
```

Every workflow node has a **team type** requirement. Every user has a **PI profile** that maps to team types. The gap between what the playbook needs and what humans provide is exactly what Otto fills.

At any scale — 1 person or 1000 — the equation is the same. Only the ratio changes.

---

## Workflows Are DAGs

Playbooks are **Directed Acyclic Graphs**, not linear pipelines. This is a foundational architectural decision that shapes everything.

```
Linear (wrong model):    A → B → C → D → E → F

DAG (correct model):
                  ┌→ B (Research)  ──┐
A (Triage) ───────┤                  ├──→ E (Review) → F (Ship)
                  └→ C (Extract)  ──┘
                         ↑
                  D (Enrich) ────────┘
```

### Why DAGs Matter for Operation OTTO

1. **Parallel coverage.** Nodes B and C run concurrently. A human handles B (Exploring team type) while Otto handles C (Producing team type) simultaneously. Coverage isn't sequential — it's a graph problem.

2. **Hive communication follows DAG edges.** Personal Ottos don't broadcast — they communicate along the playbook's dependency edges. When Otto-Jane finishes node C, the hive signals Otto-Zachary that node E is unblocked.

3. **Controller scope maps to DAG branches.** A Sales Controller owns the left branch (prospecting). A Legal Controller owns the right branch (compliance). They converge at a cross-department gate node. Each controller assigns their subtree members to their branch's nodes.

4. **Sovereign Balance is per-branch.** The left branch might be Driver-heavy (Captain, Maverick). The right branch might be Enforcer-heavy (Guardian, Specialist). Otto compensates per-branch, not globally — the left branch's Otto instances add patience, the right branch's add speed.

5. **Gates are convergence points.** In a DAG, gates are nodes where multiple branches converge. A Review gate can require: "All upstream nodes complete AND human approval from a Gatekeeper." The hive tracks which branches are complete and which are blocking.

### DAG Node Schema

```yaml
node:
  id: "research-counterparty"
  name: "Research Counterparty"

  # DAG structure
  depends_on:              # Upstream dependencies
    - "triage-incoming"
  blocks:                  # What this node's completion unblocks
    - "draft-agreement"
    - "compliance-review"
  parallel_group: "discovery-branch"  # Nodes in same group can run concurrently

  # PI Engine + Actor (unchanged from below)
  team_type: exploring
  actor: hybrid
  ...
```

---

## Layer 1: Otto Learns You (Individual User Profiling)

### Purpose

Every person who touches Airlock — server owner, controller, team member, guest — goes through a profiling process. Otto learns who they are, not by testing them, but by creating a **value exchange**: Otto helps improve their professional presence while extracting behavioral signals.

### Multi-Path Intake

Three paths to the same output. Users choose based on what they have available:

| Path                 | Input                              | Confidence | Value Exchange                                                                                                                                                       |
| -------------------- | ---------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **LinkedIn Connect** | OAuth → profile data + connections | 0.85-0.90  | Otto offers profile makeover, better headshot, optimized headline. User gets a refreshed LinkedIn. Otto gets behavioral signals + CRM contacts.                      |
| **Resume Upload**    | PDF/DOCX resume                    | 0.75-0.80  | Otto reformats resume, suggests improvements, identifies skill gaps. User gets a better resume. Otto gets career trajectory + domain expertise signals.              |
| **Conversation**     | 5-7 min guided chat                | 0.60-0.70  | Otto asks goal-oriented questions (never personality classification). User gets workspace configured to their style. Otto infers DECF drives from language patterns. |

**Key principle:** If LinkedIn is outdated, Otto asks for a resume. If no resume, Otto has a conversation. Paths can combine — LinkedIn + conversation fills gaps to 0.90+ confidence.

### Signal Extraction (What Otto Learns)

From any intake path, Otto maps to the same output schema:

```yaml
user_profile:
  user_id: "usr_01ARZ..."
  intake_path: "linkedin" # linkedin | resume | conversation | combined
  intake_completed_at: "2026-03-09T14:30:00Z"

  # Behavioral drives (PI Engine)
  drives:
    dominance: high # A — assertiveness, competitiveness
    extraversion: high # B — people vs. task orientation
    patience: low # C — pace, urgency, variety-seeking
    formality: low # D — structure vs. freedom preference

  inferred_profile: "captain" # Closest of 17 PI reference profiles
  meta_archetype: "driver" # Driver / Enforcer / Interpreter
  confidence: 0.87

  # Domain context
  domain: "music_publishing"
  seniority: "director"
  functional_focus: "business_development"
  tenure_avg_years: 3.2

  # CRM enrichment (LinkedIn path only)
  contacts_synced: 142
  contacts_enriched: 89 # Found email, phone, company for these

  # Otto personalization
  otto_defaults:
    default_archetype: "executor"
    interaction_mode: "draft_then_review"
    autonomy_ceiling: 0.75
    communication_style: "concise"
    cognitive_mode: "visual"
    explanation_style: "summary_first"
```

### LinkedIn Signal Mapping

| LinkedIn Data Point                   | PI Drive Signal    | Mapping Logic                                                                                              |
| ------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------- |
| Headline language                     | Dominance (A)      | Action verbs ("built", "led", "disrupted") → high D. Supportive language ("helped", "contributed") → low D |
| Connection count + endorsements       | Extraversion (B)   | High connections + diverse endorsements → high E. Selective, deep-expertise endorsements → low E           |
| Job tenure patterns                   | Patience (C)       | Short tenures + many roles → low C (variety-seeking). Long tenures → high C (steady, methodical)           |
| Profile completeness + certifications | Formality (D)      | Detailed sections, certifications, publications → high F. Sparse, casual → low F                           |
| Recommendations given vs received     | Extraversion (B)   | More given than received → high E (relationship-oriented)                                                  |
| Skill endorsements clustering         | Team type affinity | Technical clusters → Producing/Executing. Leadership clusters → Exploring/Pathfinding                      |

### CRM Contact Sync

When a user connects LinkedIn, Otto:

1. **Imports all connections** with available data (name, title, company, email if public)
2. **Enriches contacts** using public data sources (company domain → email pattern, LinkedIn profile → additional context)
3. **Maps to CRM entities** — each contact becomes a CRM record attached to the user's workspace
4. **Deduplicates** against existing CRM records using fuzzy matching (name + company + email)
5. **Tags relationships** — Otto infers relationship strength from mutual connections, endorsements, interaction recency

This means a new workspace starts with a populated CRM on day one — not an empty address book.

### Profile Makeover (The Value Exchange)

This is what makes the intake feel helpful rather than extractive:

**LinkedIn Makeover:**

- Otto analyzes the profile against 17 PI reference patterns
- Suggests headline rewrites that match their natural communication style
- Identifies missing sections (summary, featured, skills endorsements)
- Optionally: AI-generated professional headshot refinement (background, lighting, crop)
- User can accept/reject each suggestion — Airlock never posts without permission

**Resume Makeover:**

- Otto reformats to a clean template
- Identifies achievement gaps (duties listed without outcomes)
- Suggests quantified impact statements
- Highlights transferable skills for their stated goals

### When This Runs

Otto Learns You runs:

- **First time:** During onboarding, before Workspace Forge
- **When invited:** New team member accepts invitation → Otto Learns You → workspace access
- **On demand:** Any user can re-run from their profile settings to update their PI profile
- **Passively:** Over time, Otto refines the profile based on observed behavior (Phase 3)

### Relationship to Workspace Forge

```
User creates account
        ↓
Otto Learns You (individual — runs for EVERY person)
        ↓
    ┌─── First user? ───┐
    │                    │
    YES                  NO
    ↓                    ↓
Workspace Forge      Join existing workspace
(workspace config)   (profile maps to team)
    ↓                    ↓
Dispatch             Dispatch
```

The server owner goes through both: Otto Learns You (who are you?) → Workspace Forge (what are you building?). Subsequent users only go through Otto Learns You, then join the workspace the owner already configured.

---

## Layer 2: Workspace Forge + PI Engine

**Status: APPROVED** — See `docs/plans/2026-03-09-workspace-forge-pi-engine-design.md`

Key points from the approved design (not repeated here in full):

- Split-screen onboarding: Otto chat left, live workspace preview right
- Goal-first inference: 2-4 questions, never personality classification
- 17 PI reference profiles, 9 team types, 3 meta-archetypes
- New `airlock-persona` repo (MCP read-only) for all reference data
- Profile → workspace configuration: modules, skills, playbook templates, Otto defaults, compensation patterns
- Soft locks: Conductor/Architect can enforce workspace-level settings

### What L1 Changes About L2

With Otto Learns You in place, Workspace Forge gets richer signals:

| Without L1 (Original Design)        | With L1 (Operation OTTO)                                |
| ----------------------------------- | ------------------------------------------------------- |
| 2-4 goal questions during Forge     | 0-2 questions (LinkedIn/resume already provided drives) |
| Infers drives from language in chat | Validates against behavioral evidence from career data  |
| Starts with empty CRM               | CRM pre-populated from LinkedIn contacts                |
| Generic skill suggestions           | Domain-specific skills based on industry + role         |
| Confidence ~0.65-0.75               | Confidence ~0.85-0.90                                   |

---

## Layer 3: Controller Hierarchy (Org Tree)

### The Insight

Every workspace has a permission tree. The server owner sits at the root. Everyone else exists in a subtree controlled by someone above them.

```
                    ┌──────────────┐
                    │  ARCHITECT   │  ← Server owner
                    │  (root)      │     Controls everything
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────┴─────┐ ┌───┴───┐ ┌──────┴──────┐
        │CONTROLLER │ │CONTROL│ │  CONTROLLER  │
        │ Sales     │ │ Legal │ │  Marketing   │
        └─────┬─────┘ └───┬───┘ └──────┬──────┘
              │            │            │
        ┌─────┼─────┐     │      ┌─────┼─────┐
        │     │     │     │      │     │     │
       Mem   Mem   Mem   Mem    Mem   Mem  Sub-
                                          Controller
                                              │
                                         ┌────┼────┐
                                         │    │    │
                                        Mem  Mem  Mem
```

### Controller Rules

1. **The Architect (server owner) controls everything.** They are the root node. They can be any PI profile type — solo founder, technical builder, business operator, whatever. The system adapts to them, not the other way around.

2. **Controllers manage their subtree.** A Sales Controller can assign playbooks, create workflows, and manage team members within their branch. They cannot touch the Legal Controller's branch.

3. **Sub-controllers inherit downward.** A Marketing Controller can appoint a Social Media Sub-Controller who manages only the social team. Permissions flow strictly top-down.

4. **Playbook Builder scopes to your tree.** When a Controller opens the Playbook Builder, the "assign to team member" dropdown only shows people in their subtree. They can't assign work to someone outside their branch.

5. **The Architect is also a worker.** Especially for solo founders — the Architect is simultaneously the root controller AND a participant in workflows. They might be nodes 2, 4, and 7 in the same playbook.

### Controller Schema

```yaml
controller_node:
  user_id: "usr_01ARZ..."
  role: "architect" # architect | controller | sub_controller | member
  parent_id: null # null = root (Architect)
  subtree_scope:
    - "usr_02..." # Direct reports
    - "usr_03..."
  permissions:
    can_create_controllers: true
    can_assign_playbooks: true
    can_manage_otto_settings: true # For their subtree
    can_view_coverage: true # For their subtree
    can_override_gates: false # Only Architect can override
  playbook_builder_scope: "subtree" # Can only assign nodes to subtree members
```

### How Controllers Use the System

**Creating a playbook:**

```
Controller opens Playbook Builder
        ↓
Selects template or builds from scratch
        ↓
For each node with actor_type: "human"
        ↓
    "Assign to:" dropdown shows ONLY subtree members
        ↓
    Each member shows their PI profile + fit score for this node's team type
        ↓
    If no suitable human → Otto fills the node (coverage computation)
        ↓
Playbook published → team members see assigned nodes in their Triage
```

**Monitoring coverage:**

```
Controller opens their team dashboard
        ↓
Sees coverage heat map per active playbook
        ↓
    Green nodes = human assigned, good profile fit
    Blue nodes = hybrid (human + Otto assist)
    Purple nodes = Otto filling (no suitable human)
    Red nodes = neither human nor Otto assigned (gap)
        ↓
Controller can reassign, hire, or increase Otto autonomy
```

### Scale Behavior

| Scale              | Architect           | Controllers | Sub-Controllers | Members |
| ------------------ | ------------------- | ----------- | --------------- | ------- |
| Solo founder       | 1 (does everything) | 0           | 0               | 0       |
| Seed (5 people)    | 1                   | 0-1         | 0               | 3-4     |
| Mid-size (50)      | 1                   | 3-5         | 2-4             | 40+     |
| Enterprise (1000+) | 1                   | 10-20       | 20-50           | 900+    |

The tree structure doesn't change. Only the depth and breadth grow.

---

## Layer 4: Coordination Layer (Hive)

### The Vision

Each user gets a **personal Otto** — an agent instance tuned to their PI profile. All signals flow through the personal Otto. It's the router, the filter, the translator between the user and every other system.

These personal Ottos form a **hive** — a workspace-scoped network where:

- Ottos communicate to coordinate handoffs
- Coverage is computed across the entire playbook DAG
- Sovereign Balance is maintained (team drive vectors sum to zero)
- The hive compensates for human gaps automatically

### Architecture: Not a Swarm, a Hive Mind

```
                 ┌─────────────────────────────┐
                 │     WORKSPACE HIVE           │
                 │                               │
                 │   ┌─Otto─┐    ┌─Otto─┐       │
                 │   │ Zach │←──→│ Jane │       │
                 │   │ (Cap)│    │(Guard)│       │
                 │   └──┬───┘    └──┬───┘       │
                 │      │    ╲  ╱   │           │
                 │      │     ╲╱    │           │
                 │      │     ╱╲    │           │
                 │      │   ╱    ╲  │           │
                 │   ┌──┴───┐    ┌──┴───┐       │
                 │   │ Otto │←──→│ Otto │       │
                 │   │ Tom  │    │(GAP) │       │
                 │   │(Anly)│    │ FILL │       │
                 │   └──────┘    └──────┘       │
                 │                               │
                 │   Coverage: 87%               │
                 │   Balance: [+0.3, -0.1, ...]  │
                 └─────────────────────────────┘
```

**Key distinction from a swarm:**

- A swarm = many identical agents competing. No structure, no memory.
- A hive = differentiated agents cooperating. Each has a role, a PI profile, a communication style. They form a DAG, not a mesh. Signals flow through defined channels, not broadcast.

### The Atomic Unit

Every node in the system is a **triangle + circle** pair:

```
    △          △ = Agent template (archetype, skills, permissions)
    ○          ○ = User (PI profile, domain expertise, human judgment)

    Together = one functional unit
```

- **Human node:** Triangle is the personal Otto (tuned to user's PI profile). Circle is the user. Otto assists, drafts, routes — user decides.
- **Otto-only node:** Triangle is the archetype-matched Otto. Circle is absent (no human assigned). Otto executes autonomously within confidence thresholds.
- **Hybrid node:** Both active. Otto drafts, user reviews. The interaction mode (autonomous / draft_then_review / assist / confirm_only) depends on the node's team type + user's PI profile.

### Coverage Computation

```python
@dataclass
class NodeCoverage:
    node_id: str
    team_type: str                    # From playbook node definition
    ideal_profiles: list[str]         # PI profiles that fit this team type
    assigned_user_id: str | None      # null = unassigned
    assigned_user_profile: str | None # User's PI profile if assigned
    profile_fit_score: float          # 0.0-1.0, cosine similarity in 4D drive space
    otto_fills: bool                  # True if Otto is handling this node
    otto_archetype: str               # Which archetype Otto uses for this node
    interaction_mode: str             # autonomous | draft_then_review | assist | confirm_only
    coverage_type: str                # human | otto | hybrid | gap

@dataclass
class PlaybookCoverage:
    playbook_id: str
    total_nodes: int
    human_covered: int                # Nodes with assigned humans
    otto_covered: int                 # Nodes where Otto fills
    hybrid_covered: int               # Nodes with human + Otto
    gap_count: int                    # Unassigned, uncovered nodes
    coverage_pct: float               # (human + otto + hybrid) / total
    sovereign_balance: dict           # {"D": +0.3, "E": -0.1, "C": +0.5, "F": -0.2}
    otto_compensation_vector: dict    # What Otto adds to reach balance
    team_type_distribution: dict      # {"exploring": 3, "producing": 2, ...}
```

### Sovereign Balance

The mathematical principle: a well-functioning team's behavioral drives should **sum toward equilibrium**. Too much Dominance without Patience creates chaos. Too much Formality without Extraversion creates silos.

```
Team Drive Vector = Σ (each member's drive vector)

Ideal: [D≈0, E≈0, C≈0, F≈0]  (balanced)

Reality: [D=+3, E=+1, C=-2, F=-1]  (driver-heavy, low patience)

Otto compensation: [D=-1, E=0, C=+2, F=+1]
    → Otto fills with Guardian and Analyst archetypes
    → Adds patience-oriented verification steps
    → Surfaces "slow down" cognitive friction for Driver users
```

Each PI profile contributes a drive vector on the scale of [-2, +2] per drive:

| Profile      | D   | E   | C   | F   |
| ------------ | --- | --- | --- | --- |
| Captain      | +2  | +2  | -2  | -2  |
| Guardian     | -1  | -1  | +2  | +2  |
| Analyzer     | -1  | -2  | +1  | +2  |
| Maverick     | +2  | +1  | -2  | -1  |
| Collaborator | -1  | +2  | +1  | -1  |

### Coordination Layer Repository Structure

`airlock-coordination` becomes the hive's state store:

```
airlock-coordination/
├── state/
│   ├── workspace-{id}/
│   │   ├── hive.yaml              # Active personal Otto instances
│   │   ├── coverage.yaml          # Current coverage computation
│   │   ├── balance.yaml           # Sovereign Balance vector
│   │   └── routing.yaml           # Signal → agent routing rules
│   └── global/
│       └── heartbeat-config.yaml  # Wake cycle config
│
├── agents/
│   ├── {user_id}.yaml             # Per-user Otto config
│   │   # PI profile, archetype, confidence thresholds,
│   │   # communication style, active playbook nodes
│   └── gap-fillers/
│       └── {node_id}.yaml         # Otto instances filling gaps
│
├── sessions/
│   ├── active/                    # Currently open conversations
│   └── persistent/                # Cross-vault personal Otto sessions
│
├── queue/
│   ├── pending.json               # Signals waiting for routing
│   ├── in-progress.json           # Tasks being worked
│   └── completed.json             # Finished tasks (short-term)
│
├── locks/
│   └── atomic-checkout.json       # Task lock registry (Concept 10)
│
├── audit/
│   └── {date}/                    # Append-only decision log
│       └── {timestamp}.jsonl      # Immutable audit entries
│
├── tree/
│   └── workspace-{id}.yaml        # Controller hierarchy tree
│
└── history/
    └── {workspace_id}/            # Long-term audit trail
```

### Signal Flow

Every signal in the system flows through the coordination layer:

```
External event (email, webhook, vault change, gate transition)
        ↓
    Signal Bus (Redis pub/sub)
        ↓
    Routing Engine (reads routing.yaml)
        ↓
    ┌─── Which user does this concern? ───┐
    │                                      │
    Personal Otto                    Workspace Otto
    (user-scoped)                    (no user, system-level)
        ↓                                ↓
    Route to user's                 Route to Architect
    Signal panel                    or relevant Controller
        ↓
    User sees signal
    in their Dispatch
```

### PaperClip Concept Integration

Ten concepts from PaperClip map directly to the coordination layer:

| PaperClip Concept           | OTTO Implementation                                                                                    | Priority |
| --------------------------- | ------------------------------------------------------------------------------------------------------ | -------- |
| Heartbeat execution         | Personal Otto wakes on schedule + events. Check pending work, stale vaults, overdue tasks.             | Phase 2  |
| Goal → Task ancestry        | Every task traces to a goal. Otto flags orphaned tasks. Playbooks declare which goals they serve.      | Phase 1  |
| Three-tier skill discovery  | Discovery (name only) → Activation (full SKILL.md) → Execution (load referenced files). Saves context. | Phase 1  |
| Adapter pattern             | Universal task format. Otto, Codex, Claude, webhooks all speak the same language.                      | Phase 3  |
| Budget enforcement          | Per-user, per-vault, per-playbook token caps. 80% warning, 100% hard stop. Cost attribution.           | Phase 2  |
| Governance gates (expanded) | Gates beyond vaults — agent actions, skill installations, data access all gated by risk tier.          | Phase 1  |
| Importable playbook packs   | pack.json → full import/export with secret scrubbing, collision handling. Marketplace foundation.      | Phase 2  |
| Tool-call audit tracing     | Every Otto tool call logged: name, params, output, cost, duration. Traceable and exportable.           | Phase 1  |
| Session persistence         | Per-vault and per-user Otto sessions survive across interactions. "Continue from yesterday."           | Phase 1  |
| Atomic task checkout        | System-enforced locks. No double-work. Timeout-based expiry.                                           | Phase 1  |

---

## User Journeys

### Journey 1: Solo Founder (1 Person)

**Persona:** Zachary — technical founder, Captain profile (high D, high E, low C, low F). Building Airlock HQ as the first workspace.

**Day 1: Otto Learns You**

1. Creates account via Google OAuth
2. Otto greets: "Let's get to know each other so I can set up your workspace. What's the fastest way — connect LinkedIn, upload your resume, or just talk?"
3. Zachary connects LinkedIn (OAuth flow)
4. Otto reads profile: tech founder, music industry background, 3-year avg tenure, high connection count, action-verb heavy headline
5. Otto offers: "I can optimize your LinkedIn headline and suggest connections you might be missing. Want me to?"
6. While Zachary reviews LinkedIn suggestions, Otto extracts: Captain profile, Driver meta-archetype, 0.87 confidence
7. Otto syncs 142 LinkedIn contacts into CRM — 89 enriched with email/phone

**Day 1: Workspace Forge** 8. Otto: "You're building something. What's the goal?" (Only 1 question needed — LinkedIn already provided most signals) 9. Zachary: "Prospecting music industry clients and managing contract workflows" 10. Right panel lights up: Contracts module active, CRM active, Triage active. Skills preloaded: lead-scoring-engine, deal-velocity-calculator 11. Otto suggests Contract Intake playbook template 12. Zachary hits "Launch" → lands on Dispatch

**Day 1: First Playbook** 13. Opens Playbook Builder (as Architect, sees full workspace scope) 14. Otto generates a 7-node Contract Intake playbook 15. Every node shows "Otto filling" (purple) — no team members yet 16. Coverage: 100% Otto, 0% human. Sovereign Balance: skewed Driver (Otto compensates with Guardian + Analyst nodes) 17. Zachary assigns himself to 3 nodes (Research, Draft, Publish) 18. Coverage recalculates: 43% human (Zachary), 57% Otto, balance improves

**Week 1: Working Solo** 19. Zachary is nodes 2, 4, and 7 in his own playbook 20. Otto handles nodes 1, 3, 5, 6 autonomously (triage, extraction, compliance check, stakeholder alignment) 21. Personal Otto routes signals: "New extraction complete on vault CMG-001" → Zachary's Dispatch 22. Otto adjusts communication to Captain style: summary-first, action-oriented, minimal detail

**Month 1: Behavioral Refinement** 23. Otto observes: Zachary skips compliance review nodes, consistently edits extraction outputs rather than approving as-is 24. Profile refinement: confidence increases to 0.92, autonomy ceiling adjusts down on extraction (Zachary prefers to review), up on compliance (he trusts Otto's judgment)

---

### Journey 2: Seed Stage (Founder + 4 Hires)

**Persona:** Zachary (Captain/Architect) hires Jane (Guardian/Controller), Tom (Analyzer/Member), Lisa (Collaborator/Member), Mike (Maverick/Member).

**Hire 1: Jane (Head of Legal)**

1. Zachary invites Jane via email
2. Jane clicks invite link → account creation → Otto Learns You
3. Jane connects LinkedIn: legal background, 8-year avg tenure, compliance certifications, detailed profile sections
4. Otto infers: Guardian profile, Enforcer meta-archetype, 0.89 confidence
5. Otto offers resume optimization (Jane declines — her LinkedIn is current)
6. CRM syncs 230 of Jane's connections — legal industry contacts
7. Jane joins workspace. Her profile maps to: ideal for Review chamber, Stabilizing team type, compliance-oriented nodes
8. Zachary (Architect) sees notification: "Jane Doe joined. Guardian profile. Ideal for: Compliance Review, Risk Assessment, Audit Trail nodes."

**Controller Assignment** 9. Zachary promotes Jane to Controller (Legal) 10. Jane's controller scope: can assign playbooks to legal team members, manage otto settings for her branch 11. Zachary's controller tree:
`     Zachary (Architect)
    ├── Jane (Controller: Legal)
    ├── Tom (Member)
    ├── Lisa (Member)
    └── Mike (Member)
    `

**Hires 2-4: Tom, Lisa, Mike** 12. Each goes through Otto Learns You independently 13. Tom (Analyzer): uploads resume (no LinkedIn), high formality, data-focused → Enforcer archetype 14. Lisa (Collaborator): connects LinkedIn, high extraversion, team-oriented → Interpreter archetype 15. Mike (Maverick): brief conversation (no LinkedIn, no resume), action-oriented language, variety-seeking → Driver archetype 16. Each user's personal Otto adjusts to their profile

**Coverage Transformation** 17. Before hires: 7-node playbook, 43% Zachary / 57% Otto 18. After hires: Otto suggests reassignment:
`     Node 1: Triage Incoming    → Lisa (Collaborator, Adapting team type)  ← was Otto
    Node 2: Research           → Zachary (Captain, Exploring team type)    ← stays
    Node 3: Extract Terms      → Tom (Analyzer, Producing team type)      ← was Otto
    Node 4: Draft Agreement    → Zachary + Mike (hybrid)                   ← was Zachary solo
    Node 5: Compliance Review  → Jane (Guardian, Stabilizing team type)    ← was Otto
    Node 6: Stakeholder Align  → Lisa (Collaborator, Cultivating type)    ← was Otto
    Node 7: Publish            → Zachary (Captain, Pathfinding type)       ← stays
    ` 19. Coverage: 86% human, 14% Otto (Otto assists on Draft Agreement) 20. Sovereign Balance: [D=+1, E=+1, C=0, F=+1] — much closer to equilibrium

**Jane's Playbook Building (as Controller)** 21. Jane opens Playbook Builder 22. Her "assign to" dropdown shows: Tom, herself (her subtree is just Tom for now) 23. She builds a Compliance Audit playbook scoped to her legal team 24. She cannot assign nodes to Mike or Lisa (outside her subtree) 25. Zachary (Architect) can see and override any assignment

---

### Journey 3: Mid-Size Organization (50+ People)

**Persona:** SaaS company with 50 employees. CEO (Architect), 5 department heads (Controllers), 8 team leads (Sub-Controllers), 36 team members.

**Workspace Structure**

```
CEO (Architect, Persuader profile)
├── VP Sales (Controller, Captain profile)
│   ├── Sales Lead - West (Sub-Controller, Promoter)
│   │   ├── 4 SDRs (various profiles)
│   │   └── 2 AEs (various profiles)
│   └── Sales Lead - East (Sub-Controller, Maverick)
│       ├── 3 SDRs
│       └── 3 AEs
│
├── VP Legal (Controller, Guardian profile)
│   ├── Contract Manager (Sub-Controller, Controller profile)
│   │   └── 3 Paralegals (various profiles)
│   └── Compliance Lead (Sub-Controller, Specialist)
│       └── 2 Compliance Analysts
│
├── VP Marketing (Controller, Promoter profile)
│   ├── Content Lead (Sub-Controller, Scholar)
│   │   └── 4 Content Writers
│   └── Demand Gen Lead (Sub-Controller, Venturer)
│       └── 3 Campaign Managers
│
├── VP Engineering (Controller, Strategist profile)
│   ├── 2 Tech Leads (Sub-Controllers)
│   │   └── 12 Engineers
│   └── QA Lead (Sub-Controller)
│       └── 3 QA Engineers
│
└── VP Operations (Controller, Operator profile)
    └── 3 Operations staff
```

**Otto at Scale**

- 50 personal Ottos, each tuned to individual PI profiles
- Each personal Otto routes signals to its user's Dispatch
- The hive maintains coverage across 12 active playbooks simultaneously
- Sovereign Balance computed per-department (VP Sales' team vs VP Legal's team)
- Department-level Otto compensates for team imbalances independently

**Dunbar Threshold Behavior**
At 50 people, the system crosses the first major Dunbar threshold (5→15→50). Behavior changes:

- **Below 15:** Everyone sees everyone's signals. Flat communication.
- **At 50:** Signals filtered by controller subtree. VP Sales only sees sales team signals by default. Cross-department signals explicitly routed.
- **Digest mode activates:** Instead of real-time signals for everything, Controllers get daily digests for their subtree. Real-time reserved for their direct reports.

**Cross-Department Playbooks**
When a playbook spans departments (e.g., Contract Intake involves Sales prospecting, Legal review, and Operations fulfillment):

- The Architect (CEO) creates the cross-department playbook
- Each Controller assigns their team members to department-specific nodes
- The hive coordinates handoffs between departments
- Gate transitions notify the next department's Controller

---

### Journey 4: Enterprise (1000+ People)

**Persona:** Media conglomerate with 1000+ employees, M&A activity, multiple business units.

**Key Differences at 1000+**

| Aspect               | Mid-Size (50)                  | Enterprise (1000+)                           |
| -------------------- | ------------------------------ | -------------------------------------------- |
| Controller depth     | 3 levels                       | 5-7 levels                                   |
| Active playbooks     | 12                             | 200+                                         |
| Personal Ottos       | 50                             | 1000+                                        |
| Coverage computation | Per-department                 | Per-business-unit, per-region                |
| Sovereign Balance    | Single team vector             | Nested vectors (team → dept → BU → org)      |
| Signal routing       | Subtree-scoped                 | Multi-hop routing with escalation            |
| Gate governance      | 2-tier (Controller, Architect) | Multi-tier with delegation chains            |
| Onboarding           | Self-serve                     | Provisioned (turnkey flow + Otto Learns You) |
| Otto autonomy        | Workspace-level ceiling        | Per-BU, per-role, per-risk-tier ceilings     |

**Turnkey + Otto Learns You**
At enterprise scale, onboarding is provisioned:

1. IT admin creates user accounts in bulk
2. Each user gets an invitation with a personalized Otto Learns You link
3. Users complete intake (LinkedIn encouraged, resume accepted, conversation fallback)
4. Profiles auto-map to their organizational position
5. Controller assignments auto-derived from HRIS org chart integration
6. Playbooks auto-assigned based on department + role

**M&A Scenario**
When the conglomerate acquires a company:

1. New entity's org tree imports as a subtree under an Integration Controller
2. All new users go through Otto Learns You
3. Existing playbooks from the acquired company import as packs (Concept 7)
4. Coverage computation runs on the merged team
5. Sovereign Balance identifies culture clashes (e.g., acquired team is all Drivers, parent company is Enforcers)
6. Otto suggests integration playbooks that bridge the gap

---

## Stale Spec Reconciliation

### Contradictions Found (Must Resolve)

| Issue              | File                                      | Says                                                    | Should Say                                             | Resolution                                                                         |
| ------------------ | ----------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Org roles          | `specs/roles/overview.md`                 | Member/Lead/Director/Executive                          | Architect/Member/Billing/Guest                         | Align to taxonomy.md (canonical)                                                   |
| Org roles          | `specs/onboarding/turnkey-flow.md`        | Owner/Admin/Manager/Member/Guest                        | Architect/Member/Billing/Guest                         | Align to taxonomy.md                                                               |
| Module role naming | `specs/roles/overview.md`, `glossary.mdx` | Designer                                                | Conductor                                              | Replace Designer with Conductor everywhere                                         |
| Profiling method   | `specs/roles/taxonomy.md`                 | "Self-selected or inferred via 5-question Socratic Q&A" | Goal-first inference from Otto Learns You              | Replace with intake-path description                                               |
| Archetype count    | `specs/roles/overview.md`                 | 16 Sovereign Workplace roles                            | 6 Otto archetypes + 17 PI profiles + 3 meta-archetypes | Reconcile: PI profiles are the foundation, archetypes are Otto's operational modes |
| Database type      | `specs/roles/overview.md`                 | UUID primary keys                                       | ULID primary keys (TEXT)                               | Align to CLAUDE.md mandate                                                         |
| Banned terms       | `specs/onboarding/overview.md`            | Uses "Home", "Tasks"                                    | Dispatch, Triage                                       | Fix vocabulary                                                                     |

### Glossary Additions Needed

The glossary (`concepts/00-glossary.mdx`) is locked but incomplete. These terms must be added:

| Term                   | Definition                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| Workspace Forge        | Split-screen onboarding (Otto chat + live preview) replacing wizard checklist                |
| Otto Learns You        | Multi-path individual profiling (LinkedIn/Resume/Conversation) that runs for every user      |
| PI Profile             | One of 17 Predictive Index reference profiles describing behavioral drives                   |
| Drive                  | One of 4 behavioral dimensions: Dominance (A), Extraversion (B), Patience (C), Formality (D) |
| Team Type              | One of 9 team behavioral patterns (Exploring, Producing, Cultivating, etc.)                  |
| Meta-Archetype         | One of 3 fundamental operating modes: Driver, Enforcer, Interpreter                          |
| Conductor              | Module-level admin role (replaces "Designer"). Configures recipes, manages workflows         |
| Architect              | Org-level root role. Server owner. Controls all controllers                                  |
| Controller             | Org-level delegation role. Manages a subtree of the org tree                                 |
| Playbook               | Higher-level workflow blueprint with human+AI collaboration patterns                         |
| Recipe                 | Execution engine: Role × Chamber × Vault Type step sequences                                 |
| Skill                  | Individual MCP tool wrapper — atomic unit of automation                                      |
| Sovereign Balance      | Mathematical principle: team drive vectors should sum to zero                                |
| Coverage               | Percentage of playbook nodes assigned to a human, Otto, or hybrid                            |
| Hive                   | Workspace-scoped network of personal Ottos coordinating via DAG                              |
| Personal Otto          | Individual user's Otto instance, tuned to their PI profile                                   |
| Cognitive Compensation | UI pattern counteracting a profile's cognitive weak points                                   |
| Soft Lock              | Workspace setting enforced by Conductor that users cannot override                           |

### Files to Update

| Priority | File                               | Action                                                                                                                    |
| -------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| P0       | `specs/roles/taxonomy.md`          | Replace "5-question Socratic Q&A" with Otto Learns You intake. Add PI profile mapping. Keep 8-layer structure.            |
| P0       | `specs/roles/overview.md`          | Replace 16 Sovereign roles with PI-based system. Fix org roles to Architect/Member/Billing/Guest. Replace UUID with ULID. |
| P0       | `concepts/00-glossary.mdx`         | Add all terms above. Requires permission to modify locked file.                                                           |
| P1       | `specs/onboarding/overview.md`     | Rewrite to describe Workspace Forge + Otto Learns You flow. Remove wizard steps.                                          |
| P1       | `specs/onboarding/turnkey-flow.md` | Update for enterprise provisioning + Otto Learns You integration. Fix org roles.                                          |
| P2       | Recipe system plan                 | Add team_type, ideal_profiles, profile_fit_score fields to node JSONB schema                                              |
| P2       | Otto Agent Graph plan              | Add user_profile, user_drives, otto_compensation_vector to OttoState                                                      |
| P2       | Otto Agentic Layer plan            | Add persistent personal Otto session type. Add enrich_user_profile() source.                                              |

---

## OttoState Extensions

The existing OttoState (from the Agent Graph plan) needs these additions for Operation OTTO:

```python
@dataclass
class OttoState:
    # === Existing fields (from Agent Graph plan) ===
    user_id: str
    workspace_id: str
    org_role: str
    module_roles: dict[str, str]
    surface: str                    # "task_runner" | "messenger" | "workspace_forge" | "otto_learns_you"
    session_id: str
    messages: list[dict]
    archetype: str | None = None
    module: str | None = None
    chamber: str | None = None
    vault_id: str | None = None
    active_recipe_id: str | None = None
    current_node_index: int | None = None
    current_node: dict | None = None
    vault_context: dict | None = None

    # === Operation OTTO extensions ===

    # Personal Otto identity
    user_profile: str | None = None         # PI reference profile (e.g., "captain")
    user_drives: dict | None = None         # {"D": "high", "E": "high", "C": "low", "F": "low"}
    user_meta_archetype: str | None = None  # "driver" | "enforcer" | "interpreter"
    profile_confidence: float = 0.0         # 0.0-1.0

    # Controller hierarchy context
    controller_role: str | None = None       # "architect" | "controller" | "sub_controller" | "member"
    controller_scope: list[str] | None = None  # User IDs in this user's subtree
    parent_controller_id: str | None = None    # Who controls this user

    # Coverage context (when working a playbook node)
    node_team_type: str | None = None            # Team type required by current node
    node_ideal_profiles: list[str] | None = None # Profiles that fit this node
    profile_fit_score: float | None = None       # How well this user fits the current node
    team_coverage: dict | None = None            # Workspace-level coverage snapshot
    otto_compensation_vector: dict | None = None # What Otto adds to reach balance

    # Persistent personal Otto
    personal_session_id: str | None = None  # Cross-vault persistent session
    intake_path: str | None = None           # "linkedin" | "resume" | "conversation" | "combined"
    intake_completed: bool = False

    @property
    def can_execute_actions(self) -> bool:
        """Whether Otto can take actions (not just respond)."""
        return self.surface in ("task_runner", "workspace_forge", "otto_learns_you")

    @property
    def is_personal_otto(self) -> bool:
        """Whether this is a personal Otto instance vs workspace-level."""
        return self.user_profile is not None
```

---

## Recipe System Extensions

Recipe nodes (from the approved Recipe System Design) need PI-aware fields:

```yaml
# Before (current recipe node)
node:
  id: "extract-terms"
  type: extraction
  config: {}
  gate_conditions: []

# After (Operation OTTO)
node:
  id: "extract-terms"
  type: extraction
  config: {}
  gate_conditions: []

  # PI Engine integration
  team_type: producing          # From airlock-persona/team-types/
  ideal_profiles:               # Profiles that best fit this node
    - analyzer
    - specialist
    - operator
  otto_archetype: analyst       # Which archetype Otto uses here

  # Actor assignment
  actor: hybrid                 # otto | human | hybrid | system
  assigned_user_id: null        # null = Otto fills
  interaction_mode: draft_then_review
  profile_fit_score: null       # Computed when user is assigned

  # Coverage metadata
  coverage_type: otto           # human | otto | hybrid | gap
  otto_fills_reason: "No team member with Producing team type profile"
```

---

## External Research Integration

### Agency-Agents Pattern (msitarzewski/agency-agents)

The agency-agents repo provides 61 pre-built agent templates across 9 divisions. These map to Airlock's archetype system:

| Agency Division | Airlock Archetype | Use Case                                    |
| --------------- | ----------------- | ------------------------------------------- |
| Strategy        | Strategist        | Big-picture planning, goal setting          |
| Creative        | Architect         | Systems design, workflow structure          |
| Analytics       | Analyst           | Data extraction, research, enrichment       |
| Operations      | Executor          | Fast execution, bulk operations             |
| Communications  | Connector         | Stakeholder alignment, handoff coordination |
| Compliance      | Guardian          | Risk assessment, compliance verification    |
| Research        | Analyst           | Deep research, competitive analysis         |
| Support         | Connector         | User assistance, onboarding help            |
| Development     | Architect         | Technical implementation, integration       |

The agency-agents repo validates the archetype model — 61 specialized agents naturally cluster into 6 cognitive styles.

### Multi-Agent Coordination Research

| Framework                 | Relevance to OTTO                                                                           | Adoption                                     |
| ------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------- |
| **LangGraph**             | State machine for coverage computation DAG. Typed state, conditional edges, persistence.    | Use for coverage engine                      |
| **A2A Protocol** (Google) | Agent-to-Agent communication standard. JSON-RPC 2.0, capability discovery, task delegation. | Evaluate for inter-Otto communication        |
| **CrewAI**                | Role-based multi-agent with hierarchical process. Closest to Airlock's model.               | Reference architecture, don't adopt directly |
| **Anthropic Agent SDK**   | Tool use, multi-turn, structured outputs. Our LLM foundation.                               | Already using PydanticAI on top              |
| **PydanticAI Graph**      | Typed state machine for Otto sub-agents. Already adopted in Agent Graph plan.               | Extend with PI fields                        |

### People Analytics Research

| System                | Relevance                                                               | Integration                                    |
| --------------------- | ----------------------------------------------------------------------- | ---------------------------------------------- |
| **Predictive Index**  | 17 profiles, 4 drives, 60+ years research. Foundation of PI Engine.     | Core — airlock-persona repo                    |
| **Crystal Knows**     | DISC profiling from LinkedIn. API available.                            | Potential signal source for Otto Learns You    |
| **Humu**              | Behavioral nudges based on personality. Acquired by Google.             | Pattern inspiration for cognitive compensation |
| **Belbin Team Roles** | 9 team roles (Chair, Plant, Shaper, etc.). Mapped to 6 Otto archetypes. | Validated archetype model                      |

### Academic Grounding

| Paper                                       | Finding                                                                                                                   | Application                                                                                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Zhao & Hopkins 2024 (AHFE)                  | Users want 2-3 roles shown, not one. Dependability is persistent UX weakness. Skills gap simulator highest-rated feature. | Multi-role display in profile. LinkedIn behavioral evidence solves dependability. Coverage computation IS the skills gap simulator. |
| Spellburst (Stanford/Replit, ACM UIST 2023) | Chat → canvas UX validated. Semantic space (goals) → syntactic space (artifacts).                                         | Workspace Forge + Playbook Builder UX pattern                                                                                       |
| Parasuraman et al. (2000)                   | 10 levels of automation. Match autonomy to task type + human capability.                                                  | Confidence-gated routing thresholds                                                                                                 |
| Shneiderman (2020)                          | High automation + high control can coexist. Not a trade-off.                                                              | HCAI framework for Otto interaction modes                                                                                           |
| Bainbridge (1983)                           | Ironies of automation: removing humans from monitoring makes them worse at intervening.                                   | Justification for Gates, never full autonomy                                                                                        |

---

## Implementation Phasing

### Phase 0: Consolidation (Current — No Code)

- [ ] Finalize this master plan document
- [ ] Resolve all stale spec contradictions
- [ ] Update glossary with new terms
- [ ] Get approval on all four layers

### Phase 1: Foundation (Weeks 1-2)

- [ ] Create `airlock-persona` repo with 17 profiles, 9 team types, 3 archetypes (port from PI Explorer HTML)
- [ ] Extend OttoState with PI fields
- [ ] Extend recipe nodes with team_type + actor fields
- [ ] Build coverage computation service
- [ ] Add controller hierarchy to user model
- [ ] Implement atomic task checkout (PaperClip Concept 10)
- [ ] Add goal → task ancestry (PaperClip Concept 2)
- [ ] Implement session persistence (PaperClip Concept 9)
- [ ] Add tool-call audit tracing (PaperClip Concept 8)

### Phase 2: Otto Learns You (Weeks 3-4)

- [ ] Build multi-path intake UI (LinkedIn OAuth, resume upload, conversation)
- [ ] Implement LinkedIn signal extraction
- [ ] Implement resume parsing + signal extraction
- [ ] Implement conversation-based goal inference
- [ ] Build profile makeover features (LinkedIn headline, resume formatting)
- [ ] CRM contact sync from LinkedIn
- [ ] Wire intake output to workspace_profile schema
- [ ] Integrate with Workspace Forge (L1 feeds L2)

### Phase 3: Controller Hierarchy (Week 5)

- [ ] Add controller_role to user model
- [ ] Build org tree management UI
- [ ] Scope Playbook Builder to controller subtree
- [ ] Implement permission inheritance (top-down)
- [ ] Add cross-department playbook support

### Phase 4: Coordination Layer (Weeks 6-8)

- [ ] Build personal Otto instance manager
- [ ] Implement hive state management (airlock-coordination)
- [ ] Build coverage computation engine (LangGraph-based DAG)
- [ ] Implement Sovereign Balance calculator
- [ ] Build signal routing engine
- [ ] Add heartbeat execution (PaperClip Concept 1)
- [ ] Add budget enforcement (PaperClip Concept 5)
- [ ] Build Playbook Builder coverage visualization

### Phase 5: Integration + Polish (Weeks 9-10)

- [ ] Cross-department playbook handoffs
- [ ] Dunbar threshold behavior (signal filtering at scale)
- [ ] Enterprise provisioning (turnkey + Otto Learns You)
- [ ] Import/export playbook packs (PaperClip Concept 7)
- [ ] Behavioral adaptation (profile refinement from observed behavior)

---

## Open Questions

1. **LinkedIn API access:** Do we use the official LinkedIn API (requires partnership approval, limited data), the unofficial API via MCP server (felipfr/linkedin-mcpserver, broader data but TOS risk), or a hybrid approach?

2. **Personal Otto persistence model:** Redis (hot state, <1ms) for active sessions + PostgreSQL (cold state) for historical context? Or a single store?

3. **Coverage computation frequency:** Real-time (expensive but accurate) vs. on-change (cheaper, slight delay) vs. scheduled (cheapest, stale risk)?

4. **Sovereign Balance visualization:** Radar chart? 4-axis bar chart? Abstract "balance meter"? What does the UI look like for a non-technical Controller?

5. **Otto Learns You for guests:** External guests (e.g., counterparty on a contract) — do they go through intake? Reduced version? No profiling at all?

6. **Profile portability:** If a user is in multiple workspaces, does their PI profile carry across? Or is each workspace-specific?

---

## Document Dependencies

```
This Document (Operation OTTO Master Plan)
    │
    ├── APPROVED: Workspace Forge & PI Engine Design (L2)
    │   └── docs/plans/2026-03-09-workspace-forge-pi-engine-design.md
    │
    ├── BRAINSTORM: Roles, Personas & Playbook Presets
    │   └── docs/plans/2026-03-09-roles-personas-playbook-brainstorm.md
    │
    ├── PLAN: Otto Agent Graph
    │   └── docs/plans/2026-03-08-otto-agent-graph-design.md
    │
    ├── PLAN: Otto Agentic Layer
    │   └── docs/plans/2026-03-08-otto-agentic-layer.md
    │
    ├── APPROVED: Recipe System Design
    │   └── docs/plans/2026-03-08-recipe-system-design.md
    │
    ├── APPROVED: Liftoff Design
    │   └── docs/plans/2026-03-08-liftoff-design.md
    │
    └── REFERENCE: PaperClip Concept Adoption
        └── airlock-playbooks/paperclip-concept-adoption.md
```

---

## Source Material

- Predictive Index system: 60+ years of research, 30M+ assessments
- PI Explorer interactive research dashboard (internal, 1086 lines of structured JS data)
- Zhao & Hopkins 2024 (AHFE): Team role testing application evaluation
- Spellburst (Stanford/Replit, ACM UIST 2023): Chat → canvas UX pattern
- PaperClip (MIT, open-source): 10 adopted concepts for agent coordination
- Agency-Agents (msitarzewski): 61 agent templates across 9 divisions
- Playbook Builder V2 Prompt (828 lines, 85% reusable)
- Orchestrate OS V2/V3: Cognitive Forcing Functions, Personality-Aware UI
- Belbin Team Roles (1981), Parasuraman et al. (2000), Shneiderman (2020), Bainbridge (1983)
- LinkedIn MCP Server (felipfr): OAuth + profile/connection access via MCP
- CrewAI, LangGraph, A2A Protocol, Anthropic Agent SDK: Multi-agent coordination research
- Crystal Knows, Humu: People analytics platforms (reference only)
