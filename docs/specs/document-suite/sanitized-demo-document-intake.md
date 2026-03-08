# Sanitized Demo Document Intake

## Purpose

Define how sanitized source documents should be brought into the demo so the discovery and lifecycle flows can use realistic artifacts without making backend or compliance commitments too early.

## Goal

The demo should support credible document intake from curated, sanitized materials so users can:

- upload documents
- import documents from a cloud source such as Google Drive
- attach documents to accounts and workflows
- use those documents as discovery and contract artifacts

## In Scope

- curated sanitized demo documents
- upload and import planning
- metadata expectations
- artifact labeling
- demo categorization
- how imported documents should appear in module surfaces

## Out of Scope

- final storage architecture
- Google Drive API design
- OCR pipeline design
- production security policy

## Document Classes to Support

The planning set should assume these demo classes:

- discovery briefs
- intake forms
- call summaries
- transcripts
- contract source examples
- template documents
- generated drafts
- signed copies
- supporting finance or schedule attachments

## Intake Paths to Represent

The demo should represent these document entry paths:

### Local upload

Examples:

- PDF uploaded by operator
- DOCX uploaded by operator
- transcript text attached manually

### Cloud import

Examples:

- Google Drive document import
- selected shared folder file
- imported draft or redline reference

### System-created artifacts

Examples:

- generated summary
- generated contract draft
- signed copy placeholder

## Metadata to Capture

Every demo document should be able to carry:

- artifact label
- source type
- related account
- related contact or stakeholder if relevant
- related workflow or lifecycle phase
- uploaded or imported by
- document category
- confidence or review-needed flag if inferred

## Sanitization Guidance

Use sanitized assets that remove or replace:

- real personal contact information unless intentionally fictionalized
- account numbers
- payment credentials
- confidential pricing that should not appear in a public demo
- signature images unless safely synthetic
- any terms that could create accidental legal confusion

Preferred replacements:

- fictional names
- fictional organizations
- masked emails
- masked phone numbers
- synthetic addresses
- synthetic commercial terms where needed

## Demo Library Strategy

The curated demo library should include:

- a few polished anchor documents tied to seeded accounts
- a few import-ready examples for ad hoc demo actions
- at least one document per major lifecycle step

Recommended anchor sets:

- website-intake-to-discovery packet
- meeting-transcript-to-build packet
- contract-draft-to-signature packet

## Expected Demo Behaviors

When a document is uploaded or imported, the local demo should be able to show it in:

- documents library
- CRM activity or account memory
- related review context if needed
- contract or discovery surfaces if it affects the lifecycle

The goal is not perfect rendering fidelity on day one. The goal is believable attachment and visibility.

## Google Drive Planning Posture

For demo and planning purposes, Google Drive import should be treated as:

- a visible intake path
- a source metadata label
- a future provider integration

The demo may show:

- `Import from Google Drive`
- selected file metadata
- imported artifact card

The demo should not imply production sync, background polling, or permission scopes yet.

## Recommended Demo States

### State 1: Upload attached to discovery

- user uploads a transcript or source PDF
- account memory timeline updates
- artifact appears in documents

### State 2: Drive import attached to account

- user imports a Drive document
- source label shows Google Drive
- artifact appears in account context and documents

### State 3: Generated artifact joins source artifacts

- generated contract appears beside uploaded and imported source documents
- user can view that the lifecycle created a new first-class artifact

## Acceptance Criteria

This planning doc is complete when the demo can credibly support:

1. local upload as a discovery source
2. cloud import as a conceptual source
3. sanitized source materials tied to seeded and user-created accounts
4. artifact visibility in both documents and account-linked views
