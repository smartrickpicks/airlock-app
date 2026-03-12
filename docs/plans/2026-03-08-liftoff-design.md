# Liftoff: Airlock HQ — Solo Founder MVP Design

**Date:** 2026-03-08
**Status:** Approved
**Milestone:** Liftoff (Phase 4 of Zero-to-One)

---

## What is Liftoff?

Liftoff is a fully operational Airlock HQ — real data, real LLM, real workflows. Not a demo. Not mock data. A working product Zachary uses daily as a solo founder to prospect customers, manage contracts, and build his business.

### Terminology

| Term          | Definition                                                                     |
| ------------- | ------------------------------------------------------------------------------ |
| **Liftoff**   | Fully operational Airlock HQ. Real data, real LLM, real workflows. Used daily. |
| **Demo**      | Pre-scripted walkthrough with canned data for showing a concept.               |
| **Mock/Stub** | Technical placeholder returning hardcoded data.                                |

---

## Workspace: Airlock HQ

**Name:** Airlock HQ
**Purpose:** Dogfooding — using Airlock to build and sell Airlock
**Owner:** Zachary Holwerda (solo founder)
**Persona:** Power configurator who builds and customizes

### Modules in Use

| Module        | Real Use Case                                                                           |
| ------------- | --------------------------------------------------------------------------------------- |
| **CRM**       | Prospect list: music industry execs, investors, technical partners, Maverick candidates |
| **Contracts** | Partnership agreements, NDAs, licensing deals — vaults through chambers                 |
| **Triage**    | Airlock's own feature backlog, bugs, sprint planning                                    |
| **Documents** | Pitch decks, one-pagers, technical docs, investor materials                             |
| **Calendar**  | Demo meetings, investor calls, follow-ups                                               |
| **Otto**      | Live research on prospects, draft outreach, summarize contracts, product decisions      |

---

## Vault Lifecycle: Entry Points

Not every vault starts in Discover. The chamber a vault enters depends on context:

| Entry Point                     | Chamber  | Example                                                                             |
| ------------------------------- | -------- | ----------------------------------------------------------------------------------- |
| **New prospect**                | Discover | "Research Crescendo Entertainment Group" — Otto builds org tree, finds stakeholders |
| **New deal/partnership**        | Build    | Assembling terms, documents, action items, workflows                                |
| **Existing contract ingestion** | Review   | M&A contracts — already executed, being verified and extracted                      |
| **Verified templates/configs**  | Ship     | Schema-verified rules, production configs, exportable playbooks                     |

### Ship Chamber = Production Templates

Ship is where verified knowledge becomes reusable infrastructure:

- **Template packs** — verified contract schemas as baselines
- **Drift detection rules** — new contracts compared against shipped templates
- **Cross-entity normalization** — acquired orgs mapped to existing vocabularies
- **Exportable packs** — skills + rules + templates others can install

---

## The Story: Crescendo Entertainment Group

### Background

