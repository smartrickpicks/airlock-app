# MVP Frontend Enhancement Plan
> **Date:** 2026-03-06
> **Purpose:** Map the delta between current UI state and what's needed for the demo to "show not tell."

---

## Current State (Audit Summary)

| Area | Built | Real Backend | Demo-Ready |
|---|---|---|---|
| Auth (Google OAuth) | ✅ | ✅ | ✅ |
| Vault CRUD | ✅ | ✅ | ✅ |
| Contracts UI shell | ✅ | Mock | ⚠️ |
| Extraction display | ✅ | Mock | ⚠️ |
| Patch workflow | ✅ | Mock | ⚠️ |
| Contract generator | ✅ | Mock | ⚠️ |
| Review queue | ✅ | Mock | ⚠️ |
| CRM module | ✅ | Mock | ❌ |
| Tasks module | ✅ | Mock | ❌ |
| Calendar module | ✅ | Mock | ❌ |
| Documents module | ✅ | Mock | ❌ |
| Messenger | ✅ | Mock | ❌ |
| Search / Cmd+K | ✅ | Mock | ❌ |
| Otto AI assistant | ✅ | Mock | ❌ |
| Real-time (WebSocket) | Store exists | Not wired | ❌ |
| Gate enforcement UI | ✅ (static) | Not wired | ❌ |
| Omni-channel inbox | ❌ | ❌ | ❌ |

---

## The Demo Sequence (What Must Work)

From the competitive analysis, the 3-minute demo that closes deals:

| Moment | What the user sees | What must be real |
|---|---|---|
| 1. "Unified workspace" | One screen with messages, tasks, docs, calendar | UI layout — already exists |
| 2. "Slash command magic" | Type `/find` → contract retrieved instantly | Search store + real Cmd+K + real data |
| 3. "AI gate check" | Upload bad contract → AI flags missing clause | Document upload flow + real extraction + gate logic |
| 4. "Omni-channel" | External message routes to correct deal vault | Communications inbox + routing display |
| 5. "Show the data" | Triptych with real fields, real confidence, real events | Extraction wired end-to-end |

**The single highest-value enhancement:** Wiring the extraction pipeline end-to-end (upload → OCR → fields → confidence → verification). This is the moment that makes everything real. Everything else is cosmetic without it.

---

## Enhancement Priority (Ranked by Demo Impact)

### P0 — Must Work Before Any Demo

#### P0.1 — Document Upload + Extraction Pipeline
**Files to change:**
- `apps/web/src/stores/extraction.store.ts` — wire to real API
- `apps/web/src/components/organisms/ExtractionPanel/` — add upload drop zone + processing states
- `apps/api/src/routes/documents.py` — new file (upload endpoint)
- `apps/api/src/routes/extraction.py` — new file (extraction status + field routes)
- `apps/api/src/services/extraction_service.py` — new file (orchestrates engines)
- `apps/api/src/workers/extraction_worker.py` — new file (BullMQ worker)
- `apps/api/alembic/versions/004_add_documents_extraction.py` — new migration

**What it unlocks:**
- The demo's "AI extracts fields from a real contract" moment
- Real confidence scores (not hardcoded mock values)
- Gate unlock based on actual field verification
- Otto's context window has real data

**Estimated scope:** Full-stack feature. The engines already exist (23 files). Need service layer + routes + worker + frontend upload UI.

---

#### P0.2 — Gate Enforcement UI (Live State)
**Current problem:** `GateDot` components render static mock states. They don't reflect real vault/field state.

**Files to change:**
- `apps/web/src/components/atoms/GateDot/GateDot.tsx` — accept real `gateStatus` prop from store
- `apps/web/src/stores/vault.store.ts` — compute gate state from extracted field verification status
- `apps/api/src/routes/vaults.py` — add `gate_status` to vault response payload

**Gate state logic:**
```typescript
// Discover gate = all mandatory fields verified
// Build gate = patch approved (if patches exist) or no patches needed
// Review gate = gatekeeper approved
// Ship gate = owner promoted

function computeGateStatus(vault, fields): GateStatus {
  const mandatoryFields = fields.filter(f => f.required);
  const verifiedCount = mandatoryFields.filter(f =>
    f.verification_status === 'accepted' || f.verification_status === 'manually_corrected'
  ).length;

  if (verifiedCount === 0) return 'locked';
  if (verifiedCount < mandatoryFields.length) return 'in_progress';
  return 'passed';
}
```

**What it unlocks:** The demo's "AI gate check" moment. Dropping a contract with a missing mandatory field shows the gate stay locked. Fixing the field turns it green in real time.

---

#### P0.3 — Real-Time WebSocket Subscription
**Current problem:** `realtime.store.ts` exists but isn't connected to anything. The Signal panel is static.

**Files to change:**
- `apps/web/src/stores/realtime.store.ts` — connect to `ws://api/ws/vaults/{id}`
- `apps/api/src/routes/realtime.py` — new file (WebSocket endpoint per vault)
- `apps/api/src/services/realtime.py` — new file (Redis pub/sub → WebSocket fan-out)

