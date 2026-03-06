---
name: executing-plans
description: Use when implementing a written plan in a parallel/new session - executes in batches of 3 tasks with review checkpoints between batches
---

# Executing Plans

## Process

### Step 1: Load and Review
- Read the plan critically
- Raise any concerns or gaps before starting
- Do NOT start if plan has critical gaps

### Step 2: Execute Batch (3 tasks)
- Complete first 3 tasks with verification
- Mark progress in TodoWrite
- Verify tests pass after each task

### Step 3: Report
- Present results of the batch
- Wait for feedback before continuing

### Step 4: Continue
- Apply any feedback
- Execute next batch of 3 tasks

### Step 5: Complete
- Use `finishing-a-development-branch` skill when all tasks done

## Critical Rules

- **Never skip the checkpoint between batches** — report and wait
- **Never start on main/master** without explicit user consent
- **Stop and ask** if: blocker mid-batch, missing dependency, test fails unexpectedly, instruction is unclear

## Required Integrations

- `using-git-worktrees` — REQUIRED before starting
- `writing-plans` — Creates the plan this skill executes
- `finishing-a-development-branch` — After all batches complete
