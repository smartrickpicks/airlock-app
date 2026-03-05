# Seed Data Development — Tier 2 Context

## Before You Start

1. Read `docs/concepts/00-glossary.mdx` for canonical vocabulary
2. Read the spec for the feature you're seeding data for
3. Check existing scenario definitions in `scripts/seeds/definitions/`

## Deterministic Seed Strategy

All seed data MUST be deterministic — same seed = same data, every time.

```python
import random
from faker import Faker

fake = Faker()
Faker.seed(42)
random.seed(42)
```

## Scenario Bundles

Scenarios are defined in YAML files under `scripts/seeds/definitions/`:

| File                     | Purpose                                                |
| ------------------------ | ------------------------------------------------------ |
| `happy-path.yaml`        | Golden path: vault from Discover → Ship                |
| `edge-cases.yaml`        | Boundary conditions, missing data, expired SLAs        |
| `entity-resolution.yaml` | Duplicate entities, merge scenarios, fuzzy matching    |
| `approval-pipeline.yaml` | Multi-step approval chains, rejections, re-submissions |
| `cold-start.yaml`        | Empty workspace, first-time user, no vaults            |

## YAML Scenario Format

```yaml
scenario: happy-path
description: "Standard contract vault progressing through all chambers"
seed: 42
entities:
  workspaces:
    - id: "{{ulid}}"
      name: "Acme Records"
  users:
    - id: "{{ulid}}"
      name: "Jane Builder"
      role: builder
    - id: "{{ulid}}"
      name: "Tom Gatekeeper"
      role: gatekeeper
    - id: "{{ulid}}"
      name: "Sarah Owner"
      role: owner
  vaults:
    - id: "{{ulid}}"
      module: contracts
      chamber: review
      title: "Distribution Agreement — Acme Records × Summit Publishing"
      fields:
        OPP_CONTRACT_TYPE: "Distribution"
        OPP_TERRITORY: "Worldwide"
        OPP_EFFECTIVE_DATE: "2026-01-15"
  events:
    - vault_id: "{{ref:vaults.0}}"
      type: extraction
      actor: "{{ref:users.0}}"
      payload: { ... }
```

## Anonymization Rules

Real entities from the beta project must be anonymized:

1. Hash-based mapping: `real_name → SHA256(real_name + salt) → deterministic fake_name`
2. Preserve entity relationships (if A references B, fake_A references fake_B)
3. Preserve data distributions (field lengths, date ranges, numeric ranges)
4. Use entertainment industry names (record labels, publishers, artists) — fitting the domain
5. NEVER include real PII in seed data files

## Coverage Requirements

Seed data must exercise:

- [ ] All 4 chambers (Discover, Build, Review, Ship)
- [ ] All 3 roles (Builder, Gatekeeper, Owner)
- [ ] All 5 modules (Contracts, CRM, Tasks, Calendar, Documents)
- [ ] Vaults at different lifecycle stages (new, in-progress, completed, archived)
- [ ] Multiple workspaces (for RLS testing)
- [ ] Extraction events with varying confidence scores
- [ ] Patch workflows (draft, submitted, approved, rejected)
- [ ] Gate transitions (pass, fail, override)

## Generator Script

The generator at `scripts/seeds/generator.py` should:

1. Read YAML scenario definitions
2. Generate deterministic data using seeded Faker
3. Output SQL INSERT statements or JSON fixtures
4. Support `--scenario` flag to generate specific bundles
5. Support `--format` flag for SQL vs JSON output
