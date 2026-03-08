# Airlock Module Walkthroughs

> **Audience:** Stakeholders evaluating Airlock's feature set -- product leaders, potential customers, technical evaluators, and internal team members.
>
> **Purpose:** A vivid, screen-by-screen walkthrough of each module. This document describes what users actually see and do inside Airlock, not abstract architecture. Read this to understand the product experience.

---

## How Airlock Is Organized

Before diving into individual modules, here is how the platform fits together.

Airlock uses a Discord-inspired shell. A vertical icon bar on the far left lets you switch between **Modules** -- the five major functional domains: Contracts, CRM, Tasks, Calendar, and Documents. Each module has its own sidebar, its own set of views, and its own workflow.

Inside each module, work is organized into **Vaults**. A vault is a single workflow instance -- one specific contract, one specific account, one specific deal. Vaults move through four lifecycle stages called **Chambers**: Discover, Build, Review, and Ship. Each chamber is color-coded (red, yellow, purple, green) so you always know where something stands at a glance.

When you open a vault, you see the **Triptych** -- a three-panel layout:

- **Signal** (left): The immutable event feed. Every extraction, patch, approval, comment, and AI observation is recorded here in chronological order.
- **Orchestrate** (center): The primary workspace. This is where you inspect data, edit fields, generate documents, and take action.
- **Control** (right): Contextual metadata, audit trails, attachments, and configuration for the current vault.

Three roles govern who can do what:

- **Builder**: Creates and assembles vault content. Works primarily in Discover and Build.
- **Gatekeeper**: Reviews and approves. Works primarily in Review. Cannot self-approve their own work.
- **Owner**: Promotes and publishes. Works primarily in Ship. Cannot self-promote without gatekeeper approval.

With that foundation, here is what each module looks like in practice.

---

## 1. Contracts Module

### What It Does

The Contracts module is Airlock's heaviest and most feature-rich domain. It manages the entire contract lifecycle -- from ingesting raw PDFs and extracting structured data, through drafting and generating new agreements, to reviewing proposed changes and shipping final documents. This is where analysts spend most of their day, moving contracts from raw intake through quality-checked, approved outputs.

### Key Views

#### Triage Board (Discover Chamber)

The Triage Board is the analyst's home screen. When you open the Contracts module, this is what greets you.

**What you see:** A grid of contract cards, each representing a vault in the Discover chamber. Every card shows the contract name, the counterparty entity, the contract type (Distribution, License, Recording, etc.), a health score percentage (color-coded: green above 80%, amber 50-80%, red below 50%), and the current gate status. A red chamber accent stripe runs along the top of each card, identifying it as Discover-stage work.

**What you can do:** Click any card to drill into that vault's detail view. Use the "Upload Contract" button to ingest a new document. The board updates in real time as new contracts arrive or health scores change from extraction runs.

**What it feels like:** A mission control dashboard. You scan the grid, spot the red health scores or blocker badges, and click to investigate. The metrics strip at the top shows Open Issues, In Review count, Resolved Today, and Average Resolution Time.

#### Contract Generator (Build Chamber)

The Generator is a two-pane builder for creating new contracts from pre-approved templates.

**What you see:** The left half of the screen is the **Builder pane** -- a step-by-step wizard. The right half is the **Preview pane** -- a live-rendered version of the contract you are assembling.

**Builder pane workflow:**

1. First, you choose a contract type. There are 24 types organized across five industry verticals (Music Core, Music Ancillary, Film, TV, Cross-Entertainment). Types are displayed in collapsible groups -- click a vertical to expand it and select your type.
2. Once selected, the wizard walks you through the contract section by section. Each section presents form fields with autocomplete suggestions drawn from a registry of 442 fields. Entity fields pull from known counterparties.
3. For each section, a **Clause Picker** offers clauses from a unified library of 188 pre-approved legal clauses. Risk levels are shown as pill badges: standard (no indicator), elevated (amber), critical (red), high (pulsing red). An "Extraction bridge" indicator shows how many extraction fields each clause configures.

**Preview pane:** As you fill in fields and select clauses, the right side renders a formatted preview in real time. Unfilled fields appear as `[TO_BE_DEFINED]` placeholders. Section headers show clause IDs (e.g., `GEN-RECITALS-DIST-V1`). Export buttons at the top let you output to PDF, DOCX, or Markdown. A "Generate with Engine" button runs the full generation pipeline.

