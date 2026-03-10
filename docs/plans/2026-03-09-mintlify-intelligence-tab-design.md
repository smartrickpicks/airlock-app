# Mintlify Docs Strategy — Complete Design Doc

**Date:** 2026-03-09
**Status:** Approved
**Site:** docs.doyoulikedags.xyz

---

## Strategy: Docs-as-Roadmap

The Mintlify site is not just documentation — it's the **living roadmap** of Airlock.

- Every stub page = a feature gap (what we need to build next)
- Every filled page = a shipped capability
- Gaps in the docs reveal gaps in the product
- We fill the complete shell now, then populate as we ship toward launch
- Every repo in the constellation gets documented: what it does, how it connects, what's built vs planned

The docs become the meta-scorecard for launch readiness.

## Context

The Airlock Mintlify docs currently have 2 tabs (Documentation + Platform) with 77 spec pages covering the shell, modules, and infrastructure. Zero documentation exists for:

- **Operation OTTO** — the master AI architecture
- **MAGS** — Multi-Arc Governance System (M1-M7 built)
- **People Intelligence** — DECF drives, behavioral profiling, 17 PI profiles
- **airlock-persona** — the data foundation repo
- **Multi-repo MCP constellation** — 8 interconnected repos

This is the "big ticket" — the competitive differentiator. The Intelligence tab makes it a first-class citizen.

## Decision Record

| Decision                   | Choice                                                                             | Rationale                                              |
| -------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Tab structure              | 3 tabs (Documentation, Platform, Intelligence)                                     | OTTO deserves equal weight to product + platform       |
| Content visibility         | Full transparency                                                                  | Competitive moat story; investors/buyers see the depth |
| MCP architecture placement | Inside Intelligence tab                                                            | The repos ARE the intelligence infrastructure          |
| Content source             | NotebookLM slides + transcript + airlock-persona repo + MAGS code + ingestion docs | All raw material exists, needs spec-formatting         |

## Narrative Arc

The Intelligence tab tells a story, not just a feature list:

```
1. WHY    → The Core Equation (the problem Airlock solves)
2. WHO    → People Intelligence (how it understands humans)
3. HOW    → Sovereign Balance (how it fills gaps mathematically)
4. WHAT   → The Hive & Archetypes (what the AI actually does)
5. GUARD  → Mandatory Gates (what prevents runaway AI)
6. BUILD  → MCP Constellation (how the system is built)
7. STATUS → MAGS Milestones (where we are today)
```

## Intelligence Tab Navigation

```json
{
  "tab": "Intelligence",
  "groups": [
    {
      "group": "Operation OTTO",
      "pages": [
        "intelligence/otto/overview",
        "intelligence/otto/core-equation",
        "intelligence/otto/four-layers",
        "intelligence/otto/design-principles"
      ]
    },
    {
      "group": "People Intelligence",
      "pages": [
        "intelligence/people/overview",
        "intelligence/people/spellburst",
        "intelligence/people/profiles",
        "intelligence/people/team-types",
        "intelligence/people/identity-sovereignty"
      ]
    },
    {
      "group": "Sovereign Balance",
      "pages": [
        "intelligence/balance/overview",
        "intelligence/balance/roster-aware",
        "intelligence/balance/coverage-math"
      ]
    },
    {
      "group": "Otto Archetypes",
      "pages": [
        "intelligence/archetypes/overview",
        "intelligence/archetypes/trait-weighting",
        "intelligence/archetypes/prompt-composition"
      ]
    },
    {
      "group": "Accountability Architecture",
      "pages": [
        "intelligence/accountability/mandatory-gates",
        "intelligence/accountability/ask-dag",
        "intelligence/accountability/the-hive"
      ]
    },
    {
      "group": "System Architecture",
      "pages": [
        "intelligence/system/constellation",
        "intelligence/system/airlock-persona",
        "intelligence/system/coordination",
        "intelligence/system/pack-format"
      ]
    },
    {
      "group": "MAGS Roadmap",
      "pages": [
        "intelligence/mags/overview",
        "intelligence/mags/phase-2-vision"
      ]
    }
  ]
}
```

**Total: 21 new pages across 7 groups.**

## Page Specs

### Group 1: Operation OTTO

#### `intelligence/otto/overview` — Scaling Human Intent

