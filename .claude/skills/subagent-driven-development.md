---
name: subagent-driven-development
description: Use when executing an implementation plan in the same session - dispatches a fresh subagent per task with two-stage review (spec compliance then code quality) after each
---

# Subagent-Driven Development

**Core principle:** Fresh subagent per task + two-stage review (spec then quality) = high quality, fast iteration.

## When to Use

- Have a written implementation plan
- Tasks are mostly independent (not tightly coupled)
- Staying in the same session (not a parallel session)

Use `executing-plans` instead if you want a separate parallel session.

## The Process

1. **Read plan, extract ALL tasks** with full text and context
2. **Create TodoWrite** with all tasks
3. **Per task:**
   - Dispatch implementer subagent with full task text + scene-setting context
   - Answer any questions the implementer raises before they proceed
   - Implementer implements, tests, commits, self-reviews
   - Dispatch spec-compliance reviewer subagent
   - If spec gaps found → implementer fixes → reviewer re-reviews
   - Once spec ✅ → dispatch code-quality reviewer subagent
   - If quality issues found → implementer fixes → reviewer re-reviews
   - Once quality ✅ → mark task complete
4. **After all tasks:** dispatch final code reviewer for entire implementation
5. **Use `finishing-a-development-branch` skill**

## Red Flags — Never

- Start on main/master without explicit user consent
- Skip spec compliance review
- Start code quality review before spec compliance is ✅
- Proceed with unfixed issues from either review
- Dispatch multiple implementer subagents in parallel (they conflict)
- Make subagent read the plan file (provide full task text instead)
- Accept "close enough" on spec compliance

## Required Integrations

- `using-git-worktrees` — REQUIRED before starting tasks
- `writing-plans` — Creates the plan
- `requesting-code-review` — Template for reviewer subagents
- `finishing-a-development-branch` — Completion
- Subagents should use `test-driven-development`
