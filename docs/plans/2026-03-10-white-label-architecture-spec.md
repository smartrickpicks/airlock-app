# White Label Architecture Spec v2

> **Date:** 2026-03-10
> **Goal:** Deploy Airlock as a configurable white-label platform. Gateway at doyoulikedags.xyz, first production instance at brainbrigade.xyz.
> **Mode:** Closed beta — billing feature-flagged, manual onboarding for early users.

---

## Design Decisions (from spec review)

| Decision                                               | Rationale                                                                                                    |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| **No forks** — single codebase, multi-domain routing   | Forks create N repos to maintain. Same code, different config.                                               |
| **No `next-auth`** — extend existing FastAPI auth      | airlock-app already has Google OAuth + JWT. One auth system.                                                 |
| **Shared DB + RLS only** for v1                        | `workspace_id` filtering already exists on every table. Ship what's built.                                   |
| **Gateway is thin** — billing + deploy + domain config | Instance onboarding (modules, team, identity) happens inside airlock-app's existing `/onboarding` flow.      |
| **Google tokens in DB, not env vars**                  | Refresh tokens are sensitive. AES-256 encryption at rest.                                                    |
| **Demo instance instead of per-user sandboxes**        | One shared read-only deployment at demo.doyoulikedags.xyz. Zero per-user compute cost.                       |
| **Billing feature-flagged**                            | Stripe integration scaffolded but gated behind `FEATURE_BILLING=false`. Manual invoicing during closed beta. |

---

## System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                      doyoulikedags.xyz                                │
│                    "Airlock Gateway"                                  │
│                    (thin control plane)                               │
│                                                                      │
│  ┌──────────┐  ┌───────────────┐  ┌─────────────────────────────┐   │
│  │ Google   │  │ Workspace     │  │ Domain + Deploy              │   │
│  │ OAuth    │→ │ Provisioning  │→ │ (Vercel API + DNS)           │   │
│  │ (identity│  │ (create       │  │                               │   │
│  │  only)   │  │  workspace_id)│  │                               │   │
│  └──────────┘  └───────────────┘  └─────────────────────────────┘   │
└────────────────────────┬─────────────────────────────────────────────┘
                         │ provisions workspace_id
                         │ adds domain alias to Vercel
                         ▼
┌──────────────────────────────────────────────────────────────────────┐
│          Single Vercel Project — Multi-Domain Routing                 │
│          (one codebase, one deployment, N domains)                   │
│                                                                      │
│  Request: brainbrigade.xyz                                           │
│    → middleware reads Host header                                    │
│    → looks up workspace config by domain                            │
│    → sets workspace context (theme, modules, AI config)             │
│    → renders Airlock with that workspace's data (RLS)               │
│                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────────┐  │
│  │ brainbrigade.xyz │  │ client-a.xyz    │  │ demo.doyoulikedags │  │
│  │ workspace: 01ABC │  │ workspace: 01DEF│  │ .xyz (read-only)   │  │
│  │ AI: anthropic    │  │ AI: openai BYOK │  │ AI: mock           │  │
│  │ modules: all     │  │ modules: crm,tri│  │ modules: all       │  │
│  └────────┬─────────┘  └────────┬────────┘  └─────────┬─────────┘  │
│           │                     │                      │            │
│           └─────────────────────┼──────────────────────┘            │
│                                 │                                    │
│                          ┌──────▼──────┐                            │
│                          │ PostgreSQL  │                            │
│                          │ (RLS by     │                            │
│                          │ workspace_id│                            │
│                          └─────────────┘                            │
└──────────────────────────────────────────────────────────────────────┘
```

**Key change from v1:** No per-customer Vercel projects or forks. One deployment serves all domains via hostname-based routing.

---

## Phase 1: Multi-Domain Routing in airlock-app

### Middleware: Host → Workspace Resolution

Add hostname-based workspace resolution to the existing Next.js middleware.

```typescript
// apps/web/src/middleware.ts (extend existing)

const DOMAIN_WORKSPACE_MAP = {
  // Static mappings for known domains
  // Falls back to DB lookup via API for unknown domains
};

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") ?? "";

  // Strip port for local dev
  const domain = hostname.replace(/:\d+$/, "");

  // Skip gateway domain — it has its own routing
  if (domain === "doyoulikedags.xyz") return NextResponse.next();

  // Demo instance — read-only mode
  if (domain === "demo.doyoulikedags.xyz") {
    const response = NextResponse.next();
    response.headers.set("x-workspace-mode", "demo");
    response.headers.set("x-workspace-id", "DEMO_WORKSPACE_ID");
    return response;
  }

  // Resolve domain → workspace_id
  // 1. Check static map (fast path for known domains)
  // 2. Fall back to API: GET /api/v1/workspaces/resolve?domain=<domain>
  // 3. Cache result in edge config or Redis

  // Inject workspace context into request headers
  const response = NextResponse.next();
  response.headers.set("x-workspace-id", workspaceId);
  return response;
}
```

### Backend: Workspace Config Table

New table (or extend existing `workspace` table):

```python
# apps/api/src/models/workspace.py (extend)