The flagship page. Sets the entire premise.

- Hero: "Operation OTTO scales human intent flawlessly from 1 to 1,000."
- The Airlock People Intelligence System — understanding who you are, what you need, and exactly how to help
- Visual: Human Intent Source (circle) + AI Intelligence Core (triangle) scaling diagram
- Key stat: Backed by 60+ years of Predictive Index research, 30M+ behavioral assessments
- Link to NotebookLM Deep Dive audio/transcript

#### `intelligence/otto/core-equation` — The Core Equation

- `Playbook Complexity − Human Coverage = AI Workload`
- Visual: Matrix equation from NotebookLM slides
- Explanation: The gap between what the playbook needs and what humans provide is exactly what Otto fills
- No more, no less — Otto never exceeds its calculated workload
- Connects to: Sovereign Balance (the math), Mandatory Gates (the guardrails)

#### `intelligence/otto/four-layers` — Intelligence Architecture

- L1: Learns You (Individual) — Multi-path individual profiling
- L2: Workspace Forge (Environment) — The predictive engine configuring the workspace
- L3: Controller Hierarchy (Org Tree) — Permission and delegation structure
- L4: The Hive (Coordination) — Multi-agent orchestration and coverage computation
- Visual: 4-layer stacked glass diagram from NotebookLM slides
- Each layer links to its deep-dive pages

#### `intelligence/otto/design-principles` — Three Rigid Principles

- The Core Equation — Otto fills exactly the gap
- Identity Sovereignty — Your profile belongs to you
- Mandatory Accountability — AI never runs end-to-end; humans are the mandatory gates
- Visual: Three-panel diagram from NotebookLM slides
- These principles are non-negotiable and hard-coded into the architecture

### Group 2: People Intelligence

#### `intelligence/people/overview` — DECF Drives Framework

- The 4 Drives: Dominance, Extraversion, Patience, Formality
- Grounded in 60 years of empirical team dynamics
- 30M+ behavioral assessments as foundation
- 3 Meta-Archetypes: Driver, Enforcer, Interpreter
- Maps instantly to 9 distinct Team Types
- Visual: DECF quadrant diagram from NotebookLM slides

#### `intelligence/people/spellburst` — SpellBurst Onboarding

- Split-screen UX: chat left, live workspace preview right
- Goal-first inference: "What are you here to accomplish?"
- Infers drives from conversational language, never forced personality classification
- Instantly configures playbook templates, Otto defaults, preloaded skills
- Visual: SpellBurst split-screen mockup from NotebookLM slides

#### `intelligence/people/profiles` — 17 PI Profiles Reference

- Full catalog from airlock-persona repo
- Each profile: name, DECF vector, description, workplace tendencies
- Profiles: Analyzer, Controller, Specialist, Strategist, Scholar, Captain, Maverick, Persuader, Promoter, Collaborator, Altruist, Guardian, Operator, Adapter, Artisan, Venturer, Individualist
- Searchable/filterable table

#### `intelligence/people/team-types` — Team Types & Meta-Archetypes

- 9 Team Types: Exploring, Producing, Cultivating, Stabilizing, Pathfinding, Anchoring, Bolstering, Executing, Adapting
- 3 Meta-Archetypes: Driver, Enforcer, Interpreter
- How team composition maps to workflow requirements
- Source: airlock-persona/team-types/ and archetypes/

#### `intelligence/people/identity-sovereignty` — Identity Sovereignty

- Transparent Inference: Full trace of signal sources
- Right to Correct: User overrides take permanent priority over system inference
- No Dark Patterns: Profile data exclusively for workflow optimization, never manipulation
- Portability: Profiles stored per-user, travel across workspaces
- W3C decentralized identifier heritage (from Sonar project)
- Visual: Privacy/Sovereignty Scorecard from NotebookLM slides

### Group 3: Sovereign Balance

#### `intelligence/balance/overview` — Team Drives Sum to Zero

- A healthy team's behavioral drive vectors must mathematically sum to zero
- Too much Dominance without Patience creates speed but guarantees chaos
- Otto detects roster imbalances and autonomously assigns compensating archetypes
- Visual: Spider/radar chart showing Human Team (skewed) + Otto Injection (compensating)

#### `intelligence/balance/roster-aware` — Roster-Aware Playbooks

