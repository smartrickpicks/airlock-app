# Canonical Model — Tier 1 Core Types

> **Vocabulary note:** This spec uses "Tier 1/2/3" for project milestones (dogfood → multi-tenant → platform). These are NOT Airlock Chambers. See `CLAUDE.md` for canonical vocabulary.

> **Status:** SPECCED
> **Decision:** LOCKED (2026-03-06)
> **Depends on:** Platform Architecture (`overview.md`), Connector Roadmap (`connector-roadmap.md`)
> **Rule:** Airlock speaks only canonical types. External tools are adapter implementation details.

---

## Overview

These are the canonical types that the Airlock shell renders. Adapters translate between these types and external systems (Jira, Google, Slack). The shell never sees Jira issues, Gmail threads, or Slack messages — only canonical objects.

---

## Core Types

### Task

The universal work item. Maps from: Jira Issue, native Airlock task, GitHub Issue.

```typescript
interface CanonicalTask {
  id: string; // ULID (Airlock-generated)
  external_id?: string; // e.g., "ACME-123" (Jira key)
  external_source?: string; // "jira" | "native" | "github"

  title: string;
  description?: string;
  status: CanonicalTaskStatus;
  priority: "critical" | "high" | "medium" | "low" | "none";

  assigned_to?: CanonicalUserRef;
  reporter?: CanonicalUserRef;

  board_id?: string; // Which TaskBoard this belongs to
  vault_id?: string; // Linked vault (if task is vault-related)

  tags: string[];
  effort?: number; // Story points / effort estimate
  due_date?: string; // ISO 8601

  comments: CanonicalComment[];
  attachments: CanonicalAttachmentRef[];

  metadata: Record<string, unknown>; // Custom fields, connector-specific overflow

  created_at: string; // ISO 8601
  updated_at: string;
  synced_at?: string; // Last sync with external source
}

type CanonicalTaskStatus =
  | "backlog"
  | "in_progress"
  | "review"
  | "completed"
  | "blocked"
  | "cancelled";

interface CanonicalComment {
  id: string;
  author: CanonicalUserRef;
  body: string;
  created_at: string;
  external_id?: string;
}
```

### TaskBoard

Container for tasks. Maps from: Jira Board/Project, native board.

```typescript
interface CanonicalTaskBoard {
  id: string;
  external_id?: string; // Jira project key
  external_source?: string;

  name: string;
  description?: string;

  columns: CanonicalBoardColumn[];

  module: string; // Which Airlock module owns this board
  workspace_id: string;

  metadata: Record<string, unknown>;
}

interface CanonicalBoardColumn {
  id: string;
  label: string;
  status: CanonicalTaskStatus; // Maps column position → canonical status
  wip_limit?: number;
}
```

### MessageThread

A conversation. Maps from: Gmail thread, Slack thread, native message thread.

```typescript
interface CanonicalMessageThread {
  id: string;
  external_id?: string; // Gmail thread ID, Slack thread ts
  external_source?: string; // "gmail" | "slack" | "native"

  subject?: string; // Email subject (null for Slack)
  participants: CanonicalUserRef[];

  messages: CanonicalMessage[];

  vault_id?: string; // Linked vault (contextual relevance)
  module?: string; // Which module surfaced this thread

  unread_count: number;
  last_message_at: string;

  metadata: Record<string, unknown>;
}

interface CanonicalMessage {
  id: string;
  external_id?: string;

  author: CanonicalUserRef;
  body: string; // Plain text or markdown
  body_html?: string; // Rich content (email)

  attachments: CanonicalAttachmentRef[];

  created_at: string;
}
```

### ConversationSpace

A persistent communication space. Maps from: Slack channel, native room.

> **Naming:** Airlock uses "ConversationSpace" internally — never "channel" (reserved term, see `CLAUDE.md`). External Slack channels are mapped to ConversationSpaces via adapters.

```typescript
interface CanonicalConversationSpace {
  id: string;
  external_id?: string; // Slack channel ID
  external_source?: string; // "slack" | "native"

  name: string;
  description?: string;
  topic?: string;

  type: "public" | "private" | "direct";

  members: CanonicalUserRef[];
  member_count: number;

  // Where this conversation space appears in Airlock
  mounted_module?: string; // e.g., "crm"
  mounted_vault_id?: string; // e.g., specific deal vault

  last_message_at?: string;
  unread_count: number;

  metadata: Record<string, unknown>;
}
```

### Event

A calendar entry. Maps from: Google Calendar event, task due date, vault deadline.

```typescript
interface CanonicalEvent {
  id: string;
  external_id?: string; // Google Calendar event ID
  external_source?: string; // "google_calendar" | "computed" | "native"

  title: string;
  description?: string;
  location?: string;

  start: string; // ISO 8601
  end: string; // ISO 8601
  all_day: boolean;

  attendees: CanonicalAttendee[];
  organizer?: CanonicalUserRef;

  // For computed events (from vault dates, task due dates)
  source_type?: "vault_date" | "task_due" | "calendar" | "meeting";
  source_id?: string; // vault_id or task_id

  recurrence?: string; // RRULE

  calendar_id: string; // Which calendar

  status: "confirmed" | "tentative" | "cancelled";

  metadata: Record<string, unknown>;
}

interface CanonicalAttendee {
  user: CanonicalUserRef;
  response: "accepted" | "declined" | "tentative" | "needs_action";
}
```

### Document

A file or rich document. Maps from: Google Drive file, Google Doc, native upload.

