# Design: Workspace Forge & PI Engine

> **Date:** 2026-03-09
> **Status:** APPROVED
> **Scope:** Onboarding redesign (Workspace Forge), PI-based workspace configuration, new `airlock-persona` repo, and integration with Playbook Builder / Skills / Otto agents

---

## Problem Statement

The current onboarding flow (wizard checklist + manual capability tree clicking) is too click-heavy and doesn't capture who the user actually is. Users don't self-categorize well ("Are you a Controller or Maverick?"), and the workspace they get isn't tailored to their cognitive style, work patterns, or goals.

Meanwhile, the Playbook Builder generates workflow nodes without understanding what _kind_ of person or agent should work each node. Skills are assigned generically. Otto's archetype is static rather than contextually matched.

**The missing piece:** A unified intelligence layer that understands people — their cognitive drives, work style, team dynamics — and uses that understanding to configure workspaces, generate workflows, assign skills, and calibrate AI behavior.

---

## Solution Overview

### 1. Workspace Forge (Onboarding Replacement)

Replace the current wizard + capability tree with a split-screen onboarding experience:

- **Left panel:** Otto chat conversation (goal-based, not classification-based)
- **Right panel:** Live preview of the workspace being configured

Otto reads signals from prior actions (workspace name, industry, first document upload, email domain) and asks 2-4 targeted questions to fill gaps. As the user answers, the right-side preview updates in real time — modules toggle, skills appear, layout adjusts.

When it looks right, the user hits "Launch" and their workspace is ready.

### 2. PI Engine (`airlock-persona` Repo)

A new MCP server repo containing all Predictive Index reference data as structured YAML. This is Airlock's "people intelligence" layer — queryable at runtime by all consumers.

### 3. Integration Surfaces

The PI Engine feeds into 5 surfaces:

1. **Workspace Forge** — Profile inference → workspace configuration
2. **Playbook Builder** — Team type tagging per workflow node
3. **Skills System** — Cognitive mode affinity matching
4. **Otto Agents** — Archetype selection per node
5. **Team Suggestions** (future) — PI-based team composition recommendations

---

## Design Decisions

| Decision                | Choice                                        | Rationale                                                                                                  |
| ----------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Onboarding timing**   | Onboarding-first (not continuous adaptation)  | Build the world once; manual adjustment later. Phase 2 adds behavioral adaptation.                         |
| **Configuration scope** | Full environment                              | Persona, skills, layout, archetype, interaction mode, notifications, playbook templates — everything.      |
| **Input mechanism**     | Conversation + signals                        | Otto reads what you've already done and fills gaps via chat. Not a form, not pure open-ended — hybrid.     |
| **Profile ownership**   | Per-user with soft locks                      | Each user gets their own profile. Designer/admin can enforce certain settings per workspace.               |
| **Approach**            | Split-screen (Spellburst pattern)             | Otto chat on left, live workspace preview on right. Conversational + visual confirmation.                  |
| **Persona model**       | Goal-first, PI-inferred (not class selection) | Users never pick a persona. Otto infers DECF drives from goals, maps to closest PI reference profile.      |
| **Reference data**      | 17 PI profiles + 9 team types                 | Adopted from Predictive Index system (60+ years of research, 30M+ assessments).                            |
| **Repo structure**      | New `airlock-persona` repo                    | Persona data is reference intelligence — not operational state (coordination) or platform config (config). |

---

## Workspace Forge: Detailed Design

### Flow Replacement

**Current:**

```
Create Workspace → Upload First Doc → Checklist Wizard → Capability Tree (manual) → Dispatch
```

**New:**

```
Create Workspace → Upload First Doc → Workspace Forge (Otto + Preview) → Launch → Dispatch
```

**What stays:** Workspace creation, first document upload, Dispatch as landing.
**What goes:** Step-by-step checklist, manual capability tree clicking, clean/demo toggle.
**Trigger:** Workspace Forge launches after first document upload completes. If upload is skipped, launches anyway with fewer signals.

