# PI Personality Architecture — Dual-Resolution Role System

> **Status:** DESIGN
> **Date:** 2026-03-07
> **Scope:** PI personality integration, meta-archetype system, org tree modeling, executive org-builder, cognitive UX adaptation
> **Extends:** `docs/plans/2026-03-07-airlock-omnichannel-vault-grid-roles.md` (functional roles, vault grids)
> **Extends:** `docs/specs/roles/overview.md` (3-layer identity system, permission model)

---

## 1. Design Summary

The **Dual-Resolution System** integrates Predictive Index (PI) personality assessments into Airlock at two levels of granularity:

1. **Meta-Archetype (coarse signal)** — Determines _where_ you work: chamber affinity, team placement, functional role recommendation, org tree position
2. **Full PI Profile (fine signal)** — Determines _how_ you work: UX density, information structure, communication tone, AI autonomy defaults, cognitive compensation patterns

PI is an **input signal** (Layer 0) that feeds into the existing 3-layer identity system. It does not replace any layer — it recommends assignments that admins can accept or override.

```
Layer 0: PI Assessment
  ├── Meta-Archetype (Interpreter | Enforcer | Driver)
  │     → Chamber affinity (soft)
  │     → Functional role recommendation
  │     → Team composition analytics
  │     → Org tree placement suggestion
  │
  └── Full PI Profile (1 of 17)
        → Agentic role scoring (→ Layer 3)
        → UX cognitive preferences
        → AI autonomy defaults
        → Interface compensation patterns
        → Communication/notification style

Layer 1: Org Role (member | lead | director | executive)
Layer 2: Module Role (builder | gatekeeper | owner | designer | viewer)
Layer 3: Agentic Role (1 of 16 functional archetypes)
```

---

## 2. Meta-Archetypes — The Cognitive Posture System

### Three Postures

The 17 PI profiles collapse into three **cognitive postures** that map to the SENSE → DECIDE → VALIDATE cognitive flow:

| Meta-Archetype  | Cognitive Flow | Chamber Affinity | What They Do                                                      |
| --------------- | -------------- | ---------------- | ----------------------------------------------------------------- |
| **Interpreter** | SENSE          | Discover         | Sense-makers. Absorb information, find patterns, surface insights |
| **Driver**      | DECIDE         | Build + Ship     | Momentum-builders. Push work forward, execute, produce outputs    |
| **Enforcer**    | VALIDATE       | Review           | Rule-keepers. Verify, enforce standards, guard quality            |

### PI Profile → Meta-Archetype Mapping

#### Interpreters (SENSE) — Discovery-Native

| PI Profile        | PI Category | Behavioral Signature (A/B/C/D)    | Why Interpreter                                     |
| ----------------- | ----------- | --------------------------------- | --------------------------------------------------- |
| **Analyzer**      | Analytical  | Low A, Low B, High C, High D      | Systematic data absorption, methodical sense-making |
| **Strategist**    | Analytical  | High A, Low B, Low C, High D      | Pattern recognition across complex data sets        |
| **Scholar**       | Persistent  | Low A, Low B, High C, High D      | Deep research, knowledge synthesis                  |
| **Specialist**    | Analytical  | Low A, Low B, High C, Very High D | Precision-focused investigation, detail orientation |
| **Individualist** | Persistent  | High A, Low B, High C, High D     | Independent analysis, unique perspective generation |

**Chamber affinity:** Discover (intake, qualification, enrichment, research)
**Functional role fit:** Scout, Analyst, Intake Operator, Data Curator

#### Drivers (DECIDE) — Build/Ship-Native

| PI Profile       | PI Category | Behavioral Signature (A/B/C/D)         | Why Driver                                   |
| ---------------- | ----------- | -------------------------------------- | -------------------------------------------- |
| **Captain**      | Social      | High A, High B, Low C, Mid D           | Team mobilization, rapid decision-making     |
| **Venturer**     | Analytical  | Very High A, Low B, Very Low C, Low D  | Risk-tolerant execution, fast deployment     |
| **Maverick**     | Social      | Very High A, High B, Very Low C, Low D | Status-quo disruption, rapid prototyping     |
| **Persuader**    | Social      | High A, Very High B, Low C, Low D      | Stakeholder alignment, deal acceleration     |
| **Promoter**     | Social      | Mid A, Very High B, Very Low C, Low D  | Relationship-driven output, distribution     |
| **Collaborator** | Social      | Mid A, High B, High C, Mid D           | Cross-functional assembly, team coordination |
| **Adapter**      | Stabilizing | Mid A, Mid B, Mid C, Mid D             | Flexible execution, context-switching        |

**Chamber affinity:** Build (assembly, drafting, integration) + Ship (output, distribution, publishing)
**Functional role fit:** Drafter, Assembler, Integrator, Creative, Campaigner, Distributor, Publisher

#### Enforcers (VALIDATE) — Review-Native

| PI Profile     | PI Category | Behavioral Signature (A/B/C/D)    | Why Enforcer                                      |
| -------------- | ----------- | --------------------------------- | ------------------------------------------------- |
| **Guardian**   | Stabilizing | Low A, Low B, Very High C, High D | Process adherence, risk prevention, stability     |
| **Controller** | Analytical  | High A, Low B, Low C, Very High D | Authority enforcement, system control             |
| **Operator**   | Stabilizing | Low A, Low B, High C, Mid D       | Process optimization, workflow governance         |
| **Artisan**    | Stabilizing | Low A, Low B, High C, Mid D       | Craftsmanship quality standards, precision checks |
| **Altruist**   | Social      | Low A, High B, High C, Mid D      | Team welfare monitoring, consensus validation     |

