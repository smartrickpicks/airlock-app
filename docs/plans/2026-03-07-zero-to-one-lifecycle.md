# Zero-to-One Onboarding — Lifecycle Journeys & Taxonomy Matrix

**Status:** DRAFT
**Date:** 2026-03-07
**Scope:** Full-stack lifecycle mapping — what exists, what's planned, what's stubbed
**Depends on:** `2026-03-07-capability-tree-design.md` (the visual graph that renders this data)

---

## Goal

Map every user journey from "empty workspace" to "fully activated module" as branching skill trees inside the capability graph. Each module is its own path with 3-5 milestones. Users explicitly choose which path to pursue first (like choosing a class in an MMO). Cross-module bridge nodes show where paths intersect. Every milestone is individually feature-flaggable (ON / MOCK / OFF).

---

## Decisions (Locked)

| Decision           | Choice                                                                       |
| ------------------ | ---------------------------------------------------------------------------- |
| Path selection     | Explicit module choice ("pick your path") after Foundation                   |
| Path scope         | Soft priority — chosen path highlighted, all paths remain open               |
| Milestones         | 3-5 per module, visible leveling (★☆☆ → ★★★)                                 |
| Cross-module       | Bridge nodes connect paths where features span modules                       |
| Feature flags      | Per-milestone granular: ON (real), MOCK (UI shell), OFF (hidden)             |
| Sub-tree rendering | Nested zoom — main graph shows module-level, click zooms into milestone tree |

---

## Lifecycle Phases

```
PHASE 0: BOOTSTRAP (Capability Tree Foundation Tier)
  ├── Workspace (name, industry, slug)
  ├── AI Provider (API key, model selection)
  └── Data Source (connect or load demo data)

PHASE 1: PATH SELECTION (the "class choice" moment)
  └── "Pick your first module" — explicit choice with unlock previews
      ├── ⭐ Contracts — "First vault in 5 min"
      ├── ⭐ CRM — "First contact in 3 min"
      ├── ⭐ Tasks — "First board in 2 min"
      ├── ⭐ Calendar — "First sync in 4 min"
      └── ⭐ Documents — "First upload in 1 min"
      (chosen path glows, others available but dimmer)

PHASE 2: MODULE ACTIVATION (zoom into chosen module's sub-tree)
  └── 3-5 milestones per module, each unlocking capabilities
      Bridge nodes appear where paths cross

PHASE 3: EXTENSIONS (back to main graph)
  ├── OTTO (auto-ready when AI Provider configured)
  ├── MCP Servers (paste URL → discover tools → permissions)
  ├── Skills (compose MCP tools into workflows)
  └── Integrations (Slack, DocuSign, etc.)

PHASE 4: SCALE (team + automation)
  ├── Members + Roles
  ├── Workflows + Event Bus
  └── Feature Flags
```

---

## Per-Module Skill Trees

### Contracts Path (5 milestones)

```
★☆☆☆☆  Create first vault
         └→ unlocks: vault detail view, triptych layout
★★☆☆☆  Upload first document
         └→ unlocks: Document Suite (PDF viewer), corpus
★★★☆☆  Run extraction engine
         └→ unlocks: Record Inspector, field cards, confidence scores
★★★★☆  Submit first patch
         └→ unlocks: patch workflow, diff viewer, approval chain
★★★★★  Complete approval cycle
         └→ unlocks: gate transitions, Ship chamber, OTTO contract queries
         └→ BRIDGE: "Link counterparty to CRM" (→ CRM module)
```

### CRM Path (4 milestones)

```
★☆☆☆  Import first contacts (or entity resolution from Contracts)
       └→ unlocks: vault hierarchy (L1-3), account cards
★★☆☆  Enrich account via MCP (Vibe Prospecting or manual)
       └→ unlocks: enrichment data, industry/headcount fields
★★★☆  Create deal vault (L4 linked to counterparty)
       └→ unlocks: pipeline kanban, deal stage progression
       └→ BRIDGE: "Attach contract to deal" (→ Contracts module)
★★★★  Configure lead scoring
       └→ unlocks: lead detection, confidence thresholds, auto-triage
```

### Tasks Path (3 milestones)

