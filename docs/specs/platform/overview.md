# Platform Architecture — Free Shell / Paid Engine / MCP Control Plane

> **Status:** SPECCED
> **Decision:** LOCKED (2026-03-06)
> **Depends on:** ADR-26 (MCP context server), Feature Control Plane spec, Admin spec
> **Source research:** `docs/research/onboarding-flow.md`

---

## Executive Summary

Airlock is a **free shell + paid engine** platform. The Next.js frontend (the "shell") is open and free. Revenue comes from hosted MCP servers (the "engines") that provide AI orchestration, domain logic, integrations, and compute. Configuration lives in MCP resources, not hardcoded in the shell.

This spec defines the three-layer architecture, the monetization model, how feature flags become marketplace entitlements, and the two-phase build strategy (dogfood first, then multi-tenant).

---

## The Three Layers

### Layer 1: Airlock Platform (us, the company)

We operate the infrastructure that customer orgs connect to.

| Concern | Implementation |
|---|---|
| **Shell distribution** | Open-source Next.js app, self-hostable or hosted by us |
| **Engine hosting** | Multi-tenant MCP servers, provisioned per org |
| **Marketplace** | Registry of first-party + third-party MCP engines |
| **Billing** | Stripe, per-seat + engine entitlements |
| **Super-admin** | Platform-level admin panel in our own org |

**What we sell:**
- Access to hosted MCP engines (contracts, CRM, knowledge, automation)
- AI compute (LLM queries, vector indexing, OCR)
- Storage (document vaults, event logs, audit trails)
- Premium integrations (Google Workspace, JIRA, Salesforce MCP servers)

### Layer 2: Customer Org (workspace admin)

Each customer gets a workspace with its own MCP context server.

| Concern | Implementation |
|---|---|
| **Context server** | Logical instance scoped to `workspace_id` |
| **Config as resources** | `org://{ws_id}/journeys`, `org://{ws_id}/roles`, `org://{ws_id}/layouts` |
| **Engine registry** | Which MCP servers this org has access to (= entitlements) |
| **Tool permissions** | Role × tool permission matrix per engine |
| **BYOS** | Org can register their own MCP servers (custom tools) |
| **Admin UI** | Workspace Admin overlay (existing admin spec) |

### Layer 3: User (personal scope)

Individual users see only what their role + org entitlements allow.

| Concern | Implementation |
|---|---|
| **Role resolution** | `org_role` × `module_roles[]` × workspace permissions |
| **Tool visibility** | MCP context server returns only allowed tools per session |
| **Personal connections** | Per-user OAuth (Google, Notion, etc.) |
| **Custom skills** | Skills created within their permission scope |

---

## Feature Flags = Entitlements

The Feature Control Plane (27 flags, 32 calibration params, already specced) becomes the billing enforcement layer.

### How It Works

```
Feature Flag (existing spec)
    │
    ├── flag.status: enabled | disabled | beta
    ├── flag.targeting: per-workspace overrides
    │
    └── NEW: flag.tier: free | pro | enterprise
         │
         └── workspace.subscription.tier must >= flag.tier
             otherwise flag resolves to DISABLED
```

### Tier Mapping

| Tier | What's included | Price model |
|---|---|---|
| **Free** | Shell + basic views + 1 workspace + 5 users + manual data entry | $0 |
| **Pro** | All modules + Google/JIRA sync + Otto AI (capped) + 3 workspaces | $15/seat/month |
| **Enterprise** | Unlimited + BYOS + marketplace + custom roles + SSO + audit export | Custom |

### Engine → Flag Mapping

| Engine (MCP Server) | Feature Flag | Free | Pro | Enterprise |
|---|---|---|---|---|
| Contracts extraction | `ENGINE_CONTRACTS_OCR` | — | ✓ | ✓ |
| CRM enrichment (Vibe) | `ENGINE_CRM_ENRICHMENT` | — | — | ✓ |
| AI clause detection | `ENGINE_CONTRACTS_CLAUSES` | — | ✓ | ✓ |
| Google Workspace sync | `INTEGRATION_GOOGLE` | — | ✓ | ✓ |
| JIRA sync | `INTEGRATION_JIRA` | — | ✓ | ✓ |
| Otto AI agent | `ENGINE_OTTO` | limited | capped | unlimited |
| Knowledge vector index | `ENGINE_KNOWLEDGE` | — | — | ✓ |
| Automation pipelines | `ENGINE_AUTOMATION` | — | — | ✓ |
| Custom MCP servers (BYOS) | `PLATFORM_BYOS` | — | — | ✓ |
| Marketplace engines | per-engine flag | — | — | ✓ |

---

## MCP Context Server — The Config Surface

### What Lives in the Context Server

All org configuration is stored as MCP resources, editable via MCP tools.

