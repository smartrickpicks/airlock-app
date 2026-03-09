# MAGS Phase 1 — Implementation Plan

> **Date:** 2026-03-09
> **Name:** MAGS (Multi-Arc Governance System)
> **Goal:** Build the foundation for Patient Zero dogfood
> **Decisions Locked:**
>
> - Inference: Hybrid (structured signals + LLM)
> - DAG Engine: Custom Python walker (upgrade to PydanticAI Graph later)
> - Profile Storage: User-scoped with workspace overrides
> - LinkedIn: Skip for dogfood (conversation-only intake)
> - Vault ↔ Playbook: 1:1
> - Name: MAGS
> - Agent Name: Otto (the AI agent within MAGS)

---

## Milestone Overview

| #   | Milestone                         | Depends On | Est. Effort |
| --- | --------------------------------- | ---------- | ----------- |
| M1  | `airlock-persona` Data Foundation | Nothing    | 2-3 days    |
| M2  | Inference Engine (API)            | M1         | 2-3 days    |
| M3  | Profile Storage (DB)              | M2         | 1-2 days    |
| M4  | Workspace Forge UI                | M2, M3     | 3-5 days    |
| M5  | Otto Agent Prompting              | M1         | 2-3 days    |
| M6  | Playbook Templates + Storage      | M1         | 1-2 days    |
| M7  | DAG Execution Engine              | M5, M6     | 3-5 days    |
| M8  | Gate UI                           | M7         | 2-3 days    |
| M9  | Playbook Visualization            | M7         | 2-3 days    |
| M10 | Integration + Dogfood             | All        | 2-3 days    |

**Critical path:** M1 → M2 → M3 → M4 (Workspace Forge)
**Parallel path:** M1 → M5 + M6 → M7 → M8 + M9

---

## M1: `airlock-persona` Data Foundation

**Location:** `/Users/zacharyholwerda/Desktop/Airlock/repos/airlock-persona/`

### Deliverables

```
airlock-persona/
├── profiles/           # 17 PI reference profiles (YAML)
│   ├── analyzer.yaml
│   ├── controller.yaml
│   ├── specialist.yaml
│   ├── strategist.yaml
│   ├── venturer.yaml
│   ├── altruist.yaml
│   ├── captain.yaml
│   ├── collaborator.yaml
│   ├── maverick.yaml
│   ├── persuader.yaml
│   ├── promoter.yaml
│   ├── adapter.yaml
│   ├── artisan.yaml
│   ├── guardian.yaml
│   ├── operator.yaml
│   ├── individualist.yaml
│   └── scholar.yaml
│
├── team-types/         # 9 team types (YAML)
│   ├── exploring.yaml
│   ├── producing.yaml
│   ├── cultivating.yaml
│   ├── stabilizing.yaml
│   ├── pathfinding.yaml
│   ├── anchoring.yaml
│   ├── bolstering.yaml
│   ├── executing.yaml
│   └── adapting.yaml
│
├── archetypes/         # 3 meta-archetypes
│   ├── driver.yaml
│   ├── enforcer.yaml
│   └── interpreter.yaml
│
├── inference/          # Profile determination rules
│   ├── drive-signals.yaml
│   ├── profile-matching.yaml
│   └── confidence-rules.yaml
│
├── dynamics/           # Team dynamics
│   ├── sovereign-balance.yaml
│   ├── cross-archetype.yaml
│   └── flywheels.yaml
│
├── ai-impact/          # AI + personality interaction
│   ├── risk-matrix.yaml
│   └── autonomy-levels.yaml
│
├── scale/              # Company size factors
│   └── dunbar-thresholds.yaml
│
└── README.md
```

### Profile YAML Schema (per profile)

Each file follows the schema from the APPROVED Workspace Forge & PI Engine Design doc:

- `id`, `name`, `category`, `population_pct`
- `drives` (D, E, C, F — numeric 1-10 scale)
- `bio`, `strengths`, `cautions`, `core_needs`, `best_environment`
- `workspace` config (cognitive_mode, information_density, interface_structure, update_pace, explanation_style)
- `weak_points`, `compensation_patterns`, `anti_patterns`
- `otto` mapping (default_archetype, autonomy_ceiling, interaction_mode)
- `ai_impact` (automation_bias_risk, deskilling_risk, power_dynamic)
- `communication` (strength, failure_pattern, best_tooling, ai_risk)

### Team Type YAML Schema (per team type)

- `id`, `name`, `population_pct`, `characteristics`, `drives`
- `best_for`, `ideal_profiles`
- `mags_archetype` (which MAGS archetype fills this team type)
- `chamber_affinity` (primary, secondary)
- `node_defaults` (interaction_mode, confidence_threshold, review_required)

### Acceptance Criteria