### Otto's Conversation Script

#### Phase 1: Signal Reading (Automatic)

| Signal Source           | What Otto Learns                           |
| ----------------------- | ------------------------------------------ |
| Workspace name          | Industry hints ("Acme Records" → music)    |
| Industry selected       | Vertical, Pack template suggestions        |
| First document uploaded | Document type, complexity, module affinity |
| Email domain            | Company size hints, enterprise vs. startup |

#### Phase 2: Goal Questions (2 questions)

**Q1: "What are you here to accomplish?"**

- Open-ended with smart chips for common goals
- Otto extracts: module affinity, chamber focus, functional role
- Maps to Dominance (A) and Patience (C) drives

**Q2: "How much should Otto handle on his own?"**

- Tappable cards: "Run things for me" / "Draft it, I'll review" / "Help me while I drive" / "Just a second opinion"
- Maps to interaction mode preference and Formality (D) drive
- Extraversion (B) inferred from language style in Q1

#### Phase 3: Preference Questions (1-2, conditional)

**Q3 (if cognitive style ambiguous): "When you get a new report, what do you do first?"**

- Scan summary → act (Driver) / Read every detail (Enforcer) / Ask someone (Interpreter)

**Q4 (if first user in workspace): "How big is your team?"**

- Solo / 2-5 / 5-20 / 20+ → feeds scale matrix

### Profile Inference

From the conversation, Otto maps to the 4 PI behavioral drives:

| Drive                | Signal Source                         | High Expression                   | Low Expression                |
| -------------------- | ------------------------------------- | --------------------------------- | ----------------------------- |
| **Dominance (A)**    | Goal framing, ambition level          | Assertive, competitive, big goals | Cooperative, supportive       |
| **Extraversion (B)** | Language style, people vs task focus  | People-centric, team-oriented     | Task-centric, analytical      |
| **Patience (C)**     | Work pace preference                  | Methodical, steady, detailed      | Fast, urgent, variety-seeking |
| **Formality (D)**    | Automation preference, structure need | Wants rules, evidence, structure  | Wants freedom, flexibility    |

The DECF vector maps to the closest of 17 PI reference profiles. Each profile has pre-defined workspace configuration values.

### Workspace Configuration Output

When Otto determines the profile, the following gets configured:

```yaml
workspace_profile:
  user_id: "01ARZ3..."
  inferred_profile: "captain" # Closest PI reference profile
  meta_archetype: "driver" # Driver / Enforcer / Interpreter

  drives:
    dominance: high
    extraversion: high
    patience: low
    formality: low

  workspace_config:
    cognitive_mode: "visual" # From profile lookup
    information_density: "low" # Summary-first dashboards
    interface_structure: "exploratory" # User directs their own path
    update_pace: "alerts" # Real-time notifications
    explanation_style: "summary-first" # Conclusions before evidence

  otto_defaults:
    default_archetype: "executor"
    interaction_mode: "draft_then_review"
    autonomy_ceiling: 0.75 # 75% for Driver types
    confidence_thresholds:
      auto_execute: 0.95
      execute_notify: 0.80
      propose_wait: 0.60
      escalate: 0.0

  modules_active:
    - contracts
    - crm

  skills_preloaded:
    - lead-scoring-engine
    - deal-velocity-calculator
    - territory-mapper

  playbook_templates:
    - contract-intake
    - deal-prospecting

  compensation_patterns:
    - "embedded-process-defaults" # Rigor without blocking speed
    - "communication-tone-checker"
    - "decision-quality-scorecard"

  anti_patterns:
    - "sequential-procedural-gates"
    - "consensus-required-approvals"
    - "deliberate-step-by-step-workflows"

  soft_locks: [] # Designer/admin can add enforced settings
```

### Live Preview (Right Panel)