class WorkspaceConfig(Base):
    __tablename__ = "workspace_config"

    id: Mapped[str]             # ULID
    workspace_id: Mapped[str]   # FK → workspace.id

    # Domain
    custom_domain: Mapped[str | None]       # e.g., "brainbrigade.xyz"
    vercel_domain: Mapped[str | None]       # e.g., "brainbrigade.vercel.app"
    domain_verified: Mapped[bool] = False

    # Branding
    logo_url: Mapped[str | None]
    accent_color: Mapped[str] = "#00d1ff"   # default Airlock cyan

    # Modules
    enabled_modules: Mapped[list[str]]      # JSONB: ["contracts","crm","triage","calendar","documents"]

    # AI
    ai_provider: Mapped[str | None]         # "anthropic" | "openai" | "google" | None
    ai_api_key_encrypted: Mapped[str | None]  # AES-256 encrypted
    ai_tier: Mapped[str] = "none"           # "none" | "byok" | "managed"

    # Google Workspace
    google_refresh_token_encrypted: Mapped[str | None]  # AES-256 encrypted
    google_scopes_granted: Mapped[list[str] | None]     # JSONB: ["calendar","drive"]

    # Billing (feature-flagged)
    billing_tier: Mapped[str] = "beta"      # "beta" | "starter" | "team" | "enterprise"
    stripe_customer_id: Mapped[str | None]  # NULL during beta
    stripe_subscription_id: Mapped[str | None]

    # Limits (enforced only when FEATURE_BILLING=true)
    max_users: Mapped[int] = 999            # Unlimited during beta
    max_vaults: Mapped[int] = 999
```

### Token Encryption

```python
# apps/api/src/lib/crypto.py

from cryptography.fernet import Fernet
import os

# Key from env var — NOT hardcoded
# Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
ENCRYPTION_KEY = os.environ["TOKEN_ENCRYPTION_KEY"]
_fernet = Fernet(ENCRYPTION_KEY.encode())

def encrypt_token(plaintext: str) -> str:
    return _fernet.encrypt(plaintext.encode()).decode()

def decrypt_token(ciphertext: str) -> str:
    return _fernet.decrypt(ciphertext.encode()).decode()
```

**Usage:**

- Google refresh tokens → `encrypt_token(token)` before DB write
- AI API keys (BYOK) → `encrypt_token(key)` before DB write
- Decrypt only at point of use (API call to Google/OpenAI), never log

---

## Phase 2: doyoulikedags.xyz — The Gateway

### Purpose

Thin control plane for:

1. **Provisioning** new workspaces (create workspace_id + config)
2. **Domain management** (add/verify custom domains via Vercel API)
3. **Google OAuth** for workspace scopes (Drive, Calendar, etc.)
4. **Instance dashboard** (view/manage your workspaces)
5. **Billing** (feature-flagged, Stripe — dormant during beta)

The gateway does NOT handle in-app onboarding — that happens inside the Airlock instance via the existing `/onboarding` flow.

### Auth: Reuse FastAPI Backend

The gateway calls the same FastAPI API (deployed alongside airlock-app or as a separate service).

```
Gateway (doyoulikedags.xyz)
  → calls /api/v1/auth/google/verify  (existing endpoint)
  → receives JWT
  → calls /api/v1/gateway/workspaces  (new gateway-specific routes)
```

**No `next-auth`.** Same JWT flow as the main app.

### New API Routes: Gateway Namespace

```python
# apps/api/src/routes/gateway.py

router = APIRouter(prefix="/api/v1/gateway", tags=["gateway"])

