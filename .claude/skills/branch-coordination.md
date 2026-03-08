---
name: branch-coordination
description: Use before any multi-branch or multi-agent work to prevent file conflicts, type regression, and merge disasters. Tracks ownership, enforces boundaries, provides safe merge protocols.
---

# Branch Coordination — Multi-Agent Git Safety

**Core principle:** One branch owns each file path. Agents declare ownership before editing. Merges verify the build. No exceptions.

**Announce at start:** "I'm using the branch-coordination skill to check for conflicts before starting work."

## When to Use

- Starting a new feature branch while other branches exist
- Before dispatching parallel agents to different branches
- Before merging any branch into another
- After discovering type errors caused by cross-branch changes
- When `/multi-execute`, `/multi-backend`, or `/multi-frontend` would touch overlapping files

## Phase 1: Pre-Flight Scan

Run BEFORE any work begins. This is mandatory.

```bash
# 1. List all active branches with recent activity
git branch -a --sort=-committerdate | head -15

# 2. Check for uncommitted changes
git status --short

# 3. Find common ancestor with main
git merge-base HEAD main | xargs git log --oneline -1

# 4. Check what the current branch already touches vs main
git diff main...HEAD --name-only | sort > /tmp/current-branch-files.txt

# 5. For each other active branch, check its file footprint
for branch in $(git branch -r --sort=-committerdate | head -5 | sed 's/origin\///'); do
  echo "=== $branch ==="
  git diff main..origin/$branch --name-only 2>/dev/null | sort
done
```

**Output:** A conflict matrix showing which files are touched by multiple branches.

### Decision Table

| Situation                               | Action                                                               |
| --------------------------------------- | -------------------------------------------------------------------- |
| No file overlap                         | Safe to proceed — each branch owns its files                         |
| Overlap in `docs/` only                 | Usually safe — docs merge cleanly. Proceed with caution              |
| Overlap in `apps/web/src/lib/mock-*.ts` | HIGH RISK — mock data types cascade everywhere. Merge first          |
| Overlap in `stores/*.store.ts`          | HIGH RISK — state shape changes break consumers. Merge first         |
| Overlap in `components/`                | MEDIUM RISK — check if same component. If different components, safe |
| Overlap in `apps/api/`                  | Check if same routes/models. Different modules = safe                |

## Phase 2: Ownership Declaration

Before editing any file, the agent MUST declare ownership in the branch's scope.

### Ownership Registry Format

Create or update `.claude/branch-manifest.json` in the working directory:

```json
{
  "branch": "claude/feature-name-XXXX",
  "created": "2026-03-08T12:00:00Z",
  "owner": "claude-session",
  "scope": {
    "description": "Brief description of what this branch does",
    "owns": [
      "apps/web/src/app/(shell)/admin/otto/**",
      "apps/web/src/stores/otto.store.ts",
      "apps/web/src/hooks/useOttoChat.ts"
    ],
    "reads": [
      "apps/web/src/lib/mock-crm.ts",
      "apps/web/src/stores/auth.store.ts"
    ],
    "modifies_shared": [
      "apps/web/src/lib/mock-crm.ts:CrmAccount interface (adding fields)"
    ]
  }
}
```

### Rules

- `owns`: Files this branch creates or is the primary editor of. No other branch should touch these.
- `reads`: Files this branch imports from but does NOT modify.
- `modifies_shared`: Files modified by multiple branches. MUST include what specifically is being changed (interface additions, new exports, etc.)

### The Golden Rule

**If you need to modify a shared file (mock data types, store interfaces, shared components), you MUST:**

1. Check if another branch has already modified it
2. If yes: merge that branch's changes first, THEN add yours on top
3. If no: proceed, but add it to `modifies_shared` with a description
4. After modifying: run `npx tsc --noEmit` to verify no regressions

## Phase 3: Safe Merge Protocol

When merging branch A into branch B:

### Step 1: Assess

```bash
# What does branch A have that B doesn't?
git diff B...A --stat

# What does branch B have that A doesn't?
git diff A...B --stat

# Are there actual conflicts?
git merge --no-commit --no-ff A 2>&1 | head -20
git merge --abort  # Always abort the test merge
```

### Step 2: Choose Strategy

