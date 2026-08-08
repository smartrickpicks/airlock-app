# Phase 2a: Role Templates + Permission Engine — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the Discord-style role system with permission catalog, role templates (19 pre-built with archetype metadata), permission computation engine, and admin Roles panel UI mirroring Discord's layout.

**Architecture:** New `roles` table stores role templates with both permission toggles and PI archetype metadata. A `user_roles` junction table assigns multiple roles per user per scope. A `permission_overrides` table handles ad-hoc grants/denies with optional expiry. The permission engine computes effective permissions via additive stacking with deny-wins and org-role ceiling. Frontend adds a Roles admin page with Discord-style role list.

**Tech Stack:** SQLAlchemy 2.0 (models), Alembic (migration), FastAPI (routes), Pydantic (schemas), Zustand (frontend state), Tailwind tokens (styling)

**Design Doc:** `docs/plans/2026-03-07-unified-identity-roles-privacy-design.md`
**Spec Reference:** `docs/specs/roles/overview.md` (permission catalog, computation logic, SoD rules)

---

## Task 1: Permission Catalog Constants

**Files:**

- Create: `apps/api/src/services/permissions.py`
- Test: `apps/api/tests/test_permissions.py`

**Step 1: Write the failing test**

```python
# apps/api/tests/test_permissions.py
"""Tests for permission catalog constants."""

from src.services.permissions import (
    PERMISSION_CATALOG,
    PERMISSION_CATEGORIES,
    DEFAULT_ROLE_PERMISSIONS,
    ORG_ROLE_CEILING,
    VALID_PERMISSIONS,
)


def test_permission_catalog_has_all_categories():
    expected = {
        "vaults", "extraction", "patches", "triage",
        "tasks", "ai", "export", "admin",
    }
    assert set(PERMISSION_CATEGORIES.keys()) == expected


def test_all_permissions_have_description():
    for perm_key, perm_info in PERMISSION_CATALOG.items():
        assert "description" in perm_info, f"{perm_key} missing description"
        assert "category" in perm_info, f"{perm_key} missing category"


def test_valid_permissions_count():
    # Spec defines 30+ permissions across 8 categories
    assert len(VALID_PERMISSIONS) >= 28


def test_default_builder_permissions():
    perms = DEFAULT_ROLE_PERMISSIONS["builder"]
    assert "view_vaults" in perms
    assert "create_vaults" in perms
    assert "create_patches" in perms
    assert "approve_low_risk" not in perms  # Builders can't approve


def test_default_gatekeeper_permissions():
    perms = DEFAULT_ROLE_PERMISSIONS["gatekeeper"]
    assert "approve_low_risk" in perms
    assert "approve_medium_risk" in perms
    assert "approve_high_risk" not in perms  # Only Owner+
    assert "view_audit_log" in perms


def test_default_owner_permissions():
    perms = DEFAULT_ROLE_PERMISSIONS["owner"]
    assert "approve_high_risk" in perms
    assert "apply_patches" in perms
    assert "manage_members" in perms
    assert "manage_roles" in perms


def test_default_viewer_permissions():
    perms = DEFAULT_ROLE_PERMISSIONS["viewer"]
    assert "view_vaults" in perms
    assert "view_extraction" in perms
    assert "create_vaults" not in perms  # Viewers can't create


def test_default_designer_permissions():
    perms = DEFAULT_ROLE_PERMISSIONS["designer"]
    assert "configure_extraction" in perms
    assert "configure_otto" in perms


def test_org_role_ceiling_hierarchy():
    member = ORG_ROLE_CEILING["member"]
    lead = ORG_ROLE_CEILING["lead"]
    director = ORG_ROLE_CEILING["director"]
    executive = ORG_ROLE_CEILING["executive"]
    # Each level should be a superset of the one below
    assert member <= lead
    assert lead <= director
    assert director <= executive


def test_org_role_ceiling_admin_restricted():
    member = ORG_ROLE_CEILING["member"]
    assert "manage_members" not in member
    assert "manage_roles" not in member
    assert "toggle_features" not in member
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && python -m pytest tests/test_permissions.py -v`
Expected: FAIL with ModuleNotFoundError

**Step 3: Write minimal implementation**

