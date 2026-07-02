# Agentic Identity Layer — Design Document

> **Date:** 2026-03-08
> **Branch:** `claude/otto-agentic-layer-33684`
> **Status:** Design approved
> **Scope:** UserAgentContext, Tool Risk Tiers, Passkeys, Capability Tree Export

---

## Executive Summary

Airlock's capability tree + role system already implements a W3C-aligned agent architecture without knowing it. This design formalizes three concepts stolen from the W3C AI Agent Protocol and adds passwordless auth (passkeys) to complete the identity layer:

1. **UserAgentContext** — Otto's understanding of "who is asking" (Personal Agent pattern)
2. **Tool Risk Tiers** — read/write/dangerous classification on every MCP tool
3. **Capability Tree Export** — admin config as an agent description manifest
4. **Passkeys (WebAuthn)** — passwordless auth alongside Google OAuth

---

## Research Foundation

### W3C Agent Types → Airlock Mapping

| W3C Agent Type   | Description                 | Airlock Equivalent                   | Location                               |
| ---------------- | --------------------------- | ------------------------------------ | -------------------------------------- |
| Personal Agent   | User proxy with preferences | Otto per-user session + role context | `otto.store` + `UserAgentContext`      |
| Enterprise Agent | Company process automation  | Workflow Engine + Event Bus          | `workflows/executor.py` + `event_bus/` |
| Service Agent    | External tool provider      | MCP Servers                          | `workspace_mcp_servers` table          |

### W3C Three-Layer Architecture → Airlock

| W3C Layer             | Airlock Implementation                           |
| --------------------- | ------------------------------------------------ |
| Identity + Encryption | JWT auth + workspace_id RLS + **Passkeys** (new) |
| Meta-Protocol         | Capability Tree (admin node config)              |
| Application Protocol  | MCP tool manifests + Skill definitions           |

### Market Intelligence

- **CLM competitors** (Sirion, Evisort, Ironclad) have AI assistants but none have MCP integration
- **MCP ecosystem**: ~2,000 servers, 407% growth, official registry live
- **Agent identity**: OpenID OIDC-A 1.0 proposed, Cerbos for MCP authorization guardrails
- **Airlock differentiator**: First CLM with W3C-aligned agent architecture + MCP + tiered tool auth

---

## Design: UserAgentContext

Otto currently receives `VaultContext` (vault-scoped enrichment data). The `UserAgentContext` extends this with identity, capabilities, and preferences — making Otto a proper Personal Agent.

### Data Model

```python
@dataclass
class UserAgentContext:
    # Identity (who)
    user_id: str
    workspace_id: str
    org_role: str              # member | lead | director | executive | architect
    module_role: str           # builder | gatekeeper | owner | designer | viewer

    # Scope (where)
    vault_id: str
    module: str                # contracts | crm | tasks | calendar | documents
    chamber: str               # discover | build | review | ship

    # Capabilities (what tools are available)
    permitted_tools: list[PermittedTool]  # resolved from MCP + Skills + role
    personal_connections: list[str]       # connected integrations (Google, Slack, etc.)

    # Context (enrichment — already exists in VaultContext)
    vault_context: VaultContext

    # Preferences (how — NEW)
    response_style: str        # "concise" | "detailed" | "technical"
    auto_approve_reads: bool   # auto-approve read-only tool calls
    notification_prefs: dict   # what to alert on

@dataclass
class PermittedTool:
    name: str
    server: str
    risk_tier: str             # "read" | "write" | "dangerous"
    module_scope: list[str]    # which modules this tool is available in
```

### Assembly Flow

```
User sends message to Otto
  → Resolve user identity (JWT → user_id, workspace_id, org_role)
  → Resolve module context (vault_id → module, chamber)
  → Resolve module role (user_module_roles table)
  → Resolve permitted tools (MCP permissions filtered by role + module)
  → Resolve personal connections (user_connections table)
  → Load vault enrichment (existing VaultContext)
  → Load user preferences (user metadata JSONB)
  → Assemble UserAgentContext
  → Inject into Otto system prompt
```

### System Prompt Injection

```python
CONTEXT_TEMPLATE = """
## Your Context
- **User:** {user_id} ({org_role}, {module_role} in {module})
- **Vault:** {vault_id} in {chamber} chamber
- **Available tools:** {permitted_tool_names}
- **Response style:** {response_style}

## Tool Authorization
{tool_authorization_block}

## Vault Data
{vault_context_block}
"""
```

---

## Design: Tool Risk Tiers

