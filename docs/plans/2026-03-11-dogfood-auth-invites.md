# Dogfood-Ready Auth + Invites Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the full flow — login → workspace creation → invite team → second workspace — production-ready for dogfooding on brainbrigade.xyz.

**Architecture:** Fix the auth flow so new users get a proper workspace lifecycle (login → onboarding → workspace creation → JWT refresh → invite sending). Wire the onboarding wizard's invite step to the real POST /api/v1/invites endpoint. Add middleware redirect for users without a workspace. Verify Fly.io env vars for Resend email delivery.

**Tech Stack:** Next.js 14 (App Router), FastAPI, Zustand, Resend (email), Google OAuth, JWT

---

## Audit Summary

| #   | Issue                                                            | Severity | File                                                 |
| --- | ---------------------------------------------------------------- | -------- | ---------------------------------------------------- |
| 1   | Login sends hardcoded `workspace_id: "ws_default"`               | CRITICAL | `apps/web/src/app/login/page.tsx:102`                |
| 2   | Backend trusts client-provided workspace_id                      | CRITICAL | `apps/api/src/services/auth.py:34`                   |
| 3   | First-time-user detection uses `org_role === "member"` (fragile) | HIGH     | `apps/web/src/app/login/page.tsx:110`                |
| 4   | Onboarding invite step never calls POST /api/v1/invites          | CRITICAL | `apps/web/src/app/onboarding/setup/page.tsx:496-596` |
| 5   | Middleware doesn't redirect to onboarding when workspace missing | HIGH     | `apps/web/src/middleware.ts:230-236`                 |
| 6   | brainbrigade.xyz doesn't resolve to a workspace_id               | HIGH     | `apps/web/src/middleware.ts:173`                     |
| 7   | Fly.io env vars (APP_URL, RESEND_API_KEY) may not be set         | HIGH     | `apps/api/src/config.py:62-64`                       |
| 8   | Admin workspace page uses mock data                              | MEDIUM   | `apps/web/src/app/(shell)/admin/workspace/page.tsx`  |
| 9   | Error handling parses message strings instead of status codes    | LOW      | `apps/web/src/app/onboarding/setup/page.tsx:262-282` |

---

## Task 1: Fix Login — Stop Sending Hardcoded workspace_id

**Why:** New users created via Google OAuth are assigned to non-existent workspace `"ws_default"`. The backend should handle first-time users with `workspace_id = ""` (empty string) and the login page should detect first-time users by checking `workspace_id`, not `org_role`.

**Files:**

- Modify: `apps/web/src/app/login/page.tsx:100-113`
- Modify: `apps/api/src/services/auth.py:32-36, 68-77`
- Modify: `apps/api/src/routes/auth.py:28-30`

**Step 1: Update the GoogleVerifyRequest schema to make workspace_id optional**

In `apps/api/src/routes/auth.py`, change:

```python
class GoogleVerifyRequest(BaseModel):
    credential: str
    workspace_id: str
```

To:

```python
class GoogleVerifyRequest(BaseModel):
    credential: str
    workspace_id: str = ""
```

**Step 2: Update authenticate_google_user to default new users to empty workspace_id**

In `apps/api/src/services/auth.py`, line 71: the function already receives `workspace_id` as a parameter. When called from the login flow, it will now receive `""` instead of `"ws_default"`. No change needed in the service — the empty string is fine. The user gets `workspace_id: ""` in their JWT, which the frontend uses to detect "needs onboarding".

**Step 3: Update the frontend login to stop sending ws_default**

In `apps/web/src/app/login/page.tsx`, change lines 100-103:

```typescript
body: JSON.stringify({
  credential: credentialResponse.credential,
  workspace_id: "ws_default",
}),
```

To:

```typescript
body: JSON.stringify({
  credential: credentialResponse.credential,
}),
```

**Step 4: Fix first-time-user detection — check workspace_id instead of org_role**

In `apps/web/src/app/login/page.tsx`, change lines 109-113:

