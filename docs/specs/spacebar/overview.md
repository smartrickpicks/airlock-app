# Spacebar — Orchestration Shell Design Spec

> **Status:** SPECCED
> **Source PRD:** `docs/prds/spacebar.md` (drafted 2026-04-29)
> **Terminology:** See [Glossary](../../concepts/00-glossary.mdx). Spacebar is a **system overlay**, like Admin — not a Module.

---

## Summary

Spacebar is the operator shell for the substrate: a Web5 orchestration UI that sits on top of Web3 identity (Skeet, DID, $MOTION) and Web4 hidden compute (BCODE/PACT, state service, credits). It gives operators a single surface to see sessions, approve risky actions, manage keyrings, launch warm-starts, and inspect audit trails — without bypassing the protocol.

Spacebar does **not** call models directly. It talks only to substrate services (state service, PACT gateway, credits service, Skeet identity) and renders their state. It is the visible face of Web5 orchestration.

---

## Access Model

| Overlay      | Triggered By                                                | Required Role                          | Route         |
| ------------ | ----------------------------------------------------------- | -------------------------------------- | ------------- |
| **Spacebar** | Dedicated icon in module bar (visible to Owners/Architects) | Owner (level 2) or Architect (level 3) | `/spacebar/*` |

Spacebar renders **on top of** the current module view, identical to how Admin renders. The module bar, sidebar, and main content are dimmed/blurred behind the overlay. Pressing Escape closes and returns to the previous view.

---

## Vocabulary Mapping

Spacebar introduces substrate concepts that map to existing Airlock patterns:

| Spacebar Term               | Airlock Equivalent    | Notes                                                               |
| --------------------------- | --------------------- | ------------------------------------------------------------------- |
| **Session**                 | **Vault**             | Unit of work with lifecycle; sessions are named PACT-call sequences |
| **Zone** (green/yellow/red) | **Gate colors**       | `--gate-green`, `--gate-yellow`, `--gate-red` from `tokens.css`     |
| **PACT**                    | **Event**             | Structured action envelope; stored via event bus pattern            |
| **Closure**                 | **Approval outcome**  | Immutable record of a completed PACT; analogous to applied patch    |
| **Keyring**                 | **Identity surface**  | Read-only identity/credential view (not editable in v0)             |
| **Operator**                | **Owner/Architect**   | Role with approval authority                                        |
| **Persona**                 | **Profile**           | Named configuration for warm-start sequences                        |
| **Dial**                    | **Calibration**       | Adjustable parameter (drier/default/wetter)                         |
| **Warm-start**              | **Onboarding wizard** | Multi-step launch sequence for a new session                        |

---

## Layout Strategy

### Dashboard / Sessions List

Full-width table view (no Triptych) — same pattern as Admin Dashboard, Triage, and Tasks table views.

### Session Detail

Uses **Triptych** layout (Signal | Orchestrate | Control):

- **Signal** (left): Live PACT feed for the session — reuse `ActivityFeed` organism
- **Orchestrate** (center): Session detail view, closure viewer, warm-start wizard
- **Control** (right): Approval queue, SLA timers, budget meter, audit trail

**Reusable layout files:**

- `src/components/templates/TriptychLayout.tsx` — 4 view states (Standard, Artifact Focus, Action Focus, Gate Lock)
- `src/stores/triptych.store.ts` — panel visibility, widths, active tab
- `src/hooks/useResizable.ts` — drag-to-resize panels
- `src/hooks/useKeyboardShortcuts.ts` — Cmd+1/2/3/4 shortcuts

---

## Feature Sections

### 1. Dashboard: Sessions & Status (PRD §4.1)

A dashboard view listing active and recent sessions. The operator's daily starting point.

#### Requirements

- **R1.1**: Table with columns: Name, Persona, Zone (color dot + label), Workflow, Status (`idle` / `running` / `paused` / `completed` / `error`), Credits used / limit, Last activity
- **R1.2**: Filter by zone, persona, status via pill toggles
- **R1.3**: Clicking a session opens Triptych detail view with session metadata, recent PACTs, and closures
- **R1.4**: Near-real-time updates via polling (manual refresh at minimum)

#### Component Reuse

