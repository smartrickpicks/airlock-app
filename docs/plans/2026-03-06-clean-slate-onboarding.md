# Clean-Slate Onboarding Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Create Workspace" login path that starts with zero mock data, guides users to upload their first contract via the real API, and provides reset/logout controls.

**Architecture:** A persisted `workspaceMode` flag ("clean" | "demo") controls whether stores fall back to mock data or return empty arrays. Login sets the flag. All 7 data stores read it in their catch blocks. The intake pipeline wires to the real FastAPI backend.

**Tech Stack:** Next.js 14, Zustand, Tailwind tokens, FastAPI

---

### Task 1: Add `workspaceMode` to onboarding store

**Files:**

- Modify: `apps/web/src/stores/onboarding.store.ts`

**Step 1: Add localStorage key and type**

At the top of the file, after the existing `LS_KEY_*` constants, add:

```typescript
const LS_KEY_WORKSPACE_MODE = "airlock_workspace_mode";
```

**Step 2: Add to interface and state**

In the `OnboardingState` interface, add:

```typescript
  /* workspace mode */
  workspaceMode: "clean" | "demo";
  setWorkspaceMode: (mode: "clean" | "demo") => void;
```

In the `create()` initializer, add:

```typescript
  workspaceMode: loadFromLS<"clean" | "demo">(LS_KEY_WORKSPACE_MODE, "demo"),
```

Add the setter:

```typescript
  setWorkspaceMode: (mode) => {
    set({ workspaceMode: mode });
    saveToLS(LS_KEY_WORKSPACE_MODE, mode);
  },
```

**Step 3: Add a helper for clean-mode checks**

Export a standalone getter so stores don't need to import the hook:

```typescript
export function getWorkspaceMode(): "clean" | "demo" {
  return useOnboardingStore.getState().workspaceMode;
}
```

**Step 4: Type-check**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/stores/onboarding.store.ts
git commit -m "feat(onboarding): add workspaceMode flag to onboarding store"
```

---

### Task 2: Add "Create Workspace" button to login page

**Files:**

- Modify: `apps/web/src/app/login/page.tsx`

**Step 1: Add the Create Workspace handler**

After the existing `handleDevLogin` function, add:

```typescript
const handleCreateWorkspace = () => {
  // Set clean workspace mode — no mock data
  useOnboardingStore.getState().setWorkspaceMode("clean");

  // Bypass auth with a clean dev user
  const mockResponse: AuthResponse = {
    access_token: "dev_clean_token",
    refresh_token: "dev_clean_refresh",
    user: {
      id: "clean_user_001",
      email: "workspace@airlock.local",
      display_name: "Workspace Admin",
      org_role: "executive",
    },
  };
  hydrateFromLoginResponse(mockResponse);

  // Go to setup wizard
  router.push("/onboarding/setup");
};
```

**Step 2: Modify `handleDevLogin` to explicitly set demo mode**

At the start of `handleDevLogin`, before the try block, add:

```typescript
useOnboardingStore.getState().setWorkspaceMode("demo");
```

**Step 3: Add the Create Workspace button to the JSX**

After the Dev Login button (still inside the `NODE_ENV === "development"` block), add:

```tsx
<button
  onClick={handleCreateWorkspace}
  className="w-full rounded border border-accent-success bg-surface-overlay px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-border"
>
  Create Workspace
</button>
```

**Step 4: Type-check and lint**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check && pnpm lint`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/app/login/page.tsx
git commit -m "feat(onboarding): add Create Workspace button to login page"
```

---

### Task 3: Conditional mock fallback in vault store

**Files:**

- Modify: `apps/web/src/stores/vault.store.ts`

**Step 1: Import the helper**

Add to imports:

```typescript
import { getWorkspaceMode } from "@/stores/onboarding.store";
```

**Step 2: Modify `fetchVaults` catch block**

Replace the existing catch block (which loads `MOCK_VAULTS`) with:

```typescript
    } catch {
      if (getWorkspaceMode() === "clean") {
        set({ vaults: [], isLoading: false, error: null });
      } else {
        // API not running — use mock data for dev preview
        let filtered = mergeDemoVaults(MOCK_VAULTS as Vault[]);
        if (params?.module_type)
          filtered = filtered.filter((v) => v.module_type === params.module_type);
        if (params?.vault_level)
          filtered = filtered.filter((v) => v.vault_level === params.vault_level);
        if (params?.chamber)
          filtered = filtered.filter((v) => v.chamber === params.chamber);
        if (params?.parent_vault_id)
          filtered = filtered.filter(
            (v) => v.parent_vault_id === params.parent_vault_id,
          );
        set({ vaults: filtered, isLoading: false, error: null });
      }
    }