As Otto's conversation progresses, the right panel shows:

1. **Module bar** — Active modules highlighted, inactive dimmed
2. **Capability tree** — Auto-populated based on profile, nodes in "configured" state
3. **Triptych preview** — Shows what the main workspace will look like
4. **Archetype badge** — Shows which Otto archetype is active
5. **Skill cards** — Preloaded skills based on profile + goal

The user can interact with the preview directly (toggle modules, rearrange skills) — both chat and click inputs feed the same profile.

### Soft Locks

The Designer role can set workspace-level enforced settings:

```yaml
workspace_enforcements:
  - field: "otto_defaults.autonomy_ceiling"
    value: 0.50
    reason: "Compliance requirement: all AI actions need human review"

  - field: "compensation_patterns"
    add: "verification-checklist"
    reason: "SOX compliance requires verification checklists"
```

Individual users can customize everything except enforced fields. Soft-locked fields show a lock icon with the reason.

---

## PI Engine: `airlock-persona` Repo

### Purpose

A dedicated MCP server repo (read-only for all consumers) containing all personality intelligence, team dynamics, and cognitive compensation reference data.

### Why a New Repo

- `airlock-coordination` → operational state (locks, task queue, session state)
- `airlock-config` → platform configuration (MCP registry, pack schema, settings)
- `airlock-docs` → development specs and concepts (not queryable at runtime)
- `airlock-persona` → **reference intelligence** (queryable at runtime, structured data about people and teams)

### Repo Structure

```
airlock-persona/
├── profiles/                    # 17 PI reference profiles
│   ├── analyzer.yaml
│   ├── controller.yaml
│   ├── specialist.yaml
│   ├── strategist.yaml
│   ├── venturer.yaml
│   ├── altruist.yaml
│   ├── captain.yaml
│   ├── collaborator.yaml
│   ├── maverick.yaml
│   ├── persuader.yaml
│   ├── promoter.yaml
│   ├── adapter.yaml
│   ├── artisan.yaml
│   ├── guardian.yaml
│   ├── operator.yaml
│   ├── individualist.yaml
│   └── scholar.yaml
│
├── team-types/                  # 9 team types
│   ├── exploring.yaml
│   ├── producing.yaml
│   ├── cultivating.yaml
│   ├── stabilizing.yaml
│   ├── pathfinding.yaml
│   ├── anchoring.yaml
│   ├── bolstering.yaml
│   ├── executing.yaml
│   └── adapting.yaml
│
├── archetypes/                  # 3 meta-archetypes
│   ├── driver.yaml
│   ├── enforcer.yaml
│   └── interpreter.yaml
│
├── dynamics/                    # Team dynamics
│   ├── cross-archetype.yaml
│   ├── flywheels.yaml           # 5 synergy flywheels
│   ├── balancer-rules.yaml
│   └── sovereign-balance.yaml   # Vector math (+2/-2)
│
├── scale/                       # Company size factors
│   ├── fit-matrix.yaml          # 17 profiles x 4 company sizes
│   └── dunbar-thresholds.yaml   # Cognitive scaling breakpoints
│
├── compensation/                # UI compensation patterns
│   ├── patterns/
│   │   ├── unified-case-view.yaml
│   │   ├── tiered-alert.yaml
│   │   ├── smart-defaults.yaml
│   │   ├── role-tailored-routing.yaml
│   │   ├── progressive-disclosure.yaml
│   │   ├── comparison-deviation.yaml
│   │   └── verification-checklist.yaml
│   └── anti-patterns.yaml
│
├── ai-impact/                   # AI + personality interaction
│   ├── risk-matrix.yaml
│   ├── autonomy-levels.yaml     # L1-L4 per archetype x stakes
│   └── design-principles.yaml   # Auto vs suggest per archetype
│
├── communication/               # Communication patterns
│   └── patterns.yaml            # 17 profiles: strength/failure/tool/aiRisk
│
├── inference/                   # Profile determination logic
│   ├── drive-signals.yaml       # Goal language → DECF drives
│   ├── profile-matching.yaml    # DECF → closest profile
│   └── confidence-rules.yaml    # When to ask follow-up vs infer
│
├── org-patterns/                # Organizational templates
│   ├── department-templates/
│   └── role-mappings.yaml       # Job title → likely PI profiles
│
└── README.md
```

