# Demo Readiness — Phased Build Plan

> **Purpose**: This is a copy-paste-ready build plan for implementing the Airlock demo. Each phase is independently shippable and testable. Build in order — each phase depends on the one before it.
>
> **Current state**: The frontend has 80+ components, 23 Zustand stores, and 20 mock data files. The backend has 4 route groups (auth, vaults, events, engines), 3 services, 3 engines (extraction, preflight, generation), and 3 DB migrations. Everything currently works against mock data when the API is down.

---

## Phase 0 — Infrastructure (must be done first)

### 0A. Database + Seed Data

**Goal**: `docker compose up` gives you a working database with realistic data.

**Files to create/modify**:
- `scripts/seeds/definitions/happy-path.yaml` — Scenario with 7+ vaults across all 4 chambers, 3 users (builder/gatekeeper/owner), 1 workspace
- `scripts/seeds/generator.py` — Read YAML, output SQL inserts using `Faker.seed(42)`
- `scripts/seeds/seed.sql` — Generated output (committed for convenience)
- `docker-compose.yml` — Add `volumes:` mount to auto-run seed.sql on first start

**Seed data must include**:
```
1 workspace: "Acme Records" (ws_acme)
3 users: Jane Builder, Tom Gatekeeper, Sarah Owner
7 vaults (matching existing mock-vaults.ts names):
  - vault_001: Henderson MSA (discover/gate_triage)
  - vault_002: Warner Distribution Q2 (discover/gate_ingest)
  - vault_003: Summit Publishing License (discover/gate_triage)
  - vault_004: Sony-BigBooty Dist Agreement (build/gate_extract)
  - vault_005: Atlantic Sync License (build/gate_preflight)
  - vault_006: Universal Amendment #3 (review/gate_gatekeeper)
  - vault_007: BMG Catalog Transfer (ship/gate_export)
Events: at least 3 per vault (vault_created + chamber_advanced transitions)
VaultMembers: assign all 3 users to all 7 vaults with varying roles
```

**Validation**: After `docker compose up -d postgres`, run `psql` and verify `SELECT count(*) FROM vaults` returns 7.

### 0B. Dev Auth Shortcut

**Goal**: Click "Dev Login" on the login page, get a JWT, land in the app. No Google OAuth needed for demos.

**What exists**: `POST /api/v1/auth/dev/login` already exists in `apps/api/src/routes/auth.py`. The login page exists at `apps/web/src/app/login/page.tsx`.

**Files to modify**:
- `apps/web/src/app/login/page.tsx` — Add a "Dev Login" button that calls `POST /api/v1/auth/dev/login`, stores the JWT in localStorage (`airlock_access_token`), and redirects to `/contracts`
- `apps/web/src/stores/auth.store.ts` — Ensure `hydrateFromToken()` reads the JWT and populates the user state

**Validation**: Click Dev Login → land on contracts triage page → `auth.store` has user info.

---

## Phase 1 — Contracts Module: Live Triage Board

### 1A. Wire Triage Board to API

**Goal**: The triage board at `/contracts/triage` loads vaults from the API instead of mock data.

**What exists**:
- `apps/web/src/app/(shell)/(modules)/contracts/triage/page.tsx` — Triage view
- `apps/web/src/stores/vault.store.ts` — Already has `fetchVaults()` with API-first + mock fallback
- `GET /api/v1/vaults?module_type=contracts&vault_level=4` — Already implemented

**Files to modify**:
- `apps/web/src/app/(shell)/(modules)/contracts/triage/page.tsx` — Ensure it calls `fetchVaults({ module_type: "contracts", vault_level: 4 })` on mount
- Verify the triage board renders vault cards grouped by chamber (discover/build/review/ship)

**Validation**: With API running + seeded DB, triage board shows 7 vaults in correct chamber columns.

### 1B. Vault Detail with Record Inspector

**Goal**: Click a vault on the triage board → navigate to `/contracts/[vaultId]` → see the Triptych with Record Inspector.

