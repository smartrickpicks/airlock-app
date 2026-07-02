# Otto / Agentic Layer — Implementation Plan

> **Date:** 2026-03-08
> **Branch:** `claude/otto-agentic-layer-33684`
> **Scope:** Backend infrastructure for Otto AI, WebSocket, Event Bus, Messenger, Workflow Engine, MCP + Skills

---

## Overview

This plan builds the **backend infrastructure** that the existing frontend (stores, components, mock data) will connect to. The frontend code is already well-structured with mock-first patterns — each store has `apiFetch` in try, mock fallback in catch. Our job is to make those API calls succeed.

**Strategy:** Build each system end-to-end (DB → service → route → frontend wire-up), verify type-check + lint after each milestone, push incrementally.

---

## Phase 1: Otto SSE Streaming (M19 Backend)

**Goal:** Real SSE endpoint that the `useOttoChat` hook connects to. PydanticAI agent with VaultContext dependency injection.

### 1.1 Database Tables

Create Alembic migration `006_add_otto_sessions_messages.py`:

```sql
-- otto_sessions: one per vault per user
CREATE TABLE otto_sessions (
    id TEXT PRIMARY KEY,                      -- prefix: ots_
    vault_id TEXT NOT NULL REFERENCES vaults(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    model_used TEXT,
    enrichment_snapshot JSONB DEFAULT '{}',
    tool_calls_count INT DEFAULT 0,
    total_tokens INT DEFAULT 0,
    total_cost NUMERIC(10, 6) DEFAULT 0,
    message_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    last_message_at TIMESTAMPTZ DEFAULT now()
);

-- otto_messages: multi-turn conversation
CREATE TABLE otto_messages (
    id TEXT PRIMARY KEY,                      -- prefix: otm_
    session_id TEXT NOT NULL REFERENCES otto_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL,                       -- 'user' | 'assistant' | 'tool'
    content TEXT NOT NULL,
    tool_calls JSONB,
    tool_results JSONB,
    tool_name TEXT,
    model TEXT,
    tokens_used INT,
    cost NUMERIC(10, 6),
    enrichment_sources_used TEXT[],
    finish_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### 1.2 Backend Files

```
apps/api/src/otto/
├── __init__.py
├── agent.py              # PydanticAI agent definition + system prompt
├── deps.py               # VaultContext dataclass + enrichment sub-types
├── tools.py              # 8 read-only tools (get_gate_blockers, etc.)
├── enrichment.py         # 9 async enrichment sources (asyncio.gather)
├── feature_gate.py       # Circuit breaker + feature flag checks
├── sse.py                # SSE formatting helpers (Vercel AI SDK wire format)
├── session_service.py    # Session CRUD + message persistence
└── models.py             # SQLAlchemy ORM for otto_sessions, otto_messages
```

**Route:** `POST /api/v3/vaults/{vault_id}/otto/chat` → SSE stream
**Route:** `GET /api/v3/vaults/{vault_id}/otto/session` → Load session + history
**Route:** `DELETE /api/v3/vaults/{vault_id}/otto/session` → Clear session

### 1.3 SSE Wire Format

Vercel AI SDK format:

- `0:"token"` — text delta
- `2:[{toolCallId, toolName, args}]` — tool call
- `8:[{toolCallId, result}]` — tool result
- `e:{finishReason, usage}` — finish
- `d:[DONE]` — stream end

### 1.4 Frontend Wire-Up

- Create `apps/web/src/hooks/useOttoChat.ts` using Vercel AI SDK `useChat`
- Update `otto.store.ts` to use real SSE instead of mock word-by-word simulation
- Keep mock fallback for when backend is unavailable

### 1.5 Enrichment Sources (Mock-First)

All 9 enrichment sources return mock data initially (no real engines needed yet — engines already exist in `apps/api/src/engines/`). Pattern:

```python
async def enrich_gate_state(vault_id: str) -> GateState | None:
    try:
        # Try real query
        vault = await get_vault(vault_id)
        return GateState(gate_color=vault.gate, health_score=vault.health_score, ...)
    except Exception:
        return None  # Graceful degradation