| Existing Component | File Path                                  | How It Maps                 |
| ------------------ | ------------------------------------------ | --------------------------- |
| `EntityCard`       | `src/components/organisms/EntityCard.tsx`  | Session row card pattern    |
| `FilterPills`      | `src/components/molecules/FilterPills.tsx` | Zone/status/persona filters |
| `SortHeader`       | `src/components/molecules/SortHeader.tsx`  | Column sorting              |

#### New Components Needed

| Component       | Level    | Description                                                |
| --------------- | -------- | ---------------------------------------------------------- |
| `SessionsTable` | organism | Sessions list with zone dots, status badges, credit meters |
| `ZoneBadge`     | atom     | Green/yellow/red dot + label using gate color tokens       |

#### Mock Data

`src/lib/mock-sessions.ts` — session types, mock session data, zone/status enums. Follow `mock-review-queue.ts` pattern.

#### Store

`src/stores/session.store.ts` — sessions list, filters, selected session ID. Follow `review-queue.store.ts` pattern with API-first + mock fallback.

---

### 2. Keyring View (PRD §4.2)

A read-only identity summary showing Skeet tier, DIDs, and credit balances.

#### Requirements

- **R2.1**: Display Skeet tier (Free/Pro/Enterprise) and linked auth surfaces (Discord/Telegram/eSIM)
- **R2.2**: Display primary DID(s) and verification status
- **R2.3**: Display Constellation Credits balance and last 5 debits/credits; $MOTION balance if applicable
- **R2.4**: Action links: "Manage identity in Skeet" (external), "Top up credits" (external)

#### Component Reuse

| Existing Component | File Path                                      | How It Maps                        |
| ------------------ | ---------------------------------------------- | ---------------------------------- |
| `ProfileSettings`  | `src/components/organisms/ProfileSettings.tsx` | Read-only identity display pattern |
| `ControlPanel`     | `src/components/organisms/ControlPanel.tsx`    | Tabbed panel structure             |

#### New Components Needed

| Component       | Level    | Description                                                           |
| --------------- | -------- | --------------------------------------------------------------------- |
| `KeyringView`   | organism | Skeet tier badge, DID list, credit/token balance, recent transactions |
| `CreditBalance` | molecule | Balance display with recent debits/credits list                       |

---

### 3. Warm-Start Launcher (PRD §4.3)

A multi-step wizard to launch persona-specific warm-start sequences.

#### Requirements

- **R3.1**: Query state service `/persona/profiles` to list available persona profiles
- **R3.2**: "New session" wizard:
  - Step 1: Choose persona (name, DECF shorthand, description)
  - Step 2: Choose workflow (Smoke test / Full ConstellationBench / Custom)
  - Step 3: Set zone (default green) + credit budget ceiling
- **R3.3**: On submit: construct PACT warm-start envelope, POST to gateway, create session, display status
- **R3.4**: For warm-starts requiring initial context, call `/persona/warm-start` and surface status

#### Component Reuse — Heavy

| Existing Component    | File Path                                  | How It Maps                                     |
| --------------------- | ------------------------------------------ | ----------------------------------------------- |
| `SetupWizard`         | `src/components/templates/SetupWizard.tsx` | **Direct adaptation** — swap steps              |
| `onboarding.store.ts` | `src/stores/onboarding.store.ts`           | Wizard state machine + localStorage persistence |
| `mock-onboarding.ts`  | `src/lib/mock-onboarding.ts`               | Step definitions, option types                  |

#### Step Mapping (SetupWizard → SessionLauncher)

| SetupWizard Step                  | SessionLauncher Step                          | Changes                                      |
| --------------------------------- | --------------------------------------------- | -------------------------------------------- |
| Create Workspace (name, industry) | Choose Persona (name, DECF, description)      | Different data source, persona profile cards |
| Module Config (enable/disable)    | Choose Workflow (smoke/full/custom)           | Radio selection instead of toggles           |
| Invite Team (email, role)         | Set Zone + Budget (zone radio, credit slider) | New zone selector + budget input             |
| Connect Data (drive/upload/API)   | _(removed)_                                   | Not applicable                               |
| Ready (summary)                   | Review + Launch (summary + submit)            | POST to PACT gateway on confirm              |

#### New Components Needed