**Chamber affinity:** Review (verification, approval, compliance, quality gates)
**Functional role fit:** Verifier, Approver, Auditor, Referee

### Why Three Postures Work

Every vault lifecycle needs all three:

- **Interpreters** discover and qualify the work (Discover chamber)
- **Drivers** build and ship the outputs (Build + Ship chambers)
- **Enforcers** validate and approve transitions (Review chamber)

A team missing any posture has a blind spot. The org-builder makes this visible.

---

## 3. PI → Agentic Role Scoring Matrix

The 17 PI profiles map to the existing 16 agentic roles via a weighted scoring matrix. Each cell represents fit (0.0–1.0). The highest-scoring agentic role becomes the default assignment.

### Scoring Matrix (Top Matches Highlighted)

| PI Profile ↓ / Agentic Role → | Truth Keeper | Sys Architect | Momentum Builder | Evidence Curator | Fast Path | Maverick Innovator | Verifier | Friction Taxonomist | Authority Validator | Cold Route Guardian | Semantic Sheriff | Process Facilitator | Compliance Analyst | Observer | Drift Detective | Team Orchestrator |
| ----------------------------- | ------------ | ------------- | ---------------- | ---------------- | --------- | ------------------ | -------- | ------------------- | ------------------- | ------------------- | ---------------- | ------------------- | ------------------ | -------- | --------------- | ----------------- |
| **Analyzer**                  | 0.6          | 0.5           | 0.2              | **0.9**          | 0.3       | 0.1                | 0.7      | 0.4                 | 0.5                 | 0.6                 | 0.7              | 0.3                 | **0.8**            | 0.7      | **0.8**         | 0.2               |
| **Strategist**                | 0.7          | **0.9**       | 0.5              | 0.6              | 0.4       | 0.6                | 0.5      | 0.5                 | 0.6                 | 0.5                 | 0.6              | 0.4                 | 0.5                | 0.6      | 0.7             | 0.3               |
| **Specialist**                | 0.7          | 0.6           | 0.2              | **0.8**          | 0.2       | 0.1                | **0.8**  | 0.4                 | 0.5                 | 0.6                 | **0.8**          | 0.3                 | **0.9**            | 0.7      | 0.7             | 0.1               |
| **Venturer**                  | 0.3          | 0.5           | **0.9**          | 0.3              | **0.8**   | 0.7                | 0.2      | 0.3                 | 0.4                 | 0.2                 | 0.2              | 0.4                 | 0.2                | 0.3      | 0.3             | 0.3               |
| **Scholar**                   | **0.8**      | 0.6           | 0.2              | 0.7              | 0.2       | 0.3                | 0.6      | 0.5                 | 0.4                 | 0.5                 | 0.7              | 0.3                 | 0.6                | **0.8**  | 0.7             | 0.2               |
| **Individualist**             | 0.7          | **0.8**       | 0.3              | 0.5              | 0.3       | **0.8**            | 0.5      | 0.6                 | 0.5                 | 0.5                 | 0.6              | 0.3                 | 0.4                | 0.6      | 0.7             | 0.2               |
| **Captain**                   | 0.5          | 0.5           | **0.9**          | 0.3              | 0.7       | 0.5                | 0.3      | 0.4                 | 0.6                 | 0.3                 | 0.3              | 0.5                 | 0.3                | 0.4      | 0.3             | 0.7               |
| **Persuader**                 | 0.3          | 0.3           | 0.7              | 0.3              | **0.9**   | 0.5                | 0.2      | 0.5                 | 0.3                 | 0.2                 | 0.2              | 0.6                 | 0.2                | 0.3      | 0.2             | 0.5               |
| **Promoter**                  | 0.3          | 0.2           | 0.7              | 0.2              | 0.7       | 0.4                | 0.2      | 0.5                 | 0.2                 | 0.1                 | 0.2              | **0.8**             | 0.2                | 0.3      | 0.2             | 0.6               |
| **Maverick**                  | 0.3          | 0.5           | 0.7              | 0.3              | 0.6       | **1.0**            | 0.2      | 0.4                 | 0.3                 | 0.2                 | 0.2              | 0.3                 | 0.2                | 0.4      | 0.4             | 0.3               |
| **Collaborator**              | 0.4          | 0.4           | 0.6              | 0.4              | 0.5       | 0.4                | 0.4      | 0.6                 | 0.3                 | 0.3                 | 0.3              | 0.7                 | 0.3                | 0.4      | 0.3             | **0.9**           |
| **Altruist**                  | 0.5          | 0.3           | 0.3              | 0.4              | 0.3       | 0.2                | 0.4      | **0.8**             | 0.3                 | 0.4                 | 0.3              | 0.6                 | 0.4                | 0.5      | 0.4             | **0.8**           |
| **Adapter**                   | 0.4          | 0.4           | 0.6              | 0.5              | 0.6       | 0.4                | 0.5      | 0.5                 | 0.4                 | 0.4                 | 0.4              | **0.7**             | 0.4                | 0.5      | 0.4             | 0.5               |
| **Guardian**                  | 0.6          | 0.4           | 0.2              | 0.5              | 0.2       | 0.1                | 0.7      | 0.5                 | 0.7                 | **1.0**             | 0.7              | 0.5                 | 0.7                | 0.6      | 0.6             | 0.3               |
| **Controller**                | 0.6          | 0.6           | 0.3              | 0.5              | 0.3       | 0.2                | 0.7      | 0.4                 | **0.9**             | 0.7                 | **0.8**          | 0.4                 | 0.6                | 0.5      | 0.6             | 0.2               |
| **Operator**                  | 0.4          | 0.4           | 0.4              | 0.4              | 0.5       | 0.2                | 0.6      | 0.5                 | 0.5                 | 0.6                 | 0.5              | **0.8**             | 0.6                | 0.6      | 0.5             | 0.4               |
| **Artisan**                   | 0.5          | 0.5           | 0.3              | 0.6              | 0.3       | 0.3                | **0.8**  | 0.5                 | 0.5                 | 0.6                 | 0.6              | 0.4                 | 0.7                | 0.6      | 0.6             | 0.2               |

