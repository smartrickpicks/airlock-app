# Omni-Channel Account Workspace

## Purpose

Define the account-scoped communication and memory workspace that lives inside CRM account context and can be secondarily referenced from related Vault surfaces.

This workspace is not a new top-level module. It is an account capability that combines:

- omni-channel history
- outbound composition
- stakeholder-aware targeting
- routing and assignment context
- AI and workflow suggestions
- linked documents, meetings, and action items

## Containment

### Primary home

- CRM account detail

### Secondary home

- related Vault detail where account context is already known

### Explicit non-goal

- do not introduce a standalone Vortex module in the first planning or demo wave

## Working terminology

The product UI should continue to anchor on existing CRM and Vault terminology.

Acceptable demo labels:

- Account Memory
- Comms Workspace
- Vortex (concept)

Recommended default:

- `Account Memory` as the visible label
- `Vortex` as a secondary concept badge only

## Workspace regions

### 1. Overview strip

Shows:

- account summary
- owner
- health
- contract readiness
- pending approvals
- next recommended action

### 2. Account memory thread

Shows:

- inbound communication events
- outbound drafts and sends
- internal notes
- workflow events
- meeting summaries
- uploaded artifacts

The thread is mixed-format and channel-aware.

### 3. Composer

Supports:

- internal note mode
- email draft mode
- text draft mode
- future call placeholder
- stakeholder/group targeting chips
- approval-required states

### 4. Stakeholder context rail

Shows:

- key stakeholders
- role and influence
- champion/blocker flags
- sentiment
- ownership
- missing stakeholder alerts

### 5. Related work and artifacts

Shows:

- tasks
- meetings
- transcripts
- documents
- contract prep status

## Interaction principles

- stay inside account context
- do not force tool-switching for common communication tasks
- distinguish internal and external actions clearly
- preserve all relevant communication as shared organizational memory
- show workflow and approval states inline, not hidden in a separate admin view

## Demo scope

The first demo should mock:

- mixed channel history
- stakeholder-aware composition
- AI recommendations
- pending approval chips
- linked artifact entries

The first demo should not imply:

- real provider sends
- real inbox sync
- full thread fidelity across external systems
