# Discovery-to-Contract Lifecycle

## Purpose

Define the canonical lifecycle that turns inbound discovery signals into operational work across CRM, tasks, calendar, documents, and contracts.

This lifecycle is the shared backbone for:

- website lead intake
- dedicated text line discovery
- sales meeting transcripts
- rep-led manual discovery
- qualified contract staging

## Canonical Object Model

The lifecycle uses a hybrid ownership model:

- communication artifacts are first-class inputs
- those artifacts attach to a CRM relationship
- a workflow run orchestrates the state transitions
- a vault or contract draft may be created once the opportunity matures

### Core records

- `relationship`
  - the CRM-first record for the lead, contact, account, or deal context
- `workflow_run`
  - the orchestration record that tracks node execution and human gates
- `artifact`
  - the source material: website submission, transcript, message thread, summary, brief, draft communication
- `task`
  - internal work created from AI or human decisions
- `contract_prep_request`
  - the pre-stage packet for agreement generation

## Lifecycle Stages

### 1. Intake

Entry events:

- website form submitted
- dedicated text received
- meeting transcript ready
- manual discovery started

Outputs:

- source artifact created
- relationship matched or created
- workflow run started

### 2. Normalize

The system links raw input to known records or creates candidates:

- person/contact candidate
- account/company candidate
- relationship/deal candidate
- conversation or meeting context

Outputs:

- normalized relationship state
- initial source labels
- duplicate/match confidence

### 3. Interpret

AI interprets the discovery signal:

- classify intent
- extract entities
- extract action items
- detect urgency and buying signal
- recommend owner
- recommend next best action

Outputs:

- summary artifact
- extracted action items
- suggested follow-up
- recommended branch

### 4. Human Gate

Airlock requires human review before sensitive actions continue.

The default human-gated behavior is:

- review AI output
- edit if needed
- approve or reject
- choose next step

Human gates are required before:

- sending outbound messages
- advancing a sensitive branch
- beginning contract preparation

### 5. Operationalize

Once approved, the system fans out work across modules:

- create tasks
- create or update CRM records
- schedule meetings
- draft follow-up communication
- attach artifacts to documents
- post notifications

### 6. Qualify

Once the lead is warm and terms are materially known:

- suggest agreement type
- evaluate missing terms
- create a contract prep request
- open or stage a draft agreement

### 7. Review and Ship

The lifecycle continues through human validation and external execution:

- legal or business review
- contract draft approval
- send or handoff
- onboarding task generation

## Chamber Mapping

### Discover

Purpose:

- intake
- signal detection
- qualification

Typical outputs:

- relationship candidate
- first task bundle
- first human gate
- initial follow-up recommendation

### Build

Purpose:

- active pursuit
- enrichment
- scheduling

Typical outputs:

- task graph
- follow-up drafts
- meeting artifacts
- contract pre-stage packet

### Review

Purpose:

- human validation
- readiness confirmation

Typical outputs:

- approved branch
- approved outbound communication
- approved contract preparation

### Ship

Purpose:

- external execution
- onboarding handoff

Typical outputs:

- sent agreement
- onboarding tasks
- archived discovery context

## AI and Human Boundaries

### AI may auto-create

- summaries
- internal tasks
- suggested follow-up drafts
- recommended owners
- recommended branches
- extracted entities and action items

### AI may not auto-execute by default

- outbound customer messages
- commitment-making workflow transitions
- contract send
- final contract preparation approval

## Module Visibility Rules

### CRM

The primary lifecycle home. Must expose:

- intake source
- chamber and stage
- latest summary
- owner
- next recommended action
- contract readiness

### Tasks

Must show:

- AI-created internal tasks
- human gate tasks
- follow-up tasks
- legal and onboarding tasks after qualification

### Calendar

Must show:

- discovery meetings
- follow-up calls
- review checkpoints
- contract prep checkpoints

### Documents

Must show:

- transcript
- AI summary
- meeting brief
- draft communication
- staged agreement artifacts

### Contracts

Must show:

- readiness
- agreement recommendation
- missing term checklist
- staged draft

## Initial Implementation Scope

### First-class triggers

- website form submitted
- dedicated text received
- meeting transcript ready
- contract qualification reached

### Required outcomes

- lifecycle visible in CRM
- tasks created from discovery
- calendar checkpoints created
- documents show transcript and summary artifacts
- workflow builder exposes explicit business nodes
- qualified opportunities can stage a contract draft