```typescript
// First-time user (no workspace) → onboarding
if (data.user.org_role === "member") {
  router.push("/onboarding/setup");
  return;
}
```

To:

```typescript
// First-time user (no workspace) → onboarding
// Also add workspace_id to the AuthResponse type
if (!data.workspace_id || data.workspace_id === "") {
  router.push("/onboarding/setup");
  return;
}
```

And update the `AuthResponse` interface (lines 12-22) to include:

```typescript
interface AuthResponse {
  access_token: string;
  refresh_token: string;
  workspace_id?: string; // empty or missing = first-time user
  user: {
    id: string;
    email: string;
    display_name: string;
    avatar_url?: string;
    org_role: string;
  };
}
```

The backend `authenticate_google_user` already returns `token_data` with `workspace_id` inside the JWT. We also need to surface it in the response body. In `apps/api/src/services/auth.py`, add `workspace_id` to the return dict (after line 108):

```python
return {
    "access_token": create_access_token(token_data),
    "refresh_token": create_refresh_token(token_data),
    "workspace_id": user.workspace_id,  # ADD THIS
    "user": {
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
        "org_role": user.org_role,
    },
}
```

**Step 5: Verify**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && cd apps/web && pnpm type-check`
Run: `cd apps/api && source .venv/bin/activate && python -m py_compile src/routes/auth.py && python -m py_compile src/services/auth.py`

**Step 6: Commit**

```bash
git add apps/web/src/app/login/page.tsx apps/api/src/services/auth.py apps/api/src/routes/auth.py
git commit -m "fix(auth): stop sending hardcoded ws_default, detect first-time users by workspace_id"
```

---

## Task 2: Add Middleware Redirect for Users Without Workspace

**Why:** If a logged-in user has no workspace (empty workspace_id in JWT), they should be redirected to `/onboarding/setup` instead of seeing a broken shell. This also handles returning users whose workspace was deleted.

**Files:**

- Modify: `apps/web/src/middleware.ts:230-238`

**Step 1: Decode JWT and check workspace_id after auth check**

In `apps/web/src/middleware.ts`, after line 236 (the redirect-to-login block), before the final `return createResponse()`, add workspace check:

```typescript
// Require auth for everything else
const token = request.cookies.get("airlock_access_token");
if (!token) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

// Check if user has a workspace — redirect to onboarding if not
// JWT payload is base64-encoded JSON in the second segment
try {
  const payload = JSON.parse(
    Buffer.from(token.value.split(".")[1], "base64url").toString(),
  );
  if (
    (!payload.workspace_id || payload.workspace_id === "") &&
    !pathname.startsWith("/onboarding")
  ) {
    return NextResponse.redirect(new URL("/onboarding/setup", request.url));
  }
  // Set workspace_id header from JWT for downstream use
  if (payload.workspace_id) {
    requestHeaders.set("x-workspace-id", payload.workspace_id);
  }
} catch {
  // Malformed JWT — let the app handle it
}

return createResponse();
```

**Step 2: Verify**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && cd apps/web && pnpm type-check`

**Step 3: Commit**

```bash
git add apps/web/src/middleware.ts
git commit -m "fix(web): redirect to onboarding when JWT has no workspace_id"
```

---

## Task 3: Wire Onboarding Invite Step to Real API

**Why:** The invite step (step 4) currently only stores emails in Zustand state. They're never sent to the backend. This means team members never receive invite emails.

**Files:**

- Modify: `apps/web/src/app/onboarding/setup/page.tsx:496-596` (StepInviteTeam)

**Step 1: Add loading/error state and API call to StepInviteTeam**

Replace the `StepInviteTeam` function with one that calls POST /api/v1/invites when the user clicks "Continue":