```python
# apps/api/src/services/permissions.py
"""Permission catalog, default role permissions, and org-role ceilings.

Reference: docs/specs/roles/overview.md (Permission Catalog section)
"""

# ─── Permission Categories ──────────────────────────────────────────

PERMISSION_CATEGORIES: dict[str, str] = {
    "vaults": "Vault Operations",
    "extraction": "Extraction & Analysis",
    "patches": "Patch Workflow",
    "triage": "Triage & Tasks",
    "tasks": "Tasks",
    "ai": "AI Agent",
    "export": "Export & Integration",
    "admin": "Administration",
}

# ─── Full Permission Catalog ────────────────────────────────────────

PERMISSION_CATALOG: dict[str, dict[str, str]] = {
    # Vaults
    "view_vaults": {"category": "vaults", "description": "View vault data and events"},
    "create_vaults": {"category": "vaults", "description": "Create new vaults"},
    "edit_vault_metadata": {"category": "vaults", "description": "Edit vault metadata fields"},
    "archive_vaults": {"category": "vaults", "description": "Archive/soft-delete vaults"},
    "delete_vaults": {"category": "vaults", "description": "Permanently delete vaults"},
    # Extraction
    "view_extraction": {"category": "extraction", "description": "View extraction results"},
    "run_extraction": {"category": "extraction", "description": "Trigger extraction on documents"},
    "configure_extraction": {"category": "extraction", "description": "Edit extraction anchors/config"},
    # Patches
    "create_patches": {"category": "patches", "description": "Draft data corrections"},
    "submit_patches": {"category": "patches", "description": "Submit patches for review"},
    "approve_low_risk": {"category": "patches", "description": "Approve low-risk patches"},
    "approve_medium_risk": {"category": "patches", "description": "Approve medium-risk patches"},
    "approve_high_risk": {"category": "patches", "description": "Approve high-risk patches"},
    "apply_patches": {"category": "patches", "description": "Apply approved patches to baseline"},
    # Triage
    "view_triage": {"category": "triage", "description": "View triage items"},
    "create_triage": {"category": "triage", "description": "Create triage items"},
    "resolve_triage": {"category": "triage", "description": "Resolve/dismiss triage items"},
    # Tasks
    "view_tasks": {"category": "tasks", "description": "View tasks"},
    "manage_tasks": {"category": "tasks", "description": "Create, assign, complete tasks"},
    # AI
    "chat_with_otto": {"category": "ai", "description": "Use Otto AI agent"},
    "configure_otto": {"category": "ai", "description": "Configure Otto roles/prompts"},
    # Export
    "export_csv": {"category": "export", "description": "Export vault data as CSV"},
    "export_pdf": {"category": "export", "description": "Export vault data as PDF"},
    "export_json": {"category": "export", "description": "Export vault data as JSON"},
    "export_docx": {"category": "export", "description": "Export vault data as DOCX"},
    "manage_connectors": {"category": "export", "description": "Configure external integrations"},
    # Admin
    "manage_members": {"category": "admin", "description": "Invite/remove workspace members"},
    "manage_roles": {"category": "admin", "description": "Create/edit roles"},
    "toggle_features": {"category": "admin", "description": "Toggle feature flags"},
    "calibrate_thresholds": {"category": "admin", "description": "Adjust calibration parameters"},
    "view_audit_log": {"category": "admin", "description": "View audit trail"},
    "system_health": {"category": "admin", "description": "View system health dashboard"},
}

VALID_PERMISSIONS = frozenset(PERMISSION_CATALOG.keys())

# ─── Default Permissions Per Module Role ────────────────────────────

_VIEWER_PERMS = frozenset({
    "view_vaults", "view_extraction", "view_triage", "view_tasks",
})

_BUILDER_PERMS = _VIEWER_PERMS | frozenset({
    "create_vaults", "edit_vault_metadata", "run_extraction",
    "create_patches", "submit_patches",
    "create_triage", "manage_tasks",
    "chat_with_otto",
    "export_csv", "export_pdf", "export_docx",
})

_GATEKEEPER_PERMS = _VIEWER_PERMS | frozenset({
    "approve_low_risk", "approve_medium_risk",
    "resolve_triage", "view_audit_log",
    "chat_with_otto",
    "export_csv", "export_pdf",
})

_DESIGNER_PERMS = _BUILDER_PERMS | frozenset({
    "configure_extraction", "configure_otto",
})

_OWNER_PERMS = _BUILDER_PERMS | _GATEKEEPER_PERMS | frozenset({
    "archive_vaults", "approve_high_risk", "apply_patches",
    "manage_members", "manage_roles", "toggle_features",
    "calibrate_thresholds", "export_json",
    "system_health", "manage_connectors", "configure_otto",
})

DEFAULT_ROLE_PERMISSIONS: dict[str, frozenset[str]] = {
    "viewer": _VIEWER_PERMS,
    "builder": _BUILDER_PERMS,
    "gatekeeper": _GATEKEEPER_PERMS,
    "designer": _DESIGNER_PERMS,
    "owner": _OWNER_PERMS,
}

# ─── Org-Role Ceiling ───────────────────────────────────────────────

ORG_ROLE_CEILING: dict[str, frozenset[str]] = {
    "member": VALID_PERMISSIONS - frozenset({
        "manage_members", "manage_roles", "toggle_features",
        "calibrate_thresholds", "system_health", "manage_connectors",
        "delete_vaults",
    }),
    "lead": VALID_PERMISSIONS - frozenset({
        "toggle_features", "calibrate_thresholds", "system_health",
        "manage_connectors", "delete_vaults",
    }),
    "director": VALID_PERMISSIONS - frozenset({"delete_vaults"}),
    "executive": VALID_PERMISSIONS,
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && python -m pytest tests/test_permissions.py -v`
Expected: All 11 tests PASS

**Step 5: Commit**

```bash
git add apps/api/src/services/permissions.py apps/api/tests/test_permissions.py
git commit -m "feat(api): add permission catalog with 31 permissions and org-role ceilings"
```

---

## Task 2: Role Template Data Model

**Files:**

- Create: `apps/api/src/models/role.py`
- Modify: `apps/api/src/models/__init__.py`
- Test: `apps/api/tests/test_role_model.py`

**Step 1: Write the failing test**

```python
# apps/api/tests/test_role_model.py
"""Tests for Role template data model."""

from src.models.role import Role


def test_role_tablename():
    assert Role.__tablename__ == "roles"


def test_role_has_required_columns():
    columns = {c.name for c in Role.__table__.columns}
    required = {
        "id", "workspace_id", "name", "description", "color",
        "permissions", "hierarchy_position",
        "archetype_tag", "chamber_affinity", "pi_fit_profiles",
        "agentic_role", "ux_defaults",
        "is_system", "is_editable", "category", "chamber",
        "created_at", "updated_at", "deleted_at",
    }
    assert required <= columns, f"Missing: {required - columns}"


def test_role_primary_key():
    pk_cols = [c.name for c in Role.__table__.primary_key.columns]
    assert pk_cols == ["id"]


def test_role_unique_constraint():
    constraints = [
        c for c in Role.__table__.constraints
        if hasattr(c, "columns") and len(c.columns) == 2
    ]
    unique_names = set()
    for c in constraints:
        col_names = {col.name for col in c.columns}
        unique_names.update(col_names)
    assert "workspace_id" in unique_names
    assert "name" in unique_names
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && python -m pytest tests/test_role_model.py -v`
Expected: FAIL with ModuleNotFoundError

**Step 3: Write minimal implementation**

```python
# apps/api/src/models/role.py
"""Role template model — Discord-style role with permission + archetype metadata."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.db import Base


class Role(Base):
    __tablename__ = "roles"
    __table_args__ = (
        UniqueConstraint("workspace_id", "name", name="uq_role_workspace_name"),
    )

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    workspace_id: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, server_default="")
    color: Mapped[str] = mapped_column(String(20), server_default="#64748B")
    permissions: Mapped[list[str]] = mapped_column(ARRAY(Text), server_default="{}")
    hierarchy_position: Mapped[int] = mapped_column(Integer, server_default="0")

    # Archetype face (optional for custom roles)
    archetype_tag: Mapped[str | None] = mapped_column(String(20), nullable=True)
    chamber_affinity: Mapped[list[str]] = mapped_column(ARRAY(Text), server_default="{}")
    pi_fit_profiles: Mapped[list[str]] = mapped_column(ARRAY(Text), server_default="{}")
    agentic_role: Mapped[str | None] = mapped_column(String(50), nullable=True)
    ux_defaults: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Metadata
    is_system: Mapped[bool] = mapped_column(Boolean, server_default="false")
    is_editable: Mapped[bool] = mapped_column(Boolean, server_default="true")
    category: Mapped[str] = mapped_column(String(20), server_default="builder")
    chamber: Mapped[str | None] = mapped_column(String(20), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
```

