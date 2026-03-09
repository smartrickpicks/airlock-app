# Operation OTTO — Iteration 3: Identity Sovereignty, Agent You Lineage, & Patient Zero

> **Date:** 2026-03-09
> **Status:** BRAINSTORM — Iteration 3 of Operation OTTO
> **Parent:** `docs/plans/2026-03-09-operation-otto-master-plan.md`
> **Prior Iteration:** `docs/plans/2026-03-09-operation-otto-iteration-2.md`
> **Focus:** Mapping Agent You concepts to Airlock, identity sovereignty principles from Sonr/DID background, dogfooding plan with founder as Patient Zero, Dimensional.me enrichment

---

## Why This Iteration Matters

The founder (Zachary) has two years of prior art building Agent You — a personalized AI agent framework with modular personalities, modes, character files, and a 3-layer persona system. He also has deep identity infrastructure experience from Sonr (W3C DID standards, WebAuthn/passkeys, decentralized web nodes, self-sovereign identity). These aren't theoretical references — they're lived engineering decisions that inform what Airlock's people intelligence layer should become.

This iteration does three things:

1. **Maps Agent You concepts to OTTO** — translating what worked, what didn't, and what Airlock does better
2. **Establishes identity sovereignty as a core principle** — your profile is YOURS, not the platform's
3. **Defines the dogfooding plan** — Zachary is Patient Zero, testing Otto Learns You on himself to find the repeatable natural path

---

## Part 1: Agent You → Airlock Concept Translation

### The Core Mapping

Agent You was a consumer-facing personalized AI platform. Airlock is an enterprise data operations platform. Different markets, but the underlying identity/persona architecture transfers directly.