- [ ] All 17 profiles authored with complete data
- [ ] All 9 team types authored with ideal_profiles mapped
- [ ] All 3 meta-archetypes authored
- [ ] Inference rules defined (drive-signals, profile-matching, confidence)
- [ ] Dynamics rules defined (sovereign-balance math)
- [ ] README explaining the repo and how consumers query it

---

## M2: Inference Engine (API)

**Location:** `apps/api/src/services/inference.py`

### Deliverables

1. **`InferenceService`** — Core service class
   - `infer_drives_from_signals(signals: dict) -> DECFDrives` — Hybrid: structured signal table + LLM fallback
   - `match_profile(drives: DECFDrives) -> ProfileMatch` — Euclidean distance to 17 canonical vectors
   - `compute_confidence(signals: list, match_distance: float) -> float` — Confidence score
   - `get_bmy_profile(conversation_answers: dict) -> BMYProfile` — Full BMY flow

2. **`ProfileMatchingEngine`** — Loads YAML profiles, computes distances
   - Reads from `airlock-persona/profiles/` at startup
   - Caches canonical DECF vectors
   - Euclidean distance matching with confidence

3. **Routes** — `apps/api/src/routes/inference.py`
   - `POST /api/inference/drives` — Extract drives from signals
   - `POST /api/inference/profile` — Match drives to profile
   - `POST /api/inference/bmy` — Full BMY intake flow

4. **Models** — `apps/api/src/models/inference.py`
   - Pydantic schemas: `DECFDrives`, `ProfileMatch`, `BMYProfile`, `InferenceRequest`

### Acceptance Criteria

- [ ] Given conversation answers, returns a PI profile with confidence
- [ ] Confidence increases with more signal sources
- [ ] Profile matching uses Euclidean distance on DECF vectors
- [ ] All 17 profiles matchable

---

## M3: Profile Storage (DB)

**Location:** `apps/api/src/models/profile.py`, migrations

### Deliverables

1. **`user_profiles` table**

   ```sql
   id              TEXT (ULID) PK
   user_id         TEXT (ULID) UNIQUE  -- NO workspace_id (user-owned)
   pi_profile      TEXT                -- "maverick", "captain", etc.
   drives          JSONB               -- {dominance: 9, extraversion: 8, patience: 3, formality: 2}
   meta_archetype  TEXT                -- "driver", "enforcer", "interpreter"
   confidence      FLOAT
   source          TEXT                -- "conversation", "linkedin", "resume"
   work_dimensions JSONB               -- Layer 2 (grows over time)
   mags_config     JSONB               -- Archetype, interaction mode, verbosity, etc.
   knowledge       JSONB               -- Domain expertise, tools
   interaction_patterns JSONB          -- Preferences
   signals         JSONB               -- Connected signal sources
   sovereignty     JSONB               -- Privacy controls
   created_at      TIMESTAMPTZ
   updated_at      TIMESTAMPTZ
   deleted_at      TIMESTAMPTZ
   ```

2. **`user_profile_changelog` table** (append-only)

   ```sql
   id              TEXT (ULID) PK
   user_id         TEXT (ULID) FK
   action          TEXT        -- "created", "enriched", "override", "reset"
   source          TEXT
   delta           JSONB       -- What changed
   created_at      TIMESTAMPTZ
   ```

3. **`workspace_memberships` table**

   ```sql
   id              TEXT (ULID) PK
   workspace_id    TEXT (ULID) FK  -- RLS key
   user_id         TEXT (ULID) FK
   org_role        TEXT        -- "architect", "controller", "member", "guest"
   module_roles    JSONB       -- Per-module role assignments
   team_type_visible BOOLEAN DEFAULT true
   drives_visible  BOOLEAN DEFAULT false
   soft_locks      JSONB
   created_at      TIMESTAMPTZ
   updated_at      TIMESTAMPTZ
   deleted_at      TIMESTAMPTZ
   ```

4. **Alembic migrations** for all 3 tables
5. **CRUD service** — `apps/api/src/services/profile.py`
6. **Routes** — `apps/api/src/routes/profile.py`

### Acceptance Criteria

- [ ] Profile stored per-user (no workspace_id on user_profiles)
- [ ] Changelog is append-only
- [ ] Workspace memberships scoped by workspace_id for RLS
- [ ] Sovereignty controls enforced (visibility, export)

---

## M4: Workspace Forge UI

**Location:** `apps/web/src/`

### Deliverables

1. **Template:** `WorkspaceForge` — Split-screen container (chat left, preview right)
2. **Organism:** `ForgeChat` — MAGS conversation interface
3. **Organism:** `ForgePreview` — Live workspace preview
4. **Molecule:** `ProfileInferencePanel` — "Otto thinks you're a Maverick because..."
5. **Molecule:** `ModuleToggle` — Module bar in preview (interactive)
6. **Atom:** `ArchetypeBadge` — Shows MAGS archetype
7. **Store:** `forge.store.ts` — Conversation state, inferred profile, preview state
8. **Route:** `(shell)/forge/page.tsx` — Workspace Forge page

