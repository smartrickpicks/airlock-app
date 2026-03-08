# Airlock Onboarding & Workspace Setup Guide

> **Audience:** Operations/implementation teams and org admins setting up Airlock for their organization.
> **Goal:** Zero-to-production in under 2 hours. This guide walks through every phase of workspace provisioning, team setup, integration configuration, and go-live activation.
> **Last Updated:** 2026-03-07

---

## Table of Contents

1. [Onboarding Philosophy](#1-onboarding-philosophy)
2. [Entry Points](#2-entry-points)
3. [Phase 0: Pre-Onboarding](#3-phase-0-pre-onboarding)
4. [Phase 1: Admin Login & Workspace Configuration](#4-phase-1-admin-login--workspace-configuration)
5. [Phase 2: Integration Setup](#5-phase-2-integration-setup)
6. [Phase 3: Team Setup](#6-phase-3-team-setup)
7. [Phase 4: Data Mapping](#7-phase-4-data-mapping)
8. [Phase 5: Testing & Validation](#8-phase-5-testing--validation)
9. [Phase 6: Go-Live](#9-phase-6-go-live)
10. [Admin Settings Reference](#10-admin-settings-reference)
11. [Clean Workspace Mode](#11-clean-workspace-mode)
12. [Current Implementation Status](#12-current-implementation-status)

---

## 1. Onboarding Philosophy

Airlock is an enterprise data operations platform with a Discord-like interface built for contract lifecycle management. The platform is organized around five Modules (Contracts, CRM, Tasks, Calendar, Documents), each containing Vaults (workflow instances) that progress through a four-Chamber lifecycle: Discover, Build, Review, Ship.

The onboarding system is designed around three core principles:

### Zero-to-Production in Under 2 Hours

The entire onboarding flow --- from first login to a fully configured, testable, production-ready workspace --- targets 133 minutes of stakeholder active time plus approximately 4.5 minutes of automated provisioning. Every step is designed to minimize decision fatigue while giving admins full control.

| Phase                                | Stakeholder Time | Automated Time |
| ------------------------------------ | ---------------- | -------------- |
| Pre-Onboarding (tenant provisioning) | 0 min            | 0.5 min        |
| Admin Login & Workspace Config       | 13 min           | 2 min          |
| Team Configuration & Roles           | 22 min           | 1 min          |
| Data Mapping & Tool Config           | 23 min           | 0 min          |
| UI Configuration                     | 15 min           | 0 min          |
| Testing & Validation                 | 32 min           | 0 min          |
| Production Activation                | 28 min           | 1 min          |
| **Total**                            | **133 min**      | **4.5 min**    |

### Progressive Complexity

Airlock reveals features gradually based on usage rather than overwhelming new users with the full surface area. This is controlled client-side via an `onboarding_phase` flag in user preferences --- not server-enforced feature gating. All features remain accessible via the Cmd+K command palette or direct URL at any time.

| Phase   | What Is Visible                                  | What Is Hidden                                        | Reveal Trigger            |
| ------- | ------------------------------------------------ | ----------------------------------------------------- | ------------------------- |
| Day 1   | Home, one module, triage, basic vault view       | Multi-module nav, command palette, keyboard shortcuts | Default                   |
| Week 1  | All enabled modules, full triage, vault Triptych | Advanced filters, bulk ops, calibration               | User visits 10+ vaults    |
| Week 2+ | Everything                                       | Nothing                                               | Full unlock after 2 weeks |

### Freemium Model: Free Shell + Paid Engine

Airlock separates the free self-hosted shell from paid hosted engines:

**Free Shell (Self-Hosted):**

- Next.js/React frontend with reusable component library
- Generic primitives: lists, boards, timelines, detail panels, TipTap document editor
- Local-only compute for basic functions
- UI driven by MCP context server responses

**Paid Engine (Hosted):**

- Multi-tenant MCP context server (org settings, roles, layouts, permissions)
- Domain MCP servers: contracts, CRM, communications, calendar, knowledge
- AI orchestration, vector indexing, automation pipelines
- Heavy compute, compliance audit trails, advanced extraction engines

**Configuration as Code:**

- JSON-based canonical journeys, lifecycles, and semantics
- Stored in org-scoped MCP context server as resources
- Versioned, auditable, and extensible by developers

---

## 2. Entry Points

There are three paths into Airlock. Each path leads to the same workspace setup wizard but starts from a different context.

| Entry Point             | Action                                                             | Technical Flow                                                |
| ----------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------- |
| **Website CTA**         | Stakeholder clicks "Start Your Workspace" on the marketing site    | Provision tenant, seed MCP config, redirect to admin login    |
| **Sales Demo**          | Sales team pre-configures a workspace for the prospect             | Pre-configure integrations, invite stakeholder as Owner       |
| **Developer Self-Host** | Developer deploys the open-source shell and connects to the engine | Deploy Next.js app, configure MCP host endpoint, authenticate |

In the current implementation, the login page (`/login`) presents these options:

1. **Sign in with Google** --- production OAuth flow. Sends the Google ID token to `POST /api/v1/auth/google/verify`, which verifies it, creates or retrieves the user record, and returns a JWT pair plus user info.
2. **Dev Login** (development only) --- bypasses authentication, sets `workspaceMode` to `"demo"`, loads mock data for all modules, and redirects to the Home page.
3. **Create Workspace** (development only) --- bypasses authentication, sets `workspaceMode` to `"clean"`, and redirects to the setup wizard at `/onboarding/setup`. No mock data is loaded.

---

## 3. Phase 0: Pre-Onboarding

Phase 0 is fully automated and happens before the stakeholder touches the product. It takes approximately 30 seconds.

### Step 0.1: Tenant Creation

When a stakeholder initiates workspace creation, the system:

1. Generates an `org_id` (ULID).
2. Creates a database row in the `workspaces` table: `workspaces(id, name, plan, created_at)`.
3. Provisions a config storage bucket for the org.

### Step 0.2: MCP Context Server Bootstrap

The system deploys a logical MCP context server instance bound to the `org_id` (multi-tenant deployment) and seeds it with default JSON configurations:

- **journeys.json** --- Default lifecycle workflows (Contract Lifecycle: Draft > Review > Legal Approval > Signature > Active > Renewal; Deal Pipeline: Lead > Qualified > Proposal > Negotiation > Closed; Task Flow: Backlog > In Progress > Review > Done).
- **roles.json** --- Default role definitions (Owner, Admin, Manager, Member, Guest) with granular permission matrices.
- **layouts.json** --- Default UI layouts (sidebar, board view, detail panel configurations).
- **permissions.json** --- Role-to-tool permission matrix controlling which MCP tools each role can invoke.

These configs are exposed as MCP resources at URIs like `org://{org_id}/journeys` and `org://{org_id}/roles`.

### Step 0.3: Admin Account Setup

1. Create the first user record with role `org_owner` and status `active`.
2. Generate an SSO invite link or temporary password.
3. Send the welcome email: "Welcome to Airlock -- Complete Setup."

---

## 4. Phase 1: Admin Login & Workspace Configuration

**Estimated time:** 13 minutes of stakeholder active time.

### Step 1.1: Admin Authentication

The admin clicks the invite link and is presented with the login screen.

**Google SSO Flow:**

1. Click "Sign in with Google" on the login page.
2. Complete the Google OAuth consent flow.
3. The frontend sends the Google credential to `POST /api/v1/auth/google/verify`.
4. The API verifies the token, creates or retrieves the user in the database (with `workspace_id` and `org_role`), and returns:
   - `access_token` (JWT)
   - `refresh_token` (JWT)
   - `user` object (id, email, display_name, avatar_url, org_role)
5. The frontend stores the tokens and hydrates the auth store.
6. The MCP context server resolves user permissions: `resolve_user_permissions(user_id, org_id)`.
7. The shell renders the welcome screen and setup wizard.

**Email Authentication Flow (Alternative):**

1. Verify invite token and create a session.
2. Prompt for password setup.
3. Continue to workspace configuration.

**Auth Configuration Endpoint:**
The frontend can call `GET /api/v1/auth/config` (no auth required) to determine whether Google OAuth is configured for the deployment. This returns `{ google_client_id: string, configured: boolean }`.

### Step 1.2: Onboarding Landing Page

After authentication, first-time users see the onboarding landing page at `/onboarding`. This page displays:

- A chamber color bar (Discover = red, Build = yellow, Review = purple, Ship = green) at the top.
- The hero headline: "Welcome to Airlock."
- A subtitle describing the platform: "The unified governance surface for contract lifecycle management."
- Three value proposition cards:
  - **One Operating Surface** --- Queue-first workspace where every signal, decision, and action lives in one place.
  - **Governance Built In** --- Four-chamber lifecycle so every record moves through structured gates.
  - **Proof Over Vibes** --- Evidence packs, structured patches, and audit trails.
- A primary CTA button: "Start Setup" (links to `/onboarding/setup`).
- A "Skip to Home" link for returning users.

### Step 1.3: Workspace Setup Wizard

The setup wizard at `/onboarding/setup` uses the `SetupWizard` template component and walks the admin through five steps. Progress is tracked via step indicator dots at the top, and the admin can navigate forward, backward, or skip optional steps.

#### Wizard Step 1 of 5: Create Workspace

**Screen:** Form with two fields.

| Field          | Type            | Example                                                                        |
| -------------- | --------------- | ------------------------------------------------------------------------------ |
| Workspace name | Text input      | "Acme Records"                                                                 |
| Industry       | Dropdown select | Music & Entertainment, Legal, Finance & Banking, Healthcare, Technology, Other |

The workspace name is persisted to localStorage immediately via the onboarding store. The admin cannot proceed without entering a workspace name (the Continue button is disabled when the field is empty).

**What This Creates:**

- A `workspaces` row in the database.
- Default `workspace_modules` entries (all 5 core modules enabled).
- The creator is assigned the Architect role.
- Default feature flags (all enabled).
- Default calibration values (factory defaults).

#### Wizard Step 2 of 5: Module Configuration

**Screen:** A list of five toggleable module cards.

| Module    | Description                   | Default  |
| --------- | ----------------------------- | -------- |
| Contracts | Contract lifecycle management | Enabled  |
| CRM       | Customer relationships        | Enabled  |
| Tasks     | Work tracking                 | Enabled  |
| Calendar  | Scheduling                    | Disabled |
| Documents | Document library              | Disabled |

Each module card shows a checkbox, the module name, and a brief description. The admin clicks to toggle modules on or off. The instruction "You can always enable more later" is shown beneath the list.

#### Wizard Step 3 of 5: Invite Team (Skippable)

**Screen:** An email input row with role selector and an "Add" button.

The admin enters team member emails one at a time, assigns each a role from a dropdown, and clicks the plus button to add them to the invite list. Added invitees appear in a list below with their email, role badge, and a remove button.

**Available Roles:**

| Role       | Description                                                                |
| ---------- | -------------------------------------------------------------------------- |
| Builder    | Creates and edits data. Operates in Discover and Build chambers.           |
| Gatekeeper | Reviews and approves. Operates in the Review chamber. Cannot self-approve. |
| Owner      | Manages team and settings. Operates in the Ship chamber.                   |

A role guide section at the bottom of the screen provides brief definitions for each role.

This step can be skipped. The admin can invite team members later from the Workspace Admin overlay.

#### Wizard Step 4 of 5: Connect Data Source (Skippable)

**Screen:** Three data source option cards and a demo data toggle.

| Data Source  | Description              |
| ------------ | ------------------------ |
| Google Drive | Connect a folder of PDFs |
| Upload       | Upload files manually    |
| API          | Configure API ingest     |

Below the data source cards, there is a "Load demo data" checkbox with the description: "Pre-load sample accounts, contracts, and tasks to explore Airlock with realistic data."

When the demo data option is selected, the setup wizard completion handler seeds a demo inbound contract intake record (using `createDemoInboundContractIntake`) with sample data. When demo data is not selected, the workspace starts empty and the admin is guided toward uploading their first real contract.

This step can be skipped entirely.

#### Wizard Step 5 of 5: Ready

**Screen:** A summary of what was configured, plus next steps.

The screen displays:

- A rocket icon in a green circle.
- "Your workspace is ready!" headline.
- Summary counts: modules enabled, team members invited, data source connected, and whether demo data was loaded.
- A "What's next" section with three numbered steps:
  1. Upload your first contract batch.
  2. Watch extraction + preflight run.
  3. Review results in Triage Board.
- A "Go to Workspace" button that completes the wizard.

**On Completion:**

- If the admin opted to load demo data, a demo contract intake is seeded and the `firstUploadDone` flag is set.
- The `create_workspace` admin checklist item is marked complete.
- The admin is redirected to the Home page (`/`).

---

## 5. Phase 2: Integration Setup

**Estimated time:** 8 minutes for Google Workspace + JIRA.

Integration setup can happen during the wizard (Step 4) or later in the Workspace Admin overlay under the Connectors section.

### Google Workspace Integration

**Prerequisites:** A Google Workspace admin account for the organization.

**Setup Flow:**

1. Navigate to Workspace Admin > Connectors (or select Google Drive during the setup wizard).
2. Click "Enable" next to Google Workspace.
3. Complete the OAuth consent screen flow with a Google admin account.
4. Grant the following scopes:
   - `https://www.googleapis.com/auth/admin.directory.user.readonly` (user directory)
   - `https://www.googleapis.com/auth/gmail.readonly` (email access)
   - `https://www.googleapis.com/auth/drive.readonly` (document access)
   - `https://www.googleapis.com/auth/calendar` (calendar sync)
5. On redirect, the MCP context server registers the Google Workspace MCP server for the org.
6. The system triggers an initial sync:
   - Fetches users from the Google Directory API.
   - Creates Airlock user records (role = member by default).
   - Maps Google Groups to Airlock Groups.
7. The UI displays sync status: "24 users imported, 3 groups mapped."

**Per-User OAuth:** Each user authenticates individually via Google SSO on their first login. Their personal OAuth tokens are stored securely and used for per-user Gmail, Drive, Calendar, and Meet access. Sync runs automatically on login and every 4 hours thereafter, with a manual trigger available from the admin dashboard.

### JIRA Integration

**Prerequisites:** Atlassian admin approval for the JIRA Cloud/Server instance.

**Setup Flow:**

1. Navigate to Workspace Admin > Connectors.
2. Click "Enable" next to JIRA Cloud.
3. Complete the Atlassian OAuth flow.
4. Select the JIRA instance (Cloud or Server).
5. Grant permissions: read users, read/write issues, read projects.
6. Map JIRA projects to Airlock workspaces:
   - The system auto-suggests mappings (e.g., "ACME-ENG" to "Engineering Workspace").
   - The admin confirms or adjusts mappings.
7. Start bi-directional sync:
   - Import open issues as Airlock tasks.
   - Map JIRA users to Airlock users (matched by email).
   - Subscribe to webhooks: `issue.created`, `issue.updated`.

### Optional CRM Connectors

Salesforce and other CRM connectors are available as premium features. They follow the same OAuth-based connection pattern and are configured from the Connectors section of Workspace Admin.

### Sync Status Dashboard

After integration setup, the admin can monitor sync health from the Workspace Admin dashboard:

- Connector status: green (active), amber (pending), red (error), gray (disabled).
- Per-connector sync log with success/failure counts.
- "Test Connection" button for manual connectivity checks.
- "Run Full Sync" button to force a re-sync.

---

## 6. Phase 3: Team Setup

**Estimated time:** 22 minutes.

### Step 3.1: User Import & Role Mapping

After Google Workspace integration, users imported from the directory appear in the Members section of Workspace Admin. The admin reviews each user and assigns their role.

**The Members Table shows:**

| Column      | Description                                                                                     |
| ----------- | ----------------------------------------------------------------------------------------------- |
| Avatar      | User profile image (from Google or Gravatar)                                                    |
| Name        | Display name                                                                                    |
| Email       | Email address                                                                                   |
| Role        | Dropdown: Builder, Gatekeeper, Owner (or the legacy names: Analyst, Verifier, Admin, Architect) |
| Last Active | Timestamp of last login                                                                         |
| Status      | Active, Invited, Deactivated                                                                    |
| Actions     | Edit, Remove                                                                                    |

**Role Hierarchy:**

| Level | Legacy Name | Airlock Name | Key Permissions                                                     |
| ----- | ----------- | ------------ | ------------------------------------------------------------------- |
| 0     | Analyst     | Builder      | View vaults, create triage items, create patches, use AI agent      |
| 1     | Verifier    | Gatekeeper   | All Builder + approve/reject patches, resolve triage, advance gates |
| 2     | Admin       | Owner        | All Gatekeeper + manage members, toggle features, calibrate, export |
| 3     | Architect   | Architect    | All Owner + schema changes, destructive operations, system config   |

**Bulk Role Assignment:**
Select a Google Group and assign a role to all its members in one action. Example: "Engineering Team" group gets "Builder" role and is added to the "Engineering" workspace.

**Enforcement Model:** Airlock uses a "hidden, not disabled" approach. If a user does not have permission for an action, the UI element does not render in their DOM. The server validates every request independently regardless of the UI state.

### Step 3.2: Module-Level Permissions

Beyond the org-level role, users can have module-specific roles. The five module roles are:

| Module Role | Description                                                       |
| ----------- | ----------------------------------------------------------------- |
| Builder     | Creates and assembles vault content (Discover + Build chambers)   |
| Gatekeeper  | Reviews and approves vault content (Review chamber)               |
| Owner       | Promotes and publishes vault content (Ship chamber)               |
| Designer    | Configures module templates, extraction rules, generation configs |
| Viewer      | Read-only access to vault data within authorized modules          |

Module roles are assigned per-user per-module from the Workspace Admin. A user might be a Builder in Contracts but a Viewer in CRM.

### Step 3.3: Workspace Creation & Vault Permissions

The admin creates workspaces (organizational contexts) and configures who can access them:

**Workspace Types:**

1. **Public Workspace** --- All org members can see and join.
2. **Private Workspace** --- Invite-only, hidden from directory.
3. **Department Workspace** --- Tied to Google Group membership.
4. **Deal Room** --- Auto-created per CRM deal, lifecycle-managed.

**Vault Membership Inheritance:** When a user is a member of a parent vault, they automatically inherit membership at all child vaults (with `inherited = true`). Direct role assignments override inherited roles.

---

## 7. Phase 4: Data Mapping

**Estimated time:** 23 minutes.

### Step 4.1: Schema Mapping

When external data sources (JIRA, Google Workspace, Salesforce) are connected, the admin maps external fields to Airlock's core entity types.

**Core Airlock Entity Types:**

| Type     | Description                                                            |
| -------- | ---------------------------------------------------------------------- |
| Company  | Organizations and accounts (stored as level-1 Parent Vaults)           |
| Contact  | People (stored as level-3 Counterparty Vaults or vault metadata)       |
| Deal     | Sales opportunities (stored as vault metadata or level-4 Item Vaults)  |
| Task     | Work items from JIRA, Asana, or native (stored as level-4 Item Vaults) |
| Artifact | Files and documents (stored as attachments or level-4 Item Vaults)     |
| Message  | Communications (stored as events in the Signal panel)                  |
| Event    | Calendar entries (computed from vault dates and task due dates)        |

**JIRA Field Mapping Example:**

The admin uses a mapping wizard that shows each JIRA field alongside a dropdown of Airlock target fields. Many fields are auto-mapped with high confidence:

| JIRA Field                          | Airlock Field                            | Status        |
| ----------------------------------- | ---------------------------------------- | ------------- |
| Summary                             | title                                    | Auto-mapped   |
| Description                         | description                              | Auto-mapped   |
| Assignee                            | assigned_to                              | Auto-mapped   |
| Status (To Do / In Progress / Done) | status (draft / in_progress / completed) | Review needed |
| Priority                            | priority                                 | Auto-mapped   |
| Story Points                        | custom.effort                            | Custom field  |

The admin reviews auto-mappings, adjusts any mismatches, and can open an "Advanced" panel for custom field mapping.

### Step 4.2: Vault Hierarchy Configuration

The vault hierarchy is the structural backbone of Airlock. It is also the CRM --- there are no separate CRM tables. The admin configures how their organization's data maps to the four-level vault tree.

**Vault Hierarchy:**

```
WORKSPACE (tenant boundary)
  +-- PARENT VAULT (Level 1: top-level entity, e.g., "Acme Inc")
  |     +-- DIVISION VAULT (Level 2: subsidiary, e.g., "Big Booty Inc")
  |     |     +-- COUNTERPARTY VAULT (Level 3: business relationship, e.g., "Sony Music")
  |     |     |     +-- ITEM VAULT (Level 4: contract, task, document)
  |     |     |     +-- ITEM VAULT
  |     |     +-- COUNTERPARTY VAULT
  |     +-- COUNTERPARTY VAULT (Level 3: direct, no division)
  |           +-- ITEM VAULT
  +-- PARENT VAULT
```

**Key Rules:**

- Only Level 4 Item Vaults progress through Chambers (Discover > Build > Review > Ship). Levels 1-3 are organizational and aggregate their children's status.
- Depth is flexible. Not every vault needs all 4 levels. A simple workspace might only have Parent > Item.
- The CRM Module is a filtered view over Levels 1-3 (Accounts = Level 1, Divisions = Level 2, Contacts = Level 3).
- Every vault has a `parent_vault_id` (nullable at Level 1). The tree is always explicit.

### Step 4.3: Chamber & Journey Configuration

The admin reviews and customizes the default lifecycle journeys. Airlock ships with three default journeys:

1. **Contract Lifecycle:** Draft > Review > Legal Approval > Signature > Active > Renewal
2. **Deal Pipeline:** Lead > Qualified > Proposal > Negotiation > Closed Won/Lost
3. **Task Flow:** Backlog > In Progress > Review > Done

These map to Airlock's four Chambers (Discover > Build > Review > Ship). Each Chamber contains one or more Views, and each transition between Chambers passes through a Gate that enforces quality requirements.

**Customization Options:**

- Add or remove stages within chambers.
- Define transition rules (e.g., "Review > Ship requires 2 approvals").
- Attach automation tools (e.g., "On entering Build, run OCR extraction engine").
- Set stage-specific permissions (e.g., "Only Legal team can act in the Review chamber").

### Step 4.4: Template Selection

The admin selects which document templates, extraction configs, and generation configs to enable for their workspace. This determines what contract types can be generated, what fields are extracted from uploaded documents, and what preflight checks run before a vault can pass through a gate.

---

## 8. Phase 5: Testing & Validation

**Estimated time:** 32 minutes.

### Step 5.1: Invite Test Users

Before rolling out to the full organization, invite 2-3 colleagues to test:

1. Click "Invite Users" in Workspace Admin > Members.
2. Enter test user emails (e.g., sarah@acme.com, mike@acme.com).
3. Assign role: Member (or Builder/Gatekeeper for specific testing).
4. Select workspaces they should join.
5. Optionally add a personal message.
6. Click "Send Invites."

Test users receive an email with a one-click setup link. When they click it:

1. Google SSO login (auto-provisioned from the earlier directory sync).
2. They land in their assigned workspace.
3. They see their synced JIRA tasks, Google Calendar events, and the AI assistant.
4. They can create test tasks (syncs to JIRA within seconds), upload files (appears in Google Drive), and explore the modules.

### Step 5.2: Golden Path Workflow Simulation

Run through the canonical contract approval workflow end-to-end:

1. Admin creates a new contract in the Contracts module.
2. Uploads a draft PDF. The OCR extraction engine runs automatically (via MCP contract engine).
3. AI detects clauses, highlights key terms, and populates fields.
4. Admin assigns the vault to a Gatekeeper for review.
5. Gatekeeper sees the vault in their Review Queue, opens the document.
6. Gatekeeper makes redline edits in the TipTap editor.
7. Gatekeeper approves. The vault transitions to the Ship chamber.
8. Owner sends for e-signature.
9. All parties receive notifications.
10. Contract moves to "Shipped" status and appears in CRM as a closed deal.

**Validation Checklist:**

- Each chamber transition logs an audit event.
- Permissions enforced: a Builder cannot skip to Ship without Gatekeeper approval.
- Data synced across integrations: JIRA updated, Drive folder organized, calendar event created.
- AI assistant available: "Would you like me to summarize changes?"

### Step 5.3: Edge Case Testing

Test boundary conditions:

- What happens when a required field is missing at a Gate?
- What happens when a Gatekeeper rejects a patch?
- What happens when entity resolution produces a low-confidence match?
- What happens when an uploaded document fails OCR extraction?

### Step 5.4: Performance & Sync Validation

Check the System Health dashboard in Workspace Admin:

| Metric                | Target                                               |
| --------------------- | ---------------------------------------------------- |
| Google Workspace sync | Users synced, events imported, last sync < 5 min ago |
| JIRA sync             | Tasks synced, projects mapped, last sync < 2 min ago |
| Active sessions       | Current online user count                            |
| MCP servers           | All connected (context, google, jira)                |
| Average response time | < 300ms                                              |

**Diagnostic Tools Available:**

- Test MCP connectivity.
- Validate OAuth tokens.
- Check permission conflicts.
- Simulate high load (10 concurrent users).

---

## 9. Phase 6: Go-Live

**Estimated time:** 28 minutes.

### Step 6.1: Review & Subscribe

Before activating production engines, the admin sees a summary screen:

- Total users configured
- Workspaces created
- Integrations connected
- Tasks synced
- Workflows configured
- Test validation results

**Plan Selection:**

| Feature                     | Free (14-Day Trial) | Premium                    |
| --------------------------- | ------------------- | -------------------------- |
| Users                       | Up to 25            | Unlimited ($15/user/month) |
| Storage                     | 5 GB                | Unlimited                  |
| AI queries                  | 100/day             | Unlimited                  |
| Contract OCR & extraction   | Not available       | Included                   |
| Clause detection            | Not available       | Included                   |
| Custom automation pipelines | Not available       | Included                   |
| Priority support            | Not available       | Included                   |

### Step 6.2: Production Engine Activation

When the admin upgrades, the following MCP domain servers come online:

- **Contract Engine** --- OCR, extraction, clause detection, generation.
- **Advanced CRM Engine** --- AI scoring, forecasting, entity resolution.
- **Automation Pipelines** --- Background jobs, webhooks, BullMQ queues.
- **Knowledge Engine** --- Vector indexing, semantic search via MeiliSearch.

AI query limits are removed, heavy compute is enabled, and the full tool registry is unlocked.

### Step 6.3: Phased Team Rollout

Recommended rollout strategy:

| Phase            | Audience                      | When                 |
| ---------------- | ----------------------------- | -------------------- |
| Pilot            | 2-3 test users (already done) | During testing       |
| Department leads | Managers (8-10 users)         | At go-live           |
| Full org         | All users                     | 1 week after go-live |

The admin can generate an announcement email from the Workspace Admin with a customizable template that includes invite links, getting-started instructions, and a link to the onboarding tutorial.

### Step 6.4: Monitoring Dashboard

Post-launch, the admin monitors adoption and system health:

**Stakeholder KPIs (measured after 30 days):**

| Metric                      | Target                           |
| --------------------------- | -------------------------------- |
| User adoption rate          | > 90% of invited users logged in |
| Daily active usage          | > 30 min/user average session    |
| Tool consolidation          | 3-5 external tools replaced      |
| Context switching reduction | 50% fewer tab switches           |
| Task throughput             | 25% increase in tasks/week       |
| New hire onboarding time    | < 30 min (down from 2-3 hours)   |

**Technical Health Metrics:**

| Metric                  | Target          |
| ----------------------- | --------------- |
| MCP server uptime       | > 99.9%         |
| Sync lag (JIRA, Google) | < 2 minutes p95 |
| API response time       | < 300ms p95     |
| Failed auth rate        | < 0.1%          |

### Step 6.5: Post-Launch Automation Configuration

After launch, the admin can set up advanced automations from Workspace Admin:

- **Contract Drift Detection:** Watch Google Drive for edits > trigger OCR diff > alert Legal team if clauses changed.
- **Deal Pipeline Automation:** When a deal moves to "Proposal" > auto-generate proposal doc > attach pricing > schedule follow-up meeting.
- **Sync Health Checks:** Every 4 hours, validate JIRA-to-Airlock task mapping > alert admin if sync lag exceeds 5 minutes.

---

## 10. Admin Settings Reference

Admin functionality in Airlock is an Overlay, not a Module. It sits above the module layer and does not follow the Chamber pattern. There are two separate admin surfaces.

### Workspace Admin (Admin/Architect Only)

Accessed via the gear icon in the Module Bar (visible only to Admin and Architect roles). Renders as a full-screen overlay with its own navigation sidebar. Route: `/admin/*`.

**Sections:**

#### Dashboard (Landing)

The admin's daily starting point showing system health at a glance.

| Widget               | Content                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------- |
| System Health Strip  | One card per feature: status dot (green/amber/red), last error, requests/min, avg latency |
| Active Users         | Online count, list of currently active users with role badges                             |
| Recent Admin Actions | Last 10 audit events from admin actions (flag toggles, role changes, calibration updates) |
| Module Status        | Enabled/disabled modules with vault counts                                                |
| Error Feed           | Real-time stream of failures across all features, severity-coded                          |

#### Members

User management for the workspace.

| Feature      | Description                                                 |
| ------------ | ----------------------------------------------------------- |
| User list    | Table: avatar, name, email, role badge, last active, status |
| Invite user  | Email invite with role pre-assignment                       |
| Edit role    | Dropdown: Builder > Gatekeeper > Owner > Architect          |
| Remove user  | Soft-remove with confirmation + audit event                 |
| Bulk actions | Multi-select: change role, deactivate, export list          |

Role changes emit audit events and take effect immediately.

#### Roles & Permissions

Manage the RBAC hierarchy. Permissions are enforced with the "hidden, not disabled" model --- if a user cannot perform an action, the UI element does not exist in their DOM. The server validates every request independently.

#### Feature Flags

Toggle grid for every managed feature, grouped by category (Extractors, AI, Integrations, Export).

| Feature             | Description                                          |
| ------------------- | ---------------------------------------------------- |
| Flag grid           | Each row: flag name, toggle, rollout %, status dot   |
| Toggle              | Instant flip via HTTP PATCH. No restart required.    |
| Rollout %           | Slider: 0-100% gradual deployment                    |
| Workspace overrides | Per-workspace enable/disable with reason text        |
| Circuit breaker     | Shows if/when a flag was auto-disabled due to errors |

#### Calibration

Threshold and weight management for the engine layer.

| Feature                | Description                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------- |
| Parameter groups       | By feature: Extractors, Preflight, Identity Resolver, Health Scoring, Batch Processing |
| Slider + numeric input | Each parameter with min/max/step                                                       |
| Context descriptions   | Plain-English impact: "What happens if I raise this? What happens if I lower it?"      |
| Last calibrated        | Timestamp + actor name below each parameter                                            |
| Reset to default       | One-click restore to factory defaults                                                  |

#### Modules

| Feature       | Description                                                        |
| ------------- | ------------------------------------------------------------------ |
| Module list   | All 5 modules with enable/disable toggle                           |
| Sort order    | Drag-reorder to control Module Bar icon order                      |
| Module config | Per-module settings (e.g., default grouping, pipeline stage names) |
| Module health | Vault counts per chamber, active user count per module             |

#### Connectors

| Feature         | Description                                                           |
| --------------- | --------------------------------------------------------------------- |
| Connector list  | Configured integrations: Google Drive, Salesforce, Slack, JIRA        |
| Add connector   | OAuth flow or API key configuration                                   |
| Status          | Health: active (green), error (red), pending (amber), disabled (gray) |
| Sync log        | Per-connector history with success/failure counts                     |
| Test connection | Manual connectivity test button                                       |

#### Audit Log

| Feature      | Description                                               |
| ------------ | --------------------------------------------------------- |
| Event stream | All audit events, most recent first                       |
| Filters      | By: feature, user, event type, date range, severity       |
| Event detail | Expandable: full payload, before/after state, timing data |
| Export       | Download as CSV or JSON                                   |

Event types logged: `flag.toggled`, `calibration.changed`, `member.role_changed`, `module.enabled`, `connector.sync_completed`, `lifecycle.transition`, `patch.applied`, `export.completed`.

#### System Health

| Feature            | Description                                                          |
| ------------------ | -------------------------------------------------------------------- |
| Health strip       | Per-feature card: status, last error, throughput, latency            |
| Pipeline dashboard | Live pipeline: queued > downloading > extracting > preflight > ready |
| Error rate charts  | Per-feature error rate over time (sparkline)                         |
| Queue depths       | BullMQ queues: pending, active, completed, failed                    |
| Uptime             | Per-service: API, WebSocket, Database, Redis                         |

### Personal Settings (All Users)

Accessed by clicking the user avatar at the bottom of the Module Bar. Renders as a centered modal overlay. Route: `/settings/*`.

**Sections:**

#### Profile

| Field        | Editable  | Notes                     |
| ------------ | --------- | ------------------------- |
| Display name | Yes       |                           |
| Email        | Read-only | Set by auth provider      |
| Avatar       | Yes       | Upload or Gravatar        |
| Role         | Read-only | Assigned by admin         |
| Timezone     | Yes       | Used for SLA calculations |

#### Notifications

Per-user preferences backed by the notification system.

| Setting               | Options                                                 |
| --------------------- | ------------------------------------------------------- |
| Priority filter       | Which priorities: Urgent, Action, Info, AI (checkboxes) |
| Per-module toggle     | Enable/disable notifications per module                 |
| Vault muting          | List of muted vaults                                    |
| Email digest (future) | Daily / Weekly / Off                                    |
| Push (future)         | On / Off                                                |

#### Appearance

| Setting        | Options                                           |
| -------------- | ------------------------------------------------- |
| Theme          | Base / Airlock Dark (OLED)                        |
| Sidebar width  | Compact (200px) / Standard (240px) / Wide (280px) |
| Font size      | Small / Medium / Large                            |
| Reduced motion | On / Off                                          |
| High contrast  | On / Off                                          |

#### Keybindings

| Default | Action                                               |
| ------- | ---------------------------------------------------- |
| Cmd+1-4 | Triptych states: Overview / Inspect / Edit / Approve |
| Cmd+K   | Search / command palette                             |
| Cmd+E   | Toggle heatmap mode                                  |
| Escape  | Close overlay / return to default                    |

#### Connected Accounts

OAuth connections for external services (Google, Salesforce, Slack, etc.). Per-user OAuth 2.1 tokens for Gmail, Drive, Calendar, and Meet.

---

## 11. Clean Workspace Mode

Clean Workspace Mode provides a true zero-data starting point for testing and development. It was introduced to solve the problem of every Zustand store falling back to `MOCK_*` constants when the API is not running, making it impossible to test the real data flow.

### How It Works

The system uses a persisted `workspaceMode` flag with two values:

- **`"demo"`** --- Standard behavior. When the API is unavailable, stores fall back to mock data constants (`MOCK_VAULTS`, `MOCK_CRM_ACCOUNTS`, `MOCK_TASKS`, etc.).
- **`"clean"`** --- Clean slate. When the API is unavailable, stores return empty arrays. No mock data is loaded. Upload buttons connect to the real API. Errors are surfaced rather than masked.

The flag is stored in `localStorage` as `airlock_workspace_mode` and is readable by all stores via `getWorkspaceMode()`.

### Activating Clean Workspace Mode

1. Navigate to `/login`.
2. Click "Create Workspace" (visible in development mode).
3. The onboarding store sets `workspaceMode` to `"clean"`.
4. The auth store is hydrated with a clean dev user (id: `clean_user_001`, role: `executive`).
5. The user is redirected to `/onboarding/setup` to complete the workspace wizard.

### What Changes in Clean Mode

**Stores affected (7 total):**

| Store              | Demo Mode Behavior                              | Clean Mode Behavior                                |
| ------------------ | ----------------------------------------------- | -------------------------------------------------- |
| vault.store        | Falls back to `MOCK_VAULTS`                     | Returns empty `vaults: []`                         |
| crm.store          | Falls back to `MOCK_CRM_ACCOUNTS/DEALS/LEADS`   | Returns empty `accounts: [], deals: [], leads: []` |
| tasks.store        | Falls back to `MOCK_TASKS`                      | Returns empty `tasks: []`                          |
| documents.store    | Falls back to `MOCK_DOCUMENTS`                  | Returns empty `documents: []`                      |
| calendar.store     | Falls back to `MOCK_CALENDAR_EVENTS`            | Returns empty `events: []`                         |
| notification.store | Directly loads `MOCK_NOTIFICATIONS`             | Returns empty `notifications: []`                  |
| review-queue.store | Falls back to `MOCK_PARENT_VAULTS/SIGNALS/FEED` | Returns empty for all fields                       |

**Home page:** In clean mode, the operator hub (mock signals, queue, feed) is hidden. Instead, minimal empty-state messages are shown: "No signals yet. Upload a contract to get started."

**Intake store:** In clean mode, if the upload API call fails, the actual error is surfaced: "Upload failed. Make sure the API server is running." In demo mode, a mock document is simulated locally.

### The Guided Zero-to-One Flow

After completing the setup wizard in clean mode:

1. Home page shows the `FirstUploadView` --- a prominent "Upload a Contract PDF" CTA that links to `/contracts/intake`.
2. No mock signals, operator queue, or notifications appear.
3. The intake lab accepts a real PDF upload via `POST /api/v1/documents/upload` > parses > runs preflight > extracts data.
4. The user names the vault > `POST /api/v1/vaults` > the vault is created and the user is redirected to the vault detail view.
5. Guided onboarding ends at vault creation. The user explores freely from there.

### Reset Workspace

The admin can reset all client-side workspace data from two locations:

**Logout Button (Module Bar):**

- Clears auth state, localStorage auth keys, and the access token cookie.
- Redirects to `/login`.

**Reset Workspace Button (Admin Overlay > Developer Tools):**

- Clears all `airlock_*` localStorage keys.
- Clears the auth cookie.
- Performs a hard refresh to clear all Zustand stores.
- Redirects to `/login`.

This is a client-side reset only. No server-side data is deleted. This is intentional for iterative development and testing.

### Prerequisites for Clean Mode

For the full intake pipeline to work in clean mode, the real API must be running:

```bash
# Start infrastructure
docker compose up -d postgres redis

# Start the API server
cd apps/api && uvicorn src.main:app --reload

# Start the web dev server (in another terminal)
pnpm dev
```

The document upload, preflight, and extraction endpoints must be operational. Vault creation from a parsed document must work.

---

## 12. Current Implementation Status

This section documents what is built today versus what is planned for future milestones.

### Built and Functional

| Feature                                                                                                      | Status  | Key Files                                           |
| ------------------------------------------------------------------------------------------------------------ | ------- | --------------------------------------------------- |
| **Login page** with Google SSO, Dev Login, and Create Workspace paths                                        | Built   | `apps/web/src/app/login/page.tsx`                   |
| **Onboarding landing page** with value props and chamber color bar                                           | Built   | `apps/web/src/app/onboarding/page.tsx`              |
| **5-step setup wizard** (Create Workspace, Module Config, Invite Team, Connect Data, Ready)                  | Built   | `apps/web/src/components/templates/SetupWizard.tsx` |
| **Onboarding store** with workspace mode, wizard state, checklists, localStorage persistence                 | Built   | `apps/web/src/stores/onboarding.store.ts`           |
| **Mock onboarding data** with types, wizard steps, role definitions, module/industry/data source options     | Built   | `apps/web/src/lib/mock-onboarding.ts`               |
| **Clean workspace mode** --- `workspaceMode` flag controlling mock data fallback across 7 stores             | Built   | All `*.store.ts` files                              |
| **Middleware** --- auth check via `airlock_access_token` cookie, public paths for `/login` and `/onboarding` | Built   | `apps/web/src/middleware.ts`                        |
| **Auth API** --- Google OAuth verify, JWT refresh, dev login, auth config endpoints                          | Built   | `apps/api/src/routes/auth.py`                       |
| **Logout button** in Module Bar                                                                              | Built   | `apps/web/src/components/organisms/ModuleBar.tsx`   |
| **Reset Workspace** in admin overlay                                                                         | Built   | Admin page (developer tools section)                |
| **User onboarding checklist** (7 items tracked client-side)                                                  | Built   | `apps/web/src/lib/mock-onboarding.ts`               |
| **Admin onboarding checklist** (8 items tracked client-side)                                                 | Built   | `apps/web/src/lib/mock-onboarding.ts`               |
| **Progressive complexity phases** (day1, week1, week2plus)                                                   | Defined | Onboarding spec; client-side flag in store          |
| **Welcome slides by role** (Builder, Gatekeeper, Owner)                                                      | Defined | `apps/web/src/lib/mock-onboarding.ts`               |

### Planned but Not Yet Implemented

| Feature                                                                                        | Target Milestone | Notes                                                               |
| ---------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------- |
| **Google Workspace integration** (directory sync, Drive mounting, Calendar sync)               | Future           | OAuth flow spec'd; MCP server integration not yet wired             |
| **JIRA integration** (bi-directional task sync, project mapping)                               | Future           | OAuth flow spec'd; webhook subscription not yet built               |
| **Salesforce connector**                                                                       | Future           | Premium feature; planned for post-launch                            |
| **Schema mapping wizard** (JIRA fields to Airlock fields)                                      | Future           | UI wireframes in onboarding flow doc                                |
| **Journey editor** (visual stage customization)                                                | Future           | Depends on Workflow Engine milestone                                |
| **Real user invitations** (email delivery, invite link generation)                             | Future           | Currently client-side only; no email sending                        |
| **Production tenant provisioning** (automated database + MCP bootstrap)                        | Future           | Spec'd in Phase 0; not yet automated                                |
| **Billing & plan selection** (Stripe integration, premium activation)                          | Future           | Spec'd in Phase 6                                                   |
| **Welcome modal with role-specific slides**                                                    | Future           | Slide content defined; modal not yet wired to first-login detection |
| **Contextual tooltips** (first-time hints on UI elements)                                      | Future           | Tooltip content defined; rendering logic not built                  |
| **Onboarding checklist Home widget** (auto-completing as user performs actions)                | Future           | Checklist data defined; widget rendering not built                  |
| **Admin onboarding checklist in Workspace Admin**                                              | Future           | Checklist data defined; admin overlay widget not built              |
| **Re-onboarding modal** (What's New for returning users after 30+ days)                        | Future           | Spec'd; not implemented                                             |
| **MCP Engine Marketplace**                                                                     | Future (Phase 7) | Vision for community-built engines; long-term roadmap               |
| **Template Compiler** (admin tool for auto-generating extraction configs from document corpus) | Future           | Brainstorm status                                                   |
| **Custom roles** (Discord-style unlimited custom roles with granular permissions)              | Future           | Brainstorm status                                                   |

### Demo Data Behavior

The current implementation uses a mock-first strategy. All frontend milestones use mock data from `apps/web/src/lib/mock-*.ts` files with typed exports. The pattern is:

1. Store makes an `apiFetch` call in a `try` block.
2. On failure (API not running), the `catch` block checks `workspaceMode`:
   - `"demo"` --- falls back to `MOCK_*` constants.
   - `"clean"` --- returns empty arrays.
3. Real API endpoints and engine ports come in the final milestone (M25: OrcestrateOS Engine Port).

This means that for demo and evaluation purposes, the platform is fully usable with mock data. For production deployments, the real API must be running.

---

## Appendix: Canonical Vocabulary Quick Reference

When working with Airlock, always use these terms:

| Concept                       | Correct Term      | Do NOT Use                         |
| ----------------------------- | ----------------- | ---------------------------------- |
| Top-level functional domain   | **Module**        | server, workspace, app, area       |
| Workflow instance             | **Vault**         | channel, workstream, room, ticket  |
| Lifecycle stage               | **Chamber**       | phase, step, stage, status         |
| Chamber checkpoint            | **Gate**          | checkpoint, milestone, barrier     |
| Screen within a chamber       | **View**          | page, panel, screen, tab           |
| Three-panel layout            | **Triptych**      | layout, split, panels, columns     |
| Left panel (event feed)       | **Signal**        | feed, events, sidebar, timeline    |
| Center panel (workspace)      | **Orchestrate**   | main, workspace, content, editor   |
| Right panel (context)         | **Control**       | context, sidebar, info, details    |
| Admin interface               | **Overlay**       | admin module, settings module      |
| Proposed data change          | **Patch**         | edit, change, update, modification |
| Recently accessed vaults list | **Active Vaults** | recent channels, favorites         |

---

## Appendix: Onboarding Checklist Reference

### User Checklist (7 Items)

Tracked client-side in localStorage. Auto-completes as the user performs actions. Dismissable. Shows on the Home page as a widget.

1. Log in to Airlock
2. View your Home page
3. Open the Contracts module
4. View a vault in the Record Inspector
5. Submit your first patch
6. Use Cmd+K to search
7. Customize your Home page

### Admin Checklist (8 Items)

Shows in the Workspace Admin overlay. Tracks workspace setup progress.

1. Create workspace
2. Enable modules
3. Invite team members
4. Connect data source
5. Upload first batch
6. Configure feature flags
7. Set calibration thresholds
8. Review first batch results
