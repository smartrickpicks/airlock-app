# Signature Lifecycle Stub

## Purpose

Define the e-signature portion of the contract lifecycle for demo and planning purposes, without committing to a real provider integration yet.

## Positioning

The signature layer should be treated as:

- a lifecycle stage attached to the contract record
- a provider adapter surface later
- a local demo flow now

It should not become a separate module in the first demo wave.

## Provider Posture

For demo planning, Airlock may show a provider label such as:

- `DocuSign Stub`
- `E-Sign Provider Stub`

The demo may use DocuSign as a recognizable reference, but should not imply a completed integration.

## Signature Goals

The signature flow should let the demo show:

- draft approved internally
- packet prepared
- packet sent
- signers outstanding
- packet completed
- signed copy visible

## Signature States

Recommended local state vocabulary:

- `not_prepared`
- `preparing_packet`
- `ready_for_signature`
- `sent_for_signature`
- `viewed_by_signer`
- `partially_signed`
- `signed`
- `declined`
- `voided`

These should be separate from the broader contract lifecycle state, while still linked to it.

## State Mapping to Contract Lifecycle

### Draft Generated

Contract state:

- `draft_generated`

Signature state:

- `not_prepared`

### Internal Review Approved

Contract state:

- `ready_for_signature`

Signature state:

- `ready_for_signature`

### Packet Sent

Contract state:

- `sent_for_signature`

Signature state:

- `sent_for_signature`

### Partial Completion

Contract state:

- `sent_for_signature`

Signature state:

- `partially_signed`

### Final Completion

Contract state:

- `signed`

Signature state:

- `signed`

## Required Demo Actions

The click demo should support:

- `Prepare Envelope`
- `Send for Signature`
- `View Signature Status`
- `Mark Partially Signed`
- `Mark Signed`
- `Decline`
- `Void`
- `Reopen for Amendment`

These actions may remain local-state only, but they should visibly affect multiple screens.

## Required Surfaces

### Contracts

Must show:

- signature status badge
- next signature action
- signer summary
- provider stub label

### Documents

Must show:

- generated draft
- signature packet placeholder
- signed copy once complete

### CRM

Must show:

- milestone or timeline event
- stakeholder or signer progress cue
- post-signature next step

### Review Queue

Must show:

- items blocked on approval
- items ready for signature
- items waiting on signer completion

### Account Memory

Must show:

- packet prepared event
- send event
- signer progress events
- final signed event

## Signer Model for Demo Planning

The stub should assume a simple signer structure:

- signer name
- signer role
- signer organization
- signer order
- signer status
- signer email or channel handle

Future provider-specific routing can be added later.

## Demo Rules

To keep the demo believable:

- external send should remain an explicit action
- signer order can be mocked but should be visible
- status changes should update queue cards and document labels
- signed state should create a downstream artifact

## Post-Signature Fan-Out

When a contract becomes signed, the local demo should trigger or simulate:

- signed copy artifact
- CRM milestone update
- onboarding or activation task bundle
- optional calendar checkpoint
- account memory event

## Out of Scope

- real provider API integration
- envelope schema design
- webhook handling
- identity verification controls
- production security review

## Acceptance Criteria

This stub is complete when the demo can show:

1. a generated contract moving into signature preparation
2. a visible provider-stub label
3. signature state transitions across more than one module
4. a signed artifact and downstream work after completion
