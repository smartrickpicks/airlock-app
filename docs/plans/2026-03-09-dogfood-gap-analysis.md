# Dogfood Gap Analysis — What We Need Before Patient Zero

> **Date:** 2026-03-09
> **Purpose:** Identify every gap between the synthesis docs and actually building + dogfooding the People Intelligence system
> **Audience:** Founder (Zachary) — this is the "what's left to define" before we write code
> **Input:** `people-intelligence-synthesis.md`, `workspace-forge-pi-engine-design.md`, all iteration docs

---

## TL;DR

The architecture is coherent — NotebookLM proved that by extracting the narrative cold. But architecture ≠ implementation. There are **3 categories** of gaps:

1. **🔴 Must Define Before Code** — The inference engine, PI data, DAG execution model
2. **🟡 Must Define Before Dogfood** — Gate UX, agent prompting strategy, profile storage
3. **🟢 Can Define During/After Dogfood** — Team intelligence, behavioral adaptation, Ask DAG routing

---

## What's DONE (Ready to Build From)

These sections of the synthesis are specific enough to implement directly:

| What                              | Where                            | Build-Ready?                                       |
| --------------------------------- | -------------------------------- | -------------------------------------------------- |
| Profile schema (9 sections)       | Synthesis L1                     | ✅ YAML is concrete                                |
| 4-layer architecture (L1→L4)      | Synthesis overview               | ✅ Clean hierarchy                                 |
| `airlock-persona` repo structure  | WF&PI Design                     | ✅ Full directory tree                             |
| PI profile YAML schema            | WF&PI Design                     | ✅ Per-profile template                            |
| Team type YAML schema             | WF&PI Design                     | ✅ Per-team-type template                          |
| Workspace Forge conversation flow | WF&PI Design                     | ✅ Q1-Q4 scripted                                  |
| DAG node schema                   | Synthesis "Workflows Are DAGs"   | ✅ YAML is concrete                                |
| 5 gate types + density rules      | Synthesis "Mandatory Gate Rules" | ✅ Clear rules                                     |
| Gate escalation timeline          | Synthesis                        | ✅ 0h → 4h → 24h → 48h → 7d                        |
| Module-as-Mode behavior matrix    | Synthesis                        | ✅ Module × archetype × drive shift                |
| 6 AI archetypes                   | Synthesis                        | ✅ Defined with activation rules                   |
| Roster tiers (Solo → Enterprise)  | Synthesis                        | ✅ 5 tiers with unlock rules                       |
| Dogfooding protocol (6 steps)     | Synthesis                        | ✅ Steps + measurement targets                     |
| Identity sovereignty (8 rules)    | Synthesis                        | ✅ Policy, not code — but needs schema enforcement |
| Dual-view concept                 | Synthesis                        | ✅ Conceptually clear                              |
| User journeys (Solo/Seed/Mid)     | Synthesis                        | ✅ Day-by-day scenarios                            |

---

## 🔴 MUST DEFINE BEFORE CODE

These are architectural decisions that block everything downstream.

### Gap 1: The Inference Engine — "How Does Goal Language Become a PI Profile?"

**What's designed:** MAGS asks 2-4 questions → maps to DECF drives → maps to closest PI profile.

**What's missing:** The actual mapping rules.

The `airlock-persona` repo structure lists three files that don't exist yet:

```
inference/
├── drive-signals.yaml       # Goal language → DECF drives
├── profile-matching.yaml    # DECF → closest profile
└── confidence-rules.yaml    # When to ask follow-up vs. infer
```

**Needs definition:**

1. **Drive signal extraction** — When a user says "Ship the product and close pilot customers," how does that become D:high, E:high, C:low, F:low? Is it keyword matching? LLM-inferred? A structured rubric?

   Options:
   - **A) LLM-inferred with structured output** — MAGS's system prompt includes the DECF framework + all 17 profiles. MAGS outputs a JSON with drive scores + confidence + reasoning. Most flexible, least deterministic.
   - **B) Hybrid: keyword signals + LLM refinement** — A lookup table maps common goal phrases to drive signals (e.g., "ship fast" → D:high, C:low). LLM fills gaps and adjusts. More deterministic baseline.
   - **C) Question-anchored scoring** — Each question maps to specific drives (Q1 → D+C, Q2 → F, Q3 → B). Tappable cards have pre-scored drive impacts. Most deterministic but least flexible.

   **Recommendation:** B (hybrid). Use structured signal tables for the tappable card questions (Q2, Q3) and LLM inference for open-ended answers (Q1). Best of both worlds.