```typescript
function StepInviteTeam({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const setupState = useOnboardingStore((s) => s.setupState);
  const addInvitee = useOnboardingStore((s) => s.addInvitee);
  const removeInvitee = useOnboardingStore((s) => s.removeInvitee);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"builder" | "gatekeeper" | "owner">(
    "builder",
  );
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sentCount, setSentCount] = useState(0);

  function handleAdd() {
    if (!email.includes("@")) return;
    addInvitee({ email, role });
    setEmail("");
  }

  async function handleContinue() {
    // If no invitees, just skip
    if (setupState.invitees.length === 0) {
      onNext();
      return;
    }

    setSending(true);
    setSendError(null);
    let sent = 0;

    // Map wizard roles to org_role values the API expects
    const roleMap: Record<string, string> = {
      builder: "member",
      gatekeeper: "member",
      owner: "executive",
    };

    for (const inv of setupState.invitees) {
      try {
        await apiFetch("/api/v1/invites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: inv.email,
            org_role: roleMap[inv.role] || "member",
          }),
        });
        sent++;
      } catch {
        // Continue sending remaining invites even if one fails
      }
    }

    setSentCount(sent);
    setSending(false);

    if (sent === 0) {
      setSendError(
        "Could not send invites. Check your connection and try again.",
      );
      return;
    }

    onNext();
  }

  // ... rest of JSX stays the same, but wire handleContinue to WizardNav
```

In the JSX, update the `WizardNav` at the bottom:

```typescript
<WizardNav
  onNext={handleContinue}
  onBack={onBack}
  nextLabel={
    sending
      ? "Sending invites..."
      : setupState.invitees.length > 0
        ? `Send ${setupState.invitees.length} invite${setupState.invitees.length > 1 ? "s" : ""}`
        : "Continue"
  }
  skipLabel="Skip for now"
  onSkip={onNext}
  disabled={sending}
/>
```

Add error display above WizardNav:

```typescript
{sendError && (
  <p className="mt-4 rounded-lg border border-accent-danger/30 bg-accent-danger/10 px-3 py-2 text-xs text-accent-danger">
    {sendError}
  </p>
)}
```

**Step 2: Import apiFetch at the top of setup/page.tsx**

Already imported on line 23: `import { apiFetch } from "@/lib/api";` — no change needed.

**Step 3: Verify**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && cd apps/web && pnpm type-check`

**Step 4: Commit**

```bash
git add apps/web/src/app/onboarding/setup/page.tsx
git commit -m "feat(web): wire onboarding invite step to POST /api/v1/invites"
```

---

## Task 4: Set brainbrigade.xyz Workspace ID from JWT

**Why:** `brainbrigade.xyz` is classified as "app" host in middleware and skips workspace resolution. But workspace_id never gets set from any source, so `x-workspace-id` header is undefined. Task 2 already handles setting workspace_id from JWT, so this is partially solved. But we need to verify the flow is correct.

**Files:**

- Verify: `apps/web/src/middleware.ts` (Task 2 changes handle this)

**Step 1: Verify the middleware flow**

After Task 2, the middleware does:

1. Classify `brainbrigade.xyz` as "app" → skip domain resolution (correct, it's not a tenant domain)
2. Check for auth cookie → redirect to login if missing
3. Decode JWT → get `workspace_id` from token claims
4. Set `x-workspace-id` header from JWT claims
5. Redirect to `/onboarding/setup` if workspace_id is empty

This is the correct behavior: `brainbrigade.xyz` users get their workspace from their JWT, not from domain resolution. Each user sees their own workspace.

**Step 2: No code changes needed** — Task 2 covers this.

---

## Task 5: Verify and Document Fly.io Production Env Vars

**Why:** The invite system needs `RESEND_API_KEY` and `APP_URL` set on Fly.io. Without them, invite emails won't send and join URLs will point to localhost.

**Files:**

- Reference: `apps/api/src/config.py:62-64`

**Step 1: Check current Fly.io secrets**

Run:

```bash
fly secrets list -a airlock-api
```

**Step 2: Set required secrets if missing**

```bash
# Required for invite emails
fly secrets set RESEND_API_KEY="<your-resend-api-key>" -a airlock-api

# Required for invite link URLs (default is http://localhost:3000)
fly secrets set APP_URL="https://brainbrigade.xyz" -a airlock-api

