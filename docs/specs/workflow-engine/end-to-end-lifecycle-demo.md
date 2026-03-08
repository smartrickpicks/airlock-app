# End-to-End Lifecycle Demo Spec

## Purpose

Define the full local click-demo lifecycle that takes a record from discovery intake through contract generation, internal review, signature staging, signed state, and downstream queue visibility.

This spec is for demo planning and wireframe readiness. It is not a backend execution plan.

## Goal

Airlock should be able to demonstrate one continuous business story where:

1. a lead, contact, or account is created or imported
2. source artifacts are attached
3. discovery work is reviewed and promoted
4. a contract draft is generated
5. the same draft appears across modules
6. the draft moves into a signature stage
7. signature status changes create visible downstream work

The demo should feel like one system, not a collection of disconnected module mocks.

## Core Principle

One canonical local record fans out into every module surface.

That means a locally created artifact should show up consistently in:

- CRM
- Tasks
- Calendar
- Documents
- Contracts
- Review Queue
- Workflow Builder context
- Account Memory workspace

## Lifecycle Scope

### In scope

- local creation and import flows
- discovery review and qualification
- contract generation handoff
- internal review and patch workflow states
- signature-ready and signature-in-flight states
- signed and post-signature visibility
- cross-module local propagation

### Out of scope

- production persistence
- provider-backed messaging
- provider-backed signature execution
- multi-user concurrency
- final API design

## Canonical Demo Journey

### Phase 1: Discover

Entry points:

- manual account or contact creation
- CRM CSV import
- website intake
- dedicated text intake
- meeting transcript intake
- document upload or Google Drive import

Expected outputs:

- account linked or created
- contact linked or created
- source artifacts attached
- stakeholder candidates visible
- action items proposed
- next-step gate visible

### Phase 2: Build

Promotion criteria:

- owner assigned
- account and contact linkage resolved
- stakeholder map good enough to continue
- follow-up path selected
- initial commercial intent or contract intent visible

Expected outputs:

- open tasks
- calendar follow-up
- draft outreach
- readiness scorecard
- contract prep recommendation

### Phase 3: Review

Review states:

- generated contract draft visible
- patch or comment cycle visible
- internal approval visible
- signature prep visible

Expected outputs:

- approved or revised draft
- send-for-signature decision
- updated review queue cards
- audit trail in account memory

### Phase 4: Ship

Execution states:

- ready for signature
- sent for signature
- partially signed
- signed
- activated or handed off

Expected outputs:

- signature status visible in contract and document surfaces
- onboarding or post-signature tasks created
- timeline entries across CRM and account memory

## Canonical Lifecycle States

The local demo should use a shared state vocabulary:

- `intake_received`
- `needs_review`
- `discovery_active`
- `qualified_for_build`
- `contract_prep_ready`
- `draft_generating`
- `draft_generated`
- `internal_review`
- `ready_for_signature`
- `sent_for_signature`
- `partially_signed`
- `signed`
- `activated`
- `archived`

These states should be represented consistently across modules, even if labels differ slightly by surface.

## Canonical Local Record Set

The demo should treat the following as the core local record family:

- `account`
- `contact`
- `stakeholder`
- `artifact`
- `workflow_run`
- `task`
- `calendar_event`
- `contract_record`
- `review_item`
- `signature_packet`

The contract record is the center of the later lifecycle and should reference:

- originating account
- originating discovery artifacts
- current chamber
- current lifecycle state
- current signature state
- linked review items
- linked document artifacts

## Cross-Module Visibility Matrix

### CRM

Must show:

- intake source
- owner
- stakeholders
- readiness status
- linked draft contract
- signature status
- recent activity timeline

### Tasks

Must show:

- discovery follow-up tasks
- review tasks
- signature follow-up tasks
- onboarding or activation tasks after signed state

### Calendar

Must show:

- discovery calls
- review checkpoints
- signature follow-up reminders
- activation or onboarding milestones

### Documents

Must show:

- imported source artifacts
- transcript and summaries
- generated draft
- signed or near-final copy
- provider stub packet references

### Contracts

Must show:

- generated draft
- lifecycle state
- review status
- signature readiness
- signature status

### Review Queue

Must show:

- discovery gate items
- patch and revision items
- approval-needed items
- signature-prep or blocked items

### Workflow Builder

Must show:

- that the lifecycle is orchestrated by one flow
- where human gates happen
- where contract prep begins
- where signature handoff begins

### Account Memory Workspace

Must show:

- intake history
- artifact timeline
- internal notes
- outbound drafts
- approval events
- signature events

## Demo Interaction Requirements

The click demo should support these visible actions:

- create account
- create contact
- import records
- upload artifact
- attach transcript
- resolve create vs link existing
- promote from Discover to Build
- generate contract
- open generated draft in multiple surfaces
- request internal review
- mark ready for signature
- send to stubbed signature stage
- mark partially signed
- mark signed

These actions may remain local-state mutations for now, but they must feel deterministic and connected.

## Required Demo Illusions

To make the click demo feel real before backend enrichment:

- user-created items should remain visible during the current session
- a generated contract should appear in more than one place
- moving lifecycle state in one place should update badges elsewhere
- queue cards and timelines should reflect the same story
- signature actions should create obvious state transitions

## Acceptance Criteria

This planning package is complete when the demo can support a believable local walkthrough where:

1. a new record is created from intake or import
2. artifacts attach to the same account context
3. the account is promoted from discovery into build
4. a contract is generated and appears in contracts and documents
5. the same contract appears in review and account memory
6. signature staging is visible
7. signed state creates downstream visibility in tasks, calendar, and CRM

## Follow-On Specs

This spec depends on:

- `local-demo-record-propagation.md`
- `contract-generator/signature-lifecycle-stub.md`
- `document-suite/sanitized-demo-document-intake.md`
