# Dispatch — Global Homepage View

> The screen you always come back to. Where work finds you and you can do it without going anywhere else.

> **Supersedes:** `docs/specs/triage/` — Triage is not a separate module or screen. It is the section of Dispatch that surfaces your outstanding work. The old Triage Dashboard spec is retired.

## What It Is

**Dispatch** is the workspace-level homepage — a persistent, Signal-dominant View that serves as both a navigation hub and an active work surface. It is not a dashboard. It is not a summary page. It is the floor of the product.

When you open Airlock, you land here. When a meeting pulls you away and you come back, you land here. When you finish a vault and don't know what's next, you land here. Dispatch always knows where you left off and what's waiting for you.

Work happens *inside* Dispatch. You do not have to navigate into a vault to satisfy a gate, upload a document, or advance a recipe step. You can do that here. Going into a vault is for when you need the full picture — the Triptych at depth. Dispatch is for when you need to keep moving.

---

## Layout

Dispatch renders the Triptych in **Signal-dominant mode**: Signal panel expands to occupy ~65–70% of the viewport. Orchestrate and Control are hidden by default but available on demand.

```
┌──────────────────────────────────────┬────────────────┐
│                                      │                │
│         SIGNAL (65–70%)              │  ORCHESTRATE   │
│                                      │  (hidden until │
│  ┌─ Context Bar ─────────────────┐   │   deep mode)   │
│  │ Vault · Chamber · Node · Gate │   │                │
│  └───────────────────────────────┘   ├────────────────┤
│                                      │                │
│  ┌─ Gate Action ─────────────────┐   │   CONTROL      │
│  │ [Inline satisfiable gate]     │   │  (hidden until │
│  │ or [Go deep →]               │   │   deep mode)   │
│  └───────────────────────────────┘   │                │
│                                      │                │
│  ┌─ Otto Chat ───────────────────┐   │                │
│  │ [Drop file / ask / act]       │   │                │
│  └───────────────────────────────┘   │                │
│                                      │                │
│  ┌─ Work Queue ──────────────────┐   │                │
│  │ Other vaults awaiting action  │   │                │
│  └───────────────────────────────┘   │                │
│                                      │                │
└──────────────────────────────────────┴────────────────┘
```

**Deep mode** is triggered when a user clicks into a gate that requires the full Orchestrate surface (e.g., editing a document, reviewing a diff). Signal contracts to its default width, Orchestrate and Control expand. URL updates to the vault. Back/home returns to Dispatch.

---

## Sections

### Context Bar
Persistent strip at the top of Signal. Shows:
- Active vault name + entity
- Current chamber (color-coded: Discover=red, Build=yellow, Review=purple, Ship=green)
- Current recipe node name and position (e.g., "Step 3 of 7 — Field Verification")
- Active gate name

If no vault is active (cold start or all vaults complete), Context Bar shows a prompt to pick up from the Work Queue or create a new vault.

Context **follows the last thing you touched**. Navigate into a different vault → come back to Dispatch → Context Bar reflects that vault. Your previous vault stays in the Work Queue.

### Gate Action Area

The primary work surface of Dispatch. Renders the current gate's required action inline.

Gates fall into two categories:

| Gate type | Dispatch behavior |
|-----------|-------------------|
| **Inline-satisfiable** | Rendered fully in Signal — user acts here, gate passes, task runner advances |
| **Depth-required** | Shows a summary + "Go deep →" button — clicking expands Orchestrate into the vault |

**Inline-satisfiable gate examples:**
- Upload a document → file drop zone renders directly
- Answer a field question → input renders in-line
- Flag for review → one-click action
- Approve/reject a patch → approve/reject buttons with optional note
- Confirm entity match → entity card with Accept / Dispute

**Depth-required gate examples:**
- Edit a contract clause → requires Orchestrate document editor
- Review a diff → requires DiffViewer in Orchestrate
- Build a field mapping → requires EntityGraphView

### Otto Chat

Otto is always present in Dispatch, below the Gate Action Area. It serves two purposes:

1. **Gate assistant** — Otto is aware of the current gate and can guide the user through it. If the gate is "upload the distribution agreement," Otto says so, accepts a file drop, confirms the file type, and fires the API.

2. **Free-form work** — User can ask questions, look things up, trigger skill actions, or instruct Otto to act on their behalf (e.g., "flag this for Tom to review").

**The "work in chat" pattern:**
```
Gate: "Distribution agreement PDF required"
↓
User drops PDF into Otto chat
↓
Otto validates (file type, size, vault association)
Otto fires: POST /vaults/{id}/documents
Gate condition evaluates → PASS
↓
Task runner advances to next node
Context Bar updates to next gate
Signal refreshes — no navigation required
```

Otto's scope in Dispatch is the **current vault context**. Otto knows the active vault, chamber, recipe node, and gate. It does not have cross-vault agency from Dispatch (that's a separate Conductor-level capability).

### Triage

Below Otto. The running list of everything waiting for you — across all vaults, all modules. This IS the Triage. Dispatch and Triage are not two different screens: Triage is the section of Dispatch that manages your outstanding work.

