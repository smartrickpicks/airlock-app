# M6: Playbook Templates + Storage — Implementation Plan

**Date:** 2026-03-09
**Milestone:** M6 (MAGS Phase 1)
**Depends on:** M5 (Otto Agent Prompting)

---

## Deliverables

1. **Playbook template schema** — Pydantic models for YAML playbook definitions
2. **YAML template loader** — Reads/validates playbook YAML files with caching
3. **3 starter templates:**
   - `contract-intake.yaml` — 7 nodes, 2 gates (from PI Engine design doc)
   - `pilot-close.yaml` — 6 nodes, 2 gates (from dogfood protocol)
   - `research-deep-dive.yaml` — 8 nodes, 3 gates
4. **`playbook_instances` table** — Running playbook state
5. **`playbook_nodes` table** — Per-node state within an instance
6. **CRUD routes** for playbook templates and instances

---

## Architecture

```
YAML files (templates)              Database (instances)
├── contract-intake.yaml     ┌─────────────────────────┐
├── pilot-close.yaml    ───► │ playbook_instances       │
├── research-deep-dive.yaml  │ playbook_node_states     │
                             └─────────────────────────┘
```

Templates are **static YAML** loaded from `src/services/playbooks/templates/`.
Instances are **database records** tracking runtime state of a playbook execution.

---

## Files to Create

### Schemas

- `src/schemas/playbook.py` — Pydantic models for templates, instances, node states

### Models

- `src/models/playbook_instance.py` — SQLAlchemy model for playbook_instances
- `src/models/playbook_node_state.py` — SQLAlchemy model for playbook_node_states
- `src/migrations/versions/013_add_playbook_tables.py` — Alembic migration

### Services

- `src/services/playbooks/__init__.py` — Package init
- `src/services/playbooks/template_loader.py` — YAML loader with validation + cache
- `src/services/playbooks/templates/contract-intake.yaml`
- `src/services/playbooks/templates/pilot-close.yaml`
- `src/services/playbooks/templates/research-deep-dive.yaml`

### Routes

- `src/routes/playbooks.py` — CRUD endpoints

### Tests

- `tests/test_playbook_templates.py` — Template loading, validation, CRUD routes

### Files to Modify

- `src/main.py` — Register playbook router
- `src/models/__init__.py` — Import new models

---

## Template YAML Schema

```yaml
playbook:
  id: "contract-intake"
  name: "Contract Intake"
  description: "Standard contract intake from discovery through execution"
  module: "contracts"
  version: "1.0"
  team_composition: "Vision + Execution flywheel"

  nodes:
    - id: "triage"
      name: "Triage Incoming"
      description: "Classify and prioritize the incoming contract"
      actor: "otto" # otto | human | hybrid
      otto_archetype: "analyst"
      chamber: "discover"
      team_type: "adapting"
      depends_on: [] # DAG edges
      gate: null # null or gate config

    - id: "compliance_review"
      name: "Compliance Review"
      description: "Review against organizational standards"
      actor: "hybrid"
      otto_archetype: "guardian"
      chamber: "review"
      team_type: "stabilizing"
      depends_on: ["draft_agreement"]
      gate:
        type: "verification" # verification | approval | density
        required_approvals: 1
        roles: ["gatekeeper"]
```

---

## Instance State Model

```
playbook_instances:
  id: ULID
  workspace_id: ULID (RLS)
  template_id: str (e.g., "contract-intake")
  vault_id: ULID (FK to vaults)
  status: draft | running | paused | completed | cancelled
  started_at: timestamp | null
  completed_at: timestamp | null
  metadata: JSONB

playbook_node_states:
  id: ULID
  instance_id: ULID (FK to playbook_instances)
  workspace_id: ULID (RLS)
  node_id: str (e.g., "triage")
  status: pending | in_progress | completed | skipped | blocked
  actor: str (otto | human | hybrid)
  archetype: str | null
  started_at: timestamp | null
  completed_at: timestamp | null
  result: JSONB | null
  gate_response: JSONB | null
  metadata: JSONB
```

---

## API Endpoints

```
GET    /api/v1/playbooks/templates                    — List available templates
GET    /api/v1/playbooks/templates/{template_id}      — Get template details
POST   /api/v1/playbooks/instances                    — Create instance from template
GET    /api/v1/playbooks/instances                    — List instances (by workspace/vault)
GET    /api/v1/playbooks/instances/{instance_id}      — Get instance with node states
PATCH  /api/v1/playbooks/instances/{instance_id}      — Update instance status
GET    /api/v1/playbooks/instances/{instance_id}/nodes — Get node states
PATCH  /api/v1/playbooks/instances/{instance_id}/nodes/{node_id} — Update node state
```

---

## Test Coverage

- Template YAML loading and validation (all 3 templates)
- Template schema validation (required fields, valid enums)
- DAG validation (no cycles, valid depends_on references)
- Instance creation from template
- Node state initialization
- CRUD route testing
- Edge cases (unknown template, invalid status transitions)
