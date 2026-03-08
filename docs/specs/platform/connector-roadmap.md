# Tier 1 Connector Roadmap — Jira, Google Workspace, Slack

> **Roadmap extension** of Admin > Connectors from [`docs/specs/admin/overview.md`](../admin/overview.md).

> **Vocabulary note:** This spec uses "Tier 1/2" for project milestones (dogfood → multi-tenant). These are NOT Airlock Chambers. "Channel" appears when referencing external Slack channels — Airlock's canonical type is **ConversationSpace**. See `CLAUDE.md` for vocabulary rules.

> **Status:** SPECCED
> **Decision:** LOCKED (2026-03-06)
> **Timeline:** 6-8 weeks
> **Depends on:** Platform Architecture (`overview.md`), Canonical Model (`canonical-model.md`)
> **Pattern:** Fork community MCP servers → wrap behind Airlock adapter layer → swap/own later

---

## Architecture: The Adapter Layer

Airlock engines never call MCP servers directly. They call an **adapter interface** — a thin abstraction that maps canonical Airlock operations to connector-specific MCP tool calls.

```
┌──────────────────────────────────────────────────┐
│                   Airlock Shell                   │
│  (Next.js — renders canonical objects only)       │
└──────────────────────┬───────────────────────────┘
                       │ MCP tools (canonical)
                       ▼
┌──────────────────────────────────────────────────┐
│              Airlock Context Server               │
│  (org config, roles, permissions, mappings)        │
│  Decides: which adapters, which tools, which user │
└──────────────────────┬───────────────────────────┘
                       │ adapter interface
                       ▼
┌──────────┬───────────┬───────────┬───────────────┐
│  Tasks   │  Comms    │ Calendar  │  Documents    │
│ Adapter  │ Adapter   │ Adapter   │  Adapter      │
└────┬─────┴─────┬─────┴─────┬─────┴───────┬───────┘
     │           │           │             │
     ▼           ▼           ▼             ▼
┌─────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐
│Jira MCP │ │Slack   │ │Google    │ │Google    │
│Server   │ │MCP     │ │Calendar  │ │Drive MCP │
└─────────┘ │Server  │ │MCP Server│ │Server    │
            └────────┘ └──────────┘ └──────────┘
```

### Adapter Interface (TypeScript)

```typescript
// packages/shared-types/src/adapters.ts

/** Base adapter — all connectors implement this pattern */
interface ConnectorAdapter<TCanon, TExternal> {
  /** Map canonical → external (write-through) */
  toExternal(canonical: TCanon): TExternal;
  /** Map external → canonical (sync inbound) */
  toCanonical(external: TExternal): TCanon;
}

// ─── Task Adapter ────────────────────────────────────────────

interface TaskAdapter {
  listTasks(filters: TaskFilters): Promise<CanonicalTask[]>;
  getTask(taskId: string): Promise<CanonicalTask>;
  createTask(task: CreateTaskInput): Promise<CanonicalTask>;
  updateTask(taskId: string, updates: UpdateTaskInput): Promise<CanonicalTask>;
  transitionTask(
    taskId: string,
    toStatus: CanonicalStatus,
  ): Promise<CanonicalTask>;
  addComment(
    taskId: string,
    comment: CreateCommentInput,
  ): Promise<CanonicalComment>;
}

// ─── Comms Adapter ───────────────────────────────────────────

interface CommsAdapter {
  listConversationSpaces(
    filters: ConversationSpaceFilters,
  ): Promise<CanonicalConversationSpace[]>;
  listMessages(
    channelId: string,
    opts: PaginationOpts,
  ): Promise<CanonicalMessage[]>;
  postMessage(
    channelId: string,
    message: CreateMessageInput,
  ): Promise<CanonicalMessage>;
  postThreadReply(
    threadId: string,
    message: CreateMessageInput,
  ): Promise<CanonicalMessage>;
}

// ─── Calendar Adapter ────────────────────────────────────────

interface CalendarAdapter {
  listEvents(filters: EventFilters): Promise<CanonicalEvent[]>;
  createEvent(event: CreateEventInput): Promise<CanonicalEvent>;
  updateEvent(
    eventId: string,
    updates: UpdateEventInput,
  ): Promise<CanonicalEvent>;
  deleteEvent(eventId: string): Promise<void>;
}

// ─── Document Adapter ────────────────────────────────────────

interface DocumentAdapter {
  listDocuments(filters: DocFilters): Promise<CanonicalDocument[]>;
  getDocumentMetadata(docId: string): Promise<CanonicalDocument>;
  createFromTemplate(
    templateId: string,
    data: Record<string, unknown>,
  ): Promise<CanonicalDocument>;
  getDocumentLink(docId: string): Promise<string>;
}
```