#### Vault Detail / Record Inspector

When you click into a specific contract vault, you enter the detail view.

**What you see:** A compact header bar shows the vault name, counterparty, contract type, current chamber (with a color-coded dot), health score, and lifecycle status badges. Below the header, the **Record Inspector** fills the workspace.

The Record Inspector organizes every extracted field into scored sections: Entity Resolution (20% weight), Opportunities (25%), Schedule (15%), Financials (25%), and Addons (15%). Each section contains field cards -- Tier 1 fields are expanded by default (high-priority data you need immediately), while Tier 2 fields are collapsed to reduce visual noise.

**What you can do:**

- Click a field card to expand its drawer, revealing the extracted value, confidence score, anchor text, and a link to the source evidence in the document.
- Click the evidence link to scroll the Document Viewer to the exact page and region where that value was found in the original PDF.
- Run **Preflight** to validate the vault against quality gates (required fields, confidence thresholds, risk scoring, SLA compliance).
- Run **Extraction** to re-process the source document with the seven-extractor pipeline (text, date, currency, percentage, number, boolean, pattern).
- Open the **Patch Editor** to propose field corrections.
- **Advance the chamber** -- the header shows transition buttons (Advance to Build, Submit for Review, Advance to Ship) that are enabled or disabled based on gate checks. If gates are blocked, the footer panel lists the specific reasons.

#### Patch Editor (Build Chamber)

The Patch Editor is a dedicated workspace for proposing data corrections to contract fields.

**What you see:** The top section shows existing patches for the current vault -- a scrollable list where each patch displays the field name, current value, proposed value, state label (Draft, Submitted, Verifier Approved, etc.), and the reasoning ("because clause"). Selecting a patch expands its detail.

Below the list is the **Patch creation form**. You pick a field from extraction results, enter the proposed new value, write intent and justification ("because clause"), and save as a draft or submit for review.

**What you can do:** Create new patches, review existing ones, track their 12-state lifecycle (Draft through Applied, with branches for Needs Clarification, Admin Hold, and Otto AI review). Every state transition is logged immutably. Self-approval is prevented -- the Approve button is hidden when the current user is the patch author.

#### Review Queue (Review Chamber)

The Review Queue is the Gatekeeper's cross-vault work surface -- an aggregated dashboard of everything needing review across the entire Contracts module.

**What you see:** Four stacked sections:

1. **Parent Vault Entity Cards** -- A horizontal row of cards, one per top-level account. Each card shows the vault count, aggregate health score, a progress bar (what percentage of child vaults are build-ready), and counts of pending patches, RFIs, corrections, and anomalies. Click a card to expand it into a child vault table showing each counterparty, assigned Builder, health score, and gate status.

2. **Handoff Signals** -- Three alert summary panels: RFIs (open requests for information), Corrections (submitted patches pending review), and Anomalies (system-detected data quality issues like OCR misreads or account mismatches). Each panel shows a count, status breakdown, and the top 3-5 items with a "View all" link.

3. **Filter Bar** -- Toggle filters by type (Patches, RFIs, Corrections, Anomalies, Activity, Escalations), by Builder, and by entity.

4. **Activity Feed** -- A reverse-chronological stream of events across all vaults, grouped by time period (Today, Yesterday, This Week). Each entry has a color-coded dot, event headline, category badge, vault name, builder name, and timestamp. Click any entry to navigate to that vault's Signal panel, scrolled to the originating event.

### Workflow: Discover Through Ship

1. **Discover** -- A contract is uploaded or arrives via batch processing. The extraction pipeline runs, pulling structured data from the PDF. The Triage Board shows the new vault with its initial health score. The Builder reviews extraction results, resolves entity ambiguities, and addresses triage items (low-confidence fields, missing data).

2. **Build** -- Once triage is clear, the vault advances to Build. Here the Builder uses the Record Inspector to verify and correct extracted data, creates patches for any wrong values, and may use the Contract Generator to draft new agreements. The Patch Editor enforces structured evidence (when/then/because clauses) for every proposed change.

3. **Review** -- The vault enters the Gatekeeper's domain. The Review Queue surfaces it alongside all other vaults needing review. The Gatekeeper inspects patches (which flow through a multi-step approval chain: Submitted, Verifier Approved, Admin Approved), runs preflight checks, and either approves or sends back with clarification requests.

