# Airlock

Enterprise data operations platform. Discord-like interface for contract lifecycle management.

## What Claude Gets Wrong

- DO NOT use "channel", "workstream", "phase", or "stage". Terms: **Vault**, **Module**, **Chamber**, **Gate**, **View**, **Triptych**, **Signal/Orchestrate/Control**.
- DO NOT use "Tasks", "Todo", "Dashboard", or "Home Page". Terms: **Triage** (the project management module), **Dispatch** (the global homepage View), **Triage Signals** (the Dispatch widget surfacing Triage items).
- DO NOT create separate CRM database tables. The vault hierarchy IS the CRM.
- DO NOT use `getServerSideProps` or Pages Router. This is **App Router** (Next.js 14).
- DO NOT suggest alternatives to the locked tech stack (see `docs/specs/tech-stack/`).
- DO NOT put business logic in route handlers. Use the `services/` layer.
- DO NOT modify spec `overview.md` files without explicit permission.
- DO NOT use raw color values. Use Tailwind tokens from `tokens.css`.

## Architecture

- `apps/web/` — Next.js 14 (App Router, TypeScript, Zustand, Tailwind)
- `apps/api/` — FastAPI (Python, PostgreSQL 16, Redis 7)
- `packages/shared-types/` — OpenAPI-generated TypeScript client
- `docs/specs/` — Design specifications (source of truth for requirements)

## Vocabulary

| Concept                     | Term                                                             |
| --------------------------- | ---------------------------------------------------------------- |
| Top-level domain            | **Module** (Contracts, CRM, Triage, Calendar, Documents)         |
| Workflow instance           | **Vault**                                                        |
| Lifecycle stage             | **Chamber** (Discover > Build > Review > Ship)                   |
| Chamber checkpoint          | **Gate**                                                         |
| Screen within chamber       | **View**                                                         |
| Three-panel layout          | **Triptych** (Signal \| Orchestrate \| Control)                  |
| Global homepage             | **Dispatch** (Signal-dominant Triptych at workspace level)       |
| Project management module   | **Triage** (Kanban + table + agenda — the Asana/Jira equivalent) |
| Dispatch section for Triage | **Triage Signals** (module's push surface into Signal panel)     |
| Module's push surface       | **[Module] Signals** (e.g., Gate Signals, CRM Signals)           |
| Admin                       | **Overlay** (not a module)                                       |

## Roles

- **Builder** — drafts, assembles (Discover + Build chambers)
- **Gatekeeper** — reviews, approves (Review chamber)
- **Owner** — promotes, publishes (Ship chamber)

## Commands

```
pnpm dev                  # Next.js dev server
pnpm build                # Build all packages
pnpm lint                 # Lint all packages
pnpm type-check           # TypeScript check
docker compose up         # All services
docker compose up -d postgres redis  # Just infra
cd apps/api && uvicorn src.main:app --reload  # API only
```

## Commit Format

Conventional commits: `feat(contracts): add triage board view`

Scopes: web, api, shared-types, docs, shell, contracts, crm, triage, dispatch, calendar, documents, admin, ci, docker, deps

## Specs

Read the relevant spec in `docs/specs/` BEFORE implementing any feature.
See `docs/specs/start.md` for the master index.
