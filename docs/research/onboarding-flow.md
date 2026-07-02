# Airlock: Zero-to-Production Stakeholder Onboarding Flow

> **Source:** Perplexity research session (2026-03-06)
> **Status:** RESEARCH ONLY — not a binding spec. Canonical decisions have been extracted to `docs/specs/platform/overview.md` and `docs/specs/onboarding/turnkey-flow.md`. Any new decisions from this document must be incorporated through the proper spec update process.

## Executive Summary

This document defines the complete turnkey onboarding journey for enterprise stakeholders adopting Airlock — from initial workspace creation through testable, production-ready deployment. The flow incorporates MCP-based configuration, component integration, Google Workspace/JIRA synchronization, and progressive activation aligned with Airlock's freemium model (free shell + paid engine).

**Target outcome:** Stakeholder creates workspace → configures integrations → maps users and roles → tests workflows → activates production engine in under 2 hours.

## Architecture Context

### The Airlock Model

**Free Shell (Self-Hosted):**

- Next.js/React frontend with reusable component library
- Generic primitives: lists, boards, timelines, detail panels, TipTap docs
- Local-only compute for basic functions
- UI driven entirely by MCP context server responses

**Paid Engine (Hosted):**

- Multi-tenant MCP context server (org settings, roles, layouts, permissions)
- Domain MCP servers: contracts, CRM, comms, calendar, knowledge
- AI orchestration, vector indexing, automation pipelines
- Heavy compute, compliance audit trails

**Configuration as Code:**

- JSON-based canonical journeys, lifecycles, semantics
- Stored in org-scoped MCP context server as resources
- Versioned, auditable, extensible by developers

## Phases

### Phase 0: Pre-Onboarding (Marketing → Sign-Up)

Entry points: Website CTA, Sales Demo, Developer Install.

Automated provisioning (~30s):

1. Generate org_id (ULID)
2. Create workspace DB row
3. Bootstrap MCP context server with seeded defaults (roles, journeys, layouts, permissions)
4. Create admin account, send welcome email

### Phase 1: Initial Admin Login & Configuration (13 min)

1. **Auth** — G Suite SSO or email login → MCP context server resolves permissions → shell renders onboarding wizard
2. **Branding** — workspace name, logo, timezone, custom domain
3. **Integrations** — enable Google Workspace, JIRA, Salesforce via OAuth flows → MCP server registry updated

### Phase 2: Team Configuration & Role Assignment (22 min)

1. **User Import** — review Google-synced users, assign roles (Owner/Admin/Manager/Member/Guest → mapped to Airlock org roles + module roles)
2. **Workspace Creation** — create module-scoped workspaces with permission matrices

### Phase 3: Data Mapping & Tool Configuration (23 min)

1. **Schema Mapping** — map external fields to Airlock core types (Vault, Event, Contact) with auto-mapping + confidence scores
2. **Journey/Chamber Config** — review/customize lifecycle stages (mapped to Discover > Build > Review > Ship chambers)

### Phase 4: Component Library & UI Configuration (15 min)

1. **View Selection** — configure triptych panel composition per module per role
2. **Permission Mapping** — Discord-style role × view/tool visibility matrix

### Phase 5: Testing & Validation (32 min)

1. **Invite Test Users** — send SSO links to 2-3 colleagues
2. **Workflow Simulation** — run contract lifecycle end-to-end through all 4 chambers
3. **Performance Check** — sync status, MCP connectivity, diagnostics

### Phase 6: Production Activation (28 min)

1. **Review & Subscribe** — upgrade from free trial to Pro/Enterprise (Stripe)
2. **Team Rollout** — phased: pilot → leads → full org
3. **Automation Setup** — configure event-driven tool chains

### Phase 7: Ongoing Extension

- Marketplace: install third-party MCP engines
- Custom Skills: natural language → tool chain via Otto
- Developer SDK: build and publish custom engines

## Total Onboarding Time

| Phase             | Stakeholder Time | Automated   |
| ----------------- | ---------------- | ----------- |
| 0. Provision      | 0 min            | 0.5 min     |
| 1. Login + Config | 13 min           | 2 min       |
| 2. Team           | 22 min           | 1 min       |
| 3. Data Mapping   | 23 min           | 0 min       |
| 4. UI Config      | 15 min           | 0 min       |
| 5. Testing        | 32 min           | 0 min       |
| 6. Activation     | 28 min           | 1 min       |
| **Total**         | **133 min**      | **4.5 min** |

## Key Architecture Decisions

1. **MCP as control plane** — all config, permissions, tools centralized in context server
2. **JSON-driven extensibility** — canonical journeys, layouts, roles as code (MCP resources)
3. **Zero-touch sync** — Google Workspace + JIRA auto-import users/data
4. **Freemium activation** — free shell → premium engines on demand
5. **Progressive disclosure** — essential config first, advanced config later

## Appendix

Full JSON config examples for `roles.json`, `journeys.json`, and `layouts.json` are documented in the original research session. Canonical versions are maintained in the MCP context server seed data at `scripts/seeds/definitions/` and referenced in `docs/specs/platform/overview.md`.
