# Airlock People Intelligence — Architecture Synthesis

> **Date:** 2026-03-09
> **Status:** SYNTHESIS — Consolidated from master plan + 3 iterations. Ready for founder review.
> **Name:** MAGS (Multi-Arc Governance System)
> **Agent Name:** Otto (the AI agent that runs within MAGS)
> **Foundation:** Workspace Forge & PI Engine Design (APPROVED)
> **Prior Art:** Agent You (persona architecture, 2024), Sonr (W3C DID, identity sovereignty), PaperClip (agent coordination patterns)
> **Synthesized From:**
>
> - `operation-otto-master-plan.md` (Operation OTTO, now MAGS) — 4-layer architecture, core equation, user journeys
> - `operation-otto-iteration-2.md` (Operation OTTO, now MAGS) — roster-aware DAGs, mandatory gates, complexity gating
> - `operation-otto-iteration-3.md` (Operation OTTO, now MAGS) — identity sovereignty, Agent You lineage, dogfooding plan
> - `workspace-forge-pi-engine-design.md` — PI Engine repo, inference flow, workspace configuration (APPROVED)

---

## Executive Summary

Airlock's people intelligence system answers one question: **How does Airlock understand who you are, what you need, and how to help — whether you're a solo founder or a 1000-person enterprise?**

The system learns individuals, assembles teams, builds workflows those teams can handle, fills gaps with AI that knows its limits, and enforces human accountability at every critical juncture. Workflows are DAGs — not linear pipelines — with parallel branches, convergence gates, and dependency edges.

Three principles govern everything:

1. **The Core Equation:** `Playbook Complexity - Human Coverage = AI Workload`
2. **Identity Sovereignty:** Your profile is yours. Transparent, consent-gated, portable, correctable.
3. **Mandatory Accountability:** AI never runs a complete workflow end-to-end. Humans are always in the loop.

---

## The Four Layers

| Layer  | Name                            | Scope                                           | Feeds                      |
| ------ | ------------------------------- | ----------------------------------------------- | -------------------------- |
| **L1** | Learns You                      | Individual user profiling (per-person)          | L2, L3, L4                 |
| **L2** | Workspace Forge + PI Engine     | Workspace configuration (per-workspace)         | L3, L4                     |
| **L3** | Controller Hierarchy (Org Tree) | Permission and delegation structure             | L4                         |
| **L4** | Coordination Layer (Hive)       | Multi-agent orchestration, coverage computation | Playbook Builder, Dispatch |

L1 feeds L2, L2 feeds L3, L3 governs L4. The Playbook Builder consumes all four.

---

## L1: Learns You

### What It Does

Builds a per-user intelligence profile through multi-path intake, progressive enrichment, and behavioral observation. Every user gets a profile. The profile determines how the AI agent behaves with them, what workflows it suggests, and where it fills gaps.

### Profile Schema (9 Sections)

```yaml
user_profile:
  # 1. Identity
  identity:
    id: "usr_01ARZ..."
    display_name: "Zachary"
    created: "2026-03-09"
    profile_version: 3

  # 2. Role & Scope
  role:
    org_role: "architect" # architect | controller | member | guest
    module_roles:
      contracts: "owner"
      crm: "builder"
    controller_subtree: "root"

  # 3. PI Core (always present — minimum for system function)
  pi_core:
    profile: "maverick"
    drives:
      dominance: 9
      extraversion: 8
      patience: 3
      formality: 2
    team_types: ["exploring", "adapting"]
    meta_archetype: "driver"
    confidence: 0.85
    source: "linkedin_import"
    last_assessed: "2026-03-09"

  # 4. Work Dimensions (grows from behavioral observation)
  work_dimensions:
    communication_style: "direct"
    decision_speed: "fast_intuitive"
    risk_tolerance: "high"
    collaboration_mode: "async_lead"
    learning_style: "experiential"
    peak_hours: ["09:00-12:00", "21:00-01:00"]
    preferred_input: "voice"
    confidence: 0.72

  # 5. AI Agent Configuration
  # Otto agent configuration (within MAGS system)
  mags_config:
    primary_archetype: "strategist"
    interaction_mode: "direct"
    verbosity: "summary_first"
    gate_batch_times: ["09:00", "21:00"]
    autonomy_level: "guided"

  # 6. Knowledge Context
  knowledge:
    domain_expertise: ["legal_tech", "identity_systems", "ai_agents"]
    tools_proficient: ["claude", "codex", "figma"]
    industry_context: "saas_startup"

  # 7. Interaction Patterns
  interaction_patterns:
    prefers_questions_as: "multiple_choice"
    responds_best_to: "bottom_line_first"
    avoids: "long_reports"
    tone_preference: "casual_professional"

  # 8. Connected Signals
  signals:
    linkedin: { connected: true, last_sync: "2026-03-09" }
    resume: { uploaded: false }
    calendar: { connected: false }

  # 9. Privacy & Sovereignty
  sovereignty:
    profile_portable: true
    workspace_visibility: "team_type_only"
    enrichment_consent:
      linkedin: "granted"
      behavioral: "granted"
    override_count: 0

  # Append-only changelog
  changelog:
    - {
        ts: "2026-03-09T14:00:00Z",
        action: "created",
        source: "workspace_forge",
      }
    - { ts: "2026-03-09T14:05:00Z", action: "enriched", source: "linkedin" }
```