- Playbook Builder calculates roster coverage before suggesting templates
- Dual View: Ideal DAG (requires 10 people) vs Decomposed DAG (fits 3-person roster)
- Decomposition Rules: Collapse parallel branches, merge roles, insert mandatory review gates
- The gap = a mathematically proven hiring signal
- Visual: Side-by-side DAG comparison from NotebookLM slides

#### `intelligence/balance/coverage-math` — Coverage Computation

- 17 PI profiles mapped across DECF space
- 9 team types with characteristic drive distributions
- Coverage engine: overlay human roster on playbook requirements → identify gaps
- AI workload = uncovered nodes → assign Otto archetypes to fill

### Group 4: Otto Archetypes

#### `intelligence/archetypes/overview` — 6 Dynamic Archetypes

- Analyst — data extraction, thorough, cites sources
- Guardian — compliance, conservative, skeptical, risk-aware
- Strategist — big picture, forward-looking, prioritizes key insights
- Executor — action-oriented, task completion, assembly
- Connector — relationship mapping, communication bridging
- Architect — system design, structural planning
- Visual: 6-card archetype grid from NotebookLM slides

#### `intelligence/archetypes/trait-weighting` — Chamber-Aware Behavior

- Discover Chamber: Strategist weights curiosity and exploration
- Build Chamber: Executor weights action and assembly
- Review Chamber: Guardian weights rigor, formality, risk-flagging
- Ship Chamber: Executor weights completion and delivery
- Not a hard switch — a recalibration via 3-step process
- Interaction Context: Otto remembers your profile and adapts delivery style

#### `intelligence/archetypes/prompt-composition` — Prompt Architecture

- Base system prompt + archetype fragment + chamber fragment + module fragment
- 15 markdown prompt files composing dynamically
- Persona-aware: tone/verbosity/detail level per user profile
- Module-aware: contract-specific vs CRM-specific guidance
- Chamber-aware: exploration vs execution focus
- Source: apps/api/src/services/mags/prompts/

### Group 5: Accountability Architecture

#### `intelligence/accountability/mandatory-gates` — Mandatory Human Gates

- 5 Gate Types:
  1. Verification — confirm AI output is factually correct
  2. Decision — human judgment picks from AI-surfaced options
  3. Approval — authority sign-off (funds, legal)
  4. Quality — subjective standards (brand voice, creative)
  5. Convergence — sync point for parallel branches
- Risk Matrix:
  - Low Risk: 1 final review gate per playbook
  - Medium Risk: 1 gate per chamber transition
  - Critical Risk (Legal/Financial): Human intervention every 2 nodes
- The Golden Rule: AI cannot run a complete playbook end-to-end
- Unattended gates trigger structured escalation (48hr pause)
- Visual: Gate density diagram + risk matrix from NotebookLM slides
- References Lisanne Bainbridge 1983 ironies of automation paper

#### `intelligence/accountability/ask-dag` — Knowledge Gap Routing

- When Otto genuinely doesn't know something, it refuses to guess
- System generates structured Ask request
- Routing: internal team members, external advisors, domain experts
- Replaces hallucination tendency with transparent help requests
- Visual: Ask DAG flow diagram from NotebookLM slides

#### `intelligence/accountability/the-hive` — Structured Agent Cooperation

- Not a Swarm: identical agents competing without memory or structure
- The Hive: differentiated agents cooperating strictly along defined graph edges
- Each user's Personal Otto acts as router, filter, and translator
- Communication flows precisely along DAG edges, not chaotic broadcasting
- Visual: Swarm vs Hive comparison from NotebookLM slides

### Group 6: System Architecture

#### `intelligence/system/constellation` — 8-Repo MCP Architecture

- Full constellation diagram showing all 8 repos
- Connection matrix: who reads from whom, who writes where
- MCP modes: Read-only servers, Read-write server (coordination only), Consumer (app)
- Separation of concerns: docs != code != config != coordination
- Single source of truth: airlock-docs
- Shared write surface: airlock-coordination (ephemeral state only)

