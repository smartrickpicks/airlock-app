# Turnkey Onboarding Flow — Zero to Production

> **Status:** SPECCED
> **Extends:** `docs/specs/onboarding/overview.md` — this spec adds the full enterprise provisioning flow. It does NOT replace or redefine the 5-step workspace setup wizard defined in the overview.
> **Depends on:** Platform Architecture (`docs/specs/platform/overview.md`), Admin spec, MCP Registry Design
> **Source research:** `docs/research/onboarding-flow.md`
> **Target:** Stakeholder goes from "Start Your Workspace" → production-ready in <2 hours
>
> **Vocabulary note:** This spec uses "Step 0–7" for onboarding milestones. These are NOT Airlock Chambers (Discover/Build/Review/Ship). See `CLAUDE.md` for canonical vocabulary.

---

## Overview

Seven steps take a stakeholder from zero to production. Each step maps to existing Airlock admin UI sections, extended with onboarding wizard logic.

```
Step 0: Provision    (automated, <30s)
Step 1: Login+Config (13 min — auth, branding, integrations)
Step 2: Team         (22 min — user import, role mapping, workspaces)
Step 3: Data Mapping  (23 min — schema mapping, journey/chamber config)
Step 4: UI Config     (15 min — view selection, triptych layout, permissions)
Step 5: Testing       (32 min — invite test users, workflow simulation)
Step 6: Activation    (28 min — upgrade, rollout, automation)
Step 7: Extension     (ongoing — marketplace engines, custom skills)
```

---

## Step 0: Provisioning (Automated)

**Trigger:** "Start Your Workspace" CTA or sales-initiated invite

**What happens (no stakeholder input required):**

1. Generate `workspace_id` (ULID)
2. Create DB row: `workspaces(id, name, slug, tier='free', subscription_status='trial', trial_ends_at=NOW()+14d)`
3. Bootstrap MCP context server for this workspace:
   - Seed `roles.json` with default 5 roles (Owner, Admin, Manager, Member, Guest)
   - Seed `journeys.json` with default lifecycles (mapped to Airlock chambers)
   - Seed `layouts.json` with default triptych configs
   - Seed `permissions.json` with conservative role × tool matrix
4. Create admin user: `role=executive, module_roles=[owner]`
5. Send welcome email with SSO link

**MCP resources created:**

```
org://{ws_id}/config      → { name: "New Workspace", tier: "free" }
org://{ws_id}/roles       → [owner, admin, manager, member, guest]
org://{ws_id}/journeys    → [contract-lifecycle, deal-pipeline, task-flow]
org://{ws_id}/layouts     → [default-triptych]
org://{ws_id}/permissions → [conservative-defaults]
```

**Maps to existing code:** `apps/api/src/models/workspace.py` (extend with tier fields)

---

## Step 1: Initial Login & Configuration

### Step 1.1: Authentication

**Admin clicks invite link → G Suite SSO or email auth**

Maps to: existing `apps/api/src/routes/auth.py` (Google OAuth flow)

After auth, MCP context server resolves session:

```
resolve_session(user_id, workspace_id) → {
  roles: ["executive"],
  layout: "onboarding_wizard",  ← special layout for first-time admin
  onboarding_step: 0
}
```

Shell renders: **Onboarding Wizard** (full-screen overlay, NOT the normal module layout)

### Step 1.2: Workspace Branding

**Admin screen: Overlay > Profile section (extends existing `ProfileSettings.tsx`)**

Fields:

- Workspace Name (existing)
- Logo Upload (new — stored in object storage)
- Timezone (existing)
- Custom Domain (new — enterprise tier only, CNAME verification)

MCP tool: `update_org_config(workspace_id, { name, logo_url, timezone, domain })`

### Step 1.3: Enable Integrations

**Admin screen: Overlay > Connectors section (from `mcp-registry-design.md`)**

This is the first time the admin sees the Connectors panel. During onboarding, it's presented as a wizard step with recommended integrations highlighted.

**Wizard presentation:**

```
Step 2 of 6: Connect Your Tools

Recommended for your team:
┌─────────────────────────────────────────────┐
│ ● Google Workspace              [Enable →]  │
│   Sync users, calendar, drive, email        │
│   ⭐ Most teams start here                  │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ ○ JIRA                          [Enable →]  │
│   Bi-directional task sync                  │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ ○ Salesforce                    [Enable →]  │
│   CRM contacts and pipeline (Pro+)          │
└─────────────────────────────────────────────┘

                    [Skip for Now]  [Continue →]
```

After onboarding, this same UI lives in Admin > Connectors as the permanent config surface.

**Google Workspace flow:**

1. OAuth consent → Google Admin account
2. Grant scopes (directory, gmail, drive, calendar)
3. MCP context server registers Google Workspace MCP server
4. Initial sync: fetch users from Google Directory API
5. Create Airlock user records (`org_role=member` default)
6. Map Google Groups → Airlock org roles
7. Display: "24 users imported, 3 groups mapped"

