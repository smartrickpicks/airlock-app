# Airlock Official Taxonomy

> **Status:** IN PROGRESS — under active design review
> **Last updated:** 2026-03-08
> **Source of truth for:** all role names, layer definitions, playbook vocabulary

---

## The Six Layers

```
LAYER 0 — Workspace
LAYER 1 — Org Role
LAYER 2 — Module Role
LAYER 3 — Archetype
LAYER 4 — Skills
LAYER 5 — Recipe
LAYER 6 — Playbook
```

Each layer is independent. A user carries values at every layer simultaneously.

---

## Layer 0 — Workspace

The workspace is the top-level tenant boundary. Every piece of data is scoped to a workspace via `workspace_id`.

**The Architect** is the workspace creator — the Discord "server owner" equivalent. They are automatically assigned:
- Org Role: `Architect`
- Module Role: `Conductor` in all enabled modules

The Architect is the only person who can install/uninstall Playbooks, promote Conductors per module, and configure workspace-wide defaults.

---

## Layer 1 — Org Role

Controls workspace membership tier. One per user per workspace.

| Role | Description | Admin-level? |
|------|-------------|--------------|
| **Architect** | Full workspace control + Conductor in all modules. Installs playbooks, manages billing, promotes Conductors. | Yes |
| **Member** | Default membership. Can hold module roles and an archetype. No workspace config access. | No |
| **Billing** | Finance read-only. Sees billing dashboard, no operational access. | No |
| **Guest** | Invite-scoped, time-limited access. Cannot hold module roles beyond what the invite specifies. | No |

> **Rule:** Only `Architect` is "admin" in the traditional sense. The word "admin" does not appear in Module Roles.

---

## Layer 2 — Module Role

Operational role within a specific module. One per module per user. Controls which chambers you operate in and which vaults are visible to you.

| Role | Chambers | Vault visibility |
|------|----------|-----------------|
| **Builder** | Discover + Build | Vaults they own or are assigned to |
| **Gatekeeper** | Review | All vaults in the Review queue for their module |
| **Owner** | Ship | All vaults in their module |
| **Conductor** | All (meta) | All vaults across all chambers — configure only |
| **Viewer** | Any (read-only) | Vaults explicitly shared with them |

> **Conductor is not above Owner in hierarchy** — it is a parallel track. Conductor configures how the system works; Owner operates within it.

### Chamber Access Matrix

| Role | Discover | Build | Review | Ship |
|------|----------|-------|--------|------|
| Builder | ✓ operate | ✓ operate | — | — |
| Gatekeeper | — | — | ✓ operate | — |
| Owner | observe | observe | observe | ✓ operate |
| Conductor | ✓ configure | ✓ configure | ✓ configure | ✓ configure |
| Viewer | read | read | read | read |

---

## Layer 3 — Archetype

Behavioral profile. One per user, global (not per module). Self-selected or inferred via 5-question Socratic Q&A on first login.

Controls: agent communication style, default skill loadout, UI view density, proactivity level.
Does NOT control: permissions, vault visibility, chamber access.

| Archetype | Work style | Agent tone | Default view density |
|-----------|-----------|------------|---------------------|
| **Analyst** | Data-first, precision, pattern-finding | Cite numbers, show confidence %, minimal prose | High — tables, charts |
| **Strategist** | Big picture, connects patterns, plans ahead | Pattern framing, connects to prior vaults | Medium — timelines |
| **Executor** | Task-driven, action-oriented, moves fast | Terse, action verbs, one CTA per message | Low — inbox-first |
| **Connector** | Relationship-driven, stakeholder-heavy | Warm, names stakeholders, narrative context | Medium — activity feed |
| **Guardian** | Compliance-minded, risk-aware, process-oriented | Cautious, flags first, cites policy | High — audit trails |
| **Architect** | Systems thinker, builds structure, designs workflow | Structural, explains reasoning, shows logic | High — schema/config |

> **Framework note:** Archetypes are inspired by PI (Predictive Index) Reference Profiles. Lead with PI in external/investor contexts — stronger psychometric backing than MBTI.

---

## Layer 4 — Skills

Composable capabilities. Additive on top of archetype defaults. Conductor assigns skills to recipe nodes. Multiple skills can be active at any node.

### Skill catalog (v1)

| Skill | Description | Default archetype affinity |
|-------|-------------|---------------------------|
| `entity-lookup` | Search and resolve entity references | Analyst, Architect |
| `confidence-explainer` | Explain AI extraction confidence scores | Analyst, Guardian |
| `flag-for-gatekeeper` | Raise a handoff signal to the Review queue | Guardian, Executor |
| `field-suggestions` | AI-suggested values for incomplete fields | Executor, Analyst |
| `lookup` | External data lookup (CRM, registry, etc.) | Connector, Analyst |
| `entity-graph` | Visualize entity relationship network | Architect, Strategist |
| `alias-mapper` | Map alternate names/spellings to canonical entities | Analyst, Architect |
| `diff-view` | Side-by-side comparison of vault versions | Guardian, Gatekeeper |
| `rfi-builder` | Compose and send a Request for Information | Connector, Guardian |
| `stakeholder-map` | Identify and notify relevant stakeholders | Connector, Owner |
| `gate-validator` | Run gate condition checks and surface results | Guardian, Conductor |

> **Muting pattern:** Conductor can suppress specific skills per chamber without changing the underlying archetype defaults. Example: suppress `flag-for-gatekeeper` in Ship to prevent blocking the publish flow.