**Step 4: Add to models `__init__.py`**

Add after the PIAssessment import in `apps/api/src/models/__init__.py`:

```python
from src.models.role import Role
```

And add `"Role"` to the `__all__` list.

**Step 5: Run test to verify it passes**

Run: `cd apps/api && python -m pytest tests/test_role_model.py -v`
Expected: All 4 tests PASS

**Step 6: Commit**

```bash
git add apps/api/src/models/role.py apps/api/src/models/__init__.py apps/api/tests/test_role_model.py
git commit -m "feat(api): add Role template model with permission and archetype metadata"
```

---

## Task 3: User Role Assignment + Permission Override Models

**Files:**

- Create: `apps/api/src/models/user_role.py`
- Create: `apps/api/src/models/permission_override.py`
- Modify: `apps/api/src/models/__init__.py`
- Test: `apps/api/tests/test_user_role_model.py`

**Step 1: Write the failing test**

```python
# apps/api/tests/test_user_role_model.py
"""Tests for UserRole and PermissionOverride models."""

from src.models.user_role import UserRole
from src.models.permission_override import PermissionOverride


def test_user_role_tablename():
    assert UserRole.__tablename__ == "user_roles"


def test_user_role_composite_pk():
    pk_cols = {c.name for c in UserRole.__table__.primary_key.columns}
    assert pk_cols == {"user_id", "workspace_id", "role_id"}


def test_user_role_has_scope_columns():
    columns = {c.name for c in UserRole.__table__.columns}
    assert "scope_type" in columns
    assert "scope_id" in columns


def test_override_tablename():
    assert PermissionOverride.__tablename__ == "permission_overrides"


def test_override_has_required_columns():
    columns = {c.name for c in PermissionOverride.__table__.columns}
    required = {
        "id", "user_id", "workspace_id",
        "scope_type", "scope_id", "permission",
        "effect", "expires_at", "reason",
        "granted_by", "granted_at", "revoked_at",
    }
    assert required <= columns, f"Missing: {required - columns}"
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && python -m pytest tests/test_user_role_model.py -v`
Expected: FAIL with ModuleNotFoundError

**Step 3: Write minimal implementations**

```python
# apps/api/src/models/user_role.py
"""UserRole model — junction table for user x role x scope assignment."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from src.db import Base


class UserRole(Base):
    __tablename__ = "user_roles"

    user_id: Mapped[str] = mapped_column(
        Text, ForeignKey("users.id"), primary_key=True
    )
    workspace_id: Mapped[str] = mapped_column(
        Text, ForeignKey("workspaces.id"), primary_key=True
    )
    role_id: Mapped[str] = mapped_column(
        Text, ForeignKey("roles.id"), primary_key=True
    )
    scope_type: Mapped[str] = mapped_column(
        String(20), server_default="module"
    )
    scope_id: Mapped[str] = mapped_column(Text, server_default="")
    assigned_by: Mapped[str | None] = mapped_column(Text, nullable=True)
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
```

```python
# apps/api/src/models/permission_override.py
"""PermissionOverride model — ad-hoc per-user permission grants/denies."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from src.db import Base


class PermissionOverride(Base):
    __tablename__ = "permission_overrides"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    user_id: Mapped[str] = mapped_column(
        Text, ForeignKey("users.id"), nullable=False, index=True
    )
    workspace_id: Mapped[str] = mapped_column(
        Text, ForeignKey("workspaces.id"), nullable=False
    )
    scope_type: Mapped[str] = mapped_column(String(20), nullable=False)
    scope_id: Mapped[str] = mapped_column(Text, nullable=False)
    permission: Mapped[str] = mapped_column(String(50), nullable=False)
    effect: Mapped[str] = mapped_column(String(10), server_default="grant")
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    granted_by: Mapped[str] = mapped_column(Text, nullable=False)
    granted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
```

**Step 4: Add to models `__init__.py`**

Add imports for `UserRole` and `PermissionOverride`, add both to `__all__`.

**Step 5: Run test to verify it passes**

Run: `cd apps/api && python -m pytest tests/test_user_role_model.py -v`
Expected: All 5 tests PASS

**Step 6: Commit**

```bash
git add apps/api/src/models/user_role.py apps/api/src/models/permission_override.py apps/api/src/models/__init__.py apps/api/tests/test_user_role_model.py
git commit -m "feat(api): add UserRole and PermissionOverride models"
```

---

## Task 4: Alembic Migration 005

**Files:**

- Create: `apps/api/src/migrations/versions/005_add_roles_user_roles_permission_overrides.py`

**Step 1: Write the migration**

```python
# apps/api/src/migrations/versions/005_add_roles_user_roles_permission_overrides.py
"""add roles, user_roles, and permission_overrides tables

Revision ID: 005
Revises: 004
Create Date: 2026-03-07
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "005"
down_revision: str = "004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "roles",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), server_default=""),
        sa.Column("color", sa.String(20), server_default="#64748B"),
        sa.Column("permissions", postgresql.ARRAY(sa.Text()), server_default="{}"),
        sa.Column("hierarchy_position", sa.Integer(), server_default="0"),
        sa.Column("archetype_tag", sa.String(20), nullable=True),
        sa.Column("chamber_affinity", postgresql.ARRAY(sa.Text()), server_default="{}"),
        sa.Column("pi_fit_profiles", postgresql.ARRAY(sa.Text()), server_default="{}"),
        sa.Column("agentic_role", sa.String(50), nullable=True),
        sa.Column("ux_defaults", postgresql.JSONB(), nullable=True),
        sa.Column("is_system", sa.Boolean(), server_default="false"),
        sa.Column("is_editable", sa.Boolean(), server_default="true"),
        sa.Column("category", sa.String(20), server_default="builder"),
        sa.Column("chamber", sa.String(20), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("workspace_id", "name", name="uq_role_workspace_name"),
    )
    op.create_index("ix_roles_workspace_id", "roles", ["workspace_id"])

    op.create_table(
        "user_roles",
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("role_id", sa.Text(), nullable=False),
        sa.Column("scope_type", sa.String(20), server_default="module"),
        sa.Column("scope_id", sa.Text(), server_default=""),
        sa.Column("assigned_by", sa.Text(), nullable=True),
        sa.Column("assigned_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("user_id", "workspace_id", "role_id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"]),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"]),
    )

    op.create_table(
        "permission_overrides",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column("workspace_id", sa.Text(), nullable=False),
        sa.Column("scope_type", sa.String(20), nullable=False),
        sa.Column("scope_id", sa.Text(), nullable=False),
        sa.Column("permission", sa.String(50), nullable=False),
        sa.Column("effect", sa.String(10), server_default="grant"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("granted_by", sa.Text(), nullable=False),
        sa.Column("granted_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"]),
    )
    op.create_index("ix_overrides_user", "permission_overrides", ["user_id", "workspace_id"])


def downgrade() -> None:
    op.drop_table("permission_overrides")
    op.drop_table("user_roles")
    op.drop_table("roles")
```