### Why the Adapter Layer

1. **Swap connectors without touching engines.** Replace Jira with Linear? Swap the task adapter. Shell never knows.
2. **Own the canonical model.** Airlock speaks its own language. External tools are implementation details.
3. **Test without external services.** Mock adapters for development and testing.
4. **Multi-source aggregation.** One user's tasks can come from Jira AND native — adapter merges them.
5. **Drift detection.** Adapter layer is the single point where canonical ↔ external mismatches surface.

---

## 1. Jira Connector

### Canonical Mapping

| Canonical (Airlock) | Jira                               | Notes                                |
| ------------------- | ---------------------------------- | ------------------------------------ |
| `Task`              | Issue                              | Core work item                       |
| `Task.title`        | `summary`                          | Direct map                           |
| `Task.description`  | `description`                      | Direct map                           |
| `Task.status`       | `status.name`                      | Transform via status map (see below) |
| `Task.assigned_to`  | `assignee.emailAddress`            | Match by email                       |
| `Task.priority`     | `priority.name`                    | Direct map                           |
| `Task.effort`       | `customfield_XXXXX` (Story Points) | Custom field, configurable           |
| `TaskBoard`         | Board / Project                    | Container                            |
| `Task.tags`         | `labels`                           | Direct map                           |
| `Comment`           | Issue comment                      | Direct map                           |

### Status Map (configurable per org)

```json
{
  "jira_to_canonical": {
    "To Do": "backlog",
    "In Progress": "in_progress",
    "In Review": "review",
    "Done": "completed"
  },
  "canonical_to_jira": {
    "backlog": "To Do",
    "in_progress": "In Progress",
    "review": "In Review",
    "completed": "Done"
  }
}
```

Stored in context server: `org://{ws_id}/mappings/jira.json`

### Required MCP Tools (from community Jira MCP server)

| Tool               | Canonical Operation            | Direction     |
| ------------------ | ------------------------------ | ------------- |
| `list_issues`      | `taskAdapter.listTasks()`      | Read          |
| `get_issue`        | `taskAdapter.getTask()`        | Read          |
| `create_issue`     | `taskAdapter.createTask()`     | Write-through |
| `update_issue`     | `taskAdapter.updateTask()`     | Write-through |
| `transition_issue` | `taskAdapter.transitionTask()` | Write-through |
| `add_comment`      | `taskAdapter.addComment()`     | Write-through |
| `search_jql`       | Internal (for filters, boards) | Read          |

### Auth Model

- **Org-level:** Jira app installed in Atlassian org (admin does this in Connectors)
- **Per-user:** Optional — if enabled, actions use user's Jira identity (assignee-specific)
- **Fallback:** Org service account for read-only operations

### Write-Through Rules

```
User moves card on Airlock kanban
  → taskAdapter.transitionTask(taskId, "in_progress")
    → jira adapter maps "in_progress" → Jira transition ID
      → jira MCP: transition_issue(issueKey, transitionId)
        → Jira updates issue status
          → Webhook fires: issue.updated
            → Airlock validates sync (should already match)
```

---

## 2. Google Workspace Connector

### Canonical Mapping

| Canonical (Airlock) | Google                  | Notes             |
| ------------------- | ----------------------- | ----------------- |
| `MessageThread`     | Gmail thread            | Conversation view |
| `Message`           | Gmail message           | Individual email  |
| `Event`             | Calendar event          | Meeting/deadline  |
| `Document`          | Drive file / Google Doc | File or rich doc  |

### Gmail — Required MCP Tools