2. **Profile matching algorithm** — Given a DECF vector like [9, 8, 3, 2], how do you pick the closest of 17 profiles?

   Options:
   - **Euclidean distance** in 4D drive space (simplest)
   - **Weighted distance** where some drives matter more for some profiles
   - **Threshold-based** — profiles define acceptable drive ranges, pick the first match

   **Recommendation:** Start with Euclidean distance. Each of the 17 profiles has a canonical DECF vector. Compute distance from inferred drives to all 17. Closest wins. Confidence = inverse of distance.

3. **Confidence thresholds** — At what confidence does MAGS stop asking questions?

   Need to define:
   - BMY confidence floor (probably 0.55-0.65)
   - "Good enough to configure workspace" threshold (probably 0.70)
   - "Good enough to run complex playbooks" threshold (probably 0.85)
   - When to prompt for enrichment ("Your profile is at 0.72. LinkedIn import could get you to 0.88.")

### Gap 2: The Actual PI Reference Data

**What's designed:** 17 profiles, 9 team types, 3 meta-archetypes — full YAML schemas.

**What's missing:** The actual data files. The schemas are templates, not populated instances.

**Needs:**

- Author all 17 `profiles/*.yaml` files with real PI data
- Author all 9 `team-types/*.yaml` files
- Author all 3 `archetypes/*.yaml` files
- Author `dynamics/sovereign-balance.yaml` with the vector math
- Author `inference/drive-signals.yaml` with the signal → drive mapping
- Author `inference/profile-matching.yaml` with canonical DECF vectors for all 17 profiles
- Author `inference/confidence-rules.yaml`

**Source material:** PI Explorer HTML dashboard (Zachary has access). Need to extract and structure.

**Effort:** ~2-3 days of focused data entry + validation. This is the PI Engine foundation — everything consumes it.

### Gap 3: The DAG Execution Model

**What's designed:** DAG node schema, gate types, density rules, escalation timeline.

**What's missing:** How DAGs actually RUN.

Questions that need answers:

1. **Playbook storage format** — Are playbooks stored as YAML files? Database records? Both?

2. **Playbook instance vs. template** — A template is the reusable blueprint. An instance is a running execution. What's the schema for an instance? It needs:

   ```yaml
   playbook_instance:
     id: "pbi_01ARZ..."
     template_id: "pb_contract_intake"
     vault_id: "v_01ARZ..." # What vault is this running against?
     status: "running" # draft | running | paused | completed | cancelled
     started_at: "2026-03-09T14:00:00Z"
     current_nodes: ["extract_terms"] # Active nodes (can be multiple if parallel)
     completed_nodes: ["triage", "research"]
     pending_gates: ["compliance_review"]
     node_states:
       triage:
         {
           status: "completed",
           actor: "mags",
           archetype: "analyst",
           completed_at: "...",
         }
       research:
         {
           status: "completed",
           actor: "mags",
           archetype: "strategist",
           completed_at: "...",
         }
       extract_terms:
         {
           status: "in_progress",
           actor: "mags",
           archetype: "executor",
           started_at: "...",
         }
       compliance_review:
         { status: "blocked", gate: "verification", waiting_for: "usr_zachary" }
   ```

3. **Execution engine technology** — What runs the DAG?
   - **PydanticAI Graph** (mentioned in prior docs) — typed state machine, Python-native, fits FastAPI
   - **Temporal.io** — industrial-grade workflow engine, overkill for dogfood
   - **Custom engine** — simple Python DAG walker in the API layer

   **Recommendation for dogfood:** Custom simple engine. A Python class that walks the DAG, executes MAGS nodes via Claude API, pauses at gates, persists state to PostgreSQL. PydanticAI Graph is the right eventual answer but adds dependency risk for MVP.

