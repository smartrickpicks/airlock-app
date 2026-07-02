# Production Local — Go Real

**Goal:** Everything works with real data locally. Only missing piece = OpenRouter API key for AI features.

## Current State

- **29 mock files** in `apps/web/src/lib/mock-*.ts` — frontend falls back to these when API fails
- **13 DB migrations** written but DB may not be running
- **Seed script** exists at `scripts/seeds/liftoff-seed.py` — creates workspace + vaults + users
- **Invites** use in-memory dict (lost on restart), accept doesn't create real users
- **Calendar** GET endpoint returns hardcoded mock
- **Otto/DAG executor** returns `stub: true` instead of calling LLM
- **CORS** only allows `localhost:3000` — frontend may run on different port
- **Docker compose** maps postgres to 5432, but `.env` says 5433

---

## Tasks

### Task 1: Infrastructure — Start Postgres + Redis + Run Migrations

- Fix `.env` port mismatch (compose=5432, env=5433) — standardize on 5433 for local
- Update `docker-compose.yml` to expose postgres on 5433 (avoids clashing with system postgres)
- `docker compose up -d postgres redis`
- `cd apps/api && alembic upgrade head`
- Verify: `psql` can connect, tables exist

### Task 2: CORS — Allow Any Localhost Port

- Update `apps/api/src/config.py` `cors_origins` default to include common dev ports
- Add `CORS_ORIGINS` to `.env` as comma-separated list
- Parse in config: `["http://localhost:3000", "http://localhost:3001", ...]` or use wildcard for dev

### Task 3: Seed Script — Run Liftoff Seed

- Run `scripts/seeds/liftoff-seed.py` to create "Airlock HQ" workspace, Zach user, contract/CRM/triage vaults, events
- Verify dev login picks up the real workspace (it already queries first workspace)

### Task 4: Invites — Migrate to Database

- Create migration `014_add_invites_table.py`:
  ```
  invites: id (ULID), workspace_id, email, token, invited_by (FK users),
           org_role, status (pending/accepted/expired),
           created_at, expires_at, accepted_at, deleted_at
  ```
- Rewrite `apps/api/src/routes/invites.py` to use DB via service layer
- Accept flow: create real User record + workspace membership + issue real JWT
- Read workspace_name from DB (not hardcoded "Brain Brigade")
- Read inviter_name from User record (not hardcoded "Zach")

### Task 5: Calendar — Store Events in DB

- Create migration `015_add_calendar_events_table.py`:
  ```
  calendar_events: id (ULID), workspace_id, user_id, title, description,
                   start_time, end_time, location, event_type, source (google/manual),
                   external_id, metadata JSONB, created_at, updated_at, deleted_at
  ```
- Update `apps/api/src/services/calendar.py`:
  - `sync_google_calendar()` stores fetched events in DB
  - If no Google token, seed with mock events into DB on first call
- Update `apps/api/src/routes/calendar.py`:
  - `GET /events` queries DB instead of returning hardcoded mock
  - `POST /sync` upserts events from Google into DB

### Task 6: Otto — Wire to OpenRouter

- Update `apps/api/src/services/dag/executor.py`:
  - `_execute_otto()` calls OpenRouter API using `settings.openrouter_api_key`
  - Use MAGS prompt composer (`compose_prompt()`) to build system prompt
  - Call `httpx.AsyncClient` to POST to `https://openrouter.ai/api/v1/chat/completions`
  - Model: `anthropic/claude-sonnet-4` (or configurable)
  - If no API key, fall back to current stub behavior
  - Remove `"stub": True` flag when real response received
- Same for `_execute_hybrid()` — Otto drafts via real LLM

### Task 7: Frontend — Fix API URL & Remove Hardcoded Demo Values

- Ensure `apps/web/.env.local` `NEXT_PUBLIC_API_URL` points to `http://localhost:8000`
- Update `apps/web/src/lib/mock-admin.ts`: pull workspace name from auth store, not hardcoded
- Update invite store: pass real workspace_id from auth context
- Verify all stores' `apiFetch` calls use correct paths matching API routes

### Task 8: Dev Login Enhancement

- Update dev login to also create `user_module_roles` for all 5 modules (owner role)
- Ensure dev user has full access across contracts, CRM, tasks, calendar, documents
- Return `display_name` from workspace metadata if available

### Task 9: Email — Log Invite URLs to Console

- When `RESEND_API_KEY` is empty, print the full join URL clearly to console
- Format: `[INVITE] Join URL for user@email.com: http://localhost:3000/join/{token}`
- This lets you test the full invite flow locally without email service

### Task 10: Verification

- Start API: `cd apps/api && uvicorn src.main:app --reload`
- Start web: `cd apps/web && pnpm dev`
- Dev Login → verify real workspace loads
- Navigate all modules: Contracts, CRM, Tasks, Calendar, Documents
- Create a vault via UI → verify it persists across page reload
- Create invite → copy URL from console → open in incognito → accept
- Trigger playbook execution → verify Otto calls OpenRouter (once key added)

---

## What Still Uses Mock Fallback (By Design)

These features use mock data as a safety net — if API is up, they use real data:

- **All 32 stores** have try/catch with mock fallback — this is the architecture, not a bug
- **LinkedIn scraper** falls back to mock profile if hosted scraper not running
- **Document extraction engine** runs local heuristics (no LLM needed)
- **Search** uses client-side Fuse.js index (no backend search)

## Out of Scope

- Real Google Calendar OAuth (requires consent screen setup)
- Real email delivery (requires Resend API key)
- LinkedIn MCP scraper (requires hosted service)
- Production deployment (Docker, SSL, etc.)