| Component         | Level    | Description                                                          |
| ----------------- | -------- | -------------------------------------------------------------------- |
| `SessionLauncher` | template | Adapted SetupWizard — 4 steps for session launch                     |
| `ZoneSelector`    | molecule | Radio group: green/yellow/red with risk labels and gate color tokens |

---

### 4. PACT & Closure Inspection (PRD §4.4)

Per-session view of PACTs and closures with verification action.

#### Requirements

- **R4.1**: Chronological PACT list per session: timestamp, zone, model/service ID, status (`pending`/`completed`/`rejected`), credit delta
- **R4.2**: PACT detail: header fields (persona, zone, tier, budget before/after), payload summary, linked closure ID
- **R4.3**: Closure detail: JSON (pretty-printed), Frobenius norm, status (`accepted`/`rejected`), signature verification
- **R4.4**: "Verify closure" button → calls BCODE verifier → displays `VERIFIED` / `MISMATCH` / `BAD_SIG`

#### Component Reuse — Heavy

| Existing Component | File Path                                      | How It Maps                                                |
| ------------------ | ---------------------------------------------- | ---------------------------------------------------------- |
| `ActivityFeed`     | `src/components/organisms/ActivityFeed.tsx`    | PACT event stream (reverse-chronological, grouped by time) |
| `ApprovalChain`    | `src/components/organisms/ApprovalChain.tsx`   | PACT approval timeline with status dots                    |
| `EventBusMonitor`  | `src/components/organisms/EventBusMonitor.tsx` | Queue health + event flow visualization                    |
| `QueueHealthCard`  | `src/components/molecules/QueueHealthCard.tsx` | Service health per queue                                   |
| `DLQTable`         | `src/components/organisms/DLQTable.tsx`        | Failed closure inspection + retry                          |

#### New Components Needed

| Component       | Level    | Description                                                     |
| --------------- | -------- | --------------------------------------------------------------- |
| `PactInspector` | organism | Detail view for a single PACT (header, payload, linked closure) |
| `ClosureViewer` | molecule | Pretty-printed JSON + norm + verify button + result badge       |

#### Mock Data

`src/lib/mock-pacts.ts` — PACT envelope types, closure types, verification status enum. Follow `mock-event-bus.ts` pattern.

---

### 5. Approval Console (PRD §4.5)

Operators approve or reject PACTs that change risk posture, tier, or pricing dials.

#### Requirements

- **R5.1**: "Pending approvals" panel listing PACT type (`zone_change`, `tier_upgrade`, `dial_adjust`), requested values, rationale
- **R5.2**: Approve/Reject actions → construct approval PACT envelope → log closure
- **R5.3**: Tier upgrades and dial changes require approval closure signed under Admin DID
- **R5.4**: UI must explain economic impact of dial changes

#### Component Reuse — Heavy

| Existing Component | File Path                                    | How It Maps                                                         |
| ------------------ | -------------------------------------------- | ------------------------------------------------------------------- |
| `ApprovalChain`    | `src/components/organisms/ApprovalChain.tsx` | Approval timeline with approve/reject actions                       |
| `PatchList`        | `src/components/molecules/PatchList.tsx`     | Pending items list with state badges                                |
| `PatchStateBadge`  | `src/components/atoms/PatchStateBadge.tsx`   | Color-coded status labels                                           |
| `SLATimer`         | `src/components/molecules/SLATimer.tsx`      | Countdown with color-coded urgency                                  |
| `patch.store.ts`   | `src/stores/patch.store.ts`                  | `canTransition()`, role-based enforcement, self-approval prevention |

#### Existing Patterns Reused

- **Self-approval prevention**: Approve button is _hidden_ (not disabled) when operator is the PACT originator — pattern from `ApprovalChain.tsx`
- **Multi-tier approval**: Low-risk = 1 approval, high-risk = 2+ approvals — pattern from `docs/specs/roles/overview.md`
- **SLA enforcement**: Countdown timers with color zones (green → amber → red → blinking red) — from `SLATimer.tsx`

#### New Components Needed

| Component         | Level    | Description                                                     |
| ----------------- | -------- | --------------------------------------------------------------- |
| `ApprovalConsole` | organism | Pending approvals panel with PACT type column + economic impact |
| `DialImpactCard`  | molecule | Plain-English explanation of dial change consequences           |

