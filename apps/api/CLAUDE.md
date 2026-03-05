# Airlock API — FastAPI (Python)

## Rules

- **Route > Service > Model** layering — routes call services, services use models
- **No business logic in routes** — routes handle HTTP, services handle logic
- **Pydantic models** for all request/response validation
- **Alembic** for migrations — never raw SQL in route handlers
- **JSONB** for vault metadata — flexible schema per module
- **Append-only** for event storage — events are immutable

## Directory Structure

```
src/
  main.py          # FastAPI app factory, middleware, CORS
  config.py        # Pydantic BaseSettings (env vars)
  routes/          # API route modules (one per domain)
  engines/         # Ported from OrcestrateOS
    extraction/    # 7 extractors + dispatcher
    preflight/     # Quality gates, risk scoring
    generation/    # Contract clause selection + interpolation
  models/          # Pydantic + SQLAlchemy models
  services/        # Business logic layer
  migrations/      # Alembic migration files
  middleware/      # Auth, CORS, rate limiting
```

## Porting from OrcestrateOS

Source at `/Users/zacharyholwerda/Desktop/OrcestrateOS-sync/`. Key files:

- `server/extraction/` → `engines/extraction/` (1,715 LOC)
- `server/preflight_engine.py` → `engines/preflight/` (3,908 LOC)
- `server/generation/` → `engines/generation/` (3,024 LOC)
- `rules/generation/clause_library_v2.json` → `rules/generation/` (172 clauses)

When porting: refactor for async, add type hints, split monolithic files into modules.

## Database

- PostgreSQL 16 with ULID primary keys (TEXT)
- JSONB metadata on most tables
- Soft deletes via `deleted_at` timestamp
- Row-Level Security (RLS) via `workspace_id` for tenant isolation

## Auth

- Custom JWT + Google OAuth (ported from OrcestrateOS)
- Three role layers: Org Role, Module Role, Agentic Role
- Module roles: Builder, Gatekeeper, Owner, Designer, Viewer

## Testing

- pytest with `conftest.py` fixtures
- Test database with migrations applied
- Deterministic seed data via `Faker.seed(42)`
