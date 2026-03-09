# Liftoff Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Take Airlock from 24 milestones of mock-data scaffolding to a fully operational product (codename: Liftoff) that Zachary uses daily as a solo founder.

**Architecture:** Three parallel agent tracks converge on a single validation checklist. Track A (VS Code Agent) replaces mock with real on the backend critical path. Track B (CLI Agent) seeds the database with Zachary's real-life data. Track C (Web App Agent) writes playbooks and content. The Orchestrator (Desktop Agent) reviews and gates each step.

**Tech Stack:** Next.js 14 (App Router), FastAPI, PostgreSQL 16, Redis 7, SQLAlchemy 2, Alembic, Google OAuth, JWT, PydanticAI + LiteLLM, Zustand, Tailwind CSS

---

## Dependency Graph

```
Track A (sequential):  A1 → A2 → A3 → A4 → A5 → A6 → A7 → A8
Track B (after A3):                 A3 → B1 → B2 → B3 → B4 → B5
Track C (immediate):   C1 ∥ C2 ∥ C3 (no code dependencies)
```

Track C can start immediately (docs/playbooks only).
Track B starts after A3 (needs real database + auth + workspace creation).
Track A is strictly sequential — each step depends on the prior.

---

## Track A: VS Code Agent — Make It Real

### Task A1: Backend Database Up

**Goal:** PostgreSQL and Redis running, all tables created via Alembic.

**Files:**

- Modify: `apps/api/alembic.ini` (verify database URL)
- Modify: `apps/api/alembic/env.py` (import all models for autogenerate)
- Create: `apps/api/alembic/versions/001_initial_schema.py`
- Modify: `apps/api/.env` (database credentials)

**Step 1: Start infrastructure services**

```bash
cd /Users/zacharyholwerda/Desktop/airlock-app
docker compose up -d postgres redis
```

Expected: PostgreSQL on :5432, Redis on :6379, both healthy.

**Step 2: Create `.env` file for API**

```bash
cat > apps/api/.env << 'EOF'
DATABASE_URL=postgresql://airlock:airlock@localhost:5432/airlock
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=airlock-dev-jwt-secret-change-in-production
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
LITELLM_API_BASE=http://localhost:4000
DEBUG=true
ENVIRONMENT=development
EOF
```

Note: Google OAuth credentials must be provided by Zachary.

**Step 3: Initialize Alembic (if not already initialized)**

```bash
cd apps/api
source .venv/bin/activate
alembic init alembic  # Skip if alembic/ already exists
```

**Step 4: Verify `alembic/env.py` imports all models**

Ensure the `env.py` file imports from `src.models` so autogenerate detects all tables:

```python
# In alembic/env.py, add before target_metadata:
from src.db import Base
from src.models.workspace import Workspace
from src.models.user import User
from src.models.vault import Vault
from src.models.event import Event
from src.models.document import Document
from src.models.patch import Patch
from src.models.vault_member import VaultMember
from src.models.user_module_role import UserModuleRole
from src.models.user_connection import UserConnection
from src.models.passkey import Passkey
from src.models.mcp_permission import McpPermission

target_metadata = Base.metadata
```

**Step 5: Generate initial migration**

```bash
alembic revision --autogenerate -m "initial schema"
```

Expected: Migration file created with all table definitions.

**Step 6: Apply migration**

```bash
alembic upgrade head
```

Expected: All tables created in PostgreSQL.

**Step 7: Verify tables exist**

```bash
docker exec -it airlock-app-postgres-1 psql -U airlock -c "\dt"
```

Expected: Tables listed — workspaces, users, vaults, events, documents, patches, vault_members, etc.

**Step 8: Start the API server**

```bash
cd apps/api
source .venv/bin/activate
uvicorn src.main:app --reload --port 8000
```

Expected: API running on :8000, `/health` returns `{"status": "healthy"}`.

**Step 9: Verify health endpoint**

```bash
curl http://localhost:8000/health
```

Expected: `{"status":"healthy","service":"airlock-api"}`