```
org://{ws_id}/
├── config.json          ← name, logo, timezone, domain
├── roles.json           ← role definitions + permission matrices
├── journeys.json        ← lifecycle stage definitions (chambers mapped)
├── layouts.json         ← triptych/view configs per module per role
├── permissions.json     ← role × tool × module matrix
├── integrations.json    ← registered MCP servers + auth configs
├── flags.json           ← feature flag overrides (layered on platform defaults)
├── mappings/
│   ├── jira.json        ← JIRA field → Airlock field mappings
│   ├── google.json      ← Google Workspace sync config
│   └── salesforce.json  ← CRM field mappings
└── skills/
    └── *.json           ← custom skill definitions
```

### MCP Tools (Admin-facing)

These are the tools the admin panel calls. The shell never touches the DB directly for config — it goes through the context server.

| Tool | Description |
|---|---|
| `update_org_config` | Set workspace name, logo, timezone, domain |
| `update_journey` | Add/remove/reorder chambers, set transitions, attach automations |
| `update_role` | Define role permissions, tool access |
| `save_workspace_layout` | Configure triptych panel composition per module per role |
| `register_mcp_server` | Add external MCP server to org registry |
| `update_tool_permissions` | Set role × tool permission matrix for an engine |
| `save_data_mapping` | Map external fields to Airlock core types |
| `activate_premium_servers` | Enable paid engines (called after billing confirmation) |

### Shell ↔ Context Server Flow

```
User opens Airlock
    │
    ▼
Shell → MCP context server: resolve_session(user_id, workspace_id)
    │
    ▼
Context server returns:
    {
      roles: ["builder"],
      modules: ["contracts", "crm"],
      layout: { sidebar: [...], triptych: {...} },
      tools: ["match-business", "fetch-businesses", ...],
      flags: { ENGINE_CONTRACTS_OCR: true, ENGINE_OTTO: "capped" },
      journey: { current_chamber: "review", available_transitions: [...] }
    }
    │
    ▼
Shell renders ONLY what was returned
    - Components filtered by role
    - Tools filtered by permissions
    - Engines filtered by entitlement tier
```

---

## Two-Phase Build Strategy

### Phase 1: Dogfood (You are org #1)

**Goal:** Prove the model works end-to-end with real data.