### Default Agentic Role Assignments

| PI Profile    | Top Agentic Role    | Runner-Up           | Meta-Archetype |
| ------------- | ------------------- | ------------------- | -------------- |
| Analyzer      | Evidence Curator    | Drift Detective     | Interpreter    |
| Strategist    | System Architect    | Truth Keeper        | Interpreter    |
| Specialist    | Compliance Analyst  | Evidence Curator    | Interpreter    |
| Venturer      | Momentum Builder    | Fast Path Executor  | Driver         |
| Scholar       | Truth Keeper        | Observer            | Interpreter    |
| Individualist | System Architect    | Maverick Innovator  | Interpreter    |
| Captain       | Momentum Builder    | Team Orchestrator   | Driver         |
| Persuader     | Fast Path Executor  | Momentum Builder    | Driver         |
| Promoter      | Process Facilitator | Fast Path Executor  | Driver         |
| Maverick      | Maverick Innovator  | Momentum Builder    | Driver         |
| Collaborator  | Team Orchestrator   | Process Facilitator | Driver         |
| Altruist      | Team Orchestrator   | Friction Taxonomist | Enforcer       |
| Adapter       | Process Facilitator | Momentum Builder    | Driver         |
| Guardian      | Cold Route Guardian | Verifier            | Enforcer       |
| Controller    | Authority Validator | Semantic Sheriff    | Enforcer       |
| Operator      | Process Facilitator | Verifier            | Enforcer       |
| Artisan       | Verifier            | Compliance Analyst  | Enforcer       |

---

## 4. Cognitive UX Preferences — Per PI Profile

Each PI profile carries a **UX preference object** that adapts the Airlock interface. These are the "fine signal" — how the interface compensates for cognitive tendencies.

### UX Preference Schema

```typescript
interface PIUXPreferences {
  // Information presentation
  informationDensity: "minimal" | "moderate" | "dense";
  structurePreference: "hierarchical" | "narrative" | "visual" | "tabular";
  pacePreference: "deliberate" | "moderate" | "rapid";

  // Cognitive compensation (what the UI adds to cover weaknesses)
  compensationPatterns: string[];

  // Communication
  explanationStyle: "data-first" | "context-first" | "action-first";
  notificationFrequency: "batch-daily" | "periodic" | "real-time";
  feedbackPreference: "detailed-written" | "visual-summary" | "quick-status";

  // AI interaction
  defaultAutonomyLevel: 1 | 2 | 3 | 4 | 5; // L1=human-in-loop, L5=full-auto
  aiExplanationDepth: "brief" | "standard" | "detailed";
  aiConfirmationStyle: "always-ask" | "ask-on-risk" | "notify-only";

  // Panel layout
  defaultTriptychWeights: [number, number, number]; // Signal | Orchestrate | Control
  preferredPanelFocus: "signal" | "orchestrate" | "control";
}
```

### UX Profiles by PI Type

#### Analytical Profiles

**Analyzer** — _"Show me the data, let me process it systematically"_

```json
{
  "informationDensity": "dense",
  "structurePreference": "tabular",
  "pacePreference": "deliberate",
  "compensationPatterns": [
    "add_decision_deadlines",
    "show_progress_momentum_indicators",
    "surface_action_recommendations",
    "add_collaboration_prompts"
  ],
  "explanationStyle": "data-first",
  "notificationFrequency": "batch-daily",
  "feedbackPreference": "detailed-written",
  "defaultAutonomyLevel": 2,
  "aiExplanationDepth": "detailed",
  "aiConfirmationStyle": "always-ask",
  "defaultTriptychWeights": [25, 40, 35],
  "preferredPanelFocus": "orchestrate"
}
```

**Strategist** — _"Show me the big picture and let me direct the plan"_

```json
{
  "informationDensity": "moderate",
  "structurePreference": "hierarchical",
  "pacePreference": "moderate",
  "compensationPatterns": [
    "add_implementation_checklists",
    "show_team_sentiment_indicators",
    "surface_detail_level_warnings",
    "add_delegation_suggestions"
  ],
  "explanationStyle": "context-first",
  "notificationFrequency": "periodic",
  "feedbackPreference": "visual-summary",
  "defaultAutonomyLevel": 3,
  "aiExplanationDepth": "standard",
  "aiConfirmationStyle": "ask-on-risk",
  "defaultTriptychWeights": [30, 40, 30],
  "preferredPanelFocus": "signal"
}
```

**Specialist** — _"Give me depth. I need precision, not breadth"_

```json
{
  "informationDensity": "dense",
  "structurePreference": "hierarchical",
  "pacePreference": "deliberate",
  "compensationPatterns": [
    "add_broader_context_summaries",
    "show_impact_beyond_specialty",
    "surface_cross_team_dependencies",
    "add_flexibility_prompts"
  ],
  "explanationStyle": "data-first",
  "notificationFrequency": "batch-daily",
  "feedbackPreference": "detailed-written",
  "defaultAutonomyLevel": 2,
  "aiExplanationDepth": "detailed",
  "aiConfirmationStyle": "always-ask",
  "defaultTriptychWeights": [20, 50, 30],
  "preferredPanelFocus": "orchestrate"
}
```