# Required for passkey/WebAuthn (if using passkeys)
fly secrets set RP_ID="brainbrigade.xyz" -a airlock-api
fly secrets set RP_ORIGIN="https://brainbrigade.xyz" -a airlock-api
```

**Step 3: Verify config validates on startup**

`apps/api/src/config.py:89-119` has `validate_production_settings()` which checks:

- `JWT_SECRET` is strong (>= 32 chars)
- `TOKEN_ENCRYPTION_KEY` is set
- `RP_ID` is not "localhost"
- `APP_URL` is not localhost

If any of these fail, the API won't start. Check Fly.io logs after deploy:

```bash
fly logs -a airlock-api
```

**Step 4: No commit needed** — this is infrastructure configuration.

---

## Task 6: Improve Error Handling in Workspace Creation

**Why:** The workspace creation step parses error message strings ("409", "401") instead of checking error status codes. This is fragile and can miss errors.

**Files:**

- Modify: `apps/web/src/app/onboarding/setup/page.tsx:262-282`

**Step 1: Replace string parsing with ApiError status check**

Import `ApiError` if not already imported (it's imported on line 23 via `import { apiFetch } from "@/lib/api"` — check if `ApiError` is also imported). Looking at line 9: `import { ApiError, apiFetch } from "@/lib/api";` — yes, already imported.

Change the catch block in StepWorkspaceName (around line 262):

```typescript
} catch (err) {
  setLoading(false);

  if (err instanceof ApiError) {
    if (err.status === 409) {
      setError("A workspace with that name already exists. Try a different name.");
      return;
    }
    if (err.status === 401) {
      setError("Your session expired. Please go back to the login page and sign in again.");
      return;
    }
  }

  setError("Could not create workspace. Check your connection and try again.");
  return;
}
```

**Step 2: Verify**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && cd apps/web && pnpm type-check`

**Step 3: Commit**

```bash
git add apps/web/src/app/onboarding/setup/page.tsx
git commit -m "fix(web): use ApiError status codes instead of string parsing in workspace creation"
```

---

## Task 7: Final Verification + Deploy

**Files:**

- All modified files from Tasks 1-6

**Step 1: Run full type-check and lint**

```bash
source ~/.nvm/nvm.sh && nvm use 20
cd /Users/zacharyholwerda/Desktop/airlock-app
pnpm type-check
pnpm lint
```

**Step 2: Run Python checks**

```bash
cd apps/api && source .venv/bin/activate
python -m py_compile src/routes/auth.py
python -m py_compile src/services/auth.py
```

**Step 3: Deploy to production**

```bash
# Push web changes (Railway auto-deploys from main)
git push origin main

# Deploy API to Fly.io
cd apps/api && fly deploy -a airlock-api
```

**Step 4: Smoke test the full flow**

1. Go to `https://brainbrigade.xyz/login`
2. Sign in with Google → should redirect to `/onboarding/setup` (first-time user)
3. Create workspace → workspace created in DB, JWT refreshed
4. Add team members → invites sent via Resend, emails received
5. Complete wizard → lands on `/contracts/triage`
6. Have invitee click join link → should see workspace name, sign in with Google, land in workspace

---

## Deferred (Not in This Plan)

These items were identified in the audit but are not blocking dogfooding:

| Item                                  | Why Deferred                                                                                                     |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Workspace switcher UI                 | Only needed when user has 2+ workspaces. Can be added after first workspace is established.                      |
| Admin workspace panel → real APIs     | Mock data is acceptable for initial dogfood. Admin settings aren't critical path.                                |
| DNS verification for custom domains   | brainbrigade.xyz is hardcoded as "app" host, doesn't need DNS verification. Custom domains are a future feature. |
| Module/connector selections → backend | Selections don't affect functionality yet. Backend endpoints don't exist.                                        |
| Billing/seat limits                   | Feature flag `feature_billing` is off. Not needed for dogfood.                                                   |
