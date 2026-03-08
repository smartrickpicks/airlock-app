# Stakeholder Mapping

## Purpose

Define how stakeholder intelligence reinforces the account-memory workspace.

Stakeholder mapping should not be a separate isolated CRM widget. It should directly inform communication targeting, workflow routing, and account memory interpretation.

## Stakeholder record

Each stakeholder should support:

- `stakeholder_id`
- `account_id`
- `contact_id`
- `role_type`
  - champion
  - decision_maker
  - evaluator
  - legal
  - finance
  - procurement
  - blocker
  - influencer
  - end_user
- `influence_level`
  - high
  - medium
  - low
- `decision_role`
- `sentiment`
- `ownership_notes`
- `status`
  - `inferred`
  - `confirmed`
  - `inactive`

## Behaviors

Stakeholder mapping should enable:

- targeting a specific stakeholder in composition
- targeting a stakeholder group
- seeing last touch and communication history
- identifying missing roles
- surfacing blockers and champions
- understanding internal owner coverage

## Group targeting

Stakeholder groups may be:

- explicit named groups
- generated from role rules
- a hybrid of both

Examples:

- Finance Team
- Legal Review
- Buying Committee
- Procurement

## Interaction with account memory

The account-memory workspace should show:

- who a message concerns
- who was included
- which stakeholder roles remain unaddressed
- which communications changed sentiment or ownership

## Demo scope

The demo should show:

- stakeholder list with influence and role
- missing stakeholder alerts
- group chips such as `@finance-team`
- champion/blocker indicators
