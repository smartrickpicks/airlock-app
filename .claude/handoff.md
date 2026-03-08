# Airlock — Agent Handoff Document

> **Updated:** 2026-03-05
> **Last commit:** `1062f7e` on `main`
> **All M1-M10 complete, pushed to remote**

---

## Quick Start

```bash
cd /Users/zacharyholwerda/Desktop/airlock-app
source ~/.nvm/nvm.sh && nvm use 20
pnpm dev           # Dev server at localhost:3000
pnpm type-check    # TypeScript check (NOT npx tsc)
pnpm lint          # ESLint check
```

Read `CLAUDE.md` in project root first — it has vocabulary, architecture, and rules.

---

## What Is Airlock?

Enterprise data ops platform. Discord-like interface for contract lifecycle management. Three-panel "Triptych" layout (Signal | Orchestrate | Control). Vault-based data hierarchy where vaults flow through 4 Chambers: Discover > Build > Review > Ship.

**DO NOT use:** "channel", "phase", "stage", "workstream". Use: Vault, Module, Chamber, Gate, View, Triptych.

---

## Architecture

```
apps/web/     — Next.js 14 (App Router, TypeScript, Zustand, Tailwind)
apps/api/     — FastAPI (Python, PostgreSQL 16, Redis 7) — NOT RUNNING YET
packages/shared-types/ — OpenAPI-generated TS client
docs/plans/   — Implementation plans per milestone
# Specs, concepts, registries → airlock-docs repo (via MCP)
```

---

## Completed Milestones (M1-M10)

| #   | Milestone          | What It Built                                       |
| --- | ------------------ | --------------------------------------------------- |
| 1   | Monorepo + Shell   | Turborepo, module bar, sub-panel, Triptych layout   |
| 2   | Auth + Roles       | AuthProvider, role store, dev login bypass          |
| 3   | Vault Data Model   | SQLAlchemy models, CRUD, Alembic migrations         |
| 4   | Contracts Views    | Triage board, vault detail page                     |
| 5   | Events + Feed      | Event store, Signal panel activity feed             |
| 6   | Record Inspector   | Field extraction table, confidence scores           |
| 7   | Patch Workflow     | Patch states, SLA timer, approval chain             |
| 8   | Contract Generator | Clause picker, section wizard, preview              |
| 9   | Review Queue       | EntityCard, HandoffSignals, FilterBar, ActivityFeed |
| 10  | CRM (Phase 1)      | AccountsTable, PipelineBoard (dnd), LeadsTable      |

Full commit ranges: see memory file `milestones.md`

---

## Strategy: Horizontal Slices First (decided 2026-03-05)

Build all features to ~60% (mock data, functional UI), then do a vertical refinement pass after M25. Don't polish the shell yet — every new module teaches something that affects earlier work. Mock data carries the entire demo through M24. Engine ports (OrcestrateOS) moved to M25.

### Wave 2: Core Modules (M11-15)

| #   | Milestone              | Scope                                                                          |
| --- | ---------------------- | ------------------------------------------------------------------------------ |
| 11  | Tasks Module           | Kanban (reuse dnd), table, inbox, focus mode. Task store + mock data.          |
| 12  | Calendar Module        | Schedule-X integration, month/week/agenda views, computed from vault dates.    |
| 13  | Documents Module       | TipTap editor + PDF.js viewer, file list view. Document store.                 |
| 14  | Component Library Pass | Extract Modal, Button, Toast, Table, Dropdown, EmptyState from 5 modules.      |
| 15  | Admin & Settings       | User profile, workspace settings, appearance toggle, Feature Control Plane UI. |

### Wave 3: Cross-Cutting Infrastructure (M16-20)

| #   | Milestone             | Scope                                                                          |
| --- | --------------------- | ------------------------------------------------------------------------------ |
| 16  | Search / Cmd+K        | Command palette overlay, slash commands, module search, Fuse.js client-side.   |
| 17  | Notifications         | Toast system, notification center panel, Novu integration (backend).           |
| 18  | Real-Time / WebSocket | WebSocket client + Redis Pub/Sub backend, topic subscriptions, auto-reconnect. |
| 19  | Otto AI Agent         | Chat interface in Control panel, PydanticAI + LiteLLM backend, streaming.      |
| 20  | Event Bus (BullMQ)    | Backend job queue, vault event routing, webhook handlers.                      |

