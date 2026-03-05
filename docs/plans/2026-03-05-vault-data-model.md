# Vault Data Model + CRUD Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the Vault data model (hierarchical 4-level tree), vault members table, CRUD API routes, service layer, and frontend Zustand store — the core data backbone for all modules.

**Architecture:** Self-referential `vaults` table with `parent_vault_id` for the 4-level hierarchy (Parent > Division > Counterparty > Item). Only level-4 item vaults progress through chambers. Route > Service > Model layering on backend. Zustand store on frontend consuming the API via `apiFetch`. Soft deletes via `archived_at`.

**Tech Stack:** SQLAlchemy 2.0 (mapped_column), Alembic migrations, FastAPI routes + Pydantic schemas, pytest, Zustand, TypeScript

---

## Context

**Existing tables (migration 001):** `workspaces`, `users`, `user_module_roles`

**Existing backend patterns:** See `apps/api/src/models/user.py` for column style (ULID TEXT PKs, JSONB metadata, server_default=func.now(), mapped_column). See `apps/api/src/services/auth.py` for service pattern. See `apps/api/src/routes/auth.py` for route pattern (APIRouter with prefix, Pydantic request/response, Depends for db/auth).

**Spec source of truth:** `docs/specs/vault-hierarchy/overview.md` and `docs/specs/shell/universal-chambers.md`

**Vocabulary:** Vault (workflow instance), Chamber (lifecycle stage: discover/build/review/ship), Gate (checkpoint within chamber), Module (top-level domain: contracts/crm/tasks/calendar/documents)

