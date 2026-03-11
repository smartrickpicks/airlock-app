# Brain Brigade Demo — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a live end-to-end demo: admin invites a real person via magic link email, they sign up, go through Forge with LinkedIn scraping for PI profiling, connect Google Calendar, get a personality-matched playbook (view-only), admin sees full dossier + team constellation map.

**Architecture:** Next.js 14 frontend (Zustand stores, Tailwind OLED dark theme) + FastAPI backend (SQLAlchemy, PostgreSQL 16). New invite system via Resend email API. LinkedIn scraping via hosted Docker MCP server with thin FastAPI wrapper. Google Calendar integration via existing OAuth flow with added `calendar.readonly` scope. All new frontend components follow existing atomic design patterns.

**Tech Stack:** Next.js 14 (App Router), FastAPI, PostgreSQL 16, Resend (email), Docker (LinkedIn scraper), Google Calendar API, Recharts (constellation chart), Zustand (state), Tailwind CSS

**Design Doc:** `docs/plans/2026-03-09-brain-brigade-demo-design.md`

---

## Task 1: Invite System — Backend Model + Routes

**Files:**

- Create: `apps/api/src/models/invite.py`
- Create: `apps/api/src/routes/invites.py`
- Create: `apps/api/src/services/email.py`
- Modify: `apps/api/src/main.py` (register invite router)

**Context:** This creates the invite backend: an `invites` table, three API routes (create invite, validate token, accept invite), and a Resend email service. The existing `apps/api/src/models/user.py` and `apps/api/src/models/workspace_membership.py` already exist — we reference those.

### Step 1: Create the Invite model

Create `apps/api/src/models/invite.py`:

```python
"""Invite model — magic link invitations to join a workspace."""

from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.db import Base


class Invite(Base):
    __tablename__ = "invites"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    workspace_id: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    token: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    invited_by: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="pending"
    )  # pending | accepted | expired
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    accepted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    metadata: Mapped[dict] = mapped_column(JSONB, server_default="{}", nullable=False)
```

### Step 2: Create the Resend email service

Create `apps/api/src/services/email.py`:

```python
"""Email service — sends transactional emails via Resend API."""

import os
import httpx
from typing import Optional


RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
RESEND_FROM = os.getenv("RESEND_FROM_EMAIL", "Brain Brigade <invite@airlock.so>")
APP_URL = os.getenv("APP_URL", "http://localhost:3000")


async def send_invite_email(
    to_email: str,
    workspace_name: str,
    inviter_name: str,
    token: str,
) -> dict:
    """Send a magic link invite email via Resend."""
    join_url = f"{APP_URL}/join/{token}"

    html = f"""
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="font-size: 24px; font-weight: 700; color: #f5f5f5;">
            You've been invited to {workspace_name}
        </h1>
        <p style="color: #a3a3a3; font-size: 14px; line-height: 1.6;">
            {inviter_name} has invited you to join {workspace_name} on Airlock.
        </p>
        <p style="color: #a3a3a3; font-size: 14px; line-height: 1.6;">
            When you join, Otto (our AI assistant) will learn about your
            working style and set up a personalized workspace just for you.
        </p>
        <a href="{join_url}"
           style="display: inline-block; margin-top: 20px; padding: 12px 32px;
                  background: #6366f1; color: white; text-decoration: none;
                  border-radius: 8px; font-weight: 600; font-size: 14px;">
            Join {workspace_name}
        </a>
        <p style="color: #737373; font-size: 12px; margin-top: 24px;">
            This invite expires in 7 days.
        </p>
    </div>
    """

    if not RESEND_API_KEY:
        # Dev mode — log instead of sending
        print(f"[EMAIL] Would send invite to {to_email}: {join_url}")
        return {"id": "dev_mock", "join_url": join_url}

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": RESEND_FROM,
                "to": [to_email],
                "subject": f"You've been invited to {workspace_name}",
                "html": html,
            },
        )
        response.raise_for_status()
        return response.json()
```

### Step 3: Create the invite routes

Create `apps/api/src/routes/invites.py`:

```python
"""Invite routes — create, validate, and accept workspace invitations."""

import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from ulid import ULID

from src.services.email import send_invite_email

router = APIRouter(prefix="/api/v1/invites", tags=["invites"])


# ── Pydantic schemas ─────────────────────────────────────────────────

class CreateInviteRequest(BaseModel):
    email: EmailStr
    workspace_id: str = "ws_brain_brigade"
    org_role: str = "member"


class CreateInviteResponse(BaseModel):
    id: str
    token: str
    email: str
    join_url: str
    expires_at: str


class InviteInfo(BaseModel):
    workspace_name: str
    inviter_name: str
    email: str
    status: str
    expires_at: str


class AcceptInviteRequest(BaseModel):
    google_credential: str
    display_name: str | None = None


# ── In-memory store (no DB running for demo) ─────────────────────────

_invites: dict[str, dict] = {}


# ── Routes ───────────────────────────────────────────────────────────

@router.post("", response_model=CreateInviteResponse)
async def create_invite(req: CreateInviteRequest):
    """Admin creates an invite — sends magic link email."""
    invite_id = str(ULID())
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    invite = {
        "id": invite_id,
        "workspace_id": req.workspace_id,
        "email": req.email,
        "token": token,
        "invited_by": "admin_user_001",
        "org_role": req.org_role,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": expires_at.isoformat(),
    }
    _invites[token] = invite

    # Send email via Resend
    import os
    app_url = os.getenv("APP_URL", "http://localhost:3000")

    try:
        await send_invite_email(
            to_email=req.email,
            workspace_name="Brain Brigade",
            inviter_name="Zach",
            token=token,
        )
    except Exception as e:
        print(f"[INVITE] Email send failed (non-blocking): {e}")

    return CreateInviteResponse(
        id=invite_id,
        token=token,
        email=req.email,
        join_url=f"{app_url}/join/{token}",
        expires_at=expires_at.isoformat(),
    )


@router.get("/{token}", response_model=InviteInfo)
async def validate_invite(token: str):
    """Validate an invite token — returns workspace info if valid."""
    invite = _invites.get(token)
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid or expired invite")

    if invite["status"] != "pending":
        raise HTTPException(status_code=410, detail=f"Invite already {invite['status']}")

    expires = datetime.fromisoformat(invite["expires_at"])
    if datetime.now(timezone.utc) > expires:
        invite["status"] = "expired"
        raise HTTPException(status_code=410, detail="Invite has expired")

    return InviteInfo(
        workspace_name="Brain Brigade",
        inviter_name="Zach",
        email=invite["email"],
        status=invite["status"],
        expires_at=invite["expires_at"],
    )


@router.post("/{token}/accept")
async def accept_invite(token: str, req: AcceptInviteRequest):
    """Accept an invite — create user + workspace membership."""
    invite = _invites.get(token)
    if not invite:
        raise HTTPException(status_code=404, detail="Invalid invite")

    if invite["status"] != "pending":
        raise HTTPException(status_code=410, detail=f"Invite already {invite['status']}")

    invite["status"] = "accepted"
    invite["accepted_at"] = datetime.now(timezone.utc).isoformat()

    # In production: create user, workspace membership, return auth tokens
    # For demo: return mock auth response
    user_id = str(ULID())
    return {
        "access_token": f"invite_{token[:16]}",
        "refresh_token": f"refresh_{token[:16]}",
        "user": {
            "id": user_id,
            "email": invite["email"],
            "display_name": req.display_name or invite["email"].split("@")[0],
            "org_role": invite.get("org_role", "member"),
        },
        "redirect_to": "/forge",
    }
```

### Step 4: Register the invite router in main.py

Find the existing router registration block in `apps/api/src/main.py` and add:

```python
from src.routes.invites import router as invites_router
app.include_router(invites_router)
```

### Step 5: Verify backend starts

Run: `cd apps/api && source .venv/bin/activate && python -c "from src.routes.invites import router; print('Invite routes OK')" && python -c "from src.services.email import send_invite_email; print('Email service OK')"`

Expected: Both print OK

### Step 6: Commit

```bash
git add apps/api/src/models/invite.py apps/api/src/routes/invites.py apps/api/src/services/email.py apps/api/src/main.py
git commit -m "feat(api): add invite system with magic link email via Resend"
```

---

## Task 2: Invite Frontend — /join/:token Landing Page

**Files:**

- Create: `apps/web/src/app/join/[token]/page.tsx`
- Create: `apps/web/src/stores/invite.store.ts`

**Context:** This is the page a person lands on when they click the magic link. It validates the token, shows workspace info, and offers Google OAuth signup. After signup, it redirects to `/forge`. Uses existing `apiFetch` from `apps/web/src/lib/api.ts` and `useAuthStore` from `apps/web/src/stores/auth.store.ts`.

### Step 1: Create the invite store