Every MCP tool gets a `risk_tier` that determines runtime behavior:

| Tier        | Behavior                                      | Examples                                                |
| ----------- | --------------------------------------------- | ------------------------------------------------------- |
| `read`      | Auto-execute, no confirmation                 | `get_gate_status`, `get_field_summary`, `search_vaults` |
| `write`     | Show confirmation in Otto UI before executing | `suggest_patch`, `create_task`, `send_message`          |
| `dangerous` | Require separate approval (Gate-style)        | `apply_patch`, `delete_vault`, `export_to_csv`          |

### Database Column

Add `risk_tier TEXT DEFAULT 'read'` to `workspace_mcp_tool_permissions` table.

### Runtime Enforcement

```python
async def execute_tool(tool_name: str, args: dict, context: UserAgentContext):
    permission = resolve_permission(tool_name, context)

    if permission.risk_tier == "read":
        return await tool.execute(args)

    if permission.risk_tier == "write":
        # Emit confirmation request via SSE
        yield sse_event("tool_confirm", {
            "tool": tool_name,
            "args": args,
            "risk_tier": "write",
        })
        # Wait for user confirmation via WebSocket
        confirmed = await wait_for_confirmation(context.user_id, tool_name)
        if not confirmed:
            return {"status": "cancelled_by_user"}
        return await tool.execute(args)

    if permission.risk_tier == "dangerous":
        # Require Gate-style approval from a different user
        raise RequiresApproval(tool_name, args)
```

### Frontend: Confirmation Modal

When Otto wants to execute a `write` tool, the SSE stream emits a `tool_confirm` event. The `OttoChat` component renders an inline confirmation card:

```
┌─────────────────────────────────────┐
│ Otto wants to: suggest_patch        │
│ Field: OPP_TERRITORY               │
│ Value: "Worldwide" → "North America"│
│                                     │
│         [Allow]    [Deny]           │
└─────────────────────────────────────┘
```

---

## Design: Capability Tree Export

The capability tree (admin-configured nodes) already defines what the workspace's "Enterprise Agent" can do. Export it as a JSON manifest:

```json
{
  "agent_description": {
    "version": "1.0",
    "workspace_id": "ws_abc123",
    "name": "Acme Records Airlock",
    "capabilities": {
      "ai_provider": {
        "provider": "anthropic",
        "model": "claude-sonnet-4-6",
        "status": "configured"
      },
      "mcp_servers": [
        {
          "name": "Vibe Prospecting",
          "host": "explorium.ai",
          "tools": 7,
          "status": "active"
        }
      ],
      "skills": [
        {
          "name": "Headcount Trend Check",
          "tool_chain": ["match-business", "business-enrichment"],
          "roles": ["builder", "gatekeeper"]
        }
      ],
      "otto": {
        "status": "active",
        "tools": 12,
        "behavioral_rules": 4
      }
    },
    "authorization": {
      "model": "tiered",
      "tiers": ["read", "write", "dangerous"]
    }
  }
}
```

Endpoint: `GET /api/v1/admin/agent-manifest` — returns the workspace's agent description.

---

## Design: Passkeys (WebAuthn/FIDO2)

Passwordless auth alongside Google OAuth. Both methods produce identical JWT pairs.

### Database

New table `passkey_credentials`:

```sql
CREATE TABLE passkey_credentials (
    id TEXT PRIMARY KEY,                          -- ULID
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    credential_id TEXT NOT NULL UNIQUE,           -- base64url-encoded
    public_key BYTEA NOT NULL,                    -- COSE public key
    sign_count INTEGER NOT NULL DEFAULT 0,
    aaguid TEXT,                                  -- authenticator identifier
    device_name TEXT,                             -- user-friendly label
    transports TEXT[],                            -- usb, ble, nfc, internal
    backed_up BOOLEAN DEFAULT false,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);
```

### Backend Endpoints

| Method | Path                                        | Purpose                                                  |
| ------ | ------------------------------------------- | -------------------------------------------------------- |
| POST   | `/api/v1/auth/passkey/register/options`     | Generate registration challenge (requires existing auth) |
| POST   | `/api/v1/auth/passkey/register/verify`      | Verify attestation, store credential                     |
| POST   | `/api/v1/auth/passkey/authenticate/options` | Generate authentication challenge                        |
| POST   | `/api/v1/auth/passkey/authenticate/verify`  | Verify assertion, issue JWT pair                         |
| GET    | `/api/v1/auth/passkey/credentials`          | List user's registered passkeys                          |
| DELETE | `/api/v1/auth/passkey/credentials/{id}`     | Remove a passkey                                         |