**Step 10: Commit**

```bash
git add apps/api/alembic/ apps/api/.env.example
git commit -m "feat(api): initialize database with Alembic migrations"
```

Note: Commit `.env.example` (not `.env` — never commit real secrets).

---

### Task A2: Auth/Login Working

**Goal:** Google OAuth flow works end-to-end: login page → Google → JWT → authenticated session.

**Files:**

- Modify: `apps/web/.env.local` (Google Client ID for frontend)
- Modify: `apps/web/src/app/layout.tsx` or provider wrapper (GoogleOAuthProvider)
- Verify: `apps/api/src/routes/auth.py` (already exists)
- Verify: `apps/api/src/services/auth.py` (Google token verification)
- Verify: `apps/web/src/app/login/page.tsx` (already has GoogleLogin component)

**Step 1: Configure frontend environment**

```bash
cat > apps/web/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<your-google-client-id>
EOF
```

**Step 2: Verify GoogleOAuthProvider wraps the app**

Check `apps/web/src/app/layout.tsx` or `apps/web/src/app/providers.tsx` for `GoogleOAuthProvider`. If missing, add it:

```tsx
import { GoogleOAuthProvider } from "@react-oauth/google";

// Wrap children with:
<GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
  {children}
</GoogleOAuthProvider>;
```

**Step 3: Verify backend auth service handles Google tokens**

Read `apps/api/src/services/auth.py` and confirm:

- It verifies Google ID tokens via `google.oauth2.id_token.verify_oauth2_token`
- It creates or finds a User record in the database
- It returns JWT access + refresh tokens

**Step 4: Test the full flow**

1. Start frontend: `cd apps/web && pnpm dev`
2. Start backend: `cd apps/api && uvicorn src.main:app --reload`
3. Navigate to `http://localhost:3000/login`
4. Click "Sign in with Google"
5. Verify: JWT returned, user created in database, redirected to app

**Step 5: Verify token refresh works**

```bash
curl -X POST http://localhost:8000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "<token-from-login>"}'
```

Expected: New access token returned.

**Step 6: Commit**

```bash
git add apps/web/.env.local.example
git commit -m "feat(web): wire Google OAuth with real backend"
```

---

### Task A3: Onboarding Flow

**Goal:** Fresh login → create "Airlock HQ" workspace → land on Dispatch with real data persisted.

**Files:**

- Modify: `apps/web/src/app/onboarding/page.tsx` (remove dev_mock_token, use real auth)
- Modify: `apps/web/src/app/onboarding/setup/page.tsx` (wire to real API)
- Verify: `apps/api/src/routes/vaults.py` (workspace creation endpoint)
- Create: `apps/api/src/routes/workspaces.py` (if no workspace CRUD route exists)

**Step 1: Check if workspace creation API exists**

Look for a POST endpoint that creates a workspace. If missing, create one:

```python
# apps/api/src/routes/workspaces.py
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ulid import ULID

from src.db import get_db
from src.middleware.auth import get_current_user
from src.models.workspace import Workspace

router = APIRouter(prefix="/api/v1/workspaces", tags=["workspaces"])

class CreateWorkspaceRequest(BaseModel):
    name: str
    slug: str

@router.post("")
def create_workspace(
    body: CreateWorkspaceRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    workspace = Workspace(
        id=str(ULID()),
        name=body.name,
        slug=body.slug,
    )
    db.add(workspace)
    db.commit()
    db.refresh(workspace)
    return {"id": workspace.id, "name": workspace.name, "slug": workspace.slug}
```

Register in `main.py` if created.

**Step 2: Update onboarding page to use real auth**

Replace `provisionDevAuth()` in `apps/web/src/app/onboarding/page.tsx` with a check for existing auth state. If not authenticated, redirect to `/login?next=/onboarding/setup`.

**Step 3: Wire onboarding setup wizard to call workspace creation API**

In `apps/web/src/app/onboarding/setup/page.tsx`, when the user submits the workspace name, call:

```typescript
const res = await apiFetch("/api/v1/workspaces", {
  method: "POST",
  body: JSON.stringify({ name: workspaceName, slug: slugify(workspaceName) }),
});
```

**Step 4: After workspace creation, redirect to Dispatch**

```typescript
router.push("/"); // Dispatch (the global homepage)
```

**Step 5: Test end-to-end**

1. Clear localStorage
2. Navigate to `localhost:3000`
3. Redirected to `/login`
4. Google OAuth → authenticated
5. First-time user → redirected to `/onboarding/setup`
6. Enter "Airlock HQ" → workspace created in database
7. Redirected to Dispatch

**Step 6: Commit**

```bash
git commit -m "feat(web): wire onboarding wizard to real workspace creation"
```

---

### Task A4: Vault CRUD + Chamber Transitions

**Goal:** Create vaults, move through Discover → Build → Review → Ship with gate logic.

**Files:**

- Verify: `apps/api/src/routes/vaults.py` (CRUD endpoints)
- Verify: `apps/api/src/services/vault.py` (business logic)
- Verify: `apps/api/src/services/chamber_rules.py` (gate transition rules)
- Modify: `apps/web/src/stores/module.store.ts` (replace mock with API calls)
- Modify: Frontend vault creation UI (wire to real API)

**Step 1: Verify vault CRUD endpoints exist**

Read `apps/api/src/routes/vaults.py` and confirm:

- POST `/api/v1/vaults` — create vault (with chamber defaulting to "discover")
- GET `/api/v1/vaults` — list vaults (filtered by workspace_id)
- GET `/api/v1/vaults/{id}` — get vault detail
- PATCH `/api/v1/vaults/{id}` — update vault (including chamber transitions)
- Vault entry at ANY chamber (not just discover) per design doc

**Step 2: Verify chamber transition rules**

Read `apps/api/src/services/chamber_rules.py` and confirm:

- Gate criteria for Discover → Build, Build → Review, Review → Ship
- Role requirements (Builder can create in Discover/Build, Gatekeeper needed for Review gate)
- Reverse transitions blocked or require escalation

If chamber_rules.py is a stub, implement basic rules:

```python
CHAMBER_ORDER = ["discover", "build", "review", "ship"]
VALID_TRANSITIONS = {
    "discover": ["build"],
    "build": ["review"],
    "review": ["ship", "build"],  # can be sent back
    "ship": [],  # terminal state
}

def can_transition(current: str, target: str, user_role: str) -> tuple[bool, str]:
    if target not in VALID_TRANSITIONS.get(current, []):
        return False, f"Cannot move from {current} to {target}"
    if target == "review" and user_role not in ("gatekeeper", "owner"):
        return False, "Only Gatekeeper or Owner can approve for Review"
    return True, "OK"
```

**Step 3: Update frontend stores to call real API**

In `apps/web/src/stores/module.store.ts`, replace mock vault data with:

```typescript
fetchVaults: async (workspaceId: string) => {
  try {
    const vaults = await apiFetch(`/api/v1/vaults?workspace_id=${workspaceId}`);
    set({ vaults });
  } catch {
    // Fall back to mock data during transition
    set({ vaults: MOCK_VAULTS });
  }
},
```

**Step 4: Wire vault creation UI**

Find the "New Vault" button/dialog in the contracts module. Wire it to POST `/api/v1/vaults`.

**Step 5: Wire chamber transition UI**

Find the chamber navigation / transition buttons. Wire them to PATCH `/api/v1/vaults/{id}` with `{ chamber: "build" }`.

**Step 6: Test**

1. Create vault "Win Back CMG" → appears in Discover
2. Click "Move to Build" → vault moves to Build chamber
3. Click "Move to Review" → check role requirements
4. Refresh browser → vault persists in correct chamber

**Step 7: Commit**

```bash
git commit -m "feat(contracts): wire vault CRUD and chamber transitions to real API"
```

---

### Task A5: Otto Live LLM

**Goal:** Otto responds with real LLM calls. "Research Create Music Group" returns real intel.

**Files:**