### Acceptance Criteria

- [ ] Split-screen renders (Spellburst pattern)
- [ ] Otto asks 2-4 questions
- [ ] Right panel updates as conversation progresses
- [ ] Profile inference visible ("Otto thinks you're...")
- [ ] User can correct ("I'm not a Maverick, I'm more of a Scholar")
- [ ] "Launch" button creates configured workspace

---

## M5: Otto Agent Prompting

**Location:** `apps/api/src/services/mags/`

### Deliverables

1. **Base system prompt** — `prompts/base.md`
2. **6 archetype fragments** — `prompts/archetypes/{analyst,strategist,executor,connector,guardian,architect}.md`
3. **5 module fragments** — `prompts/modules/{contracts,crm,triage,calendar,documents}.md`
4. **4 chamber fragments** — `prompts/chambers/{discover,build,review,ship}.md`
5. **Prompt composer** — `services/mags/prompt_composer.py`
   ```python
   def compose_prompt(
       user_profile: UserProfile,
       archetype: str,
       module: str,
       chamber: str,
       vault_context: dict
   ) -> str
   ```
6. **Claude API integration** — `services/mags/agent.py`

### Acceptance Criteria

- [ ] Prompt changes noticeably between archetypes
- [ ] User profile influences tone and verbosity
- [ ] Module/chamber context shapes behavior

---

## M6: Playbook Templates + Storage

**Location:** `apps/api/src/models/playbook.py`, `airlock-playbooks/`

### Deliverables

1. **Playbook template schema** — YAML format with DAG nodes
2. **3 starter templates:**
   - `contract-intake.yaml` — 7 nodes, 2 gates (from PI Engine design doc)
   - `pilot-close.yaml` — 6 nodes, 2 gates (from dogfood protocol)
   - `research-deep-dive.yaml` — 8 nodes, 3 gates
3. **`playbook_instances` table** — Running playbook state
4. **`playbook_nodes` table** — Per-node state within an instance
5. **CRUD routes** for playbook templates and instances

---

## M7: DAG Execution Engine

**Location:** `apps/api/src/services/dag/`

### Deliverables

1. **DAG Walker** — `dag/engine.py`
   - Loads playbook instance from DB
   - Identifies runnable nodes (all dependencies met)
   - Executes MAGS nodes via Claude API
   - Pauses at gate nodes
   - Persists state after each node completion
   - Event-driven: complete → check unblocked → execute next

2. **Gate Manager** — `dag/gates.py`
   - Creates gate notifications
   - Handles gate responses (approve, reject, request changes)
   - Enforces density rules
   - Triggers escalation timeline

3. **Node Executor** — `dag/executor.py`
   - For `actor: "otto"` — compose Otto prompt, call Claude, store result
   - For `actor: "human"` — create task notification, wait
   - For `actor: "hybrid"` — Otto drafts, human confirms

---

## M8: Gate UI

**Location:** `apps/web/src/`

### Deliverables

1. **Dispatch gate cards** — Gate notifications in Signal panel
2. **Vault gate responses** — Inline gate response in Orchestrate panel
3. **5 gate type components:**
   - `VerificationGate` — Approve/Reject
   - `DecisionGate` — Option cards
   - `ApprovalGate` — Sign-off + comment
   - `QualityGate` — Approve/Request Changes
   - `ConvergenceGate` — Review summary + Continue

---

## M9: Playbook Visualization

**Location:** `apps/web/src/components/organisms/`

### Deliverables

1. **`PlaybookDAG`** — DAG visualization (nodes + edges)
2. **Node status indicators** — Pending, running, completed, gate-waiting
3. **Gate badges** — Which gate type, who's responsible
4. **Progress bar** — Overall playbook completion %

---

## M10: Integration + Dogfood

### Deliverables

1. Wire Workspace Forge → Inference → Profile Storage → Playbook Suggestion
2. Wire Playbook Start → DAG Engine → Gate UI → Resume
3. Wire Otto prompting through entire flow
4. End-to-end test: Forge → Profile → Playbook → Gates → Complete
5. Patient Zero run

### Measurement

| Metric                              | Target                               |
| ----------------------------------- | ------------------------------------ |
| Time to BMY                         | < 2 min                              |
| Time to first playbook              | < 5 min                              |
| Profile accuracy (user agrees)      | > 70% at BMY, > 90% after enrichment |
| Gate helpfulness                    | > 80%                                |
| Otto archetype switching noticeable | > 75%                                |
| Override frequency                  | < 3/week                             |
