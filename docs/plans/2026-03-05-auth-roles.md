# Milestone 2: Auth + Roles — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Google OAuth login, JWT token management, core database tables (users, workspaces, role assignments), auth middleware, a frontend login page, and protected routes — establishing the identity layer Airlock needs before vault CRUD.

**Architecture:** Frontend uses Google Identity Services (GIS) to get an ID token, sends it to `POST /api/v1/auth/google/verify`. The API verifies the token with Google, upserts the user, issues a JWT pair (15-min access + 7-day refresh). The frontend stores tokens and attaches them to all API calls. A FastAPI dependency (`get_current_user`) decodes the JWT on protected routes. Next.js middleware redirects unauthenticated users to `/login`.

**Tech Stack:** FastAPI, SQLAlchemy 2.0 (async), Alembic, python-jose (JWT), google-auth (token verification), httpx, Next.js 14 App Router, Zustand, @react-oauth/google.

---

## Task 1: SQLAlchemy Database Foundation

**Files:**

- Create: `apps/api/src/db.py`
- Modify: `apps/api/src/main.py`
- Modify: `apps/api/src/migrations/env.py`

**Step 1: Create database module**

```python
# apps/api/src/db.py
"""Database engine, session factory, and declarative base."""

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from src.config import settings


class Base(DeclarativeBase):
    """SQLAlchemy declarative base for all models."""
    pass


engine = create_engine(settings.database_url, echo=settings.debug)

SessionLocal = sessionmaker(bind=engine, class_=Session, expire_on_commit=False)


def get_db():
    """FastAPI dependency — yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**Step 2: Wire Alembic to Base.metadata**

Update `apps/api/src/migrations/env.py`:

- Change `target_metadata = None` → `from src.db import Base` + `target_metadata = Base.metadata`
- Add model imports so autogenerate detects them

```python
# At the top of env.py, after existing imports:
from src.db import Base
# Import all models so Alembic detects them
from src.models.user import User  # noqa: F401
from src.models.workspace import Workspace  # noqa: F401

target_metadata = Base.metadata
```

**Step 3: Verify**

Run: `cd apps/api && python -c "from src.db import Base, engine; print('DB module OK')"`
Expected: `DB module OK`

**Step 4: Commit**

```bash
git add apps/api/src/db.py apps/api/src/migrations/env.py
git commit -m "feat(api): add SQLAlchemy database foundation (engine, session, Base)"
```

---

## Task 2: Core Models — User + Workspace

**Files:**

- Create: `apps/api/src/models/user.py`
- Create: `apps/api/src/models/workspace.py`
- Modify: `apps/api/src/models/__init__.py`
- Test: `apps/api/tests/test_models.py`

**Step 1: Write the User model**

```python
# apps/api/src/models/user.py
"""User model — identity and profile data."""