### Three Profile Layers

| Layer | Name             | Source                                              | Required?                         | Confidence Range |
| ----- | ---------------- | --------------------------------------------------- | --------------------------------- | ---------------- |
| **1** | PI Core          | Intake (conversation, LinkedIn, resume)             | Yes — minimum for system function | 0.60-0.95        |
| **2** | Work Dimensions  | Behavioral observation over time                    | No — grows automatically          | 0.30-0.80        |
| **3** | Values Alignment | Deep interaction patterns, optional self-assessment | No — future enrichment            | 0.20-0.60        |

Layer 1 maps to Agent You's "Base Layer." Layer 2 maps to the "Dynamic Layer." Layer 3 maps to the "Feedback Loop."

### Multi-Path Intake

| Path                             | Confidence   | Speed              | What It Captures                                                       |
| -------------------------------- | ------------ | ------------------ | ---------------------------------------------------------------------- |
| **LinkedIn import** (MCP server) | 0.85-0.90    | < 30 seconds       | Job titles, tenure patterns, skills, network cluster, industry signals |
| **Resume upload**                | 0.75-0.80    | < 60 seconds       | Career trajectory, competencies, education, domain expertise           |
| **Conversation** (2-4 questions) | 0.60-0.70    | 2-3 minutes        | Goals, work style preferences, autonomy tolerance, cognitive mode      |
| **Behavioral observation**       | 0.30 → grows | Passive over weeks | Gate response time, content preferences, work hours, decision patterns |

Paths are additive. LinkedIn + conversation = ~0.85. All paths = ~0.92.

### BMY — Bare Minimum You

The minimum viable profile threshold. Enough to assign an AI archetype and suggest starter playbooks.

**BMY requires:** name + role + 2 goal-oriented answers from conversation.
**BMY produces:** PI profile (coarse), meta-archetype, default AI archetype, interaction mode, 1-2 module suggestions.
**Time to BMY:** < 2 minutes.

Everything beyond BMY is progressive enrichment.

---

## Identity Sovereignty

Informed by the founder's work at Sonr (W3C DID standards, WebAuthn/passkeys, decentralized web nodes). Not implemented as blockchain — implemented as **architectural principle and policy**.

| Rule                            | Meaning                                                                            |
| ------------------------------- | ---------------------------------------------------------------------------------- |
| **Your profile is yours**       | Stored per-user, portable across workspaces. If you leave, it goes with you.       |
| **Transparent inference**       | Every inference is visible. "The system thinks you're a Maverick because..."       |
| **Consent-gated enrichment**    | LinkedIn import, resume upload, calendar connection — all require explicit opt-in. |
| **Right to reset**              | Users can reset their profile and start fresh. Prior data is purged.               |
| **Right to correct**            | Users can override any inference. Overrides take permanent priority.               |
| **Audit trail**                 | Every profile change — inferred or manual — is logged immutably.                   |
| **Workspace-scoped visibility** | Admins see team type. Only the user sees raw drives (unless they consent).         |
| **No dark patterns**            | Profile data drives workflow optimization only. Never engagement tricks.           |

