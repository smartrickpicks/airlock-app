# MCP Registry & Skills Architecture — Build Plan

> **Date:** 2026-03-06
> **Status:** Discovery / Planning
> **Priority:** Post Track-B (depends on real vault data flowing through the system)

---

## What We're Building

A workspace-level **MCP Registry** and a **Skills Layer** that gives org admins Discord-style control over which AI tools are available to which roles — including the ability to add any MCP server by URL, configure AI providers per workspace, and create custom skills via an Otto conversation.

---

## Core Concepts

### Two Tiers: MCP Servers vs Cloud Skills

| Tier | What It Is | How It's Added | Who Manages |
|---|---|---|---|
| **MCP Server** | External MCP endpoint (Vibe Prospecting, Google Workspace, custom) | Paste URL → auto-discover | Workspace Admin |
| **Cloud Skill** | Custom tool created via Otto conversation, stored in DB | Skill Creator conversation | Admin / Owner |

Both surface as tools available to Otto at runtime. The user never sees the difference.

### Personal Connections vs Org Connections

| Type | Scope | Configured By | Credential Storage | Visibility |
|---|---|---|---|---|
| **Org connection** | All permitted users in workspace | Admin (Overlay) | Encrypted, server-side | Role-gated |
| **Personal connection** | Only that user | User (Personal Settings → Connected Accounts) | Encrypted, per-user | User only |

When Otto resolves tools at runtime, it merges: org tools the user's role permits + user's personal connections.

---

## Architecture

### Data Model

**New Tables (all with standard required columns: id, workspace_id, created_at, updated_at, deleted_at, metadata)**

```sql
-- Registered MCP servers for a workspace
workspace_mcp_servers
  id             TEXT (ULID)
  workspace_id   TEXT (ULID FK)
  name           TEXT           -- "Vibe Prospecting"
  description    TEXT
  server_url     TEXT           -- "https://mcp.explorium.ai/mcp"
  transport      TEXT           -- "http" | "sse" | "stdio"
  auth_type      TEXT           -- "api_key" | "oauth" | "none"
  auth_config    JSONB          -- encrypted credentials (never returned to client)
  manifest_cache JSONB          -- cached tool definitions from last discovery
  manifest_fetched_at TIMESTAMPTZ
  status         TEXT           -- "active" | "error" | "pending" | "disabled"
  last_error     TEXT
  added_by       TEXT (ULID FK users)

-- Per-tool permission grants: which roles can use which tools
workspace_mcp_tool_permissions
  id             TEXT (ULID)
  workspace_id   TEXT (ULID FK)
  server_id      TEXT (ULID FK workspace_mcp_servers)
  tool_name      TEXT           -- exact tool name from MCP manifest
  -- Role access (org roles)
  allowed_org_roles  TEXT[]     -- ["builder", "gatekeeper", "owner", "executive"]
  -- Module scoping (null = all modules)
  allowed_modules    TEXT[]     -- ["contracts", "crm"] or null
  -- Vault-level scoping (null = all vaults)
  allowed_vault_ids  TEXT[]     -- specific vault IDs or null
  -- Override: specific users always allowed regardless of role
  user_allowlist     TEXT[]     -- user IDs
  -- Override: specific users always blocked regardless of role
  user_blocklist     TEXT[]     -- user IDs

-- Custom skills created via Otto conversation
workspace_skills
  id             TEXT (ULID)
  workspace_id   TEXT (ULID FK)
  name           TEXT           -- "Qualify Lead via Vibe"
  description    TEXT           -- shown to Otto in system prompt
  skill_type     TEXT           -- "pydantic_tool" | "mcp_proxy" | "prompt_template"
  definition     JSONB          -- full tool definition (parameters, implementation)
  created_by     TEXT (ULID FK users)  -- who created it via Skill Creator
  -- Same permission model as MCP tools
  allowed_org_roles  TEXT[]
  allowed_modules    TEXT[]
  user_allowlist     TEXT[]

-- Per-user personal connections (separate from org connections)
user_connections
  id             TEXT (ULID)
  user_id        TEXT (ULID FK)
  workspace_id   TEXT (ULID FK)
  provider       TEXT           -- "google", "notion", "linear", etc.
  display_name   TEXT           -- "My Gmail"
  auth_config    JSONB          -- encrypted OAuth tokens
  scopes         TEXT[]         -- granted OAuth scopes
  status         TEXT           -- "active" | "expired" | "error"
  expires_at     TIMESTAMPTZ

-- AI provider config per workspace (extends LiteLLM gateway)
workspace_ai_providers
  id             TEXT (ULID)
  workspace_id   TEXT (ULID FK)
  provider_name  TEXT           -- "anthropic" | "openai" | "openrouter" | "custom"
  display_name   TEXT           -- "Our Claude Instance"
  litellm_model  TEXT           -- model string passed to LiteLLM
  api_key_ref    TEXT           -- reference to secrets vault (never plain text)
  base_url       TEXT           -- for custom/self-hosted providers
  is_default     BOOLEAN        -- which provider Otto uses by default
  allowed_roles  TEXT[]         -- which roles can use this provider
```