| Agent You Concept                                                                     | What It Did                                                                                                                                     | Airlock Equivalent                                                                                                                                            | Status                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P.E.R.S.O.N.A Framework** (3 layers)                                                | Base Layer (foundational assessment), Dynamic Layer (continuous micro-training), Feedback Loop (aggregated learning)                            | **L1: Otto Learns You** — Intake (base), Behavioral Adaptation (dynamic), Hive Learning (feedback)                                                            | Maps cleanly. Airlock has the same 3-layer need but scoped to professional context.                                                                                                         |
| **Modes** (Fitness, Work, Dating, etc.)                                               | Life-context filters that shape how the AI responds. Each Mode activates different personality facets.                                          | **Modules + Chambers** — Contracts module activates different Otto behavior than CRM module. Discover chamber activates different behavior than Review.       | Modules ARE modes. Chambers are sub-modes. Already designed, needs persona-awareness wired in.                                                                                              |
| **Micro-Personas** / Modular Personalities                                            | Specialized sub-models (Fitness You, Business You) that activate contextually. Users cycle between personas.                                    | **Otto Archetype Switching** — Otto switches between Analyst, Strategist, Executor, Connector, Guardian, Architect per DAG node.                              | Already designed in Iteration 1. Agent You validates the approach.                                                                                                                          |
| **Character File** (9 sections)                                                       | ID, Role & Tasks, Platforms, User Data, Model Settings, Style & Personality, Knowledge, Message Examples, Security                              | **user_profile YAML** — pi_profile, drives, team_types, meta_archetype, confidence, otto_archetype, interaction_mode                                          | Airlock's is more structured (PI-grounded) but has fewer sections. Should expand. See below.                                                                                                |
| **BMY (Bare Minimum You)**                                                            | The minimal viable agent — lowest training threshold to be useful. Foundational baseline before enrichment.                                     | **First-boot profile** — The profile Otto creates from initial signals before any enrichment. LinkedIn import or 4-question conversation.                     | Concept validates the "minimum viable profile" approach. Design the BMY threshold explicitly.                                                                                               |
| **Modes + Data Connection**                                                           | When a user connects a fitness tracker, data flows to Fitness Mode. When they connect a calendar, data flows to Work Mode.                      | **Signal routing** — When a user connects LinkedIn, data flows to PI Engine for profile enrichment. When they add a contract, data flows to Contracts module. | The routing concept is right. Need to formalize signal sources per module.                                                                                                                  |
| **Persona Cycling**                                                                   | Users switch between personas seamlessly. The AI reconfigures prompts, tone, and data context.                                                  | **Chamber transitions** — Otto shifts archetype when vault moves from Discover to Build. Controller hierarchy shifts who's in charge.                         | Already designed. Agent You confirms this is the right pattern.                                                                                                                             |
| **Values Radar Chart**                                                                | 5-cluster visualization: Ambition & Self-Enhancement, Energy & Excitement, Openness & Curiosity, Order & Responsibility, Warmth & Agreeableness | **Sovereign Balance** — 4-drive visualization: Dominance, Extraversion, Patience, Formality (DECF). Team-level drive distribution chart.                      | Similar concept, different axes. PI drives are more empirically grounded. Keep DECF but consider enriching with values layer.                                                               |
| **Dynamic Persona Adjustment** (Trait Weighting, Prompt Framing, Interaction Context) | Active mode shifts trait weights. Fitness Mode weights Ambition higher. Work Mode weights Discipline higher.                                    | **Otto system prompt augmentation** — Active chamber shifts Otto's personality. Discover→Strategist weights curiosity. Review→Guardian weights rigor.         | Agent You's 3-step adjustment (Trait Weighting → Prompt Framing → Interaction Context) is a cleaner formalization. Adopt this pattern.                                                      |
| **GraphRAG** (knowledge graph + vector DB)                                            | Dual-level retrieval: structural knowledge graph relationships + semantic vector similarity                                                     | **Corpus search + PI matching** — Otto searches vault corpus AND matches users to team types via drive-space similarity                                       | Future enhancement. GraphRAG could power the Ask DAG routing — find the right expert by graph proximity.                                                                                    |
| **Agent Forking / Cloning**                                                           | Clone an agent for a new context. Share agents in marketplace.                                                                                  | **Playbook Pack import/export** (PaperClip Concept 7). Playbooks can be cloned, templated, shared across workspaces.                                          | Already planned. Agent You confirms marketplace viability.                                                                                                                                  |
| **$YOU Token Economy**                                                                | Utility token for agent creation, training, marketplace.                                                                                        | **Not applicable** — Airlock is SaaS, not crypto. But the marketplace incentive model (create playbooks → earn credits/revenue share) is worth designing.     | Skip blockchain. Keep marketplace economics concept.                                                                                                                                        |
| **Cross-Platform Memory**                                                             | Agent maintains context across Telegram, Discord, Twitter, SMS.                                                                                 | **Session persistence** (PaperClip Concept 9). Otto maintains context across Signal panel interactions, across heartbeats, across devices.                    | Already planned. Agent You confirms the UX value.                                                                                                                                           |
| **Dimensional.me Integration**                                                        | Archetypes (Questioner, Bedrock, Challenger, Pioneer, Influencer), Patterns, Elements, Dimensions — from dimensional.me assessment framework    | **PI Reference Profiles** — 17 profiles with 4 drives each. 9 team types. 3 meta-archetypes. Grounded in 60+ years of PI research (30M+ assessments).         | Airlock's PI foundation is more empirically robust. But Dimensional.me's trait decomposition (Elements → Patterns → Archetypes → Dimensions) is a richer hierarchy. See enrichment section. |

### What Airlock Does Better Than Agent You

1. **Empirical grounding** — PI has 60+ years of research vs. Agent You's custom trait system. Airlock's DECF drives are validated across 30M+ assessments.
2. **Team-level intelligence** — Agent You was per-user only. Airlock's PI Engine works at individual AND team level (Sovereign Balance, coverage computation, roster-aware playbooks).
3. **Workflow integration** — Agent You's personas were conversational only. Airlock's profiles directly determine WHO does WHAT in a DAG workflow. The profile IS the work assignment.
4. **Accountability architecture** — Agent You had no gate system. Airlock's mandatory gates + Controller hierarchy prevent autonomous AI drift.
5. **Professional context** — Agent You tried to be everything (Fitness, Dating, Finance). Airlock focuses on professional/business operations where the value is clearest.

### What Agent You Did That Airlock Should Adopt

1. **The 3-step Dynamic Persona Adjustment pattern:**
   - **Trait Weighting:** When Otto enters a chamber, weight the relevant drives higher. Discover weights Dominance and Extraversion. Review weights Patience and Formality.
   - **Prompt Framing:** Context from the active module/chamber/vault is injected into Otto's system prompt. Not just "you are in Review" but the full persona context.
   - **Interaction Context:** Secondary drives still influence. A Maverick in Review mode still has high Dominance undertones — Otto doesn't become a completely different agent, it SHIFTS emphasis.

