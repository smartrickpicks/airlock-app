# Operation OTTO — Iteration 2: Roster-Aware DAGs, Accountability, & Complexity Gating

> **Date:** 2026-03-09
> **Status:** BRAINSTORM — Iteration 2 of Operation OTTO
> **Parent:** `docs/plans/2026-03-09-operation-otto-master-plan.md`
> **Focus:** Roster-aware playbook building, Otto accountability, multi-chamber DAGs, complexity gating

---

## Decisions Locked In This Iteration

| Decision                | Choice                            | Rationale                                                                                                                                                                         |
| ----------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Otto accountability** | Mandatory gates                   | Certain node types ALWAYS require human confirmation, regardless of team size. Otto can never auto-run a complete playbook end-to-end. Even solo founders must touch checkpoints. |
| **Roster gap handling** | Suggest both (ideal + decomposed) | Show the full DAG with gap highlighting AND a decomposed version the current roster can handle. Side-by-side comparison doubles as a hiring signal.                               |

---

## Concept 1: Roster-Aware Playbook Builder

### The Principle

The Playbook Builder doesn't exist in a vacuum. It knows your roster — how many people, what PI profiles, what team types are covered, and what Otto can compensate for. This awareness constrains and guides what it suggests.

### Roster Tiers

| Tier           | Team Size    | Playbook Complexity          | What Unlocks                                                                                                                              |
| -------------- | ------------ | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Solo**       | 1 person     | Solo DAGs, sequential chains | Simple intake flows, single-branch workflows. Complex tasks decomposed into micro-workflows. Otto fills heavily but with mandatory gates. |
| **Pod**        | 2-5 people   | Mid-complexity DAGs          | Parallel branches (if 2+ distinct profile types). Cross-role handoffs. Dedicated reviewer possible.                                       |
| **Squad**      | 6-20 people  | Full DAG catalog             | Multi-chamber workflows. Dedicated gatekeepers. Cross-functional teams. Compliance-heavy flows.                                           |
| **Department** | 20-50 people | Multi-team DAGs              | Nested playbooks (playbooks calling playbooks). Sub-controller delegation. Specialized team compositions.                                 |
| **Enterprise** | 50+ people   | Cross-department DAGs        | Multi-department convergence. M&A integration playbooks. Regional variations. Governance-heavy approval chains.                           |

### How It Works in the UI

When a user opens the Playbook Builder:

1. **Roster scan:** System checks team roster under this controller's subtree
2. **Profile mapping:** Maps each team member's PI profile to team types
3. **Coverage computation:** Calculates which team types are represented
4. **Template filtering:** Shows playbook templates that match current coverage

```
┌─────────────────────────────────────────────────────┐
│  PLAYBOOK BUILDER                                    │
│                                                      │
│  Your Team: 5 members                                │
│  Coverage: Exploring ✅ Producing ✅ Cultivating ✅   │
│            Stabilizing ⚠️ (Otto fills)               │
│            Pathfinding ❌ (gap)                       │
│                                                      │
│  ┌─ SUGGESTED FOR YOUR TEAM ──────────────────────┐  │
│  │                                                 │  │
│  │  ✅ Contract Intake (Standard)     [5 nodes]   │  │
│  │     Your team covers 4/5 nodes                 │  │
│  │                                                 │  │
│  │  ⚠️ Contract Intake (Full)         [12 nodes]  │  │
│  │     Your team covers 8/12 nodes                │  │
│  │     Otto fills 3, 1 gap remaining              │  │
│  │     💡 Hire a Pathfinding type to unlock        │  │
│  │                                                 │  │
│  │  🔒 M&A Due Diligence              [28 nodes]  │  │
│  │     Requires Squad tier (6+ people)            │  │
│  │     Missing: Guardian, Specialist profiles     │  │
│  │                                                 │  │
│  └─────────────────────────────────────────────────┘  │
│                                                      │
│  [Show All Templates]  [Build Custom]                │
└─────────────────────────────────────────────────────┘
```

### The Dual View (Ideal vs. Decomposed)

When a user selects a playbook that exceeds their roster capacity:

```
┌─────────────────────────┬───────────────────────────┐
│  IDEAL DAG (12 nodes)   │  YOUR DAG (3 chains × 4)  │
│                         │                            │
│       ┌→ B ──┐          │  Chain 1: A → B → C → D   │
│  A ───┤      ├──→ E     │  Chain 2: E → F → G → H   │
│       └→ C ──┘    ↓     │  Chain 3: I → J → K → L   │
│       D ──────→ F → G   │                            │
│            ↓            │  ⚡ Chains run sequentially │
│       H ──→ I ──→ J     │  🕐 ~3x longer than ideal  │
│       ↓                 │  ✅ Your team handles it    │
│  K ──→ L                │                            │
│                         │  💡 Add 2 people to unlock  │
│  ⚡ Parallel branches    │     the parallel version   │
│  🕐 ~4 days              │                            │
│  👥 Needs 8+ people     │                            │
│                         │                            │
│  [Use This Version]     │  [Use This Version]        │
└─────────────────────────┴───────────────────────────┘
```