```

**Step 3: Modify `fetchVault` catch block**

Replace the existing catch block for the single-vault fetch:

```typescript
    } catch {
      if (getWorkspaceMode() === "clean") {
        set({ selectedVault: null, isLoading: false, error: "Vault not found" });
      } else {
        const mock = mergeDemoVaults(MOCK_VAULTS as Vault[]).find(
          (v) => v.id === vaultId || v.slug === vaultId,
        ) ?? null;
        set({
          selectedVault: mock,
          isLoading: false,
          error: mock ? null : "Vault not found",
        });
      }
    }
```

**Step 4: Type-check**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/stores/vault.store.ts
git commit -m "feat(contracts): conditional mock fallback in vault store"
```

---

### Task 4: Conditional mock fallback in CRM store

**Files:**

- Modify: `apps/web/src/stores/crm.store.ts`

**Step 1: Import helper**

```typescript
import { getWorkspaceMode } from "@/stores/onboarding.store";
```

**Step 2: Modify `fetchCrmData` catch block**

```typescript
    } catch {
      if (getWorkspaceMode() === "clean") {
        set({ accounts: [], deals: [], leads: [], isLoading: false, error: null });
      } else {
        set({
          accounts: mergeDemoAccounts(MOCK_CRM_ACCOUNTS),
          deals: MOCK_CRM_DEALS,
          leads: MOCK_CRM_LEADS,
          isLoading: false,
          error: null,
        });
      }
    }
```

**Step 3: Type-check and commit**

```bash
source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check
git add apps/web/src/stores/crm.store.ts
git commit -m "feat(crm): conditional mock fallback in CRM store"
```

---

### Task 5: Conditional mock fallback in tasks store

**Files:**

- Modify: `apps/web/src/stores/tasks.store.ts`

**Step 1: Import helper**

```typescript
import { getWorkspaceMode } from "@/stores/onboarding.store";
```

**Step 2: Modify `fetchTasks` catch block**

```typescript
    } catch {
      if (getWorkspaceMode() === "clean") {
        set({ tasks: [], isLoading: false, error: null });
      } else {
        set({ tasks: mergeDemoTasks(MOCK_TASKS), isLoading: false, error: null });
      }
    }
```

**Step 3: Type-check and commit**

```bash
source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check
git add apps/web/src/stores/tasks.store.ts
git commit -m "feat(tasks): conditional mock fallback in tasks store"
```

---

### Task 6: Conditional mock fallback in documents store

**Files:**

- Modify: `apps/web/src/stores/documents.store.ts`

**Step 1: Import helper**

```typescript
import { getWorkspaceMode } from "@/stores/onboarding.store";
```

**Step 2: Modify `fetchDocuments` catch block**

```typescript
    } catch {
      if (getWorkspaceMode() === "clean") {
        set({ documents: [], selectedDocId: null, isLoading: false, error: null });
      } else {
        const merged = mergeDemoDocuments(MOCK_DOCUMENTS);
        set({
          documents: merged,
          selectedDocId: merged[0]?.id ?? null,
          isLoading: false,
          error: null,
        });
      }
    }
```

**Step 3: Type-check and commit**

```bash
source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check
git add apps/web/src/stores/documents.store.ts
git commit -m "feat(documents): conditional mock fallback in documents store"
```

---

### Task 7: Conditional mock fallback in calendar store

**Files:**

- Modify: `apps/web/src/stores/calendar.store.ts`

**Step 1: Import helper**

```typescript
import { getWorkspaceMode } from "@/stores/onboarding.store";
```

**Step 2: Modify `fetchEvents` catch block**

```typescript
    } catch {
      if (getWorkspaceMode() === "clean") {
        set({ events: [], isLoading: false, error: null });
      } else {
        set({
          events: mergeDemoEvents(MOCK_CALENDAR_EVENTS),
          isLoading: false,
          error: null,
        });
      }
    }
```

**Step 3: Type-check and commit**

```bash
source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check
git add apps/web/src/stores/calendar.store.ts
git commit -m "feat(calendar): conditional mock fallback in calendar store"
```

---

### Task 8: Conditional mock fallback in notification store

**Files:**

- Modify: `apps/web/src/stores/notification.store.ts`

Note: This store has NO try/catch — it directly assigns `MOCK_NOTIFICATIONS`. Wrap it.

**Step 1: Import helper**

```typescript
import { getWorkspaceMode } from "@/stores/onboarding.store";
```

**Step 2: Modify `fetchNotifications`**

```typescript
  fetchNotifications: () => {
    if (getWorkspaceMode() === "clean") {
      set({ notifications: [] });
    } else {
      set({ notifications: [...MOCK_NOTIFICATIONS] });
    }
  },
```

**Step 3: Type-check and commit**