**Step 2: Commit**

```bash
git add apps/api/src/migrations/versions/005_add_roles_user_roles_permission_overrides.py
git commit -m "feat(api): add migration 005 for roles, user_roles, permission_overrides"
```

---

## Task 5: Permission Engine Service

**Files:**

- Create: `apps/api/src/services/permission_engine.py`
- Test: `apps/api/tests/test_permission_engine.py`

**Step 1: Write the failing test**

```python
# apps/api/tests/test_permission_engine.py
"""Tests for permission computation engine (unit tests, no DB)."""

from src.services.permission_engine import (
    compute_permissions_from_roles,
    apply_overrides,
    enforce_ceiling,
)


def test_single_role_permissions():
    role_perms = [["view_vaults", "create_vaults"]]
    result = compute_permissions_from_roles(role_perms)
    assert result == {"view_vaults", "create_vaults"}


def test_multiple_roles_additive():
    role_perms = [
        ["view_vaults", "create_vaults"],
        ["approve_low_risk", "view_audit_log"],
    ]
    result = compute_permissions_from_roles(role_perms)
    assert result == {"view_vaults", "create_vaults", "approve_low_risk", "view_audit_log"}


def test_apply_grants():
    perms = {"view_vaults"}
    overrides = [{"permission": "export_csv", "effect": "grant"}]
    result = apply_overrides(perms, overrides)
    assert "export_csv" in result


def test_apply_deny():
    perms = {"view_vaults", "create_vaults"}
    overrides = [{"permission": "create_vaults", "effect": "deny"}]
    result = apply_overrides(perms, overrides)
    assert "create_vaults" not in result
    assert "view_vaults" in result


def test_deny_wins_over_grant():
    perms = {"view_vaults"}
    overrides = [
        {"permission": "export_csv", "effect": "grant"},
        {"permission": "export_csv", "effect": "deny"},
    ]
    result = apply_overrides(perms, overrides)
    assert "export_csv" not in result


def test_ceiling_member():
    perms = {"view_vaults", "manage_members", "manage_roles"}
    result = enforce_ceiling(perms, "member")
    assert "view_vaults" in result
    assert "manage_members" not in result
    assert "manage_roles" not in result


def test_ceiling_executive():
    perms = {"view_vaults", "manage_members", "delete_vaults"}
    result = enforce_ceiling(perms, "executive")
    assert perms == result


def test_empty_roles():
    result = compute_permissions_from_roles([])
    assert result == set()
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && python -m pytest tests/test_permission_engine.py -v`
Expected: FAIL with ModuleNotFoundError

**Step 3: Write minimal implementation**

```python
# apps/api/src/services/permission_engine.py
"""Permission computation engine — Discord-style additive with deny-wins.

Reference: docs/specs/roles/overview.md (Computed Permissions section)
"""

from src.services.permissions import ORG_ROLE_CEILING


def compute_permissions_from_roles(role_permission_lists: list[list[str]]) -> set[str]:
    """Union all permissions from multiple role assignments (additive)."""
    result: set[str] = set()
    for perms in role_permission_lists:
        result |= set(perms)
    return result


def apply_overrides(
    permissions: set[str],
    overrides: list[dict[str, str]],
) -> set[str]:
    """Apply ad-hoc permission overrides. Deny always wins.

    overrides: list of {"permission": str, "effect": "grant"|"deny"}
    """
    result = set(permissions)
    grants: set[str] = set()
    denies: set[str] = set()

    for ov in overrides:
        perm = ov["permission"]
        if ov["effect"] == "grant":
            grants.add(perm)
        elif ov["effect"] == "deny":
            denies.add(perm)

    # Apply grants first, then denies (deny always wins)
    result |= grants
    result -= denies
    return result


def enforce_ceiling(permissions: set[str], org_role: str) -> set[str]:
    """Cap permissions at the org-role ceiling."""
    ceiling = ORG_ROLE_CEILING.get(org_role, frozenset())
    return permissions & ceiling
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && python -m pytest tests/test_permission_engine.py -v`
Expected: All 8 tests PASS

**Step 5: Commit**

```bash
git add apps/api/src/services/permission_engine.py apps/api/tests/test_permission_engine.py
git commit -m "feat(api): add permission computation engine with additive stacking and deny-wins"
```

---

## Task 6: Role Template Seed Data

**Files:**

- Create: `apps/api/src/services/role_seed.py`
- Test: `apps/api/tests/test_role_seed.py`

**Step 1: Write the failing test**

```python
# apps/api/tests/test_role_seed.py
"""Tests for role template seed data."""

from src.services.role_seed import SYSTEM_ROLE_TEMPLATES
from src.services.permissions import VALID_PERMISSIONS


def test_has_at_least_19_templates():
    assert len(SYSTEM_ROLE_TEMPLATES) >= 19


def test_every_template_has_required_keys():
    required = {
        "name", "description", "color", "permissions",
        "category", "chamber", "archetype_tag",
        "pi_fit_profiles", "hierarchy_position",
    }
    for tmpl in SYSTEM_ROLE_TEMPLATES:
        assert required <= set(tmpl.keys()), f"{tmpl['name']} missing: {required - set(tmpl.keys())}"


def test_all_permissions_valid():
    for tmpl in SYSTEM_ROLE_TEMPLATES:
        for perm in tmpl["permissions"]:
            assert perm in VALID_PERMISSIONS, f"{tmpl['name']} has invalid perm: {perm}"


def test_categories_cover_all():
    categories = {tmpl["category"] for tmpl in SYSTEM_ROLE_TEMPLATES}
    assert categories >= {"builder", "gatekeeper", "owner", "connector"}


def test_chambers_cover_all():
    chambers = {tmpl["chamber"] for tmpl in SYSTEM_ROLE_TEMPLATES if tmpl["chamber"]}
    assert chambers >= {"discover", "build", "review", "ship"}


def test_hierarchy_positions_unique():
    positions = [tmpl["hierarchy_position"] for tmpl in SYSTEM_ROLE_TEMPLATES]
    assert len(positions) == len(set(positions)), "Duplicate hierarchy positions"


def test_scout_is_driver_discover():
    scout = next(t for t in SYSTEM_ROLE_TEMPLATES if t["name"] == "Scout")
    assert scout["archetype_tag"] == "driver"
    assert scout["chamber"] == "discover"
    assert scout["category"] == "builder"


def test_verifier_is_enforcer_review():
    verifier = next(t for t in SYSTEM_ROLE_TEMPLATES if t["name"] == "Verifier")
    assert verifier["archetype_tag"] == "enforcer"
    assert verifier["chamber"] == "review"
    assert verifier["category"] == "gatekeeper"
    assert "approve_low_risk" in verifier["permissions"]
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && python -m pytest tests/test_role_seed.py -v`
Expected: FAIL with ModuleNotFoundError

