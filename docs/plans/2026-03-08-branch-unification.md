# Branch Unification + Full API Demo Stack — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restore the full otto-agentic branch state, layer stashed improvements and uncommitted fixes on top, fix hydration bugs, and verify the full API stack works for demo.

**Architecture:** Git-first approach — save current work as patch, reset to the most complete branch state (`origin/claude/otto-agentic-layer-33684`), then apply stash and patch. Fix known SSR hydration bugs. All frontend runs on mock data with real API fallback.

**Tech Stack:** Next.js 14 (App Router), Zustand, FastAPI, PostgreSQL, Tailwind CSS

---

### Task 1: Save Current Uncommitted Work

**Files:**

- Output: `/tmp/airlock-current-fixes.patch`

**Step 1: Create patch of uncommitted changes**

```bash
cd /Users/zacharyholwerda/Desktop/airlock-app
git diff > /tmp/airlock-current-fixes.patch
```

**Step 2: Verify patch captured everything**

```bash
wc -l /tmp/airlock-current-fixes.patch
# Should show ~200+ lines covering SubPanel.tsx, ShellLayout.tsx, mock-crm.ts, pnpm-lock.yaml
head -30 /tmp/airlock-current-fixes.patch
# Should show diff --git a/apps/web/src/components/organisms/SubPanel.tsx ...
```

**Step 3: Commit (none — just a safety backup)**

No commit needed. The patch file is the safety net.

---

### Task 2: Reset to Full Otto Branch

**Step 1: Fetch latest remote state**

```bash
git fetch origin
```

**Step 2: Reset to otto remote HEAD**

```bash
git reset --hard origin/claude/otto-agentic-layer-33684
```

Expected: HEAD now at `c3588e1` (or whatever the current otto remote HEAD is). This commit already contains all 12 brand-crm commits plus the 8 otto-unique commits.

**Step 3: Verify the reset**

```bash
git log --oneline -5
# Should show:
# c3588e1 feat(web,api): wire Otto AI provider end-to-end, fix state bleed, build admin UIs
# e8c371b chore(web): merge brand-crm role system into otto-agentic branch
# e388950 feat(admin): rebuild role system — Architect, Discord-style members, full profile
# ...
```

**Step 4: Clean build cache**

```bash
rm -rf apps/web/.next
```

---

### Task 3: Apply Stash (Otto + Admin Improvements)

**Step 1: Pop stash@{0}**

```bash
git stash pop stash@{0}
```

If conflicts occur, resolve by file:

