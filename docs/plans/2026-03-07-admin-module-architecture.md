# Admin Module Architecture — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert admin from a special-case route into a first-class module with its own sidebar, where capability tree nodes mirror sidebar items and each node gets a dedicated route.

**Architecture:** Admin becomes `activeModule = "admin"` in the module store. SubPanel detects admin mode and renders a tier-grouped node list instead of chambers/vaults. Each capability tree node maps to `/admin/<slug>`. Onboarding is one-time with a localStorage flag.

**Tech Stack:** Next.js 14 App Router, Zustand, Tailwind tokens, React Flow (existing CapabilityTree)

---

### Task 1: Expand ModuleName to include "admin" and "home"

**Files:**

- Modify: `apps/web/src/stores/module.store.ts`
- Modify: `apps/web/src/lib/constants.ts`

**Changes:**

1. In `module.store.ts`, change the `ModuleName` type:

```typescript
type ModuleName =
  | "contracts"
  | "crm"
  | "tasks"
  | "calendar"
  | "documents"
  | "admin";
```

2. Add `"admin"` to `lastVisitedView` default:

```typescript
lastVisitedView: {
  contracts: "/contracts",
  crm: "/crm",
  tasks: "/tasks",
  calendar: "/calendar",
  documents: "/documents",
  admin: "/admin",
},
```

3. In `module.store.ts`, update `setActiveModule` parameter type — it already uses `ModuleName` so no change needed once the type is expanded.

4. The SubPanel currently checks `(activeModule as string) === "home"` — this pattern stays since "home" is a pseudo-module set by the logo click, not a real ModuleName.

**Verify:** `pnpm type-check` — should see no new errors in module.store.ts.

---

### Task 2: Wire Settings gear to set activeModule

**File:** `apps/web/src/components/organisms/ModuleBar.tsx`

**Changes:**

The Settings gear onClick at line 164 currently does:

```typescript
onClick={() => {
  router.push("/admin");
}}
```

Change to:

```typescript
onClick={() => {
  setActiveModule("admin");
  router.push("/admin");
}}
```