```
★☆☆  Create first task (manual or auto-generated)
     └→ unlocks: inbox view, kanban board
★★☆  Assign task to team member
     └→ unlocks: "My Tasks" view, assignee workload
     └→ BRIDGE: "Assign vault task" (→ Contracts or CRM)
★★★  Configure SLA rules
     └→ unlocks: SLA warnings, countdown timers, auto-escalation
     └→ BRIDGE: "SLA → Calendar" (→ Calendar module)
```

### Calendar Path (3 milestones)

```
★☆☆  View first computed events (requires Contracts or Tasks data)
     └→ unlocks: month/agenda views, date navigation
     └→ BRIDGE: "Import contract dates" (→ Contracts module)
★★☆  Configure advance warnings (-90/-30/-7 day alerts)
     └→ unlocks: SLA warning events, notification triggers
★★★  Connect external calendar (Google Calendar MCP)
     └→ unlocks: bidirectional sync, meeting links, availability
```

### Documents Path (3 milestones)

```
★☆☆  Upload first document
     └→ unlocks: library view, metadata organization
★★☆  Link document to vault
     └→ unlocks: vault document tab, cross-referencing
     └→ BRIDGE: "Upload contract PDF" (→ Contracts module)
★★★  Create template from document
     └→ unlocks: template library, clause blocks, generator input
```

### Bridge Nodes (Cross-Module)

| Bridge                   | From            | To              | Trigger                                               |
| ------------------------ | --------------- | --------------- | ----------------------------------------------------- |
| Link counterparty to CRM | Contracts ★★★★★ | CRM ★☆☆☆        | Entity resolution during extraction creates CRM vault |
| Attach contract to deal  | CRM ★★★☆        | Contracts ★☆☆☆☆ | Deal vault links to contract item vault               |
| Assign vault task        | Tasks ★★☆       | Contracts/CRM   | Task linked to vault via vault_id FK                  |
| SLA → Calendar           | Tasks ★★★       | Calendar ★☆☆    | SLA deadline creates calendar event                   |
| Import contract dates    | Calendar ★☆☆    | Contracts ★★★☆☆ | Extracted dates appear as calendar events             |
| Upload contract PDF      | Documents ★★☆   | Contracts ★★☆☆☆ | Document attached to vault, triggers extraction       |

---

## Master Taxonomy Matrix

### Legend

| Symbol      | Meaning                                             |
| ----------- | --------------------------------------------------- |
| **LIVE**    | Real code, real data flow, works end-to-end         |
| **MOCK**    | UI exists, uses mock/hardcoded data, no persistence |
| **STUB**    | File exists but empty/placeholder content           |
| **MISSING** | No code at all                                      |
| **PLANNED** | Designed in a spec but not yet coded                |

---

### Capability Tree Nodes — Implementation Status

| Tier       | Node             | Tree Config UI | Backend API                     | DB Table                   | Frontend Store            | Feature Flag              |
| ---------- | ---------------- | -------------- | ------------------------------- | -------------------------- | ------------------------- | ------------------------- |
| Foundation | Workspace        | MISSING        | LIVE (`/api/v1/auth/config`)    | LIVE (`workspaces`)        | MOCK (`auth.store`)       | `foundation.workspace`    |
| Foundation | AI Provider      | MISSING        | MISSING                         | MISSING                    | MOCK (`mock-connectors`)  | `foundation.ai_provider`  |
| Foundation | Data Source      | MISSING        | MISSING                         | MISSING                    | MOCK (`onboarding.store`) | `foundation.data_source`  |
| Platform   | Modules (toggle) | MISSING        | MISSING (no enable/disable API) | MISSING                    | MOCK (`onboarding.store`) | `platform.modules`        |
| Platform   | Members          | MISSING        | MISSING (no invite API)         | LIVE (`users`)             | MOCK (`admin.store`)      | `platform.members`        |
| Platform   | Roles            | MISSING        | LIVE (`user_module_roles`)      | LIVE (`user_module_roles`) | MOCK (`admin.store`)      | `platform.roles`          |
| Extensions | OTTO             | MISSING        | MISSING                         | MISSING                    | MOCK (`otto.store`)       | `extensions.otto`         |
| Extensions | MCP Servers      | MISSING        | MISSING                         | MISSING                    | MOCK (`mock-connectors`)  | `extensions.mcp_servers`  |
| Extensions | Skills           | MISSING        | MISSING                         | MISSING                    | MOCK (`mock-connectors`)  | `extensions.skills`       |
| Extensions | Integrations     | MISSING        | MISSING                         | MISSING                    | MOCK (`mock-connectors`)  | `extensions.integrations` |
| Scale      | Workflows        | MISSING        | MISSING                         | MISSING                    | MOCK (`workflow.store`)   | `scale.workflows`         |
| Scale      | Event Bus        | MISSING        | MISSING                         | MISSING                    | MOCK (`event-bus.store`)  | `scale.event_bus`         |
| Scale      | Feature Flags    | MISSING        | MISSING                         | MISSING                    | MOCK (`admin.store`)      | `scale.feature_flags`     |