4. **Parallel execution** — When two branches can run simultaneously, does the engine literally fire both at once? Or is it event-driven (complete one node → check what's unblocked → run next)?

   **Recommendation for dogfood:** Event-driven. Complete a node → check `depends_on` for all pending nodes → start any that are fully unblocked. Simple, debuggable, no concurrency issues.

5. **Gate pause mechanism** — When a gate is reached, the engine must:
   - Persist the playbook state
   - Create a notification in Dispatch
   - Wait for human response (could be minutes, hours, days)
   - Resume execution when the gate is resolved

   This is fundamentally an async state machine, not a synchronous script.

### Gap 4: MAGS Agent Prompting Strategy

**What's designed:** 6 archetypes, module-as-mode, 3-step dynamic persona adjustment.

**What's missing:** The actual system prompts.

For dogfooding, we need at minimum:

1. **Base MAGS system prompt** — The constant preamble that defines who MAGS is
2. **Archetype prompt fragments** — 6 snippets that inject when the archetype switches
3. **Module prompt fragments** — 5 snippets for module-as-mode
4. **Chamber prompt fragments** — 4 snippets for chamber sub-modes
5. **User profile injection** — How does the user's profile (from L1) get into the prompt?

**Prompt composition formula:**

```
system_prompt = base_mags
  + archetype_fragment[active_archetype]
  + module_fragment[active_module]
  + chamber_fragment[active_chamber]
  + user_profile_summary(user.pi_core, user.interaction_patterns, user.mags_config)
  + vault_context(current_vault, current_node)
```

**Needs:** Author these prompt fragments. This is the soul of the system — get it wrong and MAGS feels generic; get it right and it feels like it actually knows you.

---

## 🟡 MUST DEFINE BEFORE DOGFOOD

These don't block architecture but block the actual dogfood experience.

### Gap 5: Gate UX — Where Do Gates Appear? How Does the User Respond?

**What's designed:** Gate types, density rules, escalation.

**What's missing:** The actual user experience.

Questions:

- Do gates appear in Dispatch (the global homepage)? As cards in the Signal panel?
- Do gates appear inline in the vault/playbook view?
- Both? (Probably both — Dispatch for notification, vault view for context.)
- How does a user "respond" to a gate?
  - **Verification gate:** "These terms are correct" → Approve/Reject buttons
  - **Decision gate:** "Choose one of these options" → Option cards
  - **Approval gate:** "Authorize this action" → Sign-off button with optional comment
  - **Quality gate:** "Does this meet standards?" → Approve/Request Changes
  - **Convergence gate:** "All branches complete. Proceed?" → Review summary + Continue

**Needs:** Gate response UI component design. This is the primary interaction point between humans and the DAG.

### Gap 6: Profile Storage — Database Schema

**What's designed:** Profile YAML schema (9 sections), sovereignty rules.

**What's missing:** How this maps to actual database tables.

The synthesis says "stored per-user, portable across workspaces." But the backend schema rules (from CLAUDE.md) say every table needs `workspace_id` for RLS.

Resolution options:

- **A) User-scoped table WITHOUT workspace_id** — Breaks the RLS convention but enforces sovereignty
- **B) Dual tables** — `user_profiles` (user-scoped, portable) + `workspace_profile_views` (workspace-scoped, what the workspace admin can see)
- **C) User-scoped with workspace overrides** — Profile lives on the user. Workspaces can add soft locks and role assignments on top.

**Recommendation:** C. The profile is user-owned. The workspace stores role assignments and soft locks as a separate `workspace_memberships` table with `workspace_id` for RLS.

```
Tables:
  user_profiles        — user_id PK, no workspace_id, contains L1 profile data
  user_profile_changelog  — user_id FK, append-only, sovereignty audit trail
  workspace_memberships   — workspace_id + user_id, role, soft_locks, team_type_visible
```

### Gap 7: Workspace Forge UI Components

**What's designed:** Split-screen, Spellburst pattern, live preview, conversation script.

**What's missing:** Component architecture.

Needs:

- `WorkspaceForge` template component (the split-screen container)
- `ForgeChat` organism (MAGS conversation on the left)
- `ForgePreview` organism (live workspace preview on the right)
- `ProfileInferencePanel` molecule (shows "MAGS thinks you're a Maverick because...")
- `ModuleToggle` molecule (module bar in preview, interactive)
- `ArchetypeBadge` atom (shows current MAGS archetype)
- Integration with existing Zustand stores (`module.store.ts`, `auth.store.ts`)
- New store: `forge.store.ts` (conversation state, inferred profile, preview state)

