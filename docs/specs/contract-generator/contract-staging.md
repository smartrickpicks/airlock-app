# Contract Staging Spec

## Purpose

Define how qualified discovery work hands off into the contract generator.

Contract generation should begin when the relationship is qualified and the known terms are sufficient to produce a responsible draft.

## Trigger

Primary triggering event:

- `contract.prep.requested`

Common upstream causes:

- human confirmed qualification after website intake
- human confirmed qualification after meeting transcript review
- CRM stage changed into qualified state

## Preconditions

Contract preparation should only proceed when:

- relationship or deal record exists
- counterparties are known or reviewable
- suggested agreement type exists
- enough material terms are known
- human gate approved preparation

## Required Input Shape

The contract prep request must include:

- relationship or deal identifier
- known counterparties
- agreement type candidate
- known material terms
- missing terms list
- approval status
- source artifact references

## Hand-Off Outputs

Once prep begins, the system should create:

- contract prep task bundle
- draft document placeholder or generated draft
- readiness summary
- missing-information checklist
- linked document artifacts

## Readiness States

### Not Started

- no contract intent yet

### Capturing Terms

- agreement family is plausible
- key details still missing

### Qualified

- relationship is ready for contract preparation review

### Draft Ready

- human approved preparation
- draft can be opened or generated

## Human Gates

Required human gates:

- confirm qualification
- approve contract preparation

Optional later gates:

- approve generated draft
- approve external send

## Failure Rules

Do not create a draft automatically when:

- counterparties are ambiguous
- agreement family is unclear
- material terms are insufficient
- reviewer rejects AI recommendation

Instead:

- keep the relationship in build/review
- create missing-term tasks
- schedule follow-up
- expose readiness as blocked

## Demo Requirements

The demo should show:

1. discovery artifact enters the lifecycle
2. CRM marks the relationship as qualified
3. contract readiness becomes visible
4. a human approves contract preparation
5. draft appears in documents/contracts flow