**Venturer** — _"Cut to the chase. What's the fastest path?"_

```json
{
  "informationDensity": "minimal",
  "structurePreference": "visual",
  "pacePreference": "rapid",
  "compensationPatterns": [
    "add_risk_assessment_gates",
    "show_team_impact_warnings",
    "surface_compliance_requirements",
    "add_reflection_checkpoints"
  ],
  "explanationStyle": "action-first",
  "notificationFrequency": "real-time",
  "feedbackPreference": "quick-status",
  "defaultAutonomyLevel": 4,
  "aiExplanationDepth": "brief",
  "aiConfirmationStyle": "notify-only",
  "defaultTriptychWeights": [20, 55, 25],
  "preferredPanelFocus": "orchestrate"
}
```

#### Social Profiles

**Captain** — _"Show me the team, the mission, and the timeline"_

```json
{
  "informationDensity": "moderate",
  "structurePreference": "visual",
  "pacePreference": "rapid",
  "compensationPatterns": [
    "add_patience_indicators",
    "show_detail_coverage_gaps",
    "surface_quiet_team_voices",
    "add_process_compliance_checks"
  ],
  "explanationStyle": "action-first",
  "notificationFrequency": "real-time",
  "feedbackPreference": "visual-summary",
  "defaultAutonomyLevel": 4,
  "aiExplanationDepth": "standard",
  "aiConfirmationStyle": "ask-on-risk",
  "defaultTriptychWeights": [30, 40, 30],
  "preferredPanelFocus": "signal"
}
```

**Persuader** — _"Who needs to be influenced and what's the message?"_

```json
{
  "informationDensity": "moderate",
  "structurePreference": "narrative",
  "pacePreference": "rapid",
  "compensationPatterns": [
    "add_data_validation_prompts",
    "show_follow_through_tracking",
    "surface_analytical_gaps",
    "add_depth_before_breadth_nudges"
  ],
  "explanationStyle": "action-first",
  "notificationFrequency": "real-time",
  "feedbackPreference": "quick-status",
  "defaultAutonomyLevel": 4,
  "aiExplanationDepth": "brief",
  "aiConfirmationStyle": "notify-only",
  "defaultTriptychWeights": [25, 50, 25],
  "preferredPanelFocus": "orchestrate"
}
```

**Promoter** — _"Where are the people and how do I connect them?"_

```json
{
  "informationDensity": "minimal",
  "structurePreference": "narrative",
  "pacePreference": "rapid",
  "compensationPatterns": [
    "add_structured_task_lists",
    "show_detail_completion_tracking",
    "surface_analytical_requirements",
    "add_focus_mode_suggestions"
  ],
  "explanationStyle": "action-first",
  "notificationFrequency": "real-time",
  "feedbackPreference": "quick-status",
  "defaultAutonomyLevel": 5,
  "aiExplanationDepth": "brief",
  "aiConfirmationStyle": "notify-only",
  "defaultTriptychWeights": [35, 40, 25],
  "preferredPanelFocus": "signal"
}
```

**Maverick** — _"What's broken and what's the unconventional fix?"_

```json
{
  "informationDensity": "moderate",
  "structurePreference": "visual",
  "pacePreference": "rapid",
  "compensationPatterns": [
    "add_consensus_building_tools",
    "show_stakeholder_alignment_status",
    "surface_process_requirements",
    "add_completion_tracking"
  ],
  "explanationStyle": "action-first",
  "notificationFrequency": "real-time",
  "feedbackPreference": "visual-summary",
  "defaultAutonomyLevel": 4,
  "aiExplanationDepth": "brief",
  "aiConfirmationStyle": "ask-on-risk",
  "defaultTriptychWeights": [20, 55, 25],
  "preferredPanelFocus": "orchestrate"
}
```

**Collaborator** — _"Who's involved and how do we get aligned?"_

```json
{
  "informationDensity": "moderate",
  "structurePreference": "narrative",
  "pacePreference": "moderate",
  "compensationPatterns": [
    "add_individual_accountability_markers",
    "show_decision_urgency_timers",
    "surface_when_consensus_delays",
    "add_assertiveness_prompts"
  ],
  "explanationStyle": "context-first",
  "notificationFrequency": "periodic",
  "feedbackPreference": "visual-summary",
  "defaultAutonomyLevel": 3,
  "aiExplanationDepth": "standard",
  "aiConfirmationStyle": "ask-on-risk",
  "defaultTriptychWeights": [30, 35, 35],
  "preferredPanelFocus": "signal"
}
```

**Altruist** — _"How is everyone doing and what needs support?"_

```json
{
  "informationDensity": "moderate",
  "structurePreference": "narrative",
  "pacePreference": "moderate",
  "compensationPatterns": [
    "add_priority_ranking_tools",
    "show_personal_capacity_warnings",
    "surface_boundary_reminders",
    "add_delegation_suggestions"
  ],
  "explanationStyle": "context-first",
  "notificationFrequency": "periodic",
  "feedbackPreference": "visual-summary",
  "defaultAutonomyLevel": 2,
  "aiExplanationDepth": "standard",
  "aiConfirmationStyle": "always-ask",
  "defaultTriptychWeights": [35, 30, 35],
  "preferredPanelFocus": "control"
}
```

#### Stabilizing Profiles

**Guardian** — _"Show me the rules, the risks, and the compliance status"_

