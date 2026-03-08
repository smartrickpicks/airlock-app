# Meeting-to-Action Spec

## Purpose

Define how a sales or discovery meeting becomes operational work across the product.

Meeting intelligence is not a separate module. It is an embedded capability that produces artifacts and workflow inputs.

## Entry Conditions

A meeting can enter the pipeline from:

- scheduled discovery call
- rep-led demo
- follow-up conversation
- manually uploaded transcript

The handoff event is:

- `meeting.transcript.ready`

## Input Artifact

The transcript pipeline must produce:

- meeting record
- transcript artifact
- participant list
- duration and timestamps
- transcript confidence

## AI Processing Outputs

Transcript processing generates:

- one-line summary
- bullet summary
- key decisions
- extracted action items
- extracted entities
- suggested owner
- suggested next best action
- suggested follow-up draft
- buying signal and urgency hints

## Human Review Model

The first human gate for meetings is:

- `Review Summary + Actions`

Reviewer responsibilities:

- correct factual errors
- accept, edit, or delete action items
- confirm the owner
- select the next branch
- decide whether follow-up is internal-only or customer-facing

## Cross-Module Fan-Out

### CRM

Update or create:

- relationship
- account candidate
- chamber/stage state
- latest transcript summary
- next recommended action

### Tasks

Create:

- internal action items
- reviewer gate task
- rep follow-up task
- legal or contract-prep tasks if qualified

### Calendar

Create:

- follow-up call
- decision checkpoint
- contract prep review session if needed

### Documents

Attach:

- transcript
- AI summary
- meeting brief
- outbound follow-up draft

### Contracts

If the opportunity is qualified and terms are materially known:

- suggest agreement type
- create a contract prep request
- open or stage the initial draft

## Qualification Rules

Transcript-driven qualification should not automatically create a contract draft unless:

- human gate confirms qualification
- core counterparties are known
- agreement family is plausible
- enough material terms exist to draft responsibly

If these conditions fail:

- keep the relationship in discovery/build
- create missing-information tasks
- schedule follow-up

## Failure Handling

### Low-confidence transcript

- flag transcript confidence
- require human correction
- avoid auto-creating external drafts

### Multiple counterparties

- create an entity-review gate
- avoid automatic account binding until resolved

### Missing owner

- route to queue
- create assignment gate

### Conflicting next steps

- defer to human branch selection

## Demo Story Requirements

A strong demo must show:

1. meeting ends
2. transcript becomes summary and action items
3. reviewer sees a human gate
4. tasks and follow-up appear automatically
5. CRM stage updates
6. contract prep becomes available only after approval
