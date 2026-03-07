# OTTO MCP Gateway + Query Decontextualization — Design

**Status:** APPROVED
**Date:** 2026-03-07
**Scope:** Backend (FastAPI), AI runtime (PydanticAI + LiteLLM)

## Goal

Turn Airlock into an MCP server so any MCP-compatible client (Claude Desktop, Cursor, etc.) can query vault data via natural language. Build the query pipeline as the single brain that both the MCP endpoint and the in-app SSE chat consume.

## Decisions (Locked)

| Decision             | Choice                      | Rationale                                                            |
| -------------------- | --------------------------- | -------------------------------------------------------------------- |
| Build order          | MCP-first                   | Query pipeline is the foundation; SSE chat wraps it                  |
| Query scope          | Workspace-scoped            | Cross-vault queries are the killer feature; optional vault_id filter |
| Decontextualization  | LLM rewrite (Haiku)         | ~150ms latency, high quality, negligible cost                        |
| Response modes       | list + summarize + generate | Mapped to Signal, Orchestrate, Control panels                        |
| Auth for MCP clients | API keys                    | Workspace-scoped, stateless, revocable (`ak_live_xxx`)               |

---

## Architecture

```
External MCP Client          Airlock UI (SSE Chat)
(Claude Desktop, Cursor)     (Control Panel)
        │                           │
        │ POST /api/v1/otto/ask     │ POST /api/v3/vaults/{id}/otto/chat
        │ (API key auth)            │ (JWT auth)
        ▼                           ▼
┌─────────────────────────────────────────────┐
│              Query Pipeline                  │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐ │
│  │ Decontext │→│ Classify  │→│ Enrich   │ │
│  │ (Haiku)   │ │ mode/scope│ │ VaultCtx │ │
│  └──────────┘  └───────────┘  └──────────┘ │
│                      │                       │
│              ┌───────┴───────┐              │
│              ▼               ▼              │
│         OttoAgent      Fast-track           │
│        (PydanticAI)    (direct tool)        │
│              │               │              │
│              ▼               ▼              │
│         Response Formatter                   │
│         (list | summarize | generate)        │
└─────────────────────────────────────────────┘
```

The query pipeline is the single brain. Both transports (MCP REST and SSE streaming) are thin wrappers. MCP returns JSON; SSE streams tokens. Same agent, same tools, same enrichment.

**Scope boundary:** This spec covers Airlock AS an MCP server (other tools query us). The separate `mcp-registry-design.md` covers external MCP servers connecting TO Airlock.

---

## MCP /ask Endpoint

### Primary Endpoint

```
POST /api/v1/otto/ask
Authorization: Bearer ak_live_xxxxx  (workspace API key)
Content-Type: application/json
```

**Request:**

```json
{
  "query": "What contracts are stuck in Review with health below 60%?",
  "vault_id": null,
  "module": "contracts",
  "mode": "auto",
  "session_id": null,
  "context": {}
}
```

| Field        | Type   | Required | Description                                                       |
| ------------ | ------ | -------- | ----------------------------------------------------------------- |
| `query`      | string | yes      | Natural language question                                         |
| `vault_id`   | string | no       | Narrow to single vault (ULID)                                     |
| `module`     | string | no       | Narrow to module (contracts, crm, tasks, calendar, documents)     |
| `mode`       | string | no       | `auto` (default), `list`, `summarize`, `generate`                 |
| `session_id` | string | no       | Continue multi-turn conversation                                  |
| `context`    | object | no       | Caller-provided hints (ignored by pipeline, logged for debugging) |

### Response — mode=list

```json
{
  "mode": "list",
  "items": [
    {
      "vault_id": "01HXYZ...",
      "name": "Henderson MSA",
      "chamber": "review",
      "health_score": 0.42,
      "gate": "gate_gatekeeper",
      "snippet": "Stuck at gatekeeper gate — counterparty unresolved, 2 patches pending"
    }
  ],
  "total": 3,
  "query_rewritten": "List contracts in review chamber with health_score < 0.60",
  "session_id": "ots_01HXYZ..."
}
```

### Response — mode=summarize

```json
{
  "mode": "summarize",
  "summary": "3 contracts are stuck in Review with health below 60%. The primary blockers are unresolved counterparties (2) and pending patches (1). Henderson MSA is the most critical at 42% health.",
  "items": [],
  "session_id": "ots_01HXYZ..."
}
```

