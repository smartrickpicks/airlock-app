# Unified Identity: Roles, Permissions, Privacy, and Social Graph

> **Approach:** Unified Identity (Approach B) — roles carry both permission and cognitive metadata.
> **Status:** Design approved, pending implementation plan.
> **Depends on:** Phase 1 PI Foundation (committed, branch `claude/review-demo-readiness-plan-Tt4Ai`)

---

## 1. The Identity Stack

Every user in Airlock has an identity composed of five layers, from immutable personality to contextual permissions:

```
┌─────────────────────────────────────┐
│  5. PI Profile (personality)        │  Who you ARE (17 types)
│     Immutable cognitive trait        │  Assessed via questionnaire or admin
├─────────────────────────────────────┤
│  4. Archetype (super-user)          │  Your cognitive SUPERPOWER
│     Derived from PI profile          │  3 buckets: Interpreter/Driver/Enforcer
├─────────────────────────────────────┤
│  3. Role Template (pre-built)       │  Your JOB FUNCTION in the vault
│     Discord-style, editable          │  20+ templates, organized by chamber
├─────────────────────────────────────┤
│  2. Permissions (computed)          │  What you CAN DO
│     Additive, deny-wins, scoped      │  40+ granular permission flags
├─────────────────────────────────────┤
│  1. Scope (context)                 │  WHERE your permissions apply
│     3 levels: Org / Module / Vault   │  Different power in different contexts
└─────────────────────────────────────┘
```

The Moneyball thesis: a Guardian personality in a Verifier role template becomes a super-user — not because of their job title or department, but because their cognitive wiring matches the function perfectly. The platform finds and amplifies these fits.

---

## 2. The Role Model

A role in Airlock has two faces: **Permissions** (what you can do) and **Archetype** (how you think).

### Role Template Schema

```
Role Template {
  id: ULID
  workspace_id: ULID
  name: string                    # "Verifier", "Scout", custom name
  description: string             # What this role does
  color: string                   # Tailwind token for badges
  hierarchy_position: int         # Drag-to-reorder, higher = more authority

  // ── Permission Face ──
  permissions: string[]           # ["view_vaults", "approve_low_risk", ...]

  // ── Archetype Face (optional for custom roles) ──
  archetype_tag: string | null    # "enforcer", "interpreter", "driver", null
  chamber_affinity: string[]      # ["review"], ["discover", "build"], etc.
  pi_fit_profiles: string[]       # ["guardian", "controller", "operator"]
  agentic_role: string | null     # "verifier", "evidence_curator", etc.
  ux_defaults: object | null      # Density, structure, pace preferences

  // ── Metadata ──
  is_system: bool                 # Pre-built template (can't delete)
  is_editable: bool               # Can modify permissions (always true)
  category: string                # "builder" | "gatekeeper" | "owner" | "connector"
  chamber: string | null          # Primary chamber, null for cross-chamber
  created_at: timestamp
  updated_at: timestamp
}
```

### Pre-Built Role Templates (20+)

| Chamber      | Category   | Template            | Archetype   | Best-Fit PI Profiles               | Description                                      |
| ------------ | ---------- | ------------------- | ----------- | ---------------------------------- | ------------------------------------------------ |
| **Discover** | Builder    | **Scout**           | Driver      | Captain, Venturer, Persuader       | SDR/BDR — qualifies leads, runs intake workflows |
| Discover     | Builder    | **Prospector**      | Driver      | Persuader, Promoter, Maverick      | Pipeline management, prospect engagement         |
| Discover     | Builder    | **Analyst**         | Interpreter | Analyzer, Scholar, Specialist      | Research enrichment, data surfacing              |
| Discover     | Builder    | **Intake Operator** | Interpreter | Operator, Adapter, Artisan         | Form processing, triage routing                  |
| **Build**    | Builder    | **Drafter**         | Interpreter | Specialist, Artisan, Analyzer      | Contract assembly, extraction mapping            |
| Build        | Builder    | **Assembler**       | Driver      | Collaborator, Adapter, Promoter    | Deal desk, document combination                  |
| Build        | Builder    | **Data Curator**    | Interpreter | Analyzer, Specialist, Scholar      | Entity resolution, data cleaning                 |
| Build        | Builder    | **Integrator**      | Interpreter | Individualist, Specialist, Scholar | System connectors, API sync                      |
| **Review**   | Gatekeeper | **Verifier**        | Enforcer    | Guardian, Controller, Operator     | QA/compliance, detail checking                   |
| Review       | Gatekeeper | **Approver**        | Enforcer    | Controller, Strategist, Guardian   | Legal/manager approval authority                 |
| Review       | Gatekeeper | **Auditor**         | Enforcer    | Analyzer, Guardian, Controller     | External read-only with audit access             |
| Review       | Gatekeeper | **Referee**         | Enforcer    | Altruist, Collaborator, Strategist | Dispute resolution, conflict mediation           |
| **Ship**     | Owner      | **Publisher**       | Driver      | Captain, Strategist, Promoter      | Final release authority                          |
| Ship         | Owner      | **Reporter**        | Interpreter | Analyzer, Scholar, Specialist      | Dashboards, exports, analytics                   |
| Ship         | Owner      | **Distributor**     | Driver      | Operator, Adapter, Captain         | Logistics, distribution management               |
| Ship         | Owner      | **Creative**        | Driver      | Maverick, Venturer, Individualist  | Presentation generation, brand output            |
| **Cross**    | Connector  | **Orchestrator**    | Driver      | Collaborator, Altruist, Adapter    | Scrum master/PM, process facilitation            |
| Cross        | Connector  | **Interpreter**     | Interpreter | Altruist, Collaborator, Adapter    | Conflict translation, alignment                  |
| Cross        | Connector  | **Admin**           | —           | Any                                | System configuration, workspace management       |