```

### 1.6 LiteLLM Integration

- `litellm-config.yaml` already exists with otto-default (Claude Sonnet), otto-fast (Haiku), otto-local (Ollama)
- Add LiteLLM to docker-compose.yaml
- PydanticAI agent uses `LiteLLMModel(model_name="otto-default")`

---

## Phase 2: WebSocket Real-Time (M18 Backend)

**Goal:** Starlette WebSocket endpoint with Redis Pub/Sub for live event delivery.

### 2.1 Backend Files

```
apps/api/src/realtime/
├── __init__.py
├── ws.py                 # WebSocket endpoint handler
├── connection_manager.py # Track connections, subscriptions, presence
├── redis_pubsub.py       # Redis subscriber + publisher
├── topics.py             # Topic pattern matching (vault:*, module:*, etc.)
└── heartbeat.py          # Ping/pong + connection health
```

**Endpoint:** `ws://api/ws?token=JWT`

### 2.2 Connection Lifecycle

1. **Connect:** Validate JWT → register in ConnectionManager → send ACK
2. **Subscribe:** `{ type: "subscribe", topic: "vault:{id}" }` → add to topic set
3. **Receive:** Events published to Redis → fan out to matching WebSocket connections
4. **Heartbeat:** Ping every 30s, timeout at 90s
5. **Disconnect:** Clean up subscriptions, remove from presence

### 2.3 Topic Patterns

| Pattern                | Use                     |
| ---------------------- | ----------------------- |
| `vault:{vault_id}`     | Triptych view events    |
| `view:{module}/{view}` | Chamber view aggregates |
| `module:{module_id}`   | Module-level badges     |
| `workspace`            | Admin system health     |
| `user:{user_id}`       | Personal notifications  |

### 2.4 EventEmitter Integration

Every backend action that creates an event also publishes to Redis:

```python
async def emit_event(event: ChannelEvent):
    await create_event(...)            # DB insert
    await redis.publish(topic, payload) # Real-time push
```

### 2.5 Frontend Wire-Up

- Create `apps/web/src/lib/websocket.ts` — AirlockWebSocket class
- Update `realtime.store.ts` to use real WebSocket instead of mock simulation
- Create `apps/web/src/hooks/useRealtimeEvents.ts` — subscribe/unsubscribe on mount/unmount
- Auto-reconnect with exponential backoff (1s → 2s → 4s → 8s → ... → 60s cap)

---

## Phase 3: Event Bus (M20 Backend)

**Goal:** BullMQ-powered cross-module event routing with retry, DLQ, and monitoring.

### 3.1 Dependencies

Add to `requirements.txt`:

- `arq` (Python Redis job queue — BullMQ equivalent for Python)
- OR use BullMQ via Node.js sidecar process

**Decision:** Since the backend is Python (FastAPI), use **arq** (async Redis queue for Python) as the BullMQ equivalent. The frontend mock data already models BullMQ-style queues — arq provides the same semantics (Redis-backed, retry, backoff, DLQ).

### 3.2 Backend Files

```
apps/api/src/event_bus/
├── __init__.py
├── router.py             # EVENT_ROUTES mapping: event_type → target queues
├── publisher.py          # Publish events to appropriate queues
├── worker.py             # arq worker definitions + startup
├── handlers/
│   ├── __init__.py
│   ├── crm.py            # CRMEventHandler (contract.shipped, entity.resolved, etc.)
│   ├── tasks.py           # TasksEventHandler (task creation, SLA)
│   ├── calendar.py        # CalendarEventHandler (date extraction → events)
│   ├── notifications.py   # NotificationsEventHandler (alerts, badges)
│   ├── admin.py           # AdminEventHandler (circuit breaker, failures)
│   └── analytics.py       # AnalyticsEventHandler (metrics, aggregation)
├── models.py             # EventBusJob, DLQEntry schemas
└── monitoring.py         # Queue stats, health endpoints for admin UI
```

### 3.3 Queue Configuration

| Queue                | Concurrency | Retry             | Timeout |
| -------------------- | ----------- | ----------------- | ------- |
| crm-events           | 5           | 3 (5s, 30s, 120s) | 30s     |
| tasks-events         | 10          | 3                 | 30s     |
| calendar-events      | 5           | 3                 | 30s     |
| notifications-events | 20          | 3                 | 30s     |
| admin-events         | 3           | 3                 | 30s     |
| analytics-events     | 3           | 3                 | 30s     |

### 3.4 Event Routes (18 mappings)

Per spec — `contract.shipped` → [crm, tasks, calendar, notifications], etc.

### 3.5 Admin Monitoring Endpoint

`GET /api/v1/admin/event-bus` — returns queue stats, recent jobs, DLQ entries, event flow data. This is what `event-bus.store.ts` already tries to fetch.

### 3.6 Frontend Wire-Up