---

### Contracts Module — Milestone Status

| Milestone               | Level | Frontend Page                | Frontend Store              | Backend Route                    | Backend Service           | DB Model                    | Engine              | Flag Key                 |
| ----------------------- | ----- | ---------------------------- | --------------------------- | -------------------------------- | ------------------------- | --------------------------- | ------------------- | ------------------------ |
| Create first vault      | ★☆☆☆☆ | LIVE (`/contracts/triage`)   | LIVE (`vault.store` → API)  | LIVE (`POST /vaults`)            | LIVE (`vault.py`)         | LIVE (`vaults`)             | —                   | `contracts.vault_create` |
| Upload first document   | ★★☆☆☆ | MOCK (`DocumentUploadModal`) | MOCK (`documents.store`)    | MISSING                          | MISSING                   | MISSING                     | —                   | `contracts.upload_doc`   |
| Run extraction engine   | ★★★☆☆ | MOCK (`RecordInspector`)     | MOCK (`extraction.store`)   | LIVE (`/engines/extraction/run`) | STUB (direct engine call) | MISSING (no result storage) | LIVE (7 extractors) | `contracts.extraction`   |
| Submit first patch      | ★★★★☆ | MOCK (`PatchEditor`)         | MOCK (`patch.store`)        | MISSING                          | MISSING                   | MISSING                     | —                   | `contracts.patch`        |
| Complete approval cycle | ★★★★★ | MOCK (`ApprovalChain`)       | MOCK (`review-queue.store`) | MISSING                          | MISSING                   | MISSING                     | —                   | `contracts.approval`     |

**Notes:**

- Vault CRUD is the only fully LIVE milestone end-to-end
- Extraction engine exists but results aren't persisted — they compute and return, not stored
- Upload modal exists as UI shell but no multipart form, no file storage
- Patch + Approval are complete UI flows with zero backend

---

### CRM Module — Milestone Status

| Milestone              | Level | Frontend Page          | Frontend Store     | Backend Route                      | Backend Service   | DB Model             | Flag Key              |
| ---------------------- | ----- | ---------------------- | ------------------ | ---------------------------------- | ----------------- | -------------------- | --------------------- |
| Import first contacts  | ★☆☆☆  | STUB (`/crm/accounts`) | MOCK (`crm.store`) | LIVE (`GET /vaults?vault_level=1`) | LIVE (`vault.py`) | LIVE (`vaults` L1-3) | `crm.import_contacts` |
| Enrich via MCP         | ★★☆☆  | MISSING                | MISSING            | MISSING                            | MISSING           | MISSING              | `crm.vibe_enrichment` |
| Create deal vault      | ★★★☆  | STUB (`/crm/pipeline`) | MOCK (`crm.store`) | LIVE (`POST /vaults`)              | LIVE (`vault.py`) | LIVE (`vaults` L4)   | `crm.deal_vault`      |
| Configure lead scoring | ★★★★  | MISSING                | MISSING            | MISSING                            | MISSING           | MISSING              | `crm.lead_scoring`    |

**Notes:**

- CRM is a lens over the vault hierarchy — L1-3 queries work via existing vault API
- react-admin wrapper exists but is a stub (placeholder pages, no real data provider)
- Enrichment via Vibe Prospecting is PLANNED in MCP registry spec but zero code
- Lead scoring is PLANNED in entity resolution spec but zero code

---

### Tasks Module — Milestone Status

| Milestone           | Level | Frontend Page         | Frontend Store       | Backend Route | Backend Service | DB Model | Flag Key          |
| ------------------- | ----- | --------------------- | -------------------- | ------------- | --------------- | -------- | ----------------- |
| Create first task   | ★☆☆   | MOCK (`/tasks/inbox`) | MOCK (`tasks.store`) | MISSING       | MISSING         | MISSING  | `tasks.create`    |
| Assign to member    | ★★☆   | MOCK (`TasksTable`)   | MOCK (`tasks.store`) | MISSING       | MISSING         | MISSING  | `tasks.assign`    |
| Configure SLA rules | ★★★   | MISSING               | MISSING              | MISSING       | MISSING         | MISSING  | `tasks.sla_rules` |