4. **Ship** -- After approval, the Owner promotes the vault to Ship. Final documents are exported. The vault is archived. Cross-module events fire: onboarding tasks are created in the Tasks module, CRM records are updated, renewal dates appear on the Calendar.

### Roles in Action

- **Builder**: Starts in the Triage Board scanning for new contracts. Drills into vaults to inspect extraction results. Creates patches when data is wrong. Uses the Generator to draft new agreements. Submits completed work for review.

- **Gatekeeper**: Lives in the Review Queue. Monitors the entity cards for accounts with pending work. Reviews patches (cannot approve their own). Runs preflight checks. Sends back items that need clarification. Approves vaults to advance to Ship.

- **Owner**: Sees the Review Queue with additional "approval needed" indicators. Promotes approved vaults through final gates. Publishes finished documents. Archives completed work.

### Key Features

- **Seven-extractor pipeline**: Date, text, currency, percentage, number, boolean, and pattern extractors pull structured data from unstructured documents.
- **152 extractable fields** organized into five weighted sections with confidence scoring.
- **Unified clause library**: 188 clauses that serve both generation and extraction -- one source of truth for legal prose and data extraction rules.
- **24 contract types** across five entertainment industry verticals.
- **Trigger-based clause selection**: Clauses auto-select based on form values using AND-logic conditions (equals, in, not_equals, pattern, exists, contains, default).
- **12-state patch workflow** with 20 valid transitions, self-approval prevention, optimistic locking, and structured evidence packs.
- **Preflight gate system**: Automated quality validation before chamber transitions.
- **Batch processing**: Async pipeline with semaphore-limited concurrency for processing multiple contracts simultaneously.
- **Risk-level classification**: Clauses carry risk ratings (standard, elevated, critical, high) with visual indicators and confirmation requirements for high-risk selections.

### Integration Points

- **Contracts to CRM**: When entity resolution discovers a new customer, it creates an account in the CRM module. When entities are resolved, item vaults link to existing CRM counterparties. When health scores change, CRM aggregate metrics update.
- **Contracts to Tasks**: Extraction issues, preflight failures, SLA warnings, and patch review requests all create tasks in the universal task table. These appear in the Tasks module Inbox.
- **Contracts to Calendar**: Extracted dates (effective dates, termination dates, renewal deadlines) automatically appear as calendar events with advance warning alerts.
- **Contracts to Documents**: The Document Suite provides the PDF viewer for source documents and the TipTap editor for generated contracts. Annotation overlays on PDFs link to extraction field cards.

---

## 2. CRM Module

### What It Does

The CRM module provides relationship management views over Airlock's vault hierarchy. It does not maintain its own separate database -- instead, it reads the same vault tree that the Contracts module writes to. Parent vaults become accounts, division vaults become subsidiaries, counterparty vaults become contacts, and item vaults become deals. The CRM is a lens that transforms contract data into relationship intelligence, pipeline visibility, and account health monitoring.

### Key Views

#### Accounts (Default Landing)

When you open the CRM module, you land on the Accounts view.

**What you see:** A sortable table of all accounts (Level 1 vaults), each row showing the account name, industry, deal count, aggregate health score, chamber distribution, and assigned team members. Action buttons at the top let you add a new account, import vault data, or create a contact.

**What you can do:** Click any account row to open an Account Detail Modal. The modal shows account metadata (summary, industry, address, key contacts), a stakeholder list with role and influence indicators (champion, decision maker, evaluator, blocker), a contacts sub-table, a deals list with aggregate values, and an account memory thread showing recent communications and workflow events. From here you can add contacts, promote the account from Discover to Build, or drill into individual deals.

#### Leads (Discover Chamber)

The Leads view surfaces new relationships entering the system.

**What you see:** A table of leads sourced from website intake, dedicated text messages, meeting transcript analysis, and manual entry. Each lead shows its source type, score, match status, assigned representative, latest summary, and timestamp. A badge marks each as "Vault" context.

**What you can do:** Click a lead to open a Lead Detail Modal with full context: source information, qualification status, AI-generated summaries, and recommended next actions. From here you can confirm qualification, merge with an existing account, or dismiss as not-a-fit.

**Where leads come from:** Leads are not manually entered. They appear when the extraction pipeline encounters a new entity during contract processing, when a website visitor starts a conversation, or when a meeting transcript mentions a new counterparty. The system creates the lead automatically.