### Response — mode=generate

```json
{
  "mode": "generate",
  "response": "Looking at your Review chamber, three contracts need attention...",
  "tool_calls": [
    {
      "tool": "get_gate_blockers",
      "vault_id": "01HXYZ...",
      "result_summary": "..."
    }
  ],
  "session_id": "ots_01HXYZ..."
}
```

### MCP Protocol Endpoints

For MCP-native clients, standard MCP protocol endpoints:

```
POST /api/v1/mcp/list_tools    → returns Otto's 8 tools as MCP tool definitions
POST /api/v1/mcp/call_tool     → invokes a specific tool directly
POST /api/v1/mcp/ask           → alias to /api/v1/otto/ask
```

### Response Mode → Triptych Panel Mapping

| Mode        | Panel       | Use Case                                   |
| ----------- | ----------- | ------------------------------------------ |
| `list`      | Signal      | Ranked vault cards, terse events, no prose |
| `summarize` | Orchestrate | Brief analysis + key data points           |
| `generate`  | Control     | Full conversational Otto chat              |
| `auto`      | Otto picks  | Based on query structure heuristics        |

---

## Query Pipeline

### Step 1: Decontextualize

When a `session_id` is provided and conversation history exists, rewrite the follow-up as a standalone query using the fast model (Haiku).

**Prompt:**

```
You are a query rewriter. Given a conversation history and a follow-up
question, rewrite the follow-up as a complete standalone question.

Rules:
- Include all necessary context (vault names, field names, entity names)
- Keep it concise — one sentence
- If the follow-up IS already standalone, return it unchanged
- Never add information not present in the history

Conversation: {last_3_messages}
Follow-up: {query}
Standalone question:
```

**Cost:** ~200 input tokens + ~30 output tokens = negligible with Haiku.
**Latency:** ~150ms.

**Skip conditions:**

- No session_id → skip (query is already standalone)
- Session has 0 prior messages → skip
- Query is >50 words → likely already standalone, skip

### Step 2: Classify Mode + Scope

If `mode == "auto"`, classify using keyword heuristics:

| Keywords                            | Classified Mode             |
| ----------------------------------- | --------------------------- |
| show, list, find, pending, open     | `list`                      |
| status, what's, how is, summary     | `summarize`                 |
| why, explain, help, analyze, should | `generate`                  |
| ambiguous                           | `generate` (safest default) |

Scope classification:

- `vault_id` provided → scope = "vault" (single vault enrichment)
- `vault_id` null → scope = "workspace" (cross-vault search)

### Step 3: Fast-Track Check

Conservative bypass that skips the full LLM agent when a query maps directly to a single tool call.

**Fast-track patterns:**

| Query Pattern                | Tool Called Directly             | Mode      |
| ---------------------------- | -------------------------------- | --------- |
| "show/list patches"          | `get_patch_queue(vault_id)`      | list      |
| "health breakdown/score"     | `get_health_breakdown(vault_id)` | summarize |
| "what's blocking/stuck/gate" | `get_gate_blockers(vault_id)`    | list      |
| "search for [term]"          | `search_corpus(query=term)`      | list      |

**Does NOT fast-track:**

- "why" / "explain" / "help" queries (needs reasoning)
- Cross-vault queries without vault_id (needs workspace search)
- Ambiguous queries
- Queries with session context (decontextualized queries need continuity)
- Multi-domain queries ("patches AND health")

**Implementation sketch:**

```python
FAST_TRACK_PATTERNS: list[tuple[re.Pattern, str, str]] = [
    (re.compile(r"\b(show|list|open|pending)\b.*\bpatch", re.I), "get_patch_queue", "list"),
    (re.compile(r"\bhealth\b.*(breakdown|score|detail)", re.I), "get_health_breakdown", "summarize"),
    (re.compile(r"\b(block|stuck|gate)\b", re.I), "get_gate_blockers", "list"),
    (re.compile(r"^(search for|find in|look for)\s+", re.I), "search_corpus", "list"),
]

def try_fast_track(query: str, vault_id: str | None) -> tuple[str, str] | None:
    """Return (tool_name, mode) if query can be fast-tracked, else None."""
    if vault_id is None:
        return None  # Cross-vault queries need the agent
    for pattern, tool, mode in FAST_TRACK_PATTERNS:
        if pattern.search(query):
            return (tool, mode)
    return None
```