Crescendo Entertainment Group was a POC client for OrcestrateOS (Airlock's predecessor). They ended the engagement because the vision was "too big." Airlock is the realized version of that vision — built to prove them wrong and win the business back.

### The Pitch Flow (Post-Liftoff)

**Act 1: "Watch me use Airlock to prospect YOU"**

- Open Airlock HQ, create vault "Win Back CEG" in Discover
- Otto researches CEG live: org structure, M&A activity, key people
- CRM populates from Otto's findings
- Show them: "This is how I found the right person to call"

**Act 2: "Here's what I built to present to you"**

- Vault moves to Build
- Pitch deck assembled in Documents, talking points from Otto
- Triage board shows preparation tasks
- Show them: "Every step is tracked and reproducible"

**Act 3: "Now imagine this is YOUR workflow"**

- Show the CEG workspace concept — M&A contracts in Review
- Extraction engine pulling terms from existing contracts
- Verification pipeline with gates and approvals
- Show them: "The same tool that brought me here can run your operation"

### Two-Phase Proof

1. **Liftoff proves the 1-person theory** — solo founder runs everything through Airlock
2. **CEG onboarding proves enterprise scaling** — 1000+ person org with M&A contract ingestion
3. **After both proof points** — open season: 1-2 years of building, testing, piloting, winning deals

---

## Seed Data: Your Real Life

Seed data reflects Zachary's actual situation, not fictional scenarios:

- **CRM contacts:** CEG execs, agency contacts, potential investors (anonymized as needed)
- **Vaults:** "Win Back CEG" (Discover), "Investor Pitch Round" (Build), contract samples (Review)
- **Triage items:** Airlock's real feature backlog
- **Documents:** Pitch deck template, one-pager, contract samples from OrcestrateOS (anonymized)
- **Contract samples:** Real samples from OrcestrateOS POC work

---

## Agent Assignments

### Track A: VS Code Agent — Make It Real

Replace mock with real on the critical path:

| Priority | Task                                                           |
| -------- | -------------------------------------------------------------- |
| A1       | Backend database up (PostgreSQL + Redis, migrations applied)   |
| A2       | Auth/login working (Google OAuth, JWT, sessions)               |
| A3       | Onboarding flow (fresh login → create workspace → Dispatch)    |
| A4       | Vault CRUD + chamber transitions (create, move, gate)          |
| A5       | Otto live LLM (API keys, Claude/GPT, streaming, research tool) |
| A6       | CRM real CRUD (contacts, pipeline, vault attachment)           |
| A7       | Triage board (Kanban, drag-and-drop, create/edit/move)         |
| A8       | Documents (upload, attach to vaults, viewer)                   |

### Track B: CLI Agent — Seed Your Real Life

| Priority | Task                                                |
| -------- | --------------------------------------------------- |
| B1       | Workspace seed: Airlock HQ (workspace, user, roles) |
| B2       | CRM contacts (CEG, agency, investors — anonymized)  |
| B3       | Vaults at different chambers                        |
| B4       | Triage items (Airlock backlog)                      |
| B5       | Documents (templates, samples from OrcestrateOS)    |

### Track C: Web App Agent — Playbooks & Content

| Priority | Task                     |
| -------- | ------------------------ |
| C1       | Liftoff quickstart guide |
| C2       | Investor pitch playbook  |
| C3       | NotebookLM source pack   |

### Track D: Orchestrator — Validate & Gate

- Review every output
- Define and run Liftoff validation checklist
- Declare Liftoff when checklist passes

---

## Liftoff Validation Checklist

```
[ ] Fresh browser → login → Google OAuth → lands on Dispatch
[ ] Create workspace "Airlock HQ" via onboarding wizard
[ ] Create vault "Win Back CEG" → lands in Discover chamber
[ ] Ask Otto: "Research Crescendo Entertainment Group" → real LLM response
[ ] CRM: Create contact from Otto's research
[ ] Move vault to Build → gate transition works
[ ] Attach document to vault
[ ] Triage: Create task "Prepare CEG pitch deck"
[ ] Move vault to Review → gate requires Gatekeeper approval
[ ] Move vault to Ship → produces exportable template
[ ] All data persists after browser refresh
```

---

## What Can Stay Mock (Not on Critical Path)

- Meeting Intelligence (no Jitsi needed)
- Messenger DMs (solo user — no one to message)
- Advanced workflow canvas (React Flow builder)
- Event Bus advanced routing (BullMQ jobs)

---

## Product Vision (Context)

Airlock scales from 1 person to 1000+ in billion-dollar companies. The product promise: take an idea from discovery to release — without a product, without a service mapped out — and create a business.

Three personas represent the market:

- **Controller** (business operator) — needs it to just work
- **Maverick** (power configurator) — customizes, builds packs, goes nuts with forks
- **Builder** (developer) — vibe-codes plugins, extends the platform

The moat is configurability. Skill builders and playbook builders so easy a finger-typing Karen can use them. So powerful an angsty college coder builds the craziest plugins.

Playbooks and skills emerge from Zachary's own usage. Strip away what's unique to his setup, and what remains is the product template for everyone else.