**Notes:**

- Task UI (inbox table + board) exists with mock data — full component implementations
- No `tasks` table in database — entirely missing from backend
- SLA engine is PLANNED in preflight engine (readiness.py has SLA metric computation) but no standalone config
- Task types are well-defined in mock data (triage, review, approval, action, sla_warning, entity_resolution, manual)

---

### Calendar Module — Milestone Status

| Milestone            | Level | Frontend Page            | Frontend Store          | Backend Route | Backend Service | DB Model       | Flag Key                 |
| -------------------- | ----- | ------------------------ | ----------------------- | ------------- | --------------- | -------------- | ------------------------ |
| View computed events | ★☆☆   | MOCK (`/calendar/month`) | MOCK (`calendar.store`) | MISSING       | MISSING         | N/A (computed) | `calendar.view_events`   |
| Configure warnings   | ★★☆   | MISSING                  | MISSING                 | MISSING       | MISSING         | MISSING        | `calendar.warnings`      |
| Connect external cal | ★★★   | MISSING                  | MISSING                 | MISSING       | MISSING         | MISSING        | `calendar.external_sync` |

**Notes:**

- Calendar has NO independent data storage by design — events are computed from vault dates + task due dates
- Month view component exists with mock data, uses schedule-x library
- Agenda view is a STUB (file exists, placeholder content)
- No backend computation of calendar events — the spec says `SELECT extracted_dates FROM vaults UNION SELECT due_at FROM tasks`
- External calendar sync (Google Calendar) is PLANNED in MCP registry spec

---

### Documents Module — Milestone Status

| Milestone             | Level | Frontend Page               | Frontend Store           | Backend Route | Backend Service | DB Model | Flag Key               |
| --------------------- | ----- | --------------------------- | ------------------------ | ------------- | --------------- | -------- | ---------------------- |
| Upload first document | ★☆☆   | STUB (`/documents/library`) | MOCK (`documents.store`) | MISSING       | MISSING         | MISSING  | `documents.upload`     |
| Link to vault         | ★★☆   | MISSING                     | MISSING                  | MISSING       | MISSING         | MISSING  | `documents.link_vault` |
| Create template       | ★★★   | MOCK (`ContractGenerator`)  | MOCK (`generator.store`) | MISSING       | MISSING         | MISSING  | `documents.templates`  |

**Notes:**

- Documents library page exists as a STUB — file is there but minimal content
- Document store uses mock data with full metadata model defined (type, status, version, format)
- File upload is entirely MISSING — no multipart endpoint, no S3/local storage
- Template creation UI exists within Contract Generator (MOCK) — clause library has 172 clauses
- Document Suite (PDF.js + TipTap) components exist and are functional for viewing

---

### Extensions — Implementation Status

| Extension             | Config UI               | Backend Routes | Backend Service | DB Tables                                  | Frontend Integration     | Flag Key                     |
| --------------------- | ----------------------- | -------------- | --------------- | ------------------------------------------ | ------------------------ | ---------------------------- |
| OTTO Chat             | MOCK (`ChatView`)       | MISSING        | MISSING         | MISSING (`otto_sessions`)                  | MOCK (`otto.store`)      | `extensions.otto`            |
| MCP Server Registry   | MOCK (`ConnectorsView`) | MISSING        | MISSING         | MISSING (`workspace_mcp_servers`)          | MOCK (`mock-connectors`) | `extensions.mcp_servers`     |
| MCP Tool Permissions  | MOCK (`ConnectorsView`) | MISSING        | MISSING         | MISSING (`workspace_mcp_tool_permissions`) | MOCK (`mock-connectors`) | `extensions.mcp_permissions` |
| Skills (Custom Tools) | MOCK (`SkillsList`)     | MISSING        | MISSING         | MISSING (`workspace_skills`)               | MOCK (`mock-connectors`) | `extensions.skills`          |
| Skill Creator         | MISSING                 | MISSING        | MISSING         | MISSING                                    | MISSING                  | `extensions.skill_creator`   |
| Integrations (OAuth)  | MOCK (`ConnectorsView`) | MISSING        | MISSING         | MISSING (`user_connections`)               | MOCK (`mock-connectors`) | `extensions.integrations`    |
| AI Provider Config    | MOCK (`ConnectorsView`) | MISSING        | MISSING         | MISSING (`workspace_ai_providers`)         | MOCK (`mock-connectors`) | `extensions.ai_providers`    |
| API Key Management    | MISSING                 | MISSING        | MISSING         | MISSING (`workspace_api_keys`)             | MISSING                  | `extensions.api_keys`        |

