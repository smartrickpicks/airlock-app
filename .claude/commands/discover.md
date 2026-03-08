# Discover — Intent-First Development Protocol

Structured gate process for all feature work. Prevents building the wrong thing.

## Usage

```
/discover <task description>
```

---

## What This Skill Does

When invoked with a task description, run the following **four gates in sequence**, stopping at each gate for explicit user confirmation before advancing.

---

## Gate 1: Discover (Intent)

1. Restate the user's request as a single sentence: _"So you want X, which means Y in the codebase."_
2. Identify the Airlock vocabulary that applies:
   - Which **Module** is this in? (Contracts / CRM / Tasks / Calendar / Documents / Admin)
   - Which **Chamber** does it affect? (Discover / Build / Review / Ship)
   - Which **View** or **Triptych** panel is touched? (Signal / Orchestrate / Control)
   - Which **role** gates apply? (Builder / Gatekeeper / Owner)
3. Ask **at most 2 clarifying questions** — only if the scope is genuinely ambiguous.
4. Define "done": what the feature looks like when complete (UI behavior, data shape, or API response).
5. **Stop. Print:** `"Discover complete — confirm scope to continue to Research."`
6. **Wait for explicit user confirmation** before proceeding to Gate 2.

---

## Gate 2: Research (Codebase Audit)

_Only after user confirms Gate 1._

1. Read the relevant spec: `docs/specs/<module>/overview.md`
2. Check `docs/registry/components.json` for existing components to reuse
3. Grep/Glob for files likely affected — list them with line counts
4. Read key sections of those files to understand existing patterns
5. Report findings in this format:

```
## Research Findings

**Spec:** docs/specs/<module>/overview.md — [key requirement]
**Existing components:** <list or "none relevant">
**Files to touch:**
  - apps/web/src/... — [why]
  - apps/web/src/... — [why]
**Patterns to follow:** <existing pattern name, file:line>
**Gotchas:** <anything that could cause conflicts or regressions>

## Build Plan
1. [Step 1 — file, what changes]
2. [Step 2 — file, what changes]
3. [Step 3 — file, what changes]

Mock-data-first: [yes/no — explain if real API needed]
```

6. **Stop. Print:** `"Research complete — say 'go' to begin Build."`
7. **Wait for explicit 'go' before writing any code.**

---

## Gate 3: Build (Implementation)

_Only after user says "go" or equivalent._

1. Implement the build plan step by step — one logical unit at a time
2. Follow mock-data-first strategy (stub with mock data, no real API calls unless specified)
3. Use Tailwind tokens from `tokens.css` — never raw color values
4. Add `'use client'` directive only when hooks/state/browser APIs are used
5. After each file, briefly note what was written (1 line)
6. When all steps complete, run:
   - `pnpm type-check` in `apps/web/`
   - `pnpm lint` in `apps/web/`
7. Report: clean or list errors with fixes applied
8. Commit with conventional format:

   ```
   feat(<scope>): <what was built>
   ```

   Valid scopes: `web, api, shared-types, docs, shell, contracts, crm, tasks, calendar, documents, admin, ci, docker, deps`

9. **Stop. Print:** `"Build complete — review above, then say 'ship' to push."`
10. **Wait for explicit 'ship' before pushing.**

---

## Gate 4: Ship (Verify + Push)

_Only after user says "ship" or equivalent._

1. Run final diff summary: `git diff --stat HEAD~1`
2. Confirm the changes match the stated intent from Gate 1
3. Push to the current feature branch: `git push -u origin <branch>`
4. Print: `"Shipped. Branch: <branch>. Files changed: <n>. Commits: <list>."`

---

## Gate Rules

| Gate     | Trigger                      | Blocks on           |
| -------- | ---------------------------- | ------------------- |
| Discover | User runs `/discover <task>` | User confirms scope |
| Research | User confirms scope          | User says "go"      |
| Build    | User says "go"               | User says "ship"    |
| Ship     | User says "ship"             | —                   |

**Silence does not advance gates. Only explicit signals do.**

Accepted signals:

- Advance to Research: `"yes"`, `"confirmed"`, `"correct"`, `"that's right"`
- Advance to Build: `"go"`, `"do it"`, `"build it"`, `"yes"`
- Advance to Ship: `"ship"`, `"push it"`, `"ship it"`, `"push"`

---

## Airlock-Specific Rules

- **Never implement without reaching Gate 3**
- **Never push without reaching Gate 4**
- **Never commit files not in the build plan** — no extra cleanup, no bonus refactors
- **Never create new files** unless the build plan explicitly lists them
- **Never modify spec `overview.md` files**
- **Always read before editing** — use the `Read` tool, not `cat`
- If a file outside the build plan needs to change, **stop and report** — do not edit silently