- Modify: `apps/api/.env` (add ANTHROPIC_API_KEY or OPENROUTER_API_KEY)
- Verify: `apps/api/src/otto/routes.py` (already has SSE streaming + provider config)
- Verify: `apps/web/src/hooks/useOttoChat.ts` (SSE client)
- Verify: `apps/web/src/components/organisms/OttoMessengerBar.tsx` (chat UI)

**Step 1: Add LLM API key to `.env`**

```bash
# Add to apps/api/.env:
ANTHROPIC_API_KEY=<your-anthropic-key>
# OR
OPENROUTER_API_KEY=<your-openrouter-key>
```

**Step 2: Verify Otto routes handle real LLM calls**

Read `apps/api/src/otto/routes.py` fully. The `_resolve_provider` function already routes to Anthropic or OpenRouter based on config. Verify the SSE streaming endpoint calls the real LLM and streams tokens back.

Look for any `generate_stub_response` fallback and ensure the real path is taken when API keys are present.

**Step 3: Verify the frontend SSE client**

Read `apps/web/src/hooks/useOttoChat.ts`. Confirm it:

- Sends POST to `/api/v3/otto/chat` (or similar)
- Handles SSE events (text chunks, finish, error)
- Updates the chat message list in real-time

**Step 4: Test Otto end-to-end**

1. Open a vault
2. Open Otto panel (Control panel / chat interface)
3. Type "Research Create Music Group"
4. Verify: Real LLM response streams back with company information

**Step 5: Test the general Otto endpoint (not vault-scoped)**

The `general_router` at `/api/v3/otto` should work for research queries without a vault context.

**Step 6: Commit**

```bash
git commit -m "feat(otto): wire live LLM with Anthropic/OpenRouter provider"
```

---

### Task A6: CRM Real CRUD

**Goal:** Create, edit, list contacts. Attach contacts to vaults. Pipeline stages.

**Files:**

- Check: `apps/api/src/routes/` for CRM-specific routes
- Check: `apps/api/src/models/` for contact/lead models
- Modify: `apps/web/src/stores/` CRM store (replace mock)

**Step 1: Assess CRM backend state**

The CRM module uses the vault hierarchy as its data model (per CLAUDE.md: "DO NOT create separate CRM database tables. The vault hierarchy IS the CRM."). Check if CRM entities (contacts, leads, accounts) are modeled as vault types:

```python
# A CRM contact would be a vault with:
vault_type = "contact"
module_type = "crm"
```

**Step 2: Verify vault routes support CRM queries**

The existing vault CRUD should support filtering by `module_type=crm` and `vault_type=contact`.

**Step 3: Wire CRM frontend stores to real API**

Replace mock data in CRM stores with `apiFetch` calls to vault endpoints filtered by CRM module.

**Step 4: Test**

1. Navigate to CRM module
2. Create a contact (vault_type=contact, module_type=crm)
3. View contact in pipeline
4. Attach contact to a contract vault
5. Refresh → persists

**Step 5: Commit**

```bash
git commit -m "feat(crm): wire CRM contacts to real vault-backed API"
```

---

### Task A7: Triage Board Real CRUD

**Goal:** Kanban board with real task persistence. Create, move, edit tasks.

**Files:**

- Check: `apps/api/src/models/` for task model
- Modify: `apps/web/src/stores/` task store
- Modify: Triage board component (wire drag-and-drop to API)

**Step 1: Assess task data model**

Tasks in Airlock are likely vault-type items (module_type=triage) or a separate model. Check existing models and routes.

**Step 2: Wire task CRUD to real API**

Similar to CRM — tasks may be vaults with `module_type=triage`, or there may be a separate task model. Wire the frontend store to the correct endpoints.

**Step 3: Wire drag-and-drop to status updates**

When a task card is dragged between Kanban columns, send PATCH to update the task's status/column.

**Step 4: Test**

1. Navigate to Triage module
2. Create task "Prepare CMG pitch deck"
3. Drag between columns (To Do → In Progress → Done)
4. Refresh → persists