```json
{
  "informationDensity": "dense",
  "structurePreference": "hierarchical",
  "pacePreference": "deliberate",
  "compensationPatterns": [
    "add_innovation_opportunity_alerts",
    "show_when_flexibility_is_safe",
    "surface_team_morale_indicators",
    "add_speed_vs_quality_tradeoff_tools"
  ],
  "explanationStyle": "data-first",
  "notificationFrequency": "batch-daily",
  "feedbackPreference": "detailed-written",
  "defaultAutonomyLevel": 1,
  "aiExplanationDepth": "detailed",
  "aiConfirmationStyle": "always-ask",
  "defaultTriptychWeights": [25, 35, 40],
  "preferredPanelFocus": "control"
}
```

**Controller** — _"Who has authority, what are the rules, are they being followed?"_

```json
{
  "informationDensity": "dense",
  "structurePreference": "hierarchical",
  "pacePreference": "deliberate",
  "compensationPatterns": [
    "add_empathy_context_for_decisions",
    "show_team_sentiment_before_enforcement",
    "surface_flexibility_opportunities",
    "add_delegation_vs_control_prompts"
  ],
  "explanationStyle": "data-first",
  "notificationFrequency": "periodic",
  "feedbackPreference": "detailed-written",
  "defaultAutonomyLevel": 2,
  "aiExplanationDepth": "detailed",
  "aiConfirmationStyle": "always-ask",
  "defaultTriptychWeights": [25, 35, 40],
  "preferredPanelFocus": "control"
}
```

**Operator** — _"What's the process and how do I keep it running smoothly?"_

```json
{
  "informationDensity": "moderate",
  "structurePreference": "tabular",
  "pacePreference": "moderate",
  "compensationPatterns": [
    "add_strategic_context_summaries",
    "show_when_process_changes_needed",
    "surface_ownership_opportunities",
    "add_initiative_suggestion_prompts"
  ],
  "explanationStyle": "data-first",
  "notificationFrequency": "periodic",
  "feedbackPreference": "visual-summary",
  "defaultAutonomyLevel": 3,
  "aiExplanationDepth": "standard",
  "aiConfirmationStyle": "ask-on-risk",
  "defaultTriptychWeights": [25, 45, 30],
  "preferredPanelFocus": "orchestrate"
}
```

**Artisan** — _"Is the work done right? Show me the quality metrics"_

```json
{
  "informationDensity": "dense",
  "structurePreference": "hierarchical",
  "pacePreference": "deliberate",
  "compensationPatterns": [
    "add_deadline_urgency_indicators",
    "show_good_enough_vs_perfect_tradeoffs",
    "surface_team_pace_awareness",
    "add_scope_limitation_reminders"
  ],
  "explanationStyle": "data-first",
  "notificationFrequency": "batch-daily",
  "feedbackPreference": "detailed-written",
  "defaultAutonomyLevel": 2,
  "aiExplanationDepth": "detailed",
  "aiConfirmationStyle": "always-ask",
  "defaultTriptychWeights": [20, 50, 30],
  "preferredPanelFocus": "orchestrate"
}
```

#### Persistent Profiles

**Adapter** — _"What's needed right now? I'll adjust"_

```json
{
  "informationDensity": "moderate",
  "structurePreference": "visual",
  "pacePreference": "moderate",
  "compensationPatterns": [
    "add_personal_preference_anchoring",
    "show_consistency_tracking",
    "surface_when_flexibility_is_overextending",
    "add_identity_reinforcement_prompts"
  ],
  "explanationStyle": "context-first",
  "notificationFrequency": "periodic",
  "feedbackPreference": "visual-summary",
  "defaultAutonomyLevel": 3,
  "aiExplanationDepth": "standard",
  "aiConfirmationStyle": "ask-on-risk",
  "defaultTriptychWeights": [30, 40, 30],
  "preferredPanelFocus": "orchestrate"
}
```

---

## 5. AI Autonomy Levels — Per Meta-Archetype × Chamber

AI autonomy is determined by the intersection of the user's meta-archetype and the chamber they're working in. The user's PI profile fine-tunes within these bounds.

### Autonomy Level Definitions

| Level | Name                    | AI Behavior                                                   |
| ----- | ----------------------- | ------------------------------------------------------------- |
| L1    | Human-in-the-loop       | AI suggests, human decides every step                         |
| L2    | AI drafts               | AI creates draft, human reviews before any action             |
| L3    | AI acts, human confirms | AI executes low-risk actions, asks for confirmation on others |
| L4    | AI acts, human monitors | AI executes most actions, notifies human of outcomes          |
| L5    | Full autonomy           | AI executes all actions within permission scope, logs results |

### Default Autonomy Matrix

| Meta-Archetype × Chamber | Discover | Build | Review | Ship |
| ------------------------ | -------- | ----- | ------ | ---- |
| **Interpreter**          | L3       | L2    | L1     | L2   |
| **Driver**               | L4       | L4    | L2     | L3   |
| **Enforcer**             | L2       | L2    | L1     | L1   |

**Logic:**

- Interpreters trust AI in their home chamber (Discover) but want control in Review/Ship
- Drivers want speed everywhere but slow down for Review
- Enforcers are deliberate everywhere, especially in Review/Ship where they have authority

**Fine-tuning:** The PI profile's `defaultAutonomyLevel` adjusts within ±1 of the matrix value. A Guardian (Enforcer) in Review stays at L1. A Venturer (Driver) in Build can go to L5.

### Autonomy in Practice