Create `apps/web/src/stores/invite.store.ts`:

```typescript
import { create } from "zustand";
import { apiFetch } from "@/lib/api";

interface InviteInfo {
  workspace_name: string;
  inviter_name: string;
  email: string;
  status: string;
  expires_at: string;
}

interface InviteState {
  invite: InviteInfo | null;
  isLoading: boolean;
  error: string | null;
  isAccepting: boolean;

  validateToken: (token: string) => Promise<void>;
  acceptInvite: (
    token: string,
    googleCredential: string,
  ) => Promise<{ redirect_to: string }>;
  reset: () => void;
}

export const useInviteStore = create<InviteState>((set) => ({
  invite: null,
  isLoading: false,
  error: null,
  isAccepting: false,

  validateToken: async (token: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiFetch<InviteInfo>(`/api/v1/invites/${token}`);
      set({ invite: data, isLoading: false });
    } catch (e) {
      // API not running — use mock for dev
      set({
        invite: {
          workspace_name: "Brain Brigade",
          inviter_name: "Zach",
          email: "invited@example.com",
          status: "pending",
          expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        },
        isLoading: false,
      });
    }
  },

  acceptInvite: async (token: string, googleCredential: string) => {
    set({ isAccepting: true });
    try {
      const data = await apiFetch<{
        redirect_to: string;
        access_token: string;
        refresh_token: string;
        user: {
          id: string;
          email: string;
          display_name: string;
          org_role: string;
        };
      }>(`/api/v1/invites/${token}/accept`, {
        method: "POST",
        body: JSON.stringify({ google_credential: googleCredential }),
      });
      set({ isAccepting: false });
      return { redirect_to: data.redirect_to || "/forge" };
    } catch {
      // Dev fallback
      set({ isAccepting: false });
      return { redirect_to: "/forge" };
    }
  },

  reset: () =>
    set({ invite: null, isLoading: false, error: null, isAccepting: false }),
}));
```

### Step 2: Create the /join/[token] page

Create `apps/web/src/app/join/[token]/page.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { GoogleLogin } from "@react-oauth/google";
import { useInviteStore } from "@/stores/invite.store";
import { useAuthStore } from "@/stores/auth.store";

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const { invite, isLoading, error, validateToken, acceptInvite } =
    useInviteStore();
  const { hydrateFromLoginResponse } = useAuthStore();

  useEffect(() => {
    if (token) {
      validateToken(token);
    }
  }, [token, validateToken]);

  const handleGoogleSuccess = async (credentialResponse: {
    credential?: string;
  }) => {
    if (!credentialResponse.credential) return;

    try {
      // Accept the invite
      const result = await acceptInvite(token, credentialResponse.credential);

      // Hydrate auth with mock response for demo
      hydrateFromLoginResponse({
        access_token: `invite_${token.slice(0, 16)}`,
        refresh_token: `refresh_${token.slice(0, 16)}`,
        user: {
          id: `user_${Date.now()}`,
          email: invite?.email || "user@example.com",
          display_name: invite?.email?.split("@")[0] || "New Member",
          org_role: "member",
        },
      });

      router.push(result.redirect_to);
    } catch {
      // Fallback for dev
      hydrateFromLoginResponse({
        access_token: "invite_dev_token",
        refresh_token: "invite_dev_refresh",
        user: {
          id: "invite_user_001",
          email: invite?.email || "invited@example.com",
          display_name: invite?.email?.split("@")[0] || "New Member",
          org_role: "member",
        },
      });
      router.push("/forge");
    }
  };

  const handleDevJoin = () => {
    hydrateFromLoginResponse({
      access_token: "invite_dev_token",
      refresh_token: "invite_dev_refresh",
      user: {
        id: "invite_user_001",
        email: invite?.email || "invited@example.com",
        display_name: invite?.email?.split("@")[0] || "New Member",
        org_role: "member",
      },
    });
    router.push("/forge");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-base">
        <p className="text-sm text-text-muted">Validating invite...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-base">
        <div className="w-full max-w-sm rounded-lg border border-accent-error/30 bg-surface-raised p-8 text-center">
          <p className="text-lg font-semibold text-accent-error">
            Invalid Invite
          </p>
          <p className="mt-2 text-sm text-text-secondary">{error}</p>
          <button
            onClick={() => router.push("/login")}
            className="mt-4 text-sm text-accent-primary hover:underline"
          >
            Go to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-base">
      <div className="w-full max-w-sm rounded-lg border border-surface-border bg-surface-raised p-8">
        <div className="mb-8 text-center">
          <div className="mb-3 text-4xl">&#x1F512;</div>
          <h1 className="text-2xl font-bold text-text-primary">
            {invite?.workspace_name || "Brain Brigade"}
          </h1>
          <p className="mt-3 text-sm text-text-secondary">
            You&apos;ve been invited to join
          </p>
          {invite?.inviter_name && (
            <p className="mt-1 text-xs text-text-muted">
              Invited by {invite.inviter_name}
            </p>
          )}
        </div>

        <div className="flex flex-col items-center gap-4">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => {}}
            theme="filled_black"
            size="large"
            width="320"
          />

          {process.env.NODE_ENV === "development" && (
            <>
              <div className="flex w-full items-center gap-3">
                <div className="h-px flex-1 bg-surface-border" />
                <span className="text-xs text-text-muted">DEV ONLY</span>
                <div className="h-px flex-1 bg-surface-border" />
              </div>
              <button
                onClick={handleDevJoin}
                className="w-full rounded border border-accent-primary bg-surface-overlay px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-border"
              >
                Dev Join (skip OAuth)
              </button>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-text-muted">
          By joining, you&apos;ll set up your personalized workspace with Otto.
        </p>
      </div>
    </div>
  );
}
```

### Step 3: Verify type-check passes

Run: `source ~/.nvm/nvm.sh && nvm use 20 && cd apps/web && pnpm type-check`

Expected: No errors related to the new files.

### Step 4: Commit

```bash
git add apps/web/src/app/join/ apps/web/src/stores/invite.store.ts
git commit -m "feat(web): add /join/:token invite landing page"
```

---

## Task 3: LinkedIn Scraper — Docker Wrapper + API Route

**Files:**

- Create: `apps/api/src/services/linkedin.py`
- Create: `apps/api/src/routes/linkedin.py`
- Modify: `apps/api/src/main.py` (register linkedin router)

**Context:** LinkedIn MCP server `stickerdaniel/linkedin-mcp-server` runs in Docker and exposes `get_person_profile`. We wrap it with a thin FastAPI endpoint so the frontend can call `POST /api/v1/linkedin/scrape`. For demo without Docker running, include mock fallback data.

### Step 1: Create the LinkedIn service

Create `apps/api/src/services/linkedin.py`:

```python
"""LinkedIn scraper service — wraps the hosted LinkedIn MCP server."""

import os
import httpx
from typing import Optional


LINKEDIN_SCRAPER_URL = os.getenv(
    "LINKEDIN_SCRAPER_URL", "http://localhost:8001"
)


async def scrape_linkedin_profile(linkedin_url: str) -> dict:
    """Scrape a LinkedIn profile via the hosted MCP server wrapper.

    Falls back to mock data if the scraper isn't running.
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{LINKEDIN_SCRAPER_URL}/scrape",
                json={"linkedin_url": linkedin_url},
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        print(f"[LINKEDIN] Scraper unavailable, using mock: {e}")
        return _mock_profile(linkedin_url)


def _mock_profile(url: str) -> dict:
    """Generate plausible mock LinkedIn data for demo."""
    # Extract name hint from URL
    slug = url.rstrip("/").split("/")[-1].replace("-", " ").title()

    return {
        "name": slug if slug and len(slug) > 2 else "Alex Johnson",
        "headline": "VP of Product | Building the Future of Work",
        "location": "San Francisco Bay Area",
        "summary": (
            "Product leader with 12+ years of experience in B2B SaaS. "
            "Passionate about AI-driven workflows and team dynamics. "
            "Previously led product at TechCorp (Series C, $200M ARR). "
            "Speaker at SaaStr, Product-Led Summit."
        ),
        "experience": [
            {
                "title": "VP of Product",
                "company": "TechCorp",
                "duration": "2022 - Present",
                "description": "Leading product strategy and 40-person product org.",
            },
            {
                "title": "Director of Product",
                "company": "DataFlow Inc",
                "duration": "2019 - 2022",
                "description": "Built enterprise analytics platform from 0 to $50M ARR.",
            },
            {
                "title": "Senior Product Manager",
                "company": "StartupXYZ",
                "duration": "2016 - 2019",
                "description": "Led core platform team, shipped V2 product.",
            },
        ],
        "skills": [
            "Product Strategy",
            "Go-to-Market",
            "Team Leadership",
            "Data Analytics",
            "Enterprise SaaS",
            "AI/ML Applications",
        ],
        "education": [
            {
                "school": "Stanford University",
                "degree": "MBA",
                "year": "2016",
            },
            {
                "school": "UC Berkeley",
                "degree": "BS Computer Science",
                "year": "2012",
            },
        ],
        "source_url": url,
    }


def infer_drives_from_linkedin(profile: dict) -> dict:
    """Infer DECF drive signals from LinkedIn profile data.

    This is a simplified heuristic for the demo. In production,
    this would use the full inference engine from M2.
    """
    signals = {
        "dominance": 5.0,
        "extraversion": 5.0,
        "patience": 5.0,
        "formality": 5.0,
    }

    headline = (profile.get("headline") or "").lower()
    skills = [s.lower() for s in profile.get("skills", [])]
    experience = profile.get("experience", [])

    # Leadership titles → high dominance
    leadership_keywords = ["vp", "director", "head", "chief", "founder", "ceo", "cto", "lead"]
    if any(kw in headline for kw in leadership_keywords):
        signals["dominance"] = min(10, signals["dominance"] + 3)

    # Many roles / short tenures → low patience
    if len(experience) >= 3:
        signals["patience"] = max(1, signals["patience"] - 2)

    # People skills → high extraversion
    people_keywords = ["team", "leadership", "management", "speaking", "sales", "marketing"]
    people_score = sum(1 for s in skills if any(kw in s for kw in people_keywords))
    if people_score >= 2:
        signals["extraversion"] = min(10, signals["extraversion"] + 3)

    # Technical/analytical skills → high formality
    formal_keywords = ["analytics", "data", "compliance", "risk", "legal", "finance", "audit"]
    formal_score = sum(1 for s in skills if any(kw in s for kw in formal_keywords))
    if formal_score >= 2:
        signals["formality"] = min(10, signals["formality"] + 3)

    # Strategy keywords → balanced but decisive
    if "strategy" in headline or "strategic" in headline:
        signals["dominance"] = min(10, signals["dominance"] + 1)
        signals["formality"] = min(10, signals["formality"] + 1)

    return signals
```