- `event-bus.store.ts` already has `fetchEventBus()` hitting `/api/v1/admin/event-bus`
- Wire up `retryDLQJob()`, `retryAllDLQ()`, `purgeDLQ()` to real endpoints

---

## Phase 4: Messenger (M21 Backend)

**Goal:** Conversation + message persistence, WebSocket delivery for real-time chat.

### 4.1 Database Tables

Migration `007_add_messenger_tables.py`:

```sql
CREATE TABLE conversations (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    vault_id TEXT REFERENCES vaults(id),        -- NULL for DMs/team channels
    name TEXT,
    conversation_type TEXT NOT NULL,             -- vault_thread | dm | team | module
    module_scope TEXT,                           -- contracts | crm | tasks | etc.
    chamber TEXT,                                -- discover | build | review | ship
    created_by TEXT REFERENCES users(id),
    last_message_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE conversation_participants (
    conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id),
    role TEXT DEFAULT 'member',                  -- owner | admin | member
    unread_count INT DEFAULT 0,
    last_read_at TIMESTAMPTZ,
    joined_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id),
    workspace_id TEXT NOT NULL,
    sender_id TEXT REFERENCES users(id),
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text',            -- text | system | ai | file
    reply_to_id TEXT REFERENCES messages(id),
    edited_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);
```

### 4.2 Backend Files

```
apps/api/src/messenger/
├── __init__.py
├── models.py             # SQLAlchemy ORM
├── schemas.py            # Pydantic request/response
├── service.py            # Conversation + message CRUD
├── routes.py             # REST endpoints
└── ws_delivery.py        # WebSocket message broadcasting
```

**Routes:**

- `GET /api/v1/messenger` — list conversations for user
- `GET /api/v1/messenger/{conv_id}/messages` — message history
- `POST /api/v1/messenger/{conv_id}/messages` — send message
- `POST /api/v1/messenger` — create conversation
- `PATCH /api/v1/messenger/{conv_id}/read` — mark as read

### 4.3 WebSocket Integration

New messages published to Redis topic `messenger:{conversation_id}`. WebSocket subscribers get instant delivery. Typing indicators via WebSocket frames:

```json
{ "type": "typing", "conversation_id": "conv_123", "user_id": "usr_456" }
```

### 4.4 Frontend Wire-Up

- `messenger.store.ts` already has `fetchMessenger()` hitting `/api/v1/messenger`
- Wire `sendMessage()` to POST endpoint + WebSocket broadcast
- Wire typing indicators through WebSocket

---

## Phase 5: Workflow Engine (M23 Backend)

**Goal:** Execute canvas-built workflows via arq (Redis job queue).

### 5.1 Database Tables

Migration `008_add_workflow_tables.py`:

```sql
CREATE TABLE workflows (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    definition JSONB NOT NULL,                  -- { nodes: [...], edges: [...] }
    version INT DEFAULT 1,
    status TEXT DEFAULT 'draft',                -- draft | active | inactive | archived
    trigger_type TEXT,
    trigger_config JSONB DEFAULT '{}',
    published_at TIMESTAMPTZ,
    created_by TEXT REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE workflow_runs (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL REFERENCES workflows(id),
    workspace_id TEXT NOT NULL,
    status TEXT DEFAULT 'running',              -- running | waiting | completed | failed | cancelled
    trigger_data JSONB DEFAULT '{}',
    context JSONB DEFAULT '{}',                 -- execution variables
    node_log JSONB DEFAULT '[]',               -- [{node_id, status, input, output, duration_ms}]
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    error TEXT
);
```

### 5.2 Backend Files

```
apps/api/src/workflows/
├── __init__.py
├── models.py             # SQLAlchemy ORM
├── schemas.py            # Pydantic request/response
├── service.py            # Workflow CRUD
├── routes.py             # REST endpoints
├── executor.py           # Graph walker — executes node-by-node
├── nodes/
│   ├── __init__.py
│   ├── base.py           # BaseNode interface
│   ├── trigger.py        # Trigger node handlers
│   ├── function.py       # Function node handlers (classify, extract, branch, delay)
│   └── action.py         # Action node handlers (send_message, create_task, etc.)
└── worker.py             # arq worker for workflow execution jobs
```

**Routes:**

- `GET /api/workflows` — list workflows (already called by `workflow.store.ts`)
- `POST /api/workflows` — create workflow
- `GET /api/workflows/{id}` — get workflow + definition
- `PUT /api/workflows/{id}` — update workflow definition
- `POST /api/workflows/{id}/execute` — trigger manual execution
- `GET /api/workflows/{id}/runs` — execution history