---

## L2: Workspace Forge + PI Engine

**Status: APPROVED** — see `workspace-forge-pi-engine-design.md` for full spec.

### Summary

- **Workspace Forge:** Split-screen onboarding (AI chat left, live workspace preview right). Replaces wizard checklist. Goal-based conversation, not classification. Spellburst (Stanford/Replit, ACM UIST 2023) UX pattern.
- **PI Engine:** New `airlock-persona` MCP server repo. 17 PI reference profiles, 9 team types, 3 meta-archetypes, compensation patterns, inference rules. All structured YAML, read-only for consumers.
- **Integration surfaces:** Workspace Forge, Playbook Builder, Skills System, AI Agents, Team Suggestions.
- **PI drives:** Dominance (A), Extraversion (B), Patience (C), Formality (D) — the DECF model. 60+ years of research, 30M+ assessments.
- **17 profiles:** Analyzer, Controller, Specialist, Strategist, Venturer, Altruist, Captain, Collaborator, Maverick, Persuader, Promoter, Adapter, Artisan, Guardian, Operator, Individualist, Scholar.
- **9 team types:** Exploring, Producing, Cultivating, Stabilizing, Pathfinding, Anchoring, Bolstering, Executing, Adapting.
- **3 meta-archetypes:** Driver, Enforcer, Interpreter.

---

## L3: Controller Hierarchy (Org Tree)

### Structure

```
Architect (root — workspace creator)
├── Controller A (team lead)
│   ├── Member 1
│   ├── Member 2
│   └── Member 3
├── Controller B (team lead)
│   ├── Member 4
│   └── Sub-Controller B1
│       ├── Member 5
│       └── Member 6
└── Guest (external, scoped access)
```

### Rules

1. **Architect** has full workspace scope. Creates Controllers, sets soft locks.
2. **Controllers** have subtree scope. Can assign playbooks, manage members within their branch.
3. **Members** have individual scope. Run playbooks assigned to them, contribute to DAG nodes.
4. **Guests** have limited scope. External advisors, auditors, domain experts (e.g., Jim Robinson).
5. Permissions flow top-down. A Controller can't modify a sibling Controller's subtree.
6. The Playbook Builder is scoped to the active Controller's subtree — it only sees team members in that branch.

### Scale Behavior

| Team Size          | Org Shape                                 | Controller Density         |
| ------------------ | ----------------------------------------- | -------------------------- |
| 1 (Solo)           | Flat — Architect is everything            | 0 Controllers              |
| 2-5 (Pod)          | Architect + Members                       | 0-1 Controllers            |
| 6-20 (Squad)       | Architect + 2-3 Controllers + Members     | 1 per 5-8 people           |
| 20-50 (Department) | Architect + Controllers + Sub-Controllers | 1 per 6-10 people          |
| 50+ (Enterprise)   | Multi-level hierarchy, delegation chains  | Dunbar-informed thresholds |

---

## L4: Coordination Layer (Hive)

### Atomic Unit

Each user gets a personal Otto agent instance tuned to their PI profile. The Hive is the workspace-scoped network of these instances forming a DAG — not a swarm.

```yaml
otto_instance:
  id: "otto_zachary"
  user_id: "usr_zachary"
  pi_profile: "maverick"
  active_archetype: "strategist" # shifts per module/chamber/node
  session_id: "sess_01ARZ..." # persists across interactions
  interaction_mode: "direct"
  autonomy_level: "guided"
  budget:
    tokens_used_today: 12400
    daily_cap: 500000
    monthly_cap: 10000000
```

### Coverage Computation

```
For each playbook node:
  1. Get the node's required team_type
  2. Check roster: does anyone's PI profile map to that team_type?
  3. If yes → human assigned (with profile fit score)
  4. If no → AI fills (with archetype matching the team_type)
  5. Compute: coverage = human_nodes / total_nodes
```

### Sovereign Balance

Team drive vectors should sum to zero for optimal performance:

```
Team drives = Σ(member drives) / team_size
Perfect balance = [0, 0, 0, 0]   (D, E, C, F all neutral)
Imbalanced    = [+3, +1, -2, 0]  (too much D, not enough C)
```

