# Communication Thread Model

## Purpose

Define the normalized thread and message model for account-scoped communication memory.

This model must support inbound, outbound, internal, and system activity without duplicating CRM, Documents, Tasks, or Workflow concepts.

## Thread

A thread is the durable communication container for a scoped account, vault, stakeholder group, or internal context.

### Required fields

- `thread_id`
- `scope_type`
  - `account`
  - `vault`
  - `module`
  - `workspace`
- `scope_id`
- `primary_account_id`
- `vault_id`
- `thread_kind`
  - `omni_channel`
  - `internal`
  - `stakeholder_group`
  - `system`
- `default_owner_id`
- `status`
  - `active`
  - `waiting`
  - `resolved`
  - `archived`
- `last_activity_at`

## Message / memory artifact

Messages and memory artifacts share a common stream.

### Required fields

- `message_id`
- `thread_id`
- `channel_type`
  - `web_form`
  - `chat`
  - `sms`
  - `email`
  - `transcript`
  - `upload`
  - `note`
  - `system`
- `direction`
  - `inbound`
  - `outbound`
  - `internal`
- `visibility`
  - `internal`
  - `external_draft`
  - `external_sent`
  - `system`
- `body`
- `sender_identity`
- `recipient_targets`
- `artifact_refs`
- `approval_state`
  - `none`
  - `pending`
  - `approved`
  - `rejected`
- `workflow_run_id`
- `created_at`

## Artifact references

Messages may link to:

- documents
- transcripts
- meeting briefs
- contract drafts
- tasks
- workflow gates

## Routing events in thread context

Routing should appear as system-visible thread events, for example:

- assigned to owner
- routed to queue
- AI suggested contact match
- approval requested
- approval granted
- missing stakeholder detected

## Display rules

- internal notes must be visually distinct from external communication
- external drafts must never appear identical to sent communication
- system/routing events should be readable but not dominate the thread
- channel identity should always be visible on inbound and outbound items