from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(Text, primary_key=True)  # ULID
    workspace_id: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(320), nullable=False, unique=True)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    google_sub: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="active"
    )  # active | inactive
    org_role: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="member"
    )  # member | lead | director | executive
    metadata_: Mapped[dict] = mapped_column(
        "metadata", JSONB, nullable=False, server_default="{}"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
```

**Step 2: Write the Workspace model**

```python
# apps/api/src/models/workspace.py
"""Workspace model — multi-tenant container."""

from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.db import Base


class Workspace(Base):
    __tablename__ = "workspaces"

    id: Mapped[str] = mapped_column(Text, primary_key=True)  # ULID
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    metadata_: Mapped[dict] = mapped_column(
        "metadata", JSONB, nullable=False, server_default="{}"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
```

**Step 3: Export models from **init\*\*\*\*

```python
# apps/api/src/models/__init__.py
from src.models.user import User
from src.models.workspace import Workspace

__all__ = ["User", "Workspace"]
```

**Step 4: Write a quick import test**

```python
# apps/api/tests/test_models.py
"""Verify models import and have expected table names."""

def test_user_model_table_name():
    from src.models.user import User
    assert User.__tablename__ == "users"

def test_workspace_model_table_name():
    from src.models.workspace import Workspace
    assert Workspace.__tablename__ == "workspaces"
```

**Step 5: Run tests**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_models.py -v`
Expected: 2 PASSED

**Step 6: Commit**

```bash
git add apps/api/src/models/ apps/api/tests/test_models.py
git commit -m "feat(api): add User and Workspace SQLAlchemy models"
```

---

## Task 3: User Module Roles Model

**Files:**

- Create: `apps/api/src/models/user_module_role.py`
- Modify: `apps/api/src/models/__init__.py`
- Modify: `apps/api/src/migrations/env.py` (add import)
- Test: `apps/api/tests/test_models.py` (extend)

**Step 1: Write the UserModuleRole model**

```python
# apps/api/src/models/user_module_role.py
"""User module role assignments — per-module RBAC."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from src.db import Base


class UserModuleRole(Base):
    __tablename__ = "user_module_roles"

    user_id: Mapped[str] = mapped_column(
        Text, ForeignKey("users.id"), primary_key=True
    )
    workspace_id: Mapped[str] = mapped_column(
        Text, ForeignKey("workspaces.id"), primary_key=True
    )
    module_id: Mapped[str] = mapped_column(
        String(50), primary_key=True
    )  # contracts | crm | tasks | calendar | documents
    module_role: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="viewer"
    )  # builder | gatekeeper | owner | designer | viewer
    assigned_by: Mapped[str | None] = mapped_column(Text, nullable=True)
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
```

**Step 2: Update **init** and env.py**

Add `from src.models.user_module_role import UserModuleRole` to both files.

**Step 3: Add test**

```python
def test_user_module_role_table_name():
    from src.models.user_module_role import UserModuleRole
    assert UserModuleRole.__tablename__ == "user_module_roles"
```

**Step 4: Run tests**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_models.py -v`
Expected: 3 PASSED

**Step 5: Commit**

```bash
git add apps/api/src/models/ apps/api/src/migrations/env.py apps/api/tests/test_models.py
git commit -m "feat(api): add UserModuleRole model for per-module RBAC"
```

---

## Task 4: Alembic Migration — Core Auth Tables

**Files:**

- Create: `apps/api/src/migrations/versions/<autogenerated>.py`

**Prerequisites:** PostgreSQL must be running: `docker compose up -d postgres`

**Step 1: Generate migration**

Run: `cd apps/api && .venv/bin/python -m alembic revision --autogenerate -m "add users workspaces and user_module_roles"`
Expected: Creates a migration file in `src/migrations/versions/`

**Step 2: Review generated migration**

Read the generated file. Verify it has:

- `create_table("workspaces", ...)` with id, name, slug, metadata, timestamps, deleted_at
- `create_table("users", ...)` with all columns including google_sub, org_role
- `create_table("user_module_roles", ...)` with composite PK and foreign keys
- A `downgrade()` that drops all three tables

**Step 3: Run migration**

Run: `cd apps/api && .venv/bin/python -m alembic upgrade head`
Expected: Tables created in PostgreSQL

**Step 4: Verify tables exist**

Run: `docker compose exec postgres psql -U airlock -c "\dt"`
Expected: Shows `users`, `workspaces`, `user_module_roles` tables

**Step 5: Commit**

```bash
git add apps/api/src/migrations/
git commit -m "feat(api): add initial migration — users, workspaces, user_module_roles"
```

---

## Task 5: JWT Utilities

**Files:**

- Create: `apps/api/src/services/jwt.py`
- Test: `apps/api/tests/test_jwt.py`

**Step 1: Write failing test**

```python
# apps/api/tests/test_jwt.py
"""JWT creation and verification tests."""

from src.services.jwt import create_access_token, create_refresh_token, verify_token


def test_create_and_verify_access_token():
    payload = {"sub": "user_123", "email": "test@example.com"}
    token = create_access_token(payload)
    decoded = verify_token(token)
    assert decoded["sub"] == "user_123"
    assert decoded["email"] == "test@example.com"
    assert decoded["type"] == "access"


def test_create_and_verify_refresh_token():
    payload = {"sub": "user_123"}
    token = create_refresh_token(payload)
    decoded = verify_token(token)
    assert decoded["sub"] == "user_123"
    assert decoded["type"] == "refresh"


def test_verify_invalid_token():
    result = verify_token("invalid.token.here")
    assert result is None


def test_verify_wrong_type():
    """Access token should not validate as refresh and vice versa."""
    token = create_access_token({"sub": "user_123"})
    decoded = verify_token(token)
    assert decoded["type"] == "access"
```

**Step 2: Run tests to confirm failure**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_jwt.py -v`
Expected: FAIL (module not found)

**Step 3: Implement JWT service**

```python
# apps/api/src/services/jwt.py
"""JWT token creation and verification."""

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from src.config import settings


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_access_expire_minutes)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.jwt_refresh_expire_days)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def verify_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return payload
    except JWTError:
        return None
```

**Step 4: Run tests**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_jwt.py -v`
Expected: 4 PASSED

**Step 5: Commit**

```bash
git add apps/api/src/services/jwt.py apps/api/tests/test_jwt.py
git commit -m "feat(api): add JWT access/refresh token service with tests"
```

---

## Task 6: Auth Service — Google Token Verification + User Upsert

**Files:**

- Create: `apps/api/src/services/auth.py`
- Test: `apps/api/tests/test_auth_service.py`

**Step 1: Write failing test**

```python
# apps/api/tests/test_auth_service.py
"""Auth service tests (mocked Google verification)."""

from unittest.mock import MagicMock, patch

import pytest

from src.services.auth import authenticate_google_user


class TestAuthenticateGoogleUser:
    """Test the Google OAuth → JWT flow."""

    @patch("src.services.auth.id_token.verify_oauth2_token")
    def test_new_user_created(self, mock_verify, tmp_path):
        """First-time Google login creates user and returns tokens."""
        mock_verify.return_value = {
            "sub": "google_abc123",
            "email": "jane@example.com",
            "name": "Jane Builder",
            "picture": "https://example.com/photo.jpg",
        }

        # Use a mock DB session
        mock_db = MagicMock()
        mock_db.execute.return_value.scalar_one_or_none.return_value = None  # no existing user

        result = authenticate_google_user(
            credential="fake-google-id-token",
            workspace_id="ws_test123",
            db=mock_db,
        )

        assert result is not None
        assert "access_token" in result
        assert "refresh_token" in result
        assert result["user"]["email"] == "jane@example.com"

    @patch("src.services.auth.id_token.verify_oauth2_token")
    def test_invalid_token_returns_none(self, mock_verify):
        """Invalid Google token returns None."""
        mock_verify.side_effect = ValueError("Invalid token")

        mock_db = MagicMock()
        result = authenticate_google_user(
            credential="bad-token",
            workspace_id="ws_test123",
            db=mock_db,
        )

        assert result is None
```

**Step 2: Run test to confirm failure**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_auth_service.py -v`
Expected: FAIL (import error)

**Step 3: Implement auth service**

```python
# apps/api/src/services/auth.py
"""Authentication service — Google OAuth verification + user upsert."""

import logging

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from sqlalchemy import select
from sqlalchemy.orm import Session
from ulid import ULID

from src.config import settings
from src.models.user import User
from src.services.jwt import create_access_token, create_refresh_token

logger = logging.getLogger(__name__)


def authenticate_google_user(
    credential: str,
    workspace_id: str,
    db: Session,
) -> dict | None:
    """Verify Google ID token, upsert user, return JWT pair."""

    # 1. Verify Google ID token
    try:
        idinfo = id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            settings.google_client_id,
        )
    except ValueError as e:
        logger.warning("Google token verification failed: %s", e)
        return None

    email = idinfo.get("email", "").strip().lower()
    google_sub = idinfo.get("sub", "")
    name = idinfo.get("name", "")
    picture = idinfo.get("picture", "")

    if not email:
        logger.warning("Google token missing email claim")
        return None

    # 2. Upsert user
    stmt = select(User).where(User.email == email)
    user = db.execute(stmt).scalar_one_or_none()

    if user is None:
        user = User(
            id=str(ULID()),
            workspace_id=workspace_id,
            email=email,
            display_name=name,
            avatar_url=picture,
            google_sub=google_sub,
            org_role="member",
        )
        db.add(user)
    else:
        # Update Google profile data
        user.google_sub = google_sub
        if picture:
            user.avatar_url = picture
        if name and not user.display_name:
            user.display_name = name

    db.commit()
    db.refresh(user)

    # 3. Issue JWT pair
    token_data = {
        "sub": user.id,
        "email": user.email,
        "workspace_id": user.workspace_id,
        "org_role": user.org_role,
    }

    return {
        "access_token": create_access_token(token_data),
        "refresh_token": create_refresh_token(token_data),
        "user": {
            "id": user.id,
            "email": user.email,
            "display_name": user.display_name,
            "avatar_url": user.avatar_url,
            "org_role": user.org_role,
        },
    }
```

**Step 4: Run tests**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_auth_service.py -v`
Expected: 2 PASSED

**Step 5: Commit**

```bash
git add apps/api/src/services/auth.py apps/api/tests/test_auth_service.py
git commit -m "feat(api): add auth service — Google token verification + user upsert"
```

---

## Task 7: Auth Middleware — get_current_user Dependency

**Files:**

- Create: `apps/api/src/middleware/auth.py`
- Test: `apps/api/tests/test_auth_middleware.py`

**Step 1: Write failing test**

```python
# apps/api/tests/test_auth_middleware.py
"""Auth middleware dependency tests."""

import pytest
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient

from src.middleware.auth import get_current_user
from src.services.jwt import create_access_token


app = FastAPI()

@app.get("/protected")
async def protected_route(user: dict = Depends(get_current_user)):
    return {"user_id": user["sub"]}


client = TestClient(app)


def test_valid_token_passes():
    token = create_access_token({"sub": "user_123", "email": "test@example.com"})
    resp = client.get("/protected", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["user_id"] == "user_123"


def test_missing_token_returns_401():
    resp = client.get("/protected")
    assert resp.status_code == 401


def test_invalid_token_returns_401():
    resp = client.get("/protected", headers={"Authorization": "Bearer garbage"})
    assert resp.status_code == 401
```

**Step 2: Run to confirm failure**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_auth_middleware.py -v`
Expected: FAIL

**Step 3: Implement middleware**

```python
# apps/api/src/middleware/auth.py
"""Authentication middleware — FastAPI dependencies."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.services.jwt import verify_token

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    """Decode JWT from Authorization header. Raises 401 if invalid."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    payload = verify_token(credentials.credentials)
    if payload is None or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    return payload
```

**Step 4: Run tests**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_auth_middleware.py -v`
Expected: 3 PASSED

**Step 5: Commit**

```bash
git add apps/api/src/middleware/auth.py apps/api/tests/test_auth_middleware.py
git commit -m "feat(api): add auth middleware — get_current_user JWT dependency"
```

---

## Task 8: Auth Routes — /auth/google/verify, /auth/refresh, /auth/me

**Files:**

- Create: `apps/api/src/routes/auth.py`
- Modify: `apps/api/src/main.py` (register router)
- Test: `apps/api/tests/test_auth_routes.py`

**Step 1: Write failing tests**

```python
# apps/api/tests/test_auth_routes.py
"""Auth route integration tests."""

from unittest.mock import patch

from fastapi.testclient import TestClient

from src.main import app
from src.services.jwt import create_access_token, create_refresh_token

client = TestClient(app)


def test_auth_config_endpoint():
    resp = client.get("/api/v1/auth/config")
    assert resp.status_code == 200
    data = resp.json()
    assert "configured" in data


def test_auth_me_without_token():
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401


def test_auth_me_with_valid_token():
    token = create_access_token({
        "sub": "user_123",
        "email": "test@example.com",
        "workspace_id": "ws_test",
        "org_role": "member",
    })
    resp = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["user_id"] == "user_123"


def test_auth_refresh():
    refresh = create_refresh_token({"sub": "user_123", "email": "test@example.com"})
    resp = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh},
    )
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_google_verify_missing_credential():
    resp = client.post("/api/v1/auth/google/verify", json={"workspace_id": "ws_test"})
    assert resp.status_code == 422  # Pydantic validation
```

**Step 2: Run to confirm failure**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_auth_routes.py -v`
Expected: FAIL

**Step 3: Implement auth routes**

```python
# apps/api/src/routes/auth.py
"""Auth routes — Google OAuth, token refresh, current user."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.db import get_db
from src.config import settings
from src.middleware.auth import get_current_user
from src.services.auth import authenticate_google_user
from src.services.jwt import create_access_token, verify_token

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


class GoogleVerifyRequest(BaseModel):
    credential: str
    workspace_id: str


class RefreshRequest(BaseModel):
    refresh_token: str


@router.get("/config")
async def auth_config():
    """Return OAuth configuration (safe to call unauthenticated)."""
    return {
        "google_client_id": settings.google_client_id or None,
        "configured": bool(settings.google_client_id),
    }


@router.post("/google/verify")
async def google_verify(body: GoogleVerifyRequest, db: Session = Depends(get_db)):
    """Exchange Google ID token for Airlock JWT pair."""
    result = authenticate_google_user(
        credential=body.credential,
        workspace_id=body.workspace_id,
        db=db,
    )
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google authentication failed",
        )
    return result


@router.post("/refresh")
async def refresh_token(body: RefreshRequest):
    """Exchange refresh token for a new access token."""
    payload = verify_token(body.refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    new_access = create_access_token({
        "sub": payload["sub"],
        "email": payload.get("email"),
        "workspace_id": payload.get("workspace_id"),
        "org_role": payload.get("org_role"),
    })
    return {"access_token": new_access}


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Return the current authenticated user's identity."""
    return {
        "user_id": user["sub"],
        "email": user.get("email"),
        "workspace_id": user.get("workspace_id"),
        "org_role": user.get("org_role"),
    }
```

**Step 4: Register router in main.py**

Add to `create_app()` in `apps/api/src/main.py`:

```python
from src.routes.auth import router as auth_router
# Inside create_app(), after CORS:
app.include_router(auth_router)
```

**Step 5: Run tests**

Run: `cd apps/api && .venv/bin/python -m pytest tests/test_auth_routes.py -v`
Expected: 5 PASSED

**Step 6: Commit**

```bash
git add apps/api/src/routes/auth.py apps/api/src/main.py apps/api/tests/test_auth_routes.py
git commit -m "feat(api): add auth routes — google/verify, refresh, me, config"
```

---

## Task 9: Dev Auth Bypass (Development Only)

**Files:**

- Modify: `apps/api/src/middleware/auth.py`
- Modify: `apps/api/src/routes/auth.py`

For local development without Google OAuth credentials, add a dev login endpoint and bypass.

**Step 1: Add dev login route**

Add to `apps/api/src/routes/auth.py`:

```python
@router.post("/dev/login")
async def dev_login(db: Session = Depends(get_db)):
    """Dev-only: create/fetch a seed user and return tokens. Disabled in production."""
    if settings.environment != "development":
        raise HTTPException(status_code=404)

    from sqlalchemy import select
    from ulid import ULID
    from src.models.user import User

    email = "dev@airlock.local"
    stmt = select(User).where(User.email == email)
    user = db.execute(stmt).scalar_one_or_none()

    if user is None:
        user = User(
            id=str(ULID()),
            workspace_id="ws_dev",
            email=email,
            display_name="Dev User",
            org_role="executive",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token_data = {
        "sub": user.id,
        "email": user.email,
        "workspace_id": user.workspace_id,
        "org_role": user.org_role,
    }
    return {
        "access_token": create_access_token(token_data),
        "refresh_token": create_refresh_token(token_data),
        "user": {
            "id": user.id,
            "email": user.email,
            "display_name": user.display_name,
            "avatar_url": user.avatar_url,
            "org_role": user.org_role,
        },
    }
```

Don't forget to also import `create_refresh_token` at the top of the file.

**Step 2: Commit**

```bash
git add apps/api/src/routes/auth.py
git commit -m "feat(api): add dev-only login bypass for local development"
```

---

## Task 10: Install @react-oauth/google on Frontend

**Files:**

- Modify: `apps/web/package.json` (via pnpm install)

**Step 1: Install**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && cd apps/web && pnpm add @react-oauth/google`

**Step 2: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "deps(web): add @react-oauth/google for OAuth login"
```

---

## Task 11: Frontend Auth Provider + API Client Update

**Files:**

- Create: `apps/web/src/providers/AuthProvider.tsx`
- Modify: `apps/web/src/lib/api.ts`
- Modify: `apps/web/src/stores/auth.store.ts`
- Modify: `apps/web/src/app/layout.tsx`

**Step 1: Update the API client to attach JWT**

```typescript
// apps/web/src/lib/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("airlock_access_token");
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const token = getAccessToken();

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}
```

**Step 2: Add hydration actions to auth store**

```typescript
// apps/web/src/stores/auth.store.ts — add these actions:
  /** Hydrate from API response (login/refresh) */
  hydrateFromLoginResponse: (response: {
    access_token: string;
    refresh_token: string;
    user: { id: string; email: string; display_name: string; avatar_url?: string; org_role: string };
  }) => void;
```

Implementation:

```typescript
hydrateFromLoginResponse: (response) => {
  localStorage.setItem("airlock_access_token", response.access_token);
  localStorage.setItem("airlock_refresh_token", response.refresh_token);
  set({
    user: {
      id: response.user.id,
      email: response.user.email,
      name: response.user.display_name,
      avatarUrl: response.user.avatar_url,
    },
    orgRole: response.user.org_role as OrgRole,
    accessToken: response.access_token,
    isLoading: false,
  });
},
```

Also update `logout` to clear localStorage:

```typescript
logout: () => {
  localStorage.removeItem("airlock_access_token");
  localStorage.removeItem("airlock_refresh_token");
  set({
    user: null,
    orgRole: null,
    moduleRoles: {},
    accessToken: null,
    isLoading: false,
  });
},
```

**Step 3: Create AuthProvider**

```typescript
// apps/web/src/providers/AuthProvider.tsx
"use client";

import { useEffect } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { useAuthStore } from "@/stores/auth.store";
import { apiFetch } from "@/lib/api";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const { setUser, setOrgRole, setAccessToken, isLoading } = useAuthStore();

  useEffect(() => {
    // Try to restore session from stored token
    const token = localStorage.getItem("airlock_access_token");
    if (!token) {
      useAuthStore.getState().setUser(null);
      return;
    }

    apiFetch<{
      user_id: string;
      email: string;
      workspace_id: string;
      org_role: string;
    }>("/api/v1/auth/me")
      .then((data) => {
        setUser({ id: data.user_id, email: data.email, name: data.email });
        setOrgRole(data.org_role as "member" | "lead" | "director" | "executive");
        setAccessToken(token);
      })
      .catch(() => {
        // Token expired or invalid — clear
        localStorage.removeItem("airlock_access_token");
        localStorage.removeItem("airlock_refresh_token");
        useAuthStore.getState().setUser(null);
      });
  }, [setUser, setOrgRole, setAccessToken]);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {children}
    </GoogleOAuthProvider>
  );
}
```

**Step 4: Wrap root layout with AuthProvider**

In `apps/web/src/app/layout.tsx`, import and wrap:

```tsx
import AuthProvider from "@/providers/AuthProvider";

// Inside the <body>:
<AuthProvider>
  <ShellLayout>{children}</ShellLayout>
</AuthProvider>;
```

**Step 5: Run type-check and lint**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && pnpm turbo run type-check lint`
Expected: 0 errors

**Step 6: Commit**

```bash
git add apps/web/src/providers/ apps/web/src/lib/api.ts apps/web/src/stores/auth.store.ts apps/web/src/app/layout.tsx
git commit -m "feat(web): add AuthProvider, JWT-bearing API client, auth store hydration"
```

---

## Task 12: Login Page

**Files:**

- Create: `apps/web/src/app/login/page.tsx`

**Step 1: Create login page**

```tsx
// apps/web/src/app/login/page.tsx
"use client";

import { GoogleLogin } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { apiFetch } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const hydrateFromLoginResponse = useAuthStore(
    (s) => s.hydrateFromLoginResponse,
  );

  const handleGoogleSuccess = async (credentialResponse: {
    credential?: string;
  }) => {
    if (!credentialResponse.credential) return;

    try {
      const result = await apiFetch<{
        access_token: string;
        refresh_token: string;
        user: {
          id: string;
          email: string;
          display_name: string;
          avatar_url?: string;
          org_role: string;
        };
      }>("/api/v1/auth/google/verify", {
        method: "POST",
        body: JSON.stringify({
          credential: credentialResponse.credential,
          workspace_id: "ws_default",
        }),
      });

      hydrateFromLoginResponse(result);
      router.push("/");
    } catch {
      // TODO: show error toast
      console.error("Login failed");
    }
  };

  const handleDevLogin = async () => {
    try {
      const result = await apiFetch<{
        access_token: string;
        refresh_token: string;
        user: {
          id: string;
          email: string;
          display_name: string;
          avatar_url?: string;
          org_role: string;
        };
      }>("/api/v1/auth/dev/login", { method: "POST" });

      hydrateFromLoginResponse(result);
      router.push("/");
    } catch {
      console.error("Dev login failed");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-base">
      <div className="w-full max-w-sm rounded-xl bg-surface-raised p-8 border border-surface-border">
        <h1 className="text-2xl font-bold text-text-primary mb-2 text-center">
          Airlock
        </h1>
        <p className="text-text-secondary text-sm mb-8 text-center">
          Sign in to your workspace
        </p>

        <div className="flex flex-col gap-4 items-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => console.error("Google login error")}
            theme="filled_black"
            shape="pill"
            size="large"
            width="320"
          />

          {process.env.NODE_ENV === "development" && (
            <>
              <div className="flex items-center gap-2 w-full">
                <div className="flex-1 h-px bg-surface-border" />
                <span className="text-text-muted text-xs">DEV ONLY</span>
                <div className="flex-1 h-px bg-surface-border" />
              </div>
              <button
                onClick={handleDevLogin}
                className="w-full rounded-lg bg-surface-overlay px-4 py-2 text-sm
                           text-text-secondary hover:text-text-primary
                           border border-surface-border hover:border-accent-primary
                           transition-colors"
              >
                Dev Login (no Google required)
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Run type-check**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && pnpm turbo run type-check`
Expected: 0 errors

**Step 3: Commit**

```bash
git add apps/web/src/app/login/
git commit -m "feat(web): add login page with Google OAuth + dev bypass"
```

---

## Task 13: Next.js Middleware — Protected Routes

**Files:**

- Create: `apps/web/src/middleware.ts`

**Step 1: Create middleware**

```typescript
// apps/web/src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/api", "/_next", "/favicon.ico"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check for access token in cookie or header
  // Note: localStorage isn't accessible in middleware, so we use a cookie
  const token = request.cookies.get("airlock_access_token")?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

**Important:** This requires the AuthProvider to also set a cookie (not just localStorage). Update the `hydrateFromLoginResponse` in auth.store.ts to set a cookie:

```typescript
// Add to hydrateFromLoginResponse:
document.cookie = `airlock_access_token=${response.access_token}; path=/; max-age=${15 * 60}; SameSite=Lax`;
```

And update `logout` to clear it:

```typescript
document.cookie = "airlock_access_token=; path=/; max-age=0";
```

**Step 2: Verify login page is excluded from redirect**

The login page must NOT be behind the auth wall. PUBLIC_PATHS includes `/login`.

**Step 3: Run build**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && pnpm turbo run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add apps/web/src/middleware.ts apps/web/src/stores/auth.store.ts
git commit -m "feat(web): add Next.js middleware — redirect unauthenticated to /login"
```

---

## Task 14: Login Page Layout Bypass

**Files:**

- Create: `apps/web/src/app/login/layout.tsx`

The login page should NOT render inside the ShellLayout (no ModuleBar/SubPanel). Override the root layout's shell:

```tsx
// apps/web/src/app/login/layout.tsx
export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
```

**But wait** — the root layout wraps everything in ShellLayout. We need to restructure so that `/login` escapes the shell. Two approaches:

**Approach: Move ShellLayout into a route group**

1. The root `layout.tsx` should only have html/body/AuthProvider (no ShellLayout)
2. Create `(shell)/layout.tsx` that wraps children in ShellLayout
3. Move the `(modules)` group inside `(shell)`
4. `/login/page.tsx` stays outside `(shell)` — no shell chrome

This is the cleaner App Router pattern. The task involves:

- Modify `apps/web/src/app/layout.tsx` — remove ShellLayout wrapper
- Create `apps/web/src/app/(shell)/layout.tsx` — add ShellLayout here
- Move `apps/web/src/app/(modules)/` → `apps/web/src/app/(shell)/(modules)/`
- Move other module pages (admin, etc.) into `(shell)` too

**Step 1: Restructure layouts**

Root layout becomes:

```tsx
// apps/web/src/app/layout.tsx
<html>
  <body>
    <AuthProvider>{children}</AuthProvider>
  </body>
</html>
```

Shell layout:

```tsx
// apps/web/src/app/(shell)/layout.tsx
import ShellLayout from "@/components/templates/ShellLayout";

export default function ShellGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ShellLayout>{children}</ShellLayout>;
}
```

**Step 2: Move route directories**

Move `(modules)/` into `(shell)/`. Also move standalone module pages (admin, etc.) into `(shell)/`.

**Step 3: Run build to verify**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && pnpm turbo run build`
Expected: All routes still render correctly

**Step 4: Commit**

```bash
git add apps/web/src/app/
git commit -m "feat(web): restructure routes — (shell) group for auth-protected pages, login outside shell"
```

---

## Task 15: Full Integration Verification

**Step 1: Run all backend tests**

Run: `cd apps/api && .venv/bin/python -m pytest -v`
Expected: All tests pass

**Step 2: Run all frontend checks**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && pnpm turbo run type-check lint build`
Expected: 0 errors, build succeeds

**Step 3: Manual verification**

1. Start infra: `docker compose up -d postgres redis`
2. Run migration: `cd apps/api && .venv/bin/python -m alembic upgrade head`
3. Start API: `cd apps/api && .venv/bin/uvicorn src.main:app --reload`
4. Start frontend: `source ~/.nvm/nvm.sh && nvm use 20 && pnpm dev`
5. Navigate to `http://localhost:3000` — should redirect to `/login`
6. Click "Dev Login" — should redirect back to `/` with shell visible
7. Navigate to `http://localhost:3000/contracts/triage` — should render with shell (no redirect)

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(auth): complete Milestone 2 — Google OAuth, JWT, RBAC, login page, protected routes"
```

Push:

```bash
git push
```

---

## Summary: File Inventory

### Backend (apps/api/)

| Action | File                                     |
| ------ | ---------------------------------------- |
| Create | `src/db.py`                              |
| Create | `src/models/user.py`                     |
| Create | `src/models/workspace.py`                |
| Create | `src/models/user_module_role.py`         |
| Create | `src/services/jwt.py`                    |
| Create | `src/services/auth.py`                   |
| Create | `src/middleware/auth.py`                 |
| Create | `src/routes/auth.py`                     |
| Create | `src/migrations/versions/<migration>.py` |
| Create | `tests/test_models.py`                   |
| Create | `tests/test_jwt.py`                      |
| Create | `tests/test_auth_service.py`             |
| Create | `tests/test_auth_middleware.py`          |
| Create | `tests/test_auth_routes.py`              |
| Modify | `src/main.py`                            |
| Modify | `src/models/__init__.py`                 |
| Modify | `src/migrations/env.py`                  |

### Frontend (apps/web/)

| Action | File                                                |
| ------ | --------------------------------------------------- |
| Create | `src/providers/AuthProvider.tsx`                    |
| Create | `src/app/login/page.tsx`                            |
| Create | `src/app/(shell)/layout.tsx`                        |
| Create | `src/middleware.ts`                                 |
| Modify | `src/app/layout.tsx`                                |
| Modify | `src/lib/api.ts`                                    |
| Modify | `src/stores/auth.store.ts`                          |
| Move   | `src/app/(modules)/` → `src/app/(shell)/(modules)/` |

### Dependencies

| Package               | Where                                          |
| --------------------- | ---------------------------------------------- |
| `@react-oauth/google` | apps/web                                       |
| `google-auth`         | apps/api (needs to be added to pyproject.toml) |

---

## Dependency Note

The `google-auth` and `google-auth-oauthlib` packages are NOT in the current `pyproject.toml`. Add them before Task 6:

```bash
cd apps/api && pip install google-auth google-auth-oauthlib
```

Then add to `pyproject.toml` dependencies:

```toml
"google-auth>=2.0.0",
```
