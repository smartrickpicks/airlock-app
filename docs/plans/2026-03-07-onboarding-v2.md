# Onboarding v2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the 6-step wizard onboarding with a streamlined flow: Landing Page → Auth → Workspace Name → Capability Tree, plus animated beam edges on the tree.

**Architecture:** Four route-based pages (landing, auth passthrough, name wizard, tree). Each step is its own route for clean separation and future Google OAuth integration. The animated beam is an SVG gradient pulse on the existing CapabilityEdge component.

**Tech Stack:** Next.js 14 App Router, React, Zustand, Tailwind CSS tokens, @xyflow/react SVG edges

---

### Task 1: Create Landing Page

**Files:**

- Create: `apps/web/src/app/landing/page.tsx`

**Step 1: Create the landing page component**

This page lives OUTSIDE the `(shell)` route group — no sidebar, no nav. Full-screen OLED dark background with centered content.

```tsx
"use client";

import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-base">
      {/* Logo */}
      <h1 className="font-mono text-4xl font-bold tracking-widest text-text-primary">
        AIRLOCK
      </h1>

      {/* Tagline */}
      <p className="mt-3 text-sm text-text-secondary">
        Enterprise data operations, orchestrated.
      </p>

      {/* CTA */}
      <button
        onClick={() => router.push("/onboarding")}
        className="mt-10 rounded-full bg-accent-primary px-8 py-3 text-sm font-semibold text-surface-base transition-colors hover:bg-accent-primary-hover"
      >
        Create Workspace
      </button>

      {/* Sign in link (placeholder) */}
      <p className="mt-6 text-xs text-text-muted">
        Already have a workspace?{" "}
        <button className="text-text-secondary underline underline-offset-2 transition-colors hover:text-text-primary">
          Sign in
        </button>
      </p>
    </div>
  );
}
```

**Step 2: Verify**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && cd apps/web && npx tsc --noEmit --pretty`
Expected: No errors related to `landing/page.tsx`

**Step 3: Commit**

```bash
git add apps/web/src/app/landing/page.tsx
git commit -m "feat(web): add landing page with Create Workspace CTA"
```

---

### Task 2: Update Auth Passthrough

**Files:**

- Modify: `apps/web/src/app/onboarding/page.tsx`

**Step 1: Change redirect target from `/admin` to `/onboarding/setup`**

The current `onboarding/page.tsx` provisions dev auth and redirects to `/admin`. Change the redirect to `/onboarding/setup` so the user goes through the workspace naming wizard first.

In `apps/web/src/app/onboarding/page.tsx`, change:

```tsx
router.replace("/admin");
```

to:

```tsx
router.replace("/onboarding/setup");
```

Also update the comment:

```tsx
/**
 * Auth passthrough — provisions dev session, redirects to workspace wizard.
 * Future: Google OAuth callback handler.
 */
```

**Step 2: Verify**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && cd apps/web && npx tsc --noEmit --pretty`
Expected: No errors

**Step 3: Commit**

```bash
git add apps/web/src/app/onboarding/page.tsx
git commit -m "feat(web): redirect auth passthrough to workspace wizard"
```

---

### Task 3: Replace Setup Wizard with Name-Only Wizard

**Files:**

- Modify: `apps/web/src/app/onboarding/setup/page.tsx`

**Step 1: Replace the existing multi-step wizard page with a single-step name wizard**

The current `setup/page.tsx` imports the 6-step `SetupWizard` template. Replace it entirely with a simple name input that:

1. Shows a centered card with "Name your workspace" header
2. Auto-focuses a text input (placeholder: "Acme Records")
3. "Launch Workspace" button disabled until name is non-empty
4. On submit: stores workspace name, resets capability tree to fresh, navigates to `/admin`

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Rocket } from "lucide-react";
import { useCapabilityTreeStore } from "@/stores/capability-tree.store";

export default function OnboardingSetupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const initTree = useCapabilityTreeStore((s) => s.initTree);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleLaunch() {
    if (!name.trim()) return;
    // Store workspace name in localStorage for now
    localStorage.setItem("airlock_workspace_name", name.trim());
    // Reset capability tree to fresh state
    initTree(false);
    router.push("/admin");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-base p-4">
      <div className="w-full max-w-md rounded-xl border border-surface-border bg-surface-overlay p-8 shadow-2xl">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-primary/10">
            <Rocket size={24} className="text-accent-primary" />
          </div>
        </div>

        {/* Header */}
        <h2 className="text-center text-lg font-bold text-text-primary">
          Name your workspace
        </h2>
        <p className="mt-1 text-center text-sm text-text-secondary">
          You can change this later.
        </p>

        {/* Input */}
        <div className="mt-6">
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLaunch()}
            placeholder="Acme Records"
            className="w-full rounded-lg border border-surface-border bg-surface-sunken px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
          />
        </div>

        {/* Launch button */}
        <button
          onClick={handleLaunch}
          disabled={!name.trim()}
          className="mt-6 w-full rounded-lg bg-accent-primary py-3 text-sm font-semibold text-surface-base transition-colors hover:bg-accent-primary-hover disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Launch Workspace
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Verify**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && cd apps/web && npx tsc --noEmit --pretty`
Expected: No errors. The old `SetupWizard` template and `onboarding.store` are no longer imported from this page (they still exist for reference but are unused here).

**Step 3: Commit**

```bash
git add apps/web/src/app/onboarding/setup/page.tsx
git commit -m "feat(web): replace 6-step wizard with single-step workspace naming"
```

---

### Task 4: Rewrite CapabilityEdge with Animated Beam

**Files:**

- Modify: `apps/web/src/components/organisms/CapabilityEdge.tsx`
- Modify: `apps/web/src/components/organisms/CapabilityTree.tsx` (remove old keyframes)

**Step 1: Rewrite CapabilityEdge.tsx with SVG gradient beam animation**

Replace the entire file. The new edge uses:

- **Satisfied edges**: SVG `<linearGradient>` with an animated offset creating a traveling glow pulse along the path. Thin (2px), cyan (`accent-primary`).
- **Unsatisfied edges**: Static faded dashed line, 1px, no animation.

```tsx
"use client";