| Repo                   | MCP Mode   | Purpose                            |
| ---------------------- | ---------- | ---------------------------------- |
| airlock-app            | Consumer   | The product (Next.js + FastAPI)    |
| airlock-docs           | Read-only  | Specs, vocabulary, architecture    |
| airlock-skills-library | Read-only  | Components, skills, templates      |
| airlock-playbooks      | Read-only  | Operational workflows              |
| airlock-config         | Read-only  | MCP registry, pack schema          |
| airlock-coordination   | Read-write | Agent session state (shared write) |
| airlock-gen-ui         | Read-write | Generative UI pipeline             |
| airlock-persona        | Read-only  | PI profiles, team types, inference |

#### `intelligence/system/airlock-persona` — People Intelligence Data Foundation

- 17 PI profiles (YAML) with DECF vectors
- 9 team types with behavioral patterns
- 3 meta-archetypes
- Inference rules: drive-signals, profile-matching, confidence-rules
- Dynamics: sovereign-balance math, cross-archetype interactions, flywheels
- AI impact data: risk-matrix, autonomy-levels
- Consumers: Workspace Forge, Playbook Builder, MAGS agents, Skills system, Coverage engine

#### `intelligence/system/coordination` — Multi-Agent Coordination

- Shared write surface for agent sessions
- state.json, locks.json, history.json, queue.json
- Protocol: Register → Lock → Work → Log → Unlock
- No PII/business data — only ephemeral coordination state
- Enables multi-agent development workflow

#### `intelligence/system/pack-format` — Skills, Playbooks & Components

- Pack format schema (JSON) from airlock-config
- How skills, playbooks, documents, and components connect
- Content resolution: how the app finds and loads packs
- Template structure for agent sessions

### Group 7: MAGS Roadmap

#### `intelligence/mags/overview` — Phase 1 Milestone Tracker

| #   | Milestone                       | Status  |
| --- | ------------------------------- | ------- |
| M1  | airlock-persona Data Foundation | Done    |
| M2  | Inference Engine (API)          | Done    |
| M3  | Profile Storage (DB)            | Done    |
| M4  | Workspace Forge UI              | Done    |
| M5  | Otto Agent Prompting            | Done    |
| M6  | Playbook Templates + Storage    | Done    |
| M7  | DAG Execution Engine            | Done    |
| M8  | Gate UI                         | Next    |
| M9  | Playbook Visualization          | Planned |
| M10 | Integration + Dogfood           | Planned |

- Phase 1 architecture overview
- What each milestone delivered
- Current capabilities vs planned capabilities

#### `intelligence/mags/phase-2-vision` — What's Next

- Phase 2+ roadmap (high level)
- Advanced coverage engine
- Multi-workspace sovereign balance
- External expert marketplace (Ask DAG at scale)
- Dunbar scaling for communication patterns

## System Architecture — Every Repo Documented

The constellation section documents every single repo in the Airlock ecosystem.
Each repo page answers: What does it do? What does it contain? Who reads/writes it? What's built vs planned?

### Expanded System Architecture Group

```json
{
  "group": "System Architecture",
  "pages": [
    "intelligence/system/constellation",
    "intelligence/system/airlock-app",
    "intelligence/system/airlock-docs",
    "intelligence/system/airlock-persona",
    "intelligence/system/airlock-skills-library",
    "intelligence/system/airlock-playbooks",
    "intelligence/system/airlock-config",
    "intelligence/system/airlock-coordination",
    "intelligence/system/airlock-gen-ui",
    "intelligence/system/airlock-ingestion",
    "intelligence/system/pack-format"
  ]
}
```

### Per-Repo Page Specs

#### `intelligence/system/constellation` — The 8-Repo MCP Architecture

- Full constellation diagram (visual centerpiece)
- Connection matrix: who reads from whom, who writes where
- MCP modes: Read-only, Read-write, Consumer
- Design philosophy: separation of concerns, single source of truth
- Why not a monorepo: agent isolation, security boundaries, independent versioning

#### `intelligence/system/airlock-app` — The Product

- Next.js 14 (App Router) + FastAPI + PostgreSQL 16 + Redis 7
- Consumer of all MCP servers
- apps/web/ — Frontend (TypeScript, Zustand, Tailwind)
- apps/api/ — Backend (Python, SQLAlchemy, Alembic)
- packages/shared-types/ — OpenAPI codegen
- Build status: what's shipped, what's stubbed, what's planned

#### `intelligence/system/airlock-docs` — Design Specifications