---

### 6. Credits & Budget Visibility (PRD §4.6)

Clear credit consumption, budget, and dial state.

#### Requirements

- **R6.1**: Per session: budget meter (initial, used, remaining, predicted remaining calls)
- **R6.2**: Global: operator credit balance + current dial state (drier/default/wetter)
- **R6.3**: Warnings when session projects to exceed budget or global caps are nearing

#### Component Reuse

| Existing Component  | File Path                               | How It Maps                              |
| ------------------- | --------------------------------------- | ---------------------------------------- |
| `SLATimer`          | `src/components/molecules/SLATimer.tsx` | SVG progress ring pattern → credit meter |
| `ProgressBar`       | `src/components/atoms/ProgressBar.tsx`  | Horizontal budget bar                    |
| Calibration pattern | `docs/specs/admin/overview.md`          | Slider with impact description for dial  |

#### New Components Needed

| Component       | Level    | Description                                            |
| --------------- | -------- | ------------------------------------------------------ |
| `BudgetMeter`   | molecule | Per-session credit gauge — adapts SLATimer's SVG ring  |
| `DialState`     | molecule | Current dial position indicator (drier/default/wetter) |
| `CreditWarning` | atom     | Inline warning badge when budget/cap is nearing        |

---

## Design Tokens Mapping

All Spacebar UI uses existing tokens from `src/styles/tokens.css`. No new tokens required.

| Spacebar Visual        | Airlock Token                               | Value         |
| ---------------------- | ------------------------------------------- | ------------- |
| Zone: Green (safe)     | `--gate-green`                              | `#22C55E`     |
| Zone: Yellow (caution) | `--gate-yellow`                             | `#EAB308`     |
| Zone: Red (critical)   | `--gate-red`                                | `#EF4444`     |
| Active/Connected       | `--accent-primary`                          | `#00D1FF`     |
| Budget warning         | `--gate-amber`                              | `#F59E0B`     |
| Verified/Success       | `--accent-success`                          | `#22C55E`     |
| Failed/Rejected        | `--accent-danger`                           | `#EF4444`     |
| Surface/Background     | `--surface-base`                            | `#0B0E14`     |
| Overlay panels         | `--surface-overlay`                         | `#151923`     |
| Data/IDs font          | `--font-mono`                               | Fira Code     |
| Labels/Body font       | `--font-sans`                               | Fira Sans     |
| Transitions            | `--transition-fast` / `--transition-normal` | 150ms / 250ms |

---

## API Contracts (Stub)

Spacebar is a client of four substrate services. These will generate TypeScript types via OpenAPI → `packages/shared-types/`.

### State Service

```
GET  /health                → { status: "ok" | "degraded" | "down" }
GET  /persona/profiles      → PersonaProfile[]
POST /persona/warm-start    → { sessionId: string, status: "initializing" | "ready" }
```

### PACT Gateway

```
POST /pact/execute          → { pactId: string, status: "pending" | "completed" | "rejected", closureRef?: string }
GET  /pact/session/:id      → SessionDetail (metadata + PACT history)
GET  /closure/:id           → ClosureDetail (JSON, norm, signature status)
POST /closure/:id/verify    → { result: "VERIFIED" | "MISMATCH" | "BAD_SIG" }
```

### Credits Service

```
GET  /credits/balance       → { cc: number, motion?: number }
GET  /credits/history       → CreditTransaction[] (last N debits/credits)
GET  /credits/dial          → { position: "drier" | "default" | "wetter", roundTo: number }
```

### Skeet Identity Service

```
GET  /identity/profile      → { tier: "free" | "pro" | "enterprise", dids: DID[], linkedAccounts: LinkedAccount[], assuranceLevel: number }
```