```typescript
interface CanonicalDocument {
  id: string;
  external_id?: string; // Google Drive file ID
  external_source?: string; // "google_drive" | "native" | "upload"

  name: string;
  mime_type: string;
  size_bytes?: number;

  url?: string; // External link (Google Docs URL)
  thumbnail_url?: string;

  // Ownership
  owner?: CanonicalUserRef;
  shared_with: CanonicalUserRef[];

  // Airlock context
  vault_id?: string; // Attached to this vault
  module?: string;
  folder_path?: string; // e.g., "/Contracts/Acme/"

  created_at: string;
  updated_at: string;

  metadata: Record<string, unknown>;
}
```

---

## Shared Types

```typescript
interface CanonicalUserRef {
  id: string; // Airlock user ULID
  email: string;
  display_name: string;
  avatar_url?: string;
  external_ids?: Record<string, string>; // { jira: "...", google: "...", slack: "..." }
}

interface CanonicalAttachmentRef {
  id: string;
  name: string;
  mime_type: string;
  size_bytes?: number;
  url: string; // Download or preview URL
  source: string; // "google_drive" | "jira" | "native"
}

interface TaskFilters {
  board_id?: string;
  status?: CanonicalTaskStatus[];
  assigned_to?: string; // user ID
  vault_id?: string;
  tags?: string[];
  search?: string;
  limit?: number;
  offset?: number;
}

interface EventFilters {
  calendar_ids?: string[];
  start_after?: string; // ISO 8601
  start_before?: string;
  source_type?: string;
  limit?: number;
}

interface ChannelFilters {
  mounted_module?: string;
  mounted_vault_id?: string;
  type?: "public" | "private" | "direct";
}

interface DocFilters {
  vault_id?: string;
  module?: string;
  folder_path?: string;
  mime_type?: string;
  search?: string;
}

interface PaginationOpts {
  limit: number;
  cursor?: string;
}

interface CreateTaskInput {
  title: string;
  description?: string;
  board_id: string;
  status?: CanonicalTaskStatus;
  priority?: string;
  assigned_to?: string;
  vault_id?: string;
  tags?: string[];
  effort?: number;
  due_date?: string;
  metadata?: Record<string, unknown>;
}

interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: CanonicalTaskStatus;
  priority?: string;
  assigned_to?: string;
  tags?: string[];
  effort?: number;
  due_date?: string;
  metadata?: Record<string, unknown>;
}

interface CreateEventInput {
  title: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  all_day?: boolean;
  attendees?: string[]; // user IDs
  calendar_id: string;
  recurrence?: string;
}

interface UpdateEventInput {
  title?: string;
  description?: string;
  location?: string;
  start?: string;
  end?: string;
  attendees?: string[];
}

interface CreateMessageInput {
  body: string;
  attachments?: CanonicalAttachmentRef[];
}

interface CreateCommentInput {
  body: string;
}
```

---

## Relationship to Existing Models

| Canonical Type      | Existing Airlock Model    | Relationship                                                                                                                                           |
| ------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Task`              | **NEW**                   | Does not exist yet. Tier 1 adds this.                                                                                                                  |
| `TaskBoard`         | **NEW**                   | Does not exist yet. Tier 1 adds this.                                                                                                                  |
| `MessageThread`     | **NEW**                   | Does not exist yet. Tier 1 adds this.                                                                                                                  |
| `ConversationSpace` | **NEW**                   | Does not exist yet. Tier 1 adds this. (Maps from Slack channels.)                                                                                      |
| `Event`             | `events` table (existing) | Different concept! Existing `events` = immutable audit log. Canonical `Event` = calendar entry. Rename consideration: `AuditEvent` vs `CalendarEvent`. |
| `Document`          | **NEW**                   | Does not exist yet. Tier 1 adds this.                                                                                                                  |
| `Vault`             | `vaults` table (existing) | Canonical tasks/events/docs link to vaults via `vault_id`.                                                                                             |

> **CRM = Vault Hierarchy.** There is NO separate CRM data model. The vault hierarchy IS the CRM:
>
> - Level 1 (Parent) = Account
> - Level 2 (Division) = Business Unit
> - Level 3 (Counterparty) = Contact/Deal
> - Level 4 (Item) = Contract/Document
>
> External systems integrating with "CRM data" MUST use the vault hierarchy API (`/api/vaults?vault_level=1`) — never a separate CRM endpoint. See `docs/specs/vault-hierarchy/overview.md`.
> | `User` | `users` table (existing) | `CanonicalUserRef` is a lightweight projection of existing user model + `external_ids` for connector linking. |

### Naming Collision: Event

The existing `events` table stores immutable audit entries (extraction, patch, approval). The canonical `Event` type represents calendar events.

**Resolution:** In code, use:

- `AuditEvent` — existing immutable log entries (`apps/api/src/models/event.py`)
- `CalendarEvent` — new canonical type for calendar entries
- In the UI, "Event" always means calendar event. The audit log is called "Activity" or "History."

---

## Context Server Schema Storage

The canonical model schemas are stored as MCP resources for the context server to validate and serve:

```
org://{ws_id}/schemas/
├── task.json           ← CanonicalTask JSON Schema
├── task-board.json     ← CanonicalTaskBoard JSON Schema
├── message-thread.json ← CanonicalMessageThread JSON Schema
├── conversation-space.json ← CanonicalConversationSpace JSON Schema
├── calendar-event.json ← CanonicalEvent JSON Schema
└── document.json       ← CanonicalDocument JSON Schema
```

These schemas are used by:

1. **Adapters** — validate data before returning to engines
2. **Context server** — validate write-through payloads
3. **Shell** — TypeScript types generated from these schemas via OpenAPI codegen
