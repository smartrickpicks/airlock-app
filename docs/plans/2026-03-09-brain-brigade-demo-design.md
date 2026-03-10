# Brain Brigade Demo — Design Document

**Date:** 2026-03-09
**Target:** Claude Code Demo Day (2-3 days)
**Workspace Name:** Brain Brigade
**Concept:** Live onboarding demo — invite a real person, they go through PI profiling via LinkedIn + Forge, get placed in the constellation workspace with real data, admin sees full analytics.

---

## Objective

Build a live, end-to-end demo of the Airlock constellation: a real person receives a magic link invite, signs up, goes through the Forge (with LinkedIn scraping for PI profiling), connects their Google Calendar, gets a personality-matched playbook (view-only), can message the admin, and the admin sees their full PI dossier on a team constellation map.

**Demo flow:**

```
Admin enters email in /admin/members
  → Magic link email sent via Resend
  → Person clicks link, lands on /join/:token
  → Signs up via Google OAuth (+ calendar scope)
  → Forge conversation:
      Step 0: "Drop your LinkedIn URL"
        → Backend scrapes profile via hosted LinkedIn MCP server
        → Otto shows what it found from LinkedIn
      Step 1: 1-2 refining questions (autonomy, work style)
      Step 2: Profile result (archetype + drives + confidence)
      Step 3: [Launch Workspace]
  → Google Calendar syncs → real events populate Calendar module
  → Playbook auto-generated based on PI archetype (view-only DAG)
  → Person can message admin via Messenger
  → Admin sees:
      - Member dossier card (drives radar, strengths, Otto config)
      - Team constellation map (all members as stars)
```

---

## Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  ADMIN (You)                                                │
│                                                             │
│  /admin/members → Enter email → "Invite to Brain Brigade"   │
│       │                                                     │
│       ▼                                                     │
│  Backend: POST /api/v1/invites                              │
│       ├─→ Generate ULID invite token                        │
│       ├─→ Store invite (email, workspace_id, token, status) │
│       └─→ Send email via Resend API                         │
│            "You've been invited to Brain Brigade"            │
│            [Join Now] → brainbrigade.app/join/{token}        │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  NEW PERSON (Their computer)                                │
│                                                             │
│  /join/{token} → Branded welcome page                       │
│       │                                                     │
│       ▼                                                     │
│  Sign up (Google OAuth + calendar.readonly scope)           │
│       │                                                     │
│       ▼                                                     │
│  /forge → Otto conversation:                                │
│       │                                                     │
│       ├─ Step 0: "Drop your LinkedIn URL"                   │
│       │    └─→ Backend: POST /api/v1/linkedin/scrape        │
│       │         └─→ Hosted Docker scraper fetches profile   │
│       │         └─→ Returns: headline, bio, experience,     │
│       │              skills, education                      │
│       │                                                     │
│       ├─ Step 1: Otto shows what it found:                  │
│       │    "Based on your LinkedIn, I see you're a [role]   │
│       │     at [company] focused on [domain]..."            │
│       │    Pre-infers drives from LinkedIn signals           │
│       │                                                     │
│       ├─ Step 2: 1-2 refining questions                     │
│       │    (autonomy preference, work style)                │
│       │                                                     │
│       └─ Step 3: Profile result                             │
│            "You're a Maverick (87% confidence)"             │
│            Drives radar, strengths, workspace preview        │
│            [Launch Workspace]                                │
│                                                             │
│       ▼                                                     │
│  Google Calendar sync                                       │
│       └─→ Backend: GET /api/v1/calendar/sync                │
│            └─→ Google Calendar API (calendar.readonly)      │
│            └─→ Pull events → store in Calendar module       │
│                                                             │
│       ▼                                                     │
│  Workspace ready:                                           │
│       ├─ Dispatch (homepage) with real calendar events      │
│       ├─ Playbook auto-suggested based on archetype         │
│       │    └─ /contracts/playbook (view-only DAG)           │
│       ├─ Can message admin via Messenger                    │
│       └─ Personalized workspace (modules, Otto config)      │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  ADMIN (Real-time)                                          │
│                                                             │
│  /admin/members → New member appears with:                  │
│       ├─ PI archetype badge                                 │
│       ├─ Meta-archetype (Driver/Enforcer/Interpreter)       │
│       ├─ Confidence score                                   │
│       └─ [View Profile] →                                   │
│                                                             │
│  /admin/members/:userId → Member Dossier:                   │
│       ├─ Drives radar chart (D/E/P/F)                       │
│       ├─ Archetype + meta-archetype                         │
│       ├─ Strengths & cautions                               │
│       ├─ Otto configuration                                 │
│       ├─ Workspace preferences                              │
│       ├─ LinkedIn summary                                   │
│       └─ Communication patterns                             │
│                                                             │
│  /admin/constellation → Team Star Map:                      │
│       ├─ Scatter plot: all members as stars                  │
│       ├─ X-axis: Dominance, Y-axis: Extraversion            │
│       ├─ Color: meta-archetype                              │
│       ├─ Size: confidence score                             │
│       └─ Hover: name + archetype label                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Infrastructure