| Scenario                               | Strategy                                               |
| -------------------------------------- | ------------------------------------------------------ |
| A has only docs, B has only code       | Cherry-pick or checkout specific files from A          |
| A and B touch different app modules    | Standard merge (low risk)                              |
| A and B both modified mock-\*.ts types | Checkout A's types, manually add B's additions on top  |
| A and B both modified same component   | Manual merge with build verification after each change |
| One branch is clearly "ahead"          | Rebase the behind branch onto the ahead branch         |

### Step 3: Execute with Verification Gates

```bash
# 1. Bring over the changes (pick ONE approach)
# Option A: Checkout specific files from the other branch
git checkout other-branch -- path/to/file1 path/to/file2

# Option B: Cherry-pick specific commits
git cherry-pick <commit-hash>

# Option C: Full merge
git merge other-branch

# 2. MANDATORY: Build verification
source ~/.nvm/nvm.sh && nvm use 20
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l  # Target: 0
npx next build 2>&1 | grep -E "error|failed|compiled"  # Target: Compiled successfully

# 3. If errors: fix them NOW before committing
# 4. Commit with merge context in the message
```

### Step 4: Post-Merge Cleanup

```bash
# Verify the merged branch builds clean
pnpm type-check && pnpm lint

# Push the unified branch
git push

# Update branch-manifest.json to reflect new ownership
```

## Phase 4: Type Regression Prevention

The #1 source of cross-branch bugs is **adding fields to shared interfaces without updating all consumers**.

### Shared Interface Change Checklist

When adding a field to ANY interface in `mock-*.ts`:

- [ ] Field is optional (`?:`) unless ALL existing data objects already have it
- [ ] All existing type unions that reference this interface still compile
- [ ] All components that destructure this interface still compile
- [ ] `npx tsc --noEmit` passes with 0 errors (or same count as before)

### High-Risk Files (Airlock-Specific)

These files are modified by almost every feature branch and cause the most regressions:

| File                | Risk     | Why                                                          |
| ------------------- | -------- | ------------------------------------------------------------ |
| `mock-crm.ts`       | CRITICAL | CrmAccount/CrmLead interfaces used by 15+ components         |
| `mock-tasks.ts`     | HIGH     | Task interface used by kanban, inbox, detail modals          |
| `mock-calendar.ts`  | MEDIUM   | CalendarEventType union used by calendar views               |
| `mock-workflows.ts` | MEDIUM   | WorkflowNodeType/TriggerType unions used by workflow builder |
| `tokens.css`        | HIGH     | Color tokens used everywhere — changes cascade               |
| `auth.store.ts`     | HIGH     | Permission system — wrong changes break role gates           |

## Anti-Patterns

### 1. "I'll fix the types later"

Types break the build. The build blocks other developers. Fix types NOW.

### 2. Parallel agents editing the same mock file

Never dispatch two agents that both need to add fields to `mock-crm.ts`. Make one agent do all mock-crm changes, the other agent work on unrelated files.

### 3. Merging without building

Every merge MUST be followed by `npx tsc --noEmit` AND `npx next build`. No exceptions. "It compiled before" doesn't mean it compiles after your merge.

### 4. Force-pushing to shared branches

Never force-push to a branch another session is working on. If you need to rewrite history, create a new branch.

### 5. Leaving stale branches

After merging, the source branch should be cleaned up or deleted to prevent confusion about which branch is canonical.

## Quick Reference

```
Before work:  Pre-flight scan → declare ownership → check conflicts
During work:  Stay in your owned files → type-check after shared file changes
Before merge: Test merge → assess conflicts → choose strategy
After merge:  tsc --noEmit → next build → push → update manifest
```

## Integration

**Called by:**

- `dispatching-parallel-agents` — REQUIRED before dispatching agents to different branches
- `subagent-driven-development` — REQUIRED when multiple branches exist
- `executing-plans` — REQUIRED for pre-flight scan
- `using-git-worktrees` — Pairs naturally for branch isolation

**Pairs with:**

- `using-git-worktrees` — Creates the isolated branches this skill coordinates
- `verification-before-completion` — Build verification after merge
- `finishing-a-development-branch` — Cleanup after merge complete
