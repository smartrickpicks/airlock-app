# CRM Discovery Operating Model

## Purpose

Define how CRM acts as the primary home for the discovery-to-contract lifecycle.

CRM is not a separate data island. It is the operational lens over relationship state created by intake, meetings, workflows, and contracts.

## Primary Principle

CRM owns the lifecycle state.

Other modules reflect CRM state:

- tasks reflect work
- calendar reflects timing
- documents reflect artifacts
- contracts reflect legal readiness
- workflows orchestrate transitions

## Core CRM Responsibilities

CRM must show:

- intake source
- chamber
- stage
- owner
- latest summary
- recommended next action
- contract readiness
- pending human gates

## Discovery Record Types

### Lead

Used when identity or fit is still emerging.

Typical qualities:

- may be unmatched
- may be sourced from website, text, transcript, or manual entry
- may not have confirmed account linkage yet

### Relationship / Opportunity

Used once the system has enough context to treat the discovery work as a real pipeline item.

Typical qualities:

- known owner
- known account or account candidate
- chamber and stage state
- tasks, meetings, and artifacts linked

## Chamber Behavior

### Discover

Focus:

- intake
- initial qualification
- source normalization

CRM should emphasize:

- source channel
- latest inbound artifact
- open discovery tasks
- first human gate

### Build

Focus:

- active follow-up
- enrichment
- meeting cadence

CRM should emphasize:

- owner
- next follow-up
- meeting summaries
- agreement recommendation if emerging

### Review

Focus:

- approval
- readiness confirmation

CRM should emphasize:

- pending gates
- edited summaries
- contract readiness
- missing terms

### Ship

Focus:

- contract send
- onboarding handoff

CRM should emphasize:

- final branch taken
- send status
- onboarding tasks

## Recommended CRM Surface Fields

### Lead-level

- source
- source timestamp
- chamber
- stage
- match status
- score
- assigned rep
- latest summary
- next recommended action
- workflow name

### Opportunity-level

- chamber
- stage
- contract readiness
- pending gate count
- next task
- latest transcript summary
- assigned rep
- linked vault or draft

## Human Gate Behavior In CRM

CRM should surface gates as operational decisions, not hidden workflow internals.

Examples:

- review transcript summary
- approve outbound reply
- confirm qualification
- approve contract preparation

Each gate should show:

- why it exists
- what AI proposed
- what is blocked until it is resolved

## Initial v1 Scope

CRM must support these scenarios first:

- website lead enters discovery
- dedicated text creates or updates discovery thread
- meeting transcript updates relationship state
- qualified relationship unlocks contract prep
