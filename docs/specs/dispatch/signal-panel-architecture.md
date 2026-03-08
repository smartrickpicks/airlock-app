# Signal Panel Architecture — Dispatch + Otto Handoff Decisions

> Answers to Otto Agent Graph design questions. These decisions are locked.
> Cross-reference: `docs/specs/dispatch/overview.md`, `docs/specs/ai-agent/`

---

## Q1: Task Runner positioning in Signal panel

**Answer: Task Runner IS the top of Signal — not a separate section competing with Module Signals.**

The framing of Options A/B/C assumes Task Runner is a signal source that needs a slot in the aggregator. It isn't. The Context Bar + Gate Action Area together ARE the Task Runner. They already have the top position in Signal. No new section needed, no competition with Triage Signals.

Signal panel stack (top → bottom):

```
┌─ Context Bar ──────────────────────────────┐  ← "where you are"
│  Vault · Chamber · Step N of M · Gate     │     always visible when vault active
└────────────────────────────────────────────┘
┌─ Gate Action Area ─────────────────────────┐  ← "what to do now"
│  [inline gate render or Go deep →]        │     Task Runner's primary work surface
└────────────────────────────────────────────┘
┌─ Otto Chat ────────────────────────────────┐  ← "do it via chat"
│  [file drop / ask / act]                  │     gate-aware, vault-scoped
└────────────────────────────────────────────┘
┌─ Triage Signals ───────────────────────────┐  ← "your other work"
│  [module push aggregator]                 │     below the fold, scrollable
│  ├ Gate Signals (future)                  │
│  ├ CRM Signals (future)                   │
└────────────────────────────────────────────┘
```

When no vault is active (cold start, all vaults complete):
- Context Bar → shows "Pick up where you left off" prompt or cold-start state
- Gate Action Area → empty / hidden
- Triage Signals → full height, first thing user sees

When a vault becomes active (click Triage Signal, navigate directly):
- Context Bar populates with vault context
- Gate Action Area renders the current gate
- Triage Signals contracts to "Your other work" section below

**Task Runner is not a Conductor-configurable signal section.** It is always present at the top of Signal when a recipe is active. It cannot be disabled or reordered by signal routing config.

---

## Q2: Otto as a Signal source

**Answer: Option C — Hybrid. Otto is the detection engine; modules own the signals.**

Otto detects conditions and generates alerts, but every alert routes through its source module's Signal section. Otto does not have a first-class "Otto Signals" section.

Examples:
| Otto detects | Routes as | Appears in |
|---|---|---|
| Health score dropped below 50 on Vault X | Gate Signals | Gate Signals section |
| 3 vaults stuck in Review > 7 days | Gate Signals | Gate Signals section |
| Extraction confidence < 60% on new upload | Gate Signals | Gate Signals section |
| Hot lead activity spike | CRM Signals | CRM Signals section |

**Why:** "Otto Signals" as a section would become a catch-all and break the module ownership model. Signals belong to modules. Otto is the detection capability that feeds them. This keeps the routing config clean — enabling/disabling Gate Signals controls ALL gate-level alerts, whether triggered by the system, a user action, or Otto's detection.

---

## Q3: Signal priority and Conductor configuration

**Two separate config surfaces — not one.**

### Signal routing config (Conductor-controlled)
Controls the Module Signals aggregator in the lower portion of Signal:
- Which module signal sections are enabled (Triage Signals, Gate Signals, CRM Signals)
- Priority order among those sections
- Whether Otto-generated signals within a module section are enabled (controlled per module, not per Otto)

### Otto capability config (separate — archetype/capability tree)
Controls Otto's behavior and surfaces:
- Whether Task Runner is active for this user's archetype (default: yes for all roles)
- Which detection capabilities Otto has enabled (health score monitoring, SLA breach detection, confidence flagging)
- Otto's execution tier (Deterministic → Local LLM → Cloud LLM)

**Task Runner is NOT in signal routing config.** It is controlled by: (1) whether a recipe is active for the current vault and (2) the user's Otto capability flag. It always renders at the top of Signal when active — it cannot be reordered below module signals.

**Otto-generated signals** are enabled/disabled at the module level in signal routing config. If Gate Signals is toggled off, Otto's gate-detection alerts also disappear. Otto detection is a capability; signal delivery is the module's responsibility.

---

## Q4: Dispatch ↔ Vault transition — Signal panel behavior

**Answer: Signal panel transforms on vault activation. It does NOT persist Dispatch aggregator state.**

The Signal panel has two modes:

| Mode | Trigger | Signal panel shows |
|------|---------|-------------------|
| **Dispatch scope** | No vault active | Module Signals aggregator (full height) |
| **Vault scope** | Vault active (any mode) | Task Runner (top) + "Your other work" Triage Signals (below) |

When a user clicks a Triage Signal item or navigates to a vault:
1. Signal transitions: aggregator collapses → Context Bar + Gate Action Area expand at top
2. Triage Signals contracts to a "Your other work" strip at the bottom of Signal
3. Task Runner is now live — narrating the active vault's recipe
4. Orchestrate may or may not expand (depends on whether the gate is inline-satisfiable or depth-required)

**This means Task Runner naturally appears on vault entry** — no separate home needed. Signal always shows what's relevant to the current scope. Dispatch scope = what's pushing toward you. Vault scope = what you're working on now + what's waiting.

The "Your other work" Triage Signals strip persists in vault scope so the user never loses sight of the queue. It's collapsed (2–3 rows + "N more") not hidden.

---

## Q5: Messenger relationship to Dispatch

**Answer: Same Otto, two surfaces. Shared context, distinct interaction affordances.**

| Surface | Location | Mode | Otto's role |
|---------|----------|------|-------------|
| **Signal Otto** | Signal panel (Gate Action Area + Otto Chat) | Proactive, procedural | Guides gate completion, fires APIs, narrates recipe |
| **Messenger Otto** | Shell-level bottom bar (persistent) | Reactive, ambient | Answers questions, navigates, free-form assistance |

**They are not two different Ottos.** Same model, same context window, same awareness of the current view. If a user asks a question in Messenger while on Dispatch, Otto references what's in Signal: the active vault, the current gate, the top Triage Signals item. Context is shared.

**No overlap concern** — the surfaces are complementary, not competing:
- Signal Otto = work mode. You're doing something. Otto is co-piloting.
- Messenger Otto = ambient mode. You're asking something. Otto is answering.

On Dispatch specifically: if a user is actively working through a gate in Signal and opens Messenger to ask "what's left after this?", Otto answers using full knowledge of the active recipe and Triage queue. The two surfaces feel like one continuous conversation with different UI frames.

**Messenger on Dispatch does not duplicate Signal Otto.** If Otto needs to take an action (fire an API, satisfy a gate), it does so through the Signal surface — Messenger stays conversational. "I'll upload that for you" → action executes in Signal's Gate Action Area, not as a Messenger message.

---

## Summary — Locked Decisions

| Question | Decision |
|----------|----------|
| Task Runner position | Top of Signal always (= Context Bar + Gate Action Area). Not a Conductor-configurable signal section. |
| Otto as signal source | Hybrid: Otto detects, modules own. No "Otto Signals" section. |
| Config surface split | Signal routing config = module sections. Otto capability config = Task Runner + detection. Separate. |
| Signal panel on vault entry | Transforms: aggregator → Task Runner (top) + collapsed Triage Signals strip (bottom). |
| Messenger vs Signal Otto | Same Otto, shared context, two affordances. Signal = proactive/procedural. Messenger = reactive/ambient. Actions execute in Signal, not Messenger. |