**Step 5: Commit**

```bash
git commit -m "feat(triage): wire Kanban board to real API"
```

---

### Task A8: Documents Real Upload

**Goal:** Upload files, attach to vaults, view them.

**Files:**

- Verify: `apps/api/src/routes/documents.py` (upload endpoint)
- Verify: `apps/api/src/models/document.py` (document model)
- Modify: Frontend document upload component
- Check: `apps/api/src/config.py` `uploads_dir` setting

**Step 1: Verify document upload endpoint**

Read `apps/api/src/routes/documents.py`. Confirm:

- POST endpoint accepts multipart file upload
- File saved to `uploads_dir` (filesystem)
- Document record created in database with vault_id association

**Step 2: Ensure uploads directory exists**

```bash
mkdir -p apps/api/uploads
```

**Step 3: Wire frontend upload UI**

The Documents module should have a file upload component. Wire it to the real upload endpoint.

**Step 4: Test**

1. Navigate to a vault
2. Upload a PDF (pitch deck, contract sample)
3. See it listed in the vault's documents
4. Click to view/download
5. Refresh → persists

**Step 5: Commit**

```bash
git commit -m "feat(documents): wire file upload and vault attachment to real API"
```

---

## Track B: CLI Agent — Seed Your Real Life

> **Dependency:** Track B starts AFTER Task A3 is complete (database running + workspace creation works).

### Task B1: Workspace Seed — Airlock HQ

**Goal:** Create the "Airlock HQ" workspace and Zachary's user account in the database.

**Files:**

- Create: `scripts/seeds/liftoff-seed.py`

**Step 1: Write seed script**

```python
"""Liftoff seed — Zachary's Airlock HQ workspace."""
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "apps", "api"))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from ulid import ULID

from src.models.workspace import Workspace
from src.models.user import User
from src.db import Base

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://airlock:airlock@localhost:5432/airlock")
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

def seed():
    db = Session()

    # Workspace
    ws = Workspace(
        id=str(ULID()),
        name="Airlock HQ",
        slug="airlock-hq",
        metadata_={"persona": "maverick", "plan": "founder"},
    )
    db.add(ws)

    # Zachary's account
    user = User(
        id=str(ULID()),
        email="zachary@airlock.dev",  # or real email
        display_name="Zachary Holwerda",
        workspace_id=ws.id,
        org_role="executive",
    )
    db.add(user)

    db.commit()
    print(f"Created workspace: {ws.name} ({ws.id})")
    print(f"Created user: {user.display_name} ({user.id})")
    db.close()

if __name__ == "__main__":
    seed()
```

**Step 2: Run seed**

```bash
cd /Users/zacharyholwerda/Desktop/airlock-app
python scripts/seeds/liftoff-seed.py
```

**Step 3: Verify**

```bash
docker exec -it airlock-app-postgres-1 psql -U airlock -c "SELECT id, name FROM workspaces;"
```

**Step 4: Commit**

```bash
git commit -m "feat(seeds): add Liftoff workspace seed script"
```

---

### Task B2: CRM Contacts

**Goal:** Seed prospect contacts — CMG execs, agency contacts, investors (anonymized).

**Step 1: Add contacts to seed script**

Add CRM contact vaults to `liftoff-seed.py`:

- 3-5 CMG contacts (anonymized names, real roles)
- 2-3 agency contacts
- 2-3 potential investor contacts

Each contact is a vault with `module_type="crm"`, `vault_type="contact"`.

**Step 2: Run and verify**

**Step 3: Commit**

```bash
git commit -m "feat(seeds): add CRM prospect contacts for Airlock HQ"
```

---

### Task B3: Vaults at Different Chambers

**Goal:** Seed vaults showing the full lifecycle.

Seed vaults:

- "Win Back CMG" — Discover chamber (prospect research)
- "Investor Pitch Round" — Build chamber (assembling materials)
- "Sample Distribution Agreement" — Review chamber (contract verification)
- "Standard NDA Template" — Ship chamber (verified, reusable template)