#### Pipeline (Build Chamber)

The Pipeline is a Kanban-style board showing the deal flow across lifecycle stages.

**What you see:** Four columns -- Lead, Active, Review, Closed -- with deal cards you can drag between them. Each card shows the deal name, account, value, health indicator, and assigned representative. The header shows the total active deal count.

**What you can do:** Drag deals between columns to advance their status. Click a deal card to open a Deal Detail Modal with full deal context, linked contracts, financial terms, and activity timeline. Filter by representative, account, or value range.

**How columns map:** A counterparty whose contracts are mostly in Discover/Build is "Lead" or "Active." One whose contracts are in Review is in the "Review" column. When all contracts ship, the deal moves to "Closed."

#### Account Memory Workspace

Within the Account Detail view, the Account Memory section provides an omni-channel communication workspace.

**What you see:** A mixed-format thread showing inbound communications, outbound drafts, internal notes, workflow events, meeting summaries, and uploaded artifacts. A composer at the bottom supports internal note mode, email draft mode, and text draft mode with stakeholder targeting chips. A stakeholder context rail on the side shows key contacts with influence levels, champion/blocker flags, sentiment indicators, and missing stakeholder alerts.

**What this enables:** Teams can see the complete history of an account relationship without switching tools. Internal notes sit alongside client-facing communications. AI recommendations appear inline. Approval states are visible, not hidden in separate admin screens.

### Workflow: Discover Through Ship

1. **Discover** -- New leads appear from entity resolution, website intake, or meeting transcripts. The team reviews and qualifies them. Source and identity are normalized.

2. **Build** -- Qualified relationships move into active follow-up. The Pipeline board tracks deals. Account enrichment tasks (industry, address, key contacts, deal size) appear in the sidebar. Meeting summaries and follow-up recommendations surface. Contract readiness begins to emerge.

3. **Review** -- Deal Review shows counterparty vaults with contracts in the Review chamber. Gatekeepers see aggregate health scores, pending approvals, and SLA status. Health Alerts surface accounts where scores are dropping or trends are worsening.

4. **Ship** -- Won Deals shows completed relationships with total value, timeline, and milestones. Onboarding tasks are auto-created when contracts ship, ensuring the handoff from deal-closing to operational setup is tracked.

### Roles in Action

- **Builder**: Monitors the Leads view for new relationships. Enriches account data. Manages pipeline progression. Uses the Account Memory workspace to track communications and schedule follow-ups.

- **Gatekeeper**: Reviews the Deal Review surface for relationships with contracts pending approval. Monitors Health Alerts for deteriorating accounts. Ensures deal quality before allowing advancement.

- **Owner**: Oversees the Pipeline at a strategic level. Reviews Won Deals for completeness. Ensures onboarding tasks are assigned and progressing.

### Key Features

- **Vault hierarchy as CRM data**: No separate CRM tables. Accounts, contacts, and deals are all views over the vault tree (levels 1-3).
- **Automatic lead generation**: New leads appear from contract extraction entity resolution -- no manual data entry required.
- **Drag-and-drop pipeline**: Kanban board with @hello-pangea/dnd for intuitive deal stage management.
- **Account Memory**: Omni-channel communication thread combining emails, texts, notes, and workflow events in one timeline.
- **Stakeholder mapping**: Contacts tagged with role types (champion, decision maker, evaluator, blocker), influence levels (high/medium/low), and sentiment tracking.
- **Group targeting**: Stakeholder groups (Finance Team, Legal Review, Buying Committee) for targeted outbound composition.
- **Discovery-to-contract lifecycle**: CRM owns the lifecycle state. When a relationship is qualified, it triggers contract preparation with a structured handoff.

### Integration Points

- **CRM from Contracts**: New customers discovered during extraction automatically create CRM accounts. Entity resolution links contracts to existing accounts. Health score changes propagate upward.
- **CRM to Contracts**: Clicking a deal in CRM switches to the Contracts module and opens that vault's Triptych detail view.
- **CRM to Tasks**: Account enrichment tasks, follow-up actions, and onboarding checklists flow into the universal task table.
- **CRM to Calendar**: Meeting events, follow-up deadlines, and qualification SLAs appear on the Calendar module.
- **CRM to Documents**: Contract prep status, linked artifacts, and meeting transcripts are accessible from the Account Memory workspace.

---

## 3. Tasks Module

### What It Does