MCP tool: `register_mcp_server(workspace_id, { server_id: "google-workspace", server_type: "integration", oauth_config, scopes })`

---

## Step 2: Team Configuration

### Step 2.1: User Import & Role Mapping

**Admin screen: Overlay > Members section (extends existing `MembersTable.tsx`)**

During onboarding, the members table is pre-populated from Google sync. Admin assigns roles inline.

**Bulk actions (new):**

- Select Google Group → assign org role to all members
- "Engineering Team" group → all get `member` role + added to relevant modules

MCP tools:

- `update_user_role(user_id, org_role)`
- `bulk_assign_group_role(group_id, role, modules[])`

### Step 2.2: Module Activation

**Admin screen: Overlay > Modules section (currently NOT IMPLEMENTED)**

Admin enables which modules are active for this workspace:

- ☑ Contracts (default ON)
- ☑ CRM (default ON)
- ☑ Tasks (default ON)
- ☑ Calendar (default ON)
- ☑ Documents (default ON)

Module activation → feature flag: `MODULE_CONTRACTS=enabled`, etc.

---

## Step 3: Data Mapping

### Step 3.1: Schema Mapping

**New UI: Admin > Connectors > [Integration] > Field Mapping**

For each enabled integration, admin maps external fields → Airlock core types.

Core Airlock types (from canonical schema):

- **Vault** — workflow instance (maps from: JIRA Epic, Salesforce Opportunity)
- **Event** — immutable log entry (maps from: JIRA issue update, email received)
- **Contact** — person in CRM vault hierarchy (maps from: Google Contact, JIRA user)

Auto-mapping with confidence scores:

```
JIRA Field       → Airlock Field       Confidence
Summary          → vault.title         ● Auto-mapped
Description      → vault.metadata.desc ● Auto-mapped
Assignee         → vault_member        ● Auto-mapped
Status           → vault.chamber       ○ Review needed
  - To Do        → discover
  - In Progress  → build
  - In Review    → review
  - Done         → ship
```

MCP tool: `save_data_mapping(workspace_id, { source: "jira", entity_type: "vault", mappings })`

### Step 3.2: Chamber Configuration

**New UI: Admin > Modules > [Module] > Lifecycle Editor**

Admin reviews default chamber progression and customizes:

```
Contracts Module Lifecycle:

  Discover ──→ Build ──→ Review ──→ Ship
     │           │          │         │
  [Extract]   [Draft]   [Approve]  [Execute]
  [Triage]    [Patch]   [Gate]     [Publish]

Gate rules:
  Discover → Build: requires extraction complete
  Build → Review: requires all patches submitted
  Review → Ship: requires gatekeeper approval (SoD enforced)
  Ship → complete: requires owner sign-off
```

This maps directly to Airlock's locked chamber model (Discover > Build > Review > Ship).

MCP tool: `update_journey(workspace_id, { journey_id, stages[] })`

---

## Step 4: UI Configuration

### Step 4.1: Triptych Layout Config

**New UI: Admin > Modules > [Module] > Layout Editor**

Admin configures what appears in each triptych panel per module per role:

```
Contracts Module — Builder Role:

Signal (left 280px):       Orchestrate (center):     Control (right 300px):
☑ Vault list               ☑ Document editor         ☑ Extraction results
☑ Active vaults             ☑ Diff viewer             ☑ Patch history
☑ Quick filters             ☑ Triage board            ☑ Activity feed
☐ Analytics (Owner only)    ☐ Approval queue          ☑ Otto AI
```

MCP tool: `save_workspace_layout(workspace_id, { module, role, layout: { signal, orchestrate, control } })`

### Step 4.2: View Permissions

**Admin screen: Overlay > Roles section (currently NOT IMPLEMENTED)**

Discord-style permission matrix — which roles can access which views and tools within each module.

This is the same permission matrix from `mcp-registry-design.md` but applied to views, not just MCP tools.

---

## Step 5: Testing

### Step 5.1: Invite Test Users

**Admin screen: Overlay > Members > [Invite]**

- Enter emails → auto-match to Google Directory users
- Assign role + module access
- Send personalized invite with one-click SSO link

### Step 5.2: Workflow Simulation

Admin runs through a contract vault lifecycle end-to-end:

1. Create vault in Contracts module → lands in Discover chamber
2. Upload document → extraction runs (via MCP contract engine)
3. Triage extracted fields → move vault to Build chamber
4. Create patches → submit for review → vault moves to Review chamber
5. Gatekeeper approves → vault moves to Ship chamber
6. Owner publishes → vault complete

**Validation checklist:**

- [ ] Each chamber transition logs to immutable events table
- [ ] SoD enforced (builder cannot self-approve)
- [ ] External sync works (Google Calendar event created for deadlines)
- [ ] Otto AI can access Vibe Prospecting tools with builder role
- [ ] Permission matrix enforced (viewer cannot create patches)

### Step 5.3: System Health Check

**Admin screen: Overlay > System Health (currently NOT IMPLEMENTED)**

Dashboard showing:

- MCP server connectivity (context, Google, JIRA, contract engine)
- Sync lag per integration
- Active sessions
- Event throughput

---

## Step 6: Activation

### Step 6.1: Review & Subscribe (Phase 2 only)

**New UI: Admin > Billing (not yet specced)**

For Phase 1 (dogfood), skip this. For Phase 2 (multi-tenant):

```
Your Airlock is Ready!

✓ 24 users configured
✓ 5 modules active
✓ Google Workspace + JIRA integrated
✓ 89 tasks synced
✓ Contract lifecycle configured

Current: Free (14-day trial)
  5 users · 5 GB · basic AI (100 queries/day)

Upgrade to Pro: $15/seat/month
  Unlimited users · storage · AI engines
  Contract OCR · CRM enrichment · automation

[Continue Free]  [Upgrade →]
```

### Step 6.2: Team Rollout

Phased rollout strategy:

1. Pilot group (already done — test users)
2. Department leads (managers)
3. Full org (all users)

Auto-generated announcement email template with personalized workspace links.

### Step 6.3: Automation Setup

**Admin screen: Overlay > Workflows (extends existing `WorkflowList.tsx`)**

Post-launch automation examples:

- Contract drift detection: `drive.watch → contracts.diff → comms.alert`
- Deal pipeline auto-docs: `crm.on_stage_change → docs.generate → calendar.schedule`
- Sync health monitoring: `jira.validate_sync → alerts.send`

---

## Step 7: Extension (Ongoing)

### Marketplace

**New UI: Admin > Connectors > Marketplace tab (enterprise tier)**

Browse and install third-party MCP engines. Each engine:

1. Declares tools + resources in its manifest
2. Optionally ships UI as MCP Apps (rendered in Orchestrate panel)
3. Admin configures role × tool permissions after install
4. Billing: per-engine monthly fee added to workspace subscription

### Custom Skills

**Admin screen: Overlay > Skills (from `mcp-registry-design.md`)**

Admin or power users create skills via Otto conversation:

1. Describe what the skill does in natural language
2. Otto proposes tool chain from available MCP tools
3. Admin sets role + module scope
4. Skill saved to context server: `org://{ws_id}/skills/headcount-trend.json`

---

## Onboarding Wizard UI Component

The wizard is a **full-screen overlay** that appears on first admin login, replacing the normal module layout.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Step 2 of 6                           ○ ● ○ ○ ○ ○             │
│  Connect Your Tools                                             │
│                                                                 │
│  [wizard step content — same components as admin overlay]       │
│                                                                 │
│                                                                 │
│                              [← Back]  [Skip]  [Continue →]    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Steps:**

1. Welcome + branding (→ ProfileSettings)
2. Connect integrations (→ Connectors section)
3. Import & assign team (→ MembersTable)
4. Map your data (→ Field mapping wizard)
5. Configure workflows (→ Chamber lifecycle editor)
6. Invite test users (→ Members invite flow)

After completion, the wizard disappears and the normal module layout loads. Admin can always return to the same screens via Admin Overlay.

**State tracking:**

```typescript
// MCP resource: org://{ws_id}/config
{
  onboarding: {
    completed: false,
    current_step: 2,
    steps_completed: ["branding", "integrations"],
    skip_count: 0
  }
}
```

---

## Time Budget

| Step              | Stakeholder Time | Automated Time |
| ----------------- | ---------------- | -------------- |
| 0. Provision      | 0 min            | 0.5 min        |
| 1. Login + Config | 13 min           | 2 min          |
| 2. Team           | 22 min           | 1 min          |
| 3. Data Mapping   | 23 min           | 0 min          |
| 4. UI Config      | 15 min           | 0 min          |
| 5. Testing        | 32 min           | 0 min          |
| 6. Activation     | 28 min           | 1 min          |
| **Total**         | **133 min**      | **4.5 min**    |

Target: **under 2 hours 15 minutes** for a fully configured, production-ready workspace.

---

## Mapping to Existing Admin UI Components

| Onboarding Step   | Existing Component    | Status    | Extension Needed                                             |
| ----------------- | --------------------- | --------- | ------------------------------------------------------------ |
| Branding          | `ProfileSettings.tsx` | ✓ Built   | Add logo upload, custom domain                               |
| Integrations      | —                     | ✗ Missing | Build full Connectors section (see `mcp-registry-design.md`) |
| Members           | `MembersTable.tsx`    | ✓ Built   | Add bulk role assignment, Google Group mapping               |
| Data Mapping      | —                     | ✗ Missing | Build field mapping wizard                                   |
| Lifecycle Config  | —                     | ✗ Missing | Build chamber lifecycle editor                               |
| Layout Config     | —                     | ✗ Missing | Build triptych layout editor                                 |
| System Health     | —                     | ✗ Missing | Build health dashboard                                       |
| Billing           | —                     | ✗ Missing | Build billing section (Phase 2)                              |
| Onboarding Wizard | —                     | ✗ Missing | Build wizard overlay component                               |