### Profile YAML Schema

Each profile in `profiles/` follows this schema:

```yaml
id: captain
name: Captain
category: Social # Analytical / Social / Stabilizing / Persistent
population_pct: 3.38
rarity: null # "Rarest Profile", "Most Common", etc.

drives:
  dominance: high
  extraversion: high
  patience: low
  formality: low

bio: "The natural-born leader with an articulate, authoritative voice."

strengths:
  - Delegation mastery
  - Quick decision-making
  - Fearless risk-taking
  - Handles time pressure well

cautions:
  - Authoritative presence
  - Brusque communication
  - Structure-resistant
  - May overshadow intentions

core_needs:
  - Independence
  - Connection with others
  - Variety and change
  - Flexibility

best_environment: "Challenging strategic work; leadership roles with flexibility."

# Workspace configuration values
workspace:
  cognitive_mode: visual # visual / verbal_narrative / verbal_procedural / interactive / context_dependent
  information_density: low # low / medium / medium_high / high
  interface_structure: exploratory # guided / exploratory / guided_flexible
  update_pace: alerts # alerts / batch
  explanation_style: summary_first # summary_first / evidence_first / labeled

# Cognitive compensation
weak_points:
  - "Disregards necessary process"
  - "Directive communication damages relationships"
  - "Speed-prioritized decisions lack rigor"

compensation_patterns:
  - id: embedded-process-defaults
    description: "Rigor without blocking speed"
  - id: communication-tone-checker
    description: "Surface tone impact before sending"
  - id: decision-quality-scorecard
    description: "Retrospective quality tracking"

anti_patterns:
  - "Sequential procedural gates"
  - "Consensus-required approvals"
  - "Deliberate step-by-step workflows"

# Otto mapping
otto:
  default_archetype: executor
  autonomy_ceiling: 0.75
  interaction_mode: draft_then_review

# AI impact
ai_impact:
  automation_bias_risk: high
  deskilling_risk: "Operational depth, finishing discipline"
  power_dynamic: "Gains most visible power — AI amplifies output velocity"

# Communication
communication:
  strength: "Fast, decisive, and mobilizing"
  failure_pattern: "Declares decisions without enough listening"
  best_tooling: "Decision + dissent logs surfacing concerns"
  ai_risk: "AI muting dissent in summaries"
```

### Team Type YAML Schema

Each team type in `team-types/` follows this schema:

```yaml
id: exploring
name: Exploring
population_pct: "18%"
characteristics: "Innovative, eager, ambitious"
drives: "High E, Low C"
best_for: "Brainstorming, new challenges"

ideal_profiles:
  - maverick
  - captain
  - persuader
  - venturer

otto_archetype: strategist
solo_founder_mode: "AI explores and proposes options"

# Chamber affinity
chamber_affinity:
  primary: discover
  secondary: build

# Playbook node defaults
node_defaults:
  interaction_mode: draft_then_review
  confidence_threshold: 0.70
  review_required: true
```

### Consumer Integration Table

| Consumer                           | MCP Access        | Queries                                                   | Read/Write |
| ---------------------------------- | ----------------- | --------------------------------------------------------- | ---------- |
| Workspace Forge (web)              | `airlock-persona` | Profile inference, compensation patterns, scale matrix    | Read       |
| Playbook Builder (web)             | `airlock-persona` | Team types, profile-to-archetype mapping                  | Read       |
| Otto agents (API)                  | `airlock-persona` | Archetype definitions, design principles, autonomy levels | Read       |
| Skills system (web)                | `airlock-persona` | Cognitive mode affinity data                              | Read       |
| Team suggest (API, future)         | `airlock-persona` | Balancer rules, sovereign balance, flywheels              | Read       |
| User profile service (API, future) | `airlock-persona` | Profile matching rules + inference engine                 | Read       |