Custom roles: Admins can create unlimited roles from scratch or clone a template. Custom roles without archetype metadata are plain permission bundles — PI recommendations won't reference them.

---

## 3. Permission Scoping (3 Levels)

### Level 1: Org Role (Ceiling)

| Org Role      | Ceiling                                                                      | Who                     |
| ------------- | ---------------------------------------------------------------------------- | ----------------------- |
| **Member**    | Only what assigned module/vault roles grant. No admin access.                | Individual contributors |
| **Lead**      | Manage within assigned modules. Assign roles to others within their modules. | Team leads, senior ICs  |
| **Director**  | Full access to assigned modules + read across all. Can create custom roles.  | Department heads        |
| **Executive** | Read everywhere + Admin overlay access. Modify org-level settings.           | C-suite, VPs            |

### Level 2: Module Role

A user can hold different role templates in different modules. Multiple roles per module are allowed (additive). Module role permissions are capped by org role ceiling.

Example:

- Jane: Drafter in Contracts, Scout in CRM, Admin in Tasks
- Tom: Verifier in Contracts, Auditor in Documents

### Level 3: Vault-Level Overrides

Per-vault permission grants or denies for specific users:

| Override Type | Example                                     | Use Case                |
| ------------- | ------------------------------------------- | ----------------------- |
| **Grant**     | Jane gets `approve_high_risk` on Acme vault | Temporary escalation    |
| **Deny**      | Tom loses `view_vaults` on Acme vault       | Conflict of interest    |
| **Expiry**    | Grant expires in 48 hours                   | Time-limited escalation |

### Permission Computation Formula

```
Effective = MIN(OrgRoleCeiling,
               SUM(ModuleRolePermissions)
             + VaultOverrides
             - SoDEnforcements)
```

Rules:

- `SUM` is additive — multiple roles stack
- Deny always wins over grant at the same scope level
- Separation of Duties (SoD) is hardcoded at API level — no admin override:
  - Cannot approve your own work
  - Cannot review work you drafted
  - Cannot promote changes you authored

### Risk-Based Approval Escalation

| Risk Level | Requirement                            |
| ---------- | -------------------------------------- |
| Low        | 1 Gatekeeper approval                  |
| Medium     | 1 Gatekeeper + 1 Owner                 |
| High       | 2 Gatekeepers + 1 Owner                |
| Critical   | All above + time-locked cooling period |

---

## 4. PI-Informed Role Assignment

### The Moneyball Engine

```
User joins workspace
    ↓
PI Assessment (optional — roles work without it)
    ↓  onboarding questionnaire or admin assigns
PI Profile determined (e.g., "guardian")
    ↓
Scoring Matrix computes fit scores
    ↓  against all 20+ role templates
Recommendation surfaces to admin:
    "Tom is a Guardian → 95% Verifier, 82% Auditor, 71% Data Curator"
    ↓
Admin assigns role(s) — can override any recommendation
    ↓
UX adapts: Tom gets dense tables, deliberate pace,
           tabular structure, detailed AI explanations
```

### Onboarding Wizard

**Step 1:** "Your contract vault needs at least 4 functions to work:"