**Step 3: Write minimal implementation**

```python
# apps/api/src/services/role_seed.py
"""System role templates — pre-built roles with archetype metadata.

Reference: docs/plans/2026-03-07-unified-identity-roles-privacy-design.md (Section 2)
"""

from src.services.permissions import DEFAULT_ROLE_PERMISSIONS

_builder = list(DEFAULT_ROLE_PERMISSIONS["builder"])
_gatekeeper = list(DEFAULT_ROLE_PERMISSIONS["gatekeeper"])
_owner = list(DEFAULT_ROLE_PERMISSIONS["owner"])
_viewer = list(DEFAULT_ROLE_PERMISSIONS["viewer"])

SYSTEM_ROLE_TEMPLATES: list[dict] = [
    # ── Discover Chamber (Builder category) ──
    {
        "name": "Scout",
        "description": "SDR/BDR — qualifies leads, runs intake workflows",
        "color": "#EF4444",
        "permissions": _builder,
        "category": "builder",
        "chamber": "discover",
        "archetype_tag": "driver",
        "pi_fit_profiles": ["captain", "venturer", "persuader"],
        "agentic_role": "fast_path_executor",
        "hierarchy_position": 20,
    },
    {
        "name": "Prospector",
        "description": "Pipeline management, prospect engagement",
        "color": "#EF4444",
        "permissions": _builder,
        "category": "builder",
        "chamber": "discover",
        "archetype_tag": "driver",
        "pi_fit_profiles": ["persuader", "promoter", "maverick"],
        "agentic_role": "momentum_builder",
        "hierarchy_position": 21,
    },
    {
        "name": "Analyst",
        "description": "Research enrichment, data surfacing",
        "color": "#EF4444",
        "permissions": _builder,
        "category": "builder",
        "chamber": "discover",
        "archetype_tag": "interpreter",
        "pi_fit_profiles": ["analyzer", "scholar", "specialist"],
        "agentic_role": "evidence_curator",
        "hierarchy_position": 22,
    },
    {
        "name": "Intake Operator",
        "description": "Form processing, triage routing",
        "color": "#EF4444",
        "permissions": _builder,
        "category": "builder",
        "chamber": "discover",
        "archetype_tag": "interpreter",
        "pi_fit_profiles": ["operator", "adapter", "artisan"],
        "agentic_role": "process_facilitator",
        "hierarchy_position": 23,
    },
    # ── Build Chamber (Builder category) ──
    {
        "name": "Drafter",
        "description": "Contract assembly, extraction mapping",
        "color": "#EAB308",
        "permissions": _builder,
        "category": "builder",
        "chamber": "build",
        "archetype_tag": "interpreter",
        "pi_fit_profiles": ["specialist", "artisan", "analyzer"],
        "agentic_role": "evidence_curator",
        "hierarchy_position": 30,
    },
    {
        "name": "Assembler",
        "description": "Deal desk, document combination",
        "color": "#EAB308",
        "permissions": _builder,
        "category": "builder",
        "chamber": "build",
        "archetype_tag": "driver",
        "pi_fit_profiles": ["collaborator", "adapter", "promoter"],
        "agentic_role": "momentum_builder",
        "hierarchy_position": 31,
    },
    {
        "name": "Data Curator",
        "description": "Entity resolution, data cleaning",
        "color": "#EAB308",
        "permissions": _builder,
        "category": "builder",
        "chamber": "build",
        "archetype_tag": "interpreter",
        "pi_fit_profiles": ["analyzer", "specialist", "scholar"],
        "agentic_role": "compliance_analyst",
        "hierarchy_position": 32,
    },
    {
        "name": "Integrator",
        "description": "System connectors, API sync",
        "color": "#EAB308",
        "permissions": _builder,
        "category": "builder",
        "chamber": "build",
        "archetype_tag": "interpreter",
        "pi_fit_profiles": ["individualist", "specialist", "scholar"],
        "agentic_role": "system_architect",
        "hierarchy_position": 33,
    },
    # ── Review Chamber (Gatekeeper category) ──
    {
        "name": "Verifier",
        "description": "QA/compliance, detail checking",
        "color": "#A855F7",
        "permissions": _gatekeeper,
        "category": "gatekeeper",
        "chamber": "review",
        "archetype_tag": "enforcer",
        "pi_fit_profiles": ["guardian", "controller", "operator"],
        "agentic_role": "verifier",
        "hierarchy_position": 40,
    },
    {
        "name": "Approver",
        "description": "Legal/manager approval authority",
        "color": "#A855F7",
        "permissions": _gatekeeper + ["approve_high_risk"],
        "category": "gatekeeper",
        "chamber": "review",
        "archetype_tag": "enforcer",
        "pi_fit_profiles": ["controller", "strategist", "guardian"],
        "agentic_role": "authority_validator",
        "hierarchy_position": 41,
    },
    {
        "name": "Auditor",
        "description": "External read-only with audit access",
        "color": "#A855F7",
        "permissions": _viewer + ["view_audit_log"],
        "category": "gatekeeper",
        "chamber": "review",
        "archetype_tag": "enforcer",
        "pi_fit_profiles": ["analyzer", "guardian", "controller"],
        "agentic_role": "drift_detective",
        "hierarchy_position": 42,
    },
    {
        "name": "Referee",
        "description": "Dispute resolution, conflict mediation",
        "color": "#A855F7",
        "permissions": _gatekeeper,
        "category": "gatekeeper",
        "chamber": "review",
        "archetype_tag": "enforcer",
        "pi_fit_profiles": ["altruist", "collaborator", "strategist"],
        "agentic_role": "friction_taxonomist",
        "hierarchy_position": 43,
    },
    # ── Ship Chamber (Owner category) ──
    {
        "name": "Publisher",
        "description": "Final release authority",
        "color": "#22C55E",
        "permissions": _owner,
        "category": "owner",
        "chamber": "ship",
        "archetype_tag": "driver",
        "pi_fit_profiles": ["captain", "strategist", "promoter"],
        "agentic_role": "truth_keeper",
        "hierarchy_position": 50,
    },
    {
        "name": "Reporter",
        "description": "Dashboards, exports, analytics",
        "color": "#22C55E",
        "permissions": _viewer + ["export_csv", "export_pdf", "export_json"],
        "category": "owner",
        "chamber": "ship",
        "archetype_tag": "interpreter",
        "pi_fit_profiles": ["analyzer", "scholar", "specialist"],
        "agentic_role": "observer",
        "hierarchy_position": 51,
    },
    {
        "name": "Distributor",
        "description": "Logistics, distribution management",
        "color": "#22C55E",
        "permissions": _owner,
        "category": "owner",
        "chamber": "ship",
        "archetype_tag": "driver",
        "pi_fit_profiles": ["operator", "adapter", "captain"],
        "agentic_role": "fast_path_executor",
        "hierarchy_position": 52,
    },
    {
        "name": "Creative",
        "description": "Presentation generation, brand output",
        "color": "#22C55E",
        "permissions": _builder + ["export_pdf", "export_docx"],
        "category": "owner",
        "chamber": "ship",
        "archetype_tag": "driver",
        "pi_fit_profiles": ["maverick", "venturer", "individualist"],
        "agentic_role": "maverick_innovator",
        "hierarchy_position": 53,
    },
    # ── Cross-Chamber (Connector category) ──
    {
        "name": "Orchestrator",
        "description": "Scrum master/PM, process facilitation",
        "color": "#00D1FF",
        "permissions": _builder + ["view_audit_log"],
        "category": "connector",
        "chamber": None,
        "archetype_tag": "driver",
        "pi_fit_profiles": ["collaborator", "altruist", "adapter"],
        "agentic_role": "team_orchestrator",
        "hierarchy_position": 60,
    },
    {
        "name": "Interpreter",
        "description": "Conflict translation, alignment",
        "color": "#00D1FF",
        "permissions": _builder,
        "category": "connector",
        "chamber": None,
        "archetype_tag": "interpreter",
        "pi_fit_profiles": ["altruist", "collaborator", "adapter"],
        "agentic_role": "friction_taxonomist",
        "hierarchy_position": 61,
    },
    {
        "name": "Admin",
        "description": "System configuration, workspace management",
        "color": "#00D1FF",
        "permissions": list(_owner) + ["delete_vaults"],
        "category": "connector",
        "chamber": None,
        "archetype_tag": None,
        "pi_fit_profiles": [],
        "agentic_role": None,
        "hierarchy_position": 99,
    },
]
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && python -m pytest tests/test_role_seed.py -v`
Expected: All 8 tests PASS

