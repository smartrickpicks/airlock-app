# Contracts Module Views Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire vault data into the contracts module UI — active vaults in the sidebar with gate-colored dots, triage board showing Discover-chamber vaults, and vault detail pages rendering real data in the triptych.

**Architecture:** The SubPanel sidebar fetches vaults from the vault store and groups them by chamber under collapsible ChamberLabel sections. The triage page shows a card grid of Discover-chamber vaults. The vault detail page loads real vault data into the existing TriptychLayout. All data flows through the vault Zustand store which calls the `/api/v1/vaults` API. Since the API may not be running, we add mock data fallback for dev preview.

**Tech Stack:** Next.js 14 App Router, Zustand, Tailwind CSS tokens, existing atomic components (GateDot, ChamberLabel, VaultItem, Badge)

---

## Context

**Existing components you MUST reuse** (do not recreate):

- `atoms/GateDot` — colored dot for chamber status (discover=red, build=yellow, review=purple, ship=green)
- `atoms/ChamberLabel` — collapsible section header with chamber color, count, and children
- `atoms/Badge` — notification count badge
- `atoms/SearchInput` — search input with icon
- `molecules/VaultItem` — vault list row (gate dot + name + health% + entity info + badge)
- `organisms/SubPanel` — sidebar panel (currently has hardcoded placeholder content)

**Stores:**

- `vault.store.ts` — `useVaultStore` with `fetchVaults`, `fetchVault`, `vaults`, `selectedVault`, etc.
- `module.store.ts` — `useModuleStore` with `activeModule`, `activeChamber`, `selectedVaultId`

**Token colors (from tokens.css):**

- Chamber: `--color-gate-red` (discover), `--color-gate-yellow` (build), `--color-gate-purple` (review), `--color-gate-green` (ship)

**Route structure:**

- `(shell)/(modules)/contracts/triage/page.tsx` — triage board (Discover chamber view)
- `(shell)/(modules)/contracts/[vaultId]/page.tsx` — vault detail (inside TriptychLayout)
- `(shell)/(modules)/contracts/[vaultId]/layout.tsx` — wraps in TriptychLayout

**API may not be running.** All vault data fetches should gracefully handle failures. We add a mock data layer for dev preview.

---

### Task 1: Mock Vault Data for Dev Preview

**Files:**

- Create: `apps/web/src/lib/mock-vaults.ts`

Since the API requires Postgres which isn't running locally, create a mock data file that the vault store can fall back to. This lets us see real-looking data in the UI.

**Step 1: Write the mock data**

Create `apps/web/src/lib/mock-vaults.ts`:

```typescript
/**
 * Mock vault data for dev preview when API is not running.
 * Remove this file once the API + Postgres are available.
 */

export interface MockVault {
  id: string;
  workspace_id: string;
  parent_vault_id: string | null;
  vault_level: 1 | 2 | 3 | 4;
  name: string;
  slug: string;
  vault_type: string;
  module_type: string | null;
  chamber: "discover" | "build" | "review" | "ship" | null;
  gate: string | null;
  metadata: Record<string, unknown>;
  health_score: number | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

const now = new Date().toISOString();

export const MOCK_VAULTS: MockVault[] = [
  // -- Discover chamber --
  {
    id: "vault_001",
    workspace_id: "ws_dev",
    parent_vault_id: null,
    vault_level: 4,
    name: "Henderson MSA",
    slug: "henderson-msa",
    vault_type: "contract",
    module_type: "contracts",
    chamber: "discover",
    gate: "gate_triage",
    metadata: { entity: "Henderson Corp", contract_type: "Master Services" },
    health_score: 45,
    created_at: now,
    updated_at: now,
    archived_at: null,
  },
  {
    id: "vault_002",
    workspace_id: "ws_dev",
    parent_vault_id: null,
    vault_level: 4,
    name: "Warner Distribution Q2",
    slug: "warner-dist-q2",
    vault_type: "contract",
    module_type: "contracts",
    chamber: "discover",
    gate: "gate_ingest",
    metadata: { entity: "Warner Music", contract_type: "Distribution" },
    health_score: 32,
    created_at: now,
    updated_at: now,
    archived_at: null,
  },
  {
    id: "vault_003",
    workspace_id: "ws_dev",
    parent_vault_id: null,
    vault_level: 4,
    name: "Summit Publishing License",
    slug: "summit-publishing-license",
    vault_type: "contract",
    module_type: "contracts",
    chamber: "discover",
    gate: "gate_triage",
    metadata: { entity: "Summit Publishing", contract_type: "License" },
    health_score: 58,
    created_at: now,
    updated_at: now,
    archived_at: null,
  },
  // -- Build chamber --
  {
    id: "vault_004",
    workspace_id: "ws_dev",
    parent_vault_id: null,
    vault_level: 4,
    name: "Sony-BigBooty Dist Agreement",
    slug: "sony-bigbooty-dist",
    vault_type: "contract",
    module_type: "contracts",
    chamber: "build",
    gate: "gate_extract",
    metadata: { entity: "Sony Music", contract_type: "Distribution" },
    health_score: 72,
    created_at: now,
    updated_at: now,
    archived_at: null,
  },
  {
    id: "vault_005",
    workspace_id: "ws_dev",
    parent_vault_id: null,
    vault_level: 4,
    name: "Atlantic Sync License",
    slug: "atlantic-sync-license",
    vault_type: "contract",
    module_type: "contracts",
    chamber: "build",
    gate: "gate_preflight",
    metadata: { entity: "Atlantic Records", contract_type: "Sync License" },
    health_score: 85,
    created_at: now,
    updated_at: now,
    archived_at: null,
  },
  // -- Review chamber --
  {
    id: "vault_006",
    workspace_id: "ws_dev",
    parent_vault_id: null,
    vault_level: 4,
    name: "Universal Amendment #3",
    slug: "universal-amendment-3",
    vault_type: "contract",
    module_type: "contracts",
    chamber: "review",
    gate: "gate_gatekeeper",
    metadata: { entity: "Universal Music", contract_type: "Amendment" },
    health_score: 91,
    created_at: now,
    updated_at: now,
    archived_at: null,
  },
  // -- Ship chamber --
  {
    id: "vault_007",
    workspace_id: "ws_dev",
    parent_vault_id: null,
    vault_level: 4,
    name: "BMG Catalog Transfer",
    slug: "bmg-catalog-transfer",
    vault_type: "contract",
    module_type: "contracts",
    chamber: "ship",
    gate: "gate_export",
    metadata: { entity: "BMG Rights", contract_type: "Transfer" },
    health_score: 98,
    created_at: now,
    updated_at: now,
    archived_at: null,
  },
];
```

**Step 2: Commit**

```bash
git add apps/web/src/lib/mock-vaults.ts
git commit -m "feat(web): add mock vault data for dev preview"
```

---

### Task 2: Update Vault Store with Mock Fallback

**Files:**

- Modify: `apps/web/src/stores/vault.store.ts`

Update `fetchVaults` to fall back to mock data when the API fails (API not running). This way the UI shows real-looking content during dev preview.

**Step 1: Add mock fallback to fetchVaults**

In `apps/web/src/stores/vault.store.ts`, add at the top after existing imports:

```typescript
import { MOCK_VAULTS } from "@/lib/mock-vaults";
```

Then modify the `fetchVaults` method's catch block. Change from:

```typescript
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Failed to fetch vaults", isLoading: false });
    }
```

To:

```typescript
    } catch {
      // API not running — use mock data for dev preview
      let filtered = MOCK_VAULTS as Vault[];
      if (params?.module_type) filtered = filtered.filter((v) => v.module_type === params.module_type);
      if (params?.vault_level) filtered = filtered.filter((v) => v.vault_level === params.vault_level);
      if (params?.chamber) filtered = filtered.filter((v) => v.chamber === params.chamber);
      if (params?.parent_vault_id) filtered = filtered.filter((v) => v.parent_vault_id === params.parent_vault_id);
      set({ vaults: filtered, isLoading: false, error: null });
    }
```

Also update `fetchVault` catch block to look up from mock:

```typescript
    } catch {
      const mock = (MOCK_VAULTS as Vault[]).find((v) => v.id === vaultId) ?? null;
      set({ selectedVault: mock, isLoading: false, error: mock ? null : "Vault not found" });
    }
```