**Topics to subscribe:**
- `vault:{id}` — all events for a vault (extraction progress, patches, gate changes)
- `workspace:{id}` — workspace-level events (new vault, new communication)

**What it unlocks:** Extraction progress updates stream live into the Signal panel. Gate transitions animate in real time. The demo doesn't need a page refresh.

---

### P1 — High Impact, Demo-Accelerating

#### P1.1 — Cmd+K / Slash Commands Backed by Real Data
**Current problem:** `search.store.ts` uses `MOCK_SEARCH_RESULTS` only. The command palette UI exists but queries no backend.

**Files to change:**
- `apps/web/src/stores/search.store.ts` — wire to `/api/v1/search`
- `apps/api/src/routes/search.py` — new file (cross-module search across vaults, tasks, events)
- MeiliSearch or PostgreSQL full-text: index vaults, tasks, extracted fields

**Slash commands to enable first (in order of demo value):**
1. `/find [query]` → semantic search across extracted fields + vault names
2. `/vault [name]` → jump to vault by name
3. `/task [title]` → jump to task or create task

**What it unlocks:** The demo's "2-second document retrieval" moment vs "5 minutes in Dropbox + Ctrl+F."

---

#### P1.2 — Otto AI Streaming (Real SSE)
**Current problem:** `otto.store.ts` uses hardcoded `MOCK_OTTO_RESPONSES`. No real LLM call.

**Files to change:**
- `apps/web/src/stores/otto.store.ts` — wire to `/api/v1/otto/chat` SSE stream
- `apps/web/src/components/organisms/OttoDrawer/` — use Vercel AI SDK `useChat` hook
- `apps/api/src/routes/otto.py` — new file (PydanticAI agent endpoint, already specced in ai-agent spec)

**Minimum viable Otto for demo:** Ask Otto questions about an open vault (e.g., "What is the royalty rate in this contract?") and get a real LLM response grounded in the extracted fields.

**What it unlocks:** Otto becomes the third rail of the demo. After showing extraction and slash commands, watching Otto answer "What are the payment terms in the Henderson MSA?" from real extracted data closes the room.

---

#### P1.3 — Tasks Wired to Backend
**Current problem:** Tasks module is fully mocked. Tasks appear to exist but can't be created, updated, or assigned to real vaults.

**Files to change:**
- `apps/api/src/routes/tasks.py` — new file
- `apps/api/src/services/task.py` — new file
- `apps/api/src/models/task.py` — new model
- `apps/api/alembic/versions/005_add_tasks.py` — new migration
- `apps/web/src/stores/tasks.store.ts` — wire to real API

**Minimum viable tasks:** Create a task from a message in the Signal panel. Assign it to a user. Complete it from the Tasks inbox.

---

### P2 — Needed for Complete Demo Story

#### P2.1 — CRM Module Wired to Vault Hierarchy
**Current problem:** CRM is fully mocked. The vault hierarchy IS the CRM (per spec) but the frontend renders `MOCK_CRM_DATA` not vault queries.

**The fix:** CRM store should query the vault API with filters, not a separate CRM endpoint.
```typescript
// Accounts = Level 1 vaults (module: 'crm', vault_type: 'account')
// Deals = Level 3 vaults (module: 'contracts', vault_type: 'deal')
// Leads = Level 3 vaults (module: 'crm', vault_type: 'lead', chamber: 'discover')
fetchAccounts() → GET /api/v1/vaults?module=crm&level=1
fetchDeals() → GET /api/v1/vaults?module=contracts&level=3
fetchLeads() → GET /api/v1/vaults?module=crm&level=3&vault_type=lead
```

**What it unlocks:** Contacts and deals created during the omni-channel demo moment automatically appear in the CRM.

---

#### P2.2 — Omni-Channel Communications Inbox
**Current problem:** No communications inbox exists. The omni-channel spec is written but nothing is built.

**Files to create:**
- `apps/web/src/app/(modules)/crm/communications/page.tsx`
- `apps/web/src/components/organisms/CommunicationsInbox/`
- `apps/web/src/stores/communications.store.ts`

**Minimum viable inbox:** Show a list of inbound messages with channel icon, contact identifier, routing status, and assigned vault. Allow manual re-routing. Show the routing AI's decision confidence.

---

#### P2.3 — Signal Panel — Live Event Feed
**Current problem:** Signal panel renders mock events. Needs to subscribe to `vault:{id}` WebSocket topic (from P0.3) and append events as they arrive.

**Enhancement:** Each event type needs a distinct card style:
- `document_uploaded` → file icon + filename + "queued" badge
- `extraction_complete` → field summary card with confidence breakdown
- `gate_passed` / `gate_failed` → gate dot + description
- `patch_submitted` / `patch_approved` → patch reference with status pill
- `external_communication` → channel icon + message preview + routing badge
- `otto_response` → Otto icon + truncated response + "View in Context Panel →"

---

### P3 — Complete the Platform Story

#### P3.1 — Calendar Wired to Vault Dates
Per spec: calendar events are computed from vault extraction dates + task due dates. No stored calendar events.

**Files to change:**
- `apps/web/src/stores/calendar.store.ts` — derive events from vault effective/expiration dates + task due dates
- Remove dependency on `MOCK_CALENDAR_EVENTS`