### Runtime Tool Resolution (Otto at Session Init)

```
User sends message to Otto
  │
  ▼
services/otto_context.py: build_tool_set(user_id, workspace_id, vault_id, module)
  │
  ├── Load workspace_mcp_servers WHERE status='active'
  │     └── For each server: filter tools by workspace_mcp_tool_permissions
  │           WHERE user's org_role IN allowed_org_roles
  │           AND (allowed_modules IS NULL OR module IN allowed_modules)
  │           AND user_id NOT IN user_blocklist
  │
  ├── Load workspace_skills WHERE user's role in allowed_org_roles
  │
  ├── Load user_connections WHERE user_id = ? AND status='active'
  │     └── Wrap personal connections as tools (e.g., read_my_gdrive)
  │
  └── Return: MCPToolSet + SkillToolSet + PersonalToolSet
        │
        ▼
  PydanticAI agent initialized with merged tool set
  LiteLLM routes to workspace's configured AI provider
```

### MCP Server Discovery (URL → Tools)

```
Admin pastes URL in Overlay → Connectors → Add MCP Server
  │
  ▼
POST /api/v1/admin/mcp-servers
  body: { url, name, auth_type, api_key? }
  │
  ▼
services/mcp_registry.py: discover_server(url, auth)
  │
  ├── Fetch MCP manifest: GET {url}/tools/list (or SSE handshake)
  ├── Parse tool definitions: name, description, inputSchema
  ├── Store in workspace_mcp_servers.manifest_cache
  └── Create default workspace_mcp_tool_permissions for each tool
        DEFAULT: allowed_org_roles = ["owner"]  (admin-only until explicitly opened)
  │
  ▼
Return: { server_id, tools: [{name, description, parameters}] }
  │
  ▼
Admin assigns role permissions in Overlay UI
```

---

## Overlay UI Changes

### Connectors Section (expanded)

The existing Connectors section splits into three sub-sections:

#### 1. AI Providers (new)

```
+--------------------------------------------------+
| AI PROVIDERS                          [+ Add]    |
|--------------------------------------------------|
| ● Claude (Anthropic)        [Default] [Edit]     |
|   claude-sonnet-4-20250514 · All roles           |
|                                                  |
| ● OpenRouter                          [Edit]     |
|   claude-opus-4-6 · Owner+ only                  |
|                                                  |
| ○ Custom Endpoint           [Disabled][Edit]     |
|   https://llm.internal.co                        |
+--------------------------------------------------+
```

Add Provider flow: name → provider type → API key → model string → role access → test → save.

#### 2. MCP Servers (replaces current Connectors list)

```
+--------------------------------------------------+
| MCP SERVERS                           [+ Add]    |
|--------------------------------------------------|
| ● Vibe Prospecting          [Active]  [Manage]   |
|   7 tools · explorium.ai · Builder+             |
|                                                  |
| ● Google Workspace          [Active]  [Manage]   |
|   12 tools · google.com · All roles             |
|                                                  |
| ⚠ Salesforce MCP            [Error]   [Manage]   |
|   Auth expired · 0/5 tools active               |
+--------------------------------------------------+

[Add MCP Server]
  Paste URL: [https://mcp.explorium.ai/mcp        ]
  Or choose: [GitHub URL] [npm package] [Docker]
  [Discover Tools →]
```