**Step 2: Commit**

```bash
git add apps/web/src/stores/vault.store.ts
git commit -m "feat(web): add mock data fallback to vault store"
```

---

### Task 3: Wire SubPanel to Vault Store

**Files:**

- Modify: `apps/web/src/components/organisms/SubPanel.tsx`

This is the big one. Replace the hardcoded placeholder content with real vault data from the store, grouped by chamber.

**Step 1: Rewrite SubPanel**

Replace the entire content of `apps/web/src/components/organisms/SubPanel.tsx` with:

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Calendar,
  FolderOpen,
  GitBranch,
  LayoutGrid,
  Plus,
  PlusCircle,
} from "lucide-react";
import SearchInput from "@/components/atoms/SearchInput";
import ChamberLabel from "@/components/atoms/ChamberLabel";
import PinnedChannel from "@/components/molecules/PinnedChannel";
import VaultItem from "@/components/molecules/VaultItem";
import { useModuleStore } from "@/stores/module.store";
import { useVaultStore } from "@/stores/vault.store";
import { MODULES } from "@/lib/constants";
import type { ChamberName } from "@/stores/module.store";

const pinnedByModule: Record<
  string,
  { icon: typeof AlertTriangle; label: string; path: string }[]
> = {
  contracts: [
    {
      icon: AlertTriangle,
      label: "Triage Dashboard",
      path: "/contracts/triage",
    },
    { icon: PlusCircle, label: "Generator", path: "/contracts/generator" },
  ],
  crm: [{ icon: GitBranch, label: "Pipeline", path: "/crm/pipeline" }],
  tasks: [{ icon: LayoutGrid, label: "Board", path: "/tasks/board" }],
  calendar: [{ icon: Calendar, label: "Month View", path: "/calendar/month" }],
  documents: [
    { icon: FolderOpen, label: "All Documents", path: "/documents/all" },
  ],
};

const CHAMBERS: { key: ChamberName; label: string }[] = [
  { key: "discover", label: "DISCOVER" },
  { key: "build", label: "BUILD" },
  { key: "review", label: "REVIEW" },
  { key: "ship", label: "SHIP" },
];

export default function SubPanel() {
  const router = useRouter();
  const {
    activeModule,
    activeChamber,
    selectedVaultId,
    setActiveChamber,
    setSelectedVault,
  } = useModuleStore();
  const { vaults, fetchVaults } = useVaultStore();

  const currentModule = MODULES[activeModule];
  const pinned = pinnedByModule[activeModule] || [];

  // Fetch vaults for the active module
  useEffect(() => {
    fetchVaults({ module_type: activeModule });
  }, [activeModule, fetchVaults]);

  // Group vaults by chamber
  const vaultsByChamber = CHAMBERS.reduce(
    (acc, { key }) => {
      acc[key] = vaults.filter((v) => v.chamber === key);
      return acc;
    },
    {} as Record<ChamberName, typeof vaults>,
  );

  const handleVaultClick = (vaultId: string, slug: string) => {
    setSelectedVault(vaultId);
    router.push(`/${activeModule}/${slug}`);
  };

  const handlePinnedClick = (path: string) => {
    setSelectedVault(null);
    router.push(path);
  };

  return (
    <aside className="flex h-full w-[240px] flex-col overflow-hidden border-r border-surface-border bg-surface-raised">
      {/* Module header */}
      <div className="flex h-12 items-center justify-between border-b border-surface-border px-4">
        <span className="text-[15px] font-semibold text-text-primary">
          {currentModule.label}
        </span>
        <button className="rounded p-1 text-text-muted transition-colors hover:bg-surface-overlay hover:text-text-primary">
          <Plus size={16} />
        </button>
      </div>

      {/* Search */}
      <div className="mx-3 my-2">
        <SearchInput
          placeholder={`Search ${currentModule.label.toLowerCase()}...`}
        />
      </div>

      {/* Pinned channels */}
      <div className="px-1">
        {pinned.map((pin) => (
          <PinnedChannel
            key={pin.label}
            icon={pin.icon}
            label={pin.label}
            isActive={false}
            onClick={() => handlePinnedClick(pin.path)}
          />
        ))}
      </div>

      <div className="mx-3 my-2 h-px bg-surface-border" />

      {/* Chamber groups with vaults */}
      <div className="flex-1 overflow-y-auto px-1">
        {CHAMBERS.map(({ key, label }) => (
          <ChamberLabel
            key={key}
            label={label}
            chamber={key}
            count={vaultsByChamber[key].length}
            defaultCollapsed={key !== activeChamber}
          >
            {vaultsByChamber[key].length === 0 ? (
              <p className="px-4 py-2 text-xs text-text-muted">No vaults</p>
            ) : (
              vaultsByChamber[key].map((vault) => (
                <VaultItem
                  key={vault.id}
                  name={vault.name}
                  entity={
                    (vault.metadata as Record<string, string>).entity || ""
                  }
                  contractType={
                    (vault.metadata as Record<string, string>).contract_type ||
                    ""
                  }
                  gate={vault.chamber || "discover"}
                  healthPercent={vault.health_score || 0}
                  isActive={selectedVaultId === vault.id}
                  onClick={() => handleVaultClick(vault.id, vault.slug)}
                />
              ))
            )}
          </ChamberLabel>
        ))}
      </div>
    </aside>
  );
}
```

**Step 2: Verify the dev server renders**

Open `http://localhost:3000` after dev login. The sidebar should show:

- Module header ("Contracts")
- Search input
- Pinned channels (Triage Dashboard, Generator)
- 4 chamber sections (DISCOVER, BUILD, REVIEW, SHIP)
- Vault items under each chamber with gate-colored dots and health percentages

**Step 3: Commit**

```bash
git add apps/web/src/components/organisms/SubPanel.tsx
git commit -m "feat(web): wire SubPanel sidebar to vault store with chamber grouping"
```

---

### Task 4: Contracts Triage Board

**Files:**

- Modify: `apps/web/src/app/(shell)/(modules)/contracts/triage/page.tsx`

Replace the placeholder triage page with a card grid showing vaults in the Discover chamber.

**Step 1: Write the triage board**

Replace `apps/web/src/app/(shell)/(modules)/contracts/triage/page.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import GateDot from "@/components/atoms/GateDot";
import { useVaultStore } from "@/stores/vault.store";

export default function TriagePage() {
  const router = useRouter();
  const { vaults, fetchVaults, isLoading } = useVaultStore();

  useEffect(() => {
    fetchVaults({ module_type: "contracts", chamber: "discover" });
  }, [fetchVaults]);

  const discoverVaults = vaults.filter((v) => v.chamber === "discover");

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">
          Triage Board
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Incoming contracts awaiting triage — Discover chamber
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-text-muted">Loading vaults...</p>
        </div>
      ) : discoverVaults.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-text-muted">No contracts in triage</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {discoverVaults.map((vault) => {
            const entity =
              (vault.metadata as Record<string, string>).entity || "Unknown";
            const contractType =
              (vault.metadata as Record<string, string>).contract_type ||
              "Contract";
            const healthColor =
              (vault.health_score ?? 0) >= 80
                ? "text-gate-green"
                : (vault.health_score ?? 0) >= 50
                  ? "text-gate-yellow"
                  : "text-gate-red";

            return (
              <button
                key={vault.id}
                onClick={() => router.push(`/contracts/${vault.slug}`)}
                className="rounded-lg border border-surface-border bg-surface-raised p-4 text-left transition-colors hover:border-accent-primary/30 hover:bg-surface-overlay"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GateDot gate="discover" />
                    <span className="text-sm font-medium text-text-primary">
                      {vault.name}
                    </span>
                  </div>
                  <span className={`font-mono text-xs ${healthColor}`}>
                    {vault.health_score ?? 0}%
                  </span>
                </div>

                <div className="mt-2 text-xs text-text-muted">
                  {entity} — {contractType}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="rounded bg-surface-overlay px-2 py-0.5 text-[11px] text-text-secondary">
                    {vault.gate?.replace("gate_", "") || "pending"}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    {new Date(vault.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/app/(shell)/(modules)/contracts/triage/page.tsx
git commit -m "feat(contracts): add triage board with vault cards"
```

