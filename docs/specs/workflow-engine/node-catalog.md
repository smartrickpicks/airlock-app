# Workflow Builder Node Catalog

## Purpose

Define the discovery-to-contract node language used by the workflow builder. The builder should read like business logic, not infrastructure.

## Node Categories

- `trigger`
- `function`
- `human`
- `action`

## Trigger Nodes

### Website Form Submitted

- Starts a discovery workflow from a website intake artifact
- Expected payload:
  - form id
  - visitor name
  - company
  - email
  - phone
  - free-text message

### Dedicated Text Received

- Starts a workflow from the dedicated discovery number
- Expected payload:
  - normalized phone number
  - message body
  - media metadata
  - thread id if existing

### Meeting Transcript Ready

- Starts a workflow once transcript processing completes
- Expected payload:
  - meeting id
  - participant list
  - transcript artifact id
  - transcript confidence

### Manual Discovery Started

- Starts a workflow when a rep creates a discovery record directly

### Lead Stage Changed

- Starts a workflow when CRM lifecycle state changes

### Follow-up Due

- Starts a workflow when a follow-up checkpoint is due

### No Response Timeout

- Starts a workflow when a wait state expires without reply

### Contract Qualification Reached

- Starts contract prep evaluation once qualification thresholds are met

## Function Nodes

### Classify Lead Intent

- Produces intent, urgency, buying signal, and high-level route

### Extract Contact + Company Facts

- Produces structured person, company, and relationship candidates

### Summarize Transcript

- Produces one-line summary, bullets, decisions, and evidence

### Generate Action Items

- Produces suggested internal tasks from discovery input

### Recommend Owner

- Proposes assignment based on existing account, queue, or rotation rules

### Recommend Next Best Action

- Produces the likely next branch or follow-up move

### Suggest Agreement Type

- Produces a likely agreement family plus confidence and rationale

### Enrich Company Record

- Normalizes or augments account context

### Branch

- Splits workflow paths on explicit conditions
- Typical branch labels:
  - Qualified?
  - Existing contact match?
  - Meeting booked?
  - Terms complete enough for contract?

### Delay / Wait

- Pauses execution until time or event boundary

## Human Nodes

### Review Summary + Actions

- Reviewer edits summary, extracted entities, or proposed tasks

### Approve Outbound Message

- Reviewer edits and approves email or text drafts

### Choose Next Step

- Reviewer chooses the branch that follows AI recommendation

### Confirm Qualification

- Reviewer confirms that the relationship should advance

### Approve Contract Preparation

- Reviewer confirms that the lead is ready for a draft agreement

### Assign Owner

- Reviewer selects the responsible person or team

### Wait for Human Decision

- Suspends workflow until a decision record is posted

## Action Nodes

### Create Tasks

- Creates one or more internal tasks

### Create Calendar Event

- Creates discovery, follow-up, or review checkpoints

### Create CRM Relationship

- Creates or updates the CRM lifecycle record

### Update Lifecycle Stage

- Advances chamber/stage state in CRM

### Attach Transcript to Record

- Links transcript and derived artifacts to the relationship

### Draft Follow-up Email

- Produces an editable outbound email draft

### Draft Follow-up Text

- Produces an editable outbound text draft

### Route to Rep

- Assigns responsibility to a specific owner

### Route to Queue

- Assigns responsibility to a team or pooled inbox

### Post Notification

- Posts an internal notice or escalation

### Open Contract Draft

- Creates or opens the draft contract surface

### Prepare Contract Draft

- Passes structured data to the contract staging flow

## Required Gate Payload

Every human gate must carry:

- gate type
- subject record
- AI proposals
- editable fields
- decision options
- assigned reviewer
- due time
- selected branch after decision

## Initial v1 Node Set

The first implementation wave should include:

- Website Form Submitted
- Dedicated Text Received
- Meeting Transcript Ready
- Classify Lead Intent
- Extract Contact + Company Facts
- Summarize Transcript
- Generate Action Items
- Review Summary + Actions
- Choose Next Step
- Draft Follow-up Email
- Create Tasks
- Create Calendar Event
- Create CRM Relationship
- Update Lifecycle Stage
- Suggest Agreement Type
- Prepare Contract Draft
