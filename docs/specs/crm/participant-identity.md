# Contact and Participant Identity

## Purpose

Define how people and channel identities are matched, created, or reviewed inside account memory.

## Identity principles

- one person may have multiple channels
- one account may have many stakeholders
- not every inbound participant should be trusted immediately
- manual and inferred creation paths must converge on the same canonical contact model

## Participant identity

### Required fields

- `participant_id`
- `contact_id`
- `account_id`
- `channel_addresses`
- `role_title`
- `stakeholder_role`
- `source_type`
- `confidence`
- `is_internal_user`
- `last_seen_at`

## Source types

- manual create
- import
- website form
- dedicated text
- email
- transcript extraction
- workflow inference

## Match outcomes

- strong match
- weak match / needs review
- no match / create candidate
- conflicting match / escalation

## Manual create support

The product must support:

- manual contact create
- manual stakeholder confirmation
- manual channel addition
- manual correction of inferred records

## Demo scope

The demo should reflect:

- confirmed contacts
- inferred contacts
- unknown sender candidate
- missing decision-maker warning