**Step 5: Commit**

```bash
git add apps/api/src/services/role_seed.py apps/api/tests/test_role_seed.py
git commit -m "feat(api): add 19 system role templates with archetype and chamber metadata"
```

---

## Task 7: Role CRUD Service

**Files:**

- Create: `apps/api/src/services/role_service.py`
- Test: `apps/api/tests/test_role_service.py`

**Step 1: Write the failing test**

```python
# apps/api/tests/test_role_service.py
"""Tests for role service functions (unit tests for pure functions)."""

from src.services.role_service import (
    compute_pi_fit_score,
    rank_users_for_role,
)


def test_compute_fit_score_perfect_match():
    score = compute_pi_fit_score("guardian", ["guardian", "controller", "operator"])
    assert score == 1.0


def test_compute_fit_score_second_match():
    score = compute_pi_fit_score("controller", ["guardian", "controller", "operator"])
    assert 0.5 < score < 1.0


def test_compute_fit_score_no_match():
    score = compute_pi_fit_score("maverick", ["guardian", "controller", "operator"])
    assert score == 0.0


def test_rank_users_sorted():
    users = [
        {"user_id": "u1", "pi_profile": "maverick"},
        {"user_id": "u2", "pi_profile": "guardian"},
        {"user_id": "u3", "pi_profile": "controller"},
    ]
    pi_fit = ["guardian", "controller", "operator"]
    ranked = rank_users_for_role(users, pi_fit)
    assert ranked[0]["user_id"] == "u2"
    assert ranked[1]["user_id"] == "u3"


def test_rank_users_no_pi_profile():
    users = [
        {"user_id": "u1", "pi_profile": None},
        {"user_id": "u2", "pi_profile": "guardian"},
    ]
    pi_fit = ["guardian"]
    ranked = rank_users_for_role(users, pi_fit)
    assert ranked[0]["user_id"] == "u2"
    assert ranked[1]["fit_score"] == 0.0
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && python -m pytest tests/test_role_service.py -v`
Expected: FAIL with ModuleNotFoundError

**Step 3: Write minimal implementation**

```python
# apps/api/src/services/role_service.py
"""Role service — CRUD operations and PI fit scoring."""


def compute_pi_fit_score(pi_profile: str | None, pi_fit_profiles: list[str]) -> float:
    """Compute how well a PI profile fits a role's ideal profiles.

    Returns 1.0 for first-choice match, decreasing for lower positions, 0.0 for no match.
    """
    if not pi_profile or not pi_fit_profiles:
        return 0.0
    try:
        idx = pi_fit_profiles.index(pi_profile)
        return 1.0 - (idx / len(pi_fit_profiles))
    except ValueError:
        return 0.0


def rank_users_for_role(
    users: list[dict],
    pi_fit_profiles: list[str],
) -> list[dict]:
    """Rank users by PI fit score for a role template, descending.

    Each user dict must have 'user_id' and 'pi_profile' keys.
    Returns list of dicts with 'user_id', 'pi_profile', 'fit_score'.
    """
    scored = []
    for user in users:
        score = compute_pi_fit_score(user.get("pi_profile"), pi_fit_profiles)
        scored.append({
            "user_id": user["user_id"],
            "pi_profile": user.get("pi_profile"),
            "fit_score": score,
        })
    scored.sort(key=lambda x: x["fit_score"], reverse=True)
    return scored
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && python -m pytest tests/test_role_service.py -v`
Expected: All 5 tests PASS

**Step 5: Commit**

```bash
git add apps/api/src/services/role_service.py apps/api/tests/test_role_service.py
git commit -m "feat(api): add role service with PI fit scoring and user ranking"
```

---

## Task 8: Role API Schemas

**Files:**

- Create: `apps/api/src/schemas/role.py`
- Test: `apps/api/tests/test_role_schemas.py`

