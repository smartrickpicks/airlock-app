# Outbound Composition Behavior

## Purpose

Define outbound composition inside the account-memory workspace without committing to backend channel integrations too early.

## Supported modes for demo planning

- internal note
- email draft
- text draft
- future call placeholder

## Composition rules

- composition starts inside account context
- the user selects a channel mode explicitly
- the user can target people or groups
- approval state is visible before send
- internal notes never mix visually with external drafts

## Targeting patterns

Examples:

- `@email`
- `@text`
- `@stakeholder-name`
- `@finance-team`
- `@owner`

These are interaction patterns for the demo and spec. They are not parser commitments yet.

## Draft states

- draft only
- pending approval
- approved to send
- sent
- blocked by missing permission or missing channel

## Required visible indicators

- channel badge
- target badge(s)
- approval badge
- internal/external mode
- reason for block if unsendable