@router.post("/workspaces")
async def provision_workspace(payload: ProvisionRequest):
    """Create workspace + workspace_config. Called by gateway wizard."""
    # 1. Create workspace row
    # 2. Create workspace_config row (domain, modules, AI tier)
    # 3. If custom domain: call Vercel API to add domain alias
    # 4. Return workspace_id + deploy URL

@router.get("/workspaces")
async def list_my_workspaces(user: CurrentUser):
    """List all workspaces owned by this user."""

@router.post("/workspaces/{id}/domain/verify")
async def verify_domain(id: str):
    """Check DNS propagation for custom domain."""
    # Call Vercel API to check domain status

@router.post("/workspaces/{id}/google/connect")
async def connect_google_workspace(id: str, payload: GoogleTokenPayload):
    """Store encrypted Google refresh token + scopes for a workspace."""
    # Encrypt token, store in workspace_config

@router.get("/workspaces/{id}/google/status")
async def google_connection_status(id: str):
    """Return which Google scopes are active."""

# --- Billing (feature-flagged) ---

@router.post("/workspaces/{id}/billing/subscribe")
async def create_subscription(id: str, payload: SubscribeRequest):
    """Create Stripe subscription. NOOP when FEATURE_BILLING=false."""
    if not settings.FEATURE_BILLING:
        return {"status": "beta", "message": "Billing disabled during beta"}
    # Stripe checkout session creation

@router.post("/workspaces/{id}/billing/webhook")
async def stripe_webhook(request: Request):
    """Stripe webhook handler. NOOP when FEATURE_BILLING=false."""
    if not settings.FEATURE_BILLING:
        return {"status": "ignored"}
    # Handle subscription events
```

### Gateway Wizard (Simplified)

The gateway wizard is now 3 steps instead of 6, because module/team setup happens inside Airlock after deploy:

**Step 1: Identity + Auth**

- Google OAuth (identity scope only — `openid profile email`)
- Workspace name
- Custom domain (optional)

**Step 2: Google Workspace Scopes (Optional)**

- Second OAuth consent for workspace scopes (Drive, Calendar, etc.)
- These are **sensitive scopes** — requires Google Cloud verification
- Skip-able: "Connect later from inside Airlock"
- Store encrypted refresh token in `workspace_config`

**Step 3: AI Configuration**

- Tier: Demo (mock) / BYOK / Managed
- If BYOK: paste API key (encrypted at rest)
- Provider picker: Anthropic, OpenAI, Google AI

**Deploy** (automatic after Step 3):

- Create workspace_id + workspace_config in DB
- If custom domain: Vercel API → add domain alias to existing project
- Redirect user to `<their-domain>/onboarding` (existing airlock-app flow handles the rest)

```
doyoulikedags.xyz/
├── app/
│   ├── page.tsx                # Landing / marketing
│   ├── setup/
│   │   ├── page.tsx            # Step 1: Identity + Auth
│   │   ├── google/page.tsx     # Step 2: Google Workspace scopes
│   │   └── ai/page.tsx         # Step 3: AI config + deploy
│   ├── dashboard/
│   │   └── page.tsx            # Manage workspaces
│   └── demo/
│       └── page.tsx            # Redirect to demo.doyoulikedags.xyz
├── lib/
│   ├── api.ts                  # Calls FastAPI /api/v1/gateway/*
│   ├── vercel.ts               # Vercel API helpers (domain mgmt)
│   └── google-scopes.ts        # OAuth scope request helpers
└── stores/
    └── setup.store.ts          # Wizard state (Zustand)
```

### Vercel Domain Management

Instead of deploying separate Vercel projects, add domain aliases to the single project:

```typescript
// lib/vercel.ts

const VERCEL_TOKEN = process.env.VERCEL_API_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;