---

### Scale — Implementation Status

| Feature          | Config UI                 | Backend | DB      | Frontend                    | Flag Key              |
| ---------------- | ------------------------- | ------- | ------- | --------------------------- | --------------------- |
| Workflows        | MOCK (`WorkflowBuilder`)  | MISSING | MISSING | MOCK (`workflow.store`)     | `scale.workflows`     |
| Event Bus        | MOCK (admin page)         | MISSING | MISSING | MOCK (`event-bus.store`)    | `scale.event_bus`     |
| Feature Flags    | MOCK (admin page)         | MISSING | MISSING | MOCK (`admin.store`)        | `scale.feature_flags` |
| Notifications    | MOCK (notification panel) | MISSING | MISSING | MOCK (`notification.store`) | `scale.notifications` |
| Search           | MOCK (search modal)       | MISSING | MISSING | MOCK (`search.store`)       | `scale.search`        |
| Real-time Events | MISSING                   | MISSING | MISSING | MOCK (`realtime.store`)     | `scale.realtime`      |
| Messenger/Chat   | MOCK (chat panel)         | MISSING | MISSING | MOCK (`messenger.store`)    | `scale.messenger`     |

---

### Backend Infrastructure — Status

| Component                 | Status  | Files                                                      | Notes                                                                                         |
| ------------------------- | ------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| FastAPI App               | LIVE    | `apps/api/src/main.py`                                     | Running, routes registered                                                                    |
| Auth (Google OAuth + JWT) | LIVE    | `routes/auth.py`, `services/auth.py`, `services/jwt.py`    | Full flow working                                                                             |
| Vault CRUD + Hierarchy    | LIVE    | `routes/vaults.py`, `services/vault.py`, `models/vault.py` | 4-level tree, chamber progression                                                             |
| Events (Append-only)      | LIVE    | `routes/events.py`, `services/event.py`, `models/event.py` | Immutable audit trail                                                                         |
| PI Assessments            | LIVE    | `routes/pi_assessments.py`, `services/pi_assessment.py`    | Personality profiling                                                                         |
| Extraction Engine         | LIVE    | `engines/extraction/` (7 files, 60k+ LOC)                  | 7 extractors, confidence scoring                                                              |
| Preflight Engine          | LIVE    | `engines/preflight/` (6 files, 74k+ LOC)                   | Quality gates, health scoring                                                                 |
| Generation Engine         | LIVE    | `engines/generation/` (5 files, 83k+ LOC)                  | Template interpolation, variations                                                            |
| Database (PostgreSQL)     | LIVE    | 4 migrations                                               | 7 tables: workspaces, users, user_module_roles, vaults, vault_members, events, pi_assessments |
| Redis                     | PLANNED | docker-compose.yml                                         | Container defined but no app integration                                                      |
| BullMQ (Job Queue)        | MISSING | —                                                          | Spec references it for async jobs but zero code                                               |
| File Storage (S3/Local)   | MISSING | —                                                          | No upload handling at all                                                                     |
| WebSocket/SSE             | MISSING | —                                                          | No real-time transport                                                                        |
| LiteLLM Gateway           | PLANNED | spec exists                                                | Designed but not implemented                                                                  |

---

### Frontend Infrastructure — Status

| Component                   | Status    | Files               | Notes                                |
| --------------------------- | --------- | ------------------- | ------------------------------------ |
| Next.js 14 (App Router)     | LIVE      | `apps/web/`         | Running, all routes render           |
| Zustand Stores (23 total)   | MIXED     | `stores/*.store.ts` | 3 LIVE (auth, vault, event), 20 MOCK |
| React Components (90 total) | LIVE      | `components/`       | All render, proper TypeScript        |
| Mock Data (21 files)        | LIVE      | `lib/mock-*.ts`     | 8,854 LOC of comprehensive mock data |
| @xyflow/react               | INSTALLED | `package.json`      | Available for capability tree        |
| schedule-x (calendar)       | INSTALLED | `package.json`      | Used by calendar module              |
| react-admin (CRM)           | INSTALLED | `package.json`      | Installed but stub integration       |
| Tailwind + tokens.css       | LIVE      | `styles/tokens.css` | OLED dark theme fully defined        |
| API Client (fetch wrapper)  | LIVE      | `lib/api.ts`        | Graceful mock fallback pattern       |