| Tool               | Canonical Operation                     | Direction     |
| ------------------ | --------------------------------------- | ------------- |
| `list_threads`     | `commsAdapter.listMessages()` (grouped) | Read          |
| `get_message`      | — (detail view)                         | Read          |
| `send_message`     | `commsAdapter.postMessage()`            | Write-through |
| `reply_to_message` | `commsAdapter.postThreadReply()`        | Write-through |
| `archive_message`  | — (inbox management)                    | Write         |

### Calendar — Required MCP Tools

| Tool           | Canonical Operation             | Direction     |
| -------------- | ------------------------------- | ------------- |
| `list_events`  | `calendarAdapter.listEvents()`  | Read          |
| `create_event` | `calendarAdapter.createEvent()` | Write-through |
| `update_event` | `calendarAdapter.updateEvent()` | Write-through |
| `delete_event` | `calendarAdapter.deleteEvent()` | Write         |

### Drive/Docs — Required MCP Tools (lightweight Tier 1)

| Tool                       | Canonical Operation                     | Direction   |
| -------------------------- | --------------------------------------- | ----------- |
| `list_files`               | `documentAdapter.listDocuments()`       | Read        |
| `get_file_metadata`        | `documentAdapter.getDocumentMetadata()` | Read        |
| `open_doc`                 | `documentAdapter.getDocumentLink()`     | Read (link) |
| `create_doc_from_template` | `documentAdapter.createFromTemplate()`  | Write       |

### Auth Model

- **Per-user OAuth 2.1** — each user authenticates with their Google account
- **Scopes:** `gmail.readonly`, `gmail.send`, `calendar`, `drive.readonly`, `drive.file`
- **Context server:** Stores per-user auth state and scope grants
- **Admin controls:** Which calendars/mailboxes are visible in which modules

### Airlock Widget Mapping

| Widget             | Panel                    | Data Source                              |
| ------------------ | ------------------------ | ---------------------------------------- |
| "Inbox in Context" | Control panel (per-user) | Gmail threads filtered by vault contacts |
| Calendar view      | Orchestrate panel        | Google Calendar events + task due dates  |
| Attached documents | Control panel            | Drive files linked to vault              |

---

## 3. Slack Connector

### Canonical Mapping

| Canonical (Airlock) | Slack         | Notes                 |
| ------------------- | ------------- | --------------------- |
| `ConversationSpace` | Slack channel | Communication space   |
| `MessageThread`     | Slack thread  | Threaded conversation |
| `Message`           | Slack message | Individual message    |

### Required MCP Tools

| Tool                   | Canonical Operation                     | Direction     |
| ---------------------- | --------------------------------------- | ------------- |
| `list_channels`        | `commsAdapter.listConversationSpaces()` | Read          |
| `list_recent_messages` | `commsAdapter.listMessages()`           | Read          |
| `post_message`         | `commsAdapter.postMessage()`            | Write-through |
| `post_thread_reply`    | `commsAdapter.postThreadReply()`        | Write-through |
| `add_reaction`         | — (optional Tier 1)                     | Write         |

### Auth Model

- **Org-level:** Slack app installed in Slack workspace (admin)
- **ConversationSpace mounting:** Context server maps Slack channels → Airlock modules/vaults
- **Example:** `#deals-acme` channel mounted into CRM vault for Acme

### How It Plugs In

- Vault detail page shows "Relevant Slack Thread" in Control panel
- User can reply from Airlock → message appears in Slack
- Context server controls: which Slack workspace, which channels, who sees what

---

## 4. Context Server — Cross-Cutting Responsibilities

### Per-Org Connector Config

```json
// org://{ws_id}/integrations.json
{
  "connectors": [
    {
      "id": "jira-acme",
      "type": "jira",
      "display_name": "Jira Cloud",
      "base_url": "https://acme.atlassian.net",
      "auth": {
        "type": "oauth2",
        "client_id": "...",
        "scopes": ["read:jira-work", "write:jira-work"]
      },
      "mapping_ref": "org://{ws_id}/mappings/jira.json",
      "enabled_modules": ["tasks", "contracts"],
      "status": "active"
    },
    {
      "id": "google-workspace",
      "type": "google",
      "display_name": "Google Workspace",
      "auth": {
        "type": "per_user_oauth2",
        "scopes": ["gmail.readonly", "gmail.send", "calendar", "drive.readonly"]
      },
      "enabled_modules": ["calendar", "documents", "crm"],
      "status": "active"
    },
    {
      "id": "slack-acme",
      "type": "slack",
      "display_name": "Slack",
      "workspace_id": "T12345678",
      "auth": {
        "type": "bot_token",
        "scopes": ["channels:read", "chat:write", "channels:history"]
      },
      "channel_mounts": {
        "C-deals": { "module": "crm", "vault_pattern": "deals-*" },
        "C-engineering": { "module": "tasks" }
      },
      "status": "active"
    }
  ]
}
```