### Decomposition Strategy

When decomposing a complex DAG for a smaller roster:

1. **Identify critical path** — the longest chain of dependent nodes
2. **Collapse parallel branches** into sequential steps
3. **Merge roles** — if a node needs a Guardian but you don't have one, Otto fills with mandatory review gate after
4. **Chain multi-chamber workflows** — instead of cross-chamber parallelism, chambers execute sequentially
5. **Preserve gates** — every gate in the ideal DAG remains in the decomposed version (they're the human checkpoints that can't be removed)

---

## Concept 2: Mandatory Gate Architecture

### The Rule

**Otto can never auto-run a complete playbook end-to-end.** Every playbook must have at least one mandatory human gate. Most will have several.

### Gate Types

| Gate Type             | Human Action Required                                      | Can Otto Fill?                          | Example                                             |
| --------------------- | ---------------------------------------------------------- | --------------------------------------- | --------------------------------------------------- |
| **Verification Gate** | Human confirms Otto's output is correct                    | No — defeats the purpose                | "Review extracted contract terms before proceeding" |
| **Decision Gate**     | Human makes a judgment call that Otto surfaces options for | No — judgment is human domain           | "Choose which counterparty terms to accept"         |
| **Approval Gate**     | Human with authority signs off                             | No — authority can't be delegated to AI | "Legal counsel approves compliance assessment"      |
| **Quality Gate**      | Human validates output meets standards                     | No — standards are subjective           | "Review executive summary before sending to client" |
| **Convergence Gate**  | All upstream branches complete + human confirms            | No — this is the sync point             | "All research complete, proceed to drafting?"       |

### Gate Density Rules

Based on playbook complexity and risk level:

| Playbook Risk                              | Minimum Gates            | Gate Placement                                                        |
| ------------------------------------------ | ------------------------ | --------------------------------------------------------------------- |
| **Low** (internal, read-only)              | 1 per playbook           | At least a final review before completion                             |
| **Medium** (creates/modifies data)         | 1 per chamber transition | Every time the workflow crosses a chamber boundary                    |
| **High** (external-facing, financial)      | 1 per 3 nodes            | No more than 3 consecutive Otto-only nodes without a human checkpoint |
| **Critical** (legal, compliance, security) | 1 per 2 nodes            | Every other node requires human involvement                           |

### Solo Founder Gate Behavior

When a solo founder runs a playbook with mandatory gates:

1. Otto works through auto-executable nodes
2. Hits a gate → notification appears in the founder's Dispatch
3. Founder can batch-review gates (morning review session: "Otto completed 4 things overnight, 3 need your sign-off")
4. Founder approves/rejects/modifies at each gate
5. Otto continues to the next auto-executable stretch

This creates a natural rhythm: Otto works, human checkpoints, Otto works, human checkpoints. Even at 1 person, the human is always in the loop — just not at every node.

### Gate Escalation

When a gate goes unattended:

| Time Passed | Action                                                                   |
| ----------- | ------------------------------------------------------------------------ |
| 0-4 hours   | Normal — gate sits in Dispatch as a signal                               |
| 4-24 hours  | Reminder notification (in-app + configured channel)                      |
| 24-48 hours | Escalation to Controller (or Architect if no Controller)                 |
| 48+ hours   | Playbook pauses. "This playbook is stalled at [gate]. Resume or cancel?" |
| 7+ days     | Auto-archive suggestion. "This playbook hasn't moved in a week."         |

---

## Concept 3: Multi-Chamber DAG Flows

### The Reality

Real business workflows don't stay in one chamber. A contract lifecycle touches all four:

```
DISCOVER                    BUILD                    REVIEW                   SHIP
┌─────────────────┐  Gate  ┌──────────────────┐  Gate  ┌─────────────────┐  Gate  ┌──────────────┐
│                 │   ▼    │                  │   ▼    │                 │   ▼    │              │
│  ┌→ Research ─┐ │        │  Extract → Draft │        │  Compliance     │        │  Publish     │
│  │            │ │        │     ↓      ↓    │        │     ↓           │        │     ↓        │
│  Triage       │ │   →    │  Enrich  Assemble│   →    │  Stakeholder    │   →    │  Distribute  │
│  │            │ │        │     ↓      ↓    │        │  Alignment      │        │     ↓        │
│  └→ Qualify ──┘ │        │  Validate → Pack │        │     ↓           │        │  Archive     │
│                 │        │                  │        │  Final Approval │        │              │
└─────────────────┘        └──────────────────┘        └─────────────────┘        └──────────────┘

Chamber Gates:
  Discover→Build:   "Qualified? All research complete?"
  Build→Review:     "Draft complete? All terms extracted?"
  Review→Ship:      "Approved by Legal? All flags resolved?"
```