```bash
source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check
git add apps/web/src/stores/notification.store.ts
git commit -m "feat(notifications): conditional mock fallback in notification store"
```

---

### Task 9: Conditional mock fallback in review-queue store

**Files:**

- Modify: `apps/web/src/stores/review-queue.store.ts`

**Step 1: Import helper**

```typescript
import { getWorkspaceMode } from "@/stores/onboarding.store";
```

**Step 2: Modify `fetchReviewQueue` catch block**

```typescript
    } catch {
      if (getWorkspaceMode() === "clean") {
        set({ parentVaults: [], signals: [], feedItems: [], isLoading: false, error: null });
      } else {
        set({
          parentVaults: mergeDemoReviewParentVaults(MOCK_PARENT_VAULTS),
          signals: MOCK_HANDOFF_SIGNALS,
          feedItems: mergeDemoReviewFeedItems(MOCK_FEED_ITEMS),
          isLoading: false,
          error: null,
        });
      }
    }
```

**Step 3: Type-check and commit**

```bash
source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check
git add apps/web/src/stores/review-queue.store.ts
git commit -m "feat(contracts): conditional mock fallback in review-queue store"
```

---

### Task 10: Home page — hide mock operator hub in clean mode

**Files:**

- Modify: `apps/web/src/app/(shell)/page.tsx`

**Step 1: Import workspace mode**

Add to imports:

```typescript
import { getWorkspaceMode } from "@/stores/onboarding.store";
```

**Step 2: Hide mock operator hub in the full dashboard view**

In the `Home` component, after the `if (!firstUploadDone)` check (which returns `FirstUploadView`), the remaining code is the operator hub. The mock data (`MOCK_OPERATOR_SIGNALS`, `MOCK_OPERATOR_QUEUE`, `MOCK_OPERATOR_FEED`) should only render in demo mode.

Add at the top of the operator hub rendering logic (after the early return for `FirstUploadView`):

```typescript
const isClean = getWorkspaceMode() === "clean";
```

Then wrap the three mock-data sections conditionally:

- The `MOCK_OPERATOR_SIGNALS` section in the left sidebar: wrap with `{!isClean && (...)}`
- The `MOCK_OPERATOR_QUEUE` list in the My Queue panel: wrap with `{!isClean && (...)}`
- The `MOCK_OPERATOR_FEED` section: wrap with `{!isClean && (...)}`
- The `recommendedQueue` section: wrap with `{!isClean && (...)}`

When `isClean`, show minimal empty-state messages instead:

```tsx
{
  isClean && (
    <div className="rounded-xl border border-surface-border bg-surface-overlay p-4 text-center">
      <p className="text-sm text-text-muted">
        No signals yet. Upload a contract to get started.
      </p>
    </div>
  );
}
```

**Step 3: Type-check and lint**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check && pnpm lint`
Expected: PASS

**Step 4: Commit**

```bash
git add apps/web/src/app/(shell)/page.tsx
git commit -m "feat(shell): hide mock operator hub in clean workspace mode"
```

---

### Task 11: Add logout button to ModuleBar

**Files:**

- Modify: `apps/web/src/components/organisms/ModuleBar.tsx`

**Step 1: Add imports**

```typescript
import { LogOut } from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import { useRouter } from "next/navigation";
```

Note: `useRouter` is already imported. Just add `LogOut` and `useAuthStore`.

**Step 2: Add logout handler in the component**

Inside `ModuleBar`, add:

```typescript
const { logout } = useAuthStore();

const handleLogout = () => {
  logout();
  router.push("/login");
};
```

**Step 3: Add logout button in the bottom section**

In the bottom `<div>` section (between the user avatar placeholder and the Settings gear), add:

```tsx
{
  /* Logout */
}
<button
  className="text-text-muted hover:text-text-primary cursor-pointer transition-colors duration-fast"
  aria-label="Log out"
  title="Log out"
  onClick={handleLogout}
>
  <LogOut size={18} />
</button>;
```

**Step 4: Type-check and lint**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check && pnpm lint`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/components/organisms/ModuleBar.tsx
git commit -m "feat(shell): add logout button to ModuleBar"
```

---

### Task 12: Add Reset Workspace to admin overlay

**Files:**

- Find the admin page: `apps/web/src/app/(shell)/admin/page.tsx` or wherever the admin overlay lives

**Step 1: Identify the admin page file**

Run: `find apps/web/src/app -path "*admin*" -name "page.tsx"`

**Step 2: Add a Reset Workspace section**

Add a "Developer Tools" section at the bottom of the admin page with a button:

```tsx
{
  /* Developer Tools */
}
<div className="rounded-2xl border border-accent-danger/20 bg-accent-danger/5 p-5">
  <h2 className="text-sm font-semibold uppercase tracking-wider text-accent-danger">
    Developer Tools
  </h2>
  <p className="mt-2 text-sm text-text-secondary">
    Reset all client-side workspace data and return to login.
  </p>
  <button
    onClick={handleResetWorkspace}
    className="mt-4 rounded-lg border border-accent-danger/40 bg-surface-overlay px-4 py-2 text-sm font-medium text-accent-danger transition-colors hover:bg-accent-danger/10"
  >
    Reset Workspace
  </button>
