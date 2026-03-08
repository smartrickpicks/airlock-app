# Local Demo Record Propagation

## Purpose

Define how local demo records propagate across modules before a real database and backend orchestration layer are wired in.

This spec exists to make the demo coherent while preserving a future enrichment path.

## Core Principle

One canonical local record produces many views.

The demo should avoid creating separate fake copies of the same object in each module. Instead, one local record should drive:

- CRM cards
- account detail
- tasks
- calendar entries
- document rows
- contract rows
- review queue items
- workflow context
- account memory timeline entries

## Goals

- make user-created demo records feel persistent within a session
- reduce contradictions between modules
- preserve a future path to API-backed state
- keep local fan-out deterministic and explainable

## Non-Goals

- designing the production store architecture
- choosing final persistence technology
- implementing backend event sourcing

## Canonical Record Families

The demo should treat these as the primary local record families:

- `account`
- `contact`
- `stakeholder`
- `artifact`
- `contract_record`
- `review_item`
- `task`
- `calendar_event`
- `signature_packet`
- `workflow_run`

Every later view should derive from these, not invent separate module-only stand-ins when avoidable.

## Propagation Model

### Account

Account changes fan out to:

- CRM account tables
- account detail modal
- account memory workspace
- stakeholder map
- linked contract summaries

### Contact and Stakeholder

Contact or stakeholder changes fan out to:

- CRM account detail
- stakeholder mapping panels
- account memory target chips
- review and qualification gates

### Artifact

Artifact changes fan out to:

- account memory timeline
- documents library
- CRM recent activity
- contract prep inputs
- review context

Artifact types include:

- upload
- transcript
- website submission
- email draft
- sms thread item
- summary
- generated draft
- signed copy

### Contract Record

Contract changes fan out to:

- contracts module
- documents library
- review queue
- CRM account detail
- account memory timeline
- signature packet status

### Signature Packet

Signature state changes fan out to:

- contract detail
- documents surface
- CRM activity feed
- tasks and reminders
- calendar checkpoints
- account memory timeline

## Minimum Local Mutation Rules

The demo should support these deterministic mutation rules:

### Create account

Creates:

- account record
- default account memory shell

### Create contact

Creates:

- contact record
- stakeholder candidate or mapped stakeholder entry
- account timeline entry

### Import CRM data

Creates or updates:

- accounts
- contacts
- source metadata
- review-needed entries when ambiguous

### Upload artifact

Creates:

- artifact record
- documents row
- account memory timeline entry
- optional review item if action needed

### Generate contract

Creates:

- contract record
- generated draft artifact
- documents row
- review queue item
- CRM activity entry
- account memory event

### Send for signature

Creates or updates:

- signature packet
- contract state
- review queue state
- account memory event
- follow-up task or calendar reminder if needed

### Mark signed

Creates or updates:

- signature packet state
- contract state
- signed document artifact
- CRM milestone entry
- downstream task bundle

## Session Persistence Expectations

For the demo, session-local persistence is enough if it satisfies:

- records remain visible while the app is open
- local actions update more than one module surface
- users can revisit the same locally created draft during the session

If a full reload resets the state, that can remain acceptable for now as long as the demo assumptions document says so.

## Seeded Data + User-Created Data

The demo should support two sources of local records:

### Seeded records

Used for curated walkthroughs and high-confidence demos.

### User-created records

Created during the demo from:

- create forms
- imports
- uploads
- contract generation
- signature-stage actions

These should coexist without breaking the seeded walkthrough paths.

## Module Derivation Rules

Each module should derive from the canonical record set rather than duplicating its own independent truth:

- CRM derives from accounts, contacts, stakeholders, contracts, artifacts
- Tasks derives from workflow and lifecycle actions
- Calendar derives from follow-up and review milestones
- Documents derives from artifacts and contract records
- Contracts derives from contract records and signature packets
- Review Queue derives from review items and contract lifecycle state

## Acceptance Criteria

This spec is complete when the demo has a clear path for one locally created record to:

1. appear in its source module
2. appear in at least two secondary modules
3. update its status coherently across surfaces
4. preserve a believable lifecycle story without real backend persistence