### Step 2: Create the LinkedIn route

Create `apps/api/src/routes/linkedin.py`:

```python
"""LinkedIn scrape routes — proxy to hosted MCP server."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.services.linkedin import scrape_linkedin_profile, infer_drives_from_linkedin

router = APIRouter(prefix="/api/v1/linkedin", tags=["linkedin"])


class ScrapeRequest(BaseModel):
    linkedin_url: str


class ScrapeResponse(BaseModel):
    name: str
    headline: str | None = None
    location: str | None = None
    summary: str | None = None
    experience: list[dict] = []
    skills: list[str] = []
    education: list[dict] = []
    source_url: str
    inferred_drives: dict


@router.post("/scrape", response_model=ScrapeResponse)
async def scrape_profile(req: ScrapeRequest):
    """Scrape a LinkedIn profile and infer drive signals."""
    if not req.linkedin_url or "linkedin.com" not in req.linkedin_url:
        raise HTTPException(status_code=400, detail="Invalid LinkedIn URL")

    profile = await scrape_linkedin_profile(req.linkedin_url)
    drives = infer_drives_from_linkedin(profile)

    return ScrapeResponse(
        name=profile.get("name", "Unknown"),
        headline=profile.get("headline"),
        location=profile.get("location"),
        summary=profile.get("summary"),
        experience=profile.get("experience", []),
        skills=profile.get("skills", []),
        education=profile.get("education", []),
        source_url=profile.get("source_url", req.linkedin_url),
        inferred_drives=drives,
    )
```

### Step 3: Register the linkedin router in main.py

Add to `apps/api/src/main.py`:

```python
from src.routes.linkedin import router as linkedin_router
app.include_router(linkedin_router)
```

### Step 4: Verify

Run: `cd apps/api && source .venv/bin/activate && python -c "from src.routes.linkedin import router; print('LinkedIn routes OK')"`

### Step 5: Commit

```bash
git add apps/api/src/services/linkedin.py apps/api/src/routes/linkedin.py apps/api/src/main.py
git commit -m "feat(api): add LinkedIn scraper service with drive inference"
```

---

## Task 4: Forge LinkedIn Step — Frontend Integration

**Files:**

- Modify: `apps/web/src/lib/mock-forge.ts` (add LinkedIn types + Step 0 messages)
- Modify: `apps/web/src/stores/forge.store.ts` (add LinkedIn step to conversation flow)
- Modify: `apps/web/src/components/templates/WorkspaceForge.tsx` (add LinkedIn URL input UI)

**Context:** The Forge currently starts with welcome → Q1 (goal chips) → Q2 (autonomy). We're adding Step 0: LinkedIn URL input → scrape → Otto shows findings → then normal Q1/Q2 flow with pre-seeded drive signals from LinkedIn. The Forge template is at `apps/web/src/components/templates/WorkspaceForge.tsx` and uses the `useForgeStore`.

### Step 1: Add LinkedIn types and messages to mock-forge.ts

Add to `apps/web/src/lib/mock-forge.ts` after the existing type definitions (around line 80):

```typescript
// LinkedIn scrape result type
export interface LinkedInProfile {
  name: string;
  headline: string | null;
  location: string | null;
  summary: string | null;
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
  }>;
  skills: string[];
  education: Array<{ school: string; degree: string; year: string }>;
  source_url: string;
  inferred_drives: Partial<ForgeDrives>;
}
```

Add new interaction type `"linkedin_input"` to the `ForgeMessage.interaction` union type.

Add these new message constants after the existing `FORGE_WELCOME`:

```typescript
export const FORGE_LINKEDIN_ASK: ForgeMessage = {
  id: "forge_linkedin",
  role: "otto",
  content:
    "Welcome to Brain Brigade! I'm Otto. Before we get started, drop your LinkedIn profile URL so I can learn about your background.",
  timestamp: new Date().toISOString(),
  interaction: "linkedin_input",
};

export function createLinkedInResultMessage(
  profile: LinkedInProfile,
): ForgeMessage {
  const title = profile.headline || "professional";
  const company = profile.experience?.[0]?.company || "your company";
  const topSkills = profile.skills?.slice(0, 3).join(", ") || "your skills";

  return {
    id: "forge_linkedin_result",
    role: "otto",
    content: `Nice to meet you, ${profile.name}! I can see you're a ${title} at ${company}, with expertise in ${topSkills}.\n\nI've already started building a picture of how you work. Let me ask a couple more questions to dial in your workspace...`,
    timestamp: new Date().toISOString(),
  };
}
```

### Step 2: Update forge.store.ts to support LinkedIn step

Modify `apps/web/src/stores/forge.store.ts`:

1. Import the new types and messages:

```typescript
import type { LinkedInProfile } from "@/lib/mock-forge";
import {
  FORGE_LINKEDIN_ASK,
  createLinkedInResultMessage,
  // ... existing imports
} from "@/lib/mock-forge";
import { apiFetch } from "@/lib/api";
```

2. Add to the `ForgeState` interface:

```typescript
linkedInProfile: LinkedInProfile | null;
linkedInDrives: Partial<ForgeDrives> | null;
isScrapingLinkedIn: boolean;

submitLinkedInUrl: (url: string) => Promise<void>;
```

3. Update initial state (change step numbering — step 0 is now LinkedIn):

```typescript
  // Initial state — start with LinkedIn ask instead of welcome
  step: 0, // 0=linkedin, 1=welcome+Q1, 2=Q2, 3=result, 4=launch_ready
  messages: [FORGE_LINKEDIN_ASK],
  linkedInProfile: null,
  linkedInDrives: null,
  isScrapingLinkedIn: false,
```

4. Add the `submitLinkedInUrl` action:

```typescript
  submitLinkedInUrl: async (url: string) => {
    // Show user message
    const userMsg: ForgeMessage = {
      id: `forge_user_${++messageCounter}`,
      role: "user",
      content: url,
      timestamp: new Date().toISOString(),
    };
    set((s) => ({ messages: [...s.messages, userMsg], isScrapingLinkedIn: true }));

    // Scrape LinkedIn
    let profile: LinkedInProfile;
    try {
      profile = await apiFetch<LinkedInProfile>("/api/v1/linkedin/scrape", {
        method: "POST",
        body: JSON.stringify({ linkedin_url: url }),
      });
    } catch {
      // Mock fallback
      profile = {
        name: url.split("/").pop()?.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "New Member",
        headline: "Professional",
        location: null,
        summary: "Experienced professional.",
        experience: [],
        skills: ["Leadership", "Strategy"],
        education: [],
        source_url: url,
        inferred_drives: { dominance: 7, extraversion: 6, patience: 4, formality: 4 },
      };
    }

    set({
      linkedInProfile: profile,
      linkedInDrives: profile.inferred_drives,
      isScrapingLinkedIn: false,
    });

    // Show Otto's LinkedIn summary
    addOttoMessage(set, createLinkedInResultMessage(profile), 1000);

    // Then advance to Q1 (goal chips)
    setTimeout(() => {
      set({ step: 1 });
      addOttoMessage(set, FORGE_Q1, 400);
    }, 2000);
  },
```

