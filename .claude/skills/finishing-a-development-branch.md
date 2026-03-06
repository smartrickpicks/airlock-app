---
name: finishing-a-development-branch
description: Use when implementation is complete and all tests pass - presents 4 structured options (merge locally, create PR, keep as-is, discard) and handles cleanup
---

# Finishing a Development Branch

**Announce at start:** "I'm using the finishing-a-development-branch skill to complete this work."

**Core principle:** Verify tests → Present options → Execute choice → Clean up.

## Step 1: Verify Tests

Run the project's test suite. If tests fail: show failures, stop. Cannot proceed until tests pass.

## Step 2: Determine Base Branch

```bash
git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null
```

## Step 3: Present These 4 Options (exactly)

```
Implementation complete. What would you like to do?

1. Merge back to <base-branch> locally
2. Push and create a Pull Request
3. Keep the branch as-is (I'll handle it later)
4. Discard this work

Which option?
```

## Step 4: Execute Choice

**Option 1 — Merge locally:**
`git checkout <base>` → `git pull` → `git merge <feature>` → run tests → `git branch -d <feature>` → cleanup worktree

**Option 2 — Create PR:**
`git push -u origin <feature>` → `gh pr create` with summary + test plan → cleanup worktree (keep branch)

**Option 3 — Keep as-is:**
Report: "Keeping branch <name>. Worktree preserved at <path>." Do NOT cleanup.

**Option 4 — Discard:**
Require typed `discard` confirmation first. Then `git branch -D <feature>` → cleanup worktree.

## Step 5: Cleanup Worktree

For Options 1, 2, 4 only:
```bash
git worktree list | grep $(git branch --show-current)
git worktree remove <worktree-path>
```

## Red Flags — Never

- Proceed with failing tests
- Merge without verifying tests on merged result
- Delete work without typed confirmation
- Force-push without explicit request