Shows all vaults where:
- The current user is assigned
- It is currently their turn to act (gate is waiting on them)
- Ordered by: SLA urgency → chamber → last touched

Each entry shows:
- Vault name + entity
- Chamber badge (color-coded)
- Gate awaiting action
- Time in queue / SLA countdown if applicable
- Quick-action button for inline-satisfiable gates

Clicking a Triage entry updates the Context Bar to that vault. Dispatch does not navigate away — it pulls the new vault's gate into the Gate Action Area.

**Triage is computed, not stored.** It is a live SQL view: vaults where you are assigned, gate is open, and it is your turn. No separate "todo list" entity. The vault hierarchy IS the work queue. Triage is just the filter that surfaces your slice of it.

---

## Engagement Modes

### Dispatch Mode (default)
Work happens entirely within Dispatch. Signal panel is full-width. User satisfies gates, advances recipe steps, and moves through their queue without navigating to any vault detail page.

Designed for: routine, sequential work. The expected daily flow for most users on most days.

### Deep Mode
User clicks "Go deep →" on a depth-required gate, or deliberately navigates into a vault (from the sidebar or command palette). Full Triptych renders. URL becomes `/(modules)/<module>/<vaultId>`.

When the user returns to `/` (home button, keyboard shortcut, or completing the vault): Dispatch resumes, Context Bar reflects that vault, Work Queue updates.

---

## Context Following

Dispatch tracks context at two levels:

| Level | What it tracks | Reset condition |
|-------|---------------|-----------------|
| **Active vault** | Last vault you touched (in Dispatch or deep mode) | Manually picking a different vault from Triage |
| **Triage** | All vaults awaiting your action | Completed gates auto-remove; new assignments auto-add via WebSocket |

Context is **not a lock** — you can always pick a different vault from the Work Queue or navigate freely. Context is simply the system's best guess at "what you were working on."

Context persists across sessions (stored in user preferences, not browser state).

---

## The Interruption Recovery Pattern

When a user returns to Dispatch after being away:

1. **Context Bar** shows the last active vault + the gate that was pending
2. **"You were here" indicator** — soft timestamp: "Left off 3 hours ago"
3. **"What changed" summary** — if events occurred on that vault while away, Otto surfaces a brief: "Tom approved the field patch. Gate now requires your sign-off."
4. **Work Queue** is re-sorted by urgency — most time-sensitive first
5. **SLA warnings** — gates past their SLA target are marked red in the queue

This makes returning from an interruption a three-second re-orientation, not a search.

---

## Relationship to the Triptych

Dispatch **is** a Triptych configuration — not a separate layout:

| Panel | Dispatch mode | Deep mode |
|-------|--------------|-----------|
| Signal | Full-width (65–70%) | Default width (~30%) |
| Orchestrate | Hidden | Expanded (primary surface) |
| Control | Hidden | Default width (~25%) |

The Triptych shell never breaks. Dispatch is Signal-dominant Triptych at the workspace level. Deep mode is the standard Triptych at the vault level. Same container, different weight distribution.

---

## Routing

| State | URL |
|-------|-----|
| Dispatch, no vault active | `/` |
| Dispatch, vault in context | `/` (context stored in user state, not URL) |
| Deep mode | `/(modules)/<module>/<vaultId>` |
| Return from deep mode | `/` (context = the vault you just came from) |

Deep links to specific vaults always work — navigating directly to a vaultId URL renders the full Triptych. Home button / back returns to Dispatch.

---

## Skill Rendering in Dispatch

Skills assigned to recipe nodes render in Dispatch exactly as they would in the full Triptych. Since Dispatch is Signal-dominant:

- **Signal-slot skills** render fully (this is Dispatch's home territory)
- **Orchestrate-slot skills** render as collapsed cards with a "Go deep →" affordance
- **Control-slot skills** are accessible via a collapsible side drawer

The gate action area in Dispatch IS the skill render for the current node's active skill. Conductor-built skills render their component here the same way system skills do.

---

## Component Requirements

| Component | Slot | Status |
|-----------|------|--------|
| `DispatchView` | template | new |
| `ContextBar` | signal | new |
| `GateActionArea` | signal | new — wraps inline skill renders |
| `TriageList` | signal | new — replaces WorkQueueList |
| `TriageItem` | signal | new — replaces WorkQueueItem |
| `TaskRunner` | signal | registry (M-pending) |
| `OttoChat` | signal | registry (M19) |
| `InterruptionBrief` | signal | new — "what changed while you were away" |

---

## Open Questions

- **SLA engine** — what defines an SLA target per gate? Conductor-configured per recipe node, or workspace-level defaults?
- **Cross-workspace Dispatch** — if a user belongs to multiple workspaces, does Dispatch aggregate across all of them or scope to one?
- **Notification integration** — does Dispatch replace the Notification Center for work-related alerts, or do they coexist?
- **Offline/async** — if Otto fires an API action from chat and it fails (e.g., wrong file type), how does Dispatch surface the error without losing context?