- `SubPanel.tsx` — take stash version (it has the hydration fix)
- `mock-crm.ts` — take stash version (more complete)
- Other files — take stash version (they're improvements on top of the otto branch)

**Step 2: Verify stash applied**

```bash
git status -s | wc -l
# Should show ~18 modified/new files from the stash
```

**Step 3: Commit (none yet — wait for patch overlay)**

---

### Task 4: Apply Patch (Current Fixes)

**Step 1: Try applying the patch**

```bash
git apply --check /tmp/airlock-current-fixes.patch
```

If the check passes:

```bash
git apply /tmp/airlock-current-fixes.patch
```

If conflicts (likely on SubPanel.tsx, mock-crm.ts since stash already modified them):

```bash
git apply --reject /tmp/airlock-current-fixes.patch
```

Then manually integrate the rejected hunks:

- `SubPanel.tsx` — the stash version likely already has the deferred state fix. If not, add the `useState` + `useEffect` pattern for `progress` and `nodeStates`.
- `ShellLayout.tsx` — the URL→store sync (`deriveModuleFromPath` + `useEffect` to set `activeModule`) must be present. The stash may or may not have this.
- `mock-crm.ts` — merge both sets of additions.
- `pnpm-lock.yaml` — regenerate with `pnpm install` instead.

**Step 2: Verify ShellLayout has URL→store sync**

Check `apps/web/src/components/templates/ShellLayout.tsx` for:

```typescript
function deriveModuleFromPath(pathname: string): ModuleName {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/contracts")) return "contracts";
  // ...
}
```

If missing, add it. This is critical — without it, navigating to `/admin` still shows Contracts sidebar.

**Step 3: Verify SubPanel has deferred state**

Check `apps/web/src/components/organisms/SubPanel.tsx` for:

```typescript
const [progress, setProgress] = useState({
  configured: 0,
  total: 0,
  percent: 0,
});
const [nodeStates, setNodeStates] = useState<Record<string, string>>({});
useEffect(() => {
  setProgress(getProgress());
  setNodeStates(storeNodeStates);
}, [getProgress, storeNodeStates]);
```

If missing, add it. This prevents the infinite re-render loop and SSR hydration mismatch.

---

### Task 5: Fix Home Page Hydration Bug

**Files:**

- Modify: `apps/web/src/app/(shell)/page.tsx:23-31, 80-81, 162`

The `formatTimeAgo()` function calls `Date.now()` during render. Server and client timestamps differ → hydration mismatch. Also, the Home page uses `<main>` but ShellLayout already wraps children in `<main>` → nested `<main>` tags.

**Step 1: Defer time-dependent rendering to client**

In `apps/web/src/app/(shell)/page.tsx`, add a mounted state and defer the activity feed:

```typescript
// After line 57 (const [showWelcome, setShowWelcome] = useState(false);)
const [mounted, setMounted] = useState(false);

// After line 68 (the welcomeSeen useEffect)
useEffect(() => {
  setMounted(true);
}, []);
```

**Step 2: Replace `<main>` with `<div>` to fix nesting**

Change line 81 from:

```tsx
<main className="flex-1 overflow-y-auto p-6">
```

to:

```tsx
<div className="flex-1 overflow-y-auto p-6">
```

And line 171 from `</main>` to `</div>`.

**Step 3: Guard formatTimeAgo with mounted check**

Change line 162 from:

```tsx
{
  formatTimeAgo(event.created_at);
}
```

to:

```tsx
{
  mounted ? formatTimeAgo(event.created_at) : "";
}
```

**Step 4: Verify no hydration error**

```bash
source ~/.nvm/nvm.sh && nvm use 20 && cd /Users/zacharyholwerda/Desktop/airlock-app && pnpm dev
```

Navigate to `/` — should render without "Did not expect server HTML to contain a <div> in <div>" error.

---

### Task 6: Install Dependencies and Verify Build

**Step 1: Install dependencies**

```bash
source ~/.nvm/nvm.sh && nvm use 20 && cd /Users/zacharyholwerda/Desktop/airlock-app && pnpm install
```

**Step 2: Type check**

```bash
pnpm type-check
```

Note: There may be pre-existing TS errors from brand-crm CRM features. These are expected and not regressions from this unification.

**Step 3: Lint**

```bash
pnpm lint
```

---

### Task 7: Commit Unified State

**Step 1: Stage all changes**

```bash
git add -A
```

**Step 2: Review what's staged**

```bash
git diff --cached --stat
```

**Step 3: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(web,api): unify otto-agentic and brand-crm branches

- Restore full otto branch state (agent context, SSE, MCP manifest)
- Layer stashed improvements (Discord roles rewrite, API proxy, mock-admin)
- Fix Home page hydration (defer formatTimeAgo, fix nested <main>)
- Fix SubPanel hydration (defer nodeStates/progress to client)
- Add ShellLayout URL→store sync (admin module detection)
EOF
)"
```

---

### Task 8: Verify Dev Server

**Step 1: Start dev server**

```bash
source ~/.nvm/nvm.sh && nvm use 20 && cd /Users/zacharyholwerda/Desktop/airlock-app && pnpm dev
```

**Step 2: Manual smoke test**

Navigate to each of these in the browser and confirm no crashes:

- `/` — Home page (no hydration error)
- `/contracts/triage` — Triage dashboard
- `/admin/profile` — Profile page
- `/admin/roles` — Discord-style roles
- `/admin/ai-provider` — AI provider config
- `/admin/otto` — OTTO settings

**Step 3: Check console for errors**

No "Maximum update depth exceeded" or "Hydration failed" errors in browser console.

---

### Task 9: Verify Full API Stack (Optional — requires FastAPI running)

**Step 1: Start FastAPI**

```bash
cd /Users/zacharyholwerda/Desktop/airlock-app/apps/api && source .venv/bin/activate && uvicorn src.main:app --reload --port 8000
```

**Step 2: Verify API proxy**

Check `apps/web/next.config.mjs` has the rewrite rule:

```javascript
async rewrites() {
  return [{ source: "/api/:path*", destination: "http://127.0.0.1:8000/api/:path*" }];
}
```

**Step 3: Test OTTO endpoint**

```bash
curl -X POST http://localhost:8000/api/v3/otto/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello OTTO"}'
```

Should return a response (or SSE stream) without 404.

**Step 4: Test vault endpoint**

```bash
curl http://localhost:8000/api/v1/vaults
```

Should return vault list JSON.
