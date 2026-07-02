# Branch Unification + Full API Demo Stack — Design

## Goal

Restore the full otto-agentic branch state (which already includes all brand-crm work), layer stashed improvements and uncommitted fixes on top, fix known hydration bugs, and ensure the full API stack (OTTO, vaults, documents, patches, review queue) is wired for demo.

## Current State

- **Branch:** `claude/otto-agentic-layer-33684` reset to `cf35370` (brand-crm HEAD)
- **Otto remote:** `c3588e1` — has all brand-crm + 8 otto-unique commits
- **Stash@{0}:** 18 files, 1,620 lines — otto backend, Discord roles, API proxy, mock-admin
- **Uncommitted:** SubPanel hydration fix, ShellLayout URL sync, mock-crm, pnpm-lock

## Approach

### Phase 1: Safe Restore

1. Save uncommitted work as patch file
2. Reset to `origin/claude/otto-agentic-layer-33684` (`c3588e1`)
3. Apply stash@{0} (otto+admin improvements)
4. Apply patch (current fixes)
5. Resolve overlaps by taking the more complete version

### Phase 2: Bug Fixes

1. Home page hydration — defer `formatTimeAgo()` to client via useEffect
2. SubPanel deferred state — already in uncommitted fix
3. ShellLayout URL→store sync — already in uncommitted fix

### Phase 3: Commit & Verify

1. Commit unified state
2. Verify: `pnpm type-check && pnpm lint`
3. Start dev server, confirm no crashes
4. Start FastAPI, confirm OTTO + vault CRUD

## Protected Work

| Work                  | Lines  | Source                       |
| --------------------- | ------ | ---------------------------- |
| 12 brand-crm commits  | ~3,000 | otto remote (already merged) |
| 8 otto-unique commits | ~5,000 | otto remote                  |
| Stash improvements    | 1,620  | stash@{0}                    |
| Hydration/sync fixes  | ~100   | uncommitted patch            |

## Services (Full API Stack)

| Service      | Endpoint                                             | Status                         |
| ------------ | ---------------------------------------------------- | ------------------------------ |
| OTTO chat    | `/api/v3/otto/chat`, `/api/v3/vaults/{id}/otto/chat` | In stash (agent.py, routes.py) |
| Vaults       | `/api/v1/vaults`                                     | Committed                      |
| Documents    | `/api/v1/documents`                                  | Untracked, needs commit        |
| Patches      | `/api/v1/patches`                                    | Untracked, needs commit        |
| Review Queue | `/api/v1/review-queue`                               | Untracked, needs commit        |
| API Proxy    | next.config.mjs rewrite                              | In stash                       |