The Tasks module is the universal work queue across all of Airlock. Every other module generates tasks -- contract triage items, CRM enrichment actions, calendar deadlines, document review requests -- and they all land here. Tasks is the unfiltered view of the master task table. It is the productivity hub where team members see everything they need to do, regardless of which module created the work.

### Key Views

#### Inbox (Discover Chamber)

The Inbox is the catch-all for all open work across every module.

**What you see:** A sortable table showing every task with status "open" or "in progress." Columns include Title (linking to the source vault if applicable), Module badge (Contracts, CRM, Calendar, etc.), Vault name, Task Type badge (triage, review, approval, manual), Severity (color-coded), Assigned To, Due countdown, and Created timestamp.

**What you can do:** Click any task row to open a Task Detail Modal with full context: the task description, linked vault, evidence, history, and action buttons. Filter by module, severity, task type, assignee, or date range. Quick-filter toggles for "My Tasks", "Unassigned", "Overdue", and "Blockers" sit alongside the filter bar.

**What it feels like:** An email inbox for operational work. Everything needing attention is here, prioritized by severity and due date.

#### My Tasks (Discover Chamber)

A focused view showing only tasks assigned to the current user.

**What you see:** The same table format as Inbox, but filtered to your assignments. The subtitle shows "N assigned to you." Tasks you have not started, tasks in progress, and tasks awaiting review are all visible.

**What you can do:** Same actions as Inbox -- click to view details, use filters to narrow focus. This is your personal work queue.

#### Kanban Board (Build Chamber)

The board view for visual task management.

**What you see:** Four columns -- Open, In Progress, In Review, Resolved -- with task cards arranged vertically. Each card shows a severity dot, task title, source module, source vault name, due countdown (amber when approaching, red when overdue), and the assignee avatar.

**What you can do:** Drag cards between columns to update their status. Dragging from Open to In Progress auto-assigns the task if unassigned. Dragging to In Review emits a review event. Dragging to Resolved from In Review requires reviewer confirmation. Dragging backward (Resolved to Open) requires a reason. Click any card to open the Task Detail Modal.

**Grouping options:** A dropdown lets you switch the board layout -- group by status (default Kanban columns), by module (swimlanes per module), by assignee (swimlanes per person), by vault, or by due date.

#### Focus Mode (Build Chamber)

When you need to deep-dive into a single task, Focus Mode uses the full Triptych layout:

- **Signal panel**: Task history -- status changes, comments, linked events from the source vault.
- **Orchestrate panel**: Task detail -- title, description, evidence, linked vault context, and action buttons (approve, reject, reassign, escalate).
- **Control panel**: Metadata -- assignee, severity, due date, source module, created by, plus edit controls for updating any field.

### Workflow: Discover Through Ship

The Tasks module maps the four chambers to task lifecycle stages:

1. **Discover (Inbox/My Tasks)** -- New tasks arrive from system triggers or manual creation. They sit in "open" status. The team triages, assigns, and prioritizes.

2. **Build (Kanban/Focus)** -- Assigned tasks move to "in progress." Team members work on them, using Focus Mode for complex items. The Kanban board provides visual management of the work flow.

3. **Review (Pending Review)** -- Completed work moves to "in review" status. Gatekeepers inspect the work and either approve (moving to resolved) or reject (sending back to open with notes).

4. **Ship (Done/Reports)** -- Resolved and dismissed tasks are archived. Productivity reports show tasks resolved per period, average resolution time, severity distribution, assignee workload, and overdue rate trends.

### Roles in Action

- **Builder**: Checks the Inbox each day for new work. Uses My Tasks for a focused personal queue. Moves tasks through the Kanban board as work progresses. Creates manual tasks via the "New Task" button or slash commands.

- **Gatekeeper**: Monitors the Pending Review view. Approves or rejects submitted work. Cannot bypass module-specific lifecycle rules -- a preflight blocker from Contracts cannot be arbitrarily marked "resolved" without actual resolution.

- **Owner**: Reviews the Reports view for team productivity metrics. Monitors overdue rates and workload distribution. Ensures nothing is stuck.

### Key Features