### Personnel Requirements Per Chamber

Different chambers need different types of people:

| Chamber      | Primary Team Types       | Primary PI Profiles                        | Otto Archetype      |
| ------------ | ------------------------ | ------------------------------------------ | ------------------- |
| **Discover** | Exploring, Adapting      | Maverick, Captain, Promoter, Adapter       | Strategist, Analyst |
| **Build**    | Producing, Executing     | Analyzer, Specialist, Operator, Controller | Executor, Architect |
| **Review**   | Stabilizing, Anchoring   | Guardian, Specialist, Individualist        | Guardian, Analyst   |
| **Ship**     | Pathfinding, Cultivating | Captain, Persuader, Venturer, Collaborator | Executor, Connector |

### The Bottleneck Problem

With a small team, certain chambers become bottlenecks:

**Scenario: 3-person team (Captain, Maverick, Analyzer)**

| Chamber  | Human Coverage              | Otto Coverage              | Bottleneck?                          |
| -------- | --------------------------- | -------------------------- | ------------------------------------ |
| Discover | Captain + Maverick (strong) | Minimal                    | No                                   |
| Build    | Analyzer (moderate)         | Medium                     | Slight                               |
| Review   | Nobody (weak)               | Heavy (Guardian archetype) | **Yes** — who reviews Otto's review? |
| Ship     | Captain (moderate)          | Medium                     | Slight                               |

The Review chamber is the bottleneck. Nobody on the team has a Guardian/Specialist profile. Otto fills with Guardian archetype, but the mandatory gate still requires a human.

**Resolution options:**

1. The Captain (highest authority) reviews Otto's compliance work at the gate — not ideal profile fit but they have the authority
2. The team hires a Guardian-type (the Playbook Builder literally shows: "Hiring a Guardian would eliminate this bottleneck")
3. The playbook decomposes the Review chamber into simpler steps the existing team can handle
4. An external reviewer is brought in as a Guest with limited scope

---

## Concept 4: Complexity Gating (Profile-Locked Features)

### The Principle

Certain playbook capabilities only unlock when the right profile types are on the roster. This isn't gatekeeping for revenue — it's **safety**. You shouldn't run a compliance-heavy workflow if nobody on your team has compliance instincts.

### Unlock Matrix

| Capability                            | Required Profiles                                                  | Why                                                                        |
| ------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| **Compliance playbooks**              | At least 1 Guardian or Specialist (human)                          | Compliance requires human judgment from someone wired for detail and rules |
| **Multi-department DAGs**             | At least 2 Controllers with different subtrees                     | Cross-department workflows need clear ownership per branch                 |
| **Autonomous Otto chains** (3+ nodes) | At least 1 human with oversight responsibility in the same chamber | Someone must be accountable for what Otto does in that stretch             |
| **External-facing outputs**           | At least 1 Gatekeeper role assigned                                | Anything leaving the org needs a human approval                            |
| **Financial decision nodes**          | Architect or delegated Controller approval                         | Money decisions can't be Otto-only                                         |

### How Otto Fills Without Unlocking

When a profile type is missing but the team wants to run a playbook that needs it:

```
User: "I want to run the Compliance Audit playbook"
Otto: "That playbook has 4 Stabilizing-type nodes. Your team doesn't
       have anyone with a Guardian or Specialist profile.

       I can fill those nodes, but every compliance decision
       will require YOUR sign-off at a mandatory gate.

       Option A: Run it with heavier gates (you review more)
       Option B: Invite a team member with compliance expertise
       Option C: Decompose into simpler checks you can verify yourself

       What works?"
```

Otto doesn't block — it adapts. But it's honest about the trade-offs.

---

## Concept 5: The Support Ratio Question

### How Many Builders Per Analyst? How Many Gatekeepers Per Team?

This is an unsolved question in the current design. The roster-aware system needs to understand not just WHAT profiles exist but WHETHER the ratio is healthy.

### Industry-Informed Ratios

Based on team dynamics research (Belbin, PI team composition):

| Team Type Mix          | Healthy Ratio              | Warning Signal                                         |
| ---------------------- | -------------------------- | ------------------------------------------------------ |
| Drivers to Stabilizers | 1:1 to 2:1                 | All Drivers, no Stabilizers → fast but fragile         |
| Producers to Reviewers | 3:1 to 4:1                 | All Producers, no Reviewers → high output, low quality |
| Explorers to Executors | 1:2 to 1:3                 | All Explorers → lots of ideas, nothing ships           |
| Connectors             | At least 1 per 8-10 people | No Connectors → silos form, handoffs break             |