export async function addDomainAlias(domain: string) {
  // POST https://api.vercel.com/v10/projects/{projectId}/domains
  const res = await fetch(
    `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: domain }),
    },
  );
  return res.json();
  // Returns: { name, verified, verification: [{ type, domain, value }] }
}

export async function checkDomainStatus(domain: string) {
  // GET https://api.vercel.com/v9/projects/{projectId}/domains/{domain}
  const res = await fetch(
    `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}`,
    { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } },
  );
  return res.json();
  // Returns: { verified: boolean, verification: [...] }
}

export async function removeDomainAlias(domain: string) {
  // DELETE https://api.vercel.com/v9/projects/{projectId}/domains/{domain}
}
```

**Customer DNS setup:**

```
CNAME  @  cname.vercel-dns.com    (or A record to 76.76.21.21)
```

Vercel auto-provisions SSL once DNS propagates.

---

## Phase 3: brainbrigade.xyz — First Production Instance

### What It Is

- First real white-label deployment — our own dogfood
- Custom domain alias on the single Vercel project
- Full module suite, real Google Workspace, real Anthropic API key
- `workspace_config` row with `billing_tier: "beta"`

### Setup Sequence

```
1. Create workspace in DB:
   - name: "Brain Brigade"
   - slug: brainbrigade
   - workspace_id: <ULID>

2. Create workspace_config:
   - custom_domain: "brainbrigade.xyz"
   - enabled_modules: ["contracts","crm","triage","calendar","documents"]
   - ai_provider: "anthropic"
   - ai_api_key_encrypted: encrypt(ANTHROPIC_API_KEY)
   - ai_tier: "managed"
   - billing_tier: "beta"
   - accent_color: "#00d1ff"  (or Brain Brigade brand color)

3. DNS: Point brainbrigade.xyz → Vercel (CNAME)

4. Vercel: Add brainbrigade.xyz as domain alias

5. Google OAuth:
   - Configure redirect URI: https://brainbrigade.xyz/api/v1/auth/google/callback
   - Connect Google Workspace (Drive, Calendar, Docs)
   - Store encrypted refresh token in workspace_config

6. Seed data:
   - Run liftoff-seed.py for Brain Brigade workspace
   - Create Zachary's user with Owner role

7. Verify:
   - Hit https://brainbrigade.xyz → resolves workspace via Host header
   - Login works → JWT scoped to Brain Brigade workspace
   - All modules render with real data
   - Otto responds via Anthropic API
   - Google Calendar syncs
```

### Environment Variables (Single Deployment)

```env
# Shared across all instances (set once on Vercel project)
DATABASE_URL=postgresql://...@...:5432/airlock
REDIS_URL=redis://...
JWT_SECRET=<generated>
TOKEN_ENCRYPTION_KEY=<fernet-key>

# Google OAuth (app-level, not per-workspace)
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<secret>

# Vercel API (for gateway domain management)
VERCEL_API_TOKEN=<token>
VERCEL_PROJECT_ID=<project-id>

# Feature flags
FEATURE_BILLING=false          # Stripe disabled during beta
FEATURE_OTTO_AI=true
FEATURE_FORGE=true
FEATURE_PLAYBOOKS=true
FEATURE_REALTIME=true
FEATURE_GOOGLE_DRIVE_SYNC=false  # Not built yet — Calendar only for now
FEATURE_GOOGLE_GMAIL_SYNC=false  # Not built yet

# Per-workspace AI keys are stored encrypted in workspace_config table
# No per-workspace env vars needed — everything is in the DB
```

---

## Feature Flag Registry

All feature flags, their current state, and when they activate:

| Flag                           | Default | Activates When               | Controls                                                         |
| ------------------------------ | ------- | ---------------------------- | ---------------------------------------------------------------- |
| `FEATURE_BILLING`              | `false` | Post-beta launch             | Stripe subscription flows, tier enforcement, usage limits        |
| `FEATURE_OTTO_AI`              | `true`  | Now                          | Otto agent (falls back to mock if no AI key in workspace_config) |
| `FEATURE_FORGE`                | `true`  | Now                          | Workspace Forge / Dispatch homepage                              |
| `FEATURE_PLAYBOOKS`            | `true`  | Now                          | DAG playbook execution                                           |
| `FEATURE_REALTIME`             | `true`  | Now                          | WebSocket event bus                                              |
| `FEATURE_GOOGLE_DRIVE_SYNC`    | `false` | When Drive integration built | Google Drive → Documents module sync                             |
| `FEATURE_GOOGLE_GMAIL_SYNC`    | `false` | When Gmail integration built | Gmail → Signal panel ingestion                                   |
| `FEATURE_GOOGLE_CALENDAR_SYNC` | `true`  | Now                          | Google Calendar → Calendar module (already built)                |
| `FEATURE_CUSTOM_DOMAINS`       | `true`  | Now                          | Custom domain support via Vercel API                             |
| `FEATURE_DEMO_MODE`            | `true`  | Now                          | Read-only demo at demo.doyoulikedags.xyz                         |

### Billing Feature Flag Behavior

When `FEATURE_BILLING=false`:

- All workspaces treated as `billing_tier: "beta"` regardless of DB value
- No user limits enforced (`max_users` ignored)
- No vault limits enforced
- Stripe webhook endpoint returns 200 but does nothing
- Subscribe endpoint returns `{ status: "beta" }`
- No upgrade/downgrade UI shown
- No Stripe.js loaded on frontend

When `FEATURE_BILLING=true`:

- Tier limits enforced from `workspace_config`
- Stripe checkout flows activate
- Billing dashboard appears in gateway
- Usage metering begins
- Dunning emails for failed payments

---

## Google OAuth Scope Strategy

### Two-Stage OAuth

**Stage 1: Identity (required, non-sensitive)**

```
scopes: openid profile email
```

- Used at login on both gateway and Airlock instances
- No Google verification required
- Returns: id_token, basic profile

**Stage 2: Workspace Services (optional, sensitive)**

```
scopes:
  - https://www.googleapis.com/auth/calendar.readonly
  - https://www.googleapis.com/auth/drive.readonly      # (feature-flagged)
  - https://www.googleapis.com/auth/gmail.readonly       # (feature-flagged)
```

- Triggered from gateway wizard Step 2 OR from inside Airlock settings
- **Requires Google Cloud OAuth verification** (submit app for review)
- Returns: refresh_token (stored encrypted in workspace_config)
- User can connect/disconnect individual scopes

### Google Cloud Console Setup

```
Project: Airlock Platform
OAuth Consent Screen:
  - App name: Airlock
  - Authorized domains: doyoulikedags.xyz, brainbrigade.xyz, *.vercel.app
  - Scopes: openid, profile, email, calendar.readonly
  - Verification status: MUST SUBMIT for calendar.readonly (sensitive scope)

OAuth Client:
  - Type: Web application
  - Authorized redirect URIs:
    - https://doyoulikedags.xyz/api/v1/auth/google/callback
    - https://brainbrigade.xyz/api/v1/auth/google/callback
    - https://*.vercel.app/api/v1/auth/google/callback  (wildcard for dev)
    - http://localhost:3000/api/v1/auth/google/callback   (local dev)
```

**Note:** Each new custom domain needs its redirect URI added to the Google OAuth client. This can be automated via the Google Cloud API but has a limit of ~100 URIs per client. At scale, use a single redirect URI on the gateway domain and relay.

---

## Multi-Tenant Data Flow

### Request Lifecycle

```
1. Browser hits brainbrigade.xyz
2. Vercel routes to the single airlock-app deployment
3. Next.js middleware reads Host header: "brainbrigade.xyz"
4. Middleware calls GET /api/v1/workspaces/resolve?domain=brainbrigade.xyz
   (cached in Redis for 5min)
5. Returns workspace_id + workspace_config (theme, modules, AI tier)
6. Middleware injects x-workspace-id header
7. User logs in → JWT includes workspace_id claim
8. All subsequent API calls filtered by workspace_id (existing RLS)
9. Otto AI reads ai_provider + decrypted ai_api_key from workspace_config
10. Google Calendar sync reads decrypted google_refresh_token from workspace_config
```

### Workspace Resolution Cache

```python
# apps/api/src/services/workspace_resolver.py

from functools import lru_cache
import redis

CACHE_TTL = 300  # 5 minutes

async def resolve_domain(domain: str) -> WorkspaceConfig | None:
    """Resolve a custom domain to a workspace config. Cached in Redis."""
    cached = await redis.get(f"domain:{domain}")
    if cached:
        return WorkspaceConfig.model_validate_json(cached)

    config = await db.execute(
        select(WorkspaceConfig).where(
            WorkspaceConfig.custom_domain == domain,
            WorkspaceConfig.domain_verified == True,
        )
    )
    result = config.scalar_one_or_none()
    if result:
        await redis.setex(f"domain:{domain}", CACHE_TTL, result.model_dump_json())
    return result
```

---

## Demo Instance

### demo.doyoulikedags.xyz

A single read-only workspace for prospects to explore:

- Pre-seeded with realistic data (contracts, CRM deals, triage items)
- All modules enabled
- Otto responds with pre-built mock responses (no real LLM)
- Login disabled — auto-authenticated as "Demo User"
- All write operations return 403 with "Upgrade to edit" message
- Refreshed/reseeded nightly via cron

**Implementation:** Just another workspace_config row with `ai_tier: "none"` and a middleware check for demo mode that blocks mutations.

---

## Revenue Model (Feature-Flagged)

| Tier           | Price   | What They Get                                             | Enforced When                     |
| -------------- | ------- | --------------------------------------------------------- | --------------------------------- |
| **Beta**       | Free    | Everything, no limits                                     | `FEATURE_BILLING=false` (current) |
| **Starter**    | $49/mo  | BYOK AI, Google sync, custom domain, 5 users              | `FEATURE_BILLING=true`            |
| **Team**       | $199/mo | Managed AI (included credits), 25 users, priority support | `FEATURE_BILLING=true`            |
| **Enterprise** | Custom  | Dedicated infra, SSO, audit logs, unlimited users         | `FEATURE_BILLING=true`            |

During beta: everyone gets Team-tier features for free. Stripe scaffolding exists but is dormant.

---

## Implementation Priority

### Sprint 1: Multi-Domain Foundation

1. Extend `workspace` model with `WorkspaceConfig` table
2. Add `crypto.py` (Fernet encryption for tokens/keys)
3. Add `workspace_resolver.py` (domain → workspace_id, Redis cached)
4. Extend Next.js middleware for Host-based workspace resolution
5. Add `/api/v1/workspaces/resolve` endpoint
6. Add domain to Vercel project: brainbrigade.xyz

### Sprint 2: Gateway App

7. Scaffold doyoulikedags.xyz (minimal Next.js — calls same FastAPI)
8. Gateway wizard (3 steps: identity, Google scopes, AI config)
9. `/api/v1/gateway/*` routes (provision, domain verify, Google connect)
10. Vercel domain management integration (`addDomainAlias`, `checkDomainStatus`)

### Sprint 3: brainbrigade.xyz Production

11. DNS setup + Vercel domain alias
12. Production database (Neon or Supabase)
13. Run Alembic migrations
14. Seed Brain Brigade workspace + config
15. Connect Google Workspace (Calendar first)
16. Set Anthropic API key (encrypted in workspace_config)
17. Verify end-to-end: domain → workspace → login → modules → Otto

### Sprint 4: Demo + Dashboard

18. Seed demo workspace at demo.doyoulikedags.xyz
19. Read-only middleware for demo mode
20. Gateway dashboard (list/manage workspaces)
21. Domain verification UI flow

### Sprint 5: Billing (When Ready to Charge)

22. Flip `FEATURE_BILLING=true`
23. Stripe integration (checkout, webhooks, portal)
24. Tier enforcement (user limits, vault limits)
25. Upgrade/downgrade flows
26. Usage metering

### Sprint 6+: Google Workspace Deep Sync

27. Google Drive → Documents module (one-way sync)
28. Google Docs/Sheets/Slides preview
29. Gmail → Signal panel ingestion
30. Webhook-based sync (instead of polling)
31. Scope revocation handling

---

## DNS Configuration

### doyoulikedags.xyz (gateway)

```
A     @     76.76.21.21          (Vercel)
CNAME www   cname.vercel-dns.com
```

### brainbrigade.xyz (first instance)

```
A     @     76.76.21.21          (Vercel — same project!)
CNAME www   cname.vercel-dns.com
```

### demo.doyoulikedags.xyz

```
CNAME demo  cname.vercel-dns.com
```

(Subdomain of gateway — no separate DNS needed if gateway is on Vercel)

### Future client domains

Each custom domain:

```
CNAME <domain>  cname.vercel-dns.com
```

Added programmatically via Vercel API from gateway. SSL auto-provisioned.

---

## Open Questions

| #   | Question                                                                                                         | Impact                                            | Owner       |
| --- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ----------- |
| 1   | Google OAuth verification for `calendar.readonly` — has this been submitted? Takes 2-6 weeks.                    | Blocks Google Calendar sync on production domains | Zachary     |
| 2   | Google OAuth redirect URI limit (~100 per client). At what scale do we need a relay pattern?                     | Blocks >100 custom domains                        | Engineering |
| 3   | Neon vs Supabase for production PostgreSQL? Both support RLS. Neon has branching, Supabase has dashboard.        | Sprint 3 decision                                 | Zachary     |
| 4   | Should the gateway be a separate Vercel project or a route group within airlock-app?                             | Sprint 2 architecture                             | Engineering |
| 5   | Demo workspace: nightly reseed via cron, or snapshot restore?                                                    | Sprint 4                                          | Engineering |
| 6   | BYOK key validation — should we test the user's API key before storing it? (Call the provider's models endpoint) | Sprint 2 UX                                       | Engineering |