- **Universal work queue**: One table underlies every module's triage. The Tasks module shows it all, unfiltered.
- **Eight task types**: Triage, review, approval, action, SLA warning, entity resolution, manual, and onboarding -- each with appropriate source context.
- **Drag-and-drop Kanban**: @hello-pangea/dnd powers intuitive card movement between status columns.
- **Five grouping options**: Status, module, assignee, vault, or due date swimlanes.
- **Automatic task creation**: System events create tasks automatically -- extraction failures, preflight warnings, SLA deadlines, entity disambiguation needs, patch review requests.
- **Manual task creation**: Slash commands (`/task`), New Task button, and inline Kanban "Add task" rows.
- **Cross-module traceability**: Every task carries metadata linking back to its source vault and originating event.
- **SLA awareness**: Due date countdowns with color-coded urgency indicators.

### Integration Points

- **Tasks from Contracts**: Extraction issues, preflight failures, patch review requests, and SLA warnings all create tasks automatically.
- **Tasks from CRM**: New lead enrichment, account data cleanup, duplicate resolution, and onboarding checklists generate tasks.
- **Tasks from Calendar**: Overdue calendar events and approaching deadlines create SLA warning tasks.
- **Tasks to Home**: The Home workspace shows compact triage widgets -- a preview of the top N urgent tasks per module, all querying the same underlying data.
- **Tasks to all modules**: Clicking a task with a source vault navigates to that vault in its source module.

---

## 4. Calendar Module

### What It Does

The Calendar module provides a temporal view across all of Airlock. It does not store its own events. Instead, it computes calendar entries from two sources: dates extracted from vaults (contract effective dates, termination dates, renewal deadlines) and task due dates from the universal task table. It is a time-based lens over data that already exists elsewhere, giving teams a unified view of what is happening when.

### Key Views

#### Month View (Default Landing)

The standard month grid calendar.

**What you see:** A full month grid where each day cell contains colored dots representing events. Dots are color-coded by source: green for contract start dates, red for terminations and expirations, amber for renewal deadlines, and module-specific colors for tasks from different modules. Today's date is highlighted with an accent border. Overdue SLA events pulsate with a red indicator.

**What you can do:** Filter events by source module using pill toggles at the top right (All Modules, Contracts, Tasks, CRM, Calendar). Navigate between months with forward/back controls. Click a day to open a **Day Modal** showing all events for that date in a list format. Click an individual event in the Day Modal to open an **Event Detail Modal** with full context: vault name, event type, source module, and a link to navigate to the source vault.

**What it feels like:** A heads-up display for deadlines. At a glance, you can see which days are heavy with contract milestones, which weeks have approaching renewals, and where task due dates cluster.

#### Agenda View

A flat, chronological list of all events sorted by date.

**What you see:** Events grouped by day (Today, Tomorrow, This Week, etc.). Each row shows a color-coded dot, the vault or task name, the event type (Renewal Deadline, Effective Date, Task Due, etc.), the source module path (e.g., "Contracts > henderson-msa"), and a countdown (Due in 4h 30m). Discovery calls, follow-ups, review checkpoints, and contract-prep milestones are all interleaved chronologically.

**What you can do:** Same module filter pills as the Month View. Click any event row to open the Event Detail Modal. Navigate to the source vault or task directly from the detail view.

**When to use it:** The Agenda view is best when you want a scannable list rather than a spatial grid -- useful for planning your day or week, reviewing upcoming deadlines in sequence.

#### Sub-Panel Quick Glance

The Calendar module sidebar shows a mini dashboard (3 Today, 8 This Week, 2 Overdue), filter options, and an "Upcoming" section listing the next five events with their vault names and event types. This sidebar gives you a snapshot without opening any view.

### Workflow: How Calendar Relates to Chambers

The Calendar module does not follow the Discover-Build-Review-Ship chamber pattern itself. Instead, it reflects chamber activity from other modules:

- **Discover events**: Contract intake dates, initial extraction timestamps, and lead qualification deadlines appear.
- **Build events**: Task due dates for enrichment, follow-up scheduling, and draft completion deadlines.
- **Review events**: SLA deadlines for reviewer response, patch approval due dates, and gate check deadlines.
- **Ship events**: Contract effective dates, publication dates, and onboarding milestone deadlines.

### Roles in Action

- **Builder**: Uses the Calendar to track approaching task deadlines and contract dates they are responsible for. The Agenda view helps plan daily work.

- **Gatekeeper**: Monitors SLA deadlines for review items. Red pulsating events indicate overdue reviews that need immediate attention.

- **Owner**: Looks at the monthly view for strategic timeline awareness -- when are major contracts starting, when do renewals come due, where are capacity bottlenecks forming.