2. **The BMY (Bare Minimum You) threshold:**
   - Define what constitutes a "usable" profile vs. a "rich" profile
   - BMY = enough to assign an Otto archetype + suggest starter playbooks
   - Rich = enough to compute coverage, suggest hires, run complex DAGs
   - Signal progression: BMY (name + role + 2 goals) → Enriched (LinkedIn import OR resume + conversation) → Full (behavioral observation over time)

3. **Mode-based data routing:**
   - Each Airlock Module should declare what external signals it consumes
   - Contracts module consumes: contract documents, legal databases, counterparty info
   - CRM module consumes: LinkedIn, email, calendar, communication patterns
   - Triage module consumes: git repos, project management tools, developer activity
   - When Otto receives a new signal, it knows which Module context to enrich

4. **The Persona Lifecycle (from Agent You's lifecycle model):**
   - **Initial Assignment** — after intake, user gets a primary PI profile mapping
   - **Refinement Over Time** — behavioral patterns confirm or shift the profile
   - **Context Switching** — different modules/chambers surface different profile facets
   - **User Override** — user can always manually adjust if the label feels wrong
   - **Re-assessment** — periodic check-in: "Your work patterns have shifted. Want to update your profile?"

---

## Part 2: Identity Sovereignty — The Sonr Principle

### Background

Zachary's work at Sonr (W3C DID standards, WebAuthn/passkeys, decentralized web nodes) established a core belief: **your identity data belongs to you, not the platform.**

This isn't a blockchain feature for Airlock. It's a **design principle** that permeates every decision in Otto Learns You.

### The Sovereignty Rules

| Rule                            | What It Means                                                                                                               | Implementation                                                                                                                                                         |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Your profile is yours**       | The PI profile, drives, team type mapping, and behavioral observations belong to the user, not the workspace.               | Profile data stored per-user, portable across workspaces. If a user leaves a workspace, their profile goes with them.                                                  |
| **Transparent inference**       | Otto never secretly profiles you. Every inference is visible and explainable.                                               | "Otto thinks you're a Maverick because..." panel in user settings. Full trace of which signals led to which inference.                                                 |
| **Consent-gated enrichment**    | Otto asks before consuming new data sources. LinkedIn import requires explicit opt-in.                                      | Enrichment actions require user confirmation. No background profiling. Signal sources panel shows exactly what's connected.                                            |
| **Right to reset**              | Users can reset their profile and start fresh at any time.                                                                  | "Reset my profile" action in settings. Otto treats them as a new user. Prior behavioral data is purged (not just archived).                                            |
| **Right to correct**            | Users can override any inference Otto makes.                                                                                | "I'm not a Maverick, I'm more of a Scholar" → Otto adjusts, logs the override, and shifts behavior immediately. User overrides take permanent priority over inference. |
| **Audit trail**                 | Every profile change — inferred or manual — is logged immutably.                                                            | Append-only profile change log. Users can see: "Mar 9: Otto inferred Maverick (confidence: 0.82, source: LinkedIn). Mar 10: User override to Scholar."                 |
| **Workspace-scoped visibility** | A workspace admin can see that a user's team type is "Exploring" but CANNOT see the raw PI drives unless the user consents. | Two-tier visibility: workspace sees functional role mapping; individual sees full profile. Privacy-by-default.                                                         |
| **No dark patterns**            | Otto never uses profile data to manipulate. No engagement tricks, no FOMO, no gamified pressure.                            | Profile data drives workflow optimization and agent calibration ONLY. Never used for notification manipulation or retention tricks.                                    |

### How This Differs from Agent You

Agent You used blockchain (smart contracts, $YOU tokens) to enforce data sovereignty. Airlock achieves it through **architecture and policy**:

- User profiles are stored in a user-scoped table, not workspace-scoped
- Profile export API: download your full profile as JSON/YAML at any time
- Profile portability: when joining a new Airlock workspace, your profile transfers (with your consent)
- No data brokering: Airlock never shares profile data between workspaces without explicit user action

### The Sonr-Inspired Data Vault Concept

Sonr's "Decentralized Web Nodes" (DWN) — encrypted data stores with protocol-based schemas — inspire a similar pattern in Airlock:

```yaml
user_vault:
  owner: "usr_zachary"
  created: "2026-03-09"

  # Core identity (user-controlled)
  identity:
    pi_profile: "maverick"
    drives: { D: 9, E: 8, C: 3, F: 2 }
    confidence: 0.85
    source: "linkedin_import + conversation"
    last_assessed: "2026-03-09"
    user_overrides: []

  # Behavioral observations (system-observed, user-visible)
  observations:
    work_patterns:
      peak_hours: "09:00-12:00, 21:00-01:00"
      communication_style: "async_preferred"
      decision_speed: "fast"
    interaction_history:
      total_otto_interactions: 47
      most_used_archetype: "strategist"
      gate_response_time_avg: "2.4h"

  # Connected signals (user-consented)
  signals:
    linkedin:
      connected: true
      last_sync: "2026-03-09"
      consent_granted: "2026-03-09"
    resume:
      uploaded: false
    calendar:
      connected: false

  # Workspace memberships (visible to workspace admins)
  workspaces:
    - id: "ws_airlock_hq"
      role: "architect"
      team_type_visible: true # admin can see team type
      drives_visible: false # admin cannot see raw drives
      joined: "2026-03-09"

  # Audit trail (append-only)
  changelog:
    - timestamp: "2026-03-09T14:00:00Z"
      action: "profile_created"
      source: "workspace_forge"
      details: "Initial inference from conversation + workspace signals"
    - timestamp: "2026-03-09T14:05:00Z"
      action: "enrichment_linkedin"
      source: "linkedin_import"
      details: "Confidence upgraded from 0.65 to 0.85"
```

---

## Part 3: Dimensional Enrichment — Beyond DECF

### The Gap

PI's 4-drive model (DECF) is powerful for work behavior but limited in dimensionality. Agent You's work with Dimensional.me surfaced a richer trait hierarchy:

| Dimensional.me Layer                                                               | What It Captures                                | PI Equivalent                                   | Gap                                                                             |
| ---------------------------------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------- |
| **Archetypes** (Questioner, Bedrock, Challenger, Pioneer, Influencer)              | High-level behavioral identity label            | PI Reference Profiles (17)                      | PI has more granularity (17 vs. ~12)                                            |
| **Patterns** (Stability-seeking, Fun-seeking, Charismatic, etc.)                   | Behavioral tendencies in relationships and work | Team Types (9)                                  | Team types are work-scoped; patterns are broader                                |
| **Elements** (Boundary Setting, Codependency, Bond Anxious, Extroversion Function) | Atomic personality traits scored 0-100          | DECF Drives (4 axes, scored ±)                  | DECF is simpler (4 vs. many); Elements provide richer decomposition             |
| **Dimensions** (Personality, Cognition, Values, Communication, Interests)          | Category groupings of elements                  | Meta-archetypes (Driver, Enforcer, Interpreter) | Meta-archetypes are work-role groupings; Dimensions are broader life categories |

### What Airlock Should Do

**Keep PI as the primary framework** — it's empirically validated and purpose-built for work dynamics. But **layer optional enrichment dimensions** for users who want deeper profiling:

```yaml
profile_layers:
  # Layer 1: PI Core (always present, minimum for system function)
  pi_core:
    profile: "maverick"
    drives: { D: 9, E: 8, C: 3, F: 2 }
    team_types: ["exploring", "adapting"]
    meta_archetype: "driver"
    confidence: 0.85

  # Layer 2: Work Dimensions (optional enrichment)
  work_dimensions:
    communication_style: "direct" # from interaction patterns
    decision_making: "fast_intuitive" # from gate response patterns
    risk_tolerance: "high" # from playbook choices
    collaboration_mode: "async_lead" # from team interaction patterns
    learning_style: "experiential" # from onboarding behavior
    source: "behavioral_observation"
    confidence: 0.60 # grows over time

  # Layer 3: Values Alignment (future, optional)
  values:
    primary_cluster: "ambition_and_self_enhancement"
    secondary_cluster: "energy_and_excitement"
    source: "conversation_inference"
    confidence: 0.45 # low until more data
```

**Layer 1 is required.** Layers 2 and 3 are progressive enrichment that happens automatically over time as Otto observes behavior. Users can see and correct any layer.

This maps directly to Agent You's P.E.R.S.O.N.A structure:

- **Base Layer** = PI Core (Layer 1)
- **Dynamic Layer** = Work Dimensions (Layer 2) — grows from observation
- **Feedback Loop** = Values Alignment (Layer 3) — aggregated learning over time

---

## Part 4: Patient Zero — Dogfooding Plan

### The Thesis

Zachary IS the test case. His background makes him the ideal Patient Zero:

- **Maverick profile** — high Dominance, high Extraversion, low Patience, low Formality
- **Solo founder** (currently) — tests the Solo tier of roster-aware playbooks
- **Agent You creator** — understands persona systems deeply, can spot UX failures
- **Sonr/DID engineer** — will catch identity sovereignty violations
- **Building the team** — Jim Robinson (Scholar) as first external advisor, testing the Pod tier transition

### The Dogfooding Protocol

#### Step 1: First Boot (BMY — Bare Minimum You)

What happens when Zachary first hits Workspace Forge:

```
SIGNALS OTTO READS AUTOMATICALLY:
├── Workspace name: "Airlock HQ"
├── Industry: "Legal Tech / Contract Management"
├── Email domain: @airlock.app (startup signal)
├── Team size: 1 (solo founder)
└── First document: [whatever the first upload is]

OTTO ASKS (2-4 questions):
Q1: "What are you here to accomplish first?"
    → Zachary: "Ship the product and close pilot customers"
    → Otto infers: High Dominance, action-oriented, Ship-focused

Q2: "How do you prefer to work — big picture strategy or detailed execution?"
    → Zachary: "Big picture. I'm the idea guy, I need the execution layer."
    → Otto infers: Maverick/Captain, needs Producing/Executing support

RESULT (BMY Profile):
├── PI Profile: Maverick (confidence: 0.65)
├── Drives: D:high, E:high, C:low, F:low (coarse)
├── Otto Archetype: Strategist
├── Interaction Mode: direct, high-level, fast-paced
├── Suggested Modules: Contracts (primary), CRM (secondary)
└── Workspace Config: Solo tier, sequential playbooks only
```

#### Step 2: LinkedIn Enrichment (Optional, consent-gated)

```
OTTO: "I can learn a lot more about your work style from your LinkedIn.
       Want to connect it? Here's exactly what I'll look at:
       - Your job titles and tenure (work pattern signals)
       - Your skills and endorsements (expertise mapping)
       - Your connections (network signals)
       I will NOT: post anything, access messages, or contact anyone."

ZACHARY: [connects LinkedIn via MCP server]

ENRICHMENT RESULT:
├── PI Profile: Maverick (confidence: 0.85 ← upgraded)
├── Drives: D:9, E:8, C:3, F:2 (precise)
├── Career signal: Founder/CEO trajectory → high autonomy
├── Sonr background → identity/blockchain expertise
├── Agent You background → AI/persona systems expertise
├── Network signal: Tech/startup/crypto cluster
└── Updated Otto behavior: "You have deep identity background.
    I'll reference DID/sovereignty concepts when relevant."
```

#### Step 3: First Playbook Run (Solo Tier)

```
ZACHARY: "Build me a playbook for closing a pilot customer"

OTTO: "Here's what I suggest for a solo founder with your profile:

  PILOT CLOSE — Solo Version [6 nodes, 2 gates]

  ┌─────────────────────────────────────────────┐
  │ [YOU] Identify prospect                      │
  │    ↓                                         │
  │ [OTTO:Analyst] Research prospect background   │
  │    ↓                                         │
  │ [OTTO:Strategist] Draft outreach angle        │
  │    ↓                                         │
  │ ◆ GATE: Review Otto's draft [YOU confirm]    │
  │    ↓                                         │
  │ [YOU] Send outreach + schedule demo           │
  │    ↓                                         │
  │ ◆ GATE: Post-demo decision [YOU decide]      │
  └─────────────────────────────────────────────┘

  Your profile says you're a Maverick — fast-moving,
  big-picture. So I kept this short and direct.
  The 2 gates are where YOU need to be in the loop."
```

#### Step 4: Adding Jim Robinson (Pod Tier Transition)

```
ZACHARY: "I'm adding Jim Robinson as an advisor"

OTTO: "Tell me about Jim. What's his role?"
ZACHARY: "He's a scholar type. Deep inference, distributed systems."

OTTO INFERS (for Jim):
├── PI Profile: Scholar (pending Jim's own onboarding)
├── Drives: D:low, E:low, C:high, F:high (estimated)
├── Team type fit: Producing, Stabilizing
├── Meta-archetype: Enforcer
└── Coverage impact: +Research, +Review quality

TEAM HEALTH UPDATE:
├── Team size: 2 (Pod tier unlocked)
├── Coverage: Exploring ✅ (Zachary)
│             Producing ✅ (Jim)
│             Stabilizing ⚠️ (Jim partial)
│             Cultivating ❌ (gap)
├── Sovereign Balance: 48% → 62% (improved)
├── New playbooks unlocked: 3
│   - Technical Research Deep Dive [8 nodes]
│   - Architecture Review Pipeline [6 nodes]
│   - Inference Optimization Sprint [10 nodes]
└── OTTO: "Jim's Scholar profile complements your Maverick.
    You drive, he validates. But you still need a
    Cultivating type for customer relationships."
```

#### Step 5: Behavioral Adaptation (Ongoing)

Over 2 weeks of use, Otto observes:

```
BEHAVIORAL SIGNALS OBSERVED:
├── Zachary responds to gates within 30 minutes (fast)
├── Zachary skips detailed reports, reads summaries only
├── Zachary often asks "what's the bottom line?"
├── Zachary works in two bursts: 9am-12pm, 9pm-1am
├── Zachary prefers voice transcription over typing

DYNAMIC ADJUSTMENTS:
├── Otto now leads with summary, buries detail
├── Gate notifications tuned to Zachary's active hours
├── Voice-first interaction mode suggested
├── Work Dimensions (Layer 2) confidence: 0.45 → 0.72
└── OTTO: "I've noticed you work in two focused bursts.
    Want me to batch gate reviews for 9am and 9pm?"
```

### What We Learn from Dogfooding

The protocol above isn't just a test plan — it IS the product design. Every step that feels natural becomes the template. Every step that feels forced gets redesigned. The founder's experience with the dogfood becomes the documentation for how onboarding works.

Key metrics to track during dogfooding:

| Metric                                | What It Measures                                       | Target                             |
| ------------------------------------- | ------------------------------------------------------ | ---------------------------------- |
| **Time to BMY**                       | How long from first login to a usable profile          | < 2 minutes                        |
| **Time to first playbook**            | How long before Otto suggests an actionable workflow   | < 5 minutes                        |
| **Profile accuracy at BMY**           | Does the initial inference feel right?                 | User agrees > 70%                  |
| **Profile accuracy after enrichment** | Does LinkedIn/resume upgrade feel right?               | User agrees > 90%                  |
| **Gate friction**                     | Are gates helpful or annoying?                         | Helpful > 80% of the time          |
| **Archetype switching accuracy**      | Does Otto's behavior match the chamber/module context? | Noticeable and correct > 75%       |
| **Override frequency**                | How often does the user correct Otto's inference?      | < 3 overrides per week (declining) |

---

## Part 5: The Character File Evolution

### From Agent You's 9 Sections to Airlock's Profile Schema

Agent You defined a 9-section Character File for each agent. Airlock's user_profile YAML should evolve to a similarly comprehensive structure, but grounded in PI rather than custom traits:

```yaml
# Airlock User Profile — Full Schema (evolved from Agent You's Character File)
user_profile:
  # 1. Identity (Agent You: "Identification")
  identity:
    id: "usr_01ARZ..."
    display_name: "Zachary"
    email_domain: "airlock.app"
    created: "2026-03-09"
    profile_version: 3

  # 2. Role & Scope (Agent You: "Role and Tasks")
  role:
    org_role: "architect" # architect | controller | member | guest
    module_roles: # per-module role assignments
      contracts: "owner"
      crm: "builder"
      triage: "builder"
    controller_subtree: "root" # what part of the org tree they control

  # 3. PI Core (Agent You: "Personality and Style" — but PI-grounded)
  pi_core:
    profile: "maverick"
    drives:
      dominance: 9 # A factor
      extraversion: 8 # B factor
      patience: 3 # C factor
      formality: 2 # D factor
    team_types: ["exploring", "adapting"]
    meta_archetype: "driver"
    confidence: 0.85
    source: "linkedin_import"
    last_assessed: "2026-03-09"

  # 4. Work Dimensions (Agent You: "User Data" — but behavioral)
  work_dimensions:
    communication_style: "direct"
    decision_speed: "fast_intuitive"
    risk_tolerance: "high"
    collaboration_mode: "async_lead"
    learning_style: "experiential"
    peak_hours: ["09:00-12:00", "21:00-01:00"]
    preferred_input: "voice" # voice | text | both
    confidence: 0.72
    source: "behavioral_observation"

  # 5. Otto Configuration (Agent You: "Model Settings")
  otto_config:
    primary_archetype: "strategist"
    interaction_mode: "direct" # direct | supportive | analytical | coaching
    verbosity: "summary_first" # detailed | summary_first | minimal
    notification_channels: ["dispatch", "email"]
    gate_batch_times: ["09:00", "21:00"]
    autonomy_level: "guided" # autonomous | guided | supervised

  # 6. Knowledge Context (Agent You: "Knowledge")
  knowledge:
    domain_expertise:
      ["legal_tech", "identity_systems", "ai_agents", "music_industry"]
    tools_proficient: ["claude", "codex", "figma", "postgres"]
    industry_context: "saas_startup"
    prior_systems: ["agent_you", "sonr", "orchestrate_os"]

  # 7. Interaction Examples (Agent You: "Message Examples")
  # Not stored as static examples — generated dynamically from behavioral observation
  interaction_patterns:
    prefers_questions_as: "multiple_choice" # open_ended | multiple_choice | direct
    responds_best_to: "bottom_line_first"
    avoids: "long_reports"
    tone_preference: "casual_professional"

  # 8. Connected Signals (Agent You: "Platforms")
  signals:
    linkedin: { connected: true, last_sync: "2026-03-09" }
    resume: { uploaded: false }
    calendar: { connected: false }
    github: { connected: false }
    slack: { connected: false }

  # 9. Privacy & Sovereignty (Agent You: "Security" — but Sonr-informed)
  sovereignty:
    profile_portable: true # can export/transfer profile
    workspace_visibility: "team_type_only" # full | team_type_only | hidden
    enrichment_consent:
      linkedin: "granted"
      calendar: "not_asked"
      behavioral: "granted"
    data_retention: "user_controlled"
    last_export: null
    override_count: 0

  # Changelog (append-only)
  changelog:
    - {
        ts: "2026-03-09T14:00:00Z",
        action: "created",
        source: "workspace_forge",
      }
    - {
        ts: "2026-03-09T14:05:00Z",
        action: "enriched",
        source: "linkedin",
        delta: "confidence 0.65→0.85",
      }
```

### What Changed from the Master Plan's Schema

The master plan had a simpler `user_profile` with just PI fields. This expanded schema adds:

1. **Work Dimensions** (Layer 2) — behavioral observation data
2. **Otto Configuration** — per-user Otto tuning preferences
3. **Knowledge Context** — what the user knows, for better Ask DAG routing
4. **Interaction Patterns** — how Otto should talk to this person
5. **Connected Signals** — explicit signal source tracking
6. **Sovereignty block** — privacy controls as first-class schema fields

---

## Part 6: Module-as-Mode — Applying Agent You's Mode Architecture

### The Concept

In Agent You, Modes (Fitness, Work, Dating) were context filters that changed how the AI behaved. In Airlock, **Modules ARE Modes** and **Chambers are Sub-Modes**.

When Otto is operating in the Contracts module, it's in "Contracts Mode." When it shifts to CRM, it's in "CRM Mode." The personality adjustment pattern from Agent You applies directly:

### Mode Matrix

| Module (Mode) | Otto Archetype Emphasis | Drive Weight Shift          | Communication Shift                 | Data Priority                       |
| ------------- | ----------------------- | --------------------------- | ----------------------------------- | ----------------------------------- |
| **Contracts** | Guardian + Analyst      | Formality ↑, Patience ↑     | Precise, reference-heavy            | Document corpus, legal databases    |
| **CRM**       | Connector + Strategist  | Extraversion ↑, Dominance ↑ | Relationship-aware, action-oriented | Contact history, LinkedIn, email    |
| **Triage**    | Executor + Architect    | Dominance ↑, Patience ↓     | Direct, priority-focused            | Task status, blockers, deadlines    |
| **Calendar**  | Connector + Executor    | Patience ↑, Extraversion ↑  | Time-aware, scheduling-optimized    | Availability, timezone, preferences |
| **Documents** | Analyst + Guardian      | Formality ↑, Patience ↑     | Detailed, citation-heavy            | Document graph, version history     |

### Chamber Sub-Modes

Within each Module, the Chamber further refines Otto's behavior:

| Chamber      | Sub-Mode Shift       | Otto Behavior                                                           |
| ------------ | -------------------- | ----------------------------------------------------------------------- |
| **Discover** | Exploration emphasis | "What else should we look at?" Curious, expansive, research-oriented    |
| **Build**    | Production emphasis  | "Let me draft that for you." Action-oriented, assembly-focused          |
| **Review**   | Quality emphasis     | "Here are 3 issues I found." Critical, detail-oriented, risk-flagging   |
| **Ship**     | Delivery emphasis    | "Ready to send. Confirm?" Efficient, checklist-driven, closure-oriented |

This is exactly Agent You's Mode + Persona Cycling, but scoped to business operations.

---

## Open Questions for Next Iteration

1. **How does profile portability work technically?** If a user leaves Workspace A and joins Workspace B, what transfers? Full profile? PI core only? Do behavioral observations reset?

2. **When does behavioral observation override initial inference?** If Otto initially maps someone as a Maverick from LinkedIn, but their behavioral patterns look more like a Scholar, at what confidence threshold does the system suggest a re-assessment?

3. **How do we handle conflicting signals?** LinkedIn says "CEO" (Dominance signal) but behavioral observation shows patience and detail-orientation (Scholar signal). Which wins?

4. **What's the consent UX for behavioral observation?** Users consent to LinkedIn import explicitly. But behavioral observation (how fast they respond to gates, what they skip) is passive. Do we need explicit consent for passive observation? The Sonr principle says yes.

5. **How does the profile influence notification design?** A Maverick should get crisp, urgent notifications. A Scholar should get detailed, contextualized ones. Is this worth implementing, or is it over-personalizing?

6. **How do we test profile accuracy at scale?** With 1 user (dogfood), accuracy is subjective. At 100 users, we need quantitative validation. What's the measurement framework?

---

## Synthesis: What Iteration 3 Adds to the Architecture

| Concept                                             | Where It Lives                        | New or Updated                                       |
| --------------------------------------------------- | ------------------------------------- | ---------------------------------------------------- |
| Agent You concept translation                       | Reference / historical context        | New — informs all layers                             |
| Identity sovereignty rules                          | L1 (Otto Learns You) — core principle | New — architectural constraint                       |
| User vault schema                                   | L1 (Otto Learns You) — data model     | New — privacy-first profile store                    |
| Profile layers (PI Core / Work Dimensions / Values) | L1 + L2 — enrichment pipeline         | Updated — expands simple profile to 3-layer model    |
| BMY (Bare Minimum You) threshold                    | L1 — intake flow                      | New — defines minimum viable profile                 |
| Patient Zero dogfooding protocol                    | Testing / validation                  | New — defines how we validate the design             |
| Expanded user_profile schema (9 sections)           | L1 — data model                       | Updated — from 5 fields to 9 sections                |
| Module-as-Mode architecture                         | L4 — Otto behavior switching          | New — formalizes how Otto changes per module/chamber |
| Dimensional enrichment layers                       | L2 — PI Engine enhancement            | New — optional layers beyond DECF                    |

---

## Document Lineage

```
Master Plan (foundation)
  └── Iteration 2 (roster-aware DAGs, gates, complexity gating)
       └── Iteration 3 (identity sovereignty, Agent You lineage, dogfooding) ← YOU ARE HERE
            └── Iteration 4 (TBD — open questions, synthesis prep?)
                 └── Final Synthesis (consolidate everything into one definitive doc)
```
