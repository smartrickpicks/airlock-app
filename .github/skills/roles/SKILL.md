---
name: roles
description: Load when working with users, permissions, org roles, module roles, agentic roles, members, access control, vault membership, or OTTO tool gating. Also load if you are unsure what a user can or cannot do in any part of the platform.
---

# Airlock Role System

Airlock uses a **three-layer identity model**. Every user has a role at each layer simultaneously. Permissions are the intersection of all three.

---

## The Quick Version (For Anyone)

Think of it like a building with floors and rooms:

- **Org Role** = your security badge tier. It sets the absolute ceiling on what you can ever do, anywhere.
- **Module Role** = which rooms you can enter and what you can do inside them. You can have a different role in each module.
- **Agentic Role** = how your workspace is laid out for how you think. Same permissions, different interface.

---

## Layer 1 — Org Role (Platform-Wide Tier)

The org role is the **ceiling**. No module role can grant more than this allows.

| Org Role      | Who This Is                        | What They Can Access                                      |
| ------------- | ---------------------------------- | --------------------------------------------------------- |
| **Member**    | Standard employee, contributor     | View-only across org + modules they're assigned to        |
| **Lead**      | Team lead, department manager      | Manage within their assigned modules                      |
| **Director**  | Department head                    | Full access to assigned modules + cross-module visibility |
| **Executive** | C-suite, founder, board observer   | Read access everywhere + Admin Overlay                    |

> **Non-technical read:** Your org role is like your job seniority level. A contractor (Member) can do work but can't make company-wide decisions. A Director can see across departments. An Executive can see everything but isn't in the weeds of daily operations.

---

## Layer 2 — Module Role (Per-Module Functional Role)

Module roles are assigned **per module**. One person can be an Owner in Contracts and a Viewer in CRM — simultaneously.

| Module Role    | What They Do                                                              | What They Cannot Do                        |
| -------------- | ------------------------------------------------------------------------- | ------------------------------------------ |
| **Builder**    | Creates records, drafts patches, assembles evidence, runs extractions     | Approve their own work, promote to baseline |
| **Gatekeeper** | Reviews evidence, approves or rejects patches, enforces proof standards   | Create records, approve their own work      |
| **Owner**      | Makes final decisions, promotes truth to baseline, manages module config  | Bypass gatekeeper sign-off                 |
| **Designer**   | Builds schemas, configures extraction rules, operates in sandbox mode     | Approve live production records             |
| **Viewer**     | Reads data, events, and audit history                                     | Take any action                            |

### Real Example

> Ana Chen is a **Member** at the org level.
> - In **Contracts**: she's an **Owner** — she runs contract adjudication
> - In **CRM**: she's a **Viewer** — she can see customer data but not edit it
> - In **Tasks**: she's a **Builder** — she creates and completes tasks
>
> Her org role (Member) means she cannot access the Admin Overlay regardless of her module roles.

---

## Layer 3 — Agentic Role (How the Interface Is Tuned)

16 roles from the Sovereign Workplace framework. These do **not** change permissions — they change how the UI is presented. Same access, different layout and tooling emphasis.

### Growth & Momentum (Numerator Contributors)

| Role | What They Focus On | AI Assist Ceiling |
| ---- | ------------------ | ----------------- |
| Truth Keeper | Define "correct", establish baselines | 40% |
| System Architect | Build rules, schemas, structures | 50% |
| Momentum Builder | Accelerate execution, build workflows | 60% |
| Evidence Curator | Assemble proof for governance | 70% |
| Fast Path Executor | Push low-risk items through safely | 65% |
| Maverick Innovator | Challenge status quo, prototype | 30% |

### Entropy & Friction Control (Denominator Managers)

| Role | What They Focus On | AI Assist Ceiling |
| ---- | ------------------ | ----------------- |
| Verifier | Eliminate "trust me" scenarios | 50% |
| Friction Taxonomist | Categorize chaos, understand exceptions | 55% |
| Authority Validator | Enforce permissions, audit access | 60% |
| Cold Route Guardian | High-risk go/no-go gatekeeper | 45% |
| Semantic Sheriff | Prevent semantic drift | 55% |
| Process Facilitator | Optimize flow, coordinate stakeholders | 40% |
| Compliance Analyst | Validate proof against controls | 50% |

### Trust Multipliers (Consciousness Amplifiers)

| Role | What They Focus On | AI Assist Ceiling |
| ---- | ------------------ | ----------------- |
| Observer | System-wide metrics and monitoring | 75% |
| Drift Detective | Detect behavioral shifts, silent degradation | 70% |
| Team Orchestrator | Balance system, prevent burnout | 25% |

---

## How Permissions Are Computed

```
effective_permissions =
  base_permissions(module_role)       ← what the module role allows
  + ad_hoc_grants(user, vault)        ← one-off grants by an admin
  - ad_hoc_denies(user, vault)        ← one-off restrictions by an admin
  ∩ ceiling(org_role)                 ← org role caps everything — non-negotiable
  - HARDCODED_SOD                     ← self-approval is always blocked, no override possible
```

**Separation of Duties (SoD) is hardcoded — not a UI suggestion:**
- A Builder cannot approve their own patch
- A Gatekeeper cannot approve their own work
- An Owner cannot promote without at least one Gatekeeper sign-off

---

## Vault-Level Membership

Within a specific Vault, a user can be assigned a vault-level role that is independent of their module role. This is how you give a one-off contributor access to a single vault without changing their module-wide permissions.

| Vault Role    | Inherited? | Notes                                          |
| ------------- | ---------- | ---------------------------------------------- |
| `owner`       | No         | Explicit assignment                            |
| `gatekeeper`  | No         | Explicit assignment                            |
| `builder`     | No / Yes   | Can be inherited from parent vault             |
| `viewer`      | Yes        | Default when inherited from parent vault       |

Database: `vault_members(vault_id, user_id, role, inherited)`

---

## Database Schema (Quick Reference)

```sql
-- Org role lives on the user record
users.org_role: 'member' | 'lead' | 'director' | 'executive'

-- Module roles are a separate junction table
user_module_roles(user_id, workspace_id, module_id, module_role)
  module_role: 'builder' | 'gatekeeper' | 'owner' | 'designer' | 'viewer'

-- Vault-level overrides
vault_members(vault_id, user_id, role, inherited, assigned_at)
```

---

## Auth Store Shape (Frontend)

```typescript
interface AuthState {
  user: { id: string; email: string; name: string; avatarUrl?: string } | null
  orgRole: 'member' | 'lead' | 'director' | 'executive' | null
  moduleRoles: Record<string, 'builder' | 'gatekeeper' | 'owner' | 'designer' | 'viewer'>
  // agentic role stored in user metadata
}
```

---

## OTTO / MCP Tool Gating

Tools are gated on **both** org role AND module role. Both must pass.

| Tool | Module Role Required | Org Role Required |
| ---- | -------------------- | ----------------- |
| `extract_fields` | builder+ | member+ |
| `propose_patch` | builder+ | member+ |
| `evaluate_gate` | gatekeeper+ | lead+ |
| `promote_vault` | owner | director+ |
| `admin_tools` | any | executive |

---

## What Gets Wrong Without This Skill

- Using only `role: 'builder' | 'gatekeeper' | 'owner'` — misses org role ceiling and Designer/Viewer
- Treating roles as global — they are per-module
- Assuming UI role enforcement = code enforcement — SoD is hardcoded
- Ignoring vault-level membership — a user's module role is not their only access path