---

### Database Tables — Current vs Needed

| Table                            | Status  | Migration | Used By                                   |
| -------------------------------- | ------- | --------- | ----------------------------------------- |
| `workspaces`                     | LIVE    | 001       | Auth, RLS boundary                        |
| `users`                          | LIVE    | 001       | Auth, membership                          |
| `user_module_roles`              | LIVE    | 001       | Role assignments                          |
| `vaults`                         | LIVE    | 002       | Contracts, CRM, all modules               |
| `vault_members`                  | LIVE    | 002       | Vault-level access                        |
| `events`                         | LIVE    | 003       | Audit trail                               |
| `pi_assessments`                 | LIVE    | 004       | Personality profiles                      |
| `documents`                      | MISSING | —         | Documents module, Contracts upload        |
| `tasks`                          | MISSING | —         | Tasks module, all modules (cross-cutting) |
| `patches`                        | MISSING | —         | Patch workflow (Contracts)                |
| `workspace_ai_providers`         | MISSING | —         | AI Provider config                        |
| `workspace_mcp_servers`          | MISSING | —         | MCP server registry                       |
| `workspace_mcp_tool_permissions` | MISSING | —         | Tool-level RBAC                           |
| `workspace_skills`               | MISSING | —         | Custom skill definitions                  |
| `workspace_api_keys`             | MISSING | —         | External MCP client auth                  |
| `user_connections`               | MISSING | —         | Personal OAuth connections                |
| `otto_sessions`                  | MISSING | —         | AI chat session persistence               |
| `otto_messages`                  | MISSING | —         | AI chat message history                   |
| `workspace_feature_flags`        | MISSING | —         | Feature flag state                        |

**Total: 7 LIVE / 12 MISSING**

---

### Mock Data Files — Mapping to Real Backend

| Mock File               | LOC    | Replaces With                                             | Priority        |
| ----------------------- | ------ | --------------------------------------------------------- | --------------- |
| `mock-vaults.ts`        | ~200   | Already has API fallback → LIVE vault API                 | DONE (fallback) |
| `mock-events.ts`        | ~300   | Already has API fallback → LIVE events API                | DONE (fallback) |
| `mock-extractions.ts`   | ~800   | `GET /api/v1/vaults/{id}/extractions` (needs storage)     | HIGH            |
| `mock-patches.ts`       | ~500   | `POST/GET /api/v1/vaults/{id}/patches`                    | HIGH            |
| `mock-clauses.ts`       | ~1,500 | Stays as-is (clause library is static reference data)     | N/A             |
| `mock-review-queue.ts`  | ~600   | Computed from vault + event queries                       | MEDIUM          |
| `mock-crm.ts`           | ~700   | `GET /api/v1/vaults?vault_level=1,2,3` (partially works)  | MEDIUM          |
| `mock-calendar.ts`      | ~400   | Computed from vault dates + task dates                    | MEDIUM          |
| `mock-tasks.ts`         | ~300   | `GET /api/v1/tasks` (needs tasks table)                   | HIGH            |
| `mock-documents.ts`     | ~400   | `GET /api/v1/documents` (needs documents table + storage) | HIGH            |
| `mock-notifications.ts` | ~300   | Novu integration (PLANNED)                                | LOW             |
| `mock-messenger.ts`     | ~600   | WebSocket chat (PLANNED)                                  | LOW             |
| `mock-meetings.ts`      | ~300   | Calendar sync (PLANNED)                                   | LOW             |
| `mock-otto.ts`          | ~400   | OTTO pipeline (PLANNED in gateway spec)                   | MEDIUM          |
| `mock-realtime.ts`      | ~300   | WebSocket/SSE transport                                   | LOW             |
| `mock-event-bus.ts`     | ~300   | Redis pub/sub (PLANNED)                                   | LOW             |
| `mock-admin.ts`         | ~200   | Admin API routes                                          | LOW             |
| `mock-onboarding.ts`    | ~300   | Capability tree store (replaces)                          | HIGH            |
| `mock-connectors.ts`    | ~250   | MCP registry tables                                       | MEDIUM          |
| `mock-search.ts`        | ~300   | Search API (MISSING)                                      | LOW             |