---

### Task 5: Vault Detail Page with Real Data

**Files:**

- Modify: `apps/web/src/app/(shell)/(modules)/contracts/[vaultId]/layout.tsx`
- Modify: `apps/web/src/app/(shell)/(modules)/contracts/[vaultId]/page.tsx`

Wire the vault detail page to load real vault data and display it in the triptych.

**Step 1: Update vault detail layout to use slug**

The URL uses the vault slug (e.g., `/contracts/henderson-msa`), not the vault ID. Update the layout to pass the slug as breadcrumb context.

Replace `apps/web/src/app/(shell)/(modules)/contracts/[vaultId]/layout.tsx`:

```tsx
import TriptychLayout from "@/components/templates/TriptychLayout";

export default async function VaultLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ vaultId: string }>;
}) {
  const { vaultId } = await params;

  return (
    <TriptychLayout title={vaultId} breadcrumb="Contracts" vaultId={vaultId}>
      {children}
    </TriptychLayout>
  );
}
```

**Step 2: Update vault detail page**

Replace `apps/web/src/app/(shell)/(modules)/contracts/[vaultId]/page.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import GateDot from "@/components/atoms/GateDot";
import { useVaultStore } from "@/stores/vault.store";
import type { Chamber } from "@/stores/vault.store";

export default function VaultDetailPage() {
  const params = useParams<{ vaultId: string }>();
  const { selectedVault, fetchVault, isLoading } = useVaultStore();

  useEffect(() => {
    if (params.vaultId) {
      fetchVault(params.vaultId);
    }
  }, [params.vaultId, fetchVault]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-sm text-text-muted">Loading vault...</p>
      </div>
    );
  }

  if (!selectedVault) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-sm text-text-muted">Vault not found</p>
      </div>
    );
  }

  const entity =
    (selectedVault.metadata as Record<string, string>).entity || "";
  const contractType =
    (selectedVault.metadata as Record<string, string>).contract_type || "";
  const healthColor =
    (selectedVault.health_score ?? 0) >= 80
      ? "text-gate-green"
      : (selectedVault.health_score ?? 0) >= 50
        ? "text-gate-yellow"
        : "text-gate-red";

  return (
    <div className="p-6">
      {/* Vault header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <GateDot
              gate={(selectedVault.chamber as Chamber) || "discover"}
              className="h-3 w-3"
            />
            <h2 className="text-lg font-semibold text-text-primary">
              {selectedVault.name}
            </h2>
          </div>
          <p className="mt-1 text-sm text-text-muted">
            {entity}
            {contractType ? ` — ${contractType}` : ""}
          </p>
        </div>
        <div className="text-right">
          <span className={`font-mono text-lg font-bold ${healthColor}`}>
            {selectedVault.health_score ?? 0}%
          </span>
          <p className="text-xs text-text-muted">Health Score</p>
        </div>
      </div>

      {/* Status bar */}
      <div className="mb-6 flex gap-4 rounded-lg border border-surface-border bg-surface-overlay p-4">
        <div>
          <p className="text-xs text-text-muted">Chamber</p>
          <p className="text-sm font-medium capitalize text-text-primary">
            {selectedVault.chamber || "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Gate</p>
          <p className="text-sm font-medium text-text-primary">
            {selectedVault.gate?.replace("gate_", "") || "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Type</p>
          <p className="text-sm font-medium capitalize text-text-primary">
            {selectedVault.vault_type}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Slug</p>
          <p className="font-mono text-sm text-text-secondary">
            {selectedVault.slug}
          </p>
        </div>
      </div>

      {/* Metadata */}
      {Object.keys(selectedVault.metadata).length > 0 && (
        <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <h3 className="mb-3 text-sm font-medium text-text-secondary">
            Metadata
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(selectedVault.metadata).map(([key, value]) => (
              <div key={key}>
                <p className="text-xs text-text-muted">
                  {key.replace(/_/g, " ")}
                </p>
                <p className="text-sm text-text-primary">{String(value)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add apps/web/src/app/(shell)/(modules)/contracts/[vaultId]/layout.tsx apps/web/src/app/(shell)/(modules)/contracts/[vaultId]/page.tsx
git commit -m "feat(contracts): wire vault detail page to vault store"
```