| What | How |
|---|---|
| **Workspace** | Your org, your contracts, your CRM data |
| **MCP servers** | Vibe Prospecting, Google Workspace, local contract engine |
| **Roles** | You as Owner, test users as Builder/Gatekeeper |
| **Config** | Hardcoded defaults → progressively extract to context server |
| **Billing** | N/A (you're not billing yourself) |
| **Admin** | Full admin overlay — this IS the product surface you're testing |

**Deliverables:**
1. Admin overlay with Connectors section (MCP server registry)
2. Tool permission matrix (role × tool)
3. Working contract lifecycle through all 4 chambers
4. Google Workspace sync (calendar, drive)
5. Otto AI with Vibe Prospecting tools
6. Skill creator (natural language → tool chains)

### Phase 2: Multi-tenant (Other orgs)

**Goal:** Extract your setup into a configurable template for new customers.

| What | How |
|---|---|
| **Onboarding wizard** | Phase 0–6 from research doc (see `onboarding-flow.md`) |
| **Context server** | Deploy per-workspace logical instance, seed defaults |
| **Billing** | Stripe integration, tier enforcement via feature flags |
| **Marketplace** | Engine registry with install/configure flow |
| **Super-admin** | New admin section in YOUR workspace to manage customer orgs |

**Deliverables:**
1. `POST /api/workspaces/provision` — automated tenant creation
2. Onboarding wizard UI (7-step progressive disclosure)
3. Stripe billing integration
4. Feature flag → tier enforcement middleware
5. Marketplace engine registry
6. Super-admin panel (manage orgs, view health, override flags)

### Phase 3: Platform (Super-admin)

**Goal:** Admin screen in your org to manage all customer orgs.

```
YOUR ORG (Airlock the company)
├── Workspace Admin (normal admin for your own workspace)
└── Platform Admin (NEW — manages customer workspaces)
    ├── Org Directory — list all customer workspaces
    ├── Subscription Management — tiers, usage, billing
    ├── Engine Registry — which engines are available globally
    ├── Health Dashboard — MCP server uptime, sync lag, error rates
    ├── Feature Flag Overrides — per-org flag management
    └── Support Tools — impersonate user, view audit logs
```

---

## Terminology Reconciliation

The research document uses generic SaaS terms. Here's the mapping to Airlock vocabulary:

| Research Term | Airlock Term | Notes |
|---|---|---|
| Workspace (org-level) | **Workspace** | Already `workspace_id` in DB, correct |
| Workspace (sub-area) | **Module** | "Engineering Workspace" = the Tasks module scoped to eng team |
| Journey stage | **Chamber** | Discover > Build > Review > Ship (LOCKED) |
| Journey | **Vault lifecycle** | A vault progresses through chambers |
| Channel/Room | **Vault** | Workflow instance, NOT a chat room |
| Role (Owner/Admin/Manager/Member/Guest) | **Org role** + **Module role** | Org: member/lead/director/executive. Module: builder/gatekeeper/owner/designer/viewer |
| Component | **View** / **Triptych panel** | KanbanBoard = a View rendered in the Orchestrate panel |
| Tool | **MCP tool** | Correct, keep as-is |
| Engine | **MCP server** | A server that provides tools, resources, and optionally UI |
| Integration | **Connector** | In admin spec, the Connectors section |

### Decisions Required

| # | Question | Options | Recommendation |
|---|---|---|---|
| D1 | Are customer sub-areas (Engineering, Sales) Modules or something new? | (a) They're Modules with workspace-scoped config (b) New concept: "Team" or "Space" | **(a)** — Modules already have per-workspace config. Don't add a concept. |
| D2 | Does the marketplace live inside Admin Overlay or as a standalone route? | (a) Admin > Connectors > Marketplace tab (b) Top-level `/marketplace` route | **(a)** — Keep admin as single config surface. Marketplace is just a filtered view of available engines. |
| D3 | Do we use "Engine" or "MCP Server" in the UI? | (a) Engine (user-friendly) (b) MCP Server (technical) (c) Connector (current spec) | **(a)** — Users see "Engine." Developers see "MCP Server." Admin shows both. |

---

## Database Extensions Required (Phase 2)

```sql
-- Extend existing workspaces table
ALTER TABLE workspaces ADD COLUMN tier TEXT DEFAULT 'free';
ALTER TABLE workspaces ADD COLUMN subscription_status TEXT DEFAULT 'trial';
ALTER TABLE workspaces ADD COLUMN trial_ends_at TIMESTAMPTZ;
ALTER TABLE workspaces ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE workspaces ADD COLUMN max_users INTEGER DEFAULT 5;
ALTER TABLE workspaces ADD COLUMN max_storage_gb INTEGER DEFAULT 5;

-- New: Engine entitlements per workspace
CREATE TABLE workspace_engines (
    id TEXT PRIMARY KEY,              -- ULID
    workspace_id TEXT REFERENCES workspaces(id),
    engine_id TEXT NOT NULL,          -- e.g. 'contracts-ocr', 'vibe-prospecting'
    engine_type TEXT NOT NULL,        -- 'platform' | 'marketplace' | 'byos'
    status TEXT DEFAULT 'active',     -- active | suspended | trial
    config JSONB DEFAULT '{}',       -- engine-specific config
    auth JSONB DEFAULT '{}',         -- encrypted auth credentials
    usage_this_month JSONB DEFAULT '{}',  -- metering
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- New: Tool permissions per engine per role
CREATE TABLE tool_permissions (
    id TEXT PRIMARY KEY,
    workspace_id TEXT REFERENCES workspaces(id),
    engine_id TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    role TEXT NOT NULL,              -- org_role or module_role
    allowed BOOLEAN DEFAULT false,
    module_scope TEXT[],            -- which modules this applies to
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- New: Usage metering
CREATE TABLE usage_events (
    id TEXT PRIMARY KEY,
    workspace_id TEXT REFERENCES workspaces(id),
    user_id TEXT REFERENCES users(id),
    event_type TEXT NOT NULL,       -- 'ai_query' | 'ocr_extract' | 'api_call'
    engine_id TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
    -- NO updated_at, NO deleted_at — append-only like events table
);
```

---

## Relationship to Existing Specs

| Existing Spec | How This Spec Extends It |
|---|---|
| `admin/overview.md` | Connectors section becomes Engine Registry. Feature Flags become tier-linked. |
| `feature-control-plane/overview.md` | Flags gain `tier` field. Calibration params gain tier requirements. |
| `security/overview.md` | Resolves A6 (cost model: free tier + paid engines). Resolves A8 (shared DB + workspace_id, RLS deferred). |
| `roles/overview.md` | Org roles + module roles unchanged. Custom roles = enterprise tier. |
| `onboarding/overview.md` | Extends with Phase 0-6 provisioning flow from research doc. |
| `admin/mcp-registry-design.md` | UI design spec for the Connectors/Engine Registry admin section. |

---

## Implementation Priority

### Now (Phase 1 — Dogfood)
1. MCP server registry in admin (Connectors section) — **design spec done**
2. Tool permission matrix — **design spec done**
3. Skill creator — **design spec done**
4. Google Workspace MCP server integration
5. Contract lifecycle through all 4 chambers

### Next (Phase 2 — Multi-tenant)
1. Onboarding wizard (7-step)
2. Stripe billing integration
3. Feature flag → tier enforcement
4. Usage metering middleware
5. Workspace provisioning API

### Later (Phase 3 — Platform)
1. Super-admin panel
2. Marketplace with third-party engines
3. MCP Apps (engine-provided UI)
4. Developer SDK for engine creators
