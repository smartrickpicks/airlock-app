**Airlock: Zero-to-Production Stakeholder Onboarding Flow**

**Executive Summary**

This document defines the complete turnkey onboarding journey for enterprise stakeholders adopting Airlock—from initial workspace creation through testable, production-ready deployment. The flow incorporates MCP-based configuration, Playwright component integration, Google Workspace/JIRA synchronization, and progressive activation aligned with Airlock's freemium model (free shell \+ paid engine).

**Target outcome**: Stakeholder creates workspace → configures integrations → maps users and roles → tests workflows → activates production engine in under 2 hours.

**Architecture Context**

**The Airlock Model**

**Free Shell (Self-Hosted)**:

- Next.js/React frontend with Playwright-based component library

- Generic primitives: lists, boards, timelines, detail panels, TipTap docs

- Local-only compute for basic functions

- UI driven entirely by MCP context server responses

**Paid Engine (Hosted)**:

- Multi-tenant MCP context server (org settings, roles, layouts, permissions)

- Domain MCP servers: contracts, CRM, comms, calendar, knowledge

- AI orchestration, vector indexing, automation pipelines

- Heavy compute, compliance audit trails

**Configuration as Code**:

- JSON-based canonical journeys, lifecycles, semantics (from airlock-docs repo)

- Stored in org-scoped MCP context server as resources

- Versioned, auditable, extensible by developers

**Integration Points**

**Google Workspace MCP Server**\[web:48\]\[web:51\]:

- Per-user OAuth 2.1 for Gmail, Drive, Calendar, Meet

- Automatic sync on G Suite SSO login

- Maps Google users → Airlock roles

**JIRA MCP Server**\[web:59\]\[web:62\]\[web:68\]:

- Bi-directional task sync

- User provisioning from Google Workspace

- Project/Epic → Airlock Workspace mapping

**Playwright Component Library**\[web:57\]\[web:60\]\[web:66\]:

- Reusable UI components for table viewers, sheet editors, calendar views

- MCP Apps integration for custom domain UIs

- Context-aware rendering based on permissions

**Phase 0: Pre-Onboarding (Marketing → Sign-Up)**

**Stakeholder Journey Entry Points**

| Entry Point       | Action                            | Technical Flow                                                    |
| :---------------- | :-------------------------------- | :---------------------------------------------------------------- |
| Website CTA       | "Start Your Workspace"            | → Provision tenant → seed MCP config → redirect to admin login    |
| Sales Demo        | Custom workspace setup            | → Pre-configure integrations → invite stakeholder as Owner        |
| Developer Install | Self-host shell \+ connect engine | → Deploy Next.js app → configure MCP host endpoint → authenticate |

**Technical Provisioning (Automated)**

When stakeholder clicks "Start Your Workspace":

1. **Tenant Creation**:
   - Generate org_id (UUID)

   - Create database row: organizations(org_id, name, plan, created_at)

   - Provision config bucket: gs://airlock-configs/{org_id}/

2. **MCP Context Server Bootstrap**:
   - Deploy logical instance bound to org_id (multi-tenant deployment)

   - Seed default JSON configs:
     - journeys.json (Deal → Contract → Approval lifecycle)

     - roles.json (Owner, Admin, Manager, Member, Guest)

     - layouts.json (default sidebar, board view, detail panel)

     - permissions.json (role → tool matrix)

   - Expose as MCP resources: org://{org_id}/journeys, org://{org_id}/roles

3. **Admin Account Setup**:
   - Create first user: role=org_owner, status=active

   - Generate SSO invite link or temporary password

   - Send email: "Welcome to Airlock – Complete Setup"

**Time**: \~30 seconds (automated)

**Phase 1: Initial Admin Login & Workspace Configuration**

**Step 1.1: Admin Authentication**

**Stakeholder Action**: Click invite link → log in via email or G Suite SSO

**Technical Flow**:

User clicks link  
↓  
If G Suite SSO:

- OAuth flow → Google IdP

- Return user_id, email, org_id

- Create/update user record

- Assign org_owner role

- Trigger Google Workspace MCP server OAuth grant  
  Else email:

- Verify token → create session

- Prompt password setup  
  ↓  
  MCP context server: resolve_user_permissions(user_id, org_id)  
  ↓  
  Return: roles=\[org_owner\], workspaces=\[default\], layouts=\[admin_dashboard\]  
  ↓  
  Shell renders: Welcome screen \+ setup wizard

**UI Rendered**:

- Welcome modal: "Let's set up your workspace"

- Steps preview: Integrations → Team → Data Mapping → Testing

- CTA: "Start Setup"

**Time**: 2 minutes

**Step 1.2: Workspace Branding & Basic Config**

**Stakeholder Action**: Configure workspace name, logo, timezone, domain

**UI Fields**:

- Workspace Name: \[Acme Entertainment\]