This requires destructuring `setActiveModule` from `useModuleStore` (it's already imported but only `activeModule` and `setActiveModule` are destructured — add `setActiveModule` to the destructure at line 34).

**Verify:** Click settings gear → SubPanel should eventually show admin sidebar (after Task 3).

---

### Task 3: Add admin sidebar to SubPanel

**File:** `apps/web/src/components/organisms/SubPanel.tsx`

This is the largest task. The SubPanel currently has two modes: "home" (Operator Hub + recent vaults) and module (pinned channels + chamber-grouped vaults). Add a third mode: "admin".

**Changes:**

1. Add admin-specific imports at the top:

```typescript
import {
  Building2,
  Brain,
  Database,
  LayoutGrid,
  Users,
  Shield,
  Sparkles,
  Server,
  Wand2,
  Plug,
  GitBranch,
  Radio,
  Flag,
  ScrollText,
  Settings,
  User,
  Palette,
  ChevronRight,
  Check,
  Lock,
} from "lucide-react";
import { useCapabilityTreeStore } from "@/stores/capability-tree.store";
```

2. Define the admin sidebar structure (after the `pinnedByModule` constant):

```typescript
const ADMIN_TIERS = [
  {
    label: "Foundation",
    nodes: [
      {
        id: "workspace",
        label: "Workspace",
        icon: Building2,
        route: "/admin/workspace",
      },
      {
        id: "ai_provider",
        label: "AI Provider",
        icon: Brain,
        route: "/admin/ai-provider",
      },
      {
        id: "data_source",
        label: "Data Source",
        icon: Database,
        route: "/admin/data-source",
      },
    ],
  },
  {
    label: "Platform",
    nodes: [
      {
        id: "modules",
        label: "Modules",
        icon: LayoutGrid,
        route: "/admin/modules",
      },
      { id: "members", label: "Members", icon: Users, route: "/admin/members" },
      { id: "roles", label: "Roles", icon: Shield, route: "/admin/roles" },
    ],
  },
  {
    label: "Extensions",
    nodes: [
      { id: "otto", label: "OTTO", icon: Sparkles, route: "/admin/otto" },
      {
        id: "mcp_servers",
        label: "MCP Servers",
        icon: Server,
        route: "/admin/mcp-servers",
      },
      { id: "skills", label: "Skills", icon: Wand2, route: "/admin/skills" },
      {
        id: "integrations",
        label: "Integrations",
        icon: Plug,
        route: "/admin/integrations",
      },
    ],
  },
  {
    label: "Scale",
    nodes: [
      {
        id: "workflows",
        label: "Workflows",
        icon: GitBranch,
        route: "/admin/workflows",
      },
      {
        id: "event_bus",
        label: "Event Bus",
        icon: Radio,
        route: "/admin/event-bus",
      },
      {
        id: "feature_flags",
        label: "Feature Flags",
        icon: Flag,
        route: "/admin/features",
      },
    ],
  },
];

const ADMIN_PERSONAL = [
  { label: "Profile", icon: User, route: "/admin/settings" },
  { label: "Appearance", icon: Palette, route: "/admin/settings" },
];
```

3. In the render function, add a conditional branch before the home/module check. When `activeModule === "admin"`, render:

```tsx
{activeModule === "admin" ? (
  <>
    {/* Header */}
    <div className="theme-panel-main flex h-12 flex-shrink-0 items-center border-b border-surface-border px-4">
      <span className="text-[15px] font-semibold text-text-primary">Admin</span>
    </div>

    {/* Personal section */}
    <div className="px-1 pt-2">
      {ADMIN_PERSONAL.map((item) => (
        <button
          key={item.label}
          onClick={() => router.push(item.route)}
          className={`flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
            pathname === item.route
              ? "bg-surface-overlay text-text-primary"
              : "text-text-secondary hover:bg-surface-overlay/50 hover:text-text-primary"
          }`}
        >
          <item.icon size={16} className="text-text-muted" />
          {item.label}
        </button>
      ))}
    </div>

    <div className="mx-3 my-2 h-px bg-surface-border" />

    {/* Capability Tree link */}
    <div className="px-1">
      <button
        onClick={() => router.push("/admin")}
        className={`flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          pathname === "/admin"
            ? "bg-accent-primary/10 text-accent-primary"
            : "text-text-secondary hover:bg-surface-overlay/50 hover:text-text-primary"
        }`}
      >
        <LayoutGrid size={16} />
        Capability Tree
        <span className="ml-auto text-[10px] text-text-muted">
          {progress.configured}/{progress.total}
        </span>
      </button>
    </div>

    <div className="mx-3 my-2 h-px bg-surface-border" />

    {/* Tier-grouped nodes */}
    <div className="flex-1 overflow-y-auto px-1">
      {ADMIN_TIERS.map((tier) => (
        <div key={tier.label} className="mb-3">
          <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            {tier.label}
          </div>
          {tier.nodes.map((node) => {
            const state = nodeStates[node.id] ?? "locked";
            const isActive = pathname === node.route;
            const isLocked = state === "locked";
            return (
              <button
                key={node.id}
                onClick={() => !isLocked && router.push(node.route)}
                disabled={isLocked}
                className={`flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                  isLocked
                    ? "cursor-not-allowed opacity-40"
                    : isActive
                      ? "bg-surface-overlay text-text-primary"
                      : "text-text-secondary hover:bg-surface-overlay/50 hover:text-text-primary"
                }`}
              >
                {isLocked ? (
                  <Lock size={14} className="text-text-muted" />
                ) : state === "configured" ? (
                  <Check size={14} className="text-accent-success" />
                ) : (
                  <node.icon size={14} className="text-text-muted" />
                )}
                <span className="flex-1 text-left">{node.label}</span>
                {!isLocked && <ChevronRight size={12} className="text-text-muted" />}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  </>
) : (activeModule as string) === "home" ? (
  // ... existing home sidebar
) : (
  // ... existing module sidebar
)}
```

4. Read `nodeStates` and `getProgress` from the capability tree store at the top of the component:

```typescript
const nodeStates = useCapabilityTreeStore((s) => s.nodeStates);
const getProgress = useCapabilityTreeStore((s) => s.getProgress);
const progress = getProgress();
```

**Verify:** Navigate to `/admin` → sidebar shows Admin with tier-grouped nodes, lock/check badges.

---

### Task 4: Remove back-link from admin layout

**File:** `apps/web/src/app/(shell)/admin/layout.tsx`

The sidebar now handles all admin navigation. Remove the "back to Capability Tree" link.

**Change:** Simplify the layout — all admin routes (including tree root) use the same layout:

```tsx
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="h-full w-full overflow-hidden">{children}</div>;
}
```