---

## Integration: Playbook Builder + PI Engine

### Workflow Nodes Get Team Type Tags

When the Playbook Builder generates a workflow (via Otto conversation or manual creation), each node carries:

```yaml
node:
  id: "research-counterparty"
  name: "Research Counterparty"
  skill_id: "lead-scoring-engine"

  # PI Engine integration
  team_type: exploring # From airlock-persona/team-types/
  otto_archetype: strategist # Derived from team type
  ideal_profiles: # From team type lookup
    - maverick
    - captain
    - persuader

  # Actor assignment
  actor: hybrid # otto / human / hybrid / system
  assigned_user: null # null = Otto fills, or user ID
  interaction_mode: draft_then_review

  # If human assigned, PI Engine validates fit
  profile_fit_score: null # 0-1, calculated when user is assigned
```

### Solo Founder Mode

When the workspace has no team members for a node:

1. The node's `team_type` determines which Otto archetype fills the role
2. Otto adjusts its cognitive style, communication pattern, and autonomy level to match
3. The node shows an "AI Filling: [team type]" badge

### Team Assignment (Future)

When the workspace has multiple users with known PI profiles:

1. Playbook Builder shows profile fit scores per node
2. Suggests optimal assignments based on team type × profile matching
3. Highlights imbalances: "This workflow is 80% Driver nodes — consider adding a Stabilizing reviewer"

---

## Integration: Default Playbooks Informed by PI

Preloaded playbook templates use synergy flywheels and team types:

### Example: Contract Intake Playbook (PI-Informed)

```yaml
playbook:
  id: contract-intake
  name: "Contract Intake"
  team_composition: "Vision + Execution flywheel"

  nodes:
    - name: "Triage Incoming"
      team_type: adapting
      otto_archetype: analyst
      chamber: discover

    - name: "Research Counterparty"
      team_type: exploring
      otto_archetype: strategist
      chamber: discover

    - name: "Extract Terms"
      team_type: producing
      otto_archetype: executor
      chamber: build

    - name: "Draft Agreement"
      team_type: executing
      otto_archetype: executor
      chamber: build

    - name: "Compliance Review"
      team_type: stabilizing
      otto_archetype: guardian
      chamber: review

    - name: "Stakeholder Alignment"
      team_type: cultivating
      otto_archetype: connector
      chamber: review

    - name: "Publish & Distribute"
      team_type: pathfinding
      otto_archetype: executor
      chamber: ship
```

---

## Architecture: Where Things Live

### Existing Repos (No Changes to Structure)

| Repo                     | Role in PI Integration                                       |
| ------------------------ | ------------------------------------------------------------ |
| `airlock-app`            | Consumes PI data for Workspace Forge UI and Playbook Builder |
| `airlock-docs`           | References PI Engine in specs; vocabulary additions          |
| `airlock-config`         | Adds `airlock-persona` to MCP registry                       |
| `airlock-skills-library` | Skills gain `cognitive_mode_affinity` field                  |
| `airlock-playbooks`      | Playbook templates gain `team_type` per node                 |
| `airlock-coordination`   | No changes — stays operational state only                    |
| `airlock-gen-ui`         | Workspace Forge prompts reference PI profiles                |

### New Repo

| Repo              | Purpose                                                                   |
| ----------------- | ------------------------------------------------------------------------- |
| `airlock-persona` | PI reference data, team dynamics, cognitive compensation, inference rules |

### Data Flow