**Manage Server → Tool Permissions (Discord channel permissions model):**

```
VIBE PROSPECTING — TOOL PERMISSIONS

Tool                    Builder  Gatekeeper  Owner  Executive
──────────────────────────────────────────────────────────────
match-business            ✓          ✓         ✓       ✓
fetch-businesses          ✓          ✓         ✓       ✓
business-enrichment       —          ✓         ✓       ✓
fetch-prospects           ✓          ✓         ✓       ✓
prospect-enrichment       ✓          ✓         ✓       ✓
prospect-events           —          —         ✓       ✓
export-to-csv             —          —         ✓       ✓

[+ User Override]  [Save Changes]
```

#### 3. OAuth Integrations (existing Google Drive, Salesforce, Slack, Jira)

Stays as-is. These are file/calendar/comms sync — not MCP tool access. Separate concern.

---

## Personal Settings → Connected Accounts (expanded)

Currently listed as a stub. Needs to become real:

```
CONNECTED ACCOUNTS

My Connections (personal, only visible to me)
  ● Google (Gmail + Calendar + Drive)    [Connected] [Disconnect]
    zachary@acmerecords.com · Expires in 87 days
  ○ Notion                               [Connect]
  ○ Linear                               [Connect]

Org Connections (managed by admin, I have access via my role)
  ● Vibe Prospecting    Builder role      [Active]
  ● Google Workspace    All roles         [Active]
  ● Salesforce          Gatekeeper+       [Active]
```

Personal connections appear as additional tools in Otto. Example: if a user connects their Gmail, Otto gains `read_my_email`, `search_my_calendar`, `create_calendar_event` scoped to that user only.

---

## Interactive Skill Creator

### Concept

A guided Otto conversation that produces a reusable, assignable tool definition.

### Access

Overlay → Workspace Admin → Skills → [+ Create Skill]
OR: Context Panel → Otto conversation → `/skill create`

### Flow

```
Admin opens Skill Creator
  │
  ▼
Otto: "What should this skill do? Describe it in plain language."
Admin: "When I'm looking at a company vault, pull their LinkedIn headcount
        trend from Vibe Prospecting and compare it to last quarter."
  │
  ▼
Otto: "Got it. This skill will:
       1. Get the vault's company domain from metadata
       2. Call Vibe Prospecting business-enrichment with that domain
       3. Extract workforce_trend data
       4. Return a structured summary with % change

       Should it also check for recent funding events? [Yes / No / Modify]"
  │
  ▼
Admin refines → Otto generates skill definition (JSON)
  │
  ▼
Otto: "Skill ready. Assign it to:"
  ☑ Builder  ☑ Gatekeeper  ☐ Owner
  Module scope: [Contracts ▼]  [+ Add module]
  Name: [Headcount Trend Check     ]
  [Save Skill]
  │
  ▼
Stored in workspace_skills
Otto runtime picks it up immediately for permitted roles
```

### Skill Definition Format (stored in workspace_skills.definition)

```json
{
  "tool_name": "headcount_trend_check",
  "description": "Pulls LinkedIn workforce trend for the current vault's company from Vibe Prospecting and returns headcount change vs last quarter",
  "parameters": {
    "type": "object",
    "properties": {
      "company_domain": { "type": "string", "description": "Auto-populated from vault metadata" }
    },
    "required": []
  },
  "implementation": {
    "type": "mcp_chain",
    "steps": [
      { "server": "vibe_prospecting", "tool": "match-business", "input_map": {"domain": "{{vault.metadata.company_domain}}"} },
      { "server": "vibe_prospecting", "tool": "business-enrichment", "input_map": {"business_id": "{{step_0.business_id}}"}, "fields": ["workforce_trend"] }
    ],
    "output_template": "{{company_name}} workforce: {{workforce_trend.current}} ({{workforce_trend.change_pct}}% vs last quarter)"
  }
}
```

---

## Google Workspace MCP Integration

### What It Covers