```
Venturer (Driver) working in Build chamber:
  Matrix default: L4
  PI fine-tune: +1 → L5
  Effective: AI runs extraction, patches fields, resolves entities automatically
  Human gets: notification feed of AI actions + daily summary

Guardian (Enforcer) working in Review chamber:
  Matrix default: L1
  PI fine-tune: 0 → L1
  Effective: AI highlights items for review, surfaces evidence, suggests action
  Human decides: every approval, rejection, hold
```

---

## 6. Org Tree Model

### Schema

```sql
-- Department hierarchy
CREATE TABLE departments (
    id TEXT PRIMARY KEY,                     -- ULID
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    name TEXT NOT NULL,
    parent_department_id TEXT REFERENCES departments(id),  -- NULL = top-level
    description TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(workspace_id, name)
);

-- Team definitions within departments
CREATE TABLE teams (
    id TEXT PRIMARY KEY,                     -- ULID
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    department_id TEXT NOT NULL REFERENCES departments(id),
    name TEXT NOT NULL,
    team_type TEXT NOT NULL DEFAULT 'stream_aligned',  -- stream_aligned | platform | enabling
    description TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',   -- includes cognitive_distribution, gap_analysis
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(workspace_id, department_id, name)
);

-- Team membership with PI metadata
CREATE TABLE team_members (
    user_id TEXT NOT NULL REFERENCES users(id),
    team_id TEXT NOT NULL REFERENCES teams(id),
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    role_in_team TEXT NOT NULL DEFAULT 'member',  -- member | lead | advisor
    is_primary_team BOOLEAN NOT NULL DEFAULT true,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    assigned_by TEXT REFERENCES users(id),
    PRIMARY KEY (user_id, team_id)
);

-- PI assessment results (per user)
CREATE TABLE pi_assessments (
    id TEXT PRIMARY KEY,                     -- ULID
    user_id TEXT NOT NULL REFERENCES users(id),
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    pi_profile TEXT NOT NULL,               -- analyzer, guardian, captain, etc.
    meta_archetype TEXT NOT NULL,           -- interpreter, enforcer, driver
    behavioral_factors JSONB NOT NULL,      -- {"dominance": 0.7, "extraversion": 0.3, ...}
    ux_preferences JSONB NOT NULL,          -- Full PIUXPreferences object
    assessment_source TEXT NOT NULL DEFAULT 'admin_assigned', -- admin_assigned | self_reported | pi_verified
    assessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Only one active assessment per user per workspace
    UNIQUE(user_id, workspace_id)
);
```

### Org Tree Hierarchy

```
Workspace ("Acme Records")
  └── Department ("Legal & Business Affairs")
       ├── Team ("Contract Adjudication" — stream-aligned)
       │    ├── Interpreters
       │    │    ├── Jane (Analyzer → Evidence Curator) — Discover
       │    │    └── Bob (Strategist → System Architect) — Discover
       │    ├── Drivers
       │    │    ├── Sam (Captain → Momentum Builder) — Build
       │    │    └── Dev (Persuader → Fast Path Executor) — Build/Ship
       │    └── Enforcers
       │         ├── Tom (Guardian → Cold Route Guardian) — Review
       │         └── Lisa (Controller → Authority Validator) — Review
       │
       ├── Team ("Creative Services" — enabling)
       │    ├── Alex (Maverick → Maverick Innovator) — Ship
       │    └── Kim (Promoter → Process Facilitator) — Ship
       │
       └── Team ("Compliance" — platform)
            ├── Pat (Specialist → Compliance Analyst) — Review
            └── Jo (Artisan → Verifier) — Review

  └── Department ("Sales")
       └── Team ("Enterprise Sales" — stream-aligned)
            ├── Interpreters: [Ana (Scholar → Observer)]
            ├── Drivers: [Marcus (Venturer → Momentum Builder), Priya (Collaborator → Team Orchestrator)]
            └── Enforcers: [Wei (Operator → Process Facilitator)]
```

### Team Composition Analytics

Each team stores computed analytics in `teams.metadata`:

```json
{
  "cognitive_distribution": {
    "interpreters": 2,
    "drivers": 2,
    "enforcers": 2,
    "total": 6,
    "balance_score": 0.95
  },
  "chamber_coverage": {
    "discover": 2,
    "build": 2,
    "review": 2,
    "ship": 1,
    "gaps": ["ship"]
  },
  "pi_distribution": {
    "analyzer": 1,
    "strategist": 1,
    "captain": 1,
    "persuader": 1,
    "guardian": 1,
    "controller": 1
  },
  "risk_factors": [
    "Ship chamber has only 1 person — consider adding a Publisher or Creative",
    "No Adapter/Collaborator — team may struggle with cross-functional coordination"
  ]
}
```

---

## 7. Executive Org-Builder UI

### The Concept

Executives get a visual org composition tool — a React Flow canvas where they can see departments, teams, and members laid out by cognitive posture. They can drag users between teams, see gap alerts, and get AI recommendations for hires or reassignments.

### Org-Builder View (Admin Module)

