# M5: Otto Agent Prompting — Implementation Plan

> **Date:** 2026-03-09
> **Milestone:** M5 (Parallel Path: M1 → M5)
> **Depends On:** M1 (airlock-persona Data Foundation)
> **Est. Effort:** 2-3 days

---

## Overview

Build Otto's personality-aware prompt composition system. The prompt composer
assembles system prompts from modular fragments (base, archetype, module, chamber)
and adapts Otto's tone, verbosity, and behavior based on the user's PI profile.

**Key insight:** Otto's prompting already exists in `otto/agent.py` and
`otto/graph/prompts.py` with vault context and tool authorization. M5 adds
**personality-aware fragments** that make Otto behave differently based on who
it's talking to.

---

## Deliverables

### 1. Prompt Fragments (Markdown files)

```
apps/api/src/services/mags/prompts/
├── base.md                          # Core Otto identity
├── archetypes/
│   ├── analyst.md                   # Thorough, evidence-first, cautious
│   ├── strategist.md                # Pattern-finding, big-picture, directional
│   ├── executor.md                  # Action-oriented, fast, results-focused
│   ├── connector.md                 # People-focused, diplomatic, inclusive
│   ├── guardian.md                  # Risk-aware, compliant, process-driven
│   └── architect.md                 # Systems-thinking, design-oriented, structural
├── modules/
│   ├── contracts.md                 # Contract lifecycle context
│   ├── crm.md                       # Relationship management context
│   ├── triage.md                    # Project management context
│   ├── calendar.md                  # Scheduling context
│   └── documents.md                 # Document management context
└── chambers/
    ├── discover.md                  # Exploration, research, intake
    ├── build.md                     # Assembly, drafting, creation
    ├── review.md                    # Quality checks, approvals, gates
    └── ship.md                      # Publishing, distribution, launch
```

### 2. Prompt Composer Service

`apps/api/src/services/mags/prompt_composer.py`

```python
def compose_prompt(
    user_profile: UserProfile | None,
    archetype: str,
    module: str,
    chamber: str,
    vault_context: dict | None = None,
) -> str
```

### 3. Route Integration

`apps/api/src/routes/mags.py` — Compose + preview prompts

### 4. Tests

`apps/api/tests/test_prompt_composer.py`

---

## Build Sequence

1. Create `src/services/mags/` package (directory + `__init__.py`)
2. Write 16 prompt fragments (1 base + 6 archetypes + 5 modules + 4 chambers)
3. Build `prompt_composer.py` — loads fragments, composes system prompt
4. Build `routes/mags.py` — preview/compose endpoint
5. Wire route into `main.py`
6. Write tests
7. Verify with pytest + ruff

---

## Acceptance Criteria

- [ ] Prompt changes noticeably between archetypes
- [ ] User profile influences tone and verbosity
- [ ] Module/chamber context shapes behavior
- [ ] All 6 archetypes × 5 modules × 4 chambers = 120 combinations composable
- [ ] Tests pass, ruff clean