- Single source of truth for all specs
- 59+ markdown spec files, 18 interactive HTML demos
- concepts/00-glossary.mdx — canonical vocabulary
- registry/ — component and schema registries
- This is the repo that POWERS the Mintlify site itself
- Meta: the docs document the docs

#### `intelligence/system/airlock-persona` — People Intelligence Data

- 17 PI profiles (YAML) with DECF vectors on 1-10 scale
- 9 team types with behavioral patterns
- 3 meta-archetypes: Driver, Enforcer, Interpreter
- inference/ — drive-signals, profile-matching, confidence-rules
- dynamics/ — sovereign-balance math, cross-archetype, flywheels
- ai-impact/ — risk-matrix, autonomy-levels
- Consumers: Workspace Forge, Playbook Builder, MAGS agents, Skills system, Coverage engine

#### `intelligence/system/airlock-skills-library` — Components & Skills

- skills/ — Agent skill definitions (SKILL.md format)
- components/ — Official UI component library (atomic design)
- templates/ — Page layouts and UI templates
- moodboard/ — Design references
- toolkits/ — CSS, JS, React utilities
- intake/ — Submission pipeline for new content

#### `intelligence/system/airlock-playbooks` — Operational Workflows

- Playbook YAML templates with DAG nodes and gates
- prospecting/ — Otto Prospect Research playbook
- onboarding/ — New Workspace Setup playbook
- contracts/ — Vault Lifecycle playbook
- agent-tasks/ — Agent task templates
- pack.json — Structured index of all playbooks
- Template structure: Trigger → Modules → Roles → Steps → Otto Integration → Outputs

#### `intelligence/system/airlock-config` — MCP Registry & Settings

- registry.json — Complete MCP server registry (all repos, URLs, permissions)
- pack-schema.json — JSON schema for Pack format
- defaults/content-sources.json — MVP content resolution
- templates/ — Work tree templates for agent sessions
- The "phone book" of the entire constellation

#### `intelligence/system/airlock-coordination` — Multi-Agent State

- The ONLY shared-write surface in the constellation
- state.json — Active agent sessions
- locks.json — File locks held by agents
- history.json — Completed work log (audit trail)
- queue.json — Task queue for pending work
- Protocol: Register → Lock → Work → Log → Unlock
- Security: ONLY ephemeral state, never PII/business data/credentials

#### `intelligence/system/airlock-gen-ui` — Generative UI Pipeline

- prompts/ — Prompt templates for component/layout/interaction generation
- configs/ — Style mappings and generative component configs
- generated/ — Staging area for AI-generated output
- Reads from: airlock-skills-library, airlock-docs
- Writes to: generated/ folder for review before integration
- Enables AI-powered UI component creation

#### `intelligence/system/airlock-ingestion` — Research & Data Pipeline

- documents/ — Source documents for spec drafting
- research/ — External research, competitor analysis
- imports/ — Files being imported into the platform
- Read-only MCP server for all agents
- Contains 9+ planning documents (Operation OTTO iterations, MAGS plans, etc.)

#### `intelligence/system/pack-format` — Skills, Playbooks & Components

- Pack format schema (JSON) from airlock-config
- How skills, playbooks, documents, and components connect
- Content resolution: how the app finds and loads packs
- Template structure for agent sessions
- The universal packaging format for Airlock content

## Updated Page Count

| Tab           | Groups | Pages  |
| ------------- | ------ | ------ |
| Documentation | 7      | 36     |
| Platform      | 6      | 30     |
| Intelligence  | 7      | 28     |
| **Total**     | **20** | **94** |

With the expanded System Architecture (8 individual repo pages + constellation + pack-format + ingestion),
the Intelligence tab grows to 28 pages, bringing the total site to ~94 pages.

---

## Content Sources Mapping

Each new page maps to existing raw material:

| Page                 | Primary Source                                        |
| -------------------- | ----------------------------------------------------- |
| OTTO overview        | NotebookLM slides + transcript                        |
| Core equation        | ingestion/operation-otto-master-plan.md               |
| Four layers          | NotebookLM 4-layer slide + ingestion docs             |
| Design principles    | NotebookLM 3-principles slide                         |
| DECF overview        | airlock-persona/README.md + NotebookLM slides         |
| SpellBurst           | ingestion/workspace-forge-pi-engine-design.md         |
| Profiles             | airlock-persona/profiles/\*.yaml                      |
| Team types           | airlock-persona/team-types/_.yaml + archetypes/_.yaml |
| Identity sovereignty | NotebookLM privacy slide + Sonar heritage             |
| Sovereign balance    | airlock-persona/dynamics/sovereign-balance.yaml       |
| Roster-aware         | NotebookLM dual-DAG slide + ingestion docs            |
| Coverage math        | ingestion/people-intelligence-synthesis.md            |
| Archetypes           | apps/api/src/services/mags/prompts/archetypes/        |
| Trait weighting      | NotebookLM archetype-chamber slide                    |
| Prompt composition   | apps/api/src/services/mags/prompt_composer.py         |
| Mandatory gates      | NotebookLM gates slide + ingestion docs               |
| Ask DAG              | NotebookLM Ask DAG slide + transcript                 |
| The Hive             | NotebookLM Hive vs Swarm slide                        |
| Constellation        | airlock-config/registry.json + CLAUDE.md MCP table    |
| airlock-persona      | airlock-persona/README.md                             |
| Coordination         | airlock-coordination/CLAUDE.md                        |
| Pack format          | airlock-config/pack-schema.json                       |
| MAGS overview        | docs/plans/mags-phase1-plan.md                        |
| Phase 2 vision       | ingestion/operation-otto-iteration-3.md               |

## Visual Assets

The NotebookLM slides are publication-quality. These should be used as hero images:

1. "Operation OTTO scales human intent" — constellation diagram
2. "Three rigid principles" — Core Equation + Identity Sovereignty + Mandatory Accountability
3. "Intelligence compounds across four architectural layers" — 4-layer glass stack
4. "Intake is a value exchange" — BMY threshold flow
5. "Your data vault enforces absolute identity sovereignty" — Privacy Scorecard
6. "Goal-first inference dynamically forges the workspace" — SpellBurst split-screen
7. "Intelligence is grounded in sixty years" — DECF quadrant with 3 meta-archetypes
8. "Workflows are multi-branching graphs" — Linear X'd out vs DAG
9. "The controller hierarchy scales authority" — Org tree (Architect → Controllers → Members)
10. "The Hive coordinates differentiated agents" — Swarm vs Hive comparison
11. "Sovereign Balance actively compensates" — Spider chart (Human skew + Otto injection)
12. "Roster-aware playbooks adapt" — Ideal DAG vs Decomposed DAG
13. "Mandatory human gates enforce" — Gate types + risk matrix
14. "Dynamic archetypes shift AI behavior" — 6 archetype cards + chamber flow
15. "Flipping hallucination into structured requests" — Ask DAG flow

## File Structure

All new pages go under `intelligence/` directory in airlock-docs:

```
airlock-docs/
├── intelligence/
│   ├── otto/
│   │   ├── overview.mdx
│   │   ├── core-equation.mdx
│   │   ├── four-layers.mdx
│   │   └── design-principles.mdx
│   ├── people/
│   │   ├── overview.mdx
│   │   ├── spellburst.mdx
│   │   ├── profiles.mdx
│   │   ├── team-types.mdx
│   │   └── identity-sovereignty.mdx
│   ├── balance/
│   │   ├── overview.mdx
│   │   ├── roster-aware.mdx
│   │   └── coverage-math.mdx
│   ├── archetypes/
│   │   ├── overview.mdx
│   │   ├── trait-weighting.mdx
│   │   └── prompt-composition.mdx
│   ├── accountability/
│   │   ├── mandatory-gates.mdx
│   │   ├── ask-dag.mdx
│   │   └── the-hive.mdx
│   ├── system/
│   │   ├── constellation.mdx
│   │   ├── airlock-persona.mdx
│   │   ├── coordination.mdx
│   │   └── pack-format.mdx
│   └── mags/
│       ├── overview.mdx
│       └── phase-2-vision.mdx
└── images/
    └── intelligence/
        ├── otto-scales-human-intent.png
        ├── three-rigid-principles.png
        ├── four-architectural-layers.png
        ├── bmy-value-exchange.png
        ├── identity-sovereignty.png
        ├── spellburst-forge.png
        ├── decf-quadrant.png
        ├── dag-not-pipeline.png
        ├── controller-hierarchy.png
        ├── hive-vs-swarm.png
        ├── sovereign-balance-radar.png
        ├── roster-aware-dags.png
        ├── mandatory-gates-risk.png
        ├── dynamic-archetypes.png
        └── ask-dag-routing.png
```