**Latency comparison:**

- Fast-track: ~200ms (tool call only, no LLM)
- Full pipeline: ~2-5s (enrichment + LLM + tool calls)
- With decontextualization: +~150ms (Haiku rewrite)

### Step 4: Enrich VaultContext

Two enrichment paths based on scope:

**Vault scope** (existing spec — 9 sources in parallel):

- gate_state, field_summary, contract_health, domain_rules, preflight_sections, corpus_lines, extraction_meta, patch_summary, deal_fields
- 2s timeout per source, parallel execution

**Workspace scope** (NEW — lighter weight):

- workspace_summary: vault counts per chamber, module, health ranges
- module_index: list of vaults in the target module with name + chamber + health
- No per-vault enrichment (too expensive across all vaults)

### Step 5: Agent Execution + Response Formatting

`OttoAgent.run(query, deps=VaultContext)` → format response per mode.

**Formatting rules by mode:**

- `list`: Extract structured items from tool results. Each item has vault_id, name, chamber, health_score, gate, snippet. No prose.
- `summarize`: Agent generates 2-3 sentence summary. Include top 3 items as supporting data.
- `generate`: Full conversational response. Include tool_calls trace for transparency.

---

## API Key Auth Model

### New Table

```sql
CREATE TABLE workspace_api_keys (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    name TEXT NOT NULL,
    scopes TEXT[] DEFAULT '{"otto:ask","otto:tools"}',
    created_by TEXT NOT NULL,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### Key Format

`ak_live_` + 32 random alphanumeric characters.
Example: `ak_live_7f3k9x2mPqRsT4uVwXyZ1a2B3c4D5e6`

### Auth Flow

1. Admin generates key in Overlay → full key shown once, never again
2. User pastes into MCP client config
3. Every request: `Authorization: Bearer ak_live_xxx` → SHA-256 hash → lookup → workspace_id + scopes
4. Key scopes limit access: `otto:ask`, `otto:tools`, `otto:read`

### MCP Client Config

```json
{
  "mcpServers": {
    "airlock": {
      "url": "https://app.airlock.com/api/v1/mcp",
      "headers": {
        "Authorization": "Bearer ak_live_7f3k9x2m..."
      }
    }
  }
}
```

---

## What This Enables

**From Claude Desktop:**

- "What contracts need attention this week?" → summarize, workspace
- "Show me the Henderson MSA health breakdown" → generate, auto-scoped
- "List all vaults with new customers detected" → list, entity resolution

**From Cursor/IDE:**

- "What fields does this contract type extract?" → generate, schema query
- "Find contracts similar to this template" → list, corpus search

**From Airlock UI (Control panel):**

- Same pipeline, SSE streaming transport
- Decontextualization makes multi-turn chat coherent
- Fast-track makes common queries instant

---

## Files Touched

### New Files

- `apps/api/src/services/otto_pipeline.py` — Query pipeline (decontext → classify → fast-track → enrich → agent → format)
- `apps/api/src/services/otto_tools.py` — 8 PydanticAI tool definitions
- `apps/api/src/services/otto_context.py` — VaultContext builder (vault + workspace scopes)
- `apps/api/src/services/otto_decontext.py` — Decontextualization service (Haiku rewrite)
- `apps/api/src/routes/otto.py` — /api/v1/otto/ask REST endpoint
- `apps/api/src/routes/mcp.py` — /api/v1/mcp/\* MCP protocol endpoints
- `apps/api/src/models/otto_session.py` — OttoSession + OttoMessage models
- `apps/api/src/models/api_key.py` — WorkspaceApiKey model
- `apps/api/src/middleware/api_key_auth.py` — API key verification dependency

### Modified Files

- `apps/api/src/main.py` — Register new routers
- `docker-compose.yml` — Add LiteLLM sidecar (per existing litellm-gateway.md spec)

### Existing Specs Consumed

- `docs/specs/ai-agent/ai-runtime.md` — VaultContext, agent definition, enrichment sources
- `docs/specs/ai-agent/streaming-protocol.md` — SSE wire format (for chat wrapper)
- `docs/specs/ai-agent/session-persistence.md` — otto_sessions, otto_messages tables
- `docs/specs/ai-agent/enrichment-sources.md` — 9 enrichment source definitions
- `docs/specs/ai-agent/litellm-gateway.md` — LiteLLM proxy config
