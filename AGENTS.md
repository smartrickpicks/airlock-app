# Airlock

Enterprise data operations platform. Discord-like interface for contract lifecycle management.

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

## Structure

| Directory            | Purpose                                              |
| -------------------- | ---------------------------------------------------- |
| `apps/web/`          | Next.js 14 (App Router, TypeScript, Zustand, Tailwind) |
| `apps/api/`          | FastAPI (Python, PostgreSQL 16, Redis 7)             |
| `packages/shared-types/` | OpenAPI-generated TypeScript client              |
| `docs/specs/`        | Design specifications — source of truth              |
| `.github/skills/`    | Detailed context packages — load when relevant       |

## Skills

Load these when the task touches the topic:

| Skill | When to load |
| ----- | ------------ |
| [roles](.github/skills/roles/SKILL.md) | Anything involving users, permissions, org roles, module roles, tiers, members, access control, OTTO tool gating |

## Core Conventions

- **Vocab:** Vault (workflow instance), Module (domain), Chamber (lifecycle stage), Gate (checkpoint), Triptych (3-panel layout: Signal | Orchestrate | Control)
- **No raw colors** — Tailwind tokens from `tokens.css` only
- **No business logic in routes** — services/ layer only
- **App Router only** — no `getServerSideProps`, no Pages Router
- **Commits:** `feat(contracts): add triage board view` — see scopes in CLAUDE.md
- **Specs first** — read `docs/specs/<feature>/overview.md` before implementing anything
