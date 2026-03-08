# Generative UI: Cognitive-Adaptive Omni-Stream Interfaces

> **Status:** Vision
> **Owner:** Zac
> **Created:** 2026-03-08
> **Platform Split:** Airlock (shell/frontend/rendering) + OrchestrateOS (backend/engine/profiling)

---

## Vision

Airlock becomes a **generative interface platform** where AI assembles role-specific, personality-aware UIs from a component library, scoped by chamber and modulated by positive friction appropriate to the chamber and the user's cognitive profile.

**The problem:** Static screens serve every user the same layout regardless of role, cognitive style, or task context. Research shows adaptive interfaces produce 18.6% faster task completion, 47.8% fewer errors, and 34.9% higher satisfaction vs static UIs (Human-Centered Deep Reinforcement Learning banking study, 2025). A nuclear power plant study confirmed MBTI-tailored interfaces reduce reaction times and error rates in high-stakes environments.

**The thesis:** With the right teams, the right chemistry, and the right structure, work is repeatable and measurably more effective. Airlock proves this by learning WHO should be in each chamber, WHAT interface they need, and HOW to nudge them based on their behavioral profile.

**Core metaphors:**

| Term            | Definition                                                                                                                                                                                                      |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Stream**      | The unified data flow for a vault. Everything about a vault lives in the Stream. The Discord "server" analogy — the unified data conduit where all information flows in and out, validated through the airlock. |
| **Conductor**   | A chamber-dedicated role that configures AI skills, UI tools, and friction checkpoints for the people working in that chamber. Orchestrates the instruments.                                                    |
| **Lens**        | A personality/role-specific UI configuration applied to a user's view. Determined by cognitive profile, role, and behavioral signals.                                                                           |
| **Render Spec** | A2UI-style JSON component tree that Otto produces for Airlock's frontend to render. Declarative, not executable.                                                                                                |

**Platform responsibilities:**

| Layer             | Component       | Responsibility                                                                                                 |
| ----------------- | --------------- | -------------------------------------------------------------------------------------------------------------- |
| **Airlock**       | Shell, frontend | Component library, rendering engine, Conductor UI, behavioral signal collection, Lens application              |
| **OrchestrateOS** | Backend, engine | Assessment engine, cognitive profiling, behavioral signal processing, Otto agent logic, Render Spec generation |

---

## Part I: Industry Landscape (2025-2026)

### The Emerging Protocol Stack

Six complementary open protocols now define how AI agents interact with UIs, tools, and each other:

| Protocol                  | Layer                 | Transport            | Primary Use                                          | Status                                     |
| ------------------------- | --------------------- | -------------------- | ---------------------------------------------------- | ------------------------------------------ |
| **W3C AI Agent Protocol** | Agent-to-agent        | HTTP                 | Capability discovery, agent identity, task lifecycle | Draft spec, ratification 2026-2027         |
| **MCP** (Anthropic)       | Host-to-tool          | JSON-RPC / SSE       | Tool execution, resource access                      | Production                                 |
| **MCP Apps / MCP-UI**     | Tool result rendering | Sandboxed iframe     | Interactive UI returned from tool calls              | Production (Nov 2025), Anthropic + Shopify |
| **AG-UI** (CopilotKit)    | Agent-to-frontend     | HTTP / binary events | Real-time state sync, 17 event types                 | Production v1.5                            |
| **A2UI** (Google)         | Agent-to-UI           | JSONL stream         | Declarative component specification                  | Spec v0.9 (Dec 2025)                       |
| **A2A** (Google)          | Agent-to-agent        | HTTP                 | Multi-agent coordination                             | Production                                 |

### Production Implementations

**Server-Driven UI (SDUI)** — The most mature pattern (5+ years). Airbnb's Ghost platform, Shopify's Shop App, Instagram, and Netflix all use SDUI where the server sends structured JSON component trees and the client renders from a pre-registered component catalog. The server/agent never sends executable code. Key principles: component registry on the client, declarative JSON payloads, versioned action schemas, backward compatibility.