```
+------------------------------------------------------------------+
| ORG BUILDER                     [Department ▼] [Team ▼] [Export] |
|------------------------------------------------------------------|
|                                                                    |
|  TEAM: Contract Adjudication                  Balance: 95%        |
|  Department: Legal & Business Affairs          Type: Stream-aligned|
|                                                                    |
|  ┌─────────────────────────────────────────────────────────────┐  |
|  │                    COGNITIVE POSTURE MAP                      │  |
|  │                                                               │  |
|  │  INTERPRETERS (SENSE)    DRIVERS (DECIDE)    ENFORCERS (VALID)│  |
|  │  ┌───────────────────┐  ┌──────────────────┐ ┌─────────────┐ │  |
|  │  │ 🔵 Jane           │  │ 🟢 Sam           │ │ 🟣 Tom      │ │  |
|  │  │ Analyzer           │  │ Captain           │ │ Guardian     │ │  |
|  │  │ Evidence Curator   │  │ Momentum Builder  │ │ Cold Route   │ │  |
|  │  │ Chamber: Discover  │  │ Chamber: Build    │ │ Chamber: Rev │ │  |
|  │  │                    │  │                    │ │              │ │  |
|  │  │ 🔵 Bob            │  │ 🟢 Dev           │ │ 🟣 Lisa     │ │  |
|  │  │ Strategist         │  │ Persuader         │ │ Controller   │ │  |
|  │  │ System Architect   │  │ Fast Path Exec    │ │ Auth Valid   │ │  |
|  │  │ Chamber: Discover  │  │ Chamber: Build    │ │ Chamber: Rev │ │  |
|  │  └───────────────────┘  └──────────────────┘ └─────────────┘ │  |
|  │                                                               │  |
|  │  CHAMBER COVERAGE                                             │  |
|  │  Discover ██████████ 2    Build ██████████ 2                  │  |
|  │  Review   ██████████ 2    Ship  █████░░░░░ 1  ⚠ GAP          │  |
|  │                                                               │  |
|  │  GAP ANALYSIS                                                 │  |
|  │  ⚠ Ship chamber underrepresented (1/6 members)               │  |
|  │  💡 Recommendation: Add a Creative or Publisher role          │  |
|  │  💡 Best PI fit for gap: Promoter or Collaborator             │  |
|  └─────────────────────────────────────────────────────────────┘  |
|                                                                    |
|  ┌─────────────────────────────────────────────────────────────┐  |
|  │ AVAILABLE MEMBERS (drag to add)                              │  |
|  │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │  |
|  │ │ Alex     │ │ Kim      │ │ Robin    │ │ Casey    │        │  |
|  │ │ Maverick │ │ Promoter │ │ Adapter  │ │ Collab.  │        │  |
|  │ │ Driver   │ │ Driver   │ │ Driver   │ │ Driver   │        │  |
|  │ │ Ship ✓   │ │ Ship ✓   │ │ Flex     │ │ Flex     │        │  |
|  │ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │  |
|  └─────────────────────────────────────────────────────────────┘  |
|                                                                    |
+------------------------------------------------------------------+
```

### Org-Builder Features

1. **Posture Map** — Three-column layout showing team members grouped by meta-archetype. Drag-and-drop between columns updates role suggestions.

2. **Chamber Coverage Bar** — Visual indicator showing how many team members have affinity to each chamber. Highlights gaps.

3. **Gap Analysis** — AI-powered recommendations based on team composition:
   - Missing postures (no Enforcers = quality risk)
   - Chamber gaps (no Ship coverage = output bottleneck)
   - PI diversity alerts (too many of same profile = groupthink risk)
   - Recommended PI profiles to fill gaps

4. **Available Members Pool** — Draggable cards for unassigned or cross-team members. Filtered by department or workspace. Green badge if they fill a gap.

5. **Team Comparison** — Side-by-side view of two teams' cognitive distributions. Useful for merging or splitting teams.

6. **Historical View** — How team composition has changed over time. Spot trends (losing all Interpreters = problem).

### Org-Builder API

```python
# GET /api/v1/workspaces/{ws_id}/org-tree
# Returns full department → team → member hierarchy with PI metadata

# GET /api/v1/workspaces/{ws_id}/teams/{team_id}/composition
# Returns team composition analytics (posture distribution, gaps, recommendations)

# POST /api/v1/workspaces/{ws_id}/teams/{team_id}/members
# Add member to team (with optional role_in_team)

# DELETE /api/v1/workspaces/{ws_id}/teams/{team_id}/members/{user_id}
# Remove member from team

# GET /api/v1/workspaces/{ws_id}/teams/{team_id}/gap-analysis
# AI-powered gap analysis with hire recommendations

# POST /api/v1/workspaces/{ws_id}/users/{user_id}/pi-assessment
# Record PI assessment results, triggers role recommendation
```

---

## 8. PI Assessment Flow

### How Users Get Assessed

```
Admin assigns PI profile to user
  OR User takes PI assessment (external link)
  OR PI results imported via linked role connection (HR system)
       ↓
PI profile stored in pi_assessments table
       ↓
System computes:
  1. Meta-archetype (Interpreter/Enforcer/Driver)
  2. Top agentic role (from scoring matrix)
  3. Chamber affinity (from meta-archetype)
  4. UX preferences (from PI profile lookup)
  5. Functional role suggestion (from chamber + module)
       ↓
Admin reviews recommendations
  - Accept defaults
  - Override any assignment
  - Assign functional role manually
       ↓
User's identity layers updated:
  Layer 0: PI profile + meta-archetype (stored)
  Layer 3: Agentic role (assigned, possibly overridden)
  UX: Cognitive preferences active
  Vault grids: Default to chamber-affinity layout
```

### PI Assessment in User Profile (Admin View)

```
┌──────────────────────────────────────────┐
│ Sam Chen — PI Assessment                 │
├──────────────────────────────────────────┤
│ PI Profile: Captain                      │
│ Meta-Archetype: Driver (DECIDE)          │
│ Assessment: Admin-assigned (2026-03-05)  │
│                                          │
│ BEHAVIORAL FACTORS                       │
│ Dominance (A):    ████████░░ High        │
│ Extraversion (B): ████████░░ High        │
│ Patience (C):     ███░░░░░░░ Low         │
│ Formality (D):    █████░░░░░ Mid         │
│                                          │
│ RECOMMENDED ASSIGNMENTS                  │
│ Agentic Role: Momentum Builder (0.9)     │
│ Chamber Affinity: Build                  │
│ Functional Role: Assembler (Contracts)   │
│                       or                 │
│                  Prospector (CRM)        │
│                                          │
│ AI AUTONOMY: L4 (AI acts, human monitors)│
│ UX: Moderate density, visual, rapid pace │
│                                          │
│ [Accept Recommendations] [Override]      │
└──────────────────────────────────────────┘
```