### 5.3 Executor Pattern

```python
async def execute_workflow(workflow_id: str, trigger_data: dict):
    workflow = await load_workflow(workflow_id)
    context = ExecutionContext(trigger_data=trigger_data)

    # Walk the node graph starting from trigger node
    current_node = find_trigger_node(workflow.definition)
    while current_node:
        result = await execute_node(current_node, context)
        context.update(result)
        log_node_execution(current_node, result)
        current_node = find_next_node(workflow.definition, current_node, result)

    return context
```

### 5.4 Frontend Wire-Up

- `workflow.store.ts` already has `fetchWorkflows()` hitting `/api/workflows`
- Canvas save → PUT definition
- Execute button → POST execute
- Run history → GET runs

---

## Phase 6: MCP + Skills (Design + Stubs)

**Goal:** Admin UI for MCP server registration and skill management. No spec exists — design needed.

### 6.1 Admin Pages

The admin pages are already stubbed at:

- `(shell)/admin/mcp-servers/page.tsx`
- `(shell)/admin/skills/page.tsx`

### 6.2 Data Model

```sql
CREATE TABLE mcp_servers (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    endpoint_url TEXT NOT NULL,
    auth_type TEXT,                              -- none | api_key | oauth
    auth_config JSONB DEFAULT '{}',
    status TEXT DEFAULT 'inactive',             -- active | inactive | error
    capabilities JSONB DEFAULT '[]',           -- tool list
    health_check_url TEXT,
    last_health_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE skills (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    skill_type TEXT,                            -- built_in | custom | mcp
    mcp_server_id TEXT REFERENCES mcp_servers(id),
    tool_name TEXT,
    config JSONB DEFAULT '{}',
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 6.3 Backend Routes

- `GET/POST /api/v1/admin/mcp-servers` — CRUD
- `POST /api/v1/admin/mcp-servers/{id}/test` — health check
- `GET/POST /api/v1/admin/skills` — CRUD
- `POST /api/v1/admin/skills/{id}/toggle` — enable/disable

### 6.4 Frontend

- Build registration form for MCP servers (name, URL, auth)
- Build skill list with toggle switches
- Wire to capability-tree store for admin tree navigation

---

## Execution Order & Dependencies

```
Phase 1 (Otto SSE)          ← No dependencies, start first
Phase 2 (WebSocket)         ← No dependencies, can parallel with Phase 1
Phase 3 (Event Bus)         ← Depends on Phase 2 (emits to WebSocket)
Phase 4 (Messenger)         ← Depends on Phase 2 (WebSocket delivery)
Phase 5 (Workflow Engine)   ← Depends on Phase 3 (triggers from event bus)
Phase 6 (MCP + Skills)      ← Independent, can parallel with Phase 5
```

**Parallel opportunities:**

- Phase 1 + Phase 2 can run simultaneously
- Phase 5 + Phase 6 can run simultaneously

---

## Verification After Each Phase

```bash
source ~/.nvm/nvm.sh && nvm use 20
pnpm type-check    # TypeScript
pnpm lint           # ESLint
cd apps/api && source .venv/bin/activate && python -m pytest  # Backend tests
```

---

## Files NOT to Touch (Primary Agent Owns)

- CRM stores, admin tree pages, capability-tree store
- `(modules)/crm/`, `(modules)/contracts/`, `(modules)/tasks/`, `(modules)/calendar/`, `(modules)/documents/`
- Seed data files

---

## Deliverables Summary

| Phase | New Backend Files     | New DB Tables                         | Frontend Changes                 |
| ----- | --------------------- | ------------------------------------- | -------------------------------- |
| 1     | 9 files (otto/)       | otto_sessions, otto_messages          | useOttoChat hook, store update   |
| 2     | 6 files (realtime/)   | none                                  | websocket.ts, store update, hook |
| 3     | 10 files (event_bus/) | none (uses Redis)                     | store endpoint wire-up           |
| 4     | 6 files (messenger/)  | conversations, participants, messages | store endpoint wire-up           |
| 5     | 9 files (workflows/)  | workflows, workflow_runs              | store endpoint wire-up           |
| 6     | 4 files (mcp/)        | mcp_servers, skills                   | admin page build-out             |

**Total:** ~44 new backend files, 7 new DB tables, 6 frontend updates