Spacebar must handle 5xx and degraded health gracefully (surface status, don't crash).

---

## Component Reuse Summary

### Directly Reusable (15 existing components)

| Component         | Level    | Spacebar Feature                  |
| ----------------- | -------- | --------------------------------- |
| `TriptychLayout`  | template | Session detail view               |
| `SetupWizard`     | template | Warm-start launcher (adapt steps) |
| `ActivityFeed`    | organism | PACT event stream                 |
| `ApprovalChain`   | organism | Approval timeline                 |
| `EventBusMonitor` | organism | PACT/closure monitoring           |
| `ControlPanel`    | organism | Session control panel (tabbed)    |
| `EntityCard`      | organism | Session row cards                 |
| `DLQTable`        | organism | Failed closure inspection         |
| `PatchList`       | molecule | Pending approvals list            |
| `SLATimer`        | molecule | Deadline/budget tracking          |
| `QueueHealthCard` | molecule | Service health cards              |
| `FilterPills`     | molecule | Zone/status/persona filters       |
| `SortHeader`      | molecule | Table column sorting              |
| `PatchStateBadge` | atom     | Status labels                     |
| `ProgressBar`     | atom     | Budget bars                       |

### New Components Needed (13)

| Component         | Level    | Spacebar Feature         |
| ----------------- | -------- | ------------------------ |
| `SessionsTable`   | organism | §1 Dashboard             |
| `KeyringView`     | organism | §2 Keyring               |
| `PactInspector`   | organism | §4 PACT inspection       |
| `ApprovalConsole` | organism | §5 Approval console      |
| `SessionLauncher` | template | §3 Warm-start wizard     |
| `ClosureViewer`   | molecule | §4 Closure JSON + verify |
| `CreditBalance`   | molecule | §2 Balance display       |
| `ZoneSelector`    | molecule | §3 Zone picker           |
| `BudgetMeter`     | molecule | §6 Credit gauge          |
| `DialState`       | molecule | §6 Dial indicator        |
| `DialImpactCard`  | molecule | §5 Economic impact       |
| `ZoneBadge`       | atom     | §1 Zone dot + label      |
| `CreditWarning`   | atom     | §6 Budget warning        |

---

## Key Design Decisions

1. **Overlay, not module** — Spacebar doesn't produce vaults, doesn't have chambers, doesn't follow the universal lifecycle. It's a system overlay like Admin.
2. **Triptych for session detail** — Session inspection uses the same Signal | Orchestrate | Control layout as vault detail views. ActivityFeed renders PACT events in Signal; ApprovalChain renders in Control.
3. **Adapt, don't fork** — SetupWizard becomes SessionLauncher by swapping steps, not duplicating the wizard engine. Same for ApprovalChain → approval console.
4. **Gate colors are zone colors** — The existing `--gate-green`, `--gate-yellow`, `--gate-red` tokens already define the exact semantics Spacebar needs. No new color tokens.
5. **Read-only keyring in v0** — Identity management lives in Skeet; Spacebar only renders state.
6. **PACT-only mutations** — All state changes flow through PACT envelopes and produce BCODE closures. Spacebar never writes directly to providers or ledgers.
7. **Self-approval prevention** — Inherited from patch workflow: approve buttons are _hidden_ when the operator is the PACT originator.

---

## Hard Constraints (from PRD §6.2)

All destructive or risk-changing actions must produce:

1. A PACT envelope
2. A BCODE closure
3. An approval closure if required by policy

Spacebar must **never**:

- Write directly to model providers
- Mutate ledger or dial state without going through PACT/BCODE
- Execute tier upgrades or dial changes without an approval closure signed under an Admin DID

---

## Open Questions (from PRD §7)

- Should Spacebar eventually host a lightweight prompt console for debugging, or should that live in a separate "lab" tool?
- Where to surface NSI / non-separability metrics — per session or per model?
- How tightly to integrate $MOTION wallets in v1?

---

## Related Specs

- [Admin / Settings](../admin/overview.md) — System overlay pattern, access model
- [Capability Tree](../admin/capability-tree.md) — State visualization + progress HUD pattern
- [Patch Workflow](../patch-workflow/overview.md) — 12-state approval lifecycle, self-approval prevention
- [Roles & Permissions](../roles/overview.md) — Multi-tier RBAC, permission escalation
- [Event Bus](../event-bus/overview.md) — BullMQ queues, event routing, DLQ handling
- [Onboarding](../onboarding/overview.md) — SetupWizard pattern for warm-start launcher
- [Shell / Triptych](../shell/overview.md) — Signal | Orchestrate | Control panel layout
