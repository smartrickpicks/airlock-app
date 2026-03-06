---
name: dispatching-parallel-agents
description: Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies - dispatches one agent per problem domain concurrently
---

# Dispatching Parallel Agents

**Core principle:** Dispatch one agent per independent problem domain. Let them work concurrently.

## When to Use

- 3+ test files failing with different root causes
- Multiple subsystems broken independently
- No shared state between investigations
- Each problem can be understood without context from others

**Don't use when:**
- Failures are related (fix one might fix others)
- Agents would interfere with each other (editing same files)
- You need full system context to understand the problem

## The Pattern

### 1. Identify Independent Domains
Group failures by what's broken. Each domain is independent.

### 2. Create Focused Agent Tasks
Each agent gets:
- **Specific scope:** one file or subsystem
- **Clear goal:** what to achieve
- **Constraints:** what NOT to change
- **Expected output:** summary of findings and changes

### 3. Dispatch in Parallel
Use the Agent tool for all independent tasks in a single message.

### 4. Review and Integrate
- Read each summary
- Verify fixes don't conflict
- Run full test suite
- Integrate all changes

## Good Agent Prompt Structure

1. **Focused** — one clear problem domain
2. **Self-contained** — all context needed upfront
3. **Constrained** — explicit "do NOT change X"
4. **Specific output** — what to return

## Common Mistakes

- Too broad: "Fix all the tests" → agent gets lost
- No context: agent doesn't know where to look
- No constraints: agent might refactor everything
- Vague output: you don't know what changed

## Verification After Agents Return

1. Review each summary — understand what changed
2. Check for conflicts — did agents edit same code?
3. Run full suite — verify all fixes work together
4. Spot check — agents can make systematic errors