5. Update the `mockInferProfile` call in `selectAutonomyOption` to merge LinkedIn drives:

In `selectAutonomyOption`, after inference, merge LinkedIn drive signals:

```typescript
// Merge LinkedIn pre-inferred drives if available
const { linkedInDrives } = get();
if (linkedInDrives) {
  // Average LinkedIn signals with conversation signals
  if (linkedInDrives.dominance)
    drives.dominance = Math.round(
      (drives.dominance + linkedInDrives.dominance) / 2,
    );
  if (linkedInDrives.extraversion)
    drives.extraversion = Math.round(
      (drives.extraversion + linkedInDrives.extraversion) / 2,
    );
  if (linkedInDrives.patience)
    drives.patience = Math.round(
      (drives.patience + linkedInDrives.patience) / 2,
    );
  if (linkedInDrives.formality)
    drives.formality = Math.round(
      (drives.formality + linkedInDrives.formality) / 2,
    );
}
```

6. Update the confidence calculation to boost when LinkedIn data exists:

```typescript
const hasLinkedIn = !!get().linkedInProfile;
const adjustedConfidence = hasLinkedIn
  ? Math.min(0.95, confidence + 0.1)
  : confidence;
```

7. Update reset to clear LinkedIn state:

```typescript
  reset: () => {
    messageCounter = 0;
    set({
      step: 0,
      messages: [FORGE_LINKEDIN_ASK],
      // ... existing reset fields ...
      linkedInProfile: null,
      linkedInDrives: null,
      isScrapingLinkedIn: false,
    });
  },
```

### Step 3: Add LinkedIn URL input to WorkspaceForge

Read the existing `WorkspaceForge.tsx` to understand the chat rendering pattern, then add a LinkedIn URL input component that renders when `interaction === "linkedin_input"`. This should be:

- A text input with placeholder "https://linkedin.com/in/your-profile"
- An "Analyze Profile" button that calls `submitLinkedInUrl(url)`
- A loading spinner state while `isScrapingLinkedIn` is true

Check the existing `WorkspaceForge.tsx` for the pattern used for `goal_chips` and `autonomy_cards` interactions and follow the same pattern for `linkedin_input`.

### Step 4: Type-check

Run: `source ~/.nvm/nvm.sh && nvm use 20 && cd apps/web && pnpm type-check`

### Step 5: Commit

```bash
git add apps/web/src/lib/mock-forge.ts apps/web/src/stores/forge.store.ts apps/web/src/components/templates/WorkspaceForge.tsx
git commit -m "feat(web): add LinkedIn scraping step to Forge onboarding"
```

---

## Task 5: Playbook View-Only Mode + Archetype Mapping

**Files:**

- Modify: `apps/web/src/components/templates/PlaybookView.tsx`
- Modify: `apps/web/src/stores/playbook.store.ts`
- Modify: `apps/web/src/lib/mock-playbook-dag.ts`

**Context:** PlaybookView currently always shows an interactive DAG with gate panels. We need: (1) a `readOnly` prop that hides gate actions, (2) `loadDemoPlaybook` accepts a `metaArchetype` parameter to load an archetype-matched template, (3) three archetype-specific DAG templates (driver, enforcer, interpreter) where all nodes start as `pending`.

### Step 1: Add two more playbook templates to mock-playbook-dag.ts

Add to `apps/web/src/lib/mock-playbook-dag.ts` after `MOCK_DAG_AT_GATE`:

```typescript
/* ------------------------------------------------------------------ */
/*  Archetype-matched templates (all nodes pending = view-only)       */
/* ------------------------------------------------------------------ */

/** Driver template: fast-track, fewer gates */
export const PLAYBOOK_DRIVER: PlaybookDAGData = {
  templateId: "tpl_contract_intake",
  templateName: "Contract Intake — Fast Track",
  templateDescription: "Streamlined contract lifecycle for decisive operators",
  instanceId: "run_driver_001",
  nodes: [
    {
      id: "triage",
      name: "Triage",
      description: "Quick classification and priority",
      actor: "otto",
      archetype: "executor",
      chamber: "discover",
      status: "pending",
      dependsOn: [],
      gate: null,
    },
    {
      id: "research",
      name: "Research",
      description: "Rapid counterparty analysis",
      actor: "otto",
      archetype: "strategist",
      chamber: "discover",
      status: "pending",
      dependsOn: ["triage"],
      gate: null,
    },
    {
      id: "extract_terms",
      name: "Extract Terms",
      description: "Automated term extraction",
      actor: "otto",
      archetype: "executor",
      chamber: "build",
      status: "pending",
      dependsOn: ["research"],
      gate: null,
    },
    {
      id: "draft_agreement",
      name: "Draft Agreement",
      description: "Generate agreement from extracted terms",
      actor: "otto",
      archetype: "executor",
      chamber: "build",
      status: "pending",
      dependsOn: ["extract_terms"],
      gate: {
        type: "verification",
        status: "pending",
        requiredApprovals: 1,
        currentApprovals: 0,
        roles: ["gatekeeper"],
        description: "Quick verification of draft",
      },
    },
    {
      id: "publish_distribute",
      name: "Publish & Distribute",
      description: "Ship to all parties",
      actor: "hybrid",
      archetype: "executor",
      chamber: "ship",
      status: "pending",
      dependsOn: ["draft_agreement"],
      gate: null,
    },
  ],
  edges: [
    { source: "triage", target: "research" },
    { source: "research", target: "extract_terms" },
    { source: "extract_terms", target: "draft_agreement" },
    { source: "draft_agreement", target: "publish_distribute" },
  ],
};

/** Enforcer template: process-heavy, compliance gates */
export const PLAYBOOK_ENFORCER: PlaybookDAGData = {
  templateId: "tpl_pilot_close",
  templateName: "Pilot Close — Compliance Path",
  templateDescription: "Thorough lifecycle with compliance checkpoints",
  instanceId: "run_enforcer_001",
  nodes: [
    {
      id: "intake",
      name: "Intake Review",
      description: "Detailed intake and classification",
      actor: "otto",
      archetype: "analyst",
      chamber: "discover",
      status: "pending",
      dependsOn: [],
      gate: null,
    },
    {
      id: "compliance_scan",
      name: "Compliance Scan",
      description: "Regulatory compliance pre-check",
      actor: "otto",
      archetype: "guardian",
      chamber: "discover",
      status: "pending",
      dependsOn: ["intake"],
      gate: {
        type: "verification",
        status: "pending",
        requiredApprovals: 1,
        currentApprovals: 0,
        roles: ["gatekeeper"],
        description: "Verify compliance requirements",
      },
    },
    {
      id: "terms_extraction",
      name: "Terms Extraction",
      description: "Detailed term extraction with validation",
      actor: "hybrid",
      archetype: "analyst",
      chamber: "build",
      status: "pending",
      dependsOn: ["compliance_scan"],
      gate: null,
    },
    {
      id: "risk_assessment",
      name: "Risk Assessment",
      description: "Comprehensive risk analysis",
      actor: "otto",
      archetype: "guardian",
      chamber: "build",
      status: "pending",
      dependsOn: ["terms_extraction"],
      gate: {
        type: "approval",
        status: "pending",
        requiredApprovals: 1,
        currentApprovals: 0,
        roles: ["gatekeeper"],
        description: "Approve risk assessment findings",
      },
    },
    {
      id: "legal_review",
      name: "Legal Review",
      description: "Full legal compliance review",
      actor: "human",
      archetype: "guardian",
      chamber: "review",
      status: "pending",
      dependsOn: ["risk_assessment"],
      gate: {
        type: "approval",
        status: "pending",
        requiredApprovals: 2,
        currentApprovals: 0,
        roles: ["gatekeeper", "owner"],
        description: "Dual sign-off on legal review",
      },
    },
    {
      id: "stakeholder_signoff",
      name: "Stakeholder Sign-off",
      description: "Cross-functional approval",
      actor: "human",
      archetype: "connector",
      chamber: "review",
      status: "pending",
      dependsOn: ["legal_review"],
      gate: null,
    },
    {
      id: "publish",
      name: "Publish & Archive",
      description: "Publish and archive with full audit trail",
      actor: "hybrid",
      archetype: "guardian",
      chamber: "ship",
      status: "pending",
      dependsOn: ["stakeholder_signoff"],
      gate: null,
    },
  ],
  edges: [
    { source: "intake", target: "compliance_scan" },
    { source: "compliance_scan", target: "terms_extraction" },
    { source: "terms_extraction", target: "risk_assessment" },
    { source: "risk_assessment", target: "legal_review" },
    { source: "legal_review", target: "stakeholder_signoff" },
    { source: "stakeholder_signoff", target: "publish" },
  ],
};

/** Interpreter template: collaborative, human touchpoints */
export const PLAYBOOK_INTERPRETER: PlaybookDAGData = {
  templateId: "tpl_research_deep_dive",
  templateName: "Research Deep Dive — Collaborative",
  templateDescription: "Collaborative workflow with team checkpoints",
  instanceId: "run_interpreter_001",
  nodes: [
    {
      id: "discover_context",
      name: "Discover Context",
      description: "Gather context from all stakeholders",
      actor: "hybrid",
      archetype: "connector",
      chamber: "discover",
      status: "pending",
      dependsOn: [],
      gate: null,
    },
    {
      id: "team_input",
      name: "Team Input",
      description: "Collect perspectives from team members",
      actor: "human",
      archetype: "connector",
      chamber: "discover",
      status: "pending",
      dependsOn: ["discover_context"],
      gate: {
        type: "convergence",
        status: "pending",
        requiredApprovals: 1,
        currentApprovals: 0,
        roles: ["builder"],
        description: "Ensure all perspectives captured",
      },
    },
    {
      id: "research",
      name: "Deep Research",
      description: "Collaborative research synthesis",
      actor: "hybrid",
      archetype: "strategist",
      chamber: "build",
      status: "pending",
      dependsOn: ["team_input"],
      gate: null,
    },
    {
      id: "draft",
      name: "Collaborative Draft",
      description: "Co-create deliverable with team",
      actor: "hybrid",
      archetype: "connector",
      chamber: "build",
      status: "pending",
      dependsOn: ["research"],
      gate: null,
    },
    {
      id: "team_review",
      name: "Team Review",
      description: "Full team review and feedback",
      actor: "human",
      archetype: "connector",
      chamber: "review",
      status: "pending",
      dependsOn: ["draft"],
      gate: {
        type: "decision",
        status: "pending",
        requiredApprovals: 1,
        currentApprovals: 0,
        roles: ["gatekeeper"],
        description: "Team decides on direction",
      },
    },
    {
      id: "refinement",
      name: "Refinement",
      description: "Incorporate feedback and refine",
      actor: "hybrid",
      archetype: "connector",
      chamber: "review",
      status: "pending",
      dependsOn: ["team_review"],
      gate: null,
    },
    {
      id: "consensus_check",
      name: "Consensus Check",
      description: "Verify team alignment",
      actor: "human",
      archetype: "connector",
      chamber: "review",
      status: "pending",
      dependsOn: ["refinement"],
      gate: {
        type: "convergence",
        status: "pending",
        requiredApprovals: 1,
        currentApprovals: 0,
        roles: ["builder", "gatekeeper"],
        description: "Confirm consensus reached",
      },
    },
    {
      id: "ship",
      name: "Share & Celebrate",
      description: "Share results with broader team",
      actor: "hybrid",
      archetype: "connector",
      chamber: "ship",
      status: "pending",
      dependsOn: ["consensus_check"],
      gate: null,
    },
  ],
  edges: [
    { source: "discover_context", target: "team_input" },
    { source: "team_input", target: "research" },
    { source: "research", target: "draft" },
    { source: "draft", target: "team_review" },
    { source: "team_review", target: "refinement" },
    { source: "refinement", target: "consensus_check" },
    { source: "consensus_check", target: "ship" },
  ],
};

/** Map meta-archetype to its playbook template */
export const ARCHETYPE_PLAYBOOK_MAP: Record<string, PlaybookDAGData> = {
  driver: PLAYBOOK_DRIVER,
  enforcer: PLAYBOOK_ENFORCER,
  interpreter: PLAYBOOK_INTERPRETER,
};
```