**Google A2UI** (December 2025) — The most significant recent development. A declarative JSON format where AI agents describe interfaces using a catalog of pre-approved component types. Critical design decisions: not executable code, flat component list with ID references (efficient for LLM streaming), framework-agnostic, catalog-based security (agent can only request registered component types).

**CopilotKit + AG-UI** — The closest production-ready "AI agent renders UI in your app" stack. Three generative UI patterns:

1. **Static** (high control) — frontend owns all UI, agent selects which component to show via `useFrontendTool`
2. **Declarative** (shared control) — agent returns structured JSON spec, frontend maps to native components
3. **Open-ended** (low control) — agent returns full UI surface in sandboxed iframe

**Shopify MCP-UI** — Tools return interactive UI via sandboxed iframes communicating through `postMessage`. Components emit named intents (`view_details`, `checkout`) rather than executing code directly, preserving agent control while enabling rich interaction.

**shadcn MCP Server** (August 2025) — Component registry exposed directly to AI agents via MCP. AI interprets "add a login form" and translates to registry commands. Namespaced registries support multiple sources (org private + public shadcn + third-party).

**Vercel AI SDK Generative UI** — Tools map to React components via `useChat` + `streamText`. Tool invocations are typed per-tool in SDK 5.0+. RSC approach (streamUI) paused; tool-calling approach stable.

**Tambo** — Open-source toolkit where components are registered with Zod schemas as tool definitions. LLM calls tool, Tambo validates structured output against schema, streams props to React. Two component types: Generative (render once) and Interactable (stateful).

### The Converging Architecture

All production implementations converge on the same pattern:

```
User Context (role + chamber + cognitive profile + behavioral signals)
    |
    v
Otto / OrchestrateOS (decides what to render based on full context)
    |
    v
Render Spec (A2UI-style JSON -- NOT executable code)
    |
    v
Component Registry (catalog of trusted, typed, accessible components)
    |  Airlock client-side renderer maps type -> React component
    v
Headless Primitives (Radix -- a11y, keyboard, focus baked in)
    |
    v
Tailwind Token Styling (chamber colors, OLED dark palette)
    |
    v
Rendered View (personalized to this user, this chamber, this moment)
```

### Three-Tier Guardrail Model

1. **Catalog Constraint** (Structural) — Agent can only reference components registered in the catalog. Any reference to an unlisted component is rejected before rendering. (A2UI pattern)
2. **Schema Validation** (Data) — Every component invocation validated against Zod/JSON Schema before render. Malformed or out-of-range prop values caught before reaching the DOM. (Tambo, CopilotKit)
3. **Intent Mediation** (Behavioral) — Components do not directly modify state or execute business logic. They emit named intents that the host agent interprets and routes. The agent remains the single point of action execution. (Shopify MCP-UI)

Accessibility is a non-negotiable constraint: color contrast ratios, touch target sizes, and ARIA roles are encoded into the component catalog itself, so agents inheriting the catalog get WCAG compliance by default.

---

## Part II: Positive Friction Framework

### The Case for Intentional Friction

The dominant UX paradigm treats friction as the enemy. But in enterprise contexts where a single misrouted approval or unsigned clause costs real money, frictionless design becomes a liability. Positive friction refers to deliberate, benefit-led interruptions that improve decision outcomes: confirmation dialogs, progressive disclosure gates, and forced reflection points.

High-performing organizations accept friction early to protect decisions, manage risk, and avoid expensive mistakes. A meta-analysis of nudge treatment effects found that nudges creating "opportunities for reflection" (System 2 engagement) achieved a mean Cohen's d of 0.329 with 65% reaching statistical significance.

### System 1 / System 2 Zones by Chamber

Daniel Kahneman's dual-process model: System 1 is fast, automatic, intuitive; System 2 is slow, deliberate, analytical. Enterprise UX should design for System 1 in routine navigation while deliberately triggering System 2 at decision points that carry consequence.