| Component        | Tech                                                               | Where                       |
| ---------------- | ------------------------------------------------------------------ | --------------------------- |
| Web App          | Next.js 14 (existing)                                              | Deploy to Vercel or compute |
| API              | FastAPI (existing)                                                 | Your compute                |
| LinkedIn Scraper | Docker: `stickerdaniel/linkedin-mcp-server` + thin FastAPI wrapper | Your compute (same box)     |
| Email            | Resend API (free: 100 emails/day)                                  | SaaS — API key              |
| Database         | PostgreSQL 16 (existing)                                           | Your compute                |
| Auth             | Google OAuth (existing, add `calendar.readonly` scope)             | Configured                  |
| Google Calendar  | Google Calendar API via OAuth token                                | SaaS — reuse auth token     |

### LinkedIn Scraper Setup

```dockerfile
# Docker container wrapping the MCP server as an HTTP API
FROM python:3.12-slim
RUN pip install linkedin-scraper-mcp patchright fastapi uvicorn
RUN patchright install chromium

# Pre-auth: mount ~/.linkedin-mcp/profile/ from host
# (one-time manual login via --login flag)

# Thin FastAPI wrapper exposes:
# POST /scrape { "linkedin_url": "..." }
# → calls get_person_profile() → returns JSON
```

---

## Database Changes

### New Table: `invites`

```sql
CREATE TABLE invites (
    id TEXT PRIMARY KEY,                    -- ULID
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,             -- magic link token
    invited_by TEXT NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'pending', -- pending | accepted | expired
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    accepted_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,        -- 7 days from creation
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_invites_token ON invites(token);
CREATE INDEX idx_invites_email ON invites(email);
```

### New Table: `calendar_events`

```sql
CREATE TABLE calendar_events (
    id TEXT PRIMARY KEY,                    -- ULID
    workspace_id TEXT NOT NULL,             -- RLS
    user_id TEXT NOT NULL REFERENCES users(id),
    google_event_id TEXT,                   -- external reference
    title TEXT NOT NULL,
    description TEXT,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    location TEXT,
    attendees JSONB DEFAULT '[]',
    source TEXT DEFAULT 'google_calendar',
    synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_calendar_events_user ON calendar_events(user_id, start_at);
```

### Modified Table: `user_profiles`

Add column:

```sql
ALTER TABLE user_profiles ADD COLUMN linkedin_data JSONB DEFAULT '{}';
-- Stores raw scraped LinkedIn data: headline, bio, experience, skills, education
```

---

## API Routes

### New Routes

| Method | Route                              | Purpose                                       |
| ------ | ---------------------------------- | --------------------------------------------- |
| `POST` | `/api/v1/invites`                  | Admin creates invite, sends email             |
| `GET`  | `/api/v1/invites/:token`           | Validate invite token → return workspace info |
| `POST` | `/api/v1/invites/:token/accept`    | Accept invite → create user + membership      |
| `POST` | `/api/v1/linkedin/scrape`          | Scrape LinkedIn URL → return profile data     |
| `POST` | `/api/v1/calendar/sync`            | Pull Google Calendar events for user          |
| `GET`  | `/api/v1/calendar/events`          | List synced calendar events                   |
| `GET`  | `/api/v1/profiles/:userId/dossier` | Full PI dossier for admin view                |
| `GET`  | `/api/v1/profiles/constellation`   | All profiles for team map                     |