import { memo, useId } from "react";
import { getSmoothStepPath, type EdgeProps } from "@xyflow/react";

function CapabilityEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const gradientId = useId();
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 16,
  });

  const satisfied = !!(data as Record<string, unknown>)?.satisfied;

  if (!satisfied) {
    // Static faded dashed edge
    return (
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke="color-mix(in srgb, var(--surface-border) 30%, transparent)"
        strokeWidth={1}
        strokeDasharray="4 6"
      />
    );
  }

  // Animated beam edge — traveling glow pulse
  return (
    <g>
      {/* Gradient definition with animated stops */}
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1={sourceX}
          y1={sourceY}
          x2={targetX}
          y2={targetY}
        >
          <stop
            offset="0%"
            stopColor="var(--accent-primary)"
            stopOpacity="0.15"
          >
            <animate
              attributeName="stopOpacity"
              values="0.15;0.15;0.6;0.15;0.15"
              dur="3s"
              repeatCount="indefinite"
            />
          </stop>
          <stop
            offset="30%"
            stopColor="var(--accent-primary)"
            stopOpacity="0.15"
          >
            <animate
              attributeName="stopOpacity"
              values="0.15;0.15;0.15;0.6;0.15"
              dur="3s"
              repeatCount="indefinite"
            />
          </stop>
          <stop
            offset="60%"
            stopColor="var(--accent-primary)"
            stopOpacity="0.6"
          >
            <animate
              attributeName="stopOpacity"
              values="0.6;0.15;0.15;0.15;0.6"
              dur="3s"
              repeatCount="indefinite"
            />
          </stop>
          <stop
            offset="100%"
            stopColor="var(--accent-primary)"
            stopOpacity="0.15"
          >
            <animate
              attributeName="stopOpacity"
              values="0.15;0.6;0.15;0.15;0.15"
              dur="3s"
              repeatCount="indefinite"
            />
          </stop>
        </linearGradient>
      </defs>

      {/* Base line (dim) */}
      <path
        d={edgePath}
        fill="none"
        stroke="var(--accent-primary)"
        strokeWidth={2}
        strokeOpacity={0.15}
      />

      {/* Animated beam overlay */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={2}
      />
    </g>
  );
}

export default memo(CapabilityEdgeComponent);
```

**Step 2: Remove old edge-flow keyframes from CapabilityTree.tsx**

In `apps/web/src/components/organisms/CapabilityTree.tsx`, remove the inline `<style>` block that defines the old `edge-flow` keyframes (lines 51-56):

```tsx
// DELETE this block:
<style>{`
  @keyframes edge-flow {
    from { stroke-dashoffset: 10; }
    to { stroke-dashoffset: 0; }
  }
`}</style>
```

**Step 3: Verify**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && cd apps/web && npx tsc --noEmit --pretty`
Expected: No errors

**Step 4: Commit**

```bash
git add apps/web/src/components/organisms/CapabilityEdge.tsx apps/web/src/components/organisms/CapabilityTree.tsx
git commit -m "feat(web): replace dashed edges with animated beam pulse on capability tree"
```

---

### Task 5: Build Verification

**Step 1: Run type-check**

```bash
source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check
```

Expected: Clean pass

**Step 2: Run lint**

```bash
source ~/.nvm/nvm.sh && nvm use 20 && pnpm lint
```

Expected: Clean pass (or only pre-existing warnings)

**Step 3: Spot-check the flow**

Manual verification checklist:

- [ ] `/landing` renders hero + CTA button
- [ ] Clicking "Create Workspace" navigates to `/onboarding`
- [ ] `/onboarding` provisions dev auth and redirects to `/onboarding/setup`
- [ ] `/onboarding/setup` shows single name input, auto-focused
- [ ] Button disabled until name entered
- [ ] Enter key submits
- [ ] After submit, navigates to `/admin` with fresh capability tree
- [ ] Tree edges show animated beam pulse on configured (satisfied) edges
- [ ] Unconfigured edges are static faded dashed lines

**Step 4: Commit (if any lint fixes needed)**

```bash
git add -u
git commit -m "fix(web): lint fixes for onboarding v2"
```

---

## Summary

| Task | File                                                   | Action                                         |
| ---- | ------------------------------------------------------ | ---------------------------------------------- |
| 1    | `apps/web/src/app/landing/page.tsx`                    | CREATE — Landing page with hero + CTA          |
| 2    | `apps/web/src/app/onboarding/page.tsx`                 | MODIFY — Redirect to `/onboarding/setup`       |
| 3    | `apps/web/src/app/onboarding/setup/page.tsx`           | REWRITE — Single name input wizard             |
| 4    | `apps/web/src/components/organisms/CapabilityEdge.tsx` | REWRITE — Animated beam pulse edges            |
| 4    | `apps/web/src/components/organisms/CapabilityTree.tsx` | MODIFY — Remove old edge-flow keyframes        |
| 5    | —                                                      | VERIFY — type-check + lint + manual flow check |
