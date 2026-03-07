# Clean-Slate Onboarding: Zero-to-One Testing Workflow

**Date:** 2026-03-06
**Status:** Approved

## Problem

The app is full of mock data. Every store falls back to `MOCK_*` constants when the API isn't running. There's no way for a first-time user (or a developer testing features) to start with a truly empty workspace and watch real data flow through the system. Upload buttons are decorative. The onboarding flow dumps users into a busy demo dashboard instead of guiding them to their first real action.

## Goal

Two separate paths from login:

- **Dev Login** — existing behavior, mock data everywhere, full demo mode
- **Create Workspace** — clean slate, zero data, guided to upload first contract via real API

A developer can create a workspace, upload a real PDF, watch it parse/extract, create a vault, and see that vault appear in the modules. When they hit a blocker, they reset and start over. Progressively prove each module works with real data.

## Design

### 1. Login Page — Three Paths

| Button                  | Behavior                                                                                      |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| **Sign in with Google** | OAuth flow (existing). Hits real API.                                                         |
| **Dev Login**           | Bypasses auth. Sets `workspaceMode: "demo"`. Loads mock data.                                 |
| **Create Workspace**    | Bypasses auth. Sets `workspaceMode: "clean"`. Redirects to `/onboarding/setup`. No mock data. |

The workspace mode is persisted to localStorage as `airlock_workspace_mode`.

### 2. Clean Store Architecture

Every store's catch block checks the workspace mode:

```
catch {
  if (workspaceMode === "clean") {
    set({ items: [], isLoading: false });     // empty
  } else {
    set({ items: MOCK_ITEMS, isLoading: false }); // demo
  }
}
```

**Stores affected:**

- `vault.store.ts`
- `crm.store.ts`
- `tasks.store.ts`
- `documents.store.ts`
- `calendar.store.ts`
- `notification.store.ts`
- `review-queue.store.ts`

**Also affected:**

- Home page operator hub — only shows mock signals/feed/queue in demo mode
- ShellLayout — WelcomeModal behavior
- `mergeDemoVaults/Accounts/Tasks/etc.` helpers still work — in clean mode they merge with empty arrays

The `workspaceMode` flag lives in `onboarding.store.ts`, persisted to localStorage, readable by all stores via `useOnboardingStore.getState().workspaceMode`.

### 3. Guided Zero-to-One Flow

After "Create Workspace" → wizard → home page:

1. Home shows `FirstUploadView` — "Upload a Contract PDF" CTA to `/contracts/intake`
2. No mock signals, operator queue, or notifications
3. Intake lab: drop PDF → `POST /api/v1/documents/upload` → parse → preflight → extract
4. User names vault → `POST /api/v1/vaults` → redirect to vault detail
5. Hand-holding ends at vault creation. User explores from there.

**Empty state for other modules:** Real UI structure with zero items. Minimal empty-state messages ("No tasks yet"). No mock data. Handled incrementally.

### 4. Admin Reset + Logout

**Logout button** (in ModuleBar or user menu):

- Clears auth state + localStorage auth keys + cookie
- Redirects to `/login`

**Reset Workspace** (admin overlay or dev setting):

- Clears all `airlock_*` localStorage keys
- Resets all Zustand stores
- Redirects to `/login`

No server-side delete for now — client-side reset is sufficient for iterative testing.

### 5. Prerequisites

The real API must be running for the intake pipeline:

- `docker compose up -d postgres redis`
- `cd apps/api && uvicorn src.main:app --reload`
- Document upload, preflight, and extraction endpoints must work
- Vault creation from parsed document must work

## Files Changed

**Login:**

- `apps/web/src/app/login/page.tsx` — add "Create Workspace" button

**Stores:**

- `apps/web/src/stores/onboarding.store.ts` — add `workspaceMode` flag
- `apps/web/src/stores/vault.store.ts` — conditional mock fallback
- `apps/web/src/stores/crm.store.ts` — conditional mock fallback
- `apps/web/src/stores/tasks.store.ts` — conditional mock fallback
- `apps/web/src/stores/documents.store.ts` — conditional mock fallback
- `apps/web/src/stores/calendar.store.ts` — conditional mock fallback
- `apps/web/src/stores/notification.store.ts` — conditional mock fallback
- `apps/web/src/stores/review-queue.store.ts` — conditional mock fallback

**Home page:**

- `apps/web/src/app/(shell)/page.tsx` — check workspaceMode for operator hub vs empty

**Shell:**

- `apps/web/src/components/templates/ShellLayout.tsx` — logout button
- `apps/web/src/components/organisms/ModuleBar.tsx` — logout button placement

**Intake pipeline (verify/fix):**

- `apps/web/src/stores/intake.store.ts` — verify API calls match current routes
- `apps/api/src/routes/documents.py` — verify upload endpoint
- `apps/api/src/routes/vaults.py` — verify vault creation from parsed doc

## Testing Workflow

1. Start API: `docker compose up -d postgres redis && cd apps/api && uvicorn src.main:app --reload`
2. Start web: `pnpm dev`
3. Go to `localhost:3000` → click "Create Workspace"
4. Complete wizard → land on home page (empty, no mock data)
5. Click "Upload a Contract PDF" → go to intake lab
6. Drop a real PDF → watch parse/preflight/extract
7. Create vault → see it in triage board
8. If it breaks → "Reset Workspace" → start over
9. Fix the blocker → repeat