**Commit:** `feat(seeds): add lifecycle vaults across all chambers`

---

### Task B4: Triage Items

**Goal:** Seed Airlock's own feature backlog.

Seed 8-10 real triage items:

- "Implement drift detection on shipped templates" (To Do)
- "Otto research tool — web search integration" (In Progress)
- "CRM pipeline drag-and-drop polish" (In Progress)
- "Liftoff validation — full checklist pass" (To Do)
- "Prepare CMG pitch deck" (To Do)
- etc.

**Commit:** `feat(seeds): add real Airlock backlog to Triage`

---

### Task B5: Documents

**Goal:** Seed document records (templates, samples).

- Drop anonymized contract samples from OrcestrateOS into `apps/api/uploads/`
- Create document records in the database linked to the appropriate vaults
- Include: pitch deck template, one-pager template, NDA template

**Commit:** `feat(seeds): add document templates and contract samples`

---

## Track C: Web App Agent — Playbooks & Content

> **No code dependencies.** Track C can start immediately.

### Task C1: Liftoff Quickstart Guide

**File:** `airlock-playbooks/onboarding/liftoff-quickstart.md`

Write a step-by-step guide for someone starting their own Airlock:

1. Clone the repo
2. `docker compose up -d postgres redis`
3. Configure `.env` (Google OAuth, LLM API key)
4. Run migrations
5. Start API + frontend
6. Create your workspace
7. Create your first vault
8. Ask Otto a question

**Commit to airlock-playbooks repo.**

---

### Task C2: Investor Pitch Playbook

**File:** `airlock-playbooks/prospecting/investor-pitch.md`

Step-by-step for preparing and delivering an investor pitch through Airlock:

- Create vault in Discover for each investor target
- Use Otto to research the firm
- Build materials in Documents module
- Track prep tasks in Triage
- Move vault to Ship when pitch is delivered and follow-up is scheduled

**Commit to airlock-playbooks repo.**

---

### Task C3: NotebookLM Source Pack

**Files:** `airlock-docs/NotebookLM/` directory

Prepare source documents optimized for NotebookLM podcast generation:

- `architecture-overview.md` — the platform architecture in plain English
- `feature-walkthrough.md` — what each module does with examples
- `differentiators.md` — what makes Airlock different from Salesforce, HubSpot, Monday.com
- `founder-story.md` — Zachary's journey from OrcestrateOS to Airlock

**Commit to airlock-docs repo.**

---

## Liftoff Validation Checklist

When all tracks complete, the Orchestrator runs this checklist:

```
[ ] Docker: PostgreSQL + Redis healthy
[ ] API: /health returns 200
[ ] Fresh browser → /login → Google OAuth → JWT issued
[ ] First-time user → /onboarding/setup → create "Airlock HQ"
[ ] Dispatch loads with workspace context
[ ] Create vault "Win Back CMG" → lands in Discover
[ ] Ask Otto: "Research Create Music Group" → real LLM response streams
[ ] CRM: Contact visible in pipeline view
[ ] Move vault Discover → Build → gate transition works
[ ] Attach document to vault → file persists
[ ] Triage: Create task → Kanban board updates
[ ] Move vault Build → Review → role check enforced
[ ] Move vault Review → Ship → template produced
[ ] Browser refresh → all data persists
[ ] Seed data visible: contacts, vaults, triage items, documents
```

**When every box is checked: LIFTOFF.**

---

## Execution Notes

- **Google OAuth credentials:** Zachary must provide these. Without them, A2 is blocked. Dev login can be used as interim.
- **LLM API key:** Zachary must provide Anthropic or OpenRouter key. Without it, A5 is blocked.
- **Contract samples:** Zachary drops anonymized OrcestrateOS samples into `~/Desktop/Airlock/ingestion/documents/` for B5.
- **CRM is vault-backed:** Per CLAUDE.md, CRM entities are vaults with `module_type=crm`. No separate CRM tables.
- **Triage items:** May be vaults (module_type=triage) or a separate task model. VS Code Agent must check the existing data model.