### Wave 4: Advanced Features (M21-25)

| #   | Milestone                | Scope                                                                           |
| --- | ------------------------ | ------------------------------------------------------------------------------- |
| 21  | Messenger                | Dock tool (340px drawer), vault threads, DMs, team channels. Store + WebSocket. |
| 22  | Meeting Intelligence     | Jitsi Docker sidecar, embedded video, post-call pipeline.                       |
| 23  | Workflow Engine          | React Flow canvas, workflow builder UI, BullMQ execution.                       |
| 24  | Onboarding Wizard        | Workspace setup, user journey, progressive complexity.                          |
| 25  | OrcestrateOS Engine Port | Extraction, Preflight, Generation engines ported to backend.                    |

---

## Mock-Data-First Strategy

ALL frontend milestones use mock data. The pattern:

```
src/lib/mock-<feature>.ts       — Types + MOCK_* exported constants
src/stores/<feature>.store.ts   — Zustand: apiFetch in try, mock in catch
src/components/<level>/*.tsx     — UI components (Tailwind tokens only)
src/app/(shell)/(modules)/<module>/<view>/page.tsx — Route page
```

Real API integration comes in M25 (engine ports from OrcestrateOS).

---

## How to Build a Milestone

1. **Read spec:** `airlock-docs/specs/<feature>/overview.md` + sub-specs (via MCP)
2. **Write plan:** Use `writing-plans` skill, save to `docs/plans/YYYY-MM-DD-<feature>.md`
3. **Execute:** Use `subagent-driven-development` skill (user always picks option 1)
   - Fresh subagent per task, parallel dispatch for independent tasks
4. **Verify:** `pnpm type-check && pnpm lint` — both must pass clean
5. **Push:** `git push origin main`
6. **Show tracker:** Display milestone completion table
7. **Update memory:** Edit `milestones.md` with commit range

---

## Key File Paths

| What               | Path                                                   |
| ------------------ | ------------------------------------------------------ |
| Project rules      | `CLAUDE.md`                                            |
| Web rules          | `apps/web/CLAUDE.md`                                   |
| Design tokens      | `apps/web/src/styles/tokens.css`                       |
| Specs index        | `airlock-docs/specs/start.md` (via MCP)                |
| Component registry | `airlock-docs/registry/components.json` (via MCP)      |
| Plans              | `docs/plans/`                                          |
| Mock data          | `apps/web/src/lib/mock-*.ts`                           |
| Stores             | `apps/web/src/stores/*.store.ts`                       |
| Module routes      | `apps/web/src/app/(shell)/(modules)/`                  |
| Shell layout       | `apps/web/src/components/templates/ShellLayout.tsx`    |
| Triptych layout    | `apps/web/src/components/templates/TriptychLayout.tsx` |
| Sub-panel          | `apps/web/src/components/organisms/SubPanel.tsx`       |
| Module bar         | `apps/web/src/components/organisms/ModuleBar.tsx`      |
| Constants/nav      | `apps/web/src/lib/constants.ts`                        |

---

## Critical Rules

1. **Node 20:** `source ~/.nvm/nvm.sh && nvm use 20` before any command
2. **Type-check:** `pnpm type-check` (never `npx tsc`)
3. **No raw colors:** Tailwind tokens from `tokens.css` only
4. **App Router only:** No Pages Router, no getServerSideProps
5. **`"use client"`:** Required for components with hooks/state
6. **Specs first:** Read `airlock-docs/specs/<feature>/overview.md` (via MCP) before implementing
7. **CRM = vault hierarchy:** Never create separate CRM database tables
8. **Commits:** Conventional format, end with `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`
9. **Commitlint quirks:** "deps" scope fails, use `build(web):` instead; "auth" scope fails, use "roles"

---

## User Preferences

- Always picks **subagent-driven execution** (option 1)
- Wants **milestone tracker** shown after each completion
- Wants **push to remote** after each milestone
- Uses the `writing-plans` then `subagent-driven-development` skill chain
- Mock data first, real engines at M25
- Strategy: horizontal slices (all features to 60%) before vertical refinement