</div>;
```

The handler:

```typescript
const handleResetWorkspace = () => {
  // Clear all airlock localStorage keys
  const keysToRemove = Object.keys(localStorage).filter((k) =>
    k.startsWith("airlock_"),
  );
  keysToRemove.forEach((k) => localStorage.removeItem(k));

  // Clear auth cookie
  document.cookie = "airlock_access_token=; path=/; max-age=0; SameSite=Lax";

  // Hard refresh to clear all Zustand stores
  window.location.href = "/login";
};
```

**Step 3: Type-check and commit**

```bash
source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check
git add apps/web/src/app/*/admin/page.tsx
git commit -m "feat(admin): add Reset Workspace button to admin overlay"
```

---

### Task 13: Verify intake store API contract

**Files:**

- Read: `apps/web/src/stores/intake.store.ts`
- Read: `apps/api/src/routes/documents.py`
- Read: `apps/api/src/routes/vaults.py`

**Step 1: Check document upload endpoint**

Verify that `POST /api/v1/documents/upload` exists in the API and accepts:

- FormData with `file` (PDF) and `document_type` (string)
- Returns `{ document: { id, filename, file_format, status, full_text, page_count, metadata, created_at }, parsed: boolean }`

**Step 2: Check vault creation endpoint**

Verify that `POST /api/v1/vaults/from-document` exists and accepts:

- JSON body: `{ document_id: string, name: string, metadata: object }`
- Returns a `Vault` object

**Step 3: If endpoints don't exist, create them**

If `POST /api/v1/documents/upload` doesn't exist:

- Add route to `apps/api/src/routes/documents.py`
- Accept multipart form data with `file` and `document_type`
- Save the file, parse PDF text (using existing engine), return document object

If `POST /api/v1/vaults/from-document` doesn't exist:

- Add route to `apps/api/src/routes/vaults.py`
- Accept `document_id`, `name`, `metadata`
- Create vault, link document, return vault object

**Step 4: Fix any mismatches between frontend types and API response shapes**

The intake store expects specific response shapes. If the API returns different fields, update the store's TypeScript types to match.

**Step 5: Commit any API fixes**

```bash
git add apps/api/
git commit -m "fix(api): align document upload and vault creation endpoints with intake store"
```

---

### Task 14: Remove mock fallback from intake store in clean mode

**Files:**

- Modify: `apps/web/src/stores/intake.store.ts`

**Step 1: Import workspace mode helper**

```typescript
import { getWorkspaceMode } from "@/stores/onboarding.store";
```

**Step 2: Modify the upload catch block**

The intake store currently simulates a mock document when the API fails. In clean mode, it should surface the error instead of faking a result:

```typescript
    } catch (err) {
      if (getWorkspaceMode() === "clean") {
        set({
          isUploading: false,
          error: "Upload failed. Make sure the API server is running (uvicorn src.main:app --reload).",
          intakeStep: "failed",
        });
        return;
      }
      // API not running — simulate a parsed document from the local file
      // ... existing mock fallback ...
    }
```

**Step 3: Type-check and commit**

```bash
source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check
git add apps/web/src/stores/intake.store.ts
git commit -m "feat(contracts): show real errors in clean workspace intake"
```

---

### Task 15: Final type-check, lint, and integration verification

**Step 1: Full type-check**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check`
Expected: PASS with zero errors

**Step 2: Full lint**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && pnpm lint`
Expected: PASS with zero warnings/errors

**Step 3: Manual smoke test checklist**

Start the web dev server: `source ~/.nvm/nvm.sh && nvm use 20 && pnpm dev`

1. Visit `localhost:3000` → see login page with three buttons
2. Click "Dev Login" → land on home with mock data (existing behavior preserved)
3. Logout (click logout icon in ModuleBar) → return to login
4. Click "Create Workspace" → go to setup wizard
5. Complete wizard → land on home page → see FirstUploadView (no mock data)
6. Navigate to Contracts, CRM, Tasks → see empty states, no mock data
7. Navigate to admin → see "Reset Workspace" button
8. Click "Reset Workspace" → return to login, all state cleared

**Step 4: Commit any final fixes**

```bash
git add .
git commit -m "feat(onboarding): clean-slate onboarding with three-path login"
```