---

## 9. How This Connects to Existing Architecture

### No Breaking Changes

| Existing System        | Change                                                  |
| ---------------------- | ------------------------------------------------------- |
| Layer 1: Org Role      | No change. PI may suggest org level but doesn't set it  |
| Layer 2: Module Role   | No change. Still the primary permission mechanism       |
| Layer 3: Agentic Role  | **Enhanced.** PI scoring matrix recommends assignment   |
| Custom Roles           | No change. Functional roles are custom roles + metadata |
| Permission Computation | No change. PI doesn't affect permissions, only UX       |
| Vault Grid             | **Enhanced.** Default grid varies by PI profile         |
| Gates & Chambers       | No change. PI creates soft affinity, not hard gating    |
| Admin Members Page     | **Enhanced.** Shows PI profile, meta-archetype badge    |

### New Tables

| Table            | Purpose                                            |
| ---------------- | -------------------------------------------------- |
| `departments`    | Org hierarchy (department → sub-department)        |
| `teams`          | Teams within departments with composition metadata |
| `team_members`   | User ↔ team junction with role and primary flag    |
| `pi_assessments` | PI profile + behavioral factors + UX preferences   |

### New API Endpoints

| Endpoint                                              | Purpose                        |
| ----------------------------------------------------- | ------------------------------ |
| `GET /org-tree`                                       | Full org hierarchy             |
| `POST /users/{id}/pi-assessment`                      | Record PI results              |
| `GET /teams/{id}/composition`                         | Team cognitive analytics       |
| `GET /teams/{id}/gap-analysis`                        | AI-powered gap recommendations |
| `CRUD /departments`, `CRUD /teams`                    | Org structure management       |
| `POST /teams/{id}/members`, `DELETE .../members/{id}` | Team membership management     |

### New Frontend Components

| Component            | Location              | Purpose                                         |
| -------------------- | --------------------- | ----------------------------------------------- |
| `OrgBuilder`         | Admin module          | Visual team composition editor (React Flow)     |
| `PostureMap`         | Admin module          | Three-column cognitive posture visualization    |
| `ChamberCoverageBar` | Admin module, Profile | Bar chart of chamber representation             |
| `GapAnalysisPanel`   | Admin module          | AI-generated team composition recommendations   |
| `PIProfileBadge`     | User cards, profiles  | Small badge showing PI profile + meta-archetype |
| `PIAssessmentForm`   | Admin user detail     | Form to enter/override PI assessment            |
| `UXPreferencesPanel` | User settings         | Shows/overrides cognitive UX preferences        |

---

## 10. Implementation Phases

### Phase 1: PI Foundation (Database + Assessment)

- Create `pi_assessments` table and API endpoints
- Add PI profile + meta-archetype fields to user model
- Build PI assessment admin form
- Store UX preferences per user
- Add `PIProfileBadge` component to user cards

### Phase 2: Org Tree (Departments + Teams)

- Create `departments`, `teams`, `team_members` tables
- Build CRUD API for org hierarchy
- Build basic org tree view in admin module
- Team membership management

### Phase 3: Cognitive UX Layer

- Implement UX preference engine (reads PI preferences, adjusts UI)
- Chamber affinity indicators in navigation
- Default vault grid selection by PI profile
- Notification frequency adjustment
- Information density toggle

### Phase 4: Org-Builder

- Build React Flow-based org-builder canvas
- Posture map visualization
- Chamber coverage bars
- Drag-and-drop team composition
- Gap analysis (rule-based first, AI-powered later)

### Phase 5: AI Autonomy Integration

- Implement autonomy level computation (meta-archetype × chamber)
- Per-PI fine-tuning of autonomy bounds
- Otto behavior adaptation per autonomy level
- Audit logging of AI autonomous actions

---

## 11. Relationship to Existing Work

| Work Item                               | Relationship                                                  |
| --------------------------------------- | ------------------------------------------------------------- |
| Omni-channel vault grid roles (planned) | This doc extends it with PI layer. Functional roles stay.     |
| Role architecture spec (specced)        | PI is Layer 0 feeding into existing Layers 1-3. No conflicts. |
| Entity resolution (in-progress)         | Independent. Different engine layer.                          |
| Workflow builder (specced)              | Org-builder reuses React Flow. No conflicts.                  |
| Demo readiness (in-progress)            | PI is post-demo. Can seed mock PI profiles for demo users.    |
| Admin module (in-progress)              | Org-builder is a new admin tab. Extends, doesn't replace.     |

---

## 12. Open Questions

- [ ] Should PI assessment be a first-class onboarding step or a background admin action?
- [ ] Should users see their own PI profile and meta-archetype, or is this admin-only?
- [ ] How do we handle users who strongly disagree with their PI-recommended role?
- [ ] Should the org-builder be available to Directors (not just Executives)?
- [ ] Do we build a simplified PI questionnaire in-app, or always rely on external PI assessment?
- [ ] Should teams have a maximum recommended size based on cognitive load theory?
- [ ] How do we handle the Altruist edge case — categorized as Enforcer but has strong Social/Driver traits?