| Chamber       | Cognitive Mode                                     | Friction Level                                     | Design Pattern                                                                              |
| ------------- | -------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Discovery** | System 1 -- fast exploration, pattern recognition  | Low friction, high optionality                     | Search-heavy, tag browsing, visual previews, concept linking                                |
| **Build**     | Mixed -- structured assembly with creative moments | Medium friction, guided construction               | Templates, inline validation, progressive form disclosure                                   |
| **Review**    | System 2 -- deliberate critical evaluation         | High friction, forced reflection                   | Side-by-side diffs, anomaly highlights, attestation gates, audit trails                     |
| **Ship**      | System 2 at commit, System 1 after                 | Maximum friction at approval, fast execution after | Final confirmation, rollback windows, consequence summaries, one-click deploy post-approval |

### Adaptive Friction by Cognitive Type

Friction tolerance varies by cognitive profile. Si-Te users (high Formality PI) **prefer** more gates -- removing friction reduces their trust. Ne-Ti users (low Patience PI) experience standard dialogs as frustrating interruptions.

| Cognitive Profile                | Friction Strategy                                                                                    |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **High-Formality / Si users**    | Full progressive disclosure, multi-step confirmation, visible audit trail at every gate              |
| **High-Dominance / Te users**    | Streamlined confirmations with consequence summaries, batch-approval, minimal steps + clear rollback |
| **High-Patience / Ti users**     | Deep-review panels with expandable detail, no time pressure, analytical comparison tools             |
| **High-Extraversion / Fe users** | Collaborative review surfaces, team-visible approval chains, social proof indicators                 |

### Nudge Categories for Enterprise Workflows

Drawing from Thaler and Sunstein's Nudge Theory (2008):

- **Commitment devices** -- require users to explicitly confirm review completion before advancing
- **Salience** -- bold visual treatment for deadline-critical fields, risk indicators, deviation alerts
- **Default structuring** -- pre-select safest option in approval flows, allow override with explicit justification
- **Reflection opportunities** -- System 2 engagement nudges at consequence-bearing decision points

### The Zuboff Inversion

Shoshana Zuboff's critique of surveillance capitalism describes how frictionless digital environments automate user behavior toward others' profitable outcomes. The enterprise design inversion reclaims friction as a tool for **user agency** rather than compliance extraction. Don't let AI auto-approve documents without a human reflection point. The friction is the mechanism that preserves institutional knowledge and accountability.

---

## Part III: Cognitive Function to UI Preference Mapping

### The Eight Jungian Cognitive Functions

Carl Jung's theory identifies eight cognitive functions organized into perceiving (how we gather information) and judging (how we evaluate it), each with extraverted and introverted orientations:

| Function                       | Processing Style                                               | Predicted UI Preferences                                                                                |
| ------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Se** (Extraverted Sensing)   | Immediate sensory detail, present-focused, action-oriented     | High-fidelity visuals, real-time data, interactive elements, dense actionable dashboards                |
| **Si** (Introverted Sensing)   | Detail-oriented, past-referencing, sequential, tradition-aware | Structured layouts, step-by-step workflows, comparison views (current vs historical), familiar patterns |
| **Ne** (Extraverted Intuition) | Pattern-connecting, possibility-exploring, divergent           | Freeform navigation, search-over-browse, linked concept maps, tag-based exploration                     |
| **Ni** (Introverted Intuition) | Pattern-synthesizing, future-oriented, overview-first          | Dashboard summaries, trend visualizations, minimal detail with drill-down, strategic overview panels    |
| **Te** (Extraverted Thinking)  | Organizing external systems, efficiency-driven, metric-focused | KPI dashboards, structured hierarchies, sortable/filterable tables, clear action buttons                |
| **Ti** (Introverted Thinking)  | Internal logic frameworks, precision-seeking, analytical       | Customizable views, raw data access, logical groupings, configuration-heavy interfaces                  |
| **Fe** (Extraverted Feeling)   | Social harmony, collaborative, people-impact-aware             | Team activity feeds, shared workspaces, @mention systems, approval chain visibility                     |
| **Fi** (Introverted Feeling)   | Values-driven, authenticity-seeking, individual impact         | Personalized views, annotation/commenting tools, impact statements, ethical review flags                |

### Primary Design Targets

Analysis of 18,264 professionals across 30 studies found the most prevalent cognitive function pairs in tech:

| Profile                               | % of Tech Workers | Highest-Leverage Adaptation                                                             | Complexity |
| ------------------------------------- | ----------------- | --------------------------------------------------------------------------------------- | ---------- |
| **Ni-Te** (INTJ/ENTJ -- strategists)  | 33.67%            | Overview dashboards with drill-down, trend lines, strategic summaries                   | Medium     |
| **Ti-Ne** (INTP/ENTP -- analysts)     | 21.73%            | Raw data access, customizable columns, search-first navigation, logical groupings       | Medium     |
| **Si-Te** (ISTJ/ESTJ -- operators)    | 13.09%            | Step-by-step checklists, comparison views, audit trails, consistent familiar layouts    | Low        |
| **Fe-Ni** (ENFJ/INFJ -- coordinators) | ~8%               | Team activity feeds, stakeholder impact views, approval chain visualization             | Medium     |
| **Se-Ti** (ESTP/ISTP -- tacticians)   | ~6%               | Real-time status boards, quick-action toolbars, dense data with immediate actionability | Low        |

These five profiles cover ~83% of enterprise tech platform users. Designing Lenses for these five covers the vast majority of the user base.

### Predictive Index Drives Cross-Reference

PI's four behavioral drives map to cognitive function preferences, enabling cross-framework profiling:

| PI Configuration                 | MBTI Analog                                | UI Pattern                                                                    |
| -------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------- |
| High Dominance, Low Patience     | Te-dominant (ENTJ/ESTJ)                    | Action-oriented dashboards, quick-decision interfaces, minimal confirmations  |
| Low Dominance, High Formality    | Si-dominant (ISTJ/ISFJ)                    | Rule-adherent workflows, audit trails, checklists, structured approval gates  |
| High Extraversion, Low Formality | Ne/Fe-dominant (ENFP/ENTP)                 | Collaborative spaces, freeform exploration, social activity feeds             |
| Low Extraversion, High Patience  | Ti/Si-dominant (INTP/ISTJ)                 | Deep-analysis panels, customizable data views, stable/predictable layouts     |
| PI Artisan profile               | Si-Te (meticulous, deliberate, craft)      | Precision tooling interfaces, configuration panels, quality-focused views     |
| PI Guardian profile              | Si + high Formality (stability, structure) | Compliance dashboards, rule-engine views, deviation alerts                    |
| PI Operator profile              | Low A, Low B, High C (process-oriented)    | Repeatable system views, supportive management dashboards, process monitoring |

---

## Part IV: Adaptive Interface Architectures

### Germanakos Comprehensive User Profile Framework

Panagiotis Germanakos developed a comprehensive user profile model integrating cognitive parameters -- cognitive styles, personality traits, and perceptual preferences -- as core elements of adaptive systems. The Ontological Cognitive User Model (OCUM) operates through three layers:

1. **User Profile Layer** -- models cognitive typologies as semantically defined objects
2. **Adaptation Layer** -- maps profiles to content transformations and interface adaptations
3. **Web Content Layer** -- executes presentation changes

Research demonstrated users interacting with adapted interfaces showed improved task accuracy, performance, and satisfaction compared to non-adapted versions. This three-layer architecture provides a direct template for enterprise adaptive UI.

### Reinforcement Learning for Adaptive Enterprise UI

A Human-Centered Deep Reinforcement Learning (HC-DRL) framework models UI adaptation as a constrained sequential decision-making process. The reward function explicitly maximizes task success and efficiency while accounting for user satisfaction, cognitive load, trust, perceived control, and disruption penalties. Safety guardrails enforce accessibility and usability constraints.

A banking implementation demonstrated: **18.6% reduction in task completion time, 47.8% reduction in errors, 34.9% increase in satisfaction** vs static interfaces. The system adapts layout, navigation, feature prominence, interaction patterns, and notification strategies based on user demographics, behavioral history, and current session data.

### Industry 5.0 Human Digital Twin

Industry 5.0's human-centric paradigm introduces the Human Digital Twin (HDT) -- a persistent digital replica capturing skills, cognitive characteristics, and behavioral patterns. For enterprise software, this translates to a persistent user cognitive profile that evolves through interaction data, declared preferences, and periodic assessment. The user's "cognitive twin" travels with them through the platform.