The AI compensates for imbalances — a team low on Patience gets an AI instance that adds methodical checkpoints.

---

## Workflows Are DAGs

### Why Not Linear Pipelines

Real business workflows have parallel branches, conditional paths, and convergence points. A DAG (Directed Acyclic Graph) captures this naturally.

### Node Schema

```yaml
node:
  id: "research_counterparty"
  name: "Research Counterparty"
  chamber: "discover"
  team_type: "exploring"
  actor: "hybrid" # mags | human | hybrid | system
  assigned_user: null # null = AI fills
  ai_archetype: "strategist"

  # DAG edges
  depends_on: ["triage_incoming"] # must complete before this starts
  blocks: ["extract_terms"] # this must complete before those start
  parallel_group: "research_phase" # can run simultaneously with others in group

  # Gate (if applicable)
  gate: null # or: verification | decision | approval | quality | convergence
  gate_required: false
```

### Gate Types

| Gate             | Human Action                         | Can AI Fill? | Example                                        |
| ---------------- | ------------------------------------ | ------------ | ---------------------------------------------- |
| **Verification** | Confirm AI output is correct         | No           | "Review extracted terms before proceeding"     |
| **Decision**     | Make a judgment call                 | No           | "Choose which counterparty terms to accept"    |
| **Approval**     | Authority sign-off                   | No           | "Legal counsel approves compliance assessment" |
| **Quality**      | Validate output meets standards      | No           | "Review summary before sending to client"      |
| **Convergence**  | All upstream branches done + confirm | No           | "All research complete, proceed to drafting?"  |

### Mandatory Gate Rules

**AI never runs a complete playbook end-to-end.** Gate density scales with risk:

| Risk Level                        | Minimum Gates            | Rule                                        |
| --------------------------------- | ------------------------ | ------------------------------------------- |
| Low (internal, read-only)         | 1 per playbook           | Final review before completion              |
| Medium (creates/modifies data)    | 1 per chamber transition | Gate at every chamber boundary              |
| High (external-facing, financial) | 1 per 3 nodes            | No more than 3 consecutive AI-only nodes    |
| Critical (legal, compliance)      | 1 per 2 nodes            | Every other node requires human involvement |

### Gate Escalation

| Time   | Action                         |
| ------ | ------------------------------ |
| 0-4h   | Normal — gate sits in Dispatch |
| 4-24h  | Reminder notification          |
| 24-48h | Escalation to Controller       |
| 48h+   | Playbook pauses                |
| 7d+    | Auto-archive suggestion        |

---

## Roster-Aware Playbook Builder

### The Principle

The Playbook Builder knows your roster — how many people, what PI profiles, what team types are covered, what AI can compensate for. This awareness constrains what it suggests.

### Roster Tiers

| Tier           | Size  | What Unlocks                                                                   |
| -------------- | ----- | ------------------------------------------------------------------------------ |
| **Solo**       | 1     | Sequential chains, simple intake flows. AI fills heavily with mandatory gates. |
| **Pod**        | 2-5   | Parallel branches (if 2+ distinct profile types). Cross-role handoffs.         |
| **Squad**      | 6-20  | Full DAG catalog. Dedicated gatekeepers. Compliance-heavy flows.               |
| **Department** | 20-50 | Nested playbooks. Sub-controller delegation. Specialized compositions.         |
| **Enterprise** | 50+   | Cross-department DAGs. Regional variations. Governance-heavy chains.           |

### Dual View (Ideal vs. Decomposed)

When a playbook exceeds roster capacity, show both versions side by side:

- **Left:** Ideal DAG (parallel, fast, needs more people)
- **Right:** Decomposed DAG (sequential, slower, your team handles it)

The decomposed version serves as a hiring signal: "Add 2 people to unlock the parallel version."

### Decomposition Rules

1. Identify critical path (longest dependent chain)
2. Collapse parallel branches into sequential steps
3. Merge roles — missing profile = AI fills with mandatory review gate
4. Chain multi-chamber workflows sequentially instead of parallel
5. Preserve all gates — human checkpoints can never be removed

### Complexity Gating

Certain capabilities require certain profile types on the roster:

