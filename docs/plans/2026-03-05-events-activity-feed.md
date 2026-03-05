# Events + Activity Feed Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an append-only events system that tracks vault actions and wire it into the Signal panel and home page, making the app feel alive with real activity.

**Architecture:** Immutable `events` table (never UPDATE/DELETE) stores all vault actions. Event service creates records when vaults are created, advanced, or archived. Frontend event store fetches events and pipes them into the Signal panel. Home page shows triage widgets with vault counts per chamber and recent activity feed.

**Tech Stack:** SQLAlchemy 2.0, Alembic, FastAPI, Pydantic, Zustand, Tailwind CSS tokens

---

## Context

**Existing backend:**

- `apps/api/src/models/` — User, Workspace, Vault, VaultMember, UserModuleRole
- `apps/api/src/services/vault.py` — create_vault, advance_chamber, archive_vault
- `apps/api/src/routes/vaults.py` — 7 CRUD endpoints
- `apps/api/src/schemas/vault.py` — Pydantic schemas
- Migration 001 (users/workspaces) + 002 (vaults/vault_members)

**Existing frontend:**

- `apps/web/src/components/organisms/SignalPanel.tsx` — hardcoded 4 signal cards
- `apps/web/src/app/(shell)/page.tsx` — placeholder home page ("Airlock" centered)
- `apps/web/src/stores/vault.store.ts` — vault CRUD + mock fallback
- `apps/web/src/lib/mock-vaults.ts` — 7 mock vaults

**Per CLAUDE.md:** Events are append-only — the events table NEVER has UPDATE or DELETE operations.

**API may not be running.** All frontend fetches need mock fallback for dev preview.

---

### Task 1: Event SQLAlchemy Model

**Files:**

- Create: `apps/api/src/models/event.py`
- Modify: `apps/api/src/models/__init__.py`

**Step 1: Write the model**

Create `apps/api/src/models/event.py`:

```python
"""Event model — append-only audit trail for vault actions."""

from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.db import Base


class Event(Base):
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    vault_id: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    workspace_id: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    actor_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    payload: Mapped[dict] = mapped_column(JSONB, server_default="{}", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

**Step 2: Update models **init**.py**

Add to `apps/api/src/models/__init__.py`:

```python
from src.models.event import Event
```

And update `__all__` to include `"Event"`.

**Step 3: Add smoke test**

Add to `apps/api/tests/test_models.py`:

```python
def test_event_tablename():
    assert Event.__tablename__ == "events"
