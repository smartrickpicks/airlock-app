# Airlock

Enterprise data operations platform. Discord-like interface for contract lifecycle management.

> Read [AGENTS.md](AGENTS.md) before starting any task.

## Skills

Load these for detailed context on specific topics:

| Skill | When to load |
| ----- | ------------ |
| [roles](.github/skills/roles/SKILL.md) | Users, permissions, org roles, module roles, tiers, members, access control, OTTO tool gating |

## What Claude Gets Wrong

- DO NOT use "channel", "workstream", "phase", or "stage". Terms: **Vault**, **Module**, **Chamber**, **Gate**, **View**, **Triptych**, **Signal/Orchestrate/Control**.
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

| Concept               | Term                                                    |
| --------------------- | ------------------------------------------------------- |
| Top-level domain      | **Module** (Contracts, CRM, Tasks, Calendar, Documents) |
| Workflow instance     | **Vault**                                               |
| Lifecycle stage       | **Chamber** (Discover > Build > Review > Ship)          |
| Chamber checkpoint    | **Gate**                                                |
| Screen within chamber | **View**                                                |
| Three-panel layout    | **Triptych** (Signal \| Orchestrate \| Control)         |
| Admin                 | **Overlay** (not a module)                              |

## Roles

Airlock uses a **three-layer role system** — do not treat roles as a single flat value.

| Layer | What it is | Values |
| ----- | ---------- | ------ |
| **Org Role** | Platform-wide tier, absolute permission ceiling | `member` / `lead` / `director` / `executive` |
| **Module Role** | Per-module functional role — different per module | `builder` / `gatekeeper` / `owner` / `designer` / `viewer` |
| **Agentic Role** | Interface personalization, 16 types — does not change permissions | See skill |

**Load [.github/skills/roles/SKILL.md](.github/skills/roles/SKILL.md) before working with any user, permission, or access control logic.**

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

Scopes: web, api, shared-types, docs, shell, contracts, crm, tasks, calendar, documents, admin, ci, docker, deps

## Specs

Read the relevant spec in `docs/specs/` BEFORE implementing any feature.
See `docs/specs/start.md` for the master index.