---

#### P3.2 — Documents Module Wired to Uploaded Files
**Files to change:**
- `apps/web/src/stores/documents.store.ts` — wire to `/api/v1/documents`
- Documents store should list all documents across vaults the user has access to

---

#### P3.3 — Notifications Wired to Real Events
**Files to change:**
- `apps/web/src/stores/notification.store.ts` — subscribe to workspace WebSocket and generate notifications from events
- Gate passed → notification
- Patch approved → notification
- New communication routed to your vault → notification

---

## Missing Database Migrations (Required for MVP)

| Migration | Tables | Priority |
|---|---|---|
| `004_add_documents_extraction.py` | `documents`, `extraction_jobs`, `extracted_fields` | P0 |
| `005_add_tasks.py` | `tasks` | P1 |
| `006_add_communications.py` | `contacts`, `communications`, `pools`, `pool_agents`, `routing_rules` | P2 |
| `007_add_search_index_config.py` | `search_index_configs` (MeiliSearch sync metadata) | P1 |

---

## Missing API Routes (Required for MVP)

| Route File | Endpoints | Priority |
|---|---|---|
| `documents.py` | POST `/vaults/{id}/documents`, GET `/vaults/{id}/documents` | P0 |
| `extraction.py` | GET `/vaults/{id}/extraction`, PATCH `/extracted-fields/{id}`, POST `/extracted-fields/bulk-accept` | P0 |
| `realtime.py` | WebSocket `/ws/vaults/{id}`, WebSocket `/ws/workspace/{id}` | P0 |
| `search.py` | GET `/search?q=&modules=&limit=` | P1 |
| `otto.py` | POST `/otto/chat` (SSE stream), GET `/otto/sessions/{vaultId}` | P1 |
| `tasks.py` | Full CRUD for tasks | P1 |
| `communications.py` | Webhooks + CRUD + reply | P2 |
| `pools.py` | CRUD for pools + pool agents | P2 |
| `routing-rules.py` | CRUD for routing rules | P2 |

---

## Frontend Components to Create (Not Just Wire)

| Component | Where | Priority | Description |
|---|---|---|---|
| `DocumentUploadZone` | Orchestrate panel | P0 | Drag-drop + progress states (idle/uploading/processing/complete) |
| `ExtractionProgressCard` | Signal panel | P0 | Processing status stream card |
| `FieldVerificationList` | Orchestrate panel | P0 | Enhance existing: add upload state, wire actions |
| `GateDot (enhanced)` | Shell sidebar, Triptych | P0 | Live gate state from real field data |
| `CommunicationsInbox` | `/crm/communications` | P2 | Unified external message list |
| `RoutingDecisionCard` | Signal panel | P2 | AI router decision + action buttons |
| `ConversationThread` | Orchestrate panel tab | P2 | Full thread view + reply composer |
| `RoutingRulesBuilder` | `/admin/routing-rules` | P2 | Deterministic rule configuration |
| `RealtimeEventCard` | Signal panel | P1 | Typed event cards per event type |

---

## What Stays Mock (Intentionally, for Now)

These are not needed for the Phase 1 demo and would be over-engineering to build now:

- Video conferencing (Jitsi) — Phase 3
- E-signature annotation layer — Phase 3
- Mobile apps — Phase 3
- Integration marketplace / webhooks out — Phase 3
- Calendar deep integration (Google/Outlook sync) — Phase 2
- Lead scoring ML model — Phase 3 (rule-based scoring is enough for POC)
- Full email sequence tooling — Phase 2

---

## Implementation Order

```
Week 1-2:  P0.1 Extraction pipeline (full-stack: migration + engines + routes + upload UI)
Week 2:    P0.2 Gate enforcement UI (live GateDot from real field state)
Week 3:    P0.3 WebSocket real-time (realtime.store → Redis pub/sub → Signal panel)
Week 4:    P1.1 Cmd+K search (search.py route + MeiliSearch + store wired)
Week 4:    P1.2 Otto streaming (otto.py SSE route + useChat hook)
Week 5:    P1.3 Tasks backend (migration + routes + store wired)
Week 5:    P2.1 CRM wired to vault hierarchy (no new endpoints — reuse vault API)
Week 6:    P2.2 Communications inbox (migration + webhook routes + inbox UI)
Week 6:    P2.3 Signal panel live event cards (WebSocket events → typed card components)
Week 7:    P3.x Calendar computed events, Documents library, Notifications
```

---

## The "Show Don't Tell" Checklist

Before the first external demo, these must be true:

- [ ] Drop a real PDF contract → extraction runs → fields appear with confidence scores
- [ ] Gate stays locked until required fields are verified
- [ ] Gate turns green after bulk-accept → Signal panel shows "Discover gate passed"
- [ ] Type `/find royalty rate` → correct contract field retrieved in <1 second
- [ ] Ask Otto "What are the payment terms?" → real LLM response grounded in extracted data
- [ ] Send an iMessage (or simulate) → routing decision appears in Signal panel with confidence score
- [ ] All of the above with zero page refreshes (real-time via WebSocket)