- Logo Upload: \[Browse...\] (stored in gs://airlock-assets/{org_id}/)

- Timezone: \[America/Los_Angeles\] (dropdown)

- Custom Domain (optional): airlock.acme.com (CNAME verification)

**MCP Tool Call**:

{  
"tool": "update_org_config",  
"params": {  
"org_id": "uuid",  
"name": "Acme Entertainment",  
"logo_url": "[https://assets.airlock.io/org-uuid/logo.png](https://assets.airlock.io/org-uuid/logo.png)",  
"timezone": "America/Los_Angeles",  
"domain": "[airlock.acme.com](http://airlock.acme.com)"  
}  
}

**Time**: 3 minutes

**Step 1.3: Enable Integrations**

**Stakeholder Action**: Turn on Google Workspace, JIRA, optional CRM

**UI Design** (Playwright components: integration cards grid):

╔══════════════════════════════════════════════════════════╗  
║ Available Integrations ║  
╠══════════════════════════════════════════════════════════╣  
║ \[Google Workspace\] \[Enabled ✓\] \[Configure\] ║  
║ Sync Gmail, Drive, Calendar, Meet ║  
║ Status: 24 users synced ║  
║ ║  
║ \[JIRA Cloud\] \[Disabled\] \[Enable\] ║  
║ Bi-directional task sync, user provisioning ║  
║ Requires: Atlassian admin approval ║  
║ ║  
║ \[Salesforce\] \[Disabled\] \[Enable\] ║  
║ CRM contacts, deals, pipeline sync ║  
║ Premium feature ║  
╚══════════════════════════════════════════════════════════╝

**Google Workspace Setup Flow**\[web:48\]\[web:51\]\[web:71\]:

1. Click "Enable" → OAuth consent screen

2. Select Google admin account

3. Grant scopes:
   - https://www.googleapis.com/auth/admin.directory.user.readonly

   - https://www.googleapis.com/auth/gmail.readonly

   - https://www.googleapis.com/auth/drive.readonly

   - https://www.googleapis.com/auth/calendar

4. Redirect back → MCP context server registers Google Workspace MCP server

5. Trigger initial sync:
   - Fetch users from Google Directory API

   - Create Airlock user records (role=member by default)

   - Map Google Groups → Airlock Groups

6. Display sync status: "24 users imported, 3 groups mapped"

**JIRA Setup Flow**\[web:59\]\[web:62\]\[web:68\]:

1. Click "Enable" → Atlassian OAuth

2. Select JIRA instance (Cloud/Server)

3. Grant permissions: read users, read/write issues, read projects

4. Map JIRA projects → Airlock workspaces:
   - Auto-suggest: "ACME-ENG" → "Engineering Workspace"

   - Admin confirms mappings

5. Start bi-directional sync:
   - Import open issues → Airlock tasks

   - Map JIRA users to Airlock users (by email)

   - Subscribe to webhooks: issue.created, issue.updated

**MCP Server Registry Update**:

{  
"tool": "register_mcp_server",  
"params": {  
"org_id": "uuid",  
"server_id": "google-workspace",  
"server_type": "integration",  
"oauth_client_id": "google-client-id",  
"scopes": \["directory.readonly", "gmail.readonly", "drive.readonly", "calendar"\],  
"enabled_workspaces": \["default"\]  
}  
}

**Time**: 8 minutes (Google \+ JIRA)

**Phase 2: Team Configuration & Role Assignment**

**Step 2.1: User Import & Role Mapping**

**Stakeholder Action**: Review imported users, assign roles

**UI Design** (Playwright table component with inline editing):

╔═══════════════════════════════════════════════════════════════════════╗  
║ Users (24) \[Invite New User\] ║  
╠═══════════════════════════════════════════════════════════════════════╣  
║ Name Email Role Status Actions ║  
║ ────────────────────────────────────────────────────────────────────║  
║ John Smith [john@acme.com](mailto:john@acme.com) \[Admin ▼\] Active \[Edit\] ║  
║ Sarah Lee [sarah@acme.com](mailto:sarah@acme.com) \[Manager▼\] Active \[Edit\] ║  
║ Mike Johnson [mike@acme.com](mailto:mike@acme.com) \[Member ▼\] Active \[Edit\] ║  
║ ... ║  
╚═══════════════════════════════════════════════════════════════════════╝

**Role Definitions** (from seeded roles.json):

| Role    | Permissions                                   | Use Case             |
| :------ | :-------------------------------------------- | :------------------- |
| Owner   | Full admin, billing, delete org               | Founder, CTO         |
| Admin   | User management, integrations, config         | IT lead              |
| Manager | Create workspaces, assign tasks, approve docs | Department heads     |
| Member  | Access assigned workspaces, create tasks      | ICs                  |
| Guest   | Read-only, invited to specific workspaces     | Contractors, clients |

**Bulk Actions**:

- Select Google Group → assign role to all members

- Example: "Engineering Team" group → all members get "Member" role \+ added to "Engineering Workspace"

**MCP Tool Calls**:

\[  
{  
"tool": "update_user_role",  
"params": {"user_id": "user-uuid-1", "role": "admin"}  
},  
{  
"tool": "bulk_assign_group_role",  
"params": {"group_id": "eng-team", "role": "member", "workspace_id": "eng-workspace"}  
}  
\]

**Time**: 10 minutes

**Step 2.2: Workspace Creation & Permissions**

**Stakeholder Action**: Create workspaces (channels/rooms) with permissions

**Workspace Types** (inspired by Discord channels \+ OrchestrateOS Vaults):

1. **Public Workspace**: All org members can see/join

2. **Private Workspace**: Invite-only, hidden from directory

3. **Department Workspace**: Tied to Google Group membership

4. **Deal Room**: Auto-created per CRM deal, lifecycle-managed

**Creation Flow**:

Click "Create Workspace"  
↓  
Modal:

- Name: \[Engineering Projects\]

- Type: \[Department ▼\]

- Linked Group: \[eng-team ▼\]

- Default Permissions:  
  ☑ Members can create tasks  
  ☑ Members can upload files  
  ☐ Members can approve contracts

- Enabled Integrations:  
  ☑ Google Drive folder: \[/Shared Drives/Engineering\]  
  ☑ JIRA project: \[ACME-ENG\]  
  ☐ Slack channel sync  
  ↓  
  MCP Call: create_workspace(name, type, group_id, permissions, integrations)  
  ↓  
  Result:

- Workspace created

- Permissions matrix stored in context server

- 18 users auto-added (from eng-team group)

- Drive folder mounted, JIRA sync started

**Permission Matrix Example** (stored in MCP context server):

{  
"workspace_id": "eng-workspace",  
"permissions": {  
"member": {  
"tasks": \["read", "create", "update_own"\],  
"contracts": \["read"\],  
"files": \["read", "upload"\],  
"tools": \["calendar.read", "email.send", "jira.sync"\]  
},  
"manager": {  
"tasks": \["read", "create", "update", "delete", "assign"\],  
"contracts": \["read", "create", "approve"\],  
"files": \["read", "upload", "delete"\],  
"tools": \["calendar.read", "calendar.write", "email.send", "jira.admin"\]  
}  
}  
}

**Time**: 12 minutes (3 workspaces)

**Phase 3: Data Mapping & Tool Configuration**

**Step 3.1: Schema Mapping (The "We Don't Care What You Call It" Layer)**

**Stakeholder Action**: Map external data → Airlock core types

**Core Airlock Types** (from canonical schema):

- **Company**: Organizations/accounts

- **Contact**: People

- **Deal**: Sales opportunities

- **Task**: Work items (from JIRA, Asana, or native)

- **Artifact**: Files/documents

- **Message**: Communications

- **Event**: Calendar entries

**UI Design** (Playwright mapping wizard):

╔═══════════════════════════════════════════════════════════════╗  
║ Map JIRA Fields → Airlock Tasks ║  
╠═══════════════════════════════════════════════════════════════╣  
║ JIRA Field → Airlock Field Confidence ║  
║ ────────────────────────────────────────────────────────────║  
║ Summary → \[title ▼\] ● Auto-mapped ║  
║ Description → \[description ▼\] ● Auto-mapped ║  
║ Assignee → \[assigned_to ▼\] ● Auto-mapped ║  
║ Status → \[status ▼\] ○ Review needed║  
║ \- To Do → draft ║  
║ \- In Progress → in_progress ║  
║ \- Done → completed ║  
║ Priority → \[priority ▼\] ● Auto-mapped ║  
║ Story Points → \[custom.effort ▼\] ○ Custom field║  
║ ║  
║ \[Advanced\] Custom field mapping ║  
╚═══════════════════════════════════════════════════════════════╝

**MCP Context Server Stores Mapping**:

{  
"tool": "save_data_mapping",  
"params": {  
"org_id": "uuid",  
"source": "jira",  
"entity_type": "task",  
"mappings": {  
"summary": "title",  
"description": "description",  
"assignee.emailAddress": "assigned_to.email",  
"[status.name](http://status.name)": {  
"field": "status",  
"transform": {  
"To Do": "draft",  
"In Progress": "in_progress",  
"Done": "completed"  
}  
}  
}  
}  
}

**Time**: 8 minutes (JIRA \+ Google Drive mappings)

**Step 3.2: Canonical Journeys Configuration**

**Stakeholder Action**: Review/customize workflow lifecycles

**Default Journeys** (from seeded journeys.json):

1. **Contract Lifecycle**: Draft → Review → Legal Approval → Signature → Active → Renewal

2. **Deal Pipeline**: Lead → Qualified → Proposal → Negotiation → Closed Won/Lost

3. **Task Flow**: Backlog → In Progress → Review → Done

**UI Design** (visual journey editor \- Playwright canvas component):

╔═══════════════════════════════════════════════════════════════════╗  
║ Contract Lifecycle Journey \[Edit\] \[Test\]║  
╠═══════════════════════════════════════════════════════════════════╣  
║ ║  
║ ┌────────┐ ┌────────┐ ┌────────┐ ┌─────────┐ ║  
║ │ Draft │ ──\> │ Review │ ──\> │ Legal │ ──\> │ Signed │ ║  
║ └────────┘ └────────┘ └────────┘ └─────────┘ ║  
║ │ │ │ ║  
║ ↓ ↓ ↓ ║  
║ \[Create\] \[Assign\] \[AI Check\] \[E-signature\] ║  
║ \[Upload\] \[Comment\] \[Redline\] \[Notify parties\] ║  
║ ║  
║ Permissions per stage: ║  
║ \- Draft: Creator \+ Managers ║  
║ \- Review: Assigned reviewer ║  
║ \- Legal: Legal team only ║  
║ \- Signed: Read-only for all ║  
╚═══════════════════════════════════════════════════════════════════╝

**Customization Options**:

- Add/remove stages

- Define transition rules (e.g., "Legal → Signed requires 2 approvals")

- Attach automation tools (e.g., "On Draft → Review, call OCR engine")

- Set stage-specific permissions

**MCP Storage**:

{  
"tool": "update_journey",  
"params": {  
"org_id": "uuid",  
"journey_id": "contract-lifecycle",  
"stages": \[  
{  
"id": "draft",  
"name": "Draft",  
"permissions": {"roles": \["manager", "admin"\]},  
"actions": \["create_contract", "upload_file"\]  
},  
{  
"id": "review",  
"name": "Review",  
"transitions_from": \["draft"\],  
"permissions": {"roles": \["assigned_reviewer"\]},  
"actions": \["comment", "request_changes", "approve"\],  
"automation": {  
"on_enter": \["tools.ocr_extraction", "tools.clause_detection"\]  
}  
}  
\]  
}  
}

**Time**: 15 minutes (3 journeys configured)

**Phase 4: Component Library & UI Configuration**

**Step 4.1: Playwright Component Integration**

**Stakeholder Action**: Select default views for each workspace type

**Available Components** (Playwright library \+ MCP Apps):

| Component          | Use Case                       | Integrations                   |
| :----------------- | :----------------------------- | :----------------------------- |
| **KanbanBoard**    | Task management, deal pipeline | JIRA, native tasks             |
| **TableViewer**    | Data grids, reports            | Google Sheets, CSV import      |
| **CalendarView**   | Meetings, deadlines            | Google Calendar, native events |
| **DocEditor**      | Rich text, contracts           | TipTap \+ Google Docs sync     |
| **FileExplorer**   | Document management            | Google Drive, native storage   |
| **ChatPanel**      | Communications                 | Slack sync, native messages    |
| **DashboardCards** | KPIs, metrics                  | Custom queries, AI insights    |

**Configuration UI**:

╔═══════════════════════════════════════════════════════════════════╗  
║ Engineering Workspace \- Default Layout ║  
╠═══════════════════════════════════════════════════════════════════╣  
║ Sidebar (left): ║  
║ ☑ Workspaces tree ║  
║ ☑ Recent tasks ║  
║ ☑ Assigned to me ║  
║ ║  
║ Main View (center): ║  
║ Primary: \[KanbanBoard ▼\] (JIRA-synced tasks) ║  
║ Secondary: \[TableViewer ▼\] (Sprint planning sheet) ║  
║ ║  
║ Detail Panel (right): ║  
║ ☑ Task details ║  
║ ☑ File attachments (Google Drive) ║  
║ ☑ Activity feed ║  
║ ☑ AI assistant ║  
║ ║  
║ \[Preview Layout\] \[Save as Default\] ║  
╚═══════════════════════════════════════════════════════════════════╝

**MCP Context Server Storage**:

{  
"tool": "save_workspace_layout",  
"params": {  
"org_id": "uuid",  
"workspace_id": "eng-workspace",  
"layout": {  
"sidebar": {  
"components": \["workspace_tree", "recent_tasks", "assigned_tasks"\]  
},  
"main": {  
"primary": {  
"component": "kanban_board",  
"data_source": "jira",  
"config": {"columns": \["backlog", "in_progress", "review", "done"\]}  
},  
"secondary": {  
"component": "table_viewer",  
"data_source": "google_sheets",  
"sheet_id": "sprint-planning-sheet-id"  
}  
},  
"detail_panel": {  
"components": \["task_detail", "file_attachments", "activity_feed", "ai_assistant"\]  
}  
}  
}  
}

**Time**: 10 minutes (per workspace type)

**Step 4.2: View Permissions & Tool Visibility**

**Stakeholder Action**: Configure which roles see which UI components/tools

**Permission Mapping** (Discord-style):

╔═══════════════════════════════════════════════════════════════════╗  
║ Role: Member (Engineering Workspace) ║  
╠═══════════════════════════════════════════════════════════════════╣  
║ Visible Components: Tools Accessible: ║  
║ ☑ KanbanBoard (read/write own) ☑ jira.update_issue ║  
║ ☑ TableViewer (read-only) ☑ calendar.read ║  
║ ☑ CalendarView (read/write own) ☑ drive.upload ║  
║ ☑ DocEditor (read/write own) ☑ email.send ║  
║ ☑ FileExplorer (read \+ upload) ☑ ai.ask_question ║  
║ ☐ DashboardCards (admin only) ☐ contracts.approve ║  
║ ☑ ChatPanel (read/write) ☐ user.manage ║  
║ ☑ AI Assistant (ask only) ☐ analytics.export ║  
╚═══════════════════════════════════════════════════════════════════╝

**MCP Enforcement**:

- When user loads workspace, MCP context server returns only allowed components

- Shell renders only those components

- Tool calls blocked at MCP gateway if user lacks permission

**Time**: 5 minutes (review defaults, adjust)

**Phase 5: Testing & Validation**

**Step 5.1: Invite Test Users**

**Stakeholder Action**: Invite 2-3 colleagues to test

**Invite Flow**:

Click "Invite Users" → Modal:

- Enter emails: [sarah@acme.com](mailto:sarah@acme.com), [mike@acme.com](mailto:mike@acme.com)

- Assign role: \[Member ▼\]

- Add to workspaces: \[✓\] Engineering, \[✓\] General

- Message: "Hey team, please test our new Airlock workspace\!"  
  \[Send Invites\]  
  ↓  
  MCP calls: create_invite_links(emails, role, workspaces)  
  ↓  
  Email sent with:

- Personalized message

- One-click setup link

- "What to expect" instructions

**Test User Experience**:

1. Click invite link

2. G Suite SSO login (auto-provisioned from earlier sync)

3. Land in "Engineering Workspace"

4. See:
   - KanbanBoard with their JIRA tasks already synced

   - CalendarView with their Google Calendar events

   - AI Assistant in right panel: "Hi Sarah\! Ask me anything."

5. Create a test task → syncs to JIRA within seconds

6. Upload a file → appears in Google Drive folder

7. Leave feedback: "This is way cleaner than switching between 5 tools\!"

**Time**: 15 minutes (invite \+ test users explore)

**Step 5.2: Workflow Simulation**

**Stakeholder Action**: Run through a canonical journey end-to-end

**Test Scenario**: Contract approval flow

1. Admin creates new contract in "Contracts Workspace"

2. Uploads draft PDF → OCR extraction runs (via MCP contract engine)

3. AI detects clauses, highlights key terms

4. Admin assigns to Legal Manager for review

5. Legal Manager sees task in their queue, opens doc

6. Makes redline edits in TipTap editor

7. Approves → transitions to "Legal Approved" stage

8. Admin sends for e-signature (MCP tool: esign.send_envelope)

9. All parties notified via email (from Google Workspace MCP)

10. Contract moves to "Signed" → appears in CRM as closed deal

**Validation**:

- Each stage transition logs to audit trail

- Permissions enforced: IC cannot skip to "Signed"

- Data synced: JIRA updated, Drive folder organized, calendar event created

- AI assisted: "Would you like me to summarize changes?"

**Time**: 12 minutes

**Step 5.3: Performance & Sync Validation**

**Stakeholder Action**: Check data sync status, run diagnostics

**UI Dashboard** (admin-only):

╔═══════════════════════════════════════════════════════════════════╗  
║ System Health & Sync Status ║  
╠═══════════════════════════════════════════════════════════════════╣  
║ ✓ Google Workspace: 24 users, 156 events, last sync 2 min ago ║  
║ ✓ JIRA: 89 tasks synced, 3 projects, last sync 30 sec ago ║  
║ ⚠ Salesforce: Not configured ║  
║ ║  
║ Active Sessions: 5 users online ║  
║ MCP Servers: 3 connected (context, google, jira) ║  
║ Average Response Time: 240ms ║  
║ ║  
║ \[Run Full Sync\] \[View Logs\] \[Export Config\] ║  
╚═══════════════════════════════════════════════════════════════════╝

**Diagnostic Tools**:

- Test MCP connectivity

- Validate OAuth tokens

- Check permission conflicts

- Simulate high load (10 concurrent users)

**Time**: 5 minutes

**Phase 6: Production Activation (The "Turn On the Faucet" Moment)**

**Step 6.1: Review & Subscribe**

**Stakeholder Action**: Review setup, select premium plan

**Setup Summary Screen**:

╔═══════════════════════════════════════════════════════════════════╗  
║ Your Airlock is Ready\! 🎉 ║  
╠═══════════════════════════════════════════════════════════════════╣  
║ ✓ 24 users configured ║  
║ ✓ 3 workspaces created ║  
║ ✓ Google Workspace \+ JIRA integrated ║  
║ ✓ 89 tasks synced ║  
║ ✓ Contract lifecycle configured ║  
║ ✓ Test users validated flows ║  
║ ║  
║ Current Plan: Free (14-day trial) ║  
║ \- Limited to 25 users ║  
║ \- 5 GB storage ║  
║ \- Basic AI (100 queries/day) ║  
║ ║  
║ Upgrade to Premium: ║  
║ \- Unlimited users ($15/user/month) ║  
║ \- Unlimited storage ║  
║ \- Advanced AI engines (unlimited) ║  
║ \- Contract OCR, clause detection ║  
║ \- Custom automation pipelines ║  
║ \- Priority support ║  
║ ║  
║ \[Continue Free Trial\] \[Upgrade Now\] ║  
╚═══════════════════════════════════════════════════════════════════╝

**Upgrade Flow**:

- Click "Upgrade Now"

- Billing info (Stripe integration)

- Confirm seats: 24 users × $15 \= $360/month

- Activate premium MCP servers:
  - Contract engine (OCR, extraction, clause detection)

  - Advanced CRM engine (AI scoring, forecasting)

  - Automation pipelines (background jobs, webhooks)

  - Knowledge engine (vector indexing, semantic search)

**MCP Activation**:

{  
"tool": "activate_premium_servers",  
"params": {  
"org_id": "uuid",  
"plan": "premium",  
"servers": \["contracts", "crm_advanced", "automation", "knowledge"\]  
}  
}

**Result**:

- All MCP domain servers come online

- AI query limits removed

- Heavy compute enabled

- Full tool registry unlocked

**Time**: 5 minutes

**Step 6.2: Rollout to Full Team**

**Stakeholder Action**: Announce to entire org, enable for all users

**Rollout Strategy**:

1. **Phase 1: Pilot group** (already done \- 3 test users)

2. **Phase 2: Department leads** (Managers, 8 users) \- now

3. **Phase 3: Full org** (all 24 users) \- 1 week later

**Announcement Template** (auto-generated):

Subject: Welcome to Airlock – Your New Unified Workspace

Hi Team,

We're excited to launch Airlock, our new unified workspace that brings together:  
✓ JIRA tasks  
✓ Google Calendar & Drive  
✓ Contract management  
✓ AI-powered assistance

Getting Started:

1. Check your email for your invite link

2. Log in with your @acme.com Google account

3. Watch the 2-minute intro video

4. Join your first workspace: Engineering / Sales / Ops

Questions? Ask the AI assistant or ping me\!

– \[Admin Name\]

**Monitoring**:

- Track login rate (24/24 users logged in within 48 hours)

- Measure engagement (avg 45 min/day in Airlock)

- Collect feedback (NPS survey after 1 week)

**Time**: 3 minutes (send announcement)

**Step 6.3: Configure Advanced Automation (Post-Launch)**

**Stakeholder Action**: Set up background jobs, alerts, AI agents

**Automation Examples**:

1. **Contract Drift Detection**:
   - Watch Google Drive folder for contract edits

   - If file modified → trigger OCR diff

   - If clauses changed → alert Legal team

   - MCP tool chain: drive.watch → contracts.diff → comms.alert

2. **Deal Pipeline Automation**:
   - When deal moves to "Proposal" stage

   - Auto-generate proposal doc from template

   - Attach pricing sheet from CRM

   - Schedule follow-up meeting (Calendar AI)

   - MCP tool chain: crm.on_stage_change → docs.generate → calendar.schedule

3. **JIRA Sync Health Check**:
   - Every 4 hours: validate JIRA → Airlock task mapping

   - If sync lag \> 5 minutes → alert admin

   - MCP tool: jira.validate_sync → alerts.send

**Configuration UI**:

╔═══════════════════════════════════════════════════════════════════╗  
║ Automations (3 active) \[Create New\] ║  
╠═══════════════════════════════════════════════════════════════════╣  
║ Contract Drift Detection \[✓\] ║  
║ Trigger: Google Drive file modified ║  
║ Actions: OCR diff → alert Legal team ║  
║ Status: Running (last run: 5 min ago) ║  
║ ║  
║ Deal Pipeline Auto-Docs \[✓\] ║  
║ Trigger: CRM deal stage \= "Proposal" ║  
║ Actions: Generate doc → attach pricing → schedule meeting ║  
║ Status: Running (3 runs today) ║  
║ ║  
║ JIRA Sync Monitor \[✓\] ║  
║ Trigger: Schedule (every 4 hours) ║  
║ Actions: Validate sync → alert if lag \> 5 min ║  
║ Status: Healthy (last check: 18 min ago) ║  
╚═══════════════════════════════════════════════════════════════════╝

**Time**: 20 minutes (3 automations configured)

**Phase 7: Ongoing Configuration & Extension**

**Developer Community Integration**

**Stakeholder Action**: Install community-built engines from marketplace

**Airlock Marketplace** (future vision):

╔═══════════════════════════════════════════════════════════════════╗  
║ Airlock Engine Marketplace ║  
╠═══════════════════════════════════════════════════════════════════╣  
║ \[Featured\] \[Most Popular\] \[New Releases\] \[My Engines\] ║  
║ ║  
║ 📊 Advanced Analytics Engine 4.8⭐ (124) ║  
║ by DataViz Co ║  
║ Custom dashboards, predictive forecasting ║  
║ \[Install\] $49/month ║  
║ ║  
║ 🤖 Multi-Agent Orchestrator 4.9⭐ (89) ║  
║ by Kiwi AI (official) ║  
║ Autonomous task routing, personality matrices ║  
║ \[Install\] Free (open-source) ║  
║ ║  
║ 📝 Legal Clause Library 4.7⭐ (156) ║  
║ by LegalTech Inc ║  
║ Pre-approved clause templates, compliance checks ║  
║ \[Install\] $99/month ║  
╚═══════════════════════════════════════════════════════════════════╝

**Installation Flow**:

1. Click "Install" → review permissions requested

2. Accept → MCP server added to org registry

3. Configure integration: map to workspaces, set roles

4. New tools appear in relevant workspace layouts

5. Developer-provided UI (MCP Apps) renders in detail panel

**Extension Development** (for 3rd parties):

// Example: Custom "Sales Forecasting" MCP server  
export const salesForecastingServer \= {  
name: "sales-forecasting",  
version: "1.0.0",  
tools: \[  
{  
name: "predict_quarterly_revenue",  
description: "AI-powered revenue forecast",  
inputSchema: { /\* params

_/ },handler: async (params) \=\> {// Access Airlock CRM data via shared contextconst deals \= await airlockContext.getDeals(params.quarter);const forecast \= await runMLModel(deals);return forecast;}}\],resources: \[{uri: "forecast://ui/dashboard",name: "Forecast Dashboard",mimeType: "application/vnd.mcp.app+json",content: { /_ MCP App UI definition \*/ }  
}  
\]  
};

**Total Onboarding Time Breakdown**

| Phase                      | Activities                        | Stakeholder Time | Automated Time |
| :------------------------- | :-------------------------------- | :--------------- | :------------- |
| 0\. Pre-Onboarding         | Tenant provisioning               | 0 min            | 0.5 min        |
| 1\. Initial Login & Config | Auth, branding, integrations      | 13 min           | 2 min          |
| 2\. Team Configuration     | User/role mapping, workspaces     | 22 min           | 1 min          |
| 3\. Data Mapping           | Schema mapping, journey config    | 23 min           | 0 min          |
| 4\. UI Configuration       | Component selection, permissions  | 15 min           | 0 min          |
| 5\. Testing                | Invite users, workflow simulation | 32 min           | 0 min          |
| 6\. Activation             | Upgrade, rollout, automation      | 28 min           | 1 min          |
| **TOTAL**                  | **Zero to Production**            | **133 min**      | **4.5 min**    |

**Realistic timeline: 2 hours 13 minutes** (stakeholder active time) for a fully configured, testable, production-ready Airlock workspace.

**Technical Requirements Satisfied**

**Playwright Component Integration\[web:57\]\[web:60\]\[web:66\]**

- Components exposed as reusable modules in shell

- MCP Apps protocol for custom domain UIs

- Context-aware rendering based on permissions

- Supported components: KanbanBoard, TableViewer, CalendarView, DocEditor (TipTap), FileExplorer, ChatPanel, DashboardCards

**Google Workspace Deep Integration\[web:48\]\[web:51\]\[web:70\]\[web:71\]**

- Per-user OAuth 2.1 for Gmail, Drive, Calendar, Meet

- Automatic zero-touch onboarding via G Suite SSO

- User/group sync every 4 hours (manual trigger available)

- Drive folder mounting per workspace

- Calendar bi-directional sync

**JIRA Synchronization\[web:59\]\[web:62\]\[web:68\]**

- OAuth-based connection (Cloud/Server)

- Bi-directional task sync (webhook-driven)

- User provisioning from Google Workspace

- Project → Workspace mapping

- Custom field mapping UI

**MCP Server Architecture\[web:42\]\[web:46\]\[web:49\]**

- Multi-tenant context server (org-scoped config)

- Domain servers: Google, JIRA, contracts, CRM, knowledge

- JSON-based config as MCP resources

- Tool/resource discovery per session

- OAuth 2.1 authorization per user per server

**Zero-Touch Onboarding Pattern\[web:58\]\[web:61\]\[web:64\]\[web:67\]\[web:70\]**

- Automated tenant provisioning (\<30 sec)

- SSO-based user import (Google admin directory)

- Pre-configured defaults (roles, journeys, layouts)

- Guided setup wizard (progressive disclosure)

- Self-service admin configuration

**Post-Launch Success Metrics**

**Stakeholder KPIs** (measured after 30 days):

| Metric                      | Target             | Measurement                                          |
| :-------------------------- | :----------------- | :--------------------------------------------------- |
| User adoption rate          | \>90%              | Users logged in / Total invited                      |
| Daily active usage          | \>30 min/user      | Avg session time in Airlock                          |
| Tool consolidation          | 3-5 tools replaced | Pre-Airlock tool count → Post-Airlock                |
| Context switching reduction | 50% decrease       | Tab switches / Tasks completed                       |
| Task throughput             | 25% increase       | Tasks completed per week (before/after)              |
| Time to onboard new hire    | \<30 min           | From invite to productive (vs 2-3 hours pre-Airlock) |
| Admin config time           | \<15 min/user      | Time to provision new user \+ workspace access       |

**Technical Health Metrics**:

- MCP server uptime: \>99.9%

- Sync lag (JIRA, Google): \<2 minutes p95

- API response time: \<300ms p95

- Failed auth rate: \<0.1%

**Appendix: Detailed JSON Config Examples**

**roles.json (Seeded Defaults)**

{  
"roles": \[  
{  
"id": "org_owner",  
"name": "Owner",  
"description": "Full administrative access, billing, org deletion",  
"permissions": {  
"org": \["read", "write", "delete", "billing"\],  
"users": \["read", "create", "update", "delete"\],  
"workspaces": \["read", "create", "update", "delete"\],  
"integrations": \["read", "create", "update", "delete"\],  
"all_tools": true  
}  
},  
{  
"id": "admin",  
"name": "Admin",  
"description": "User management, integrations, configuration",  
"permissions": {  
"org": \["read"\],  
"users": \["read", "create", "update"\],  
"workspaces": \["read", "create", "update"\],  
"integrations": \["read", "create", "update"\],  
"tools": \["

_"\]}},{"id": "manager","name": "Manager","description": "Create workspaces, assign tasks, approve documents","permissions": {"workspaces": \["read", "create", "update_own"\],"tasks": \["read", "create", "update", "assign"\],"contracts": \["read", "create", "approve"\],"tools": \["tasks._", "contracts._", "calendar._", "drive.\*", "ai.ask"\]  
}  
},  
{  
"id": "member",  
"name": "Member",  
"description": "Access assigned workspaces, create tasks",  
"permissions": {  
"workspaces": \["read_assigned"\],  
"tasks": \["read", "create", "update_own"\],  
"contracts": \["read"\],  
"tools": \["tasks.read", "tasks.update_own", "calendar.read", "drive.upload", "ai.ask"\]  
}  
},  
{  
"id": "guest",  
"name": "Guest",  
"description": "Read-only access to specific workspaces",  
"permissions": {  
"workspaces": \["read_invited"\],  
"tasks": \["read"\],  
"contracts": \["read"\],  
"tools": \["ai.ask"\]  
}  
}  
\]  
}

**journeys.json (Contract Lifecycle Example)**

{  
"journeys": \[  
{  
"id": "contract-lifecycle",  
"name": "Contract Lifecycle",  
"description": "Standard contract approval workflow",  
"entity_type": "contract",  
"stages": \[  
{  
"id": "draft",  
"name": "Draft",  
"description": "Initial contract creation",  
"permissions": {  
"roles": \["manager", "admin"\],  
"actions": \["create", "edit", "upload"\]  
},  
"automation": {  
"on_enter": \[\]  
},  
"transitions": \[  
{"to": "review", "label": "Submit for Review", "conditions": \["has_file"\]}  
\]  
},  
{  
"id": "review",  
"name": "Review",  
"description": "Manager review and edits",  
"permissions": {  
"roles": \["assigned_reviewer", "admin"\],  
"actions": \["read", "comment", "edit", "request_changes", "approve"\]  
},  
"automation": {  
"on_enter": \[  
{"tool": "contracts.ocr_extract", "params": {}},  
{"tool": "contracts.detect_clauses", "params": {}},  
{"tool": "notifications.assign_reviewer", "params": {}}  
\]  
},  
"transitions": \[  
{"to": "draft", "label": "Request Changes"},  
{"to": "legal", "label": "Send to Legal", "conditions": \["approved_by_reviewer"\]}  
\]  
},  
{  
"id": "legal",  
"name": "Legal Approval",  
"description": "Legal team review",  
"permissions": {  
"roles": \["legal", "admin"\],  
"actions": \["read", "comment", "redline", "approve", "reject"\]  
},  
"automation": {  
"on_enter": \[  
{"tool": "contracts.compliance_check", "params": {}},  
{"tool": "notifications.alert_legal", "params": {}}  
\]  
},  
"transitions": \[  
{"to": "review", "label": "Return to Review"},  
{"to": "signature", "label": "Send for Signature", "conditions": \["approved_by_legal"\]}  
\]  
},  
{  
"id": "signature",  
"name": "Awaiting Signature",  
"description": "E-signature collection",  
"permissions": {  
"roles": \["signers", "admin"\],  
"actions": \["read", "sign"\]  
},  
"automation": {  
"on_enter": \[  
{"tool": "esign.create_envelope", "params": {}},  
{"tool": "notifications.request_signatures", "params": {}}  
\],  
"on_exit": \[  
{"tool": "contracts.finalize", "params": {}},  
{"tool": "crm.update_deal_status", "params": {"status": "closed_won"}}  
\]  
},  
"transitions": \[  
{"to": "signed", "label": "Complete", "conditions": \["all_signed"\]}  
\]  
},  
{  
"id": "signed",  
"name": "Signed",  
"description": "Executed contract",  
"permissions": {  
"roles": \["all"\],  
"actions": \["read"\]  
},  
"automation": {  
"on_enter": \[  
{"tool": "drive.archive", "params": {"folder": "Executed Contracts"}},  
{"tool": "calendar.create_renewal_reminder", "params": {"advance_days": 90}},  
{"tool": "notifications.alert_stakeholders", "params": {}}  
\]  
},  
"transitions": \[\]  
}  
\]  
}  
\]  
}

**layouts.json (Engineering Workspace Example)**

{  
"layouts": \[  
{  
"workspace_id": "eng-workspace",  
"name": "Engineering Workspace Layout",  
"roles": \["member", "manager", "admin"\],  
"layout": {  
"sidebar": {  
"width": "240px",  
"components": \[  
{  
"type": "workspace_tree",  
"config": {"show_private": false}  
},  
{  
"type": "recent_tasks",  
"config": {"limit": 5}  
},  
{  
"type": "assigned_tasks",  
"config": {"filter": "assigned_to_me"}  
}  
\]  
},  
"main": {  
"tabs": \[  
{  
"id": "board",  
"label": "Board",  
"component": {  
"type": "kanban_board",  
"data_source": "jira",  
"config": {  
"project": "ACME-ENG",  
"columns": \["backlog", "in_progress", "review", "done"\],  
"group_by": "assignee"  
}  
}  
},  
{  
"id": "sprint",  
"label": "Sprint Planning",  
"component": {  
"type": "table_viewer",  
"data_source": "google_sheets",  
"config": {  
"sheet_id": "sprint-planning-sheet-id",  
"editable": true  
}  
}  
},  
{  
"id": "calendar",  
"label": "Calendar",  
"component": {  
"type": "calendar_view",  
"data_source": "google_calendar",  
"config": {  
"calendars": \["eng-team-calendar", "personal"\],  
"default_view": "week"  
}  
}  
}  
\]  
},  
"detail_panel": {  
"width": "400px",  
"components": \[  
{  
"type": "task_detail",  
"config": {"show_comments": true, "show_attachments": true}  
},  
{  
"type": "file_attachments",  
"config": {"source": "google_drive"}  
},  
{  
"type": "activity_feed",  
"config": {"limit": 10}  
},  
{  
"type": "ai_assistant",  
"config": {"model": "gpt-4", "context": "workspace"}  
}  
\]  
}  
}  
}  
\]  
}

**Conclusion**

This turnkey onboarding flow transforms Airlock from "interesting concept" to "fully operational unified workspace" in approximately **2 hours of stakeholder time**. The architecture leverages:

1. **MCP as the control plane**: All config, permissions, tools centralized

2. **Playwright components**: Reusable, context-aware UI primitives

3. **Zero-touch sync**: Google Workspace \+ JIRA auto-import users/data

4. **JSON-driven extensibility**: Canonical journeys, layouts, roles as code

5. **Freemium activation**: Free shell → premium engines on demand

**Key success factors**:

- Minimize stakeholder decisions through smart defaults

- Automate infrastructure (provisioning, sync, auth)

- Progressive disclosure (essential config first, advanced later)

- Immediate value (see synced data within minutes)

- Clear upgrade path (test free, activate premium when ready)

The stakeholder leaves Phase 6 with a **production-ready Airlock** where:

- ✅ All users provisioned and authenticated

- ✅ JIRA \+ Google Workspace fully synced

- ✅ Workflows configured to org processes

- ✅ UI personalized per role

- ✅ AI engines operational

- ✅ Team actively using it

**Next milestone**: 30-day check-in to measure adoption, gather feedback, configure advanced automations, and expand to additional departments or integrations.

**Airlock: Zero-to-Production Stakeholder Onboarding Flow**

**Executive Summary**

This document defines the complete turnkey onboarding journey for enterprise stakeholders adopting Airlock—from initial workspace creation through testable, production-ready deployment. The flow incorporates MCP-based configuration, Playwright component integration, Google Workspace/JIRA synchronization, and progressive activation aligned with Airlock's freemium model (free shell \+ paid engine).

**Target outcome**: Stakeholder creates workspace → configures integrations → maps users and roles → tests workflows → activates production engine in under 2 hours.

**Architecture Context**

**The Airlock Model**

**Free Shell (Self-Hosted)**:

- Next.js/React frontend with Playwright-based component library

- Generic primitives: lists, boards, timelines, detail panels, TipTap docs

- Local-only compute for basic functions

- UI driven entirely by MCP context server responses

**Paid Engine (Hosted)**:

- Multi-tenant MCP context server (org settings, roles, layouts, permissions)

- Domain MCP servers: contracts, CRM, comms, calendar, knowledge

- AI orchestration, vector indexing, automation pipelines

- Heavy compute, compliance audit trails

**Configuration as Code**:

- JSON-based canonical journeys, lifecycles, semantics (from airlock-docs repo)

- Stored in org-scoped MCP context server as resources

- Versioned, auditable, extensible by developers

**Integration Points**

**Google Workspace MCP Server**\[web:48\]\[web:51\]:

- Per-user OAuth 2.1 for Gmail, Drive, Calendar, Meet

- Automatic sync on G Suite SSO login

- Maps Google users → Airlock roles

**JIRA MCP Server**\[web:59\]\[web:62\]\[web:68\]:

- Bi-directional task sync

- User provisioning from Google Workspace

- Project/Epic → Airlock Workspace mapping

**Playwright Component Library**\[web:57\]\[web:60\]\[web:66\]:

- Reusable UI components for table viewers, sheet editors, calendar views

- MCP Apps integration for custom domain UIs

- Context-aware rendering based on permissions

**Phase 0: Pre-Onboarding (Marketing → Sign-Up)**

**Stakeholder Journey Entry Points**

| Entry Point       | Action                            | Technical Flow                                                    |
| :---------------- | :-------------------------------- | :---------------------------------------------------------------- |
| Website CTA       | "Start Your Workspace"            | → Provision tenant → seed MCP config → redirect to admin login    |
| Sales Demo        | Custom workspace setup            | → Pre-configure integrations → invite stakeholder as Owner        |
| Developer Install | Self-host shell \+ connect engine | → Deploy Next.js app → configure MCP host endpoint → authenticate |

**Technical Provisioning (Automated)**

When stakeholder clicks "Start Your Workspace":

1. **Tenant Creation**:
   - Generate org_id (UUID)

   - Create database row: organizations(org_id, name, plan, created_at)

   - Provision config bucket: gs://airlock-configs/{org_id}/

2. **MCP Context Server Bootstrap**:
   - Deploy logical instance bound to org_id (multi-tenant deployment)

   - Seed default JSON configs:
     - journeys.json (Deal → Contract → Approval lifecycle)

     - roles.json (Owner, Admin, Manager, Member, Guest)

     - layouts.json (default sidebar, board view, detail panel)

     - permissions.json (role → tool matrix)

   - Expose as MCP resources: org://{org_id}/journeys, org://{org_id}/roles

3. **Admin Account Setup**:
   - Create first user: role=org_owner, status=active

   - Generate SSO invite link or temporary password

   - Send email: "Welcome to Airlock – Complete Setup"

**Time**: \~30 seconds (automated)

**Phase 1: Initial Admin Login & Workspace Configuration**

**Step 1.1: Admin Authentication**

**Stakeholder Action**: Click invite link → log in via email or G Suite SSO

**Technical Flow**:

User clicks link  
↓  
If G Suite SSO:

- OAuth flow → Google IdP

- Return user_id, email, org_id

- Create/update user record

- Assign org_owner role

- Trigger Google Workspace MCP server OAuth grant  
  Else email:

- Verify token → create session

- Prompt password setup  
  ↓  
  MCP context server: resolve_user_permissions(user_id, org_id)  
  ↓  
  Return: roles=\[org_owner\], workspaces=\[default\], layouts=\[admin_dashboard\]  
  ↓  
  Shell renders: Welcome screen \+ setup wizard

**UI Rendered**:

- Welcome modal: "Let's set up your workspace"

- Steps preview: Integrations → Team → Data Mapping → Testing

- CTA: "Start Setup"

**Time**: 2 minutes

**Step 1.2: Workspace Branding & Basic Config**

**Stakeholder Action**: Configure workspace name, logo, timezone, domain

**UI Fields**:

- Workspace Name: \[Acme Entertainment\]

- Logo Upload: \[Browse...\] (stored in gs://airlock-assets/{org_id}/)

- Timezone: \[America/Los_Angeles\] (dropdown)

- Custom Domain (optional): airlock.acme.com (CNAME verification)

**MCP Tool Call**:

{  
"tool": "update_org_config",  
"params": {  
"org_id": "uuid",  
"name": "Acme Entertainment",  
"logo_url": "[https://assets.airlock.io/org-uuid/logo.png](https://assets.airlock.io/org-uuid/logo.png)",  
"timezone": "America/Los_Angeles",  
"domain": "[airlock.acme.com](http://airlock.acme.com)"  
}  
}

**Time**: 3 minutes

**Step 1.3: Enable Integrations**

**Stakeholder Action**: Turn on Google Workspace, JIRA, optional CRM

**UI Design** (Playwright components: integration cards grid):

╔══════════════════════════════════════════════════════════╗  
║ Available Integrations ║  
╠══════════════════════════════════════════════════════════╣  
║ \[Google Workspace\] \[Enabled ✓\] \[Configure\] ║  
║ Sync Gmail, Drive, Calendar, Meet ║  
║ Status: 24 users synced ║  
║ ║  
║ \[JIRA Cloud\] \[Disabled\] \[Enable\] ║  
║ Bi-directional task sync, user provisioning ║  
║ Requires: Atlassian admin approval ║  
║ ║  
║ \[Salesforce\] \[Disabled\] \[Enable\] ║  
║ CRM contacts, deals, pipeline sync ║  
║ Premium feature ║  
╚══════════════════════════════════════════════════════════╝

**Google Workspace Setup Flow**\[web:48\]\[web:51\]\[web:71\]:

1. Click "Enable" → OAuth consent screen

2. Select Google admin account

3. Grant scopes:
   - https://www.googleapis.com/auth/admin.directory.user.readonly

   - https://www.googleapis.com/auth/gmail.readonly

   - https://www.googleapis.com/auth/drive.readonly

   - https://www.googleapis.com/auth/calendar

4. Redirect back → MCP context server registers Google Workspace MCP server

5. Trigger initial sync:
   - Fetch users from Google Directory API

   - Create Airlock user records (role=member by default)

   - Map Google Groups → Airlock Groups

6. Display sync status: "24 users imported, 3 groups mapped"

**JIRA Setup Flow**\[web:59\]\[web:62\]\[web:68\]:

1. Click "Enable" → Atlassian OAuth

2. Select JIRA instance (Cloud/Server)

3. Grant permissions: read users, read/write issues, read projects

4. Map JIRA projects → Airlock workspaces:
   - Auto-suggest: "ACME-ENG" → "Engineering Workspace"

   - Admin confirms mappings

5. Start bi-directional sync:
   - Import open issues → Airlock tasks

   - Map JIRA users to Airlock users (by email)

   - Subscribe to webhooks: issue.created, issue.updated

**MCP Server Registry Update**:

{  
"tool": "register_mcp_server",  
"params": {  
"org_id": "uuid",  
"server_id": "google-workspace",  
"server_type": "integration",  
"oauth_client_id": "google-client-id",  
"scopes": \["directory.readonly", "gmail.readonly", "drive.readonly", "calendar"\],  
"enabled_workspaces": \["default"\]  
}  
}

**Time**: 8 minutes (Google \+ JIRA)

**Phase 2: Team Configuration & Role Assignment**

**Step 2.1: User Import & Role Mapping**

**Stakeholder Action**: Review imported users, assign roles

**UI Design** (Playwright table component with inline editing):

╔═══════════════════════════════════════════════════════════════════════╗  
║ Users (24) \[Invite New User\] ║  
╠═══════════════════════════════════════════════════════════════════════╣  
║ Name Email Role Status Actions ║  
║ ────────────────────────────────────────────────────────────────────║  
║ John Smith [john@acme.com](mailto:john@acme.com) \[Admin ▼\] Active \[Edit\] ║  
║ Sarah Lee [sarah@acme.com](mailto:sarah@acme.com) \[Manager▼\] Active \[Edit\] ║  
║ Mike Johnson [mike@acme.com](mailto:mike@acme.com) \[Member ▼\] Active \[Edit\] ║  
║ ... ║  
╚═══════════════════════════════════════════════════════════════════════╝

**Role Definitions** (from seeded roles.json):

| Role    | Permissions                                   | Use Case             |
| :------ | :-------------------------------------------- | :------------------- |
| Owner   | Full admin, billing, delete org               | Founder, CTO         |
| Admin   | User management, integrations, config         | IT lead              |
| Manager | Create workspaces, assign tasks, approve docs | Department heads     |
| Member  | Access assigned workspaces, create tasks      | ICs                  |
| Guest   | Read-only, invited to specific workspaces     | Contractors, clients |

**Bulk Actions**:

- Select Google Group → assign role to all members

- Example: "Engineering Team" group → all members get "Member" role \+ added to "Engineering Workspace"

**MCP Tool Calls**:

\[  
{  
"tool": "update_user_role",  
"params": {"user_id": "user-uuid-1", "role": "admin"}  
},  
{  
"tool": "bulk_assign_group_role",  
"params": {"group_id": "eng-team", "role": "member", "workspace_id": "eng-workspace"}  
}  
\]

**Time**: 10 minutes

**Step 2.2: Workspace Creation & Permissions**

**Stakeholder Action**: Create workspaces (channels/rooms) with permissions

**Workspace Types** (inspired by Discord channels \+ OrchestrateOS Vaults):

1. **Public Workspace**: All org members can see/join

2. **Private Workspace**: Invite-only, hidden from directory

3. **Department Workspace**: Tied to Google Group membership

4. **Deal Room**: Auto-created per CRM deal, lifecycle-managed

**Creation Flow**:

Click "Create Workspace"  
↓  
Modal:

- Name: \[Engineering Projects\]

- Type: \[Department ▼\]

- Linked Group: \[eng-team ▼\]

- Default Permissions:  
  ☑ Members can create tasks  
  ☑ Members can upload files  
  ☐ Members can approve contracts

- Enabled Integrations:  
  ☑ Google Drive folder: \[/Shared Drives/Engineering\]  
  ☑ JIRA project: \[ACME-ENG\]  
  ☐ Slack channel sync  
  ↓  
  MCP Call: create_workspace(name, type, group_id, permissions, integrations)  
  ↓  
  Result:

- Workspace created

- Permissions matrix stored in context server

- 18 users auto-added (from eng-team group)

- Drive folder mounted, JIRA sync started

**Permission Matrix Example** (stored in MCP context server):

{  
"workspace_id": "eng-workspace",  
"permissions": {  
"member": {  
"tasks": \["read", "create", "update_own"\],  
"contracts": \["read"\],  
"files": \["read", "upload"\],  
"tools": \["calendar.read", "email.send", "jira.sync"\]  
},  
"manager": {  
"tasks": \["read", "create", "update", "delete", "assign"\],  
"contracts": \["read", "create", "approve"\],  
"files": \["read", "upload", "delete"\],  
"tools": \["calendar.read", "calendar.write", "email.send", "jira.admin"\]  
}  
}  
}

**Time**: 12 minutes (3 workspaces)

**Phase 3: Data Mapping & Tool Configuration**

**Step 3.1: Schema Mapping (The "We Don't Care What You Call It" Layer)**

**Stakeholder Action**: Map external data → Airlock core types

**Core Airlock Types** (from canonical schema):

- **Company**: Organizations/accounts

- **Contact**: People

- **Deal**: Sales opportunities

- **Task**: Work items (from JIRA, Asana, or native)

- **Artifact**: Files/documents

- **Message**: Communications

- **Event**: Calendar entries

**UI Design** (Playwright mapping wizard):

╔═══════════════════════════════════════════════════════════════╗  
║ Map JIRA Fields → Airlock Tasks ║  
╠═══════════════════════════════════════════════════════════════╣  
║ JIRA Field → Airlock Field Confidence ║  
║ ────────────────────────────────────────────────────────────║  
║ Summary → \[title ▼\] ● Auto-mapped ║  
║ Description → \[description ▼\] ● Auto-mapped ║  
║ Assignee → \[assigned_to ▼\] ● Auto-mapped ║  
║ Status → \[status ▼\] ○ Review needed║  
║ \- To Do → draft ║  
║ \- In Progress → in_progress ║  
║ \- Done → completed ║  
║ Priority → \[priority ▼\] ● Auto-mapped ║  
║ Story Points → \[custom.effort ▼\] ○ Custom field║  
║ ║  
║ \[Advanced\] Custom field mapping ║  
╚═══════════════════════════════════════════════════════════════╝

**MCP Context Server Stores Mapping**:

{  
"tool": "save_data_mapping",  
"params": {  
"org_id": "uuid",  
"source": "jira",  
"entity_type": "task",  
"mappings": {  
"summary": "title",  
"description": "description",  
"assignee.emailAddress": "assigned_to.email",  
"[status.name](http://status.name)": {  
"field": "status",  
"transform": {  
"To Do": "draft",  
"In Progress": "in_progress",  
"Done": "completed"  
}  
}  
}  
}  
}

**Time**: 8 minutes (JIRA \+ Google Drive mappings)

**Step 3.2: Canonical Journeys Configuration**

**Stakeholder Action**: Review/customize workflow lifecycles

**Default Journeys** (from seeded journeys.json):

1. **Contract Lifecycle**: Draft → Review → Legal Approval → Signature → Active → Renewal

2. **Deal Pipeline**: Lead → Qualified → Proposal → Negotiation → Closed Won/Lost

3. **Task Flow**: Backlog → In Progress → Review → Done

**UI Design** (visual journey editor \- Playwright canvas component):

╔═══════════════════════════════════════════════════════════════════╗  
║ Contract Lifecycle Journey \[Edit\] \[Test\]║  
╠═══════════════════════════════════════════════════════════════════╣  
║ ║  
║ ┌────────┐ ┌────────┐ ┌────────┐ ┌─────────┐ ║  
║ │ Draft │ ──\> │ Review │ ──\> │ Legal │ ──\> │ Signed │ ║  
║ └────────┘ └────────┘ └────────┘ └─────────┘ ║  
║ │ │ │ ║  
║ ↓ ↓ ↓ ║  
║ \[Create\] \[Assign\] \[AI Check\] \[E-signature\] ║  
║ \[Upload\] \[Comment\] \[Redline\] \[Notify parties\] ║  
║ ║  
║ Permissions per stage: ║  
║ \- Draft: Creator \+ Managers ║  
║ \- Review: Assigned reviewer ║  
║ \- Legal: Legal team only ║  
║ \- Signed: Read-only for all ║  
╚═══════════════════════════════════════════════════════════════════╝

**Customization Options**:

- Add/remove stages

- Define transition rules (e.g., "Legal → Signed requires 2 approvals")

- Attach automation tools (e.g., "On Draft → Review, call OCR engine")

- Set stage-specific permissions

**MCP Storage**:

{  
"tool": "update_journey",  
"params": {  
"org_id": "uuid",  
"journey_id": "contract-lifecycle",  
"stages": \[  
{  
"id": "draft",  
"name": "Draft",  
"permissions": {"roles": \["manager", "admin"\]},  
"actions": \["create_contract", "upload_file"\]  
},  
{  
"id": "review",  
"name": "Review",  
"transitions_from": \["draft"\],  
"permissions": {"roles": \["assigned_reviewer"\]},  
"actions": \["comment", "request_changes", "approve"\],  
"automation": {  
"on_enter": \["tools.ocr_extraction", "tools.clause_detection"\]  
}  
}  
\]  
}  
}

**Time**: 15 minutes (3 journeys configured)

**Phase 4: Component Library & UI Configuration**

**Step 4.1: Playwright Component Integration**

**Stakeholder Action**: Select default views for each workspace type

**Available Components** (Playwright library \+ MCP Apps):

| Component          | Use Case                       | Integrations                   |
| :----------------- | :----------------------------- | :----------------------------- |
| **KanbanBoard**    | Task management, deal pipeline | JIRA, native tasks             |
| **TableViewer**    | Data grids, reports            | Google Sheets, CSV import      |
| **CalendarView**   | Meetings, deadlines            | Google Calendar, native events |
| **DocEditor**      | Rich text, contracts           | TipTap \+ Google Docs sync     |
| **FileExplorer**   | Document management            | Google Drive, native storage   |
| **ChatPanel**      | Communications                 | Slack sync, native messages    |
| **DashboardCards** | KPIs, metrics                  | Custom queries, AI insights    |

**Configuration UI**:

╔═══════════════════════════════════════════════════════════════════╗  
║ Engineering Workspace \- Default Layout ║  
╠═══════════════════════════════════════════════════════════════════╣  
║ Sidebar (left): ║  
║ ☑ Workspaces tree ║  
║ ☑ Recent tasks ║  
║ ☑ Assigned to me ║  
║ ║  
║ Main View (center): ║  
║ Primary: \[KanbanBoard ▼\] (JIRA-synced tasks) ║  
║ Secondary: \[TableViewer ▼\] (Sprint planning sheet) ║  
║ ║  
║ Detail Panel (right): ║  
║ ☑ Task details ║  
║ ☑ File attachments (Google Drive) ║  
║ ☑ Activity feed ║  
║ ☑ AI assistant ║  
║ ║  
║ \[Preview Layout\] \[Save as Default\] ║  
╚═══════════════════════════════════════════════════════════════════╝

**MCP Context Server Storage**:

{  
"tool": "save_workspace_layout",  
"params": {  
"org_id": "uuid",  
"workspace_id": "eng-workspace",  
"layout": {  
"sidebar": {  
"components": \["workspace_tree", "recent_tasks", "assigned_tasks"\]  
},  
"main": {  
"primary": {  
"component": "kanban_board",  
"data_source": "jira",  
"config": {"columns": \["backlog", "in_progress", "review", "done"\]}  
},  
"secondary": {  
"component": "table_viewer",  
"data_source": "google_sheets",  
"sheet_id": "sprint-planning-sheet-id"  
}  
},  
"detail_panel": {  
"components": \["task_detail", "file_attachments", "activity_feed", "ai_assistant"\]  
}  
}  
}  
}

**Time**: 10 minutes (per workspace type)

**Step 4.2: View Permissions & Tool Visibility**

**Stakeholder Action**: Configure which roles see which UI components/tools

**Permission Mapping** (Discord-style):

╔═══════════════════════════════════════════════════════════════════╗  
║ Role: Member (Engineering Workspace) ║  
╠═══════════════════════════════════════════════════════════════════╣  
║ Visible Components: Tools Accessible: ║  
║ ☑ KanbanBoard (read/write own) ☑ jira.update_issue ║  
║ ☑ TableViewer (read-only) ☑ calendar.read ║  
║ ☑ CalendarView (read/write own) ☑ drive.upload ║  
║ ☑ DocEditor (read/write own) ☑ email.send ║  
║ ☑ FileExplorer (read \+ upload) ☑ ai.ask_question ║  
║ ☐ DashboardCards (admin only) ☐ contracts.approve ║  
║ ☑ ChatPanel (read/write) ☐ user.manage ║  
║ ☑ AI Assistant (ask only) ☐ analytics.export ║  
╚═══════════════════════════════════════════════════════════════════╝

**MCP Enforcement**:

- When user loads workspace, MCP context server returns only allowed components

- Shell renders only those components

- Tool calls blocked at MCP gateway if user lacks permission

**Time**: 5 minutes (review defaults, adjust)

**Phase 5: Testing & Validation**

**Step 5.1: Invite Test Users**

**Stakeholder Action**: Invite 2-3 colleagues to test

**Invite Flow**:

Click "Invite Users" → Modal:

- Enter emails: [sarah@acme.com](mailto:sarah@acme.com), [mike@acme.com](mailto:mike@acme.com)

- Assign role: \[Member ▼\]

- Add to workspaces: \[✓\] Engineering, \[✓\] General

- Message: "Hey team, please test our new Airlock workspace\!"  
  \[Send Invites\]  
  ↓  
  MCP calls: create_invite_links(emails, role, workspaces)  
  ↓  
  Email sent with:

- Personalized message

- One-click setup link

- "What to expect" instructions

**Test User Experience**:

1. Click invite link

2. G Suite SSO login (auto-provisioned from earlier sync)

3. Land in "Engineering Workspace"

4. See:
   - KanbanBoard with their JIRA tasks already synced

   - CalendarView with their Google Calendar events

   - AI Assistant in right panel: "Hi Sarah\! Ask me anything."

5. Create a test task → syncs to JIRA within seconds

6. Upload a file → appears in Google Drive folder

7. Leave feedback: "This is way cleaner than switching between 5 tools\!"

**Time**: 15 minutes (invite \+ test users explore)

**Step 5.2: Workflow Simulation**

**Stakeholder Action**: Run through a canonical journey end-to-end

**Test Scenario**: Contract approval flow

1. Admin creates new contract in "Contracts Workspace"

2. Uploads draft PDF → OCR extraction runs (via MCP contract engine)

3. AI detects clauses, highlights key terms

4. Admin assigns to Legal Manager for review

5. Legal Manager sees task in their queue, opens doc

6. Makes redline edits in TipTap editor

7. Approves → transitions to "Legal Approved" stage

8. Admin sends for e-signature (MCP tool: esign.send_envelope)

9. All parties notified via email (from Google Workspace MCP)

10. Contract moves to "Signed" → appears in CRM as closed deal

**Validation**:

- Each stage transition logs to audit trail

- Permissions enforced: IC cannot skip to "Signed"

- Data synced: JIRA updated, Drive folder organized, calendar event created

- AI assisted: "Would you like me to summarize changes?"

**Time**: 12 minutes

**Step 5.3: Performance & Sync Validation**

**Stakeholder Action**: Check data sync status, run diagnostics

**UI Dashboard** (admin-only):

╔═══════════════════════════════════════════════════════════════════╗  
║ System Health & Sync Status ║  
╠═══════════════════════════════════════════════════════════════════╣  
║ ✓ Google Workspace: 24 users, 156 events, last sync 2 min ago ║  
║ ✓ JIRA: 89 tasks synced, 3 projects, last sync 30 sec ago ║  
║ ⚠ Salesforce: Not configured ║  
║ ║  
║ Active Sessions: 5 users online ║  
║ MCP Servers: 3 connected (context, google, jira) ║  
║ Average Response Time: 240ms ║  
║ ║  
║ \[Run Full Sync\] \[View Logs\] \[Export Config\] ║  
╚═══════════════════════════════════════════════════════════════════╝

**Diagnostic Tools**:

- Test MCP connectivity

- Validate OAuth tokens

- Check permission conflicts

- Simulate high load (10 concurrent users)

**Time**: 5 minutes

**Phase 6: Production Activation (The "Turn On the Faucet" Moment)**

**Step 6.1: Review & Subscribe**

**Stakeholder Action**: Review setup, select premium plan

**Setup Summary Screen**:

╔═══════════════════════════════════════════════════════════════════╗  
║ Your Airlock is Ready\! 🎉 ║  
╠═══════════════════════════════════════════════════════════════════╣  
║ ✓ 24 users configured ║  
║ ✓ 3 workspaces created ║  
║ ✓ Google Workspace \+ JIRA integrated ║  
║ ✓ 89 tasks synced ║  
║ ✓ Contract lifecycle configured ║  
║ ✓ Test users validated flows ║  
║ ║  
║ Current Plan: Free (14-day trial) ║  
║ \- Limited to 25 users ║  
║ \- 5 GB storage ║  
║ \- Basic AI (100 queries/day) ║  
║ ║  
║ Upgrade to Premium: ║  
║ \- Unlimited users ($15/user/month) ║  
║ \- Unlimited storage ║  
║ \- Advanced AI engines (unlimited) ║  
║ \- Contract OCR, clause detection ║  
║ \- Custom automation pipelines ║  
║ \- Priority support ║  
║ ║  
║ \[Continue Free Trial\] \[Upgrade Now\] ║  
╚═══════════════════════════════════════════════════════════════════╝

**Upgrade Flow**:

- Click "Upgrade Now"

- Billing info (Stripe integration)

- Confirm seats: 24 users × $15 \= $360/month

- Activate premium MCP servers:
  - Contract engine (OCR, extraction, clause detection)

  - Advanced CRM engine (AI scoring, forecasting)

  - Automation pipelines (background jobs, webhooks)

  - Knowledge engine (vector indexing, semantic search)

**MCP Activation**:

{  
"tool": "activate_premium_servers",  
"params": {  
"org_id": "uuid",  
"plan": "premium",  
"servers": \["contracts", "crm_advanced", "automation", "knowledge"\]  
}  
}

**Result**:

- All MCP domain servers come online

- AI query limits removed

- Heavy compute enabled

- Full tool registry unlocked

**Time**: 5 minutes

**Step 6.2: Rollout to Full Team**

**Stakeholder Action**: Announce to entire org, enable for all users

**Rollout Strategy**:

1. **Phase 1: Pilot group** (already done \- 3 test users)

2. **Phase 2: Department leads** (Managers, 8 users) \- now

3. **Phase 3: Full org** (all 24 users) \- 1 week later

**Announcement Template** (auto-generated):

Subject: Welcome to Airlock – Your New Unified Workspace

Hi Team,

We're excited to launch Airlock, our new unified workspace that brings together:  
✓ JIRA tasks  
✓ Google Calendar & Drive  
✓ Contract management  
✓ AI-powered assistance

Getting Started:

1. Check your email for your invite link

2. Log in with your @acme.com Google account

3. Watch the 2-minute intro video

4. Join your first workspace: Engineering / Sales / Ops

Questions? Ask the AI assistant or ping me\!

– \[Admin Name\]

**Monitoring**:

- Track login rate (24/24 users logged in within 48 hours)

- Measure engagement (avg 45 min/day in Airlock)

- Collect feedback (NPS survey after 1 week)

**Time**: 3 minutes (send announcement)

**Step 6.3: Configure Advanced Automation (Post-Launch)**

**Stakeholder Action**: Set up background jobs, alerts, AI agents

**Automation Examples**:

1. **Contract Drift Detection**:
   - Watch Google Drive folder for contract edits

   - If file modified → trigger OCR diff

   - If clauses changed → alert Legal team

   - MCP tool chain: drive.watch → contracts.diff → comms.alert

2. **Deal Pipeline Automation**:
   - When deal moves to "Proposal" stage

   - Auto-generate proposal doc from template

   - Attach pricing sheet from CRM

   - Schedule follow-up meeting (Calendar AI)

   - MCP tool chain: crm.on_stage_change → docs.generate → calendar.schedule

3. **JIRA Sync Health Check**:
   - Every 4 hours: validate JIRA → Airlock task mapping

   - If sync lag \> 5 minutes → alert admin

   - MCP tool: jira.validate_sync → alerts.send

**Configuration UI**:

╔═══════════════════════════════════════════════════════════════════╗  
║ Automations (3 active) \[Create New\] ║  
╠═══════════════════════════════════════════════════════════════════╣  
║ Contract Drift Detection \[✓\] ║  
║ Trigger: Google Drive file modified ║  
║ Actions: OCR diff → alert Legal team ║  
║ Status: Running (last run: 5 min ago) ║  
║ ║  
║ Deal Pipeline Auto-Docs \[✓\] ║  
║ Trigger: CRM deal stage \= "Proposal" ║  
║ Actions: Generate doc → attach pricing → schedule meeting ║  
║ Status: Running (3 runs today) ║  
║ ║  
║ JIRA Sync Monitor \[✓\] ║  
║ Trigger: Schedule (every 4 hours) ║  
║ Actions: Validate sync → alert if lag \> 5 min ║  
║ Status: Healthy (last check: 18 min ago) ║  
╚═══════════════════════════════════════════════════════════════════╝

**Time**: 20 minutes (3 automations configured)

**Phase 7: Ongoing Configuration & Extension**

**Developer Community Integration**

**Stakeholder Action**: Install community-built engines from marketplace

**Airlock Marketplace** (future vision):

╔═══════════════════════════════════════════════════════════════════╗  
║ Airlock Engine Marketplace ║  
╠═══════════════════════════════════════════════════════════════════╣  
║ \[Featured\] \[Most Popular\] \[New Releases\] \[My Engines\] ║  
║ ║  
║ 📊 Advanced Analytics Engine 4.8⭐ (124) ║  
║ by DataViz Co ║  
║ Custom dashboards, predictive forecasting ║  
║ \[Install\] $49/month ║  
║ ║  
║ 🤖 Multi-Agent Orchestrator 4.9⭐ (89) ║  
║ by Otto AI (official) ║  
║ Autonomous task routing, personality matrices ║  
║ \[Install\] Free (open-source) ║  
║ ║  
║ 📝 Legal Clause Library 4.7⭐ (156) ║  
║ by LegalTech Inc ║  
║ Pre-approved clause templates, compliance checks ║  
║ \[Install\] $99/month ║  
╚═══════════════════════════════════════════════════════════════════╝

**Installation Flow**:

1. Click "Install" → review permissions requested

2. Accept → MCP server added to org registry

3. Configure integration: map to workspaces, set roles

4. New tools appear in relevant workspace layouts

5. Developer-provided UI (MCP Apps) renders in detail panel

**Extension Development** (for 3rd parties):

// Example: Custom "Sales Forecasting" MCP server  
export const salesForecastingServer \= {  
name: "sales-forecasting",  
version: "1.0.0",  
tools: \[  
{  
name: "predict_quarterly_revenue",  
description: "AI-powered revenue forecast",  
inputSchema: { /\* params

_/ },handler: async (params) \=\> {// Access Airlock CRM data via shared contextconst deals \= await airlockContext.getDeals(params.quarter);const forecast \= await runMLModel(deals);return forecast;}}\],resources: \[{uri: "forecast://ui/dashboard",name: "Forecast Dashboard",mimeType: "application/vnd.mcp.app+json",content: { /_ MCP App UI definition \*/ }  
}  
\]  
};

**Total Onboarding Time Breakdown**

| Phase                      | Activities                        | Stakeholder Time | Automated Time |
| :------------------------- | :-------------------------------- | :--------------- | :------------- |
| 0\. Pre-Onboarding         | Tenant provisioning               | 0 min            | 0.5 min        |
| 1\. Initial Login & Config | Auth, branding, integrations      | 13 min           | 2 min          |
| 2\. Team Configuration     | User/role mapping, workspaces     | 22 min           | 1 min          |
| 3\. Data Mapping           | Schema mapping, journey config    | 23 min           | 0 min          |
| 4\. UI Configuration       | Component selection, permissions  | 15 min           | 0 min          |
| 5\. Testing                | Invite users, workflow simulation | 32 min           | 0 min          |
| 6\. Activation             | Upgrade, rollout, automation      | 28 min           | 1 min          |
| **TOTAL**                  | **Zero to Production**            | **133 min**      | **4.5 min**    |

**Realistic timeline: 2 hours 13 minutes** (stakeholder active time) for a fully configured, testable, production-ready Airlock workspace.

**Technical Requirements Satisfied**

**Playwright Component Integration\[web:57\]\[web:60\]\[web:66\]**

- Components exposed as reusable modules in shell

- MCP Apps protocol for custom domain UIs

- Context-aware rendering based on permissions

- Supported components: KanbanBoard, TableViewer, CalendarView, DocEditor (TipTap), FileExplorer, ChatPanel, DashboardCards

**Google Workspace Deep Integration\[web:48\]\[web:51\]\[web:70\]\[web:71\]**

- Per-user OAuth 2.1 for Gmail, Drive, Calendar, Meet

- Automatic zero-touch onboarding via G Suite SSO

- User/group sync every 4 hours (manual trigger available)

- Drive folder mounting per workspace

- Calendar bi-directional sync

**JIRA Synchronization\[web:59\]\[web:62\]\[web:68\]**

- OAuth-based connection (Cloud/Server)

- Bi-directional task sync (webhook-driven)

- User provisioning from Google Workspace

- Project → Workspace mapping

- Custom field mapping UI

**MCP Server Architecture\[web:42\]\[web:46\]\[web:49\]**

- Multi-tenant context server (org-scoped config)

- Domain servers: Google, JIRA, contracts, CRM, knowledge

- JSON-based config as MCP resources

- Tool/resource discovery per session

- OAuth 2.1 authorization per user per server

**Zero-Touch Onboarding Pattern\[web:58\]\[web:61\]\[web:64\]\[web:67\]\[web:70\]**

- Automated tenant provisioning (\<30 sec)

- SSO-based user import (Google admin directory)

- Pre-configured defaults (roles, journeys, layouts)

- Guided setup wizard (progressive disclosure)

- Self-service admin configuration

**Post-Launch Success Metrics**

**Stakeholder KPIs** (measured after 30 days):

| Metric                      | Target             | Measurement                                          |
| :-------------------------- | :----------------- | :--------------------------------------------------- |
| User adoption rate          | \>90%              | Users logged in / Total invited                      |
| Daily active usage          | \>30 min/user      | Avg session time in Airlock                          |
| Tool consolidation          | 3-5 tools replaced | Pre-Airlock tool count → Post-Airlock                |
| Context switching reduction | 50% decrease       | Tab switches / Tasks completed                       |
| Task throughput             | 25% increase       | Tasks completed per week (before/after)              |
| Time to onboard new hire    | \<30 min           | From invite to productive (vs 2-3 hours pre-Airlock) |
| Admin config time           | \<15 min/user      | Time to provision new user \+ workspace access       |

**Technical Health Metrics**:

- MCP server uptime: \>99.9%

- Sync lag (JIRA, Google): \<2 minutes p95

- API response time: \<300ms p95

- Failed auth rate: \<0.1%

**Appendix: Detailed JSON Config Examples**

**roles.json (Seeded Defaults)**

{  
"roles": \[  
{  
"id": "org_owner",  
"name": "Owner",  
"description": "Full administrative access, billing, org deletion",  
"permissions": {  
"org": \["read", "write", "delete", "billing"\],  
"users": \["read", "create", "update", "delete"\],  
"workspaces": \["read", "create", "update", "delete"\],  
"integrations": \["read", "create", "update", "delete"\],  
"all_tools": true  
}  
},  
{  
"id": "admin",  
"name": "Admin",  
"description": "User management, integrations, configuration",  
"permissions": {  
"org": \["read"\],  
"users": \["read", "create", "update"\],  
"workspaces": \["read", "create", "update"\],  
"integrations": \["read", "create", "update"\],  
"tools": \["

_"\]}},{"id": "manager","name": "Manager","description": "Create workspaces, assign tasks, approve documents","permissions": {"workspaces": \["read", "create", "update_own"\],"tasks": \["read", "create", "update", "assign"\],"contracts": \["read", "create", "approve"\],"tools": \["tasks._", "contracts._", "calendar._", "drive.\*", "ai.ask"\]  
}  
},  
{  
"id": "member",  
"name": "Member",  
"description": "Access assigned workspaces, create tasks",  
"permissions": {  
"workspaces": \["read_assigned"\],  
"tasks": \["read", "create", "update_own"\],  
"contracts": \["read"\],  
"tools": \["tasks.read", "tasks.update_own", "calendar.read", "drive.upload", "ai.ask"\]  
}  
},  
{  
"id": "guest",  
"name": "Guest",  
"description": "Read-only access to specific workspaces",  
"permissions": {  
"workspaces": \["read_invited"\],  
"tasks": \["read"\],  
"contracts": \["read"\],  
"tools": \["ai.ask"\]  
}  
}  
\]  
}

**journeys.json (Contract Lifecycle Example)**

{  
"journeys": \[  
{  
"id": "contract-lifecycle",  
"name": "Contract Lifecycle",  
"description": "Standard contract approval workflow",  
"entity_type": "contract",  
"stages": \[  
{  
"id": "draft",  
"name": "Draft",  
"description": "Initial contract creation",  
"permissions": {  
"roles": \["manager", "admin"\],  
"actions": \["create", "edit", "upload"\]  
},  
"automation": {  
"on_enter": \[\]  
},  
"transitions": \[  
{"to": "review", "label": "Submit for Review", "conditions": \["has_file"\]}  
\]  
},  
{  
"id": "review",  
"name": "Review",  
"description": "Manager review and edits",  
"permissions": {  
"roles": \["assigned_reviewer", "admin"\],  
"actions": \["read", "comment", "edit", "request_changes", "approve"\]  
},  
"automation": {  
"on_enter": \[  
{"tool": "contracts.ocr_extract", "params": {}},  
{"tool": "contracts.detect_clauses", "params": {}},  
{"tool": "notifications.assign_reviewer", "params": {}}  
\]  
},  
"transitions": \[  
{"to": "draft", "label": "Request Changes"},  
{"to": "legal", "label": "Send to Legal", "conditions": \["approved_by_reviewer"\]}  
\]  
},  
{  
"id": "legal",  
"name": "Legal Approval",  
"description": "Legal team review",  
"permissions": {  
"roles": \["legal", "admin"\],  
"actions": \["read", "comment", "redline", "approve", "reject"\]  
},  
"automation": {  
"on_enter": \[  
{"tool": "contracts.compliance_check", "params": {}},  
{"tool": "notifications.alert_legal", "params": {}}  
\]  
},  
"transitions": \[  
{"to": "review", "label": "Return to Review"},  
{"to": "signature", "label": "Send for Signature", "conditions": \["approved_by_legal"\]}  
\]  
},  
{  
"id": "signature",  
"name": "Awaiting Signature",  
"description": "E-signature collection",  
"permissions": {  
"roles": \["signers", "admin"\],  
"actions": \["read", "sign"\]  
},  
"automation": {  
"on_enter": \[  
{"tool": "esign.create_envelope", "params": {}},  
{"tool": "notifications.request_signatures", "params": {}}  
\],  
"on_exit": \[  
{"tool": "contracts.finalize", "params": {}},  
{"tool": "crm.update_deal_status", "params": {"status": "closed_won"}}  
\]  
},  
"transitions": \[  
{"to": "signed", "label": "Complete", "conditions": \["all_signed"\]}  
\]  
},  
{  
"id": "signed",  
"name": "Signed",  
"description": "Executed contract",  
"permissions": {  
"roles": \["all"\],  
"actions": \["read"\]  
},  
"automation": {  
"on_enter": \[  
{"tool": "drive.archive", "params": {"folder": "Executed Contracts"}},  
{"tool": "calendar.create_renewal_reminder", "params": {"advance_days": 90}},  
{"tool": "notifications.alert_stakeholders", "params": {}}  
\]  
},  
"transitions": \[\]  
}  
\]  
}  
\]  
}

**layouts.json (Engineering Workspace Example)**

{  
"layouts": \[  
{  
"workspace_id": "eng-workspace",  
"name": "Engineering Workspace Layout",  
"roles": \["member", "manager", "admin"\],  
"layout": {  
"sidebar": {  
"width": "240px",  
"components": \[  
{  
"type": "workspace_tree",  
"config": {"show_private": false}  
},  
{  
"type": "recent_tasks",  
"config": {"limit": 5}  
},  
{  
"type": "assigned_tasks",  
"config": {"filter": "assigned_to_me"}  
}  
\]  
},  
"main": {  
"tabs": \[  
{  
"id": "board",  
"label": "Board",  
"component": {  
"type": "kanban_board",  
"data_source": "jira",  
"config": {  
"project": "ACME-ENG",  
"columns": \["backlog", "in_progress", "review", "done"\],  
"group_by": "assignee"  
}  
}  
},  
{  
"id": "sprint",  
"label": "Sprint Planning",  
"component": {  
"type": "table_viewer",  
"data_source": "google_sheets",  
"config": {  
"sheet_id": "sprint-planning-sheet-id",  
"editable": true  
}  
}  
},  
{  
"id": "calendar",  
"label": "Calendar",  
"component": {  
"type": "calendar_view",  
"data_source": "google_calendar",  
"config": {  
"calendars": \["eng-team-calendar", "personal"\],  
"default_view": "week"  
}  
}  
}  
\]  
},  
"detail_panel": {  
"width": "400px",  
"components": \[  
{  
"type": "task_detail",  
"config": {"show_comments": true, "show_attachments": true}  
},  
{  
"type": "file_attachments",  
"config": {"source": "google_drive"}  
},  
{  
"type": "activity_feed",  
"config": {"limit": 10}  
},  
{  
"type": "ai_assistant",  
"config": {"model": "gpt-4", "context": "workspace"}  
}  
\]  
}  
}  
}  
\]  
}

**Conclusion**

This turnkey onboarding flow transforms Airlock from "interesting concept" to "fully operational unified workspace" in approximately **2 hours of stakeholder time**. The architecture leverages:

1. **MCP as the control plane**: All config, permissions, tools centralized

2. **Playwright components**: Reusable, context-aware UI primitives

3. **Zero-touch sync**: Google Workspace \+ JIRA auto-import users/data

4. **JSON-driven extensibility**: Canonical journeys, layouts, roles as code

5. **Freemium activation**: Free shell → premium engines on demand

**Key success factors**:

- Minimize stakeholder decisions through smart defaults

- Automate infrastructure (provisioning, sync, auth)

- Progressive disclosure (essential config first, advanced later)

- Immediate value (see synced data within minutes)

- Clear upgrade path (test free, activate premium when ready)

The stakeholder leaves Phase 6 with a **production-ready Airlock** where:

- ✅ All users provisioned and authenticated

- ✅ JIRA \+ Google Workspace fully synced

- ✅ Workflows configured to org processes

- ✅ UI personalized per role

- ✅ AI engines operational

- ✅ Team actively using it

**Next milestone**: 30-day check-in to measure adoption, gather feedback, configure advanced automations, and expand to additional departments or integrations.

**CANVAS_OLD_STR**