**Step 1: Write the failing test**

```python
# apps/api/tests/test_role_schemas.py
"""Tests for role Pydantic schemas."""

import pytest
from pydantic import ValidationError

from src.schemas.role import (
    CreateRoleRequest,
    RoleResponse,
)


def test_create_role_valid():
    req = CreateRoleRequest(name="Senior Analyst", permissions=["view_vaults", "export_csv"])
    assert req.name == "Senior Analyst"
    assert req.color == "#64748B"


def test_create_role_with_archetype():
    req = CreateRoleRequest(
        name="Custom Verifier",
        permissions=["view_vaults", "approve_low_risk"],
        archetype_tag="enforcer",
        chamber="review",
        category="gatekeeper",
    )
    assert req.archetype_tag == "enforcer"


def test_create_role_empty_name_fails():
    with pytest.raises(ValidationError):
        CreateRoleRequest(name="", permissions=[])


def test_create_role_invalid_permission_fails():
    with pytest.raises(ValidationError):
        CreateRoleRequest(name="Bad", permissions=["not_a_real_permission"])


def test_role_response_fields():
    resp = RoleResponse(
        id="role_001",
        workspace_id="ws_001",
        name="Verifier",
        description="QA/compliance",
        color="#A855F7",
        permissions=["approve_low_risk"],
        hierarchy_position=40,
        archetype_tag="enforcer",
        chamber_affinity=["review"],
        pi_fit_profiles=["guardian"],
        agentic_role="verifier",
        is_system=True,
        is_editable=True,
        category="gatekeeper",
        chamber="review",
        member_count=3,
    )
    assert resp.is_system is True
    assert resp.member_count == 3
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && python -m pytest tests/test_role_schemas.py -v`
Expected: FAIL with ModuleNotFoundError

**Step 3: Write minimal implementation**

```python
# apps/api/src/schemas/role.py
"""Pydantic schemas for role CRUD endpoints."""

from pydantic import BaseModel, Field, field_validator

from src.services.permissions import VALID_PERMISSIONS


class CreateRoleRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str = ""
    color: str = "#64748B"
    permissions: list[str] = Field(default_factory=list)
    hierarchy_position: int = 0
    archetype_tag: str | None = None
    chamber_affinity: list[str] = Field(default_factory=list)
    pi_fit_profiles: list[str] = Field(default_factory=list)
    agentic_role: str | None = None
    category: str = "builder"
    chamber: str | None = None

    @field_validator("permissions")
    @classmethod
    def validate_permissions(cls, v: list[str]) -> list[str]:
        invalid = set(v) - VALID_PERMISSIONS
        if invalid:
            msg = f"Invalid permissions: {invalid}"
            raise ValueError(msg)
        return v


class UpdateRoleRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    color: str | None = None
    permissions: list[str] | None = None
    hierarchy_position: int | None = None

    @field_validator("permissions")
    @classmethod
    def validate_permissions(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return v
        invalid = set(v) - VALID_PERMISSIONS
        if invalid:
            msg = f"Invalid permissions: {invalid}"
            raise ValueError(msg)
        return v


class RoleResponse(BaseModel):
    id: str
    workspace_id: str
    name: str
    description: str
    color: str
    permissions: list[str]
    hierarchy_position: int
    archetype_tag: str | None
    chamber_affinity: list[str]
    pi_fit_profiles: list[str]
    agentic_role: str | None
    is_system: bool
    is_editable: bool
    category: str
    chamber: str | None
    member_count: int = 0

    model_config = {"from_attributes": True}


class RoleListResponse(BaseModel):
    roles: list[RoleResponse]
    total: int
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && python -m pytest tests/test_role_schemas.py -v`
Expected: All 5 tests PASS

**Step 5: Commit**

```bash
git add apps/api/src/schemas/role.py apps/api/tests/test_role_schemas.py
git commit -m "feat(api): add Pydantic schemas for role CRUD with permission validation"
```

---

## Task 9: Role API Routes

**Files:**

- Create: `apps/api/src/routes/roles.py`
- Modify: `apps/api/src/main.py` (register router)
- Test: `apps/api/tests/test_role_routes.py`

**Step 1: Write the failing test**

```python
# apps/api/tests/test_role_routes.py
"""Tests for role route registration."""

from fastapi.testclient import TestClient

from src.main import app

client = TestClient(app)


def test_role_list_endpoint_exists():
    response = client.get("/api/v1/roles")
    assert response.status_code in (200, 401)


def test_role_templates_endpoint_exists():
    response = client.get("/api/v1/roles/templates")
    assert response.status_code in (200, 401)


def test_permission_catalog_endpoint_exists():
    response = client.get("/api/v1/roles/permissions")
    assert response.status_code in (200, 401)


def test_role_routes_registered():
    routes = [r.path for r in app.routes]
    role_routes = [r for r in routes if "/roles" in r]
    assert len(role_routes) >= 3, f"Expected role routes, found: {routes}"
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && python -m pytest tests/test_role_routes.py -v`
Expected: FAIL

**Step 3: Write the route handler**

```python
# apps/api/src/routes/roles.py
"""Role management API routes — Discord-style role CRUD."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.db import get_db
from src.middleware.auth import get_current_user
from src.schemas.role import (
    CreateRoleRequest,
    RoleListResponse,
    RoleResponse,
)
from src.services.permissions import PERMISSION_CATALOG, PERMISSION_CATEGORIES
from src.services.role_seed import SYSTEM_ROLE_TEMPLATES

router = APIRouter(prefix="/api/v1/roles", tags=["roles"])


@router.get("/permissions")
def get_permission_catalog(
    current_user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Return the full permission catalog with categories."""
    return {
        "categories": PERMISSION_CATEGORIES,
        "permissions": PERMISSION_CATALOG,
    }


@router.get("/templates")
def get_role_templates(
    current_user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Return all system role templates for the role creation UI."""
    return {
        "templates": SYSTEM_ROLE_TEMPLATES,
        "total": len(SYSTEM_ROLE_TEMPLATES),
    }


@router.get("")
def list_roles(
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> RoleListResponse:
    """List all roles in the workspace."""
    roles = [
        RoleResponse(
            id=f"role_{i:03d}",
            workspace_id=current_user.get("workspace_id", ""),
            name=t["name"],
            description=t["description"],
            color=t["color"],
            permissions=t["permissions"],
            hierarchy_position=t["hierarchy_position"],
            archetype_tag=t.get("archetype_tag"),
            chamber_affinity=[t["chamber"]] if t.get("chamber") else [],
            pi_fit_profiles=t.get("pi_fit_profiles", []),
            agentic_role=t.get("agentic_role"),
            is_system=True,
            is_editable=True,
            category=t["category"],
            chamber=t.get("chamber"),
            member_count=0,
        )
        for i, t in enumerate(SYSTEM_ROLE_TEMPLATES)
    ]
    return RoleListResponse(roles=roles, total=len(roles))


@router.post("", status_code=status.HTTP_201_CREATED)
def create_role(
    body: CreateRoleRequest,
    current_user: dict = Depends(get_current_user),  # noqa: B008
    db: Session = Depends(get_db),  # noqa: B008
) -> RoleResponse:
    """Create a new custom role."""
    workspace_id = current_user.get("workspace_id", "")
    return RoleResponse(
        id="role_new",
        workspace_id=workspace_id,
        name=body.name,
        description=body.description,
        color=body.color,
        permissions=body.permissions,
        hierarchy_position=body.hierarchy_position,
        archetype_tag=body.archetype_tag,
        chamber_affinity=body.chamber_affinity,
        pi_fit_profiles=body.pi_fit_profiles,
        agentic_role=body.agentic_role,
        is_system=False,
        is_editable=True,
        category=body.category,
        chamber=body.chamber,
        member_count=0,
    )
```