### Key Features

- **Zero-storage calendar**: No stored calendar events. Everything is computed at render time from extraction results and task due dates.
- **Multi-source event rendering**: Contract dates, task deadlines, CRM follow-ups, and (planned) meeting events all appear on one calendar.
- **Module-aware color coding**: Events carry their source module color so you can visually distinguish Contracts events from CRM events from Task deadlines.
- **Advance warning system**: Auto-generated alert events for critical dates. Termination dates trigger warnings at -90, -30, and -7 days. Renewal deadlines at -60, -14, and -3 days. SLA deadlines at -4 hours, -1 hour, and -15 minutes.
- **Source navigation**: Every calendar event links back to its origin. Click a contract renewal date and you land in the Contracts module viewing that vault's Record Inspector.
- **Schedule-X foundation**: Built on the MIT-licensed Schedule-X library with a custom Airlock dark theme.

### Integration Points

- **Calendar from Contracts**: Every date extracted from a contract (effective, termination, renewal, expiry) becomes a calendar event. The extraction pipeline feeds the Calendar automatically.
- **Calendar from Tasks**: All tasks with due dates appear on the Calendar, regardless of which module created them.
- **Calendar from CRM**: Follow-up deadlines, qualification SLAs, and account activity milestones surface as calendar events.
- **Calendar to Tasks**: When advance warning thresholds are crossed, the system creates SLA warning tasks in the universal task table and triggers push notifications.
- **Calendar to Navigation**: Clicking any calendar event navigates to its source -- a vault date opens the vault in its source module, a task due date opens Focus Mode in the Tasks module.

---

## 5. Documents Module

### What It Does

The Documents module is the central repository for all workspace artifacts -- contracts, meeting transcripts, legal briefs, templates, and any other documents that support the work across Airlock. It provides upload and import capabilities, a browsable document library, and a preview system. Under the hood, the Document Suite engine (TipTap for rich editing, PDF.js for viewing) powers document handling across the entire platform, not just this module.

### Key Views

#### Document Library (Default Landing)

The Library is a searchable, filterable repository of all documents in the workspace.

**What you see:** A table of documents showing title, file name, document type (contract, transcript, brief, template), file format (PDF, DOCX, MD), source module, linked account, and upload date. Action buttons at the top let you upload a new document or import from a connected drive (Google Drive integration stub).

When you click a document in the table, a **Preview panel** slides open on the right side, showing document metadata, a thumbnail or rendered preview, linked vault information, and action buttons. The table compresses to make room for the preview.

**What you can do:**

- **Upload**: Click "Upload" to open the upload modal. You select a file, specify the document type and format, choose the source module and linked account, and add a label. The document is ingested into the library and becomes available across the platform.
- **Import from Drive**: Click "Import Drive" to open a drive import modal (Google Drive integration for pulling documents from external storage).
- **Preview**: Click any document row to see its preview panel without leaving the library view.
- **Filter**: Use the document type, format, module source, and account filters to narrow the table.
- **Navigate to source**: From the preview panel, click through to the linked vault in its source module.

### Workflow: How Documents Support the Chambers

The Documents module does not enforce its own chamber lifecycle. Instead, documents participate in the lifecycles of other modules:

1. **Discover** -- Raw documents are uploaded or imported. Contract PDFs arrive here before entering the extraction pipeline. Meeting transcripts from discovery calls are stored.

2. **Build** -- The Contract Generator produces draft documents that appear in the library. Templates are referenced during document creation. Work product accumulates.

3. **Review** -- Reviewers access source PDFs through the library. Annotated versions with extraction overlays are viewable. Diff views compare document versions to track changes from patches.

4. **Ship** -- Final approved documents are exported and stored. The library serves as the archive of record.

### Roles in Action

- **Builder**: Uploads source documents, creates new documents using templates, and links documents to vaults. Uses the library to find reference materials and templates during the Build chamber.

- **Gatekeeper**: Reviews documents in the library during the Review process. Uses the preview panel to inspect documents without leaving context. Accesses annotated PDFs with extraction highlights to verify data quality.

- **Owner**: Accesses final versions for export and distribution. Uses the library as the audit-ready archive of all workspace artifacts.

### Key Features

