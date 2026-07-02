# Airlock Platform Overview

## The Problem: Enterprise Data Operations Are Broken

Every enterprise runs on documents, contracts, customer records, and approval chains. But the tools used to manage these workflows are scattered across dozens of disconnected applications: spreadsheets for tracking, email for approvals, shared drives for storage, CRMs that nobody trusts, and Slack threads where decisions disappear.

The result is operational chaos. Teams lose visibility into what has been reviewed, who approved what, and whether the data they are acting on is actually correct. There is no single place where a contract, its extraction results, its review history, and its approval chain live together. People tab-switch between five applications to do what should be one workflow. Governance is aspirational at best -- "trust me, I checked it" replaces evidence-based decision-making.

Airlock exists to solve this.

---

## What Is Airlock?

Airlock is an enterprise data operations platform that unifies the entire lifecycle of business-critical work -- from initial document intake through extraction, review, approval, and final publication -- into a single operating surface.

Think of it as the control center where contracts get processed, customer relationships get managed, tasks get tracked, and documents get authored -- all within one consistent interface, with built-in governance at every step.

The interface draws inspiration from Discord's organizational model: a clean, persistent shell with modules (like Discord's servers) on the left, workspaces organized by lifecycle stage, and a three-panel workspace where the real work happens. It is modern, keyboard-friendly, and designed for professionals who spend hours in the platform every day.

---

## The Vault Model: How Work Moves Through Airlock

At the heart of Airlock is the **Vault** -- a secure, living container that holds everything related to a single unit of work. A vault might represent a distribution contract, a customer relationship, a compliance task, or a legal document. Whatever the work is, its source material, extracted data, annotations, review history, approval chain, and audit trail all live together inside the vault.

### Four Chambers: A Universal Lifecycle

Every vault moves through four sequential stages called **Chambers**:

1. **Discover** -- Work arrives. Documents are uploaded, data is ingested, and items are triaged for attention. This is where new contracts, leads, and tasks first appear and get sorted.

2. **Build** -- Work takes shape. Data is extracted from documents, fields are populated, records are enriched, and quality checks run automatically. Builders assemble evidence, draft corrections, and prepare work for review.

3. **Review** -- Work is validated. Independent reviewers evaluate the evidence, approve or reject proposed changes, and ensure quality standards are met. No one can review their own work.

4. **Ship** -- Work is finalized. Approved records are promoted to their canonical state, exported to downstream systems, and archived with a complete audit trail.

### Gates: Quality Checkpoints

Between each chamber sit **Gates** -- checkpoints that enforce quality requirements before work can advance. Gates are not suggestions; they are system-enforced. A vault cannot move from Build to Review until its gate conditions are satisfied. This means automated quality checks must pass, required fields must be populated, and confidence thresholds must be met.

Gates ensure that nothing slips through the cracks. They replace the "Did someone check this?" uncertainty with verifiable, auditable proof that every step was completed.

### Why This Matters

The four-chamber model is universal. It applies to contracts, customer records, tasks, documents -- any workflow in any domain. A team member who learns how contract processing works in Airlock can immediately navigate the CRM, task management, or document authoring modules because the lifecycle pattern is identical. The tools inside each chamber change, but the structure is always the same.

---

## Five Modules: One Platform for All Operations

Airlock organizes work into five functional modules, each addressing a core operational domain. Every module uses the same four-chamber lifecycle and the same interface patterns.

### Contracts

The contract lifecycle management engine. Upload contracts or draft new ones from templates. The system extracts key terms, dates, financial values, and counterparty information automatically. Proposed corrections flow through a structured review process, and approved contracts are published with a complete chain of evidence.

### CRM (Customer Relationship Management)

Customer and entity management built directly into the vault hierarchy. Parent companies, divisions, counterparties, and individual deals are organized in a natural tree structure. Pipeline views, account health scores, and relationship history all emerge from the same vault data -- no separate CRM database, no data synchronization problems.

### Tasks