---

## Feature Flag Schema

Every milestone and capability node gets a granular feature flag:

```typescript
interface FeatureFlags {
  // Foundation tier
  "foundation.workspace": "on" | "mock" | "off";
  "foundation.ai_provider": "on" | "mock" | "off";
  "foundation.data_source": "on" | "mock" | "off";

  // Contracts path milestones
  "contracts.vault_create": "on" | "mock" | "off";
  "contracts.upload_doc": "on" | "mock" | "off";
  "contracts.extraction": "on" | "mock" | "off";
  "contracts.patch": "on" | "mock" | "off";
  "contracts.approval": "on" | "mock" | "off";

  // CRM path milestones
  "crm.import_contacts": "on" | "mock" | "off";
  "crm.vibe_enrichment": "on" | "mock" | "off";
  "crm.deal_vault": "on" | "mock" | "off";
  "crm.lead_scoring": "on" | "mock" | "off";

  // Tasks path milestones
  "tasks.create": "on" | "mock" | "off";
  "tasks.assign": "on" | "mock" | "off";
  "tasks.sla_rules": "on" | "mock" | "off";

  // Calendar path milestones
  "calendar.view_events": "on" | "mock" | "off";
  "calendar.warnings": "on" | "mock" | "off";
  "calendar.external_sync": "on" | "mock" | "off";

  // Documents path milestones
  "documents.upload": "on" | "mock" | "off";
  "documents.link_vault": "on" | "mock" | "off";
  "documents.templates": "on" | "mock" | "off";

  // Extensions
  "extensions.otto": "on" | "mock" | "off";
  "extensions.mcp_servers": "on" | "mock" | "off";
  "extensions.mcp_permissions": "on" | "mock" | "off";
  "extensions.skills": "on" | "mock" | "off";
  "extensions.skill_creator": "on" | "mock" | "off";
  "extensions.integrations": "on" | "mock" | "off";
  "extensions.ai_providers": "on" | "mock" | "off";
  "extensions.api_keys": "on" | "mock" | "off";

  // Scale
  "scale.workflows": "on" | "mock" | "off";
  "scale.event_bus": "on" | "mock" | "off";
  "scale.feature_flags": "on" | "mock" | "off";
  "scale.notifications": "on" | "mock" | "off";
  "scale.search": "on" | "mock" | "off";
  "scale.realtime": "on" | "mock" | "off";
  "scale.messenger": "on" | "mock" | "off";
}
```

### Flag Behavior

| State  | UI Behavior               | Data Source     | Tree Node State                |
| ------ | ------------------------- | --------------- | ------------------------------ |
| `on`   | Fully functional          | Real API calls  | `configured` (green glow)      |
| `mock` | UI works, shows data      | Mock data files | `configured` with "Demo" badge |
| `off`  | Hidden from tree entirely | N/A             | Node not rendered              |

### Current Reality (What We'd Ship Today)