---

## Frontend Routes

### New Pages

| Route                    | Component           | Purpose                                                 |
| ------------------------ | ------------------- | ------------------------------------------------------- |
| `/join/:token`           | `InviteLanding`     | Branded invite page → Google OAuth → redirect to /forge |
| `/admin/members/:userId` | `MemberDossier`     | Full PI profile dossier card                            |
| `/admin/constellation`   | `TeamConstellation` | Star map of all team members                            |

### Modified Pages

| Route                 | Change                                                       |
| --------------------- | ------------------------------------------------------------ |
| `/admin/members`      | Add "Invite Member" button + archetype badges on member rows |
| `/forge`              | New Step 0: LinkedIn URL input → scrape → pre-fill inference |
| `/contracts/playbook` | Add `readOnly` prop → disable gate actions                   |
| `/calendar`           | Wire to real synced events from `calendar_events` table      |

---

## Component Design

### 1. InviteLanding (`/join/:token`)

```
┌──────────────────────────────────────────┐
│                                          │
│        🔒 Brain Brigade                  │
│                                          │
│   You've been invited to join            │
│   [Workspace Name]                       │
│                                          │
│   Invited by: [Admin Name]               │
│                                          │
│   ┌──────────────────────────────┐       │
│   │  🔵 Continue with Google     │       │
│   └──────────────────────────────┘       │
│                                          │
│   By joining, you'll set up your         │
│   personalized workspace with Otto.      │
│                                          │
└──────────────────────────────────────────┘
```

### 2. Forge LinkedIn Step (new Step 0)

```
┌──────────────────────────────────────────┐
│ Otto: Welcome! Before we get started,    │
│ drop your LinkedIn profile URL so I can  │
│ learn a bit about your background.       │
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │ https://linkedin.com/in/...          │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ [Analyze Profile]                        │
│                                          │
│ ── after scrape ──                       │
│                                          │
│ Otto: Nice to meet you! I can see you're │
│ a [Title] at [Company] with expertise in │
│ [Skills]. Let me ask you a couple more   │
│ questions to dial in your workspace...   │
└──────────────────────────────────────────┘
```

### 3. Member Dossier Card

```
┌──────────────────────────────────────────────────────────┐
│  ┌─────┐                                                 │
│  │ AVA │  Jane Smith                                     │
│  └─────┘  Maverick · Driver                              │
│           87% confidence · Source: linkedin + conversation│
│                                                          │
│  ┌─ Drives ────────────┐  ┌─ Strengths ───────────────┐ │
│  │                      │  │ • Bold decision-maker     │ │
│  │   D ████████░░ 8     │  │ • Thrives under pressure  │ │
│  │   E ███████░░░ 7     │  │ • Natural risk-taker      │ │
│  │   P ██░░░░░░░░ 2     │  │                           │ │
│  │   F ███░░░░░░░ 3     │  ├─ Cautions ───────────────┤ │
│  │                      │  │ • May skip due diligence  │ │
│  │  (radar chart)       │  │ • Can overwhelm cautious  │ │
│  └──────────────────────┘  └───────────────────────────┘ │
│                                                          │
│  ┌─ Otto Config ───────┐  ┌─ Workspace Prefs ─────────┐ │
│  │ Archetype: Executor  │  │ Cognitive: Fast-scan       │ │
│  │ Autonomy: 0.85       │  │ Density: Compressed        │ │
│  │ Mode: Autonomous     │  │ Structure: Minimal         │ │
│  └──────────────────────┘  └───────────────────────────┘ │
│                                                          │
│  ┌─ LinkedIn Summary ──────────────────────────────────┐ │
│  │ VP Product at TechCorp · 12 years experience        │ │
│  │ Skills: Product Strategy, Go-to-Market, Analytics   │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### 4. Team Constellation Map

```
┌──────────────────────────────────────────────────────────┐
│  Team Constellation                    3 members         │
│                                                          │
│  Extraversion ▲                                          │
│               │         ★ Jane (Maverick)                │
│          9    │              ●                            │
│               │                                          │
│          6    │    ★ You (Strategist)                     │
│               │         ●                                │
│          3    │                    ★ Tom (Guardian)       │
│               │                        ●                 │
│          0    └──────────────────────────────── ▶         │
│               0    3    6    9    Dominance               │
│                                                          │
│  ● Driver  ● Enforcer  ● Interpreter                    │
└──────────────────────────────────────────────────────────┘
```

### 5. PlaybookView Read-Only Mode

The existing PlaybookView gets a `readOnly` prop:

- DAG nodes render normally (chamber grouping, status indicators, actor badges)
- All nodes show as `pending` status (no execution has happened)
- Gate panel does NOT appear on node click
- Instead, clicking a node shows an info tooltip: node name, actor type, gate type (if gated)
- Progress bar shows 0% with label "Ready to execute"
- Archetype-specific template loaded based on PI profile:
  - Driver/Maverick → `contract-intake.yaml` (fast-track, fewer gates)
  - Enforcer/Guardian → modified template with extra compliance gates
  - Interpreter/Collaborator → modified template with more human touchpoints

---

## Playbook Generation Logic

### Archetype → Playbook Mapping

```typescript
const ARCHETYPE_PLAYBOOK_MAP: Record<MetaArchetype, string> = {
  driver: "contract-intake", // Fast execution, minimal gates
  enforcer: "pilot-close", // Process-heavy, compliance gates
  interpreter: "research-deep-dive", // Collaborative, human touchpoints
};
```

The playbook store's `loadDemoPlaybook()` gets updated to accept a `metaArchetype` parameter and load the appropriate template. For the demo, all nodes start as `pending` (view-only).

---

## Email Template

```
Subject: You've been invited to Brain Brigade