| Capability                      | Required                               | Why                                               |
| ------------------------------- | -------------------------------------- | ------------------------------------------------- |
| Compliance playbooks            | Guardian or Specialist (human)         | Compliance needs human judgment wired for detail  |
| Multi-department DAGs           | 2+ Controllers with different subtrees | Cross-department needs clear ownership per branch |
| Autonomous AI chains (3+ nodes) | Human with oversight in same chamber   | Someone accountable for the AI stretch            |
| External-facing outputs         | Gatekeeper role assigned               | Anything leaving the org needs human approval     |
| Financial decision nodes        | Architect or Controller approval       | Money decisions can't be AI-only                  |

AI doesn't block when profiles are missing — it adapts with heavier gates and honest trade-off communication.

---

## Module-as-Mode

In Agent You, Modes (Fitness, Work, Dating) were context filters that changed agent behavior. In Airlock, **Modules ARE Modes** and **Chambers are Sub-Modes**.

### Module Behavior Matrix

| Module        | AI Emphasis            | Drive Weight Shift          | Communication Shift                 |
| ------------- | ---------------------- | --------------------------- | ----------------------------------- |
| **Contracts** | Guardian + Analyst     | Formality ↑, Patience ↑     | Precise, reference-heavy            |
| **CRM**       | Connector + Strategist | Extraversion ↑, Dominance ↑ | Relationship-aware, action-oriented |
| **Triage**    | Executor + Architect   | Dominance ↑, Patience ↓     | Direct, priority-focused            |
| **Calendar**  | Connector + Executor   | Patience ↑, Extraversion ↑  | Time-aware, scheduling-optimized    |
| **Documents** | Analyst + Guardian     | Formality ↑, Patience ↑     | Detailed, citation-heavy            |

### Chamber Sub-Modes

| Chamber      | Emphasis    | AI Behavior                                   |
| ------------ | ----------- | --------------------------------------------- |
| **Discover** | Exploration | Curious, expansive, research-oriented         |
| **Build**    | Production  | Action-oriented, assembly-focused             |
| **Review**   | Quality     | Critical, detail-oriented, risk-flagging      |
| **Ship**     | Delivery    | Efficient, checklist-driven, closure-oriented |

### Dynamic Persona Adjustment (3 steps, from Agent You)

How Otto's persona shifts across modules and chambers:

1. **Trait Weighting:** Active chamber weights relevant drives higher. Discover weights Dominance and Extraversion. Review weights Patience and Formality.
2. **Prompt Framing:** Full module/chamber/vault context injected into Otto's system prompt.
3. **Interaction Context:** Secondary drives still influence — Otto as a Maverick in Review doesn't become a completely different agent, it SHIFTS emphasis while maintaining personality continuity.

---

## The Ask DAG

When nobody on the roster can handle a node and AI shouldn't guess, the system creates a structured request for human expertise instead of hallucinating.

```yaml
ask:
  id: "ask_01ARZ..."
  playbook_id: "pb_coverage_engine"
  node_id: "optimize_inference"
  question: "How should we compute cosine similarity across 4D drive space?"
  context:
    team_type_needed: "producing"
    ideal_profile: "scholar"
    chamber: "build"
  routed_to:
    - name: "Jim Robinson"
      role: "external_advisor"
      profile: "scholar"
      expertise: ["inference", "distributed_systems"]
  status: "pending"
```