### Dependencies

- **Backend:** `py_webauthn` (maintained, well-tested WebAuthn library for Python)
- **Frontend:** `@simplewebauthn/browser` (tiny wrapper around `navigator.credentials`)

### Registration Flow

```
User logged in (via Google) → Settings → "Add Passkey"
  → Frontend calls POST /register/options
  → Backend generates challenge + user info
  → Frontend calls navigator.credentials.create(options)
  → Browser prompts biometric/PIN
  → Frontend sends attestation to POST /register/verify
  → Backend validates, stores credential
  → "Passkey added" confirmation
```

### Authentication Flow

```
Login page → "Sign in with Passkey"
  → Frontend calls POST /authenticate/options
  → Backend generates challenge, returns allowCredentials
  → Frontend calls navigator.credentials.get(options)
  → Browser prompts biometric/PIN
  → Frontend sends assertion to POST /authenticate/verify
  → Backend validates signature, increments sign_count
  → Backend returns same JWT pair as Google OAuth
  → Frontend calls hydrateFromLoginResponse() (existing flow)
```

### Login Page UI

```
┌──────────────────────────────────────┐
│                                      │
│           Welcome to Airlock         │
│                                      │
│   ┌──────────────────────────────┐   │
│   │   🔑  Sign in with Passkey   │   │  ← Primary (if passkeys registered)
│   └──────────────────────────────┘   │
│                                      │
│          ──── or ────                │
│                                      │
│   ┌──────────────────────────────┐   │
│   │   G  Continue with Google    │   │  ← Secondary
│   └──────────────────────────────┘   │
│                                      │
│   [Dev Login]  [Create Workspace]    │  ← Dev only
│                                      │
└──────────────────────────────────────┘
```

### Conditional Autofill

If the browser supports `PublicKeyCredential.isConditionalMediationAvailable()`, passkeys appear in the browser's autofill UI automatically — zero-click login.

---

## Implementation Phases

### Phase A: UserAgentContext (Backend)

1. Create `UserAgentContext` dataclass in `otto/deps.py`
2. Build assembly logic (resolve role, tools, connections, preferences)
3. Update Otto system prompt template to inject full context
4. Add user preferences to `users.metadata` JSONB

### Phase B: Tool Risk Tiers (Backend + Frontend)

1. Add `risk_tier` column to `workspace_mcp_tool_permissions`
2. Implement runtime tier enforcement in Otto agent
3. Add SSE `tool_confirm` event type
4. Build inline confirmation card in OttoChat component

### Phase C: Passkeys (Backend + Frontend)

1. Add `py_webauthn` dependency, create migration for `passkey_credentials`
2. Build 6 passkey endpoints in `routes/auth.py`
3. Add `@simplewebauthn/browser` to frontend
4. Update login page with passkey button + conditional mediation
5. Add passkey management to user settings

### Phase D: Capability Tree Export

1. Build `GET /api/v1/admin/agent-manifest` endpoint
2. Serialize capability tree nodes → agent description JSON
3. Add "Export Manifest" button to admin overview page

---

## Decisions

| Decision                 | Choice                                                        | Rationale                                        |
| ------------------------ | ------------------------------------------------------------- | ------------------------------------------------ |
| W3C protocol adoption    | Concepts only, not wire protocol                              | Too early-stage, too infrastructure-heavy        |
| DID adoption             | No — keep JWT + RLS                                           | Simpler, already works, no decentralization need |
| Passkey library          | `py_webauthn` (backend), `@simplewebauthn/browser` (frontend) | Most maintained, well-documented                 |
| Passkey as primary       | Yes — passkey first, Google second                            | "Screw passwords" — passwordless-first UX        |
| Tool tier storage        | Column on permissions table                                   | Simple, queryable, no separate table needed      |
| User preferences storage | `users.metadata` JSONB                                        | Already exists, flexible, no migration needed    |

---

## Risks

| Risk                              | Severity | Mitigation                                                   |
| --------------------------------- | -------- | ------------------------------------------------------------ |
| WebAuthn browser support          | LOW      | 97%+ browser support as of 2026, graceful fallback to Google |
| Tool confirmation UX friction     | MEDIUM   | Only for `write` tier — `read` tools auto-execute            |
| UserAgentContext assembly latency | LOW      | All data from DB queries already needed for auth             |
| W3C spec changes                  | LOW      | We're using concepts, not wire protocol                      |