```typescript
const CURRENT_FLAGS: FeatureFlags = {
  // Foundation
  "foundation.workspace": "on", // workspace table exists
  "foundation.ai_provider": "mock", // UI exists, no backend
  "foundation.data_source": "mock", // UI exists, no backend

  // Contracts
  "contracts.vault_create": "on", // ONLY fully live milestone
  "contracts.upload_doc": "mock", // UI shell, no file storage
  "contracts.extraction": "mock", // engine works but no result storage
  "contracts.patch": "mock", // full UI, no persistence
  "contracts.approval": "mock", // full UI, no persistence

  // CRM
  "crm.import_contacts": "mock", // vault API works for L1-3 but CRM UI is stub
  "crm.vibe_enrichment": "off", // zero code
  "crm.deal_vault": "mock", // vault API works but CRM pipeline is stub
  "crm.lead_scoring": "off", // zero code

  // Tasks
  "tasks.create": "mock", // UI exists, no tasks table
  "tasks.assign": "mock", // UI exists, no tasks table
  "tasks.sla_rules": "off", // zero code

  // Calendar
  "calendar.view_events": "mock", // month view with mock events
  "calendar.warnings": "off", // zero code
  "calendar.external_sync": "off", // zero code

  // Documents
  "documents.upload": "mock", // store exists, no file handling
  "documents.link_vault": "off", // zero code
  "documents.templates": "mock", // clause library exists in generator

  // Extensions
  "extensions.otto": "mock", // chat UI exists, no pipeline
  "extensions.mcp_servers": "mock", // ConnectorsView exists, no registry
  "extensions.mcp_permissions": "mock",
  "extensions.skills": "mock", // SkillsList exists, no backend
  "extensions.skill_creator": "off", // zero code
  "extensions.integrations": "mock", // ConnectorsView exists, no OAuth
  "extensions.ai_providers": "mock", // ConnectorsView exists, no backend
  "extensions.api_keys": "off", // zero code

  // Scale
  "scale.workflows": "mock", // WorkflowBuilder exists, no backend
  "scale.event_bus": "mock", // admin page exists, no backend
  "scale.feature_flags": "mock", // admin page exists, no backend
  "scale.notifications": "mock", // notification panel exists, no backend
  "scale.search": "mock", // search modal exists, no backend
  "scale.realtime": "off", // zero code
  "scale.messenger": "mock", // chat panel exists, no backend
};
```

**Summary: 1 ON, 22 MOCK, 14 OFF** — that's 1 fully live feature out of 37 total milestones.

---

## Implementation Priority (Zero-to-One Order)

### Wave 1: Foundation + First Vault (make "contracts.vault_create" → "contracts.extraction" fully live)

| Task                          | Moves Flag             | From → To | Backend Work                                      | Frontend Work                  |
| ----------------------------- | ---------------------- | --------- | ------------------------------------------------- | ------------------------------ |
| Document upload API + storage | `contracts.upload_doc` | mock → on | `documents` table, upload route, S3/local storage | Wire `documents.store` to API  |
| Extraction result persistence | `contracts.extraction` | mock → on | `extractions` storage route, vault metadata       | Wire `extraction.store` to API |
| Tasks table + CRUD            | `tasks.create`         | mock → on | `tasks` table, routes, service                    | Wire `tasks.store` to API      |
| Patch persistence             | `contracts.patch`      | mock → on | `patches` table, routes, service                  | Wire `patch.store` to API      |

### Wave 2: CRM + Cross-Module (make CRM path functional)

| Task                                                | Moves Flag             | From → To    |
| --------------------------------------------------- | ---------------------- | ------------ |
| CRM data provider (react-admin → vault API)         | `crm.import_contacts`  | mock → on    |
| Pipeline view with real vault L4 data               | `crm.deal_vault`       | mock → on    |
| Entity resolution → CRM vault creation              | bridge node            | missing → on |
| Calendar computed events (vault dates + task dates) | `calendar.view_events` | mock → on    |

### Wave 3: Extensions (OTTO + MCP)

| Task                               | Moves Flag                   | From → To |
| ---------------------------------- | ---------------------------- | --------- |
| AI Provider config table + LiteLLM | `extensions.ai_providers`    | mock → on |
| OTTO query pipeline                | `extensions.otto`            | mock → on |
| MCP server registry tables         | `extensions.mcp_servers`     | mock → on |
| MCP tool permissions               | `extensions.mcp_permissions` | mock → on |

### Wave 4: Scale (Automation + Social)

| Task                           | Moves Flag            | From → To |
| ------------------------------ | --------------------- | --------- |
| Feature flags table + admin UI | `scale.feature_flags` | mock → on |
| Notification service (Novu)    | `scale.notifications` | mock → on |
| WebSocket/SSE transport        | `scale.realtime`      | off → on  |
| Search API                     | `scale.search`        | mock → on |

---

## Relationship to Other Plans

| Plan                           | Relationship                                                                                    |
| ------------------------------ | ----------------------------------------------------------------------------------------------- |
| `capability-tree-design.md`    | This doc provides the DATA for the tree nodes — what's configured, what level each module is at |
| `demo-readiness-build-plan.md` | Wave 1 here aligns with Track A + Track B from demo readiness                                   |
| `otto-mcp-gateway-design.md`   | Wave 3 here implements the gateway spec — OTTO node in tree visualizes readiness                |
| `mcp-registry-and-skills.md`   | Wave 3 here implements Tracks M1-M2 from registry spec                                          |
