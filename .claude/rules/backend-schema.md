# Backend Schema Development — Tier 2 Context

## Before You Start

1. Read the relevant spec in `docs/specs/<feature>/overview.md`
2. Read `docs/concepts/00-glossary.mdx` for canonical vocabulary
3. Read `apps/api/CLAUDE.md` for backend conventions
4. Check `docs/registry/schema.json` for existing entities

## Architecture Layers

```
Route (HTTP) → Service (business logic) → Model (data access)
```

- **Routes** handle request/response, validation, auth checks
- **Services** contain all business logic, orchestrate models
- **Models** define Pydantic schemas + SQLAlchemy ORM classes
- **NEVER** put business logic in route handlers

## Database Conventions

- PostgreSQL 16 with ULID primary keys (TEXT type, not UUID)
- JSONB metadata on most tables for flexible schema
- Soft deletes via `deleted_at` TIMESTAMP column (never hard delete)
- Row-Level Security (RLS) via `workspace_id` for tenant isolation
- All timestamps in UTC, stored as TIMESTAMP WITH TIME ZONE

## Creating a New Table

1. Define SQLAlchemy model in `src/models/<entity>.py`
2. Define Pydantic request/response schemas in the same file
3. Create Alembic migration: `alembic revision --autogenerate -m "add <table>"`
4. Verify migration is reversible (has both `upgrade()` and `downgrade()`)
5. Update `docs/registry/schema.json` with the new entity
6. Regenerate OpenAPI spec → triggers TypeScript type generation

## Required Columns (Every Table)

| Column         | Type        | Notes                                   |
| -------------- | ----------- | --------------------------------------- |
| `id`           | TEXT (ULID) | Primary key, generated in application   |
| `workspace_id` | TEXT (ULID) | Foreign key to workspaces, used for RLS |
| `created_at`   | TIMESTAMPTZ | Default: now()                          |
| `updated_at`   | TIMESTAMPTZ | Default: now(), auto-update on modify   |
| `deleted_at`   | TIMESTAMPTZ | NULL = active, set = soft-deleted       |
| `metadata`     | JSONB       | Flexible key-value store, default: {}   |

## Event Storage (Append-Only)

Events are immutable records. The `events` table NEVER has UPDATE or DELETE operations.

```python
class Event(Base):
    __tablename__ = "events"
    id: str              # ULID
    vault_id: str        # FK to vaults
    workspace_id: str    # For RLS
    event_type: str      # extraction, patch, approval, etc.
    actor_id: str        # FK to users
    payload: dict        # JSONB — event-specific data
    created_at: datetime # Immutable
```

## Porting from OrcestrateOS

Source at `/Users/zacharyholwerda/Desktop/OrcestrateOS-sync/`. When porting:

- Refactor synchronous code to async (FastAPI is async-first)
- Add type hints to all function signatures
- Split monolithic files into modules (route / service / model)
- Replace raw SQL with SQLAlchemy queries
- Replace `print()` debugging with structured logging

## Testing

- pytest with `conftest.py` fixtures
- Test database with migrations applied
- Deterministic seed data via `Faker.seed(42)`
- Test each layer independently: unit tests for services, integration for routes
