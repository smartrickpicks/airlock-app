# Agent Sync — Multi-Agent Git Coordination

Prevents multiple Claude agents from overwriting each other's work in the Airlock monorepo.

## Usage

```
/agent-sync              # Show current ownership map and conflict check
/agent-sync claim        # Register this agent's file ownership scope
/agent-sync check        # Check for conflicts with other active agents before committing
/agent-sync status       # List all active agent scopes
/agent-sync release      # Release ownership (run when done with session)
```

---

## What This Skill Does

When invoked, perform the following steps based on the subcommand:

### `/agent-sync` (no args) or `/agent-sync status`

1. Read `.claude/agent-registry.json` if it exists, otherwise create it with empty `agents: []`
2. Run `git branch --show-current` to get current branch
3. Run `git log --oneline -3` to get recent commits
4. Display a table of all registered agents:
   - Agent ID (branch name)
   - Claimed file paths / directories
   - Last active timestamp
   - Status (active / stale if >24h)
5. Run `git fetch origin` to get latest remote state
6. Check if any files in `.claude/agent-registry.json` overlap with your current uncommitted changes
7. Report: "Clean — no conflicts" or list specific overlapping files

---

### `/agent-sync claim`

1. Read `.claude/agent-registry.json`
2. Get current branch: `git branch --show-current`
3. Ask the user (or infer from branch name) what module/domain this agent owns
4. Common domains in Airlock:
   - `crm-admin` → owns: `stores/crm.store.ts`, `stores/admin.store.ts`, `stores/capability-tree.store.ts`, `(modules)/crm/`, `(shell)/admin/`, `lib/mock-admin.ts`, `lib/mock-crm.ts`
   - `otto-agentic` → owns: `stores/otto.store.ts`, `stores/messenger.store.ts`, `stores/workflow.store.ts`, `stores/realtime.store.ts`, `stores/event-bus.store.ts`, `organisms/OttoChat.tsx`, `organisms/OttoDrawer.tsx`, `organisms/MessengerDrawer.tsx`, `organisms/WorkflowCanvas.tsx`, `(shell)/admin/otto/`, `(shell)/admin/workflows/`, `(shell)/admin/mcp-servers/`, `(shell)/admin/skills/`, `apps/api/`
   - `contracts-core` → owns: `(modules)/contracts/`, `stores/vault.store.ts`, `stores/patch.store.ts`, `stores/review-queue.store.ts`, `stores/extraction.store.ts`, `stores/generator.store.ts`
   - `tasks-calendar` → owns: `(modules)/tasks/`, `(modules)/calendar/`, `stores/tasks.store.ts`, `stores/calendar.store.ts`
   - `documents` → owns: `(modules)/documents/`, `stores/documents.store.ts`
   - `shell-infra` → owns: `components/templates/`, `stores/module.store.ts`, `stores/triptych.store.ts`, `stores/auth.store.ts`, `lib/constants.ts`
5. Write entry to `.claude/agent-registry.json`:
```json
{
  "agents": [
    {
      "branch": "<current-branch>",
      "domain": "<domain-name>",
      "owned_paths": ["<path1>", "<path2>"],
      "claimed_at": "<ISO timestamp>",
      "last_active": "<ISO timestamp>"
    }
  ]
}
```
6. Stage and commit `.claude/agent-registry.json`: `git add .claude/agent-registry.json && git commit -m "chore(ci): register agent scope for <domain>"`
7. Push: `git push -u origin <branch>`
8. Confirm: "Scope claimed. You own: [paths]. Safe to work."

---

### `/agent-sync check`

Run before every `git commit` or `git push`. Steps:

1. Run `git fetch origin` to get all remote branches
2. Read `.claude/agent-registry.json` from **origin/main or the registry branch** (whichever has it)
3. Run `git diff --name-only HEAD` to get your uncommitted changed files
4. Run `git diff --name-only origin/<other-agent-branches>` for each registered agent
5. Cross-reference: do any of YOUR changed files appear in another agent's `owned_paths`?
6. If **no conflicts:** Print "✓ Clean — no overlapping changes. Safe to commit and push."
7. If **conflicts detected:**
   - List the specific files that overlap
   - List which agent branch last touched them
   - Recommend: "Coordinate with agent on `<branch>` before pushing. Options: (a) cherry-pick their changes first, (b) split the file into non-overlapping parts, (c) assign one agent as owner and the other reads-only."
   - Do NOT commit or push until user confirms resolution

---

### `/agent-sync release`

1. Read `.claude/agent-registry.json`
2. Find entry matching current branch
3. Mark it as `status: "released"` and set `released_at` timestamp
4. Commit and push the updated registry
5. Print: "Scope released. Other agents may now claim these paths."

---

## Registry File Format

`.claude/agent-registry.json` lives in the repo and is committed. It is the source of truth.

```json
{
  "version": "1.0",
  "agents": [
    {
      "branch": "claude/brand-crm-features-YAE4f",
      "domain": "crm-admin",
      "owned_paths": [
        "apps/web/src/stores/crm.store.ts",
        "apps/web/src/stores/admin.store.ts",
        "apps/web/src/stores/capability-tree.store.ts",
        "apps/web/src/app/(shell)/(modules)/crm/",
        "apps/web/src/app/(shell)/admin/",
        "apps/web/src/lib/mock-admin.ts",
        "apps/web/src/lib/mock-crm.ts",
        "scripts/seeds/"
      ],
      "claimed_at": "2026-03-08T00:00:00Z",
      "last_active": "2026-03-08T00:00:00Z",
      "status": "active"
    }
  ]
}
```

---

## Rules

- **One agent per domain.** Two agents cannot own the same file path.
- **Shared files** (e.g., `lib/constants.ts`, `package.json`, `tailwind.config.ts`) are unowned — any agent can modify them but must check first.
- **Stale entries** (last_active > 24h) are treated as released automatically.
- **Conflicts** block commits until resolved — this is intentional.
- **Registry is always on main.** Agents write their entry on their branch, then a merge resolves the registry.

---

## For Global Use Across All Agents

To make this skill available in every Claude Code session (not just this repo), copy it to:

```bash
# macOS/Linux global Claude skills directory
cp .claude/commands/agent-sync.md ~/.claude/commands/agent-sync.md

# Then any Claude Code session can run /agent-sync
```

The skill is self-contained and repo-aware (it reads `.claude/agent-registry.json` relative to `git rev-parse --show-toplevel`).