Remove all the `usePathname`, `Link`, and `isTreeRoot` logic.

---

### Task 5: Create stub pages for nodes without existing pages

Several nodes don't have dedicated admin pages yet. Create minimal stub pages for each so the sidebar links work.

**Create these files:**

- `apps/web/src/app/(shell)/admin/workspace/page.tsx`
- `apps/web/src/app/(shell)/admin/ai-provider/page.tsx`
- `apps/web/src/app/(shell)/admin/data-source/page.tsx`
- `apps/web/src/app/(shell)/admin/modules/page.tsx`
- `apps/web/src/app/(shell)/admin/roles/page.tsx`
- `apps/web/src/app/(shell)/admin/otto/page.tsx`
- `apps/web/src/app/(shell)/admin/mcp-servers/page.tsx`
- `apps/web/src/app/(shell)/admin/integrations/page.tsx`

Each stub page follows this pattern (using workspace as example):

```tsx
"use client";

import { useCapabilityTreeStore } from "@/stores/capability-tree.store";

export default function AdminWorkspacePage() {
  const config = useCapabilityTreeStore(
    (s) => s.nodeConfigs["workspace"] ?? {},
  );
  const state = useCapabilityTreeStore(
    (s) => s.nodeStates["workspace"] ?? "locked",
  );

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl">
        <h1 className="text-lg font-bold text-text-primary">Workspace</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Name your workspace and set your industry.
        </p>
        <div className="mt-4 rounded-lg border border-surface-border bg-surface-raised p-4">
          <pre className="text-xs text-text-muted">
            {JSON.stringify({ state, config }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
```

Use the node's `label` and `description` from `mock-capability-tree.ts` for each stub's heading and subtitle. Show the config JSON as a placeholder until real config UIs are built.

---

### Task 6: Add onboarding-complete flag

**File:** `apps/web/src/app/onboarding/setup/page.tsx`

After launch, set a flag so subsequent logins skip onboarding:

```typescript
function handleLaunch() {
  // ... existing logic ...
  if (typeof window !== "undefined") {
    localStorage.setItem("airlock_onboarding_complete", "true");
  }
  router.push("/admin");
}
```

**File:** `apps/web/src/app/onboarding/page.tsx`

Check the flag — if onboarding is complete, redirect to `/` (home) instead of `/onboarding/setup`:

```typescript
const isComplete =
  typeof window !== "undefined" &&
  localStorage.getItem("airlock_onboarding_complete") === "true";
redirect(isComplete ? "/" : "/onboarding/setup");
```

---

### Task 7: Verify

```bash
source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check && pnpm lint
```

---

## Key Files

| File                                                   | Action | Purpose                                     |
| ------------------------------------------------------ | ------ | ------------------------------------------- |
| `apps/web/src/stores/module.store.ts`                  | MODIFY | Add "admin" to ModuleName                   |
| `apps/web/src/components/organisms/ModuleBar.tsx`      | MODIFY | Wire setActiveModule("admin") on gear click |
| `apps/web/src/components/organisms/SubPanel.tsx`       | MODIFY | Add admin sidebar with tier-grouped nodes   |
| `apps/web/src/app/(shell)/admin/layout.tsx`            | MODIFY | Simplify — remove back link                 |
| `apps/web/src/app/(shell)/admin/workspace/page.tsx`    | CREATE | Stub page for workspace node                |
| `apps/web/src/app/(shell)/admin/ai-provider/page.tsx`  | CREATE | Stub page for AI provider node              |
| `apps/web/src/app/(shell)/admin/data-source/page.tsx`  | CREATE | Stub page for data source node              |
| `apps/web/src/app/(shell)/admin/modules/page.tsx`      | CREATE | Stub page for modules node                  |
| `apps/web/src/app/(shell)/admin/roles/page.tsx`        | CREATE | Stub page for roles node                    |
| `apps/web/src/app/(shell)/admin/otto/page.tsx`         | CREATE | Stub page for OTTO node                     |
| `apps/web/src/app/(shell)/admin/mcp-servers/page.tsx`  | CREATE | Stub page for MCP servers node              |
| `apps/web/src/app/(shell)/admin/integrations/page.tsx` | CREATE | Stub page for integrations node             |
| `apps/web/src/app/onboarding/setup/page.tsx`           | MODIFY | Set onboarding-complete flag                |
| `apps/web/src/app/onboarding/page.tsx`                 | MODIFY | Check flag, redirect to home if complete    |