A universal work queue that surfaces action items from across all modules. Kanban boards, table views, and agenda layouts give teams flexibility in how they manage their work. Tasks generated from contract milestones, CRM follow-ups, or manual creation all flow through the same system.

### Calendar

A date-centric view computed from vault data. Contract renewal dates, task deadlines, and milestone dates appear automatically -- no manual calendar entry required. The calendar reflects reality because it reads directly from the source records.

### Documents

A full document management suite with authoring, viewing, and template capabilities. Rich text editing, PDF rendering, and template-based document generation are all available within the platform, eliminating the need to switch to external editors.

---

## The Triptych: A Three-Panel Workspace

When working inside a vault, users see a three-panel layout called the **Triptych**. This is where the actual work happens.

### Signal (Left Panel)

The read-only intelligence feed. Signal displays a chronological stream of everything happening in the vault: extraction results, quality check outcomes, AI-generated observations, approval decisions, and team comments. It is the vault's memory -- an immutable record of every event and insight, always visible for context.

### Orchestrate (Center Panel)

The primary workspace. This is where users perform their core tasks: reviewing extracted data fields, editing records, viewing documents, comparing original and proposed changes, or generating new contracts. Orchestrate adapts based on what the user needs to do and what chamber the vault is in.

### Control (Right Panel)

The governance and action panel. Control shows the vault's current lifecycle state, SLA countdown timers, approval chains, audit trails, and the AI assistant interface. This is where reviewers approve or reject changes, where owners promote records, and where the complete decision history lives.

The Triptych keeps context, workspace, and governance visible simultaneously. Users never lose sight of the bigger picture while doing detailed work.

---

## Governance Philosophy: Proof Over Vibes

Airlock is built on a fundamental governance principle: **decisions require evidence, not trust**.

### Three Roles, Clear Boundaries

Every user operates within one of three primary roles, and the system enforces strict separation of duties:

- **Builder** -- The doer. Builders discover issues, extract data, draft corrections, assemble evidence, and prepare work for review. They operate primarily in the Discover and Build chambers.

- **Gatekeeper** -- The referee. Gatekeepers evaluate evidence, approve or reject proposed changes, and enforce quality standards. They operate primarily in the Review chamber. A Gatekeeper cannot approve changes they authored themselves.

- **Owner** -- The publisher. Owners make final decisions, promote approved records to their canonical state, and manage module configuration. They operate primarily in the Ship chamber. An Owner cannot promote work without Gatekeeper sign-off.

### Separation of Duties Is Code-Enforced

This is not a policy document that people choose to follow. Airlock's role boundaries are enforced in the code itself:

- A Builder cannot approve their own corrections.
- A Gatekeeper cannot approve work they drafted.
- An Owner cannot promote changes they authored without independent review.
- As risk increases, approval requirements scale: low-risk changes need one reviewer; high-risk changes need multiple reviewers plus a cooling period.

### Decision Lineage

Every action in Airlock has a traceable chain: who proposed the change, who verified it, who promoted it, and when each step occurred. The audit trail is immutable and append-only. There is no "trust me, I checked it" in Airlock -- there is only "here is the evidence that it was checked, by whom, and when."

### Adaptive Permissions

The permission system supports fine-grained customization. Organizations can create custom roles with specific permission sets, grant temporary escalations with automatic expiry dates, and scope access to specific modules or vaults. Permissions are additive and fully audited: every grant, denial, and revocation is logged.

---

## AI Agent: Otto

Airlock includes an AI assistant called **Otto** that augments human decision-making without replacing it.

### What Otto Does

Otto has access to the vault's full context: extracted data, document content, entity history, quality check results, and prior review decisions. It can:

- Surface relevant insights and risk flags in the Signal feed
- Answer questions about vault contents and extraction results
- Propose data corrections (which still require human approval)
- Explain why a quality check failed and suggest remediation
- Search across the document corpus for relevant precedents

### What Otto Does Not Do