---

### Task 6: Update Vault Store fetchVault to Support Slug Lookup

**Files:**

- Modify: `apps/web/src/stores/vault.store.ts`

The URL uses slugs (`/contracts/henderson-msa`) but `fetchVault` currently takes an ID. We need to also support looking up by slug in the mock data fallback.

**Step 1: Update fetchVault**

In `vault.store.ts`, update the `fetchVault` method to also try slug matching in the mock fallback:

Change the `fetchVault` catch block from:

```typescript
    } catch {
      const mock = (MOCK_VAULTS as Vault[]).find((v) => v.id === vaultId) ?? null;
      set({ selectedVault: mock, isLoading: false, error: mock ? null : "Vault not found" });
    }
```

To:

```typescript
    } catch {
      const mock = (MOCK_VAULTS as Vault[]).find(
        (v) => v.id === vaultId || v.slug === vaultId,
      ) ?? null;
      set({ selectedVault: mock, isLoading: false, error: mock ? null : "Vault not found" });
    }
```

**Step 2: Commit**

```bash
git add apps/web/src/stores/vault.store.ts
git commit -m "fix(web): support slug lookup in vault store mock fallback"
```

---

### Task 7: Navigation Integration — SubPanel to Triage and Vault Detail

**Files:**

- Modify: `apps/web/src/components/organisms/ModuleBar.tsx`

Update the ModuleBar to navigate to the correct module triage page when a module icon is clicked (currently it goes to `/{module}` which may not exist as a page).

**Step 1: Update ModuleBar navigation**

In `apps/web/src/components/organisms/ModuleBar.tsx`, find the module icon click handler. The current code does:

```typescript
router.push(`/${key}`);
```

This is likely fine since the contracts layout handles the base `/contracts` route. But let's verify the contracts base route exists — if not, we need a simple redirect.

Read the file first, then update the click handler for module icons to navigate to the module's last visited view, or default to the triage page for contracts:

In the module icon `onClick`, change from pushing `/${key}` to pushing the `lastVisitedView` from the module store:

```typescript
onClick={() => {
  setActiveModule(key as ModuleName);
  const lastView = useModuleStore.getState().lastVisitedView[key as ModuleName];
  router.push(lastView || `/${key}`);
}}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/organisms/ModuleBar.tsx
git commit -m "feat(shell): use last-visited view for module navigation"
```

---

### Task 8: Lint + Type-Check Verification

**Step 1: Run frontend lint**

Run: `cd apps/web && source ~/.nvm/nvm.sh && nvm use 20 && npx tsc --noEmit`
Expected: No type errors

**Step 2: Run ESLint**

Run: `cd apps/web && source ~/.nvm/nvm.sh && nvm use 20 && npx eslint src/stores/vault.store.ts src/components/organisms/SubPanel.tsx src/app/\(shell\)/\(modules\)/contracts/triage/page.tsx --no-error-on-unmatched-pattern`
Expected: No errors

**Step 3: Fix any issues and commit**

```bash
git add -A
git commit -m "chore(web): fix lint and type issues"
```

---

## Summary

| Task | Component            | What It Does                                   |
| ---- | -------------------- | ---------------------------------------------- |
| 1    | Mock vault data      | 7 realistic contract vaults across 4 chambers  |
| 2    | Vault store fallback | Falls back to mock data when API is down       |
| 3    | SubPanel wiring      | Real vault items grouped by chamber in sidebar |
| 4    | Triage board         | Card grid of Discover-chamber vaults           |
| 5    | Vault detail page    | Real vault data in triptych Orchestrate panel  |
| 6    | Slug lookup          | Support URL slugs in vault store               |
| 7    | Navigation           | Module bar uses last-visited view routing      |
| 8    | Lint verification    | Type-check + ESLint pass                       |

**After completing this milestone, the user will be able to:**

1. Log in (dev mock)
2. See 7 contract vaults in the sidebar grouped by chamber
3. Click "Triage Dashboard" to see a card grid of Discover vaults
4. Click any vault to open its detail in the triptych with real data
5. Navigate between modules via the icon bar