---

## Layer 5 — Recipe

An ordered sequence of nodes defining exactly how a user moves through a chamber for a specific vault type.

**Scoped to:** Role × Chamber × Vault Type
**Owned by:** Workspace (editable copy of Airlock defaults)
**Executed by:** The user (task runner in Signal panel)
**Configured by:** Conductor (recipe editor in Admin overlay)

### Node types

| Type | Purpose |
|------|---------|
| `extraction` | AI pulls entities from uploaded documents |
| `review` | Human reviews AI output |
| `fill` | Human completes required fields |
| `tag` | Human labels entity relationships |
| `approve` | Gatekeeper or Owner signs off |
| `notify` | System sends stakeholder alert |
| `gate` | Hard checkpoint — must pass conditions before advancing |

### Gate condition families

| Family | Examples |
|--------|---------|
| Field value | required field is not null, confidence ≥ X% |
| Step completion | steps 1–N all marked complete |
| Signal count | open flags = 0, open RFIs = 0 |

### Copy-on-write model

Airlock ships immutable default recipes (`airlock_recipes`). On workspace creation, all defaults for enabled vault types are copied into `workspace_recipes`. The workspace fully owns their copy — Conductor edits from there. `[Reset to Airlock Default]` is always available.

---

## Layer 6 — Playbook

A named, pre-configured bundle for a specific use case. The unit of "here's what you need to make this work."

**Bundles:**
- Roles needed (which module roles + how many of each)
- Vault types (which vault types to seed)
- Recipes (pre-configured for all Role × Chamber × Vault Type combinations)
- Skills (pre-loaded per role archetype)
- Invite links (generated, one per role, single-use, non-expiring)

**The prescriptive model:** Airlock tells the Architect what they need — "this playbook requires 1 Owner, 1 Gatekeeper, and 2 Builders." The Architect doesn't configure; they approve and send links.

### Out-of-the-box Playbooks (music/entertainment industry)

| Playbook | Roles | Vault Types | Use case |
|----------|-------|-------------|----------|
| **Contract Review** | Builder + Gatekeeper + Owner | Distribution Agreement, Publishing Deal | Legal review of incoming deals |
| **Sales Discovery** | Builder + Owner + Conductor | Opportunity, Meeting Notes, Proposal | New business pipeline |
| **Artist Onboarding** | Builder + Gatekeeper + Owner | Artist Management Agreement | New artist intake |
| **Label Deal Flow** | Builder + Gatekeeper + Owner + Conductor | Distribution Agreement, Co-Publishing | Full label deal lifecycle |
| **Sync Licensing** | Builder + Gatekeeper + Owner | Sync License | Film/TV sync placement |
| **Publishing Admin** | Builder + Gatekeeper + Owner | Publishing Deal, Work-for-Hire | Publishing administration |

> **Phase C:** Template library — Architect browses a catalog of community/industry playbooks and installs any. Same copy-on-write model as recipes — workspace owns their copy after install.

---

## How the Layers Interact

```
User joins workspace via invite link
  → Org Role assigned (from token)
  → Module Role assigned (from token)
  → Archetype Q&A (5 Socratic questions)
  → Default skill loadout applied
  → Task runner pre-loaded with first recipe node

Conductor customizes workspace
  → Edits workspace_recipes (steps, skills, gate conditions)
  → Assigns/mutes skills per node
  → Adjusts gate condition thresholds

Architect installs playbook
  → Vault types seeded
  → workspace_recipes copied from airlock_recipes
  → Invite links generated (1 per role in playbook)
  → Sends links to pilot super users (single-use, non-expiring)
```

---

## Vocabulary Reference

| Term | Meaning | Do NOT use |
|------|---------|------------|
| Module | Top-level domain (Contracts, CRM, Tasks, Calendar, Documents) | Channel, workspace, section |
| Vault | Workflow instance — the primary unit of work | Deal, case, ticket, record |
| Chamber | Lifecycle stage (Discover → Build → Review → Ship) | Phase, stage, step, status |
| Gate | Chamber checkpoint — must pass before advancing | Milestone, approval |
| View | Screen within a chamber | Page, tab, panel |
| Triptych | Three-panel layout (Signal \| Orchestrate \| Control) | Dashboard, layout, workspace |
| Signal | Left Triptych panel — task runner, alerts, activity | Sidebar, inbox |
| Orchestrate | Center Triptych panel — primary work surface | Main, content, canvas |
| Control | Right Triptych panel — context, config, metadata | Details, inspector, sidebar |
| Playbook | Named bundle of roles + recipes + skills for a use case | Template, preset, configuration |
| Recipe | Ordered node sequence for a Role × Chamber × Vault Type | Workflow, process, checklist |
| Archetype | User's behavioral profile (Analyst, Executor, etc.) | Persona, type, role |
| Architect | Workspace creator — full control + Conductor in all modules | Admin, super admin, owner |
| Conductor | Module-level AI/recipe configurator | Admin, manager, power user |

---

## Open Questions

- Can a Member hold roles from multiple playbooks simultaneously?
- Can a playbook be installed more than once with different configurations (e.g., "Contract Review — US" and "Contract Review — EU")?
- Does archetype affect which recipe nodes are shown, or only how skills behave at each node? (Phase 4)
- Schema adapter / org mapping: how do customer job titles map to Airlock roles during workspace setup? (separate spec)