Hi [Name],

[Admin Name] has invited you to join Brain Brigade on Airlock.

When you join, Otto (our AI assistant) will learn about your
working style and set up a personalized workspace just for you.

[Join Brain Brigade →]

This invite expires in 7 days.
```

Sent via Resend API (`resend.emails.send()`).

---

## Google Calendar Integration

### Auth Flow

- Google OAuth already happens at signup
- Add `https://www.googleapis.com/auth/calendar.readonly` to requested scopes
- Store the OAuth refresh token in `user_profiles.metadata.google_tokens`

### Sync Flow

1. After Forge completes → trigger `POST /api/v1/calendar/sync`
2. Backend uses refresh token to call Google Calendar API
3. Pull events for next 30 days
4. Store in `calendar_events` table
5. Frontend Calendar module reads from this table instead of mock data

### Data Pulled

- Event title, description, start/end times
- Location, attendees (names only, no emails stored)
- Recurring event expansion (next 30 days)

---

## Implementation Priority

| #   | Component                                    | Effort  | Dependencies          |
| --- | -------------------------------------------- | ------- | --------------------- |
| 1   | Invite system (backend + email + /join page) | 3-4 hrs | Resend API key        |
| 2   | LinkedIn scraper (Docker + API wrapper)      | 3-4 hrs | Docker on compute     |
| 3   | Forge LinkedIn step (frontend)               | 2-3 hrs | #2                    |
| 4   | Google Calendar sync (backend + frontend)    | 3-4 hrs | Google OAuth scope    |
| 5   | Member Dossier page                          | 2-3 hrs | Existing profile data |
| 6   | Team Constellation map                       | 2-3 hrs | Recharts/D3           |
| 7   | Playbook view-only mode + archetype mapping  | 1-2 hrs | Existing M8-M10       |
| 8   | Admin invite button + member badges          | 1-2 hrs | #1                    |
| 9   | Messaging backend (basic persistence)        | 2-3 hrs | Existing mock         |

**Total estimated: ~22-28 hours of implementation**

---

## Success Criteria

Demo tells this story in under 5 minutes:

1. Admin enters email → person gets branded invite
2. Person signs up → Otto scrapes their LinkedIn → infers their PI profile
3. Google Calendar syncs → workspace fills with real data
4. Person sees a personality-matched playbook (view-only)
5. Person sends admin a message
6. Admin sees their full PI dossier + team constellation map
7. Audience sees: 9 repos, MCP connections, Claude Code as the brain

**Not mock data. Real people. Real LinkedIn. Real calendars. Real personality science.**