- 1 Scout or Prospector (Discover)
- 1 Drafter or Assembler (Build)
- 1 Verifier or Approver (Review)
- 1 Publisher (Ship)
- Optional: 1 Orchestrator (Cross-chamber)

**Step 2:** "Here are your team members ranked by fit for each role:"

| Role Needed | Best Fit | Score | PI Profile | Superpower                                     |
| ----------- | -------- | ----- | ---------- | ---------------------------------------------- |
| Verifier    | Tom      | 95%   | Guardian   | High patience + formality catches every detail |
| Drafter     | Sarah    | 88%   | Specialist | Deep focus + precision builds correctly        |
| Scout       | Jane     | 82%   | Captain    | High dominance drives intake momentum          |
| Publisher   | Jane     | 91%   | Captain    | Decision authority ships without hesitation    |

**Step 3:** "Assign roles and customize permissions if needed."

### Key Principles

- PI assessment is **never required**. Roles work without it.
- Fit scores are **visible but advisory**. Admin can override.
- UX preferences come from **PI profile**, not role. Two Verifiers with different PI profiles see different interfaces.
- Users with no assessment show as "Not assessed — assign any role."

---

## 5. Privacy Architecture — The Airlock Covenant

### Three Privacy Zones

#### Zone 1: System Space (Auditable, Transparent, Shared)

Everything tracked in the audit log:

- Role assignments and permission changes
- Vault mutations (create, edit, archive)
- Gate transitions (pass, fail, override)
- Feature flag toggles
- Extraction events and patch workflows
- PI assessment assignments
- Calibration threshold changes
- Vault comments, @mentions, and thread discussions (part of the work record)

#### Zone 2: Social Space (Visible, Not Auditable)

Presence and participation visible to peers but NEVER reported to admins as analytics:

- Who's online (real-time presence)
- Vibe Room participation (who's in the room right now)
- Activity feed (comments, reactions)

What is NEVER tracked:

- "Active time" or mouse movement
- Screen time per module
- "Idle" vs "active" status history
- Keystrokes, clicks, or productivity metrics

#### Zone 3: Private Space (Encrypted, Inaccessible, Sacred)

The platform CANNOT access this data, even with admin credentials:

- Direct messages between users
- Vibe Room audio/video/chat content
- Personal notes and drafts (before submission)

Technical enforcement:

- DMs use end-to-end encryption (E2EE)
- Vibe Room streams are ephemeral (no server-side storage)
- No transcription API is called for Vibe Rooms
- Personal drafts exist only in client state until explicitly submitted

Admin CANNOT: read DMs, export DM history, see who messaged whom (only that DMs exist as a feature), replay Vibe Room sessions, access draft content before submission.

---

## 6. DM Slash Commands — Actions Without Context

Slash commands in DMs trigger system actions without exposing conversation context.

**Principle: The action is public, the context is private.**

```
DM between Jane & Tom:
  Jane: "Can we sync on the Acme deal tomorrow?"
  Tom: /meeting "Acme Deal Sync" @jane tomorrow 2pm

  → System creates calendar event:
      Title: "Acme Deal Sync"
      Attendees: Tom, Jane
      Source: "slash_command" (NOT "dm")

  Tom: /task "Review clause 4.2" vault:acme-dist

  → System creates task:
      Title: "Review clause 4.2"
      Vault: acme-dist
      Source: "slash_command"
```

**Technical approach:**

- Slash commands parsed **client-side** before message encryption
- Command payload sent as **separate API request** — not part of DM stream
- API creates the artifact with `source: "slash_command"` — no DM reference
- Audit log shows: "Meeting created by Tom" — not "from a DM with Jane"

**Available slash commands:**

- `/meeting` — create calendar event
- `/task` — create task in Tasks module
- `/remind` — set personal reminder
- `/note` — save to personal notes (Zone 3)
- `/share` — share vault link (generates preview card)

---

## 7. Vibe Rooms

Ephemeral, casual co-working spaces. Discord voice channel meets Spotify listening party.

| Property      | Formal Meeting     | Vibe Room                             |
| ------------- | ------------------ | ------------------------------------- |
| Purpose       | Agenda, decisions  | Casual co-working, standups           |
| Transcription | Yes (opt-in)       | **Never**                             |
| Action items  | AI-extracted       | None                                  |
| Recording     | Optional           | **Impossible**                        |
| Music         | No                 | Spotify API integration               |
| Screen share  | Yes                | Yes                                   |
| Persistence   | Full record saved  | Ephemeral — gone when empty           |
| Visibility    | Calendar invite    | Appears in module sidebar when active |
| AI presence   | Summarize, extract | Assist but **never capture**          |

Vibe Rooms appear in the module sidebar when active and disappear when empty. They can be created per-module or per-vault. Users can set themselves as "available" and others can join. Think standup-as-a-room, not standup-as-a-meeting.

---

## 8. Social Graph (Admin Analytics)

An admin-only intelligence tool for team composition and collaboration patterns — built exclusively from Zone 1 (System Space) data.

### What Admins See

**Team Composition View:**

- Archetype distribution per module/team (Interpreter/Driver/Enforcer balance)
- Chamber coverage gaps ("Ship chamber has only 1 person assigned")
- Role fit recommendations ("Jane is a Captain — 91% Publisher fit")
- Cross-module collaboration patterns ("These 3 people work across Contracts and CRM")
- Team size trends over time

**Gap Detection:**

- Modules with unbalanced archetype distribution
- Chambers with too few assigned roles
- Users with no PI assessment (can't optimize placement)

### What Admins Cannot See

- Individual activity metrics (hours, clicks, messages sent)
- Private communication patterns (who DMed whom)
- Vibe Room attendance history
- Individual productivity scores
- Any Zone 2 or Zone 3 data

### Data Sources (Zone 1 Only)

- Vault membership (who's assigned where)
- Role assignments (who holds which roles)
- Gate transitions (who approved what — already in audit log)
- PI assessment data (archetype, fit scores)

---

## 9. Evolution from Phase 1

### Stays As-Is

- `pi_constants.py` — 17 PI profiles, 3 meta-archetypes, scoring matrix
- `pi_ux_preferences.py` — UX defaults per profile
- `pi_assessment` model + migration — stores user PI data
- `PIProfileBadge` component — displays in MembersTable

### Evolves

- Scoring matrix expands to map PI profiles → role templates (not just agentic roles)
- `compute_assessment_recommendation()` returns fit scores against role templates
- Mock data expands to cover all demo users with role template assignments

### New (Phase 2+)

| Component                    | Description                                             |
| ---------------------------- | ------------------------------------------------------- |
| `roles` table                | Role templates with permission + archetype metadata     |
| Permission catalog           | Codified list of 40+ grantable permissions              |
| `user_roles` table           | Junction: user × role × scope (org/module/vault)        |
| `permission_overrides` table | Per-user vault-level grants/denies with optional expiry |
| Onboarding wizard            | Guided role assignment flow with PI recommendations     |
| Roles admin panel            | Create, edit, reorder, clone role templates             |
| Team composition view        | Archetype distribution, chamber gaps, recommendations   |
| DM infrastructure            | E2EE messaging with slash command parsing               |
| Vibe Room infrastructure     | Ephemeral WebRTC rooms with Spotify integration         |

### Concept Relationships

```
PI Profile (17) ──→ Meta-Archetype (3) ──→ Chamber Affinity
       │                                          │
       ├──→ Agentic Role (16)              Role Template (20+)
       │    (cognitive function tag)       (permissions + archetype)
       │                                          │
       └──→ UX Preferences                       ↓
            (interface adaptation)         Permission Scope
                                          (Org → Module → Vault)
```

The 16 agentic roles become tags on role templates. A "Verifier" template has `agentic_role: "verifier"` and `archetype_tag: "enforcer"`. The PI scoring matrix computes fit against the role template's archetype.

---

## 10. Implementation Phases

### Phase 2a: Role Templates + Permission Engine

- Role template data model and seed data
- Permission catalog constants
- Permission computation engine (additive, deny-wins, ceiling)
- Role assignment CRUD (user × role × scope)
- Vault-level override model
- Roles admin panel UI (create, edit, reorder, clone)
- Expand scoring matrix for role template fit

### Phase 2b: Onboarding + Recommendations

- Onboarding wizard component
- PI-to-role recommendation API
- Team composition analytics (admin view)
- Gap detection engine
- MembersTable evolution (show assigned roles, fit scores)

### Phase 3: Privacy Infrastructure

- E2EE DM architecture
- Slash command parser (client-side)
- Slash command API endpoints (/meeting, /task, /remind, /note, /share)
- Privacy zone enforcement middleware

### Phase 4: Social Features

- Vibe Room WebRTC infrastructure
- Spotify API integration
- Ephemeral room lifecycle (create on join, destroy on empty)
- Module sidebar presence indicators
- Social graph admin analytics dashboard