| Tool | Scope | Default Role Access |
|---|---|---|
| `list_drive_files` | Search/browse Drive | All roles |
| `read_drive_file` | Read file contents (Docs, Sheets, PDF) | All roles |
| `write_drive_file` | Create/update Docs | Owner+ |
| `list_calendar_events` | Read calendar | All roles |
| `create_calendar_event` | Create event | Builder+ |
| `send_email` | Send Gmail | Owner+ (or personal connection) |
| `search_gmail` | Search inbox | Personal connection only |

### Auth Model

- **Org-level**: Service account (OAuth 2.0 with domain-wide delegation) — admin configures once in Overlay, all users get access per their role
- **Personal-level**: Individual OAuth — user connects their own Google account in Personal Settings for personal inbox/calendar access

### Connection Flow (Org)

```
Overlay → MCP Servers → Add MCP Server
  URL: https://mcp.googleapis.com/mcp  (or self-hosted google-workspace-mcp)
  Auth: OAuth Service Account
  → Upload service account JSON key
  → Select scopes: Drive / Calendar / Gmail / Docs
  → Assign role permissions per tool
  → Save
```

---

## Vibe Prospecting Integration (First-Party Connector Example)

### Why It Fits

It's a sales/prospecting tool — most useful to Builders in the CRM module and deal-phase vaults. It should NOT be available to all roles by default (credits cost money).

### Default Permission Assignment

```
Tool                  Builder  Gatekeeper  Owner  Executive  Executive+
────────────────────────────────────────────────────────────────────────
match-business           ✓         ✓         ✓       ✓
fetch-businesses         ✓         ✓         ✓       ✓
business-enrichment      —         ✓         ✓       ✓
fetch-prospects          ✓         ✓         ✓       ✓
prospect-enrichment      ✓         ✓         ✓       ✓
business-events          —         —         ✓       ✓
export-to-csv            —         —         ✓       ✓
```

### Module Scoping

Default: available in **CRM** and **Contracts** modules only. Not surfaced in Calendar/Tasks.

### Credit Tracking

Add `credit_usage` to workspace_mcp_tool_permissions metadata. LiteLLM-style budget enforcement:
- Per-workspace monthly credit budget
- Per-role daily limit
- Alert at 80% consumption → audit event
- Hard stop at 100% (returns graceful error to Otto, not crash)

---

## Permission Model — Three Layers + OAuth Scopes

The Perplexity research confirms the right mental model. This is exactly Discord: server roles + channel permissions + per-user overrides. Our four layers:

```
Layer 1 — Org Role (global)       = Discord server role
  Member / Lead / Director / Executive

Layer 2 — Space/Module Role       = Discord category/channel role
  Builder / Gatekeeper / Owner / Designer / Viewer
  (per-module assignment, can differ per module)

Layer 3 — Tool Permission         = Discord channel permission override
  Per MCP tool: allowed_org_roles + module scope + user allow/blocklist

Layer 4 — OAuth Scopes            = Personal token limits
  Even if roles say yes, user can't call Vibe Prospecting if their
  personal Explorium token only has read-only scope
```

### Resolution Order (mirrors Discord's override hierarchy)

```
1. Explicit user-level DENY (user_blocklist) → hard stop, no override
2. Space/module-level role grant → can narrow or expand org-level
3. Org-level role grant → base access level
4. OAuth scope limit → final gate (personal token must grant the scope)
```

### Two Enforcement Points

**At the MCP Gateway (Airlock API):**
- Before a tool call leaves Airlock, check `workspace_mcp_tool_permissions`
- Inject signed JWT claims into the request: `user_id`, `org_id`, `roles`, `module`, `workspace_id`
- Block if: user in blocklist OR role not in allowed_org_roles OR module not in allowed_modules
- Tool call is never forwarded to MCP server if blocked

**At each MCP Server (when self-hosted or trust-aware):**
- Server validates the JWT from Airlock's auth service
- Maps claims → its own internal ACL checks
- Can advertise tool subsets based on role claims (e.g., `bulk_export` only shown to `owner+`)
- Third-party servers (Vibe Prospecting) get no JWT — Airlock gateway enforces before calling them

### Token Design

Short-lived JWT issued per Otto session, contains:
```json
{
  "sub": "user_ulid",
  "org_id": "workspace_ulid",
  "roles": ["builder"],
  "module": "crm",
  "vault_id": "vault_ulid",
  "mcp_scopes": ["vibe_prospecting.fetch-businesses", "google.read_drive_file"],
  "exp": 1234567890
}
```