```

Update imports and `test_all_models_importable` to include Event.

**Step 4: Run tests**

Run: `cd apps/api && source .venv/bin/activate && pytest tests/test_models.py -v`

**Step 5: Commit**

```bash
git add apps/api/src/models/event.py apps/api/src/models/__init__.py apps/api/tests/test_models.py
git commit -m "feat(api): add Event model for append-only audit trail"
```

---

### Task 2: Alembic Migration 003 for Events

**Files:**

- Create: `apps/api/src/migrations/versions/003_add_events.py`
- Modify: `apps/api/src/migrations/env.py`

**Step 1: Write the migration**

Create `apps/api/src/migrations/versions/003_add_events.py`:

```python
"""add events table

Revision ID: 003
Revises: 002
Create Date: 2026-03-05
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "003"
down_revision: str = "002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "events",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("vault_id", sa.Text(), nullable=False),
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("event_type", sa.String(length=50), nullable=False),
        sa.Column("actor_id", sa.Text(), nullable=True),
        sa.Column(
            "payload",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["vault_id"], ["vaults.id"], name="fk_events_vault"),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], name="fk_events_workspace"),
    )
    op.create_index("ix_events_vault_id", "events", ["vault_id"])
    op.create_index("ix_events_workspace_id", "events", ["workspace_id"])
    op.create_index("ix_events_created_at", "events", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_events_created_at", table_name="events")
    op.drop_index("ix_events_workspace_id", table_name="events")
    op.drop_index("ix_events_vault_id", table_name="events")
    op.drop_table("events")
```

**Step 2: Update env.py imports**

In `apps/api/src/migrations/env.py`, update the model imports to include Event:

```python
from src.models import Event, User, UserModuleRole, Vault, VaultMember, Workspace  # noqa: E402, F401
```

**Step 3: Commit**

```bash
git add apps/api/src/migrations/versions/003_add_events.py apps/api/src/migrations/env.py
git commit -m "feat(api): add migration 003 for events table"
```

---

### Task 3: Event Service

**Files:**

- Create: `apps/api/src/services/event.py`
- Create: `apps/api/tests/test_event_service.py`

**Step 1: Write the service**

Create `apps/api/src/services/event.py`:

```python
"""Event service — append-only event creation and querying."""

from sqlalchemy import select
from sqlalchemy.orm import Session
from ulid import ULID

from src.models.event import Event

VALID_EVENT_TYPES = (
    "vault_created",
    "vault_updated",
    "chamber_advanced",
    "vault_archived",
    "member_added",
    "member_removed",
    "gate_cleared",
    "extraction_complete",
)


def create_event(
    db: Session,
    *,
    vault_id: str,
    workspace_id: str,
    event_type: str,
    actor_id: str | None = None,
    payload: dict | None = None,
) -> Event:
    """Create an immutable event record. Events are never updated or deleted."""
    event = Event(
        id=str(ULID()),
        vault_id=vault_id,
        workspace_id=workspace_id,
        event_type=event_type,
        actor_id=actor_id,
        payload=payload or {},
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def list_events_for_vault(
    db: Session,
    vault_id: str,
    *,
    limit: int = 50,
    offset: int = 0,
) -> list[Event]:
    """Get events for a specific vault, newest first."""
    stmt = (
        select(Event)
        .where(Event.vault_id == vault_id)
        .order_by(Event.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(db.execute(stmt).scalars().all())


def list_events_for_workspace(
    db: Session,
    workspace_id: str,
    *,
    limit: int = 50,
    offset: int = 0,
) -> list[Event]:
    """Get recent events across the entire workspace, newest first."""
    stmt = (
        select(Event)
        .where(Event.workspace_id == workspace_id)
        .order_by(Event.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(db.execute(stmt).scalars().all())
```

**Step 2: Write tests**

Create `apps/api/tests/test_event_service.py`:

```python
"""Unit tests for event service constants."""

from src.services.event import VALID_EVENT_TYPES


def test_valid_event_types():
    assert "vault_created" in VALID_EVENT_TYPES
    assert "chamber_advanced" in VALID_EVENT_TYPES
    assert "vault_archived" in VALID_EVENT_TYPES


def test_event_types_are_strings():
    for event_type in VALID_EVENT_TYPES:
        assert isinstance(event_type, str)
        assert len(event_type) > 0
```

**Step 3: Run tests**

Run: `cd apps/api && source .venv/bin/activate && pytest tests/test_event_service.py -v`

**Step 4: Commit**

```bash
git add apps/api/src/services/event.py apps/api/tests/test_event_service.py
git commit -m "feat(api): add event service for append-only audit trail"
```

---

### Task 4: Event Pydantic Schema + Routes

**Files:**

- Create: `apps/api/src/schemas/event.py`
- Create: `apps/api/src/routes/events.py`
- Modify: `apps/api/src/main.py`
- Create: `apps/api/tests/test_event_routes.py`

**Step 1: Write schemas**

Create `apps/api/src/schemas/event.py`:

```python
"""Pydantic schemas for event request/response."""

from datetime import datetime

from pydantic import BaseModel


class EventResponse(BaseModel):
    id: str
    vault_id: str
    workspace_id: str
    event_type: str
    actor_id: str | None
    payload: dict
    created_at: datetime

    model_config = {"from_attributes": True}


class EventListResponse(BaseModel):
    events: list[EventResponse]
    total: int
```

**Step 2: Write routes**

Create `apps/api/src/routes/events.py`:

```python
"""Event routes — read-only access to the audit trail."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from src.db import get_db
from src.middleware.auth import get_current_user
from src.schemas.event import EventListResponse, EventResponse
from src.services.event import list_events_for_vault, list_events_for_workspace