**Note on Postgres:** If Postgres is not running locally, write migrations manually (don't use autogenerate). Tests that need a real DB can be skipped until infra is available — write import/smoke tests that work without DB.

---

### Task 1: Vault SQLAlchemy Model

**Files:**

- Create: `apps/api/src/models/vault.py`
- Modify: `apps/api/src/models/__init__.py`

**Step 1: Write the model**

Create `apps/api/src/models/vault.py`:

```python
"""Vault model — hierarchical work container (4-level tree)."""

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Float, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.db import Base


class Vault(Base):
    __tablename__ = "vaults"
    __table_args__ = (
        UniqueConstraint("workspace_id", "slug", name="uq_vaults_workspace_slug"),
        CheckConstraint("vault_level BETWEEN 1 AND 4", name="ck_vaults_level_range"),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    workspace_id: Mapped[str] = mapped_column(Text, nullable=False, index=True)

    # Hierarchy
    parent_vault_id: Mapped[str | None] = mapped_column(Text, nullable=True, index=True)
    vault_level: Mapped[int] = mapped_column(Integer, nullable=False, default=4)

    # Identity
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), nullable=False)
    vault_type: Mapped[str] = mapped_column(String(50), nullable=False)
    module_type: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # State (item vaults only — NULL for levels 1-3)
    chamber: Mapped[str | None] = mapped_column(String(20), nullable=True, default="discover")
    gate: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Metrics
    metadata_: Mapped[dict] = mapped_column("metadata", JSONB, server_default="{}", nullable=False)
    health_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
```

**Step 2: Update models **init**.py**

Add `Vault` to `apps/api/src/models/__init__.py`:

```python
"""Airlock ORM models."""

from src.models.user import User
from src.models.user_module_role import UserModuleRole
from src.models.vault import Vault
from src.models.workspace import Workspace

__all__ = ["User", "UserModuleRole", "Vault", "Workspace"]
```

**Step 3: Write smoke test**

Add to `apps/api/tests/test_models.py`:

```python
from src.models import Vault

def test_vault_tablename():
    assert Vault.__tablename__ == "vaults"
```

**Step 4: Run tests**

Run: `cd apps/api && python -m pytest tests/test_models.py -v`
Expected: All tests PASS (including existing user/workspace tests)

**Step 5: Commit**

```bash
git add apps/api/src/models/vault.py apps/api/src/models/__init__.py apps/api/tests/test_models.py
git commit -m "feat(api): add Vault SQLAlchemy model"
```

---

### Task 2: VaultMember SQLAlchemy Model

**Files:**

- Create: `apps/api/src/models/vault_member.py`
- Modify: `apps/api/src/models/__init__.py`

**Step 1: Write the model**

Create `apps/api/src/models/vault_member.py`:

```python
"""VaultMember model — per-vault access control with inheritance."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from src.db import Base


class VaultMember(Base):
    __tablename__ = "vault_members"

    vault_id: Mapped[str] = mapped_column(Text, primary_key=True)
    user_id: Mapped[str] = mapped_column(Text, primary_key=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False, server_default="viewer")
    inherited: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

**Step 2: Update models **init**.py**

```python
"""Airlock ORM models."""

from src.models.user import User
from src.models.user_module_role import UserModuleRole
from src.models.vault import Vault
from src.models.vault_member import VaultMember
from src.models.workspace import Workspace

__all__ = ["User", "UserModuleRole", "Vault", "VaultMember", "Workspace"]
```

**Step 3: Write smoke test**

Add to `apps/api/tests/test_models.py`:

```python
from src.models import VaultMember

def test_vault_member_tablename():
    assert VaultMember.__tablename__ == "vault_members"
```

**Step 4: Run tests**

Run: `cd apps/api && python -m pytest tests/test_models.py -v`
Expected: All PASS

**Step 5: Commit**

```bash
git add apps/api/src/models/vault_member.py apps/api/src/models/__init__.py apps/api/tests/test_models.py
git commit -m "feat(api): add VaultMember model for per-vault access control"
```

---

### Task 3: Alembic Migration for vaults + vault_members

**Files:**

- Create: `apps/api/src/migrations/versions/002_add_vaults_and_vault_members.py`
- Modify: `apps/api/src/migrations/env.py` (add imports)

**Step 1: Write the migration**

Create `apps/api/src/migrations/versions/002_add_vaults_and_vault_members.py`:

```python
"""add vaults and vault_members tables

Revision ID: 002
Revises: 001
Create Date: 2026-03-05
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "002"
down_revision: str = "001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "vaults",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("parent_vault_id", sa.Text(), nullable=True),
        sa.Column("vault_level", sa.Integer(), nullable=False, server_default="4"),
        sa.Column("name", sa.String(length=500), nullable=False),
        sa.Column("slug", sa.String(length=255), nullable=False),
        sa.Column("vault_type", sa.String(length=50), nullable=False),
        sa.Column("module_type", sa.String(length=50), nullable=True),
        sa.Column("chamber", sa.String(length=20), nullable=True, server_default="discover"),
        sa.Column("gate", sa.String(length=50), nullable=True),
        sa.Column(
            "metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("health_score", sa.Float(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], name="fk_vaults_workspace"),
        sa.ForeignKeyConstraint(
            ["parent_vault_id"], ["vaults.id"], name="fk_vaults_parent", ondelete="SET NULL"
        ),
        sa.UniqueConstraint("workspace_id", "slug", name="uq_vaults_workspace_slug"),
        sa.CheckConstraint("vault_level BETWEEN 1 AND 4", name="ck_vaults_level_range"),
    )
    op.create_index("ix_vaults_workspace_id", "vaults", ["workspace_id"])
    op.create_index("ix_vaults_parent_vault_id", "vaults", ["parent_vault_id"])
    op.create_index("ix_vaults_workspace_module", "vaults", ["workspace_id", "module_type"])
    op.create_index("ix_vaults_workspace_level", "vaults", ["workspace_id", "vault_level"])

    op.create_table(
        "vault_members",
        sa.Column("vault_id", sa.Text(), nullable=False),
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False, server_default="viewer"),
        sa.Column("inherited", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "assigned_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("vault_id", "user_id"),
        sa.ForeignKeyConstraint(["vault_id"], ["vaults.id"], name="fk_vault_members_vault", ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_vault_members_user"),
    )


def downgrade() -> None:
    op.drop_table("vault_members")
    op.drop_index("ix_vaults_workspace_level", table_name="vaults")
    op.drop_index("ix_vaults_workspace_module", table_name="vaults")
    op.drop_index("ix_vaults_parent_vault_id", table_name="vaults")
    op.drop_index("ix_vaults_workspace_id", table_name="vaults")
    op.drop_table("vaults")
```

**Step 2: Update env.py imports**

In `apps/api/src/migrations/env.py`, update the model imports to include Vault and VaultMember:

```python
from src.models import User, UserModuleRole, Vault, VaultMember, Workspace  # noqa: E402, F401
```

**Step 3: Commit**

```bash
git add apps/api/src/migrations/versions/002_add_vaults_and_vault_members.py apps/api/src/migrations/env.py
git commit -m "feat(api): add migration 002 for vaults and vault_members tables"
```

**Note:** Run `cd apps/api && alembic upgrade head` when Postgres is available to apply.

---

### Task 4: Vault Service Layer

**Files:**

- Create: `apps/api/src/services/vault.py`
- Create: `apps/api/tests/test_vault_service.py`

**Step 1: Write the service**

Create `apps/api/src/services/vault.py`:

```python
"""Vault service — business logic for vault CRUD and hierarchy."""

import re

from sqlalchemy import select
from sqlalchemy.orm import Session
from ulid import ULID

from src.models.vault import Vault
from src.models.vault_member import VaultMember

VALID_CHAMBERS = ("discover", "build", "review", "ship")
CHAMBER_ORDER = {c: i for i, c in enumerate(VALID_CHAMBERS)}

VALID_VAULT_TYPES = ("entity", "division", "counterparty", "contract", "task", "document")
VALID_MODULE_TYPES = ("contracts", "crm", "tasks", "calendar", "documents")
VALID_MEMBER_ROLES = ("owner", "gatekeeper", "builder", "viewer")

GATES_BY_CHAMBER: dict[str, list[str]] = {
    "discover": ["gate_ingest", "gate_triage"],
    "build": ["gate_extract", "gate_preflight", "gate_enrich"],
    "review": ["gate_builder", "gate_gatekeeper", "gate_owner"],
    "ship": ["gate_export", "gate_sync"],
}


def slugify(name: str) -> str:
    """Convert a name to a URL-friendly slug."""
    slug = name.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug.strip("-")


def create_vault(
    db: Session,
    *,
    workspace_id: str,
    name: str,
    vault_type: str,
    vault_level: int = 4,
    parent_vault_id: str | None = None,
    module_type: str | None = None,
    metadata: dict | None = None,
    creator_id: str | None = None,
) -> Vault:
    """Create a new vault and optionally add the creator as owner."""
    slug = slugify(name)

    # Ensure slug uniqueness within workspace
    base_slug = slug
    counter = 1
    while True:
        exists = db.execute(
            select(Vault).where(Vault.workspace_id == workspace_id, Vault.slug == slug)
        ).scalar_one_or_none()
        if exists is None:
            break
        slug = f"{base_slug}-{counter}"
        counter += 1

    # Only item vaults (level 4) get chamber state
    chamber = "discover" if vault_level == 4 else None
    gate = "gate_ingest" if vault_level == 4 else None

    vault = Vault(
        id=str(ULID()),
        workspace_id=workspace_id,
        parent_vault_id=parent_vault_id,
        vault_level=vault_level,
        name=name,
        slug=slug,
        vault_type=vault_type,
        module_type=module_type,
        chamber=chamber,
        gate=gate,
        metadata_=metadata or {},
    )
    db.add(vault)

    if creator_id:
        member = VaultMember(vault_id=vault.id, user_id=creator_id, role="owner")
        db.add(member)

    db.commit()
    db.refresh(vault)
    return vault


def get_vault(db: Session, vault_id: str, workspace_id: str) -> Vault | None:
    """Get a single vault by ID within a workspace (excludes archived)."""
    stmt = select(Vault).where(
        Vault.id == vault_id,
        Vault.workspace_id == workspace_id,
        Vault.archived_at.is_(None),
    )
    return db.execute(stmt).scalar_one_or_none()


def list_vaults(
    db: Session,
    workspace_id: str,
    *,
    module_type: str | None = None,
    vault_level: int | None = None,
    chamber: str | None = None,
    parent_vault_id: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Vault]:
    """List vaults with optional filters. Excludes archived."""
    stmt = select(Vault).where(
        Vault.workspace_id == workspace_id,
        Vault.archived_at.is_(None),
    )
    if module_type:
        stmt = stmt.where(Vault.module_type == module_type)
    if vault_level is not None:
        stmt = stmt.where(Vault.vault_level == vault_level)
    if chamber:
        stmt = stmt.where(Vault.chamber == chamber)
    if parent_vault_id is not None:
        stmt = stmt.where(Vault.parent_vault_id == parent_vault_id)

    stmt = stmt.order_by(Vault.updated_at.desc()).limit(limit).offset(offset)
    return list(db.execute(stmt).scalars().all())


def get_vault_children(db: Session, vault_id: str, workspace_id: str) -> list[Vault]:
    """Get direct children of a vault."""
    stmt = (
        select(Vault)
        .where(
            Vault.parent_vault_id == vault_id,
            Vault.workspace_id == workspace_id,
            Vault.archived_at.is_(None),
        )
        .order_by(Vault.vault_level, Vault.name)
    )
    return list(db.execute(stmt).scalars().all())


def update_vault(
    db: Session,
    vault: Vault,
    *,
    name: str | None = None,
    metadata: dict | None = None,
    parent_vault_id: str | None = ...,  # sentinel: ... means "not provided"
) -> Vault:
    """Update vault fields. Pass parent_vault_id=None to unlink, omit to leave unchanged."""
    if name is not None:
        vault.name = name
    if metadata is not None:
        vault.metadata_ = metadata
    if parent_vault_id is not ...:
        vault.parent_vault_id = parent_vault_id

    db.commit()
    db.refresh(vault)
    return vault


def advance_chamber(db: Session, vault: Vault) -> Vault:
    """Advance an item vault to the next chamber. Returns updated vault.

    Raises ValueError if vault is not level 4 or already at final chamber.
    """
    if vault.vault_level != 4:
        raise ValueError("Only item vaults (level 4) have chambers")
    if vault.chamber is None or vault.chamber not in CHAMBER_ORDER:
        raise ValueError(f"Invalid chamber: {vault.chamber}")

    current_idx = CHAMBER_ORDER[vault.chamber]
    if current_idx >= len(VALID_CHAMBERS) - 1:
        raise ValueError("Vault is already in the final chamber (ship)")

    next_chamber = VALID_CHAMBERS[current_idx + 1]
    vault.chamber = next_chamber
    vault.gate = GATES_BY_CHAMBER[next_chamber][0]  # First gate of next chamber

    db.commit()
    db.refresh(vault)
    return vault


def archive_vault(db: Session, vault: Vault) -> Vault:
    """Soft-delete a vault by setting archived_at."""
    from datetime import datetime, timezone

    vault.archived_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(vault)
    return vault
```

**Step 2: Write unit tests**

Create `apps/api/tests/test_vault_service.py`:

```python
"""Unit tests for vault service — logic tests that don't need a database."""

from src.services.vault import (
    CHAMBER_ORDER,
    GATES_BY_CHAMBER,
    VALID_CHAMBERS,
    VALID_VAULT_TYPES,
    slugify,
)


def test_slugify_basic():
    assert slugify("Henderson MSA") == "henderson-msa"


def test_slugify_special_chars():
    assert slugify("Sony-BigBooty Dist. Agreement (2026)") == "sony-bigbooty-dist-agreement-2026"


def test_slugify_extra_spaces():
    assert slugify("  lots   of   spaces  ") == "lots-of-spaces"


def test_valid_chambers_order():
    assert VALID_CHAMBERS == ("discover", "build", "review", "ship")


def test_chamber_order_indices():
    assert CHAMBER_ORDER["discover"] == 0
    assert CHAMBER_ORDER["ship"] == 3


def test_gates_exist_for_all_chambers():
    for chamber in VALID_CHAMBERS:
        assert chamber in GATES_BY_CHAMBER
        assert len(GATES_BY_CHAMBER[chamber]) > 0


def test_valid_vault_types():
    assert "contract" in VALID_VAULT_TYPES
    assert "entity" in VALID_VAULT_TYPES
```

**Step 3: Run tests**

Run: `cd apps/api && python -m pytest tests/test_vault_service.py -v`
Expected: All PASS

**Step 4: Commit**

```bash
git add apps/api/src/services/vault.py apps/api/tests/test_vault_service.py
git commit -m "feat(api): add vault service layer with CRUD + chamber progression"
```

---

### Task 5: Vault Pydantic Schemas

**Files:**

- Create: `apps/api/src/schemas/vault.py`

**Step 1: Write the schemas**

Create `apps/api/src/schemas/vault.py`:

```python
"""Pydantic schemas for vault request/response validation."""

from datetime import datetime

from pydantic import BaseModel, Field


class CreateVaultRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=500)
    vault_type: str = Field(..., pattern=r"^(entity|division|counterparty|contract|task|document)$")
    vault_level: int = Field(default=4, ge=1, le=4)
    parent_vault_id: str | None = None
    module_type: str | None = Field(
        default=None, pattern=r"^(contracts|crm|tasks|calendar|documents)$"
    )
    metadata: dict = Field(default_factory=dict)


class UpdateVaultRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=500)
    metadata: dict | None = None
    parent_vault_id: str | None = None


class VaultResponse(BaseModel):
    id: str
    workspace_id: str
    parent_vault_id: str | None
    vault_level: int
    name: str
    slug: str
    vault_type: str
    module_type: str | None
    chamber: str | None
    gate: str | None
    metadata: dict
    health_score: float | None
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None

    model_config = {"from_attributes": True}


class VaultListResponse(BaseModel):
    vaults: list[VaultResponse]
    total: int
```

**Step 2: Write test**

Create `apps/api/tests/test_vault_schemas.py`:

```python
"""Tests for vault Pydantic schemas."""

import pytest
from pydantic import ValidationError

from src.schemas.vault import CreateVaultRequest, VaultResponse


def test_create_vault_request_valid():
    req = CreateVaultRequest(name="Test Vault", vault_type="contract")
    assert req.vault_level == 4
    assert req.metadata == {}


def test_create_vault_request_invalid_type():
    with pytest.raises(ValidationError):
        CreateVaultRequest(name="Test", vault_type="invalid")


def test_create_vault_request_invalid_level():
    with pytest.raises(ValidationError):
        CreateVaultRequest(name="Test", vault_type="contract", vault_level=5)


def test_create_vault_request_empty_name():
    with pytest.raises(ValidationError):
        CreateVaultRequest(name="", vault_type="contract")