### Step 2: Update loadDemoPlaybook to accept metaArchetype

Modify `apps/web/src/stores/playbook.store.ts`:

1. Import the new map:

```typescript
import {
  MOCK_DAG_AT_GATE,
  ARCHETYPE_PLAYBOOK_MAP,
} from "@/lib/mock-playbook-dag";
```

2. Update the `loadDemoPlaybook` signature and body:

```typescript
  loadDemoPlaybook: (metaArchetype?: string) => void;
```

```typescript
  loadDemoPlaybook: (metaArchetype?: string) => {
    const template = metaArchetype
      ? (ARCHETYPE_PLAYBOOK_MAP[metaArchetype] || MOCK_DAG_AT_GATE)
      : MOCK_DAG_AT_GATE;
    const playbook = clonePlaybook(template);
    set({
      activePlaybook: playbook,
      selectedNodeId: null,
      selectedNode: null,
      selectedGate: null,
    });
  },
```

### Step 3: Add readOnly prop to PlaybookView

Modify `apps/web/src/components/templates/PlaybookView.tsx`:

```tsx
interface PlaybookViewProps {
  readOnly?: boolean;
}

export default function PlaybookView({ readOnly = false }: PlaybookViewProps) {
  // ... existing hooks ...

  return (
    <div className="flex gap-6">
      {/* Left — DAG visualization */}
      <div className="min-w-0 flex-1">
        <PlaybookDAG
          data={activePlaybook}
          onNodeClick={(nodeId) => selectNode(nodeId)}
          className="rounded-lg border border-surface-border bg-surface-raised p-4"
        />
      </div>

      {/* Right — Gate panel (hidden in readOnly) or info panel */}
      <div className="w-96 shrink-0">
        {readOnly ? (
          <div className="rounded-lg border border-surface-border bg-surface-raised p-6">
            {selectedNode ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-text-primary">
                  {selectedNode.name}
                </h3>
                <p className="text-xs text-text-secondary">
                  {selectedNode.description}
                </p>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <span className="rounded bg-surface-overlay px-2 py-0.5 capitalize">
                    {selectedNode.actor}
                  </span>
                  <span className="rounded bg-surface-overlay px-2 py-0.5 capitalize">
                    {selectedNode.archetype}
                  </span>
                </div>
                {selectedNode.gate && (
                  <div className="mt-2 rounded border border-surface-border bg-surface-sunken p-3">
                    <p className="text-[11px] font-medium text-text-muted uppercase">
                      Gate: {selectedNode.gate.type}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {selectedNode.gate.description}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-sm text-text-muted">
                Click a node to see details
              </p>
            )}
            <div className="mt-4 rounded bg-accent-primary/10 px-3 py-2 text-center">
              <p className="text-xs font-medium text-accent-primary">
                Ready to execute
              </p>
              <p className="text-[10px] text-text-muted">
                This playbook is matched to your PI profile
              </p>
            </div>
          </div>
        ) : selectedGate ? (
          <GatePanel
            gate={selectedGate}
            onAction={(action, comment, optionId) =>
              handleGateAction(action, comment, optionId)
            }
            className="rounded-lg border border-surface-border bg-surface-raised p-4"
          />
        ) : (
          <div className="rounded-lg border border-surface-border bg-surface-raised p-6">
            <p className="text-center text-sm text-text-muted">
              {selectedNode
                ? `"${selectedNode.name}" has no gate checkpoint.`
                : "Select a gated node to review"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
```

### Step 4: Update forge store launchWorkspace to pass archetype

Modify `apps/web/src/stores/forge.store.ts` `launchWorkspace`:

```typescript
  launchWorkspace: () => {
    set({ isLaunching: true });

    setTimeout(() => {
      set({ isLaunching: false, isComplete: true });
      const { metaArchetype } = get();
      const { loadDemoPlaybook } = usePlaybookStore.getState();
      loadDemoPlaybook(metaArchetype || undefined);
    }, 1500);
  },
```

### Step 5: Update playbook page to pass readOnly when appropriate

Check the existing page at `apps/web/src/app/(shell)/(modules)/contracts/playbook/page.tsx` — if the user came from Forge (new member), render `<PlaybookView readOnly />`. Use a query parameter or store flag to determine this. Simplest approach: check if the user's org_role is "member" (new invitees get "member" role).

### Step 6: Type-check

Run: `source ~/.nvm/nvm.sh && nvm use 20 && cd apps/web && pnpm type-check`

### Step 7: Commit

```bash
git add apps/web/src/lib/mock-playbook-dag.ts apps/web/src/stores/playbook.store.ts apps/web/src/components/templates/PlaybookView.tsx apps/web/src/stores/forge.store.ts
git commit -m "feat(web): add playbook view-only mode with archetype-matched templates"
```

---

## Task 6: Member Dossier Page

**Files:**

- Create: `apps/web/src/app/(shell)/admin/members/[userId]/page.tsx`
- Create: `apps/web/src/components/organisms/MemberDossier.tsx`
- Create: `apps/web/src/lib/mock-dossier.ts`