**Step 4: Register router in main.py**

Add to `apps/api/src/main.py` imports (after pi_router):

```python
from src.routes.roles import router as role_router
```

Add in `create_app()` after `app.include_router(pi_router)`:

```python
    app.include_router(role_router)
```

**Step 5: Run test to verify it passes**

Run: `cd apps/api && python -m pytest tests/test_role_routes.py -v`
Expected: All 4 tests PASS

**Step 6: Commit**

```bash
git add apps/api/src/routes/roles.py apps/api/src/main.py apps/api/tests/test_role_routes.py
git commit -m "feat(api): add role management API routes with permission catalog endpoint"
```

---

## Task 10: Frontend Role Types and Mock Data

**Files:**

- Modify: `apps/web/src/lib/mock-admin.ts`

**Step 1: Add role types and mock data**

Add `RoleCategory`, `RoleTemplate`, `PermissionInfo` types after `PIAssessment` interface. Add `ROLE_CATEGORY_CONFIG` after `META_ARCHETYPE_CONFIG`. Add `MOCK_ROLES` array (4 representative roles: Scout, Verifier, Publisher, Orchestrator) after `MOCK_PI_ASSESSMENTS`.

See full code in design doc Task 10.

**Step 2: Verify build passes**

Run: `cd /home/user/airlock-app && pnpm type-check`
Expected: No type errors

**Step 3: Commit**

```bash
git add apps/web/src/lib/mock-admin.ts
git commit -m "feat(web): add role template types and mock role data"
```

---

## Task 11: Admin Roles Page + RolesPanel Organism

**Files:**

- Create: `apps/web/src/app/(shell)/admin/roles/page.tsx`
- Create: `apps/web/src/components/organisms/RolesPanel.tsx`
- Modify: `apps/web/src/app/(shell)/admin/layout.tsx` (add Roles nav item)
- Modify: `apps/web/src/stores/admin.store.ts` (add roles state)

**Step 1: Add roles to admin store**

Add `RoleTemplate` to imports and `MOCK_ROLES` to mock imports. Add `roles: RoleTemplate[]` to state interface. Add `roles: []` to initial state and `roles: MOCK_ROLES` to fetchAdmin.

**Step 2: Create RolesPanel organism**

Discord-style role list with: header + "Create Role" button, role count header, colored dot + name + SYSTEM badge + category label per row, member count + edit/menu buttons.

**Step 3: Create admin roles page**

Standard admin page pattern: `"use client"`, `useEffect(fetchAdmin)`, single `<RolesPanel />` in scrollable container.

**Step 4: Add "Roles" to admin layout NAV_ITEMS**

After `{ label: "Members", href: "/admin/members" }`.

**Step 5: Verify build passes**

Run: `cd /home/user/airlock-app && pnpm type-check`
Expected: No type errors

**Step 6: Commit**

```bash
git add apps/web/src/components/organisms/RolesPanel.tsx apps/web/src/app/\(shell\)/admin/roles/page.tsx apps/web/src/app/\(shell\)/admin/layout.tsx apps/web/src/stores/admin.store.ts
git commit -m "feat(web): add Roles admin page with Discord-style role list panel"
```

---

## Task 12: Final Verification and Push

**Step 1: Run all backend tests**

Run: `cd apps/api && python -m pytest tests/ -v`
Expected: All tests pass (existing + new)

**Step 2: Run frontend type check**

Run: `cd /home/user/airlock-app && pnpm type-check`
Expected: No errors

**Step 3: Run lint**

Run: `cd /home/user/airlock-app && pnpm lint`
Expected: No errors

**Step 4: Push**

```bash
git push -u origin claude/review-demo-readiness-plan-Tt4Ai
```

---

## Summary

| Task | What                                        | Files                                                        | Tests |
| ---- | ------------------------------------------- | ------------------------------------------------------------ | ----- |
| 1    | Permission catalog (31 perms, 8 categories) | `services/permissions.py`                                    | 11    |
| 2    | Role template model                         | `models/role.py`                                             | 4     |
| 3    | UserRole + PermissionOverride models        | `models/user_role.py`, `models/permission_override.py`       | 5     |
| 4    | Alembic migration 005                       | `migrations/versions/005_*.py`                               | —     |
| 5    | Permission computation engine               | `services/permission_engine.py`                              | 8     |
| 6    | System role template seed data (19)         | `services/role_seed.py`                                      | 8     |
| 7    | Role CRUD service + PI fit scoring          | `services/role_service.py`                                   | 5     |
| 8    | Pydantic schemas for roles                  | `schemas/role.py`                                            | 5     |
| 9    | Role API routes + register                  | `routes/roles.py` + `main.py`                                | 4     |
| 10   | Frontend role types + mock data             | `mock-admin.ts`                                              | —     |
| 11   | Admin Roles page + RolesPanel               | `RolesPanel.tsx`, `page.tsx`, `layout.tsx`, `admin.store.ts` | —     |
| 12   | Verification + push                         | —                                                            | —     |

**Total new tests:** 50
**Total new files:** 12
**Total modified files:** 4

**MCP Consideration:** The permission catalog, role templates, and permission engine are all pure functions with no DB dependency. MCP tools can import and use them directly for workspace bootstrapping and permission checks.
