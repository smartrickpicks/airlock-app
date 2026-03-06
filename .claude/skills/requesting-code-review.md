---
name: requesting-code-review
description: Use when completing tasks, implementing major features, or before merging - dispatches a code-reviewer subagent to catch issues before they cascade
---

# Requesting Code Review

**Core principle:** "Review early, review often."

## When to Request

**Mandatory:**
- After each task in subagent-driven development
- After completing a major feature
- Before merge to main

**Optional but valuable:**
- When stuck (fresh perspective)
- Before refactoring (baseline check)
- After fixing a complex bug

## How to Request

**1. Get git SHAs:**
```bash
BASE_SHA=$(git rev-parse HEAD~1)  # or origin/main
HEAD_SHA=$(git rev-parse HEAD)
```

**2. Dispatch code-reviewer subagent** with:
- `WHAT_WAS_IMPLEMENTED` — what you just built
- `PLAN_OR_REQUIREMENTS` — what it should do
- `BASE_SHA` / `HEAD_SHA` — commit range
- `DESCRIPTION` — brief summary

**3. Act on feedback:**
- Fix **Critical** issues immediately
- Fix **Important** issues before proceeding
- Note **Minor** issues for later
- Push back with reasoning if reviewer is wrong

## Red Flags — Never

- Skip review because "it's simple"
- Ignore Critical issues
- Proceed with unfixed Important issues
- Accept feedback blindly without technical evaluation