## Implementation Priority

### Phase A (Immediate — tells the OTTO story)

1. `intelligence/otto/overview` — the flagship page
2. `intelligence/otto/core-equation` — the math
3. `intelligence/otto/four-layers` — the architecture
4. `intelligence/otto/design-principles` — the principles
5. `intelligence/people/overview` — DECF introduction
6. `intelligence/accountability/mandatory-gates` — the trust story

### Phase B (Next — depth on people + balance)

7. `intelligence/people/spellburst`
8. `intelligence/people/profiles`
9. `intelligence/people/team-types`
10. `intelligence/people/identity-sovereignty`
11. `intelligence/balance/overview`
12. `intelligence/balance/roster-aware`

### Phase C (Complete — archetypes + system + roadmap)

13-21. Remaining pages (archetypes, hive, ask-dag, constellation, MAGS roadmap)

## docs.json Update

Add to the existing navigation.tabs array:

```json
{
  "tab": "Intelligence",
  "groups": [
    {
      "group": "Operation OTTO",
      "pages": [
        "intelligence/otto/overview",
        "intelligence/otto/core-equation",
        "intelligence/otto/four-layers",
        "intelligence/otto/design-principles"
      ]
    },
    {
      "group": "People Intelligence",
      "pages": [
        "intelligence/people/overview",
        "intelligence/people/spellburst",
        "intelligence/people/profiles",
        "intelligence/people/team-types",
        "intelligence/people/identity-sovereignty"
      ]
    },
    {
      "group": "Sovereign Balance",
      "pages": [
        "intelligence/balance/overview",
        "intelligence/balance/roster-aware",
        "intelligence/balance/coverage-math"
      ]
    },
    {
      "group": "Otto Archetypes",
      "pages": [
        "intelligence/archetypes/overview",
        "intelligence/archetypes/trait-weighting",
        "intelligence/archetypes/prompt-composition"
      ]
    },
    {
      "group": "Accountability Architecture",
      "pages": [
        "intelligence/accountability/mandatory-gates",
        "intelligence/accountability/ask-dag",
        "intelligence/accountability/the-hive"
      ]
    },
    {
      "group": "System Architecture",
      "pages": [
        "intelligence/system/constellation",
        "intelligence/system/airlock-persona",
        "intelligence/system/coordination",
        "intelligence/system/pack-format"
      ]
    },
    {
      "group": "MAGS Roadmap",
      "pages": [
        "intelligence/mags/overview",
        "intelligence/mags/phase-2-vision"
      ]
    }
  ]
}
```

## Cross-Linking Strategy

The Intelligence tab doesn't exist in isolation. Key cross-links:

| Intelligence Page  | Links TO (existing)                             |
| ------------------ | ----------------------------------------------- |
| Four Layers → L1   | specs/onboarding/overview (turnkey flow)        |
| Four Layers → L3   | specs/roles/overview (permissions)              |
| Four Layers → L4   | specs/ai-agent/overview (existing Otto docs)    |
| Mandatory Gates    | specs/shell/universal-chambers (Chamber gates)  |
| Otto Archetypes    | specs/ai-agent/ai-runtime (tool framework)      |
| Prompt Composition | specs/ai-agent/enrichment-sources (9 sources)   |
| Ask DAG            | specs/workflow-engine/overview (node catalog)   |
| Constellation      | specs/platform/overview (tech stack)            |
| MAGS Roadmap       | specs/workflow-engine/end-to-end-lifecycle-demo |

And from existing pages, add links INTO Intelligence:

| Existing Page                  | Links TO (Intelligence)                  |
| ------------------------------ | ---------------------------------------- |
| specs/ai-agent/overview        | intelligence/otto/overview               |
| specs/workflow-engine/overview | intelligence/accountability/ask-dag      |
| specs/roles/overview           | intelligence/otto/four-layers (L3)       |
| specs/onboarding/overview      | intelligence/people/spellburst           |
| specs/security/overview        | intelligence/people/identity-sovereignty |
| introduction.mdx               | intelligence/otto/overview (hero link)   |