def test_vault_response_from_attributes():
    """VaultResponse can be created from ORM-like objects."""
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)
    resp = VaultResponse(
        id="test_id",
        workspace_id="ws_1",
        parent_vault_id=None,
        vault_level=4,
        name="Test",
        slug="test",
        vault_type="contract",
        module_type="contracts",
        chamber="discover",
        gate="gate_ingest",
        metadata={},
        health_score=None,
        created_at=now,
        updated_at=now,
        archived_at=None,
    )
    assert resp.id == "test_id"
```

**Step 3: Run tests**

Run: `cd apps/api && python -m pytest tests/test_vault_schemas.py -v`
Expected: All PASS

**Step 4: Commit**

```bash
mkdir -p apps/api/src/schemas
git add apps/api/src/schemas/vault.py apps/api/tests/test_vault_schemas.py
git commit -m "feat(api): add vault Pydantic request/response schemas"
```

---

### Task 6: Vault CRUD Routes

**Files:**

- Create: `apps/api/src/routes/vaults.py`
- Modify: `apps/api/src/main.py`

**Step 1: Write the route module**

Create `apps/api/src/routes/vaults.py`:

```python
"""Vault routes — CRUD, hierarchy traversal, chamber progression."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from src.db import get_db
from src.middleware.auth import get_current_user
from src.schemas.vault import (
    CreateVaultRequest,
    UpdateVaultRequest,
    VaultListResponse,
    VaultResponse,
)
from src.services.vault import (
    VALID_CHAMBERS,
    VALID_MODULE_TYPES,
    advance_chamber,
    archive_vault,
    create_vault,
    get_vault,
    get_vault_children,
    list_vaults,
    update_vault,
)

router = APIRouter(prefix="/api/v1/vaults", tags=["vaults"])


def _vault_to_response(vault) -> VaultResponse:
    return VaultResponse(
        id=vault.id,
        workspace_id=vault.workspace_id,
        parent_vault_id=vault.parent_vault_id,
        vault_level=vault.vault_level,
        name=vault.name,
        slug=vault.slug,
        vault_type=vault.vault_type,
        module_type=vault.module_type,
        chamber=vault.chamber,
        gate=vault.gate,
        metadata=vault.metadata_,
        health_score=vault.health_score,
        created_at=vault.created_at,
        updated_at=vault.updated_at,
        archived_at=vault.archived_at,
    )


@router.post("", status_code=status.HTTP_201_CREATED)
def create_vault_route(
    body: CreateVaultRequest,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> VaultResponse:
    """Create a new vault."""
    vault = create_vault(
        db,
        workspace_id=current_user.get("workspace_id", ""),
        name=body.name,
        vault_type=body.vault_type,
        vault_level=body.vault_level,
        parent_vault_id=body.parent_vault_id,
        module_type=body.module_type,
        metadata=body.metadata,
        creator_id=current_user.get("sub"),
    )
    return _vault_to_response(vault)


@router.get("")
def list_vaults_route(
    module_type: str | None = Query(default=None),  # noqa: B008
    vault_level: int | None = Query(default=None, ge=1, le=4),  # noqa: B008
    chamber: str | None = Query(default=None),  # noqa: B008
    parent_vault_id: str | None = Query(default=None),  # noqa: B008
    limit: int = Query(default=50, ge=1, le=200),  # noqa: B008
    offset: int = Query(default=0, ge=0),  # noqa: B008
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> VaultListResponse:
    """List vaults with optional filters."""
    workspace_id = current_user.get("workspace_id", "")
    vaults = list_vaults(
        db,
        workspace_id,
        module_type=module_type,
        vault_level=vault_level,
        chamber=chamber,
        parent_vault_id=parent_vault_id,
        limit=limit,
        offset=offset,
    )
    return VaultListResponse(
        vaults=[_vault_to_response(v) for v in vaults],
        total=len(vaults),
    )


@router.get("/{vault_id}")
def get_vault_route(
    vault_id: str,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> VaultResponse:
    """Get a single vault by ID."""
    workspace_id = current_user.get("workspace_id", "")
    vault = get_vault(db, vault_id, workspace_id)
    if vault is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vault not found")
    return _vault_to_response(vault)


@router.get("/{vault_id}/children")
def get_vault_children_route(
    vault_id: str,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> VaultListResponse:
    """Get direct children of a vault."""
    workspace_id = current_user.get("workspace_id", "")
    children = get_vault_children(db, vault_id, workspace_id)
    return VaultListResponse(
        vaults=[_vault_to_response(v) for v in children],
        total=len(children),
    )


@router.patch("/{vault_id}")
def update_vault_route(
    vault_id: str,
    body: UpdateVaultRequest,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> VaultResponse:
    """Update a vault's name, metadata, or parent."""
    workspace_id = current_user.get("workspace_id", "")
    vault = get_vault(db, vault_id, workspace_id)
    if vault is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vault not found")

    kwargs = {}
    if body.name is not None:
        kwargs["name"] = body.name
    if body.metadata is not None:
        kwargs["metadata"] = body.metadata
    if body.parent_vault_id is not None:
        kwargs["parent_vault_id"] = body.parent_vault_id

    vault = update_vault(db, vault, **kwargs)
    return _vault_to_response(vault)


