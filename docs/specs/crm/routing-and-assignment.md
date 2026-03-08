# Routing and Assignment

## Purpose

Define how inbound communication and account-memory events are assigned or routed.

## Routing priorities

1. explicit owner
2. account default owner
3. stakeholder-specific owner
4. queue fallback
5. AI recommendation when rules are insufficient

## Routing event record

Should support:

- `event_id`
- `thread_id`
- `event_type`
- `trigger_source`
- `assigned_to`
- `queue_id`
- `reason`
- `ai_involved`
- `confidence`
- `resolved_by`

## Human override

Routing must always support:

- owner reassignment
- queue routing
- manual stakeholder correction
- approval before external execution

## AI role

AI may:

- suggest owner
- suggest stakeholder association
- flag missing role coverage

AI should not:

- silently send outbound communication
- finalize ambiguous account matches without review
