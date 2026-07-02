# Airlock Architecture & Technical Reference

> **Audience:** Engineers, CTOs, technical due diligence reviewers.
> **Scope:** Complete technical architecture of Airlock, an enterprise data operations platform for contract lifecycle management.
> **Last updated:** 2026-03-07

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Tech Stack](#2-tech-stack)
3. [Data Model](#3-data-model)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [API Design](#5-api-design)
6. [State Management](#6-state-management)
7. [Event System](#7-event-system)
8. [Security Architecture](#8-security-architecture)
9. [Component System](#9-component-system)
10. [Infrastructure & DevOps](#10-infrastructure--devops)

---

## 1. System Architecture Overview

Airlock is a monorepo containing a Next.js 14 frontend, a FastAPI backend, and a shared types package. The architecture is designed for a single-tenant MVP that can evolve to multi-tenant SaaS without structural rewrites.

### 1.1 High-Level Architecture

```
+-------------------------------------------------------------+
|                        MONOREPO (pnpm)                       |
|                                                              |
|  +------------------+  +-----------------+  +--------------+ |
|  |   apps/web/      |  |   apps/api/     |  |  packages/   | |
|  |                  |  |                 |  | shared-types/ | |
|  |  Next.js 14      |  |  FastAPI        |  |              | |
|  |  App Router      |  |  Python 3.12+   |  |  OpenAPI     | |
|  |  TypeScript      |  |  PostgreSQL 16  |  |  codegen     | |
|  |  Zustand         |  |  Redis 7        |  |  TS client   | |
|  |  Tailwind CSS    |  |  Alembic        |  |              | |
|  +--------+---------+  +--------+--------+  +------+-------+ |
|           |                      |                  |         |
|           |   REST / WebSocket   |   generated      |         |
|           +-------->  <----------+    types          |         |
|                                       +-------------+         |
+-------------------------------------------------------------+
|                                                              |
|  +------------------+  +---------+  +---------------------+  |
|  |  PostgreSQL 16   |  | Redis 7 |  |  docs/specs/        |  |
|  |  Primary DB      |  | Cache   |  |  Design specs       |  |
|  |  JSONB metadata  |  | PubSub  |  |  (source of truth)  |  |
|  |  ULID PKs        |  | BullMQ  |  |                     |  |
|  +------------------+  +---------+  +---------------------+  |
+-------------------------------------------------------------+
```

### 1.2 Monorepo Structure

The project uses pnpm workspaces with Turborepo for build orchestration.

```
airlock-app/
  apps/
    web/                  # Next.js 14 (App Router, TypeScript, Zustand, Tailwind)
      src/
        app/              # Route segments (App Router file-based routing)
          (shell)/        # Shell layout group (module bar, sidebar, triptych)
            (modules)/    # Module route group
              contracts/  # Contracts module views
              crm/        # CRM module (react-admin, SSR disabled)
              tasks/      # Tasks module views
              calendar/   # Calendar module views
              documents/  # Documents module views
        components/       # Atomic component hierarchy
        stores/           # Zustand state stores
        lib/              # Utilities, API client, mock data
        styles/           # Tailwind config, CSS custom properties

    api/                  # FastAPI (Python, async-first)
      src/
        main.py           # App factory, middleware, CORS
        config.py         # Pydantic BaseSettings (env vars)
        routes/           # API route modules (one per domain)
        services/         # Business logic layer
        models/           # SQLAlchemy ORM + Pydantic schemas
        schemas/          # Pydantic request/response schemas
        engines/          # Ported from OrcestrateOS
          extraction/     # 7 extractors + dispatcher
          preflight/      # Quality gates, risk scoring
          generation/     # Contract clause selection + interpolation
        migrations/       # Alembic migration files
        middleware/       # Auth, CORS, rate limiting

  packages/
    shared-types/         # OpenAPI-generated TypeScript client

  docs/
    specs/                # Design specifications (source of truth)
    plans/                # Implementation plans
```

**Key file paths referenced throughout this document:**

| File                                | Purpose                                        |
| ----------------------------------- | ---------------------------------------------- |
| `apps/api/src/main.py`              | FastAPI app factory, router registration, CORS |
| `apps/api/src/config.py`            | Pydantic BaseSettings (all env vars)           |
| `apps/api/src/middleware/auth.py`   | JWT verification, dev bypass                   |
| `apps/api/src/routes/vaults.py`     | Vault CRUD, chamber progression                |
| `apps/api/src/routes/auth.py`       | Google OAuth, JWT refresh, dev login           |
| `apps/api/src/models/__init__.py`   | ORM model registry                             |
| `apps/web/src/middleware.ts`        | Next.js edge middleware (route protection)     |
| `apps/web/src/lib/api.ts`           | API client with auth headers                   |
| `apps/web/src/stores/auth.store.ts` | Zustand auth state                             |
| `apps/web/src/styles/tokens.css`    | Design tokens (all CSS custom properties)      |

### 1.3 Shared Types via OpenAPI Codegen

The `packages/shared-types/` package provides type safety across the stack boundary. FastAPI auto-generates an OpenAPI 3.1 schema from Pydantic models. A codegen pipeline produces a TypeScript client so the frontend never hand-writes API types.

```
FastAPI (Pydantic models)
    |
    +--  /openapi.json  (auto-generated)
    |
    +--  codegen pipeline
    |
    +--  packages/shared-types/  (TypeScript client)
    |
    +--  apps/web/  (imports @airlock/shared-types)
```

Until the codegen pipeline is fully wired, the frontend uses `apiFetch<T>()` from `apps/web/src/lib/api.ts` -- a typed fetch wrapper that attaches JWT auth headers and enforces a 30-second timeout.

---

## 2. Tech Stack

All library choices are locked. Every dependency is MIT or Apache-2.0 licensed, self-hostable, and actively maintained. The full rationale is documented in `docs/specs/tech-stack/overview.md`.

### 2.1 Core Platform

| Layer               | Technology              | Version | Notes                                                 |
| ------------------- | ----------------------- | ------- | ----------------------------------------------------- |
| Frontend Framework  | Next.js 14 (App Router) | 14.x    | TypeScript, server components, file-based routing     |
| UI Styling          | Tailwind CSS            | 3.x     | Custom OLED dark theme via CSS custom properties      |
| State Management    | Zustand                 | 4.x     | Lightweight, middleware support, no boilerplate       |
| Backend API         | FastAPI                 | 0.115+  | Python, async-first, OpenAPI auto-docs                |
| Database            | PostgreSQL              | 16      | JSONB metadata, ULID primary keys, append-only events |
| Cache / PubSub      | Redis                   | 7       | BullMQ queues, WebSocket fan-out, session cache       |
| Containerization    | Docker Compose          | --      | Local dev: Postgres + Redis + API + Web               |
| Migrations          | Alembic                 | --      | Versioned, reversible schema migrations               |
| Package Manager     | pnpm                    | --      | Workspace support, strict dependency resolution       |
| Build Orchestration | Turborepo               | --      | Parallel builds across monorepo packages              |

### 2.2 Feature-Specific Libraries

| Domain                 | Library                  | License    | Purpose                                            |
| ---------------------- | ------------------------ | ---------- | -------------------------------------------------- |
| CRM                    | react-admin + Atomic CRM | MIT        | CRUD, data grid, pipeline views for CRM module     |
| Kanban / DnD           | @hello-pangea/dnd        | Apache-2.0 | Drag-and-drop for Tasks Kanban and triage lanes    |
| Calendar               | Schedule-X               | MIT        | Month/week/day/agenda views for Calendar module    |
| Notifications          | Novu                     | MIT        | In-app + email + push notification infrastructure  |
| Event Bus              | BullMQ                   | MIT        | Redis-backed job queues for cross-module events    |
| Workflow Orchestration | Trigger.dev              | Apache-2.0 | Multi-step durable workflows on top of BullMQ      |
| Rich Text              | TipTap                   | MIT        | ProseMirror-based editor for workspace and patches |
| PDF Viewing            | PDF.js                   | Apache-2.0 | Document viewer with annotation overlay            |
| AI Runtime             | PydanticAI + LiteLLM     | MIT        | Typed tool calls, multi-provider model routing     |

### 2.3 Rejected Alternatives

| Category      | Rejected                  | Reason                                                     |
| ------------- | ------------------------- | ---------------------------------------------------------- |
| CSS Framework | shadcn/ui, Chakra, MUI    | Full control needed for Airlock's OLED aesthetic           |
| State         | Redux, Jotai, Recoil      | Zustand is simpler, sufficient, no boilerplate             |
| Auth          | NextAuth, Clerk, Auth0    | Custom JWT + Google OAuth ported from OrcestrateOS         |
| Calendar      | FullCalendar              | Mixed license (premium features require commercial)        |
| CRM           | Twenty (AGPL), Huly (EPL) | License restrictions                                       |
| Search        | ElasticSearch (SSPL)      | JVM overhead, non-OSI license. MeiliSearch (MIT) preferred |

### 2.4 Dependency Graph

```
Next.js 14 (apps/web)
  +-- Zustand (state)
  +-- Tailwind CSS (styling)
  +-- TipTap (rich text)
  +-- react-admin (CRM only, SSR disabled)
  +-- @hello-pangea/dnd (Kanban/tasks)
  +-- Schedule-X (Calendar)
  +-- Novu React (notification center)
  +-- PDF.js (document viewer)

FastAPI (apps/api)
  +-- SQLAlchemy (ORM)
  +-- Pydantic / pydantic-settings (validation, config)
  +-- python-jose (JWT)
  +-- BullMQ Python SDK (event bus)
  +-- Trigger.dev (workflow orchestration)
  +-- httpx (external API calls)

Infrastructure
  +-- PostgreSQL 16 (primary data)
  +-- Redis 7 (BullMQ, caching, PubSub)
  +-- Docker Compose (local dev)
  +-- Alembic (migrations)
```

---

## 3. Data Model

Airlock's data model is organized around the **vault** as the fundamental unit of work. The vault hierarchy doubles as the CRM -- there are no separate CRM tables.

### 3.1 Domain Vocabulary

Understanding Airlock's data model requires its canonical vocabulary. These terms are used consistently across the codebase, specs, and API.

| Concept               | Term         | Description                                            |
| --------------------- | ------------ | ------------------------------------------------------ |
| Top-level domain      | **Module**   | Contracts, CRM, Tasks, Calendar, Documents             |
| Workflow instance     | **Vault**    | A work unit: source material + metadata + audit trail  |
| Lifecycle stage       | **Chamber**  | Discover > Build > Review > Ship                       |
| Chamber checkpoint    | **Gate**     | A quality checkpoint within a chamber                  |
| Screen within chamber | **View**     | A specific UI for a chamber (e.g., Triage Board)       |
| Three-panel layout    | **Triptych** | Signal (left) - Orchestrate (center) - Control (right) |
| Admin                 | **Overlay**  | System settings panel (not a module)                   |

### 3.2 Vault Hierarchy (The Core Data Structure)

The vault hierarchy is a self-referential tree. It serves as both the workflow container and the CRM entity graph. There are no separate account/contact/deal tables.

```
WORKSPACE (tenant boundary, not a vault)
  |
  +-- PARENT VAULT (Level 1: top-level legal entity)
  |     |
  |     +-- DIVISION VAULT (Level 2: subsidiary, acquired company)
  |     |     |
  |     |     +-- COUNTERPARTY VAULT (Level 3: business relationship)
  |     |     |     |
  |     |     |     +-- ITEM VAULT (Level 4: contract, task, document)
  |     |     |     +-- ITEM VAULT
  |     |     |
  |     |     +-- COUNTERPARTY VAULT
  |     |           |
  |     |           +-- ITEM VAULT
  |     |
  |     +-- COUNTERPARTY VAULT (direct, no division)
  |           |
  |           +-- ITEM VAULT
  |
  +-- PARENT VAULT
        |
        +-- COUNTERPARTY VAULT
              |
              +-- ITEM VAULT
```

**Key rules:**

- Levels 1-3 are organizational. They aggregate health, metrics, and status from their children.
- Only Level 4 (Item Vaults) progress through chambers (Discover > Build > Review > Ship).
- The CRM module is a filtered view over levels 1-3, not a separate database.
- `parent_vault_id` creates the tree. Membership cascades downward with an `inherited` flag.

### 3.3 Database Schema Conventions

All tables follow a strict set of conventions.

| Convention         | Implementation                                      |
| ------------------ | --------------------------------------------------- |
| Primary keys       | ULID (TEXT type, generated in application layer)    |
| Tenant isolation   | `workspace_id` column on every table (used for RLS) |
| Soft deletes       | `deleted_at` TIMESTAMPTZ column (NULL = active)     |
| Flexible metadata  | JSONB `metadata` column (default `{}`)              |
| Timestamps         | `created_at` and `updated_at` (TIMESTAMPTZ, UTC)    |
| Event immutability | `events` table is append-only (no UPDATE or DELETE) |

### 3.4 Core Tables

The ORM model registry is defined in `apps/api/src/models/__init__.py`:

```python
# Current model registry
__all__ = [
    "Document",      # Uploaded documents
    "Event",         # Append-only event log
    "Patch",         # Data corrections / amendments
    "User",          # User identity
    "UserModuleRole",# Per-module role assignments
    "Vault",         # Core work unit (the hierarchy)
    "VaultMember",   # Access control per vault
    "Workspace",     # Tenant boundary
]
```

### 3.5 Vaults Table (Simplified Schema)

```sql
CREATE TABLE vaults (
    id TEXT PRIMARY KEY,                    -- ULID
    workspace_id TEXT NOT NULL,             -- Tenant isolation
    parent_vault_id TEXT REFERENCES vaults(id),  -- Self-referential tree
    vault_level INT NOT NULL DEFAULT 4,     -- 1=parent, 2=division, 3=counterparty, 4=item
    name TEXT NOT NULL,
    slug TEXT NOT NULL,                     -- URL-friendly identifier
    vault_type TEXT NOT NULL,               -- 'entity' | 'division' | 'counterparty' | 'contract' | 'task' | 'document'
    module_type TEXT,                       -- Which module owns this vault
    chamber TEXT DEFAULT 'discover',        -- discover | build | review | ship (NULL for levels 1-3)
    gate TEXT,                              -- Current gate within chamber
    metadata JSONB NOT NULL DEFAULT '{}',   -- Type-specific data
    health_score FLOAT,                     -- Aggregate for org vaults, direct for items
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    archived_at TIMESTAMPTZ,               -- Soft delete
    UNIQUE (workspace_id, slug)
);

CREATE INDEX idx_vaults_parent ON vaults(parent_vault_id);
CREATE INDEX idx_vaults_workspace ON vaults(workspace_id, vault_level);
CREATE INDEX idx_vaults_module ON vaults(workspace_id, module_type);
```

### 3.6 Events Table (Append-Only)

Events are immutable records. The table never has UPDATE or DELETE operations. Every action in the system -- extraction, patch submission, chamber advancement, health score change -- produces an event.

```sql
CREATE TABLE events (
    id TEXT PRIMARY KEY,           -- ULID
    vault_id TEXT NOT NULL,        -- FK to vaults
    workspace_id TEXT NOT NULL,    -- For RLS
    event_type TEXT NOT NULL,      -- extraction.completed, patch.submitted, gate.advanced, etc.
    actor_id TEXT,                 -- FK to users (NULL for system events)
    payload JSONB NOT NULL,        -- Event-specific data
    created_at TIMESTAMPTZ DEFAULT now()  -- Immutable timestamp
);
```

### 3.7 How the CRM Emerges from Vaults

The CRM module does not have its own data store. It is a lens over the vault hierarchy filtered to levels 1-3.

| CRM View  | Vault Level            | What It Shows                                   |
| --------- | ---------------------- | ----------------------------------------------- |
| Accounts  | Level 1 (Parent)       | Parent companies with aggregate stats           |
| Divisions | Level 2 (Division)     | Subsidiaries with their own aggregates          |
| Contacts  | Level 3 (Counterparty) | Business relationships with deal history        |
| Pipeline  | Levels 3-4             | Counterparties + item vaults grouped by chamber |

Aggregate metrics (total contracts, health score, revenue, active deals) are computed by recursively aggregating child vault data -- not stored in separate CRM tables.

---

## 4. Authentication & Authorization

Airlock uses a custom JWT + Google OAuth system ported from the OrcestrateOS codebase, with a three-tier permission model inspired by Discord.

### 4.1 Authentication Flow

```
Browser                       Next.js Middleware          FastAPI API
  |                                  |                        |
  +-- GET /contracts --------------->|                        |
  |                                  |                        |
  |   Check cookie:                  |                        |
  |   airlock_access_token           |                        |
  |                                  |                        |
  |   [No cookie] ---- 302 /login -->|                        |
  |   [Has cookie] --- passthrough ->|                        |
  |                                  |                        |
  +-- API call (Bearer token) -------|----------------------->|
  |                                  |                        |
  |                                  |   Verify JWT           |
  |                                  |   Extract: sub, email, |
  |                                  |     workspace_id,      |
  |                                  |     org_role           |
  |                                  |                        |
  |<-- JSON response ----------------|<-----------------------|
```

**Implementation details:**

- **Next.js middleware** (`apps/web/src/middleware.ts`) checks for an `airlock_access_token` cookie on every non-public route. Public paths: `/login`, `/onboarding`, `/api`, `/_next`, `/favicon.ico`. Missing cookie redirects to `/login`.

- **API auth middleware** (`apps/api/src/middleware/auth.py`) uses FastAPI's `HTTPBearer` scheme. It verifies the JWT, checks `type == "access"`, and returns the decoded payload as the user context. In development mode, hardcoded dev tokens bypass JWT verification.

- **Token lifecycle**: Access tokens expire after 15 minutes. Refresh tokens expire after 7 days. Both are configured in `apps/api/src/config.py`. The refresh endpoint (`POST /api/v1/auth/refresh`) issues new access tokens without re-authentication.

- **Google OAuth**: The `POST /api/v1/auth/google/verify` endpoint accepts a Google ID token credential, verifies it, creates/fetches the user record, and returns a JWT pair plus user info.

- **Dev login**: A `POST /api/v1/auth/dev/login` endpoint (development mode only) creates a dev user with executive-level access and returns tokens without OAuth.

### 4.2 Token Storage (Client-Side)

The auth store (`apps/web/src/stores/auth.store.ts`) manages token persistence:

```typescript
// On login:
localStorage.setItem("airlock_access_token", response.access_token);
localStorage.setItem("airlock_refresh_token", response.refresh_token);
document.cookie = `airlock_access_token=${token}; path=/; max-age=900; SameSite=Lax`;

// On logout:
localStorage.removeItem("airlock_access_token");
localStorage.removeItem("airlock_refresh_token");
document.cookie = "airlock_access_token=; path=/; max-age=0; SameSite=Lax";
```

The cookie duplicate is required because Next.js edge middleware cannot access `localStorage`. The cookie has a 900-second (15-minute) max-age matching the access token TTL.

### 4.3 Three-Tier Authorization Model

Airlock uses three layers of identity, computed top-down.

```
Layer 1: Organization Role     -->  Which modules can I see?
Layer 2: Module Role            -->  What can I do in this module?
Layer 3: Agentic Role           -->  How is my UI optimized for how I think?
```

**Layer 1 -- Organization Role (Org-Level)**

| Org Role  | Access                                                    |
| --------- | --------------------------------------------------------- |
| Member    | View-only across org + assigned modules                   |
| Lead      | Manage within assigned modules                            |
| Director  | Full access to assigned modules + cross-module visibility |
| Executive | Read access everywhere + Admin overlay                    |

**Layer 2 -- Module Role (Per-Module)**

A user can have different roles in different modules. The five base module roles:

| Module Role | Permission Level            | What They Do                                      |
| ----------- | --------------------------- | ------------------------------------------------- |
| Builder     | Draft, observe, assemble    | Creates records, drafts fixes, assembles evidence |
| Gatekeeper  | Review, approve/reject      | Evaluates evidence, enforces quality standards    |
| Owner       | Promote, configure, publish | Makes final decisions, promotes to baseline       |
| Designer    | Schema, calibrate, sandbox  | Builds schemas, configures extraction rules       |
| Viewer      | Read-only                   | Observes data and events, no write access         |

**Layer 3 -- Agentic Role (Personality-Optimized)**

Sixteen functional roles from the Sovereign Workplace framework. These drive UI layout optimization and tool configuration based on a user's working style. They do not override permissions -- they personalize the interface.

### 4.4 Permission Computation (Discord-Style)

Permissions are additive with three override layers, computed in order:

```python
def compute_effective_permissions(user_id, workspace_id, module_id, channel_id=None):
    # 1. Start with base module role permissions
    permissions = set(DEFAULT_PERMISSIONS[module_role])

    # 2. Apply ad-hoc module-level overrides (admin-granted)
    for override in get_active_overrides(user_id, workspace_id, 'module', module_id):
        if override.effect == 'grant':
            permissions.add(override.permission)
        elif override.effect == 'deny':
            permissions.discard(override.permission)

    # 3. Apply vault-level overrides (most specific wins)
    # 4. Enforce org role ceiling (absolute maximum)
    permissions &= ORG_ROLE_CEILING[org_role]

    # 5. Enforce Separation of Duties (non-overridable, hardcoded)
    return permissions
```

**Self-approval prevention** is hardcoded at every level. No API path, admin override, or permission escalation can bypass SoD:

- A Builder cannot approve their own patch.
- A Gatekeeper cannot approve work they drafted.
- An Owner cannot promote changes they authored without Gatekeeper sign-off.

**Risk-based escalation:**

| Risk Level | Required Approvals                        |
| ---------- | ----------------------------------------- |
| Low        | 1 Gatekeeper                              |
| Medium     | 1 Gatekeeper + 1 Owner                    |
| High       | 2 Gatekeepers + 1 Owner                   |
| Critical   | All of above + time-locked cooling period |

### 4.5 Role Database Schema

```sql
-- Per-module role assignments
CREATE TABLE user_module_roles (
    user_id TEXT NOT NULL REFERENCES users(id),
    workspace_id TEXT NOT NULL,
    module_id TEXT NOT NULL,
    module_role TEXT NOT NULL DEFAULT 'viewer',  -- builder | gatekeeper | owner | designer | viewer
    agentic_role TEXT,                            -- optional: 1 of 16 functional roles
    PRIMARY KEY (user_id, workspace_id, module_id)
);

-- Ad-hoc permission overrides
CREATE TABLE permission_overrides (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    scope_type TEXT NOT NULL,             -- 'module' | 'vault'
    scope_id TEXT NOT NULL,
    permission TEXT NOT NULL,             -- 'approve_low_risk', 'export_data', etc.
    effect TEXT NOT NULL DEFAULT 'grant', -- 'grant' | 'deny'
    expires_at TIMESTAMPTZ,              -- NULL = permanent
    granted_by TEXT NOT NULL,
    granted_at TIMESTAMPTZ DEFAULT now()
);

-- Vault membership (access control per vault)
CREATE TABLE vault_members (
    vault_id TEXT NOT NULL REFERENCES vaults(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    role TEXT NOT NULL DEFAULT 'member',  -- 'owner' | 'gatekeeper' | 'builder' | 'viewer'
    inherited BOOLEAN NOT NULL DEFAULT false,  -- true = inherited from parent vault
    PRIMARY KEY (vault_id, user_id)
);
```

---

## 5. API Design

### 5.1 Layered Architecture

Airlock's backend enforces strict separation between HTTP handling, business logic, and data access.

```
Route (HTTP)  --->  Service (business logic)  --->  Model (data access)
   |                       |                            |
   | Request/Response      | Orchestrates models        | SQLAlchemy ORM
   | Pydantic validation   | Contains all logic         | Raw queries
   | Auth checks           | Emits events               | Transactions
   | Error responses       | Enforces invariants        |
```

**The cardinal rule:** No business logic in route handlers. Routes handle HTTP concerns (request parsing, response formatting, auth dependency injection). All logic lives in the `services/` layer.

### 5.2 Application Factory

The FastAPI app is created via a factory pattern in `apps/api/src/main.py`:

```python
def create_app() -> FastAPI:
    app = FastAPI(
        title="Airlock API",
        description="Enterprise data operations platform API",
        version="0.1.0",
        lifespan=lifespan,
    )

    # CORS middleware (origins from config)
    app.add_middleware(CORSMiddleware, ...)

    # Health check at /health
    # Route registration for all domain routers:
    app.include_router(auth_router)       # /api/v1/auth/*
    app.include_router(document_router)   # /api/v1/documents/*
    app.include_router(vault_router)      # /api/v1/vaults/*
    app.include_router(event_router)      # /api/v1/events/*
    app.include_router(engine_router)     # /api/v1/engines/*
    app.include_router(patch_router)      # /api/v1/patches/*
    app.include_router(review_queue_router) # /api/v1/review-queue/*

    return app
```

### 5.3 Vault API (Representative Endpoints)

The vault router (`apps/api/src/routes/vaults.py`) demonstrates the standard patterns:

| Method  | Endpoint                                     | Description                                                |
| ------- | -------------------------------------------- | ---------------------------------------------------------- |
| `POST`  | `/api/v1/vaults`                             | Create a new vault                                         |
| `POST`  | `/api/v1/vaults/from-document`               | Create vault from uploaded document                        |
| `GET`   | `/api/v1/vaults`                             | List vaults (filterable by module, level, chamber, parent) |
| `GET`   | `/api/v1/vaults/{vault_id}`                  | Get single vault                                           |
| `GET`   | `/api/v1/vaults/{vault_id}/children`         | Get direct children                                        |
| `PATCH` | `/api/v1/vaults/{vault_id}`                  | Update vault metadata                                      |
| `POST`  | `/api/v1/vaults/{vault_id}/advance`          | Advance to next chamber                                    |
| `GET`   | `/api/v1/vaults/{vault_id}/transition-check` | Check if vault can advance                                 |
| `POST`  | `/api/v1/vaults/{vault_id}/run-preflight`    | Run preflight quality gates                                |
| `POST`  | `/api/v1/vaults/{vault_id}/run-extraction`   | Run document extraction                                    |
| `POST`  | `/api/v1/vaults/{vault_id}/archive`          | Soft-delete vault                                          |

### 5.4 Request/Response Validation

All request and response payloads use Pydantic models defined in `apps/api/src/schemas/`. Example from the vault schemas:

```python
class CreateVaultRequest(BaseModel):
    name: str
    vault_type: str
    vault_level: int = 4
    parent_vault_id: str | None = None
    module_type: str | None = None
    metadata: dict = {}

class VaultResponse(BaseModel):
    id: str
    workspace_id: str
    parent_vault_id: str | None
    vault_level: int
    name: str
    slug: str
    vault_type: str
    module_type: str | None
    chamber: str | None
    gate: str | None
    metadata: dict
    health_score: float | None
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None
```

### 5.5 Event Emission Pattern

Every state-changing route emits an event after the write operation succeeds. This pattern is consistent across all routes:

```python
@router.post("/{vault_id}/advance")
def advance_chamber_route(vault_id, current_user, db):
    vault = get_vault(db, vault_id, workspace_id)       # Read
    vault = advance_chamber(db, vault, workspace_id)     # Write (service layer)
    create_event(db,                                      # Event emission
        vault_id=vault.id,
        workspace_id=vault.workspace_id,
        event_type="chamber_advanced",
        actor_id=current_user.get("sub"),
        payload={"chamber": vault.chamber, "gate": vault.gate},
    )
    return _vault_to_response(vault)                     # Response
```

### 5.6 Configuration

All configuration is managed via Pydantic BaseSettings in `apps/api/src/config.py`, loaded from environment variables with `.env` file support:

```python
class Settings(BaseSettings):
    database_url: str = "postgresql://airlock:airlock@localhost:5432/airlock"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_access_expire_minutes: int = 15
    jwt_refresh_expire_days: int = 7
    google_client_id: str = ""
    google_client_secret: str = ""
    cors_origins: list[str] = ["http://localhost:3000"]
    litellm_api_base: str = "http://localhost:4000"
    environment: str = "development"
    uploads_dir: str = "uploads"
```

---

## 6. State Management

### 6.1 Zustand Store Architecture

The frontend uses Zustand for all client-side state. Stores are flat (no deep nesting), colocated by domain, and follow a consistent pattern.

| Store          | File                             | Purpose                                           |
| -------------- | -------------------------------- | ------------------------------------------------- |
| Auth           | `stores/auth.store.ts`           | User identity, org role, module roles, JWT tokens |
| Module         | `stores/module.store.ts`         | Active module, chamber, selected vault            |
| Extraction     | `stores/extraction.store.ts`     | Extraction results, field states                  |
| Otto           | `stores/otto.store.ts`           | AI agent session, messages, streaming state       |
| Patch          | `stores/patch.store.ts`          | Patch editor state, draft lifecycle               |
| Shell          | `stores/shell.store.ts`          | Shell UI state (sidebar, panels)                  |
| Demo Lifecycle | `stores/demo-lifecycle.store.ts` | Demo mode state machine                           |

### 6.2 Auth Store (Representative Pattern)

The auth store (`apps/web/src/stores/auth.store.ts`) demonstrates the standard Zustand pattern:

```typescript
interface AuthState {
  user: User | null;
  orgRole: OrgRole | null;
  moduleRoles: Record<string, ModuleRole>; // Per-module role map
  accessToken: string | null;
  isLoading: boolean;

  setUser: (user: User | null) => void;
  setOrgRole: (role: OrgRole | null) => void;
  setModuleRole: (module: string, role: ModuleRole) => void;
  hydrateFromLoginResponse: (response: LoginResponse) => void;
  logout: () => void;
}
```

The store hydrates from the API login response and persists tokens to both `localStorage` (for API calls) and cookies (for Next.js middleware).

### 6.3 Mock-First Strategy with API Fallback

All frontend milestones use mock data with typed exports. The pattern:

1. Mock data defined in `apps/web/src/lib/mock-*.ts` files with typed constants (`MOCK_VAULTS`, `MOCK_TASKS`, etc.).
2. Stores attempt an `apiFetch()` call inside a try block.
3. On failure (API not running), stores fall back to mock data in the catch block.

```typescript
// Pattern used across all stores
try {
  const data = await apiFetch<VaultResponse[]>("/api/v1/vaults");
  set({ vaults: data });
} catch {
  // API not available -- use mock data for development
  set({ vaults: MOCK_VAULTS });
}
```

This strategy enables parallel frontend/backend development. The frontend is fully functional with mock data, and switching to real API calls requires zero code changes -- just running the API server.

### 6.4 Mock Data Files

| File                        | Contents                                   |
| --------------------------- | ------------------------------------------ |
| `lib/mock-calendar.ts`      | Calendar events derived from vault dates   |
| `lib/mock-crm.ts`           | CRM accounts, contacts, pipeline data      |
| `lib/mock-documents.ts`     | Document library entries                   |
| `lib/mock-extractions.ts`   | Extraction results with confidence scores  |
| `lib/mock-meetings.ts`      | Meeting records                            |
| `lib/mock-notifications.ts` | Notification feed items                    |
| `lib/mock-tasks.ts`         | Task board items with status and assignees |
| `lib/mock-workflows.ts`     | Workflow definitions and run history       |

---

## 7. Event System

Airlock has two event systems that operate at different layers: a server-side event bus for cross-module communication, and a real-time WebSocket layer for client delivery.

### 7.1 Architecture Overview

```
+-------------------+          +-------------------+          +------------------+
|  Module A         |          |  Event Bus        |          |  Module B        |
|  (Contracts)      |          |  (BullMQ/Redis)   |          |  (CRM)           |
|                   |          |                   |          |                  |
|  contract.shipped | -publish->  Router           | -dispatch->  handle_shipped()|
|                   |          |                   |          |  update_account()|
+-------------------+          |    +-- Audit --+  |          +------------------+
                               |    | (logged)  |  |
                               |    +-----------+  |          +------------------+
                               |                   | -dispatch->  Module C        |
                               +-------------------+          |  (Tasks)         |
                                       |                      |  create_task()   |
                                       |                      +------------------+
                                       v
                               +-------------------+
                               |  WebSocket Layer  |
                               |  (Redis Pub/Sub)  |
                               |                   |
                               |  Browser Tab A <--+
                               |  Browser Tab B <--+
                               +-------------------+
```

### 7.2 Server-Side Event Bus (BullMQ)

The event bus is the nervous system of Airlock. When something happens in one module, the bus routes that signal to every module that cares.

**Queue topology** (one queue per target module):

| Queue                  | Concurrency | Purpose                         |
| ---------------------- | ----------- | ------------------------------- |
| `crm-events`           | 5           | Account updates, entity linking |
| `tasks-events`         | 10          | Task creation, status changes   |
| `calendar-events`      | 5           | Date event creation             |
| `notifications-events` | 20          | User alerts                     |
| `admin-events`         | 3           | System health, circuit breakers |
| `analytics-events`     | 3           | Metrics tracking                |

**Event routing** maps event types to target queues:

```typescript
const EVENT_ROUTES = {
  "contract.shipped": [
    "crm-events",
    "tasks-events",
    "calendar-events",
    "notifications-events",
  ],
  "entity.resolved": ["crm-events"],
  "entity.new_customer": ["crm-events", "tasks-events"],
  "gate.advanced": ["notifications-events", "analytics-events"],
  "patch.submitted": ["notifications-events"],
  "batch.completed": ["notifications-events", "analytics-events"],
  "sla.breached": ["notifications-events", "admin-events"],
  // ...
};
```

**Retry and error handling:**

| Parameter         | Value                                |
| ----------------- | ------------------------------------ |
| Max retries       | 3 per job                            |
| Backoff           | Exponential: 5s, 30s, 120s           |
| Dead letter queue | `{queue}-dlq` after max retries      |
| Timeout           | 30s per handler execution            |
| Idempotency       | Handlers use `event.id` as dedup key |

For complex multi-step workflows (e.g., contract onboarding: ship > CRM vault > tasks > calendar > notify), Trigger.dev provides durable execution with step-level retry, rollback, and visual debugging on top of BullMQ.

### 7.3 Cross-Module Event Schema

Every event follows a standard schema:

```typescript
interface CrossModuleEvent {
  id: string; // UUID
  event_type: string; // "contract.shipped", "entity.resolved"
  workspace_id: string;
  source_module: string; // "contracts", "crm", "tasks"
  source_vault_id: string;
  source_event_id: string; // References the channel_event row
  payload: Record<string, any>;
  actor_id: string | null; // NULL for system events
  actor_type: "human" | "system" | "ai";
  timestamp: string; // ISO 8601
  priority: number; // 0 (normal) to 10 (critical)
}
```

### 7.4 Real-Time WebSocket Layer (Redis Pub/Sub)

WebSocket delivers events from the server to connected browser clients in real time. Redis Pub/Sub bridges multiple FastAPI worker processes.

```
Browser              FastAPI Worker A        Redis         FastAPI Worker B
  |                       |                   |                  |
  |  ws://api/ws?token=JWT|                   |                  |
  |<====== connect ======>|                   |                  |
  |                       |                   |                  |
  | { subscribe:          |                   |                  |
  |   "vault:henderson" } |                   |                  |
  |---------------------->| subscribe ------->|                  |
  |                       |                   |                  |
  |                       |   (event emitted) |                  |
  |                       |                   |<--- publish -----|
  |                       |<-- relay ---------|                  |
  |<-- event frame -------|                   |                  |
```

**Topic patterns:**

| Pattern                | Receives Events From                    |
| ---------------------- | --------------------------------------- |
| `vault:{vault_id}`     | All events for a specific vault         |
| `view:{module}/{view}` | Aggregated events for a chamber view    |
| `module:{module_id}`   | Module-level events (badge counts)      |
| `workspace`            | Workspace-wide events (admin, health)   |
| `user:{user_id}`       | Personal events (assignments, mentions) |

**Connection lifecycle:**

1. Client connects with JWT in query string.
2. Server validates JWT, registers connection, sends ACK.
3. Client sends subscribe/unsubscribe frames for topics.
4. Server pushes events as JSON frames.
5. Heartbeat: ping every 30s, timeout at 90s.
6. Auto-reconnect with exponential backoff (1s to 60s, max 10 attempts).

**Graceful degradation:** If WebSocket is unavailable, the client falls back to polling `GET /api/events?since=last_event_id` every 5 seconds.

---

## 8. Security Architecture

Airlock's security architecture rests on five pillars: cipher-first middleware, stateless rehydratable infrastructure, ontology-guided knowledge layer, deterministic LLM access, and crawl-first cost-minimal development.

### 8.1 Security Principles

1. **Ciphered at rest, encrypted in transit** -- No plaintext data on any storage medium.
2. **Middleware-only trust** -- The application layer is the sole trusted boundary. Storage backends (PostgreSQL, Redis, file system) are treated as untrusted.
3. **No autonomous AI actions** -- All AI operations are read-only or draft-only. Humans approve every change.
4. **Self-approval prevention is unforgeable** -- Hardcoded in the permission computation. No API path can bypass SoD.
5. **Append-only audit** -- Security-relevant events cannot be modified or deleted.
6. **Workspace isolation** -- `workspace_id` prevents data crossing tenant boundaries.
7. **Fail closed** -- When security controls fail, access is denied.

### 8.2 Tenant Isolation

Every table includes a `workspace_id` column. All API queries filter by the workspace from the authenticated user's JWT.

**Current state (MVP):** Application-layer enforcement via `WHERE workspace_id = :ws_id` on all queries.

**Planned (enterprise):** PostgreSQL Row-Level Security (RLS) policies that enforce isolation at the database level, preventing any query from accessing data outside its workspace context, even if the application layer has a bug.

### 8.3 JWT Validation Pipeline

```
Incoming Request
     |
     +-- Extract Bearer token from Authorization header
     |
     +-- Dev bypass? (development mode + token in _DEV_TOKENS whitelist)
     |     |-- Yes: return hardcoded dev context
     |     +-- No: continue
     |
     +-- verify_token(token)
     |     |-- Decode with HS256 + JWT_SECRET
     |     |-- Check expiration
     |     |-- Check type == "access"
     |     +-- Return payload or None
     |
     +-- payload is None?
     |     |-- Yes: HTTP 401 Unauthorized
     |     +-- No: return user context {sub, email, workspace_id, org_role}
```

### 8.4 CORS Configuration

CORS is configured in the FastAPI app factory (`apps/api/src/main.py`):

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,  # Default: ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 8.5 Frontend Route Protection

The Next.js edge middleware (`apps/web/src/middleware.ts`) runs on every request before the page renders:

```typescript
const PUBLIC_PATHS = [
  "/login",
  "/onboarding",
  "/api",
  "/_next",
  "/favicon.ico",
];

export function middleware(request: NextRequest) {
  // Allow public paths without auth
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check for auth cookie
  const token = request.cookies.get("airlock_access_token");
  if (!token) {
    // Redirect to login with return URL
    return NextResponse.redirect(
      new URL(`/login?redirect=${pathname}`, request.url),
    );
  }

  return NextResponse.next();
}
```

### 8.6 AI Safety Controls

The AI agent (Otto) operates under strict constraints:

| Control         | Implementation                                                |
| --------------- | ------------------------------------------------------------- |
| Tool call limit | Max 5 tool calls per message                                  |
| Tool safety     | All tools are read-only or draft-only (no autonomous actions) |
| Circuit breaker | 5 errors in 60 seconds triggers 300-second cooldown           |
| RBAC filtering  | Tool availability filtered by user's module role              |
| Model routing   | Claude Sonnet 4 > GPT-4o fallback > Ollama local              |
| PII redaction   | Planned: placeholder replacement before LLM API calls         |
| Cost tracking   | Per-session and per-message cost recorded                     |

### 8.7 Planned Security Enhancements (Enterprise Phase)

The full security documentation plan is in `docs/specs/security/overview.md`. Key enterprise-phase additions:

- Full cipher model: AES-256-GCM for sensitive columns, HKDF key derivation per workspace/vault
- KMS integration (AWS KMS / HashiCorp Vault)
- WebAuthn / Passkeys for passwordless authentication
- Decentralized Identifiers (DIDs) for document provenance
- STRIDE threat model per component
- SOC 2 Type II and ISO 27001 control mapping
- Ransomware rehydration playbook with quarterly drills

---

## 9. Component System

### 9.1 Atomic Design Hierarchy

Components follow an atomic-ish design system with six levels:

```
tokens/      Design primitives (CSS custom properties, Tailwind config)
     |
atoms/       Raw visual primitives (Button, Icon, Input, Badge, Spinner)
     |
molecules/   Small composites (FormRow, PillFilter, StatusChip, SearchBar,
     |        VaultItem, DealCard, TaskCard, WorkflowNode)
     |
organisms/   Business widgets (VaultRow, ChamberColumn, GateChecklist,
     |        ActivityFeed, PipelineBoard, TasksKanban, SignalPanel,
     |        ControlPanel, OrchestratePanel)
     |
templates/   Page layouts (TriptychLayout, ShellLayout, WorkflowBuilder)
     |
views/       Route containers (1:1 with spec Views)
```

**Component rules:**

- PascalCase file names (e.g., `VaultItem.tsx`)
- Kebab-case directories
- One default export per file
- `'use client'` directive required for any component using hooks, state, or browser APIs
- Never use raw color values -- always reference Tailwind tokens from `tokens.css`

### 9.2 Design Token System

All visual properties are defined as CSS custom properties in `apps/web/src/styles/tokens.css`. Components reference these tokens exclusively.

**Surface palette (OLED dark):**

| Token                     | Value     | Usage                       |
| ------------------------- | --------- | --------------------------- |
| `--surface-sunken`        | `#080A0F` | Page wells, inset badges    |
| `--surface-base`          | `#0B0E14` | App background              |
| `--surface-raised`        | `#0F1219` | Primary panels              |
| `--surface-overlay`       | `#151923` | Nested cards, tool surfaces |
| `--surface-border`        | `#1E2330` | Standard separation         |
| `--surface-border-strong` | `#2B3345` | Hover and emphasis edges    |

**Chamber color system:**

| Chamber  | Color  | Token                | Hex       |
| -------- | ------ | -------------------- | --------- |
| Discover | Red    | `--chamber-discover` | `#EF4444` |
| Build    | Yellow | `--chamber-build`    | `#EAB308` |
| Review   | Purple | `--chamber-review`   | `#A855F7` |
| Ship     | Green  | `--chamber-ship`     | `#22C55E` |

Each chamber color has a muted variant for backgrounds (e.g., `--chamber-discover-muted: #991B1B`).

**Panel identity tokens:**

| Zone    | Token             | Value                     | Purpose                   |
| ------- | ----------------- | ------------------------- | ------------------------- |
| Signal  | `--panel-signal`  | `#00D1FF` (cyan)          | Left rail, alert surfaces |
| Main    | `--panel-main-bg` | `rgba(255,255,255,0.025)` | Neutral center lift       |
| Control | `--panel-control` | `#7C8CFF` (indigo)        | Right rail, approvals     |

Each panel has a tinted background variant for ambient washes.

### 9.3 Triptych Layout

The Triptych is the primary layout pattern for vault detail views. Three panels with distinct identities:

```
+------------------+---------------------------+-------------------+
|                  |                           |                   |
|  SIGNAL          |  ORCHESTRATE              |  CONTROL          |
|  (Cyan accent)   |  (Neutral)                |  (Indigo accent)  |
|                  |                           |                   |
|  - Event feed    |  - Main work surface      |  - Health card    |
|  - Alerts        |  - Record inspector       |  - SLA timers     |
|  - AI events     |  - Document viewer        |  - Approval chain |
|  - Signals       |  - Data grids             |  - Audit trail    |
|                  |                           |  - AI context tab |
|  280px default   |  Flexible (min 400px)     |  300px default    |
|  Collapsible     |  Always visible           |  Collapsible      |
+------------------+---------------------------+-------------------+
```

Layout tokens from `tokens.css`:

```css
--triptych-signal-width: 280px;
--triptych-control-width: 300px;
--triptych-signal-min: 200px;
--triptych-control-min: 200px;
--triptych-orchestrate-min: 400px;
--triptych-collapsed-width: 80px;
```

### 9.4 Shell Layout

The shell provides the outer frame for the entire application:

```
+------+----------+-----------------------------------------------+
|      |          |                                               |
|  M   |  Sub     |                                               |
|  o   |  Panel   |           CONTENT AREA                        |
|  d   |          |           (Triptych or single-panel view)     |
|  u   |  Chamber |                                               |
|  l   |  nav     |                                               |
|  e   |  +       |                                               |
|      |  Active  |                                               |
|  B   |  Vaults  |                                               |
|  a   |          |                                               |
|  r   |          |                                               |
|      |          |                                               |
| 72px |  240px   |           Remaining width                     |
+------+----------+-----------------------------------------------+
```

### 9.5 Routing

URL pattern: `/(shell)/(modules)/<module>/<view-or-vaultId>`

| Route Pattern             | Component                            |
| ------------------------- | ------------------------------------ |
| `/contracts/triage`       | Triage board view                    |
| `/contracts/[vaultId]`    | Vault triptych detail                |
| `/contracts/generator`    | Contract generator                   |
| `/contracts/review-queue` | Gatekeeper review queue              |
| `/crm/[...slug]`          | react-admin catch-all (SSR disabled) |
| `/tasks/board`            | Kanban board                         |
| `/tasks/inbox`            | Task inbox                           |
| `/calendar/month`         | Monthly calendar view                |
| `/documents/library`      | Document library                     |

---

## 10. Infrastructure & DevOps

### 10.1 Docker Compose Services

The local development environment runs via Docker Compose:

```
+-------------------+     +-------------------+     +-----------------+
|  PostgreSQL 16    |     |  Redis 7          |     |  FastAPI        |
|  Port: 5432       |     |  Port: 6379       |     |  Port: 8000     |
|  ULID PKs         |     |  BullMQ queues    |     |  uvicorn        |
|  JSONB metadata   |     |  WebSocket PubSub |     |  --reload       |
|  RLS (planned)    |     |  Session cache    |     |                 |
+-------------------+     +-------------------+     +-----------------+
         |                         |                        |
         |          +-------------------+                   |
         +----------+  Next.js 14       +-------------------+
                    |  Port: 3000       |
                    |  App Router       |
                    |  Hot reload       |
                    +-------------------+
```

**Commands:**

```bash
docker compose up                          # All services
docker compose up -d postgres redis        # Infrastructure only
cd apps/api && uvicorn src.main:app --reload  # API server (standalone)
pnpm dev                                   # Next.js dev server
```

### 10.2 Database Migrations (Alembic)

Schema changes are managed through Alembic migrations in `apps/api/src/migrations/`. Each migration has both `upgrade()` and `downgrade()` functions for reversibility.

Migration file naming: `001_core_tables.py`, `002_add_events.py`, `003_add_roles.py`, `004_add_documents.py`, `005_add_patches.py`.

```bash
# Create a new migration
cd apps/api
alembic revision --autogenerate -m "add <table>"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1
```

### 10.3 Build & Verification

```bash
pnpm build        # Build all packages (Turborepo)
pnpm lint         # Lint all packages (ESLint)
pnpm type-check   # TypeScript type checking (NOT npx tsc)
```

Python backend:

```bash
cd apps/api
source .venv/bin/activate
pytest                  # Run test suite
ruff check src/         # Linting
ruff format src/        # Formatting
```

### 10.4 pnpm Workspaces

The monorepo is organized into pnpm workspaces:

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

Cross-package dependencies use workspace protocol (`workspace:*`), ensuring consistent versions across the monorepo. Turborepo orchestrates builds with task dependencies (e.g., `shared-types` must build before `web`).

### 10.5 Environment Configuration

All secrets and configuration are managed through environment variables, loaded via Pydantic BaseSettings on the backend and `NEXT_PUBLIC_*` prefixed variables on the frontend.

| Variable               | Default                                               | Description                  |
| ---------------------- | ----------------------------------------------------- | ---------------------------- |
| `DATABASE_URL`         | `postgresql://airlock:airlock@localhost:5432/airlock` | PostgreSQL connection string |
| `REDIS_URL`            | `redis://localhost:6379/0`                            | Redis connection string      |
| `JWT_SECRET`           | `change-me-in-production`                             | JWT signing key (HS256)      |
| `GOOGLE_CLIENT_ID`     | (empty)                                               | Google OAuth client ID       |
| `GOOGLE_CLIENT_SECRET` | (empty)                                               | Google OAuth client secret   |
| `CORS_ORIGINS`         | `["http://localhost:3000"]`                           | Allowed CORS origins         |
| `LITELLM_API_BASE`     | `http://localhost:4000`                               | LiteLLM proxy URL            |
| `ENVIRONMENT`          | `development`                                         | Runtime environment          |
| `NEXT_PUBLIC_API_URL`  | `http://localhost:8000`                               | API base URL (frontend)      |

### 10.6 Engine Port Strategy

Airlock ports three production-grade engines from the OrcestrateOS codebase (`/Users/zacharyholwerda/Desktop/OrcestrateOS-sync/`):

| Engine     | Source                       | LOC   | Target                             |
| ---------- | ---------------------------- | ----- | ---------------------------------- |
| Extraction | `server/extraction/`         | 1,715 | `apps/api/src/engines/extraction/` |
| Preflight  | `server/preflight_engine.py` | 3,908 | `apps/api/src/engines/preflight/`  |
| Generation | `server/generation/`         | 3,024 | `apps/api/src/engines/generation/` |

Porting guidelines: refactor synchronous code to async, add type hints, split monolithic files into modules, replace raw SQL with SQLAlchemy, replace print debugging with structured logging.

### 10.7 Search Infrastructure (Planned)

The search architecture has two tiers:

**Tier 1 (Current):** PostgreSQL full-text search with `tsvector` + `pg_trgm` extension for fuzzy matching. Client-side Fuse.js index for workspaces with fewer than 500 vaults.

**Tier 2 (Planned):** MeiliSearch (MIT, Rust, ~128MB RAM) as a dedicated search index synchronized from PostgreSQL via BullMQ indexing jobs triggered by `pg_notify`. Federated multi-index search across vaults, tasks, contacts, documents, communications, and members -- with module badges on every result.

### 10.8 Batch Processing Pipeline

Bulk contract ingestion flows through an async pipeline with semaphore-controlled concurrency:

```
Upload (N PDFs)
    |
    +-- Create batch vault
    |
    +-- For each PDF (semaphore = 5 concurrent):
    |     |
    |     +-- Download --> Store --> Dedup --> Extract --> Preflight --> Auto-Pass
    |     |
    |     +-- Entity resolution --> Link to vault hierarchy
    |
    +-- Cross-module event emission (CRM, Tasks, Calendar, Notifications)
```

**Concurrency:** `asyncio.Semaphore(5)` by default, configurable via the Feature Control Plane. Circuit breaker trips if error rate exceeds 50%.

---

## Appendix A: Key Architecture Decisions

These decisions are locked and cannot be reopened without explicit approval:

1. **Vault hierarchy IS the CRM.** No separate CRM tables. The vault tree (Parent > Division > Counterparty > Item) stores all relationship data.
2. **Modules are lenses, not silos.** Every module sees the same vault tree, filtered by vault type.
3. **App Router only.** No Pages Router, no `getServerSideProps`.
4. **Business logic in services.** Never in route handlers.
5. **Append-only events.** The events table never has UPDATE or DELETE.
6. **Chamber progression is linear.** Discover > Build > Review > Ship. No skipping, no backward movement without admin override.
7. **Self-approval prevention is hardcoded.** Not a permission -- an invariant.
8. **Mock data first.** All frontend work uses mock data; real APIs come last.
9. **One workflow engine.** All automations use the same visual builder (React Flow + BullMQ).
10. **Calendar is computed.** No stored calendar events. Renders dates from vault extraction + task due dates.

## Appendix B: Glossary of Technical Terms

| Term                      | Definition                                                                                                        |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Vault**                 | The fundamental unit of work. Contains source material, metadata, audit trail, and collaboration context.         |
| **Chamber**               | One of four lifecycle stages: Discover, Build, Review, Ship.                                                      |
| **Gate**                  | A quality checkpoint within a chamber. Evaluated by preflight engines.                                            |
| **Triptych**              | Three-panel layout: Signal (events), Orchestrate (work surface), Control (metadata/approvals).                    |
| **Module**                | A top-level domain: Contracts, CRM, Tasks, Calendar, Documents.                                                   |
| **View**                  | A specific screen within a chamber (e.g., Triage Board, Review Queue).                                            |
| **Overlay**               | The Admin panel. Not a module -- a system-level settings surface.                                                 |
| **ULID**                  | Universally Unique Lexicographically Sortable Identifier. Used as primary keys.                                   |
| **RLS**                   | Row-Level Security. PostgreSQL feature for enforcing tenant isolation at the database level.                      |
| **SoD**                   | Separation of Duties. The principle that the person proposing a change cannot approve it.                         |
| **OGC**                   | Ontology-Guided Corpus. The knowledge layer where documents are decomposed into verified, identity-stable chunks. |
| **BullMQ**                | Redis-backed job queue library used for the cross-module event bus.                                               |
| **Feature Control Plane** | Per-feature toggle, calibration, audit, and circuit breaker system.                                               |