### Neuroadaptive Systems

Neuroadaptive AI systems dynamically adjust interface complexity based on cognitive load. When elevated stress is detected: hide extra widgets, reduce decision branches, lower text density, pause non-critical functions. When users are focused: surface advanced controls, deeper insights, harder tasks. This creates situation-smart personalization adapting not just to WHO the user is but to HOW they're performing right now.

### Nielsen Norman Group Guardrails

The core guardrail: interfaces must classify information as **must show / should show / never show**. Even as content is dynamic, familiar positional conventions (nav top-left, actions top-right) must be preserved. Inconsistency breaks spatial memory and forces relearning, which can erode personalization benefits.

---

## Part V: The Conductor Role

### Definition

A **Conductor** sits inside a specific chamber and configures AI skills, UI tools, and positive friction checkpoints so that the people working in that chamber perform at their best. They are orchestrators, not primary operators.

**PI Profile Basis:** Artisan/Operator blend -- craft depth + process architecture + service orientation. The Operator is the only PI profile described as a leader who focuses on "helping others accomplish tasks" rather than on strategic direction or technical output.

### Role Hierarchy

```
Existing module roles:  Builder -> Gatekeeper -> Owner
New cross-cutting role: Conductor (per-chamber, per-module)
```

The Conductor is not a promotion from Builder -- it's a parallel track for people whose strength is equipping others rather than doing the primary work themselves.

### Responsibilities

- Configure skills that render as UI elements within their chamber
- Tune component layouts and data views for different cognitive types in the chamber
- Create prompt templates that drive Otto's UI assembly for their chamber
- Set positive friction checkpoints (forced reflection gates, confirmation patterns, commitment devices)
- Monitor interaction patterns and iterate on configurations
- Serve as the bridge between what the platform CAN render and what chamber users NEED

### Chamber-Specific Examples

| Chamber       | Conductor Focus                                                                      |
| ------------- | ------------------------------------------------------------------------------------ |
| **Discovery** | Intake tools, triage boards, entity resolution views, search configurations          |
| **Build**     | Template editors, patch workflows, validation rules, progressive disclosure settings |
| **Review**    | Comparison views, attestation gates, anomaly highlighting, audit trail depth         |
| **Ship**      | Export checklists, rollback windows, distribution tools, consequence summaries       |

---

## Part VI: The Assessment Flywheel

### The Core Loop

The platform doesn't just process work -- it optimizes WHO does the work and HOW they experience it.

```
Assess -> Place -> Equip -> Observe -> Optimize -> Re-place
   ^                                                 |
   +------------------ continuous loop --------------+
```

1. **Assess** -- Airlock's custom behavioral/cognitive assessment. Blends PI-style drives with cognitive function profiling and role-fit scoring. Enterprises administer on onboarding.
2. **Place** -- Based on assessment + org role, Airlock recommends which chamber(s) and module(s) the user should operate in. A Maverick → Discovery. A Guardian → Review. An Artisan/Operator → Conductor.
3. **Equip** -- The Conductor (or Otto, initially) assembles the right UI Lens for that user in that chamber. Skills render as UI elements tuned to their cognitive style.
4. **Observe** -- Behavioral signals flow back: dwell times, interaction patterns, skip rates, error rates, completion velocity. Positive friction checkpoints capture decision quality.
5. **Optimize** -- Otto adjusts the interface and nudge strategy per cognitive profile. Information density, navigation patterns, friction intensity all modulate.
6. **Re-place** -- Over time, the platform suggests role rotations. "This user performs 2x better in Build than Review -- consider reassignment." Proves the model that right person + right position = measurably higher output.

### Minimum Viable Personality Signals

Ranked by signal-to-effort ratio. A production system doesn't need a full assessment to begin adaptation:

| #   | Signal                       | Cost                     | What It Reveals                                                                |
| --- | ---------------------------- | ------------------------ | ------------------------------------------------------------------------------ |
| 1   | Declared role + chamber      | Zero                     | Cognitive demands of their position                                            |
| 2   | Information density toggle   | One toggle               | Sensing-heavy vs Intuition-heavy                                               |
| 3   | Navigation pattern (passive) | 3-5 sessions observation | Browse-heavy (Si/Se) vs search-heavy (Ne/Ni)                                   |
| 4   | Decision speed (passive)     | Passive observation      | System 1 dominant (high Dominance PI) vs System 2 dominant (high Formality PI) |
| 5   | PI Behavioral Assessment     | If org provides          | Four validated behavioral drives                                               |
| 6   | Self-declaration             | Optional onboarding      | "I prefer overview-first / detail-first"                                       |

### Personality-Aware Otto Nudges

| Profile Type             | Best Chamber Fit | Otto Nudge Strategy                                                                                              |
| ------------------------ | ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| Innovator/Maverick       | Discovery        | "Capture your reasoning before moving on." Force documentation on someone who never will voluntarily.            |
| Guardian/Detail-Oriented | Review           | "Health score 98%. It's ready." Break analysis paralysis for someone who will review forever.                    |
| Driver/Captain           | Ship             | "2 vaults blocked in Review. Intervene or delegate?" Surface bottlenecks for the decisive leader.                |
| Craftsperson/Conductor   | Conductor role   | "Your filter saved Builders 12 min/vault this week." Reinforce craft impact with data.                           |
| Networker/Promoter       | Discovery        | "Close 2 conversations before opening more." Focus nudges for the scatter-prone connector.                       |
| Process/Operator         | Build            | "3 redundant steps. Want Otto to suggest consolidation?" Feed their process optimization hunger.                 |
| Bridge/Adapter           | Any chamber      | "Builder's notes use different terminology than Gatekeeper expects. Normalize?" Leverage their bridging ability. |

### Domain Flywheel Templates

The chamber metaphor is universal -- the CONTENT changes but the FLOW is the same. Airlock provides the shell + component library + AI. Conductors configure it for each domain's specific needs.

| Domain                        | Discover                            | Build                                | Review                           | Ship                   |
| ----------------------------- | ----------------------------------- | ------------------------------------ | -------------------------------- | ---------------------- |
| **Entertainment / Contracts** | Intake, triage, entity resolution   | Draft, assemble, patch               | Legal review, approval gates     | Publish, distribute    |
| **Plumbing / Work Orders**    | Dispatch, diagnose, estimate        | Schedule, procure parts, assign      | QA inspection, customer sign-off | Invoice, close         |
| **Marketing / Campaigns**     | Research, brief, audience discovery | Creative, copy, asset production     | Brand review, compliance, A/B    | Launch, measure        |
| **Finance / Audit**           | Data collection, risk assessment    | Analysis, findings, remediation plan | Partner/client review, sign-off  | Report filing, closure |
| **HR / Recruiting**           | Source, screen, pipeline            | Interview, assess, reference check   | Offer review, comp approval      | Extend offer, onboard  |

### The Provable Thesis

Airlock can prove that right person + right role + right tools = measurably higher performance by tracking:

- **Velocity** -- vault throughput per chamber, per role configuration
- **Quality** -- gate pass rates, rework frequency, error rates
- **Engagement** -- session duration, interaction depth, tool adoption rates
- **Fit score** -- predicted role fit vs actual performance (does the assessment predict success?)
- **Optimization delta** -- performance improvement over time as Lenses adapt

This data makes Airlock not just a tool but a **consultative platform**: "Here's how to restructure your team for 30% higher throughput, and here's the evidence."

---

## Part VII: Current Platform Inventory

### Airlock Shell -- What Exists

**Component Library (99 components):**

- Atoms (15): Badge, Button (4 variants, 3 sizes), ChamberLabel, ConfidenceBadge, ConnectionStatus, EmptyState, GateDot, Icon, PatchStateBadge, ProgressBar, ResizeHandle, SearchInput, StatusDot, Toast, Tooltip
- Molecules (27): DealCard, FieldCard, FilterBar, FilterPills, Modal, NodeConfigPanel, QueueHealthCard, SLATimer, WorkflowNode, plus 10 config components (AiProviderConfig, DataSourceConfig, etc.)
- Organisms (57): OttoChat, PipelineBoard, TasksKanban, DocumentsTable, WorkflowCanvas, SignalPanel, OrchestratePanel, ControlPanel, CommandPalette, CapabilityTree, EventBusMonitor, MembersTable, PermissionMatrix, and 44 more
- Templates (4): TriptychLayout, ShellLayout, WorkflowBuilder, SetupWizard