**What exists**:
- `apps/web/src/app/(shell)/(modules)/contracts/[vaultId]/page.tsx` — Already implemented, uses `useVaultStore().fetchVault()`
- `apps/web/src/components/organisms/RecordInspector.tsx` — Already renders field cards
- `apps/web/src/components/templates/TriptychLayout.tsx` — Full three-panel layout with resize handles

**Files to verify/fix**:
- `apps/web/src/app/(shell)/(modules)/contracts/[vaultId]/layout.tsx` — Should wrap page in `<TriptychLayout>`. If this file doesn't exist, create it.
- `apps/web/src/stores/extraction.store.ts` — Currently tries `GET /api/v1/extractions/{vaultId}` which doesn't exist. Keep the mock fallback working for now.

**Validation**: Click vault on triage → three-panel view loads → Signal panel shows activity → Orchestrate shows Record Inspector → Control shows tabs.

### 1C. Chamber Advancement

**Goal**: Demo advancing a vault through chambers (discover → build → review → ship).

**What exists**:
- `POST /api/v1/vaults/{vault_id}/advance` — Already implemented
- `useVaultStore().advanceChamber()` — Already calls the API

**Files to modify**:
- Add an "Advance Chamber" button to the vault detail header in `apps/web/src/app/(shell)/(modules)/contracts/[vaultId]/page.tsx`
- The button should call `advanceChamber(vaultId)` and show the new chamber/gate after success
- Only show the button when vault is not in `ship` chamber

**Validation**: Open vault in discover → click Advance → vault moves to build → triage board updates.

---

## Phase 2 — Contract Generator (Live)

### 2A. Wire Generator Form to API

**Goal**: The contract generator at `/contracts/generator` creates real contracts via the API.

**What exists**:
- `apps/web/src/app/(shell)/(modules)/contracts/generator/page.tsx` — Generator view
- `apps/web/src/stores/generator.store.ts` — Has form state management
- `POST /api/v1/engines/generation/run` — Already implemented with 12 contract types
- `apps/api/src/engines/generation/` — Full engine with clause library, fake data, variations

**Files to modify**:
- `apps/web/src/stores/generator.store.ts` — Wire `generate()` action to call `POST /api/v1/engines/generation/run` with `{ contract_type, form_values, seed, include_metadata: true }`
- Ensure the preview panel in the generator page renders the returned `text` field

**Validation**: Select "Distribution" contract type → fill form → click Generate → see realistic contract text in preview panel.

### 2B. Create Vault from Generated Contract

**Goal**: After generating a contract, click "Create Vault" to create a real vault with the generated text stored in metadata.

**Files to modify**:
- `apps/web/src/stores/generator.store.ts` — Add `createVaultFromGenerated()` that calls `useVaultStore().createVault()` with `{ name, vault_type: "contract", module_type: "contracts", metadata: { generated_text, contract_type, form_values } }`
- Add a "Create Vault" button to the generator page that triggers this

**Validation**: Generate contract → Create Vault → navigate to triage → new vault appears in discover column.

---

## Phase 3 — Extraction + Preflight (Live)

### 3A. Wire Extraction to API

**Goal**: Run extraction on a vault's contract text and display results in the Record Inspector.

**What exists**:
- `POST /api/v1/engines/extraction/run` — Accepts `{ full_text }`, returns extraction results
- `apps/web/src/components/organisms/RecordInspector.tsx` — Renders field cards from extraction data
- `apps/web/src/stores/extraction.store.ts` — Mock-based currently

**Problem**: The extraction API expects `full_text` (a string), but vaults don't have documents attached yet. For the demo, use the generated contract text stored in `vault.metadata.generated_text`.

**Files to modify**:
- `apps/web/src/stores/extraction.store.ts` — Change `fetchExtraction(vaultId)` to:
  1. Fetch the vault via `GET /api/v1/vaults/{vaultId}`
  2. If `vault.metadata.generated_text` exists, call `POST /api/v1/engines/extraction/run` with that text
  3. Store results and render via Record Inspector