router = APIRouter(prefix="/api/v1/events", tags=["events"])


def _event_to_response(event) -> EventResponse:
    return EventResponse(
        id=event.id,
        vault_id=event.vault_id,
        workspace_id=event.workspace_id,
        event_type=event.event_type,
        actor_id=event.actor_id,
        payload=event.payload,
        created_at=event.created_at,
    )


@router.get("/vault/{vault_id}")
def get_vault_events(
    vault_id: str,
    limit: int = Query(default=50, ge=1, le=200),  # noqa: B008
    offset: int = Query(default=0, ge=0),  # noqa: B008
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> EventListResponse:
    """Get events for a specific vault."""
    events = list_events_for_vault(db, vault_id, limit=limit, offset=offset)
    return EventListResponse(
        events=[_event_to_response(e) for e in events],
        total=len(events),
    )


@router.get("/recent")
def get_recent_events(
    limit: int = Query(default=20, ge=1, le=100),  # noqa: B008
    offset: int = Query(default=0, ge=0),  # noqa: B008
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> EventListResponse:
    """Get recent events across the workspace."""
    workspace_id = current_user.get("workspace_id", "")
    events = list_events_for_workspace(db, workspace_id, limit=limit, offset=offset)
    return EventListResponse(
        events=[_event_to_response(e) for e in events],
        total=len(events),
    )
```

**Step 3: Register router in main.py**

Add import and registration in `apps/api/src/main.py`:

```python
from src.routes.events import router as event_router
```

After `app.include_router(vault_router)`:

```python
    app.include_router(event_router)
```

**Step 4: Write route smoke test**

Create `apps/api/tests/test_event_routes.py`:

```python
"""Smoke tests for event route registration."""

from src.main import app


def test_event_routes_registered():
    paths = [route.path for route in app.routes]
    assert "/api/v1/events/vault/{vault_id}" in paths
    assert "/api/v1/events/recent" in paths
```

**Step 5: Run tests**

Run: `cd apps/api && source .venv/bin/activate && pytest tests/test_event_routes.py -v`

**Step 6: Commit**

```bash
git add apps/api/src/schemas/event.py apps/api/src/routes/events.py apps/api/src/main.py apps/api/tests/test_event_routes.py
git commit -m "feat(api): add event schema and read-only event routes"
```

---

### Task 5: Wire Event Creation into Vault Service

**Files:**

- Modify: `apps/api/src/services/vault.py`
- Modify: `apps/api/src/routes/vaults.py`

Emit events when vaults are created, advanced, or archived. The cleanest approach: add event creation in the route layer after service calls succeed (keeps services focused on domain logic).

**Step 1: Update vault routes to emit events**

In `apps/api/src/routes/vaults.py`, add import:

```python
from src.services.event import create_event
```

Then add event creation after each successful operation:

In `create_vault_route`, after `vault = create_vault(...)`:

```python
    create_event(
        db,
        vault_id=vault.id,
        workspace_id=vault.workspace_id,
        event_type="vault_created",
        actor_id=current_user.get("sub"),
        payload={"name": vault.name, "vault_type": vault.vault_type, "chamber": vault.chamber},
    )
```

In `advance_chamber_route`, after `vault = advance_chamber(...)`:

```python
    create_event(
        db,
        vault_id=vault.id,
        workspace_id=vault.workspace_id,
        event_type="chamber_advanced",
        actor_id=current_user.get("sub"),
        payload={"chamber": vault.chamber, "gate": vault.gate},
    )
```

In `archive_vault_route`, after `vault = archive_vault(...)`:

```python
    create_event(
        db,
        vault_id=vault.id,
        workspace_id=vault.workspace_id,
        event_type="vault_archived",
        actor_id=current_user.get("sub"),
        payload={"name": vault.name},
    )
```

**Step 2: Run tests**

Run: `cd apps/api && source .venv/bin/activate && pytest tests/ -v`

**Step 3: Commit**

```bash
git add apps/api/src/routes/vaults.py
git commit -m "feat(api): emit events on vault create, advance, and archive"
```

---

### Task 6: Mock Events + Frontend Event Store

**Files:**

- Create: `apps/web/src/lib/mock-events.ts`
- Create: `apps/web/src/stores/event.store.ts`

**Step 1: Write mock events**

Create `apps/web/src/lib/mock-events.ts`:

```typescript
/**
 * Mock event data for dev preview when API is not running.
 */

export interface MockEvent {
  id: string;
  vault_id: string;
  workspace_id: string;
  event_type: string;
  actor_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

function minutesAgo(n: number): string {
  return new Date(Date.now() - n * 60 * 1000).toISOString();
}

export const MOCK_EVENTS: MockEvent[] = [
  {
    id: "evt_001",
    vault_id: "vault_006",
    workspace_id: "ws_dev",
    event_type: "chamber_advanced",
    actor_id: "dev_user_001",
    payload: {
      chamber: "review",
      gate: "gate_gatekeeper",
      vault_name: "Universal Amendment #3",
    },
    created_at: minutesAgo(2),
  },
  {
    id: "evt_002",
    vault_id: "vault_004",
    workspace_id: "ws_dev",
    event_type: "extraction_complete",
    actor_id: null,
    payload: {
      fields_extracted: 14,
      confidence: 0.92,
      vault_name: "Sony-BigBooty Dist Agreement",
    },
    created_at: minutesAgo(8),
  },
  {
    id: "evt_003",
    vault_id: "vault_001",
    workspace_id: "ws_dev",
    event_type: "vault_created",
    actor_id: "dev_user_001",
    payload: {
      name: "Henderson MSA",
      vault_type: "contract",
      chamber: "discover",
    },
    created_at: minutesAgo(15),
  },
  {
    id: "evt_004",
    vault_id: "vault_005",
    workspace_id: "ws_dev",
    event_type: "gate_cleared",
    actor_id: null,
    payload: { gate: "gate_preflight", vault_name: "Atlantic Sync License" },
    created_at: minutesAgo(23),
  },
  {
    id: "evt_005",
    vault_id: "vault_007",
    workspace_id: "ws_dev",
    event_type: "chamber_advanced",
    actor_id: "dev_user_001",
    payload: {
      chamber: "ship",
      gate: "gate_export",
      vault_name: "BMG Catalog Transfer",
    },
    created_at: minutesAgo(45),
  },
  {
    id: "evt_006",
    vault_id: "vault_002",
    workspace_id: "ws_dev",
    event_type: "vault_created",
    actor_id: "dev_user_001",
    payload: {
      name: "Warner Distribution Q2",
      vault_type: "contract",
      chamber: "discover",
    },
    created_at: minutesAgo(120),
  },
];
```

**Step 2: Write event store**

Create `apps/web/src/stores/event.store.ts`:

```typescript
import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import { MOCK_EVENTS } from "@/lib/mock-events";

interface VaultEvent {
  id: string;
  vault_id: string;
  workspace_id: string;
  event_type: string;
  actor_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

interface EventListResponse {
  events: VaultEvent[];
  total: number;
}

interface EventState {
  events: VaultEvent[];
  isLoading: boolean;
  error: string | null;

  /** Fetch events for a specific vault */
  fetchVaultEvents: (vaultId: string) => Promise<void>;
  /** Fetch recent events across the workspace */
  fetchRecentEvents: () => Promise<void>;
}

export const useEventStore = create<EventState>((set) => ({
  events: [],
  isLoading: false,
  error: null,

  fetchVaultEvents: async (vaultId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiFetch<EventListResponse>(
        `/api/v1/events/vault/${vaultId}`,
      );
      set({ events: data.events, isLoading: false });
    } catch {
      const filtered = (MOCK_EVENTS as VaultEvent[]).filter(
        (e) => e.vault_id === vaultId,
      );
      set({ events: filtered, isLoading: false, error: null });
    }
  },

  fetchRecentEvents: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiFetch<EventListResponse>("/api/v1/events/recent");
      set({ events: data.events, isLoading: false });
    } catch {
      set({
        events: MOCK_EVENTS as VaultEvent[],
        isLoading: false,
        error: null,
      });
    }
  },
}));

export type { VaultEvent };
```

**Step 3: Commit**

```bash
git add apps/web/src/lib/mock-events.ts apps/web/src/stores/event.store.ts
git commit -m "feat(web): add mock events and event Zustand store"
```

---

### Task 7: Wire Signal Panel to Event Store

**Files:**

- Modify: `apps/web/src/components/organisms/SignalPanel.tsx`

Replace the hardcoded signal cards with real events from the event store.

**Step 1: Rewrite SignalPanel**

Replace `apps/web/src/components/organisms/SignalPanel.tsx` with:

```tsx
"use client";

import { useEffect } from "react";
import { Bell, MessageSquare, Bot } from "lucide-react";
import { useEventStore } from "@/stores/event.store";
import type { VaultEvent } from "@/stores/event.store";

interface SignalPanelProps {
  width: number;
  collapsed: boolean;
  onOverlayToggle: () => void;
  vaultId?: string;
}

const EVENT_STYLES: Record<string, { border: string; label: string }> = {
  vault_created: { border: "border-l-accent-primary", label: "Vault Created" },
  vault_updated: {
    border: "border-l-accent-secondary",
    label: "Vault Updated",
  },
  chamber_advanced: {
    border: "border-l-gate-green",
    label: "Chamber Advanced",
  },
  vault_archived: { border: "border-l-gate-red", label: "Vault Archived" },
  gate_cleared: { border: "border-l-gate-green", label: "Gate Cleared" },
  extraction_complete: {
    border: "border-l-accent-secondary",
    label: "Extraction Complete",
  },
  member_added: { border: "border-l-accent-primary", label: "Member Added" },
};

function formatTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getEventDescription(event: VaultEvent): string {
  const p = event.payload;
  switch (event.event_type) {
    case "vault_created":
      return `New ${(p.vault_type as string) || "vault"}: "${(p.name as string) || ""}"`;
    case "chamber_advanced":
      return `Moved to ${(p.chamber as string) || "next chamber"} — ${((p.vault_name as string) || "").slice(0, 40)}`;
    case "vault_archived":
      return `Archived: "${(p.name as string) || ""}"`;
    case "gate_cleared":
      return `${((p.gate as string) || "").replace("gate_", "")} passed — ${(p.vault_name as string) || ""}`;
    case "extraction_complete":
      return `${(p.fields_extracted as number) || 0} fields extracted (${Math.round(((p.confidence as number) || 0) * 100)}% avg)`;
    default:
      return event.event_type.replace(/_/g, " ");
  }
}

export default function SignalPanel({
  width,
  collapsed,
  onOverlayToggle,
  vaultId,
}: SignalPanelProps) {
  const { events, fetchVaultEvents, fetchRecentEvents } = useEventStore();

  useEffect(() => {
    if (vaultId) {
      fetchVaultEvents(vaultId);
    } else {
      fetchRecentEvents();
    }
  }, [vaultId, fetchVaultEvents, fetchRecentEvents]);

  if (collapsed) {
    return (
      <div
        className="flex h-full flex-shrink-0 flex-col items-center gap-3 border-r border-surface-border bg-surface-raised pt-4"
        style={{ width }}
      >
        <button
          onClick={onOverlayToggle}
          className="cursor-pointer text-text-muted transition-colors duration-fast hover:text-text-secondary"
          aria-label="Open notifications"
        >
          <Bell size={20} />
        </button>
        <button
          onClick={onOverlayToggle}
          className="cursor-pointer text-text-muted transition-colors duration-fast hover:text-text-secondary"
          aria-label="Open messages"
        >
          <MessageSquare size={20} />
        </button>
        <button
          onClick={onOverlayToggle}
          className="cursor-pointer text-text-muted transition-colors duration-fast hover:text-text-secondary"
          aria-label="Open AI agent"
        >
          <Bot size={20} />
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex h-full flex-shrink-0 flex-col overflow-hidden border-r border-surface-border bg-surface-raised"
      style={{ width }}
    >
      <div className="flex h-10 flex-shrink-0 items-center px-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Signal
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {events.length === 0 ? (
          <p className="py-4 text-center text-xs text-text-muted">
            No events yet
          </p>
        ) : (
          events.map((event) => {
            const style = EVENT_STYLES[event.event_type] || {
              border: "border-l-surface-border",
              label: event.event_type,
            };
            return (
              <div
                key={event.id}
                className={`relative mb-2 rounded-md border-l-[3px] bg-surface-overlay p-3 ${style.border}`}
              >
                <h4 className="pr-14 text-[13px] font-semibold text-text-primary">
                  {style.label}
                </h4>
                <p className="mt-1 text-xs text-text-muted">
                  {getEventDescription(event)}
                </p>
                <span className="absolute right-3 top-3 font-mono text-[11px] text-text-muted">
                  {formatTimeAgo(event.created_at)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
```

**Step 2: Update TriptychLayout to pass vaultId to SignalPanel**

In `apps/web/src/components/templates/TriptychLayout.tsx`, find where `SignalPanel` is rendered. Add the `vaultId` prop:

```tsx
<SignalPanel
  width={signalVisible ? signalWidth : COLLAPSED_WIDTH}
  collapsed={!signalVisible}
  onOverlayToggle={...}
  vaultId={vaultId}
/>
```

Do this for BOTH instances of SignalPanel (the inline one and the overlay one).

**Step 3: Commit**

```bash
git add apps/web/src/components/organisms/SignalPanel.tsx apps/web/src/components/templates/TriptychLayout.tsx
git commit -m "feat(web): wire Signal panel to event store with real events"
```

---

### Task 8: Home Page with Triage Widgets

**Files:**

- Modify: `apps/web/src/app/(shell)/page.tsx`

Build a useful home page with vault counts per chamber and recent activity feed.

**Step 1: Write the home page**

Replace `apps/web/src/app/(shell)/page.tsx` with:

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import GateDot from "@/components/atoms/GateDot";
import { useAuthStore } from "@/stores/auth.store";
import { useVaultStore } from "@/stores/vault.store";
import { useEventStore } from "@/stores/event.store";
import type { VaultEvent } from "@/stores/event.store";

const CHAMBERS = ["discover", "build", "review", "ship"] as const;

const CHAMBER_LABELS: Record<string, string> = {
  discover: "Discover",
  build: "Build",
  review: "Review",
  ship: "Ship",
};

function formatTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function eventSummary(event: VaultEvent): string {
  const p = event.payload;
  switch (event.event_type) {
    case "vault_created":
      return `Created "${(p.name as string) || "vault"}"`;
    case "chamber_advanced":
      return `${(p.vault_name as string) || "Vault"} → ${(p.chamber as string) || ""}`;
    case "vault_archived":
      return `Archived "${(p.name as string) || ""}"`;
    case "gate_cleared":
      return `Gate cleared: ${(p.vault_name as string) || ""}`;
    case "extraction_complete":
      return `Extraction: ${(p.fields_extracted as number) || 0} fields`;
    default:
      return event.event_type.replace(/_/g, " ");
  }
}

export default function Home() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { vaults, fetchVaults } = useVaultStore();
  const { events, fetchRecentEvents } = useEventStore();

  useEffect(() => {
    fetchVaults({ module_type: "contracts" });
    fetchRecentEvents();
  }, [fetchVaults, fetchRecentEvents]);

  const chamberCounts = CHAMBERS.reduce(
    (acc, chamber) => {
      acc[chamber] = vaults.filter((v) => v.chamber === chamber).length;
      return acc;
    },
    {} as Record<string, number>,
  );

  const totalVaults = vaults.length;

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-4xl">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary">
            {user ? `Welcome, ${user.name}` : "Welcome to Airlock"}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {totalVaults} active contracts across {CHAMBERS.length} chambers
          </p>
        </div>

        {/* Chamber status cards */}
        <div className="mb-8 grid grid-cols-4 gap-4">
          {CHAMBERS.map((chamber) => (
            <button
              key={chamber}
              onClick={() => router.push("/contracts/triage")}
              className="rounded-lg border border-surface-border bg-surface-raised p-4 text-left transition-colors hover:border-accent-primary/30 hover:bg-surface-overlay"
            >
              <div className="flex items-center gap-2">
                <GateDot gate={chamber} />
                <span className="text-sm font-medium capitalize text-text-secondary">
                  {CHAMBER_LABELS[chamber]}
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-text-primary">
                {chamberCounts[chamber]}
              </p>
            </button>
          ))}
        </div>

        {/* Recent activity */}
        <div className="rounded-lg border border-surface-border bg-surface-raised">
          <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
            <h2 className="text-sm font-semibold text-text-primary">
              Recent Activity
            </h2>
            <span className="text-xs text-text-muted">
              {events.length} events
            </span>
          </div>
          <div className="divide-y divide-surface-border">
            {events.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-text-muted">
                No recent activity
              </p>
            ) : (
              events.slice(0, 10).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-overlay">
                      <GateDot
                        gate={
                          (event.payload.chamber as
                            | "discover"
                            | "build"
                            | "review"
                            | "ship") || "discover"
                        }
                      />
                    </div>
                    <div>
                      <p className="text-sm text-text-primary">
                        {eventSummary(event)}
                      </p>
                      <p className="text-xs text-text-muted">
                        {event.event_type.replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-text-muted">
                    {formatTimeAgo(event.created_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
```

**Step 2: Commit**

```bash
git add "apps/web/src/app/(shell)/page.tsx"
git commit -m "feat(web): build home page with chamber stats and activity feed"
```

---

### Task 9: Lint + Type-Check + Test Verification

**Step 1: Run backend tests**

Run: `cd apps/api && source .venv/bin/activate && pytest tests/ -v`
Expected: All tests pass

**Step 2: Run backend lint**

Run: `cd apps/api && source .venv/bin/activate && ruff check src/ tests/`
Expected: All checks passed

**Step 3: Run frontend type-check**

Run: `cd apps/web && source ~/.nvm/nvm.sh && nvm use 20 && npx tsc --noEmit`
Expected: No errors

**Step 4: Fix any issues and commit if needed**

---

## Summary

| Task | Component            | What It Does                                   |
| ---- | -------------------- | ---------------------------------------------- |
| 1    | Event model          | Append-only SQLAlchemy model for audit trail   |
| 2    | Migration 003        | Creates events table with indexes              |
| 3    | Event service        | create_event, list by vault, list by workspace |
| 4    | Event routes         | GET /events/vault/{id}, GET /events/recent     |
| 5    | Vault event emission | Events created on vault create/advance/archive |
| 6    | Frontend event store | Zustand store + mock events for dev preview    |
| 7    | Signal panel wiring  | Real events replace hardcoded cards            |
| 8    | Home page            | Chamber stats cards + recent activity feed     |
| 9    | Verification         | Lint + type-check + tests                      |

**After this milestone:**

- Every vault action creates an audit trail event
- Signal panel shows real events (per-vault when viewing a vault, workspace-wide otherwise)
- Home page shows chamber distribution and recent activity
- Full mock data layer for dev preview without API