@router.post("/{vault_id}/advance")
def advance_chamber_route(
    vault_id: str,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> VaultResponse:
    """Advance a vault to the next chamber."""
    workspace_id = current_user.get("workspace_id", "")
    vault = get_vault(db, vault_id, workspace_id)
    if vault is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vault not found")
    try:
        vault = advance_chamber(db, vault)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return _vault_to_response(vault)


@router.post("/{vault_id}/archive")
def archive_vault_route(
    vault_id: str,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> VaultResponse:
    """Soft-delete a vault."""
    workspace_id = current_user.get("workspace_id", "")
    vault = get_vault(db, vault_id, workspace_id)
    if vault is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vault not found")
    vault = archive_vault(db, vault)
    return _vault_to_response(vault)
```

**Step 2: Register the router in main.py**

In `apps/api/src/main.py`, add:

```python
from src.routes.vaults import router as vault_router
```

And in `create_app()`, after `app.include_router(auth_router)`:

```python
    app.include_router(vault_router)
```

**Step 3: Write route smoke test**

Create `apps/api/tests/test_vault_routes.py`:

```python
"""Smoke tests for vault route registration."""

from src.main import app


def test_vault_routes_registered():
    """Verify vault CRUD routes are registered on the app."""
    paths = [route.path for route in app.routes]
    assert "/api/v1/vaults" in paths
    assert "/api/v1/vaults/{vault_id}" in paths
    assert "/api/v1/vaults/{vault_id}/children" in paths
    assert "/api/v1/vaults/{vault_id}/advance" in paths
    assert "/api/v1/vaults/{vault_id}/archive" in paths
```

**Step 4: Run tests**

Run: `cd apps/api && python -m pytest tests/test_vault_routes.py -v`
Expected: All PASS

**Step 5: Commit**

```bash
git add apps/api/src/routes/vaults.py apps/api/src/main.py apps/api/tests/test_vault_routes.py
git commit -m "feat(api): add vault CRUD routes with chamber progression"
```

---

### Task 7: Vault Zustand Store (Frontend)

**Files:**

- Create: `apps/web/src/stores/vault.store.ts`

**Step 1: Write the store**

Create `apps/web/src/stores/vault.store.ts`:

```typescript
import { create } from "zustand";
import { apiFetch } from "@/lib/api";

type VaultLevel = 1 | 2 | 3 | 4;
type Chamber = "discover" | "build" | "review" | "ship";

interface Vault {
  id: string;
  workspace_id: string;
  parent_vault_id: string | null;
  vault_level: VaultLevel;
  name: string;
  slug: string;
  vault_type: string;
  module_type: string | null;
  chamber: Chamber | null;
  gate: string | null;
  metadata: Record<string, unknown>;
  health_score: number | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

interface VaultListResponse {
  vaults: Vault[];
  total: number;
}

interface VaultState {
  /** List of vaults for current view */
  vaults: Vault[];
  /** Currently selected vault detail */
  selectedVault: Vault | null;
  /** Children of currently selected vault */
  children: Vault[];
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;

  /** Fetch vaults with optional filters */
  fetchVaults: (params?: {
    module_type?: string;
    vault_level?: number;
    chamber?: string;
    parent_vault_id?: string;
  }) => Promise<void>;
  /** Fetch a single vault by ID */
  fetchVault: (vaultId: string) => Promise<void>;
  /** Fetch children of a vault */
  fetchChildren: (vaultId: string) => Promise<void>;
  /** Create a new vault */
  createVault: (data: {
    name: string;
    vault_type: string;
    vault_level?: number;
    parent_vault_id?: string | null;
    module_type?: string | null;
    metadata?: Record<string, unknown>;
  }) => Promise<Vault>;
  /** Advance vault to next chamber */
  advanceChamber: (vaultId: string) => Promise<void>;
  /** Archive a vault */
  archiveVault: (vaultId: string) => Promise<void>;
  /** Clear selected vault */
  clearSelectedVault: () => void;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  vaults: [],
  selectedVault: null,
  children: [],
  isLoading: false,
  error: null,

  fetchVaults: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const query = new URLSearchParams();
      if (params?.module_type) query.set("module_type", params.module_type);
      if (params?.vault_level)
        query.set("vault_level", String(params.vault_level));
      if (params?.chamber) query.set("chamber", params.chamber);
      if (params?.parent_vault_id)
        query.set("parent_vault_id", params.parent_vault_id);

      const qs = query.toString();
      const data = await apiFetch<VaultListResponse>(
        `/api/v1/vaults${qs ? `?${qs}` : ""}`,
      );
      set({ vaults: data.vaults, isLoading: false });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Failed to fetch vaults",
        isLoading: false,
      });
    }
  },

  fetchVault: async (vaultId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiFetch<Vault>(`/api/v1/vaults/${vaultId}`);
      set({ selectedVault: data, isLoading: false });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Failed to fetch vault",
        isLoading: false,
      });
    }
  },

  fetchChildren: async (vaultId) => {
    try {
      const data = await apiFetch<VaultListResponse>(
        `/api/v1/vaults/${vaultId}/children`,
      );
      set({ children: data.vaults });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Failed to fetch children",
      });
    }
  },

  createVault: async (data) => {
    const vault = await apiFetch<Vault>("/api/v1/vaults", {
      method: "POST",
      body: JSON.stringify(data),
    });
    set((state) => ({ vaults: [vault, ...state.vaults] }));
    return vault;
  },

  advanceChamber: async (vaultId) => {
    const updated = await apiFetch<Vault>(`/api/v1/vaults/${vaultId}/advance`, {
      method: "POST",
    });
    set((state) => ({
      vaults: state.vaults.map((v) => (v.id === vaultId ? updated : v)),
      selectedVault:
        state.selectedVault?.id === vaultId ? updated : state.selectedVault,
    }));
  },

  archiveVault: async (vaultId) => {
    await apiFetch(`/api/v1/vaults/${vaultId}/archive`, { method: "POST" });
    set((state) => ({
      vaults: state.vaults.filter((v) => v.id !== vaultId),
      selectedVault:
        state.selectedVault?.id === vaultId ? null : state.selectedVault,
    }));
  },

  clearSelectedVault: () => set({ selectedVault: null, children: [] }),
}));