### What the System Surfaces

```
┌─────────────────────────────────────────────┐
│  TEAM HEALTH — Coverage Dashboard            │
│                                              │
│  Sovereign Balance: [████░░░░] 62% balanced  │
│                                              │
│  Drive Distribution:                         │
│    Dominance:    ████████ (+3) ⚠️ heavy      │
│    Extraversion: ██████   (+1) ✅ ok         │
│    Patience:     ██       (-2) ⚠️ low        │
│    Formality:    ████     ( 0) ✅ balanced    │
│                                              │
│  Missing Coverage:                           │
│    🔴 No Stabilizing profiles (Review risk)  │
│    🟡 Low Patience — Otto adds patience      │
│        compensation on 4 nodes               │
│                                              │
│  Suggestion:                                 │
│    "Your next hire should be a Guardian or    │
│     Specialist type to balance your team      │
│     and unlock compliance playbooks."         │
│                                              │
│  [View Playbooks Locked by Coverage]         │
└─────────────────────────────────────────────┘
```

---

## Concept 6: The Ask DAG

### What It Is

A structured way to identify what the system can't solve internally and needs external human expertise for. When Otto or the team hits a node that requires specialized knowledge nobody on the team has, it creates an "ask" — a structured request for external input.

### The Jim Robinson Example

Zachary's team hits a node requiring deep inference optimization expertise. Nobody on the roster has that profile. Instead of Otto guessing or the playbook stalling:

```yaml
ask:
  id: "ask_01ARZ..."
  created_by: "usr_zachary"
  created_at: "2026-03-09T15:00:00Z"
  playbook_id: "pb_coverage_engine"
  node_id: "optimize_inference"

  question: "How should we compute cosine similarity across
    4D drive space in real-time for 1000+ users?"

  context:
    team_type_needed: "producing"
    ideal_profile: "scholar"
    node_type: "research"
    chamber: "build"

  routed_to:
    - name: "Jim Robinson"
      role: "external_advisor"
      profile: "scholar"
      expertise: ["inference", "distributed_systems", "CDN_architecture"]

  status: "pending" # pending | in_progress | answered | integrated
  deadline: null # Optional
  priority: "medium"
```

### Ask DAG as a Feature

The Ask DAG isn't just for external advisors. It's a general pattern:

1. **Internal asks:** Route to the right person on the team based on profile fit
2. **External asks:** Route to advisors, consultants, or domain experts
3. **Community asks:** (Future) Route to the Airlock community or marketplace
4. **Otto asks:** When Otto genuinely doesn't know, it creates an ask for a human rather than hallucinating

This flips the script on AI hallucination: **Otto admits what it doesn't know and creates a structured request for human expertise.**

---

## Open Questions for Next Iteration

1. **How does the Playbook Builder handle playbooks that span weeks/months?** A contract lifecycle might take 90 days. How does the DAG handle time? Are there "wait" nodes? Calendar-triggered gates?

2. **Can playbooks fork and merge?** Like a git branch — a vault might take path A (litigation) or path B (settlement) based on a decision gate. Do we support conditional branching in the DAG?

3. **How do playbook versions work?** If a playbook is running and you update the template, do in-flight instances continue on the old version or migrate to the new one?

4. **What's the minimum viable DAG?** What's the simplest possible playbook? One human node + one Otto node + one gate? Or can a playbook be a single node?

5. **How do personal playbooks work?** A user creates a playbook for their own work (not assigned by a Controller). Does it still go through roster-aware suggestions? Or is it free-form?

6. **How does the Ask DAG integrate with the existing Triage module?** Are asks just a special type of Triage item? Or a separate signal?

---

## Synthesis Notes

This iteration adds these concepts to the master plan:

| Concept                       | Where It Lives in the Architecture                                          |
| ----------------------------- | --------------------------------------------------------------------------- |
| Roster-aware Playbook Builder | L3 (Controller Hierarchy) + Playbook Builder UI                             |
| Mandatory gates               | L4 (Coordination Layer) — gate enforcement engine                           |
| Multi-chamber DAGs            | L4 (Coordination Layer) — cross-chamber workflow orchestration              |
| Complexity gating             | L3 + L2 (PI Engine team type coverage computation)                          |
| Support ratios                | L2 (PI Engine) — Sovereign Balance extended with ratio rules                |
| Ask DAG                       | L4 (Coordination Layer) — new signal type for structured expertise requests |
| Decomposition strategy        | Playbook Builder — template engine with dual-view rendering                 |

These should be folded back into the master plan during the final synthesis pass.