**Triptych State Machine (4 view states):**

- `standard` -- Signal:280px, Orchestrate:flex-1, Control:300px
- `artifact-focus` -- both sides collapsed, Orchestrate ~90%
- `action-focus` -- Signal collapsed, Control expanded
- `gate-lock` -- standard + governance bar, Control auto-switches to Approvals

**Role System (two-layer, already wired to Otto):**

- Org roles: architect > executive > director > lead > member
- Module roles: owner > gatekeeper > builder > designer > viewer
- 26 granular permission keys across 7 groups
- Chamber access matrix per module role
- Risk-tiered tool permissions (read/write/dangerous) per org role

**Real-time Infrastructure:**

- WebSocket with topic-based subscription (vault:_, view:_, module:_, workspace:_, user:_, presence:_)
- Event bus routing 20+ event types across 6 named queues
- SSE streaming from Otto

### OrchestrateOS Backend -- What Exists

**Otto AI Agent:**

- PydanticAI agent with OpenAI-compatible provider abstraction
- Two system prompts: VaultContext (domain) and UserAgentContext (full role/permission context)
- 9 enrichment sources assembled into context (gate state, field summary, contract health, domain rules, etc.)
- Session and message persistence
- Feature gate with circuit breaker

**MCP Infrastructure:**

- Full CRUD for MCP servers, skills, tool permissions
- Agent manifest export (W3C-aligned capability description)
- Tool permissions per role with risk tier (read/write/dangerous) and module scope
- 12 Otto tools named in manifest (stubs, not yet executed)

**Workflow Engine:**

- 21 node types including ai_classify, ai_generate, conversational_ask
- Full CRUD for workflow definitions
- React Flow canvas with node palette sidebar

### Gaps for Generative UI

| #   | Gap                                                | Impact                                       | Phase to Address |
| --- | -------------------------------------------------- | -------------------------------------------- | ---------------- |
| 1   | Component registry 63% incomplete, no prop schemas | Otto cannot know how to configure components | Phase 1          |
| 2   | Panel contents hardcoded in TriptychLayout         | No slot abstraction for dynamic rendering    | Phase 1          |
| 3   | Otto only streams markdown text                    | No structured component output               | Phase 2          |
| 4   | MCP tools are named stubs                          | No tool execution, no Render Spec generation | Phase 2          |
| 5   | No behavioral signal collection                    | Cannot observe or adapt                      | Phase 4          |
| 6   | No view-level AI navigation                        | Otto cannot change active view state         | Phase 2          |
| 7   | No cognitive profiling infrastructure              | Cannot assign Lenses                         | Phase 4          |
| 8   | No assessment engine                               | Cannot close the flywheel loop               | Phase 6          |

---

## Part VIII: Phased Roadmap

| Phase                              | What                                                                                                                          | Platform      | Effort         | Dependencies            |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------- | -------------- | ----------------------- |
| **0: Vision Spec**                 | This document                                                                                                                 | Docs          | This milestone | None                    |
| **1: Component Registry + Schema** | Enrich registry with prop schemas, chamber affinity, role tags, cognitive type affinity. Add TriptychLayout slot abstraction. | Airlock       | 1-2 milestones | None                    |
| **2: Otto Render Specs**           | Add A2UI-style structured output to Otto SSE. Build client-side component renderer. Implement MCP tool execution.             | Both          | 2-3 milestones | Phase 1 + Otto API      |
| **3: Skill-to-UI + Conductor**     | Skills render as UI elements. Conductor role can configure skill-to-component mappings per chamber.                           | Both          | 2-3 milestones | Phase 2 + MCP execution |
| **4: Behavioral Signals + Lenses** | Passive signal collection (density, navigation, dwell, speed). Cognitive profiling. Lens assignment and application.          | Both          | 2-3 milestones | Phase 3                 |
| **5: Adaptive Friction Engine**    | Per-profile friction modulation. System 1/2 zone enforcement. Nudge engine with personality-aware strategies.                 | Both          | 2-3 milestones | Phase 4                 |
| **6: Assessment + Re-placement**   | Custom behavioral/cognitive assessment. Role-fit scoring. Performance tracking. Re-placement suggestions.                     | OrchestrateOS | 3-4 milestones | Phase 5 + usage data    |