- `apps/web/src/components/organisms/RecordInspector.tsx` — Ensure it can render the API extraction response format (dict keyed by check_code with `{ field_key, value, confidence, status, reason }`)

**Validation**: Open a vault that was created from the generator → Record Inspector shows extracted fields with confidence badges.

### 3B. Wire Preflight to API

**Goal**: Run preflight quality gates on a vault's contract text and display the gate color (RED/YELLOW/GREEN).

**What exists**:
- `POST /api/v1/engines/preflight/run` — Accepts pages_data, returns gate_color + readiness scores
- No frontend preflight display yet

**Files to create/modify**:
- `apps/web/src/components/molecules/PreflightBadge.tsx` — New component. Shows gate_color as a colored badge + gate_reasons as a tooltip/popover
- Add PreflightBadge to the vault detail header (next to health score)
- The vault detail page should call preflight on mount if `vault.metadata.generated_text` exists:
  - Split text into pages (1 page per ~3000 chars)
  - Call `POST /api/v1/engines/preflight/run` with `{ pages_data: [{ page: 1, text: "..." }] }`
  - Display the result

**Validation**: Open vault with generated text → see GREEN/YELLOW/RED badge in header → hover to see gate reasons.

---

## Phase 4 — Review Queue + Patch Workflow

### 4A. Wire Review Queue to API

**Goal**: The review queue at `/contracts/review-queue` shows vaults in the `review` chamber.

**What exists**:
- `apps/web/src/app/(shell)/(modules)/contracts/review-queue/page.tsx` — Review queue view
- `apps/web/src/stores/review-queue.store.ts` — Mock-based

**Files to modify**:
- `apps/web/src/stores/review-queue.store.ts` — Wire to `GET /api/v1/vaults?module_type=contracts&chamber=review`
- Ensure the review queue renders entity cards with handoff signals

**Validation**: Advance a vault to review chamber → navigate to review queue → vault appears.

### 4B. Patch Workflow (Basic)

**Goal**: Create and submit a patch (field correction) on a vault in review.

**What exists**:
- `apps/web/src/app/(shell)/(modules)/contracts/patch/page.tsx` — Patch editor view
- `apps/web/src/stores/patch.store.ts` — Has patch state management
- `apps/web/src/components/organisms/PatchEditor.tsx` — Editor component

**What's missing on the backend**: No patch routes yet.

**Files to create**:
- `apps/api/src/models/patch.py` — Patch model (id, vault_id, workspace_id, field_key, old_value, new_value, status: draft|submitted|approved|rejected, submitted_by, reviewed_by, created_at, updated_at, deleted_at, metadata)
- `apps/api/src/schemas/patch.py` — Pydantic schemas for patch CRUD
- `apps/api/src/services/patch.py` — Business logic: create_patch, submit_patch, approve_patch, reject_patch
- `apps/api/src/routes/patches.py` — REST endpoints: POST create, GET list by vault, PATCH update status
- `apps/api/src/migrations/versions/004_add_patches.py` — Alembic migration
- Register the router in `apps/api/src/main.py`

**Frontend wiring**:
- `apps/web/src/stores/patch.store.ts` — Wire to patch API endpoints
- The patch editor should load a vault's extraction results, allow editing field values, and submit as a patch

**Validation**: Open vault in review → edit a field → submit patch → patch shows as "submitted" → approve → field value updates.

---

## Phase 5 — Activity Feed + Events (Polish)

### 5A. Wire Activity Feed to API

**Goal**: The Signal panel shows real events from the events API.

**What exists**:
- `GET /api/v1/events/vault/{vault_id}` — Returns events for a vault
- `GET /api/v1/events/recent` — Returns workspace-level events
- `apps/web/src/components/organisms/SignalPanel.tsx` — Left panel of Triptych
- `apps/web/src/components/organisms/ActivityFeed.tsx` — Feed component
- `apps/web/src/stores/event.store.ts` — Mock-based

**Files to modify**:
- `apps/web/src/stores/event.store.ts` — Wire to events API:
  - `fetchVaultEvents(vaultId)` → `GET /api/v1/events/vault/{vaultId}`
  - `fetchRecentEvents()` → `GET /api/v1/events/recent`
