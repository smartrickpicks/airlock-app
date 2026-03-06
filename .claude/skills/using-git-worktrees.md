---
name: using-git-worktrees
description: Use when starting feature work that needs isolation or before executing implementation plans - creates isolated git worktrees with smart directory selection and safety verification
---

# Using Git Worktrees

**Announce at start:** "I'm using the using-git-worktrees skill to set up an isolated workspace."

**Core principle:** Systematic directory selection + safety verification = reliable isolation.

## Directory Selection (priority order)

1. Check if `.worktrees/` exists → use it (verify it's gitignored)
2. Check if `worktrees/` exists → use it (verify it's gitignored)
3. Check `CLAUDE.md` for preference
4. Ask user:
   ```
   No worktree directory found. Where should I create worktrees?
   1. .worktrees/ (project-local, hidden)
   2. ~/.config/superpowers/worktrees/<project-name>/ (global)
   ```

## Safety Verification (project-local only)

```bash
git check-ignore -q .worktrees 2>/dev/null
```

If NOT ignored: add to `.gitignore`, commit it, then proceed.

## Creation Steps

```bash
# 1. Get project name
project=$(basename "$(git rev-parse --show-toplevel)")

# 2. Create worktree
git worktree add .worktrees/<branch-name> -b <branch-name>
cd .worktrees/<branch-name>

# 3. Run setup (auto-detect)
[ -f package.json ] && npm install
[ -f requirements.txt ] && pip install -r requirements.txt
[ -f pyproject.toml ] && poetry install

# 4. Verify clean baseline
<project test command>
```

## Report

```
Worktree ready at <full-path>
Tests passing (N tests, 0 failures)
Ready to implement <feature-name>
```

If tests fail: report failures, ask whether to proceed or investigate.

## Red Flags — Never

- Create worktree without verifying it's gitignored (project-local)
- Skip baseline test verification
- Proceed with failing tests without asking

## Integration

Called by: `brainstorming`, `subagent-driven-development`, `executing-plans`
Pairs with: `finishing-a-development-branch`