- **Dual rendering engine**: PDF.js for viewing uploaded PDFs with annotation overlays. TipTap (ProseMirror-based) for rich text editing, contract generation, and clause insertion.
- **Custom TipTap blocks**: 12 custom node types including Financial Table, Clause Block, Template Variable, Data Binding Field, Annotation Marker, Diff Block, Chart Embed, Formula Field, Conditional Section, and Version Marker.
- **Template variable system**: `{{VARIABLE_NAME}}` syntax with live data binding. Variables pull from form fields, extraction results, entity resolution, and system values. Color-coded highlights show match status (green = confirmed, amber = needs review, red = missing).
- **PDF annotation overlay**: Semi-transparent colored rectangles on PDFs marking extracted field locations. Bidirectional linking between annotations and field cards in the Record Inspector.
- **Version diffing**: Inline diff view for comparing document versions with color-coded additions (cyan), deletions (red strikethrough), and modifications (amber). Each diff links to the patch that caused the change.
- **Multi-format support**: PDF, DOCX, XLSX, PPTX, TXT, MD, EPUB, RTF, and images. Each format has per-format viewers and feature flags.
- **Account-linked documents**: Every document can be linked to a CRM account, making it available in the Account Memory workspace.
- **Drive import**: Stub integration for pulling documents from Google Drive.

### Integration Points

- **Documents to Contracts**: The PDF viewer renders source contracts in the Record Inspector. The TipTap editor powers the Contract Generator preview panel. Annotation overlays link PDF regions to extraction field cards.
- **Documents to CRM**: Documents linked to accounts appear in the Account Memory workspace. Meeting transcripts and contract artifacts are accessible from the CRM account detail view.
- **Documents from Contracts**: Generated contracts from the Contract Generator are stored as documents in the library.
- **Documents to Patch Workflow**: The TipTap editor renders diff views for patches, showing before/after comparisons with version tracking.
- **Documents to Tasks**: Document review requests create tasks in the universal task table.

---

## Cross-Module Integration Summary

One of Airlock's defining characteristics is that modules do not operate in isolation. Here is how data flows between them:

| From          | To              | What Flows                                                                                                             |
| ------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Contracts** | **CRM**         | New entities create accounts. Entity resolution links vaults to accounts. Health scores roll up to account aggregates. |
| **Contracts** | **Tasks**       | Extraction issues, preflight failures, patch review requests, and SLA warnings become tasks.                           |
| **Contracts** | **Calendar**    | Extracted dates (effective, termination, renewal) become calendar events with advance warnings.                        |
| **Contracts** | **Documents**   | Generated contracts are stored in the document library. Source PDFs are viewable with annotation overlays.             |
| **CRM**       | **Tasks**       | Account enrichment, follow-up actions, and onboarding checklists create tasks.                                         |
| **CRM**       | **Calendar**    | Meeting events, follow-up deadlines, and qualification SLAs appear on the calendar.                                    |
| **CRM**       | **Contracts**   | Clicking a deal navigates to the Contracts module. Qualified relationships trigger contract preparation.               |
| **Tasks**     | **All modules** | Tasks link back to source vaults. Clicking a task navigates to the originating module.                                 |
| **Calendar**  | **Tasks**       | Advance warning thresholds create SLA warning tasks.                                                                   |
| **Calendar**  | **All modules** | Clicking a calendar event navigates to its source vault or task.                                                       |
| **Documents** | **Contracts**   | PDF viewer and TipTap editor power the Record Inspector and Contract Generator.                                        |

The universal task table is the connective tissue. Every module writes tasks to it, and the Tasks module reads all of them. The Calendar reads dates from everywhere. The CRM reads vault hierarchy data created by Contracts. Documents provides the rendering engines used by Contracts, Patches, and the CRM. Nothing exists in a silo.

---

## Appendix: Chamber Quick Reference

| Chamber      | Color  | Purpose                                    | Primary Role |
| ------------ | ------ | ------------------------------------------ | ------------ |
| **Discover** | Red    | Intake, triage, initial qualification      | Builder      |
| **Build**    | Yellow | Assembly, enrichment, drafting, correction | Builder      |
| **Review**   | Purple | Approval, quality gates, compliance checks | Gatekeeper   |
| **Ship**     | Green  | Publication, export, archival, handoff     | Owner        |

Every vault in Airlock moves through these four chambers in order. Gates between chambers enforce quality requirements. The system tracks which chamber each vault is in, and the chamber determines which views and actions are available.
