# Airlock

Enterprise data operations platform. Discord-like interface for contract lifecycle management.

## Quick Start

```bash
# Prerequisites: Node.js >= 20, pnpm 9.x, Python 3.11+, Docker

# Install dependencies
pnpm install
cd apps/api && pip install -e ".[dev]"

# Start infrastructure
docker compose up -d postgres redis

# Start development servers
pnpm dev                    # Next.js at http://localhost:3000
cd apps/api && uvicorn src.main:app --reload  # API at http://localhost:8000
```

## Architecture

```
airlock/
├── apps/
│   ├── web/          Next.js 14 (App Router, TypeScript, Zustand, Tailwind)
│   └── api/          FastAPI (Python, PostgreSQL 16, Redis 7)
├── packages/
│   └── shared-types/ OpenAPI-generated TypeScript client
├── docs/
│   ├── specs/        Design specifications (source of truth)
│   ├── concepts/     Canonical vocabulary and governance
│   └── registry/     Component and schema registries
└── scripts/
    └── seeds/        Deterministic seed data generator
```

## Modules

| Module        | Description                          | Path         |
| ------------- | ------------------------------------ | ------------ |
| **Contracts** | Contract lifecycle management        | `/contracts` |
| **CRM**       | Vault hierarchy as CRM (react-admin) | `/crm`       |
| **Tasks**     | Kanban, table, agenda views          | `/tasks`     |
| **Calendar**  | Schedule computed from vault dates   | `/calendar`  |
| **Documents** | TipTap editor + PDF.js viewer        | `/documents` |
| **Admin**     | System overlay (not a module)        | `/admin`     |

## Vocabulary

| Concept               | Term                                            |
| --------------------- | ----------------------------------------------- |
| Top-level domain      | **Module**                                      |
| Workflow instance     | **Vault**                                       |
| Lifecycle stage       | **Chamber** (Discover > Build > Review > Ship)  |
| Chamber checkpoint    | **Gate**                                        |
| Screen within chamber | **View**                                        |
| Three-panel layout    | **Triptych** (Signal \| Orchestrate \| Control) |

## Commands

```bash
pnpm dev              # Start all dev servers
pnpm build            # Build all packages
pnpm lint             # Lint all packages
pnpm type-check       # TypeScript check
pnpm test             # Run all tests
pnpm test:api         # Run Python tests only
pnpm format           # Format with Prettier
docker compose up     # All services (web, api, postgres, redis, litellm)
docker compose up -d postgres redis  # Infrastructure only
```

## Tech Stack

| Layer      | Technology                                                 |
| ---------- | ---------------------------------------------------------- |
| Frontend   | Next.js 14 (App Router), TypeScript, Zustand, Tailwind CSS |
| Backend    | FastAPI, Python 3.11+, PostgreSQL 16, Redis 7              |
| CRM        | react-admin + Atomic CRM patterns                          |
| AI Runtime | PydanticAI + LiteLLM proxy                                 |
| Infra      | Docker Compose, Turborepo, pnpm workspaces                 |

## Related Repos

- [`airlock-docs`](https://github.com/smartrickpicks/airlock-docs) — Design specifications and HTML prototypes (frozen)
