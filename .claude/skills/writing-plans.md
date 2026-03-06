---
name: writing-plans
description: Use when creating implementation plans for multi-step development tasks - produces bite-sized task breakdowns with exact file paths, complete code examples, and TDD steps saved to docs/plans/
---

# Writing Plans Skill

**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

## Core Purpose

Create detailed implementation plans assuming the developer has minimal context about the codebase. Approach: DRY, YAGNI, TDD, Frequent commits.

## Plan File Location

Save to: `docs/plans/YYYY-MM-DD-<feature-name>.md`

## Required Plan Structure

```markdown
# <Feature Name> — Implementation Plan

> **Goal:** <one sentence>
> **Architecture:** <key decisions>
> **Tech Stack:** <relevant pieces>

## Tasks

### Task 1: <name>
**File:** `exact/path/to/file.ts`
**Goal:** <one sentence>

1. Write failing test: `<exact test name>`
2. Run test, verify failure: `<exact command>` → expected: `<output>`
3. Implement: `<minimal code>`
4. Run test, verify pass: `<exact command>` → expected: `<output>`
5. Commit: `<conventional commit message>`
```

## Task Granularity

Each step = 2-5 minutes = one atomic action:
- Write failing test
- Verify failure
- Implement minimal code
- Verify success
- Commit

## Required Elements

- Exact file paths (never vague: "the utils file")
- Complete code examples (not "implement the function")
- Precise commands with expected outputs
- TDD cycle for every task
- Conventional commit message per task

## Execution Handoff

After plan is complete, offer two paths:

**Option A — Subagent-Driven (same session):**
Invoke `subagent-driven-development` skill. Fresh subagent per task, two-stage review.

**Option B — Parallel Session:**
Invoke `executing-plans` skill in a new session.