export type { Vault, VaultLevel, Chamber };
```

**Step 2: Commit**

```bash
git add apps/web/src/stores/vault.store.ts
git commit -m "feat(web): add vault Zustand store with CRUD operations"
```

---

### Task 8: Schemas **init**.py + Final Wiring

**Files:**

- Create: `apps/api/src/schemas/__init__.py`

**Step 1: Create schemas package init**

Create `apps/api/src/schemas/__init__.py`:

```python
"""Pydantic schemas package."""
```

**Step 2: Run all tests**

Run: `cd apps/api && python -m pytest tests/ -v`
Expected: All tests PASS (models, jwt, auth middleware, auth routes, vault service, vault schemas, vault routes)

**Step 3: Commit**

```bash
git add apps/api/src/schemas/__init__.py
git commit -m "feat(api): add schemas package init"
```

---

### Task 9: Type-Check + Lint Verification

**Step 1: Run backend linting**

Run: `cd apps/api && ruff check src/ tests/`
Expected: No errors (fix any that appear with `ruff check --fix`)

**Step 2: Run frontend type-check**

Run: `cd apps/web && source ~/.nvm/nvm.sh && nvm use 20 && npx tsc --noEmit`
Expected: No type errors in vault.store.ts

**Step 3: Run frontend lint**

Run: `cd apps/web && source ~/.nvm/nvm.sh && nvm use 20 && npx eslint src/stores/vault.store.ts`
Expected: No lint errors

**Step 4: Fix any issues and commit**

```bash
git add -A
git commit -m "chore(api): fix lint and type issues"
```

---

## Summary

| Task | Component         | Files Created/Modified                                      |
| ---- | ----------------- | ----------------------------------------------------------- |
| 1    | Vault model       | `models/vault.py`, `models/__init__.py`                     |
| 2    | VaultMember model | `models/vault_member.py`, `models/__init__.py`              |
| 3    | Migration 002     | `migrations/versions/002_*.py`, `migrations/env.py`         |
| 4    | Vault service     | `services/vault.py`, `tests/test_vault_service.py`          |
| 5    | Pydantic schemas  | `schemas/vault.py`, `tests/test_vault_schemas.py`           |
| 6    | Vault routes      | `routes/vaults.py`, `main.py`, `tests/test_vault_routes.py` |
| 7    | Vault store       | `stores/vault.store.ts`                                     |
| 8    | Schemas init      | `schemas/__init__.py`                                       |
| 9    | Lint + type-check | verification pass                                           |

**API Endpoints Created:**

- `POST /api/v1/vaults` — Create vault
- `GET /api/v1/vaults` — List vaults (filterable by module, level, chamber, parent)
- `GET /api/v1/vaults/{id}` — Get vault detail
- `GET /api/v1/vaults/{id}/children` — Get vault children
- `PATCH /api/v1/vaults/{id}` — Update vault
- `POST /api/v1/vaults/{id}/advance` — Advance to next chamber
- `POST /api/v1/vaults/{id}/archive` — Soft-delete vault