### Gap 8: The Vault ↔ Playbook Relationship

**What's designed:** Vaults have chambers (Discover → Build → Review → Ship). Playbooks are DAGs with nodes in chambers.

**What's missing:** How a playbook attaches to a vault.

Questions:

- Does every vault get exactly one playbook? Or can a vault have multiple?
- Can a playbook span multiple vaults?
- When you create a vault, do you pick a playbook template? Or does MAGS suggest one?
- Is the playbook visible inside the vault's Triptych view? Where?

**Recommendation for dogfood:** One vault = one active playbook. MAGS suggests a template when the vault is created (based on module + user profile). The playbook is visible in the Orchestrate panel of the Triptych.

### Gap 9: The LinkedIn MCP Server

**What's designed:** "LinkedIn MCP server integration for profile enrichment" (Phase 2).

**For dogfood decision:** Do we need this for Patient Zero?

**Arguments for:**

- The dogfooding protocol Step 2 is specifically "LinkedIn enrichment"
- Confidence jump from 0.65 → 0.85 is a key UX moment
- Zachary wants to test the value exchange ("give data, get resume rewrite")

**Arguments against:**

- LinkedIn API access is complex (OAuth, rate limits, data restrictions)
- Could use a simpler approach: paste LinkedIn URL → scrape public profile → extract signals
- Or even simpler: manual entry of key LinkedIn fields for dogfood only

**Recommendation:** For dogfood, build a lightweight LinkedIn signal extractor (public profile scrape or manual entry). The full MCP server comes later.

---

## 🟢 CAN DEFINE DURING / AFTER DOGFOOD

These are important but don't block the Patient Zero experience.

### Gap 10: Coverage Computation Engine

Not needed for Solo tier (only 1 person). Define when testing Pod tier (adding Jim Robinson).

### Gap 11: Sovereign Balance Dashboard

Not needed for Solo tier. Define when testing Pod tier.

### Gap 12: Dual-View Playbook Builder

Not needed for Solo tier (no "ideal vs. decomposed" comparison with 1 person). Define when testing Pod tier.

### Gap 13: Ask DAG Routing

Not needed for Solo tier (no one else to route to). Can stub: when MAGS hits a node it can't handle, it creates a placeholder "needs expert" card instead of the full Ask DAG system.

### Gap 14: Layer 2 Behavioral Observation

By definition, this grows over time. Can't build it before dogfood — dogfood IS the data collection.

Needs:

- Event tracking (gate response times, content preferences, work hours)
- Periodic profile update job (weekly? on-demand?)
- "Your profile has evolved" notification

### Gap 15: Layer 3 Values Alignment

Future enrichment. Not needed for dogfood.

### Gap 16: Complexity Gating Enforcement

Not blocking for dogfood (Solo tier has simple playbooks). Define when expanding to Pod/Squad.

### Gap 17: Controller Hierarchy

Solo tier = Architect is everything. No hierarchy to build. Define when adding team members.

### Gap 18: Playbook Versioning

Not relevant until playbooks are running and evolving. Define post-dogfood.

### Gap 19: Conditional Branching in DAGs

The synthesis asks "Can playbooks fork based on a decision gate?" This is powerful but adds complexity. For dogfood, keep DAGs linear-with-parallel-branches (no forks). Add conditional branching post-dogfood.

---

## The 8 Open Questions — Triage