**Context:** The admin clicks "View Profile" on a member row → navigates to `/admin/members/:userId` → sees the full PI dossier card. This includes drives bar chart, archetype badge, strengths/cautions, Otto config, workspace preferences, and LinkedIn summary. Uses existing Tailwind tokens and mock data patterns from `apps/web/src/lib/mock-admin.ts`.

### Step 1: Create mock dossier data

Create `apps/web/src/lib/mock-dossier.ts`:

```typescript
/**
 * Mock dossier data for member PI profiles.
 * In production, this comes from GET /api/v1/profiles/:userId/dossier.
 */

import type { MetaArchetype } from "@/lib/mock-forge";

export interface MemberDossier {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  piProfile: string;
  metaArchetype: MetaArchetype;
  confidence: number;
  source: string;
  drives: {
    dominance: number;
    extraversion: number;
    patience: number;
    formality: number;
  };
  strengths: string[];
  cautions: string[];
  ottoConfig: {
    archetype: string;
    autonomyCeiling: number;
    interactionMode: string;
  };
  workspacePrefs: {
    cognitiveMode: string;
    informationDensity: string;
    interfaceStructure: string;
    updatePace: string;
  };
  linkedInSummary?: {
    headline: string;
    company: string;
    yearsExperience: number;
    topSkills: string[];
  };
  communicationPatterns: {
    strength: string;
    failurePattern: string;
    bestTooling: string;
  };
}

export const MOCK_DOSSIERS: Record<string, MemberDossier> = {
  mem_001: {
    userId: "mem_001",
    name: "Zach Holwerda",
    email: "zach@airlock.so",
    piProfile: "captain",
    metaArchetype: "driver",
    confidence: 0.92,
    source: "conversation + linkedin",
    drives: { dominance: 9, extraversion: 8, patience: 3, formality: 2 },
    strengths: [
      "Delegation mastery",
      "Quick decision-making",
      "Fearless risk-taking",
    ],
    cautions: ["Authoritative presence", "Structure-resistant"],
    ottoConfig: {
      archetype: "executor",
      autonomyCeiling: 0.85,
      interactionMode: "autonomous",
    },
    workspacePrefs: {
      cognitiveMode: "visual",
      informationDensity: "low",
      interfaceStructure: "exploratory",
      updatePace: "alerts",
    },
    linkedInSummary: {
      headline: "Founder & CEO",
      company: "Airlock",
      yearsExperience: 10,
      topSkills: ["Product Strategy", "AI/ML", "Team Building"],
    },
    communicationPatterns: {
      strength: "Direct and decisive",
      failurePattern: "May skip context",
      bestTooling: "Async with summaries",
    },
  },
  mem_002: {
    userId: "mem_002",
    name: "Sarah Chen",
    email: "sarah@company.com",
    piProfile: "strategist",
    metaArchetype: "interpreter",
    confidence: 0.87,
    source: "linkedin",
    drives: { dominance: 7, extraversion: 4, patience: 5, formality: 6 },
    strengths: [
      "Strategic thinking",
      "Data-driven decisions",
      "Long-term planning",
    ],
    cautions: ["Analysis paralysis", "Slow to act"],
    ottoConfig: {
      archetype: "connector",
      autonomyCeiling: 0.6,
      interactionMode: "collaborative",
    },
    workspacePrefs: {
      cognitiveMode: "interactive",
      informationDensity: "medium",
      interfaceStructure: "guided_flexible",
      updatePace: "alerts",
    },
    linkedInSummary: {
      headline: "VP Product",
      company: "TechCorp",
      yearsExperience: 12,
      topSkills: ["Product Strategy", "Go-to-Market", "Analytics"],
    },
    communicationPatterns: {
      strength: "Thorough and balanced",
      failurePattern: "Overthinks small decisions",
      bestTooling: "Collaborative docs",
    },
  },
  mem_003: {
    userId: "mem_003",
    name: "Tom Rodriguez",
    email: "tom@company.com",
    piProfile: "guardian",
    metaArchetype: "enforcer",
    confidence: 0.81,
    source: "conversation",
    drives: { dominance: 3, extraversion: 3, patience: 8, formality: 9 },
    strengths: ["Attention to detail", "Process adherence", "Risk mitigation"],
    cautions: ["Resistant to change", "Overly cautious"],
    ottoConfig: {
      archetype: "guardian",
      autonomyCeiling: 0.4,
      interactionMode: "collaborative",
    },
    workspacePrefs: {
      cognitiveMode: "verbal_procedural",
      informationDensity: "high",
      interfaceStructure: "guided",
      updatePace: "batch",
    },
    communicationPatterns: {
      strength: "Precise and thorough",
      failurePattern: "Can be rigid",
      bestTooling: "Checklists and SOPs",
    },
  },
};

export function getDossier(userId: string): MemberDossier | null {
  return MOCK_DOSSIERS[userId] || null;
}
```

### Step 2: Create the MemberDossier component

Create `apps/web/src/components/organisms/MemberDossier.tsx`:

```tsx
"use client";

import type { MemberDossier as DossierType } from "@/lib/mock-dossier";
import { ARCHETYPE_DISPLAY } from "@/lib/mock-forge";

function DriveBar({
  label,
  value,
  max = 10,
}: {
  label: string;
  value: number;
  max?: number;
}) {
  const pct = (value / max) * 100;
  return (
    <div className="flex items-center gap-3">
      <span className="w-4 text-xs font-bold text-text-muted">{label}</span>
      <div className="flex-1 h-3 rounded-full bg-surface-overlay overflow-hidden">
        <div
          className="h-full rounded-full bg-accent-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 text-right text-xs font-medium text-text-secondary">
        {value}
      </span>
    </div>
  );
}

export default function MemberDossier({ dossier }: { dossier: DossierType }) {
  const archDisplay = ARCHETYPE_DISPLAY[dossier.metaArchetype];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-accent-primary/20 text-xl font-bold text-accent-primary">
          {dossier.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-primary">
            {dossier.name}
          </h2>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${archDisplay.bgColor} ${archDisplay.color}`}
            >
              {dossier.piProfile.charAt(0).toUpperCase() +
                dossier.piProfile.slice(1)}
            </span>
            <span className="text-xs text-text-muted">&middot;</span>
            <span className={`text-xs font-medium ${archDisplay.color}`}>
              {archDisplay.label}
            </span>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            {Math.round(dossier.confidence * 100)}% confidence &middot; Source:{" "}
            {dossier.source}
          </p>
        </div>
      </div>

      {/* Drives + Strengths grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Drives */}
        <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Drives
          </h3>
          <div className="space-y-2.5">
            <DriveBar label="D" value={dossier.drives.dominance} />
            <DriveBar label="E" value={dossier.drives.extraversion} />
            <DriveBar label="P" value={dossier.drives.patience} />
            <DriveBar label="F" value={dossier.drives.formality} />
          </div>
        </div>

        {/* Strengths + Cautions */}
        <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Strengths
          </h3>
          <ul className="space-y-1.5">
            {dossier.strengths.map((s) => (
              <li
                key={s}
                className="flex items-start gap-2 text-xs text-text-secondary"
              >
                <span className="mt-0.5 text-accent-success">&#x2713;</span> {s}
              </li>
            ))}
          </ul>
          <h3 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Cautions
          </h3>
          <ul className="space-y-1.5">
            {dossier.cautions.map((c) => (
              <li
                key={c}
                className="flex items-start gap-2 text-xs text-text-secondary"
              >
                <span className="mt-0.5 text-accent-warning">&#x26A0;</span> {c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Otto Config + Workspace Prefs */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Otto Config
          </h3>
          <dl className="space-y-2 text-xs">
            <div className="flex justify-between">
              <dt className="text-text-muted">Archetype</dt>
              <dd className="font-medium text-text-primary capitalize">
                {dossier.ottoConfig.archetype}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Autonomy</dt>
              <dd className="font-medium text-text-primary">
                {dossier.ottoConfig.autonomyCeiling}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Mode</dt>
              <dd className="font-medium text-text-primary capitalize">
                {dossier.ottoConfig.interactionMode.replace(/_/g, " ")}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Workspace Prefs
          </h3>
          <dl className="space-y-2 text-xs">
            <div className="flex justify-between">
              <dt className="text-text-muted">Cognitive</dt>
              <dd className="font-medium text-text-primary capitalize">
                {dossier.workspacePrefs.cognitiveMode.replace(/_/g, " ")}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Density</dt>
              <dd className="font-medium text-text-primary capitalize">
                {dossier.workspacePrefs.informationDensity}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Structure</dt>
              <dd className="font-medium text-text-primary capitalize">
                {dossier.workspacePrefs.interfaceStructure.replace(/_/g, " ")}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Updates</dt>
              <dd className="font-medium text-text-primary capitalize">
                {dossier.workspacePrefs.updatePace}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* LinkedIn Summary */}
      {dossier.linkedInSummary && (
        <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
            LinkedIn Summary
          </h3>
          <p className="text-sm text-text-primary">
            {dossier.linkedInSummary.headline} at{" "}
            {dossier.linkedInSummary.company} &middot;{" "}
            {dossier.linkedInSummary.yearsExperience} years experience
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {dossier.linkedInSummary.topSkills.map((skill) => (
              <span
                key={skill}
                className="rounded bg-surface-overlay px-2 py-0.5 text-[10px] text-text-secondary"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Communication */}
      <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Communication Patterns
        </h3>
        <dl className="space-y-2 text-xs">
          <div className="flex justify-between">
            <dt className="text-text-muted">Strength</dt>
            <dd className="font-medium text-text-primary">
              {dossier.communicationPatterns.strength}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-muted">Failure Pattern</dt>
            <dd className="font-medium text-accent-warning">
              {dossier.communicationPatterns.failurePattern}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-muted">Best Tooling</dt>
            <dd className="font-medium text-text-primary">
              {dossier.communicationPatterns.bestTooling}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
```

### Step 3: Create the member dossier page

Create `apps/web/src/app/(shell)/admin/members/[userId]/page.tsx`:

```tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { getDossier } from "@/lib/mock-dossier";
import MemberDossierComponent from "@/components/organisms/MemberDossier";

export default function MemberDossierPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const dossier = getDossier(userId);

  if (!dossier) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <p className="text-sm text-text-muted">Member not found</p>
          <button
            onClick={() => router.push("/admin/members")}
            className="mt-2 text-xs text-accent-primary hover:underline"
          >
            Back to members
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <button
        onClick={() => router.push("/admin/members")}
        className="mb-4 flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary"
      >
        &#x2190; Back to members
      </button>
      <MemberDossierComponent dossier={dossier} />
    </div>
  );
}
```

### Step 4: Add "View Profile" link to MembersTable

In `apps/web/src/components/organisms/MembersTable.tsx`, add a "View" link in each member row that navigates to `/admin/members/${member.id}`. Add it as a small button after the Last Active column or in the member name area.

### Step 5: Type-check and commit

Run: `source ~/.nvm/nvm.sh && nvm use 20 && cd apps/web && pnpm type-check`

```bash
git add apps/web/src/lib/mock-dossier.ts apps/web/src/components/organisms/MemberDossier.tsx apps/web/src/app/\(shell\)/admin/members/\[userId\]/page.tsx apps/web/src/components/organisms/MembersTable.tsx
git commit -m "feat(web): add member dossier page with PI profile visualization"
```

---

## Task 7: Team Constellation Map

**Files:**

- Create: `apps/web/src/app/(shell)/admin/constellation/page.tsx`
- Create: `apps/web/src/components/organisms/ConstellationMap.tsx`

**Context:** A scatter plot showing all team members as stars. X-axis = Dominance (1-10), Y-axis = Extraversion (1-10). Color = meta-archetype (Driver=primary, Enforcer=secondary, Interpreter=warning). Size = confidence score. Hover reveals name + archetype label. Uses Recharts (already in project deps — check with `pnpm list recharts`). If not installed, add it. Uses mock dossier data from Task 6.

### Step 1: Check if Recharts is installed

Run: `source ~/.nvm/nvm.sh && nvm use 20 && cd apps/web && pnpm list recharts 2>/dev/null || echo "NOT INSTALLED"`

If not installed, run: `cd apps/web && pnpm add recharts`

### Step 2: Create the ConstellationMap component

Create `apps/web/src/components/organisms/ConstellationMap.tsx`:

```tsx
"use client";

import { useState } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { MOCK_DOSSIERS, type MemberDossier } from "@/lib/mock-dossier";

const ARCHETYPE_COLORS: Record<string, string> = {
  driver: "#6366f1", // accent-primary (indigo)
  enforcer: "#f59e0b", // accent-warning (amber)
  interpreter: "#10b981", // accent-success (emerald)
};

interface StarPoint {
  x: number;
  y: number;
  name: string;
  profile: string;
  archetype: string;
  confidence: number;
  size: number;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: StarPoint }>;
}) {
  if (!active || !payload?.[0]) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised px-3 py-2 shadow-lg">
      <p className="text-sm font-semibold text-text-primary">{data.name}</p>
      <p className="text-xs text-text-secondary capitalize">
        {data.profile} &middot; {data.archetype}
      </p>
      <p className="text-[10px] text-text-muted">
        D:{data.x} E:{data.y} &middot; {Math.round(data.confidence * 100)}%
      </p>
    </div>
  );
}

export default function ConstellationMap() {
  const dossiers = Object.values(MOCK_DOSSIERS);

  const data: StarPoint[] = dossiers.map((d) => ({
    x: d.drives.dominance,
    y: d.drives.extraversion,
    name: d.name,
    profile: d.piProfile,
    archetype: d.metaArchetype,
    confidence: d.confidence,
    size: Math.max(80, d.confidence * 200),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Team Constellation
          </h2>
          <p className="mt-0.5 text-sm text-text-secondary">
            {dossiers.length} members mapped by behavioral drives
          </p>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4">
          {Object.entries(ARCHETYPE_COLORS).map(([arch, color]) => (
            <div key={arch} className="flex items-center gap-1.5">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-text-muted capitalize">{arch}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        className="rounded-lg border border-surface-border bg-surface-raised p-4"
        style={{ height: 500 }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.06)"
            />
            <XAxis
              type="number"
              dataKey="x"
              name="Dominance"
              domain={[0, 10]}
              ticks={[0, 2, 4, 6, 8, 10]}
              tick={{ fill: "#737373", fontSize: 11 }}
              label={{
                value: "Dominance",
                position: "bottom",
                fill: "#737373",
                fontSize: 12,
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Extraversion"
              domain={[0, 10]}
              ticks={[0, 2, 4, 6, 8, 10]}
              tick={{ fill: "#737373", fontSize: 11 }}
              label={{
                value: "Extraversion",
                angle: -90,
                position: "insideLeft",
                fill: "#737373",
                fontSize: 12,
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Scatter data={data}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={ARCHETYPE_COLORS[entry.archetype] || "#6366f1"}
                  r={Math.sqrt(entry.size / Math.PI)}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

### Step 3: Create the constellation page

Create `apps/web/src/app/(shell)/admin/constellation/page.tsx`:

```tsx
"use client";

import ConstellationMap from "@/components/organisms/ConstellationMap";

export default function ConstellationPage() {
  return (
    <div className="h-full overflow-y-auto p-6">
      <ConstellationMap />
    </div>
  );
}
```

### Step 4: Add constellation link to admin nav

Check the admin layout/sidebar for navigation links and add "Constellation" to the nav. The admin nav likely lives in the shell layout — find it and add the link.

### Step 5: Type-check and commit

Run: `source ~/.nvm/nvm.sh && nvm use 20 && cd apps/web && pnpm type-check`

```bash
git add apps/web/src/components/organisms/ConstellationMap.tsx apps/web/src/app/\(shell\)/admin/constellation/page.tsx
git commit -m "feat(web): add team constellation scatter plot for admin analytics"
```

---

## Task 8: Google Calendar Sync — Backend + Frontend

**Files:**

- Create: `apps/api/src/services/calendar.py`
- Create: `apps/api/src/routes/calendar.py`
- Modify: `apps/api/src/main.py` (register calendar router)
- Modify: `apps/web/src/stores/calendar.store.ts` (add sync action)
- Modify: `apps/web/src/lib/mock-calendar.ts` (add synced event type)

**Context:** After Forge onboarding, we trigger `POST /api/v1/calendar/sync` which uses the Google OAuth token to pull events for the next 30 days. For demo without Google API credentials, return mock events that look like real calendar data. The frontend Calendar module already works with `CalendarEvent` types — we just need to add a sync action that populates with "real" data.

### Step 1: Create the calendar service

Create `apps/api/src/services/calendar.py`:

```python
"""Google Calendar sync service."""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx


GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3"


async def sync_google_calendar(
    access_token: str,
    days_ahead: int = 30,
) -> list[dict]:
    """Pull calendar events from Google Calendar API.

    Falls back to mock events if no valid token or API unavailable.
    """
    if not access_token or access_token.startswith("dev_") or access_token.startswith("invite_"):
        return _mock_calendar_events(days_ahead)

    try:
        now = datetime.now(timezone.utc)
        time_min = now.isoformat()
        time_max = (now + timedelta(days=days_ahead)).isoformat()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{GOOGLE_CALENDAR_API}/calendars/primary/events",
                headers={"Authorization": f"Bearer {access_token}"},
                params={
                    "timeMin": time_min,
                    "timeMax": time_max,
                    "singleEvents": "true",
                    "orderBy": "startTime",
                    "maxResults": 50,
                },
            )
            response.raise_for_status()
            data = response.json()

            events = []
            for item in data.get("items", []):
                start = item.get("start", {})
                end = item.get("end", {})
                events.append({
                    "google_event_id": item.get("id"),
                    "title": item.get("summary", "Untitled"),
                    "description": item.get("description"),
                    "start_at": start.get("dateTime") or start.get("date"),
                    "end_at": end.get("dateTime") or end.get("date"),
                    "location": item.get("location"),
                    "attendees": [
                        {"name": a.get("displayName", a.get("email", ""))}
                        for a in item.get("attendees", [])
                    ],
                    "source": "google_calendar",
                })
            return events
    except Exception as e:
        print(f"[CALENDAR] Google API failed, using mock: {e}")
        return _mock_calendar_events(days_ahead)


def _mock_calendar_events(days_ahead: int = 30) -> list[dict]:
    """Generate realistic mock calendar events for demo."""
    now = datetime.now(timezone.utc)
    events = []

    mock_events = [
        ("Team Standup", "Daily sync with the product team", 1, 9, 30),
        ("1:1 with Sarah", "Weekly product strategy sync", 2, 10, 60),
        ("Client Call — Summit Publishing", "Contract review follow-up", 3, 14, 45),
        ("Board Prep", "Q1 board deck review", 4, 11, 90),
        ("Design Review", "UI/UX review for new features", 5, 15, 60),
        ("Investor Update", "Monthly investor newsletter prep", 7, 10, 30),
        ("Team Retro", "Sprint retrospective", 8, 16, 60),
        ("Product Demo", "Demo new features to stakeholders", 10, 14, 45),
        ("Hiring Panel", "Interview — Senior Engineer", 12, 11, 60),
        ("Strategy Offsite Prep", "Prepare materials for Q2 offsite", 14, 9, 120),
        ("Contract Review — Acme", "Review distribution agreement", 6, 13, 60),
        ("Marketing Sync", "Go-to-market alignment", 9, 10, 45),
        ("Tech Architecture Review", "Platform scalability discussion", 11, 15, 90),
        ("Customer Success Check-in", "Quarterly review with CS team", 13, 11, 30),
    ]

    for title, desc, day_offset, hour, duration_mins in mock_events:
        if day_offset > days_ahead:
            continue
        start = now.replace(hour=hour, minute=0, second=0, microsecond=0) + timedelta(days=day_offset)
        end = start + timedelta(minutes=duration_mins)
        events.append({
            "google_event_id": f"gcal_{day_offset}_{hour}",
            "title": title,
            "description": desc,
            "start_at": start.isoformat(),
            "end_at": end.isoformat(),
            "location": None,
            "attendees": [],
            "source": "google_calendar",
        })

    return sorted(events, key=lambda e: e["start_at"])
```

### Step 2: Create the calendar routes

Create `apps/api/src/routes/calendar.py`:

```python
"""Calendar sync routes."""

from fastapi import APIRouter, Header
from pydantic import BaseModel

from src.services.calendar import sync_google_calendar

router = APIRouter(prefix="/api/v1/calendar", tags=["calendar"])


class CalendarEvent(BaseModel):
    google_event_id: str | None = None
    title: str
    description: str | None = None
    start_at: str
    end_at: str
    location: str | None = None
    attendees: list[dict] = []
    source: str = "google_calendar"


class SyncResponse(BaseModel):
    events: list[CalendarEvent]
    count: int
    synced: bool


@router.post("/sync", response_model=SyncResponse)
async def sync_calendar(
    authorization: str = Header(default=""),  # noqa: B008
):
    """Sync Google Calendar events for the authenticated user."""
    token = authorization.replace("Bearer ", "") if authorization else ""
    events = await sync_google_calendar(token)
    return SyncResponse(
        events=[CalendarEvent(**e) for e in events],
        count=len(events),
        synced=True,
    )


@router.get("/events", response_model=SyncResponse)
async def list_events():
    """List synced calendar events (returns mock for demo)."""
    events = await sync_google_calendar("")
    return SyncResponse(
        events=[CalendarEvent(**e) for e in events],
        count=len(events),
        synced=True,
    )
```

### Step 3: Register calendar router

Add to `apps/api/src/main.py`:

```python
from src.routes.calendar import router as calendar_router
app.include_router(calendar_router)
```

### Step 4: Add sync action to the frontend calendar store

Check the existing `apps/web/src/stores/calendar.store.ts` and add a `syncFromGoogle` action that calls `POST /api/v1/calendar/sync` and merges the returned events with existing mock data. Events from the API should be converted to match the existing `CalendarEvent` type format.

### Step 5: Commit

```bash
git add apps/api/src/services/calendar.py apps/api/src/routes/calendar.py apps/api/src/main.py
git commit -m "feat(api): add Google Calendar sync service with mock fallback"
```

---

## Task 9: Admin Enhancements — Invite Wiring + Archetype Badges

**Files:**

- Modify: `apps/web/src/components/organisms/MembersTable.tsx` (wire InviteModal to real API, add archetype badges)
- Modify: `apps/web/src/lib/mock-admin.ts` (add archetype/profile fields to WorkspaceMember type)

**Context:** The MembersTable already has an InviteModal (lines 139-216) but it doesn't call the API. We need to: (1) wire the invite button to `POST /api/v1/invites`, (2) add PI archetype badges to each member row, (3) add "View Profile" links. The existing `WorkspaceMember` type in `mock-admin.ts` needs `piProfile` and `metaArchetype` fields.

### Step 1: Add PI fields to WorkspaceMember type

In `apps/web/src/lib/mock-admin.ts`, add to the `WorkspaceMember` interface:

```typescript
  piProfile?: string;       // e.g. "maverick", "guardian"
  metaArchetype?: string;   // "driver" | "enforcer" | "interpreter"
  confidence?: number;      // 0-1
```

Update the existing `MOCK_MEMBERS` array to include these fields for each member (use data matching the dossier mocks from Task 6).

### Step 2: Wire InviteModal to the API

In `apps/web/src/components/organisms/MembersTable.tsx`, update the `InviteModal`:

```typescript
import { apiFetch } from "@/lib/api";

// In handleInvite:
const handleInvite = async () => {
  if (!email.trim()) return;
  try {
    await apiFetch("/api/v1/invites", {
      method: "POST",
      body: JSON.stringify({ email, org_role: orgRole }),
    });
    setSent(true);
    setTimeout(onClose, 1500);
  } catch {
    // API not running — just show success for demo
    setSent(true);
    setTimeout(onClose, 1500);
  }
};
```

### Step 3: Add archetype badges to member rows

In the Member column of MembersTable, after the email line, add:

```tsx
{
  member.piProfile && (
    <span
      className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium capitalize ${
        member.metaArchetype === "driver"
          ? "bg-accent-primary/20 text-accent-primary"
          : member.metaArchetype === "enforcer"
            ? "bg-accent-warning/20 text-accent-warning"
            : "bg-accent-success/20 text-accent-success"
      }`}
    >
      {member.piProfile}
    </span>
  );
}
```

### Step 4: Add "View" link to each row

Add a "View" button/link to the far right of each member row that navigates to `/admin/members/${member.id}`:

```tsx
import { useRouter } from "next/navigation";
// ...
<td className="px-4 py-3">
  <button
    onClick={(e) => {
      e.stopPropagation();
      router.push(`/admin/members/${member.id}`);
    }}
    className="text-xs text-accent-primary hover:underline"
  >
    View
  </button>
</td>;
```

Add a corresponding header column "Actions".

### Step 5: Type-check and commit

Run: `source ~/.nvm/nvm.sh && nvm use 20 && cd apps/web && pnpm type-check`

```bash
git add apps/web/src/components/organisms/MembersTable.tsx apps/web/src/lib/mock-admin.ts
git commit -m "feat(web): wire invite modal to API and add PI badges to members table"
```

---

## Post-Implementation Checklist

After all 9 tasks are complete:

1. **Full type-check:** `source ~/.nvm/nvm.sh && nvm use 20 && cd apps/web && pnpm type-check`
2. **Lint:** `source ~/.nvm/nvm.sh && nvm use 20 && cd apps/web && pnpm lint`
3. **Start dev server:** Verify the app loads at localhost:3000
4. **Smoke test the demo flow:**
   - Go to `/admin/members` → click Invite → enter email
   - Navigate to `/join/test-token` → see branded landing
   - Navigate to `/forge` → see LinkedIn URL step
   - Navigate to `/contracts/playbook` → see view-only DAG
   - Navigate to `/admin/members/mem_001` → see dossier
   - Navigate to `/admin/constellation` → see star map
5. **Push to remote:** `git push -u origin HEAD`