`mcp_scopes` = intersection of (role-granted tools) ∩ (user's personal OAuth grants). Computed at session init, baked into token.

### Frontend Enforcement

Hidden, not disabled — same rule as general Airlock RBAC. Tools not in the user's `mcp_scopes` don't appear in Otto's suggestion UI. Server enforces independently and does NOT trust client.

---

## Implementation Tracks

### Prerequisites
- Track B (intake proof) must be complete — real data must flow before enrichment is meaningful

### Track M1 — AI Provider Config (Workspace-scoped LiteLLM)
**Goal**: Org admin can set their own Claude API key / OpenRouter key. Otto uses workspace config instead of env vars.

1. DB: `workspace_ai_providers` table + migration
2. Service: `services/ai_provider.py` — load workspace provider, inject into LiteLLM call
3. Overlay UI: AI Providers section in Workspace Admin
4. LiteLLM: pass workspace-scoped virtual key per request (LiteLLM supports per-key model routing)

### Track M2 — MCP Server Registry (URL → Tools → Role Permissions)
**Goal**: Admin pastes URL, tools are discovered, role permissions are assignable in Overlay.

1. DB: `workspace_mcp_servers` + `workspace_mcp_tool_permissions` tables + migration
2. Service: `services/mcp_registry.py` — discovery, manifest caching, health check
3. Route: `routes/mcp_servers.py` — CRUD + `/discover` endpoint
4. Otto runtime: `services/otto_context.py` — load permitted tools at session init
5. Overlay UI: MCP Servers section with tool permission matrix

### Track M3 — Google Workspace MCP
**Goal**: Org Google Workspace connected as MCP server. Otto can read Drive files, calendar events.

1. Connect Google Workspace MCP server (self-hosted or official endpoint)
2. Service account OAuth flow in Overlay
3. Tool permission defaults (see table above)
4. Personal connection OAuth for individual Gmail/Calendar

### Track M4 — Vibe Prospecting Connector
**Goal**: Explorium/Vibe Prospecting connected as MCP. Builder role can ask Otto to find contacts.

1. Register Vibe Prospecting MCP URL in registry
2. Default tool permissions (Builder/CRM+Contracts scoped)
3. Credit tracking middleware
4. Skill: "Enrich vault company from Vibe Prospecting" pre-built and assigned to CRM/Contracts Builders

### Track M5 — Interactive Skill Creator
**Goal**: Admin can have a conversation with Otto that produces a saved, assignable skill.

1. DB: `workspace_skills` table + migration
2. Skill Creator conversation mode in Context Panel
3. Otto generates tool definition JSON from conversation
4. Admin assigns permissions, skill is immediately live
5. Skill Creator accessible from Overlay → Skills section

### Track M6 — Personal Connections
**Goal**: Users can connect personal Google/Notion/Linear accounts. Otto gains personal tools.

1. DB: `user_connections` table + migration
2. Personal Settings → Connected Accounts (real OAuth flows)
3. Otto context loader merges personal tools
4. Scope isolation: personal tools never available to other users

---

## What NOT to Build

- **Don't build a separate LLM proxy** — LiteLLM already handles this. Workspace AI Provider config is just a DB record that tells LiteLLM which virtual key/model to use.
- **Don't build a custom MCP protocol implementation** — use `mcp` Python library (already in ecosystem). Just implement the client side.
- **Don't hardcode Vibe Prospecting** — it's just the first MCP server registered. The registry is the platform.
- **Don't expose credential values** — API keys go in at write time, never returned on read. Admin can re-enter but not retrieve.
- **Don't implement before Track B** — enrichment against mock/seeded data proves nothing.

---

## Related Specs

- `docs/specs/admin/overview.md` — Overlay structure, Connectors section
- `docs/specs/ai-agent/litellm-gateway.md` — LiteLLM proxy architecture
- `docs/specs/ai-agent/ai-runtime.md` — PydanticAI agent + tool registration
- `docs/specs/admin/template-compiler.md` — Skill creation pattern (local LLM)
- `docs/plans/demo-readiness-build-plan.md` — Track B (prerequisite)