- `apps/web/src/components/organisms/ActivityFeed.tsx` — Ensure it renders the API response format
- `apps/web/src/components/organisms/SignalPanel.tsx` — Call `fetchVaultEvents(vaultId)` when a vault is selected

**Validation**: Open vault detail → Signal panel shows "vault_created", "chamber_advanced" events with timestamps.

### 5B. Health Score in Triage

**Goal**: Vault cards on the triage board show the health score from preflight results.

**Files to modify**:
- `apps/api/src/routes/vaults.py` — After running preflight (or extraction), update `vault.health_score` via `PATCH /api/v1/vaults/{vault_id}`
- OR: Add a `POST /api/v1/vaults/{vault_id}/run-preflight` convenience endpoint that runs preflight and saves the health_score back to the vault
- `apps/web/src/components/molecules/VaultItem.tsx` — Ensure health_score renders with the color coding (red < 50 < yellow < 80 < green)

**Validation**: Triage board shows colored health scores on each vault card.

---

## What NOT to Build for Demo

These are explicitly out of scope for the demo and should NOT be implemented:

1. **PDF upload / document ingestion** — Use generated contract text via `vault.metadata.generated_text` instead
2. **WebSocket real-time updates** — Polling or manual refresh is fine for demo
3. **Signature actions** (review-decision endpoint) — Use existing chamber advance
4. **Batch processing** — Single vault operations only
5. **CRM, Tasks, Calendar, Documents modules** — Mock data is fine for these
6. **Google OAuth** — Dev login is sufficient
7. **OpenAPI codegen / shared-types** — Manual types in stores are fine
8. **Workflow engine / automation** — Manual operations only
9. **Search / Cmd+K** — Not needed for demo flow
10. **Notifications** — Not needed for demo flow

---

## Demo Script (After All Phases)

This is the walkthrough you'd give in a demo:

1. **Login**: Click "Dev Login" → land on contracts triage board
2. **Triage overview**: Show 7 vaults across 4 chambers, health scores visible
3. **Vault detail**: Click "Henderson MSA" → Triptych loads with Signal | Orchestrate | Control
4. **Generate contract**: Go to `/contracts/generator` → select Distribution → generate → preview
5. **Create vault**: Click "Create Vault" → new vault appears in triage discover column
6. **Run extraction**: Open new vault → Record Inspector auto-extracts fields with confidence scores
7. **Preflight gate**: Show GREEN/YELLOW/RED badge based on contract quality
8. **Advance chambers**: Click Advance → vault moves discover → build → review
9. **Review queue**: Navigate to review queue → see vault waiting for review
10. **Patch workflow**: Edit a field → submit patch → approve → field updates
11. **Activity feed**: Signal panel shows full audit trail of all actions

---

## File Count Summary

| Phase | New Files | Modified Files | Backend | Frontend |
|-------|-----------|----------------|---------|----------|
| 0     | 4         | 3              | 0 new   | 2 mod    |
| 1     | 0-1       | 3              | 0       | 3-4      |
| 2     | 0         | 2              | 0       | 2        |
| 3     | 1         | 3              | 0       | 3-4      |
| 4     | 5         | 4              | 5 new   | 3 mod    |
| 5     | 0         | 4              | 1 mod   | 3 mod    |

**Total**: ~10 new files, ~19 modifications. The backend is 80% done. Most work is frontend wiring.

---

## Conventions Reminder

- **Terms**: Vault, Module, Chamber, Gate, View, Triptych, Signal/Orchestrate/Control. NEVER say "channel", "workstream", "phase", or "stage".
- **App Router only**: No `getServerSideProps`, no Pages Router patterns.
- **Business logic in services**: Routes are thin HTTP wrappers. `apps/api/src/services/` has all logic.
- **Tailwind tokens only**: No raw color values. Use classes from `src/styles/tokens.css`.
- **Commit format**: `feat(web): wire triage board to vault API` — conventional commits with scope.