| #   | Question                      | Dogfood Blocking?                              | Recommendation                                                                                |
| --- | ----------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1   | Profile portability mechanics | No (solo)                                      | Define at Pod tier                                                                            |
| 2   | Behavioral override threshold | No (needs time)                                | Set at 0.75 confidence delta, adjust from dogfood data                                        |
| 3   | Conflicting signal resolution | No (one signal source initially)               | Later: latest signal wins unless user overrides                                               |
| 4   | Passive observation consent   | **Yes** — sovereignty principle says ask first | Show one-time "MAGS will observe your work patterns to improve suggestions. OK?" during Forge |
| 5   | Time-based DAG nodes          | No (simple playbooks first)                    | Later                                                                                         |
| 6   | Conditional branching         | No (linear DAGs first)                         | Later                                                                                         |
| 7   | Playbook versioning           | No (no template updates during dogfood)        | Later                                                                                         |
| 8   | The name                      | No (doesn't block code)                        | See MAGS discussion                                                                           |

---

## Dogfood MVP — The Minimum Build

If we strip everything to what's needed for Zachary to sit down, run Workspace Forge, get a profile, run a playbook, and hit gates:

### Must Build (in order):

1. **`airlock-persona` repo** — Port PI data into YAML (17 profiles, 9 team types, 3 archetypes, inference rules)
2. **Inference engine** — Goal language → DECF → profile matching (Python service in API)
3. **Profile storage** — `user_profiles` + `user_profile_changelog` tables
4. **Workspace Forge UI** — Split-screen chat + preview (Next.js components)
5. **MAGS conversation script** — 2-4 questions, structured output for profile inference
6. **Playbook template storage** — 2-3 starter templates as YAML
7. **DAG execution engine** — Simple Python walker: execute node → check gates → pause/resume
8. **Gate UI** — Dispatch cards for pending gates, vault-inline gate response
9. **MAGS agent integration** — Claude API calls with composed system prompts (base + archetype + module + chamber + user profile)
10. **Playbook view** — DAG visualization in the Orchestrate panel

### Can Skip for Dogfood:

- LinkedIn MCP server (use conversation-only intake)
- Resume parser
- Coverage computation
- Sovereign Balance dashboard
- Dual-view playbook builder
- Ask DAG routing
- Layer 2/3 behavioral observation
- Complexity gating
- Controller hierarchy
- Conditional branching
- Profile portability

### Estimated Effort:

| Item                             | Effort          | Dependencies                     |
| -------------------------------- | --------------- | -------------------------------- |
| `airlock-persona` data authoring | 2-3 days        | PI Explorer access               |
| Inference engine (API)           | 2-3 days        | `airlock-persona` data           |
| Profile storage (API + DB)       | 1-2 days        | Schema decision                  |
| Workspace Forge UI               | 3-5 days        | Inference engine                 |
| MAGS conversation script         | 1-2 days        | Inference engine                 |
| Playbook templates               | 1-2 days        | Node schema finalized            |
| DAG execution engine             | 3-5 days        | Playbook storage                 |
| Gate UI                          | 2-3 days        | DAG engine                       |
| MAGS agent integration           | 2-3 days        | Prompt fragments authored        |
| Playbook view (DAG viz)          | 2-3 days        | DAG engine                       |
| **Total**                        | **~20-30 days** | Sequential with some parallelism |

---

## Decision Points for Founder

Before coding starts, you need to decide:

1. **Inference approach:** LLM-inferred (A), hybrid signals+LLM (B), or question-anchored scoring (C)?
   → Recommendation: B

2. **DAG engine technology:** PydanticAI Graph, Temporal.io, or custom Python walker?
   → Recommendation: Custom for dogfood, PydanticAI Graph for production

3. **Profile storage:** User-scoped without workspace_id (A), dual tables (B), or user-scoped with workspace overrides (C)?
   → Recommendation: C

4. **LinkedIn for dogfood:** Full MCP server, lightweight scraper, or skip for now?
   → Recommendation: Skip for initial dogfood, add lightweight scraper as fast-follow

5. **Vault ↔ Playbook relationship:** 1:1, 1:many, or many:many?
   → Recommendation: 1:1 for dogfood

6. **The name:** Decided: MAGS (Multi-Arc Governance System).
   → See separate naming analysis

---

## What Happens After Dogfood

The dogfood produces:

1. **Validated inference** — Does the conversation → profile path feel natural?
2. **Calibrated prompts** — Do the archetype/module/chamber prompt fragments actually change MAGS's behavior noticeably?
3. **Gate friction data** — Are gates helpful or annoying? Right density?
4. **Profile accuracy** — Does Zachary agree with his inferred profile?
5. **Playbook UX** — Does the DAG visualization make sense? Is the Orchestrate panel the right place?
6. **Override patterns** — How often does Zachary correct MAGS?

This data informs Phase 2 (enrichment, team intelligence) and Phase 3 (behavioral adaptation).

---

## Document Status

This gap analysis is a companion to the synthesis. It doesn't change the architecture — it identifies what's undefined and what needs decisions before implementation begins.