**Total: ~12-18 milestones** from current state to full cognitive-adaptive generative UI.

Phase 0 (this doc) and Phase 1 (registry enrichment) are buildable NOW. Phase 2 requires Otto to be fully wired (close -- SSE streaming works, needs structured output mode). Phases 4-6 are the "learning platform" that builds on everything before it.

The industry is converging on this exact architecture (A2UI + AG-UI + component catalogs). Building toward it now means Airlock rides the wave rather than retrofitting later.

---

## References

### Protocols and Standards

- W3C AI Agent Protocol Community Group: https://www.w3.org/groups/cg/agentprotocol/
- MCP Apps specification: https://blog.modelcontextprotocol.io/posts/2025-11-21-mcp-apps/
- Google A2UI specification v0.9: https://a2ui.org/specification/v0.9-a2ui/
- AG-UI Protocol: https://docs.ag-ui.com/concepts/events
- CopilotKit AG-UI integration: https://www.copilotkit.ai/ag-ui

### Production Implementations

- Airbnb SDUI deep dive: https://medium.com/airbnb-engineering/a-deep-dive-into-airbnbs-server-driven-ui-system-842244c5f5
- Shopify MCP-UI: https://shopify.engineering/mcp-ui-breaking-the-text-wall
- shadcn CLI 3.0 + MCP Server: https://ui.shadcn.com/docs/changelog/2025-08-cli-3-mcp
- Vercel AI SDK Generative UI: https://vercel.com/blog/ai-sdk-3-generative-ui
- Tambo SDK: https://github.com/tambo-ai/tambo
- CopilotKit Generative UI guide: https://www.copilotkit.ai/blog/the-developer-s-guide-to-generative-ui-in-2026

### Behavioral Science

- Thaler & Sunstein, Nudge Theory (2008) meta-analysis on treatment effects
- Kahneman, System 1/System 2 dual-process model applied to interface design
- Zuboff, Surveillance Capitalism -- friction as user agency inversion
- Nielsen, Progressive Disclosure (1995) -- learnability, efficiency, error rate

### Cognitive Profiling and Adaptive UI

- JMIR 2025: Comprehensive profiling integrating MBTI + DISC: https://humanfactors.jmir.org/2025/1/e73397
- Nuclear power plant MBTI interface study (empirical evidence for personality-tailored interfaces)
- Germanakos Ontological Cognitive User Model (OCUM): three-layer adaptation architecture
- HC-DRL banking study: 18.6% faster, 47.8% fewer errors, 34.9% higher satisfaction
- FACE2FEEL emotion-aware adaptive UI: https://arxiv.org/html/2510.00489v1
- Industry 5.0 Human Digital Twin: https://www.sciencedirect.com/science/article/pii/S0166361525000338
- NN/G on generative UI guardrails: https://www.nngroup.com/articles/generative-ui/

### Cognitive Functions in Tech

- Analysis of 18,264 professionals (30 studies): Ni-Te 33.67%, Ti-Ne 21.73%, Si-Te 13.09%
- PI Reference Profiles: https://www.predictiveindex.com/reference-profiles/
- Personality and information visualization preferences (Neuroticism, Openness, Conscientiousness effects on chart type and density preferences)

### Accessibility

- ACM DIS 2025: AI-Generated UIs between accessibility guidelines and practitioner expectations: https://dl.acm.org/doi/10.1145/3715336.3735691
- AI Design System Governor pattern: https://www.stldigital.tech/blog/ai-as-a-design-system-governor-enforcing-architectural-consistency/