Otto operates strictly within the "human in the loop" principle. It proposes -- it never unilaterally acts. Every suggestion Otto makes flows through the same approval chain as human-initiated changes. There are no autonomous actions.

### Provider-Agnostic Architecture

Otto is not locked to a single AI vendor. The platform routes through a model gateway that supports multiple providers, with automatic failover if a provider is unavailable. Organizations can configure which models to use, set response parameters, and create specialized agent roles (such as a Compliance Reviewer or Onboarding Assistant) through the admin interface -- no code changes required.

### Observable and Controllable

Otto is fully managed through Airlock's control plane. Administrators can toggle AI features on or off, adjust confidence thresholds, monitor usage and costs, and review complete logs of every AI interaction. If the AI system experiences issues, circuit breakers automatically disable it and surface a clear status indicator.

---

## Business Model: Free Shell, Paid Engines

Airlock separates the platform into two tiers:

### The Shell (Free)

The core interface -- the module bar, vault navigation, triptych workspace, role-based access controls, and the four-chamber lifecycle -- is the shell. It provides the structure, navigation, and governance framework for managing work. Organizations can use the shell with manual data entry and basic workflows at no cost.

### Engines (Paid)

The intelligence layer -- document extraction, entity resolution, contract generation, AI-assisted review, automated quality checks, and batch processing -- are engines that plug into the shell. Each engine is independently toggleable, calibratable, and auditable through the Feature Control Plane.

This architecture means:

- **Low barrier to entry.** Organizations adopt the shell's workflow structure first, without committing to AI or automation.
- **Incremental value.** Engines are enabled one at a time as the organization is ready, creating a natural upgrade path.
- **Full administrative control.** Every engine has a toggle (on/off), calibration parameters (adjustable thresholds and confidence levels), an expanded audit log (every evaluation recorded), and failure flagging (automatic detection and circuit-breaker behavior).
- **No vendor lock-in on intelligence.** The AI gateway supports multiple providers. Extraction engines are modular. Organizations retain control over which capabilities they use and how they are configured.

---

## Why Airlock Matters: Competitive Differentiators

### One Operating Surface

Most enterprise platforms solve one problem: contract management OR CRM OR task tracking. Airlock combines all five operational domains into a single interface with a shared data model. The vault hierarchy that organizes contracts also powers the CRM. Task deadlines automatically populate the calendar. Document templates feed the contract generator. There is one source of truth, not five.

### Structured Lifecycle, Not Ad-Hoc Workflows

The four-chamber model (Discover, Build, Review, Ship) gives every piece of work a clear, repeatable path from intake to completion. Teams do not reinvent the process for each new contract or customer. The lifecycle is consistent, predictable, and observable at every stage.

### Proof Over Vibes

Airlock replaces "I checked it" with verifiable evidence. Every extraction, every correction, every approval, and every promotion is recorded with who did it, when, and what evidence supported the decision. The governance model is not optional -- it is the architecture.

### No Self-Grading

Separation of duties is not a best practice recommendation in Airlock -- it is a system-enforced rule. The person who drafts a change cannot be the person who approves it. This eliminates the single largest source of data quality failures in enterprise operations.

### AI That Assists, Not Replaces

Otto augments human judgment with context-aware suggestions, but every AI action flows through the same governance framework as human actions. Organizations get the speed benefits of AI without sacrificing accountability or control.

### Observable by Design

Every engine, every feature flag, every calibration parameter is visible and adjustable in the admin interface. Organizations can see exactly what the platform is doing, tune it to their risk tolerance, and audit every decision the system has made. Nothing operates as a black box.

---

## Summary

Airlock is a unified enterprise platform that brings contracts, customer relationships, tasks, calendars, and documents into one governed operating surface. Work moves through a universal four-chamber lifecycle with quality gates at every transition. Three clearly defined roles enforce separation of duties. An AI assistant augments human judgment without replacing it. And every action, decision, and approval is recorded in an immutable audit trail.

The result is an enterprise operations platform where data quality is verifiable, governance is structural, and the entire team works from a single source of truth.