### Per-User Auth State

```json
// Context server internal state (not exposed as resource)
{
  "user_id": "user-ulid",
  "connector_auth": {
    "google": {
      "access_token": "...",
      "refresh_token": "...",
      "scopes": ["gmail.readonly", "calendar"],
      "expires_at": "2026-03-06T12:00:00Z"
    },
    "jira": {
      "account_id": "jira-user-id",
      "linked": true
    }
  }
}
```

### Write-Through Rules (Tier 1 — Keep Simple)

| Action in Airlock        | External Write                      | Priority |
| ------------------------ | ----------------------------------- | -------- |
| Create task              | → Jira `create_issue`               | P0       |
| Move task on board       | → Jira `transition_issue`           | P0       |
| Update task fields       | → Jira `update_issue`               | P0       |
| Add comment on task      | → Jira `add_comment`                | P1       |
| Create calendar event    | → Google Calendar `create_event`    | P0       |
| Reply to email thread    | → Gmail `send_message`              | P1       |
| Post in channel          | → Slack `post_message`              | P1       |
| Attach document to vault | → Google Drive (link only, no copy) | P1       |

**Tier 1 rule:** Comments and Slack messages are **optional** write-through. Tasks and calendar events are **mandatory** write-through.

---

## 5. Drift Detection & Reconciliation (Week 5-8)

### What Can Drift

| Scenario                      | Detection                                | Resolution                              |
| ----------------------------- | ---------------------------------------- | --------------------------------------- |
| Task status mismatch          | Jira webhook → compare with canonical    | Auto-update canonical OR flag for admin |
| Deleted in Jira               | Webhook `issue.deleted`                  | Soft-delete canonical task, notify      |
| Created in Jira (not Airlock) | Periodic sync or webhook `issue.created` | Create canonical task, assign to board  |
| Calendar event moved          | Google webhook                           | Update canonical event                  |
| Assignee changed in Jira      | Webhook                                  | Update canonical `assigned_to`          |

### Reconciliation Tools (Admin UI)

```
Admin > Connectors > Jira > Sync Status

Sync Health:
  ✓ 89 tasks synced · Last sync: 30s ago
  ⚠ 3 mismatched statuses
  ✗ 1 orphaned task (deleted in Jira)

[Fix Mismatched Statuses]  [Re-link Orphaned Items]  [Force Full Sync]
```

---

## 6. Implementation Order

| Week | Focus                            | Deliverable                                                                |
| ---- | -------------------------------- | -------------------------------------------------------------------------- |
| 1-2  | Context server + canonical model | MCP context server running, JSON schemas defined, adapter interfaces typed |
| 2-3  | Jira connector                   | Task CRUD + transitions syncing, basic kanban board in Airlock             |
| 3-4  | Google Calendar + Gmail          | "My Day" view (tasks + calendar + emails), per-user OAuth                  |
| 4-5  | Slack connector                  | Linked thread in vault detail, reply from Airlock                          |
| 5-6  | Admin UI + mappings              | Connector config in Admin Overlay, field mapping editor                    |
| 6-8  | Hardening                        | Drift detection, reconciliation tools, error handling, retry logic         |

### Success Criteria (End of Tier 1)

- [ ] User opens Airlock → sees their Jira tasks on a kanban board
- [ ] User moves card → Jira status updates within 5 seconds
- [ ] User sees today's Google Calendar events alongside tasks ("My Day")
- [ ] User creates event in Airlock → appears in Google Calendar
- [ ] User sees relevant Slack thread in vault detail
- [ ] Admin can configure all connectors from Admin > Connectors
- [ ] Admin can map Jira statuses → Airlock canonical statuses
- [ ] Drift detection catches status mismatches within 5 minutes