Ask DAGs work for internal routing (right person on the team), external routing (advisors, consultants), and AI self-awareness (when it genuinely doesn't know, it asks instead of hallucinating).

---

## AI Archetype System

6 archetypes that Otto switches between depending on the module, chamber, and node context:

| Archetype      | When Active                             | Behavior                                                   |
| -------------- | --------------------------------------- | ---------------------------------------------------------- |
| **Analyst**    | Data-heavy nodes, research tasks        | Deep analysis, pattern recognition, evidence gathering     |
| **Strategist** | Planning nodes, discovery phase         | Options generation, scenario modeling, trade-off analysis  |
| **Executor**   | Build/Ship nodes, action tasks          | Task completion, drafting, assembly, delivery              |
| **Connector**  | CRM, stakeholder alignment, handoffs    | Relationship context, communication drafting, coordination |
| **Guardian**   | Review nodes, compliance, quality gates | Risk flagging, detail checking, standard enforcement       |
| **Architect**  | System design, complex orchestration    | Pattern recognition across domains, structural suggestions |

Archetype selection follows: Node team_type → team_type.yaml → `mags_archetype` field.

---

## User Journeys

### Solo Founder (1 person)

```
Day 1:  Create workspace → Workspace Forge → BMY profile (Maverick)
        Otto suggests: 2 starter playbooks (simple, sequential, 2 gates each)
        Coverage: 100% AI-filled, every node has a mandatory gate

Day 7:  5 playbooks running, behavioral observation building Layer 2
        Otto has learned: peak hours, summary preference, fast gate responses
        Otto adapts: batches gate reviews at 9am and 9pm

Day 30: Founder invites first team member → Pod tier unlock
        Coverage recomputes. 3 new playbooks available.
        Otto honestly reports: "Your new hire fills Build nodes. Review is still a gap."
```

### Seed Stage (5 people)

```
Pod tier. 2 Controllers + 3 Members.
Coverage: Exploring ✅, Producing ✅, Stabilizing ⚠️ (AI fills), Cultivating ❌ (gap)
Playbook Builder: Shows templates the team can handle. Locks M&A playbooks.
Sovereign Balance: 62%. "Next hire: Cultivating type to balance the team."
```

### Mid-Size (50 people)

```
Department tier. Multi-level Controllers. Sub-controller delegation.
Full DAG catalog unlocked. Nested playbooks.
Compliance playbooks available (Guardian profiles on roster).
Team Health Dashboard shows drive distribution across departments.
Cross-department workflows with dedicated convergence gates.
```

---

## Dogfooding: Patient Zero

The founder (Zachary) is the first test case. His background makes him ideal:

- Maverick profile (high D, high E)
- Solo founder (tests Solo tier)
- Agent You creator (catches persona UX failures)
- Sonr/DID engineer (catches sovereignty violations)
- Building the team (tests Pod tier transition with Jim Robinson)

### Protocol

| Step                      | What Happens                                  | What We Measure                                  |
| ------------------------- | --------------------------------------------- | ------------------------------------------------ |
| **First boot**            | Workspace Forge → 2-4 questions → BMY profile | Time to BMY (target: < 2 min)                    |
| **LinkedIn enrichment**   | Optional import → confidence upgrade          | Profile accuracy (target: user agrees > 90%)     |
| **First playbook**        | AI suggests solo-tier workflow                | Time to first playbook (target: < 5 min)         |
| **First gate**            | Human checkpoint in playbook                  | Gate friction (target: helpful > 80%)            |
| **Add team member**       | Jim Robinson as advisor → Pod tier            | Coverage recomputation accuracy                  |
| **Behavioral adaptation** | 2 weeks of use → Layer 2 grows                | Override frequency (target: < 3/week, declining) |

Whatever feels natural becomes the template. Whatever feels forced gets redesigned.

---

## Prior Art Lineage

| Project              | What Transferred                                                                                                                                                                  | What We Improved                                                                                                  |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Agent You** (2024) | P.E.R.S.O.N.A 3-layer framework, micro-personas, character file, modes, dynamic persona adjustment, BMY concept                                                                   | PI empirical grounding (30M+ assessments), team-level intelligence, workflow integration, accountability gates    |
| **Sonr** (W3C DID)   | Identity sovereignty, consent-gated data, user-owned vaults, portable credentials                                                                                                 | Architecture/policy enforcement instead of blockchain. Same principles, simpler implementation.                   |
| **PaperClip** (MIT)  | Heartbeat execution, goal ancestry, skill discovery, adapter pattern, budget enforcement, governance gates, importable packs, audit tracing, session persistence, atomic checkout | Integrated into 4-layer architecture rather than standalone features. Gate system extended with density rules.    |
| **Predictive Index** | 17 profiles, 9 team types, 4 drives (DECF), team composition science                                                                                                              | Mapped to AI archetype switching, workflow node assignment, coverage computation. Made PI actionable in software. |
| **Dimensional.me**   | Archetypes, patterns, elements, dimensions — richer trait hierarchy                                                                                                               | Informs optional Layer 3 enrichment. PI remains primary, Dimensional concepts deepen it.                          |

---

## Open Questions

1. **Profile portability mechanics** — When a user leaves Workspace A and joins Workspace B, what transfers? Full profile? PI core only? Do behavioral observations reset?

2. **Behavioral override threshold** — If AI initially maps someone as Maverick from LinkedIn, but behavior looks like Scholar, at what confidence does it suggest re-assessment?

3. **Conflicting signal resolution** — LinkedIn says "CEO" (Dominance) but behavior shows patience and detail-orientation (Scholar). Which wins?

4. **Passive observation consent** — Behavioral observation is passive. Does the Sonr principle require explicit consent for this? (Probably yes.)

5. **Time-based DAG nodes** — Workflows spanning weeks/months. Do we need "wait" nodes? Calendar-triggered gates?

6. **Conditional branching** — Can playbooks fork based on a decision gate? (Litigation path vs. settlement path.) If yes, the DAG becomes more complex.

7. **Playbook versioning** — If a running playbook's template is updated, do in-flight instances migrate or stay on the old version?

8. **The name** — Decided: MAGS (Multi-Arc Governance System) is the system. Otto is the AI agent within MAGS.

---

## Implementation Phasing

### Phase 1: Foundation (Weeks 1-3)

- Create `airlock-persona` repo — port PI Explorer data into structured YAML
- Implement Workspace Forge UI (split-screen, Spellburst (Stanford/Replit, ACM UIST 2023) pattern)
- Build 2-4 question goal-based conversation for BMY profile inference
- Store profiles in user-scoped table with sovereignty controls
- Wire Playbook Builder to read team_type from airlock-persona

### Phase 2: Enrichment (Weeks 3-5)

- LinkedIn MCP server integration for profile enrichment
- Resume parser for alternative intake path
- Full 17-profile inference (not just 3 meta-archetypes)
- AI archetype switching per module/chamber
- Mandatory gate engine in coordination layer

### Phase 3: Team Intelligence (Weeks 5-7)

- Coverage computation engine
- Roster-aware playbook filtering (dual-view: ideal vs. decomposed)
- Sovereign Balance dashboard
- Controller hierarchy with subtree scoping
- Complexity gating enforcement

### Phase 4: Behavioral Adaptation (Weeks 7-9)

- Layer 2 (Work Dimensions) built from behavioral observation
- Dynamic persona adjustment (trait weighting, prompt framing, interaction context)
- Gate batching based on observed work patterns
- Profile drift detection and re-assessment prompts

### Phase 5: Coordination (Weeks 9-12)

- Hive architecture — per-user AI instances
- Session persistence across interactions
- Budget enforcement per agent/task/vault
- Ask DAG routing
- Audit trail with tool-call tracing

---

## Stale Specs to Reconcile

| Spec                                    | Issue                                                                          | Resolution                          |
| --------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------- |
| `airlock-docs/specs/roles/`             | Lists Designer role → should be Conductor                                      | Update when this design is approved |
| `airlock-docs/concepts/00-glossary.mdx` | Missing: Workspace Forge, PI Profile, Drive, Team Type, Sovereign Balance, BMY | Add vocabulary after approval       |
| `roles-personas-playbook-brainstorm.md` | Draft with overlapping concepts                                                | Superseded by this synthesis        |
| `otto-agent-graph-design.md`            | OttoState (now MAGSState) dataclass needs PI fields                            | Extend per Phase 2                  |
| `otto-agentic-layer.md`                 | Session schema needs sovereignty controls                                      | Extend per Phase 4                  |

---

## Document Status

This synthesis consolidates and supersedes:

| Document                                                   | Status                                                   |
| ---------------------------------------------------------- | -------------------------------------------------------- |
| `operation-otto-master-plan.md` (Operation OTTO, now MAGS) | Absorbed into this synthesis                             |
| `operation-otto-iteration-2.md` (Operation OTTO, now MAGS) | Absorbed into this synthesis                             |
| `operation-otto-iteration-3.md` (Operation OTTO, now MAGS) | Absorbed into this synthesis                             |
| `workspace-forge-pi-engine-design.md`                      | Still canonical for L2 detail — referenced, not replaced |
| `roles-personas-playbook-brainstorm.md`                    | Superseded                                               |

The iteration documents remain as historical record of the design process. This synthesis is the single source of truth.