```
User creates workspace → signals collected
                ↓
Workspace Forge launches
                ↓
Otto reads signals from airlock-coordination (workspace state)
Otto reads PI profiles from airlock-persona (reference data)
                ↓
Otto asks 2-4 goal questions
                ↓
Inference engine (in airlock-persona) maps goals → DECF drives → profile
                ↓
Workspace profile stored in airlock-coordination (user session state)
                ↓
UI configured: density, structure, pace, compensation patterns
Skills preloaded from airlock-skills-library (filtered by profile)
Playbook templates loaded from airlock-playbooks (filtered by team type needs)
```

---

## Vocabulary Additions

| Term                       | Definition                                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Workspace Forge**        | The split-screen onboarding experience (Otto chat + live preview) that replaces the wizard checklist                                       |
| **PI Profile**             | One of 17 Predictive Index reference profiles (e.g., Captain, Guardian, Analyzer) that describes a user's cognitive and behavioral pattern |
| **Drive**                  | One of 4 behavioral dimensions: Dominance (A), Extraversion (B), Patience (C), Formality (D)                                               |
| **Team Type**              | One of 9 team behavioral patterns (Exploring, Producing, Cultivating, etc.) that describes what kind of work a workflow node requires      |
| **Meta-Archetype**         | One of 3 fundamental operating modes: Driver, Enforcer, Interpreter                                                                        |
| **Cognitive Compensation** | UI pattern that counteracts a profile's cognitive weak points                                                                              |
| **Soft Lock**              | A workspace setting enforced by the Designer role that individual users cannot override                                                    |
| **Sovereign Balance**      | The mathematical principle that team drive vectors should sum to zero for optimal performance                                              |

---

## Risks & Mitigations

| Risk                            | Mitigation                                                                                                                   |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Otto misidentifies PI profile   | Live preview shows configuration as it's built; user can correct by clicking or telling Otto                                 |
| Users feel "categorized"        | Profile labels are internal — users never see "You're a Captain." They see the configured workspace and can adjust anything. |
| 17 profiles too complex for MVP | Start with 3 meta-archetypes (Driver/Enforcer/Interpreter) as the primary config axis; full 17-profile resolution as Phase 2 |
| PI data feels generic           | Combine PI profile with domain signals (industry, module, document type) for specificity                                     |
| YAML repo maintenance           | Treat like `airlock-docs` — locked specs, version-controlled, changes require review                                         |

---

## Phasing

### Phase 1: Foundation (Current Focus)

- Create `airlock-persona` repo with all 17 profiles, 9 team types, 3 archetypes
- Port PI Explorer HTML data into structured YAML
- Build Workspace Forge UI in `airlock-app`
- Implement goal-based conversation script for Otto
- Configure workspaces based on 3 meta-archetypes (Driver/Enforcer/Interpreter)

### Phase 2: Deep Integration

- Full 17-profile inference resolution
- Playbook Builder nodes tagged with team types
- Skills matched to cognitive mode affinity
- Default playbook templates informed by flywheels
- Soft lock system for Designer role

### Phase 3: Behavioral Adaptation (Future)

- User behavior feeds back to refine PI profile over time
- "Superuser detection" — system identifies power users before the org does
- Team composition suggestions based on Sovereign Balance
- Workspace reconfiguration prompts when profile drift is detected

---

## Source Material

- Predictive Index system: 60+ years of research, 30M+ assessments
- PI Explorer interactive research dashboard (internal)
- Orchestrate OS V2/V3 Architecture: Cognitive Forcing Functions, Personality-Aware UI
- Sovereign Balance calculation: Vector math for team composition optimization
- Belbin Team Roles (1981): Mapped to Otto archetypes
- Parasuraman, Sheridan & Wickens (2000): Levels of automation
- Shneiderman's 2D HCAI Framework (2020): High automation + high control coexist
- Bainbridge's Ironies of Automation (1983): Justification for Gates
- Spellburst (Stanford, ACM CHI 2023): Chat → canvas UX pattern precedent
