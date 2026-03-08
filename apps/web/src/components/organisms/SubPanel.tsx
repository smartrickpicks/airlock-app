"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  Calendar,
  FolderOpen,
  GitBranch,
  LayoutGrid,
  Plus,
  PlusCircle,
  BellRing,
  Inbox,
  Star,
  Clock3,
} from "lucide-react";
import SearchInput from "@/components/atoms/SearchInput";
import CreateVaultModal from "@/components/molecules/CreateVaultModal";
import ChamberLabel from "@/components/atoms/ChamberLabel";
import PinnedChannel from "@/components/molecules/PinnedChannel";
import VaultItem from "@/components/molecules/VaultItem";
import { createDemoInboundContractIntake } from "@/lib/demo-lifecycle-actions";
import { useModuleStore } from "@/stores/module.store";
import { useVaultStore } from "@/stores/vault.store";
import { getWorkspaceMode } from "@/stores/onboarding.store";
import { MODULES, CHAMBERS, type ChamberName } from "@/lib/constants";

const pinnedByModule: Record<
  string,
  {
    icon: typeof AlertTriangle;
    label: string;
    path: string;
    /** Dynamic badge key — resolved at render time from vault data */
    badgeKey?: "discover_count" | "triage_count";
  }[]
> = {
  home: [
    { icon: Inbox, label: "My Queue", path: "/" },
    { icon: BellRing, label: "Gate Alerts", path: "/" },
    { icon: Star, label: "Favorites", path: "/" },
    { icon: Clock3, label: "Recent Vaults", path: "/" },
  ],
  contracts: [
    {
      icon: PlusCircle,
      label: "Intake Lab",
      path: "/contracts/intake",
      badgeKey: "discover_count",
    },
    {
      icon: AlertTriangle,
      label: "Triage Dashboard",
      path: "/contracts/triage",
      badgeKey: "triage_count",
    },
    { icon: PlusCircle, label: "Generator", path: "/contracts/generator" },
  ],
  crm: [
    { icon: GitBranch, label: "Inbox", path: "/crm/inbox" },
    { icon: GitBranch, label: "Qualify", path: "/crm/qualify" },
    { icon: GitBranch, label: "Pipeline", path: "/crm/pipeline" },
    { icon: GitBranch, label: "Contacts", path: "/crm/contacts" },
    { icon: GitBranch, label: "Activity", path: "/crm/activity" },
    { icon: GitBranch, label: "Health", path: "/crm/health" },
    { icon: GitBranch, label: "Renewals", path: "/crm/renewals" },
    { icon: GitBranch, label: "Onboarding", path: "/crm/onboarding" },
  ],
  tasks: [{ icon: LayoutGrid, label: "Board", path: "/tasks/board" }],
  calendar: [{ icon: Calendar, label: "Month View", path: "/calendar/month" }],
  documents: [
    { icon: FolderOpen, label: "Library", path: "/documents/library" },
  ],
};

const CHAMBER_KEYS: ChamberName[] = ["discover", "build", "review", "ship"];

export default function SubPanel() {
  const pathname = usePathname();
  const router = useRouter();
  const { activeModule, activeChamber, selectedVaultId, setSelectedVault } =
    useModuleStore();
  const { vaults, fetchVaults } = useVaultStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const currentModule =
    (activeModule as string) === "home"
      ? { label: "Home", path: "/", icon: "Home" }
      : MODULES[activeModule];
  const isClean = getWorkspaceMode() === "clean";

  // Derive dynamic badge counts from vault data
  const discoverCount = vaults.filter((v) => v.chamber === "discover").length;
  const triageCount = vaults.filter(
    (v) => v.chamber === "discover" || v.chamber === "build",
  ).length;
  const badgeCounts: Record<string, number> = {
    discover_count: discoverCount,
    triage_count: triageCount,
  };

  const pinned = (pinnedByModule[activeModule] || []).map((pin) => ({
    ...pin,
    badgeCount: isClean
      ? undefined
      : pin.badgeKey
        ? badgeCounts[pin.badgeKey]
        : undefined,
  }));

  // Fetch vaults for the active module
  useEffect(() => {
    if ((activeModule as string) === "home") {
      fetchVaults({ module_type: "contracts" });
      return;
    }
    fetchVaults({ module_type: activeModule });
  }, [activeModule, fetchVaults]);

  // Group vaults by chamber
  const vaultsByChamber = CHAMBER_KEYS.reduce(
    (acc, key) => {
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
    <>
      <aside className="flex h-full w-[240px] flex-shrink-0 flex-col overflow-hidden border-r border-surface-border bg-surface-raised">
        {/* Module header */}
        <div className="theme-panel-main flex h-12 flex-shrink-0 items-center justify-between border-b border-surface-border px-4">
          <span className="text-[15px] font-semibold text-text-primary">
            {currentModule.label}
          </span>
          <button
            className="rounded p-1 text-text-muted transition-colors duration-fast hover:bg-surface-overlay hover:text-text-primary"
            aria-label="Create new vault"
            onClick={() => setShowCreateModal(true)}
            disabled={(activeModule as string) === "home"}
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Search */}
        <SearchInput
          className="mx-3 my-2"
          placeholder={`Search ${currentModule.label.toLowerCase()}...`}
        />

        {/* Pinned channels */}
        <div className="px-1">
          {pinned.map((pin) => (
            <PinnedChannel
              key={pin.label}
              icon={pin.icon}
              label={pin.label}
              isActive={pathname === pin.path && pin.path !== "/"}
              badgeCount={pin.badgeCount}
              onClick={() => handlePinnedClick(pin.path)}
            />
          ))}
        </div>

        <div className="mx-3 my-2 h-px bg-surface-border" />

        {/* Chamber groups with vaults */}
        <div className="flex-1 overflow-y-auto px-1">
          {(activeModule as string) === "home" ? (
            <div className="space-y-4 px-2 py-2">
              <div className="theme-card rounded-xl p-3">
                <div className="theme-section-label theme-label-main">
                  Operator Hub
                </div>
                <div className="mt-2 text-sm text-text-primary">
                  Home is now your queue-first workspace. Open a signal, then
                  jump into the right workspace without losing context.
                </div>
              </div>
              <div>
                <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  Recent Contract Vaults
                </div>
                <div className="space-y-2">
                  {vaults.slice(0, 6).map((vault) => (
                    <VaultItem
                      key={vault.id}
                      name={vault.name}
                      entity={
                        (vault.metadata as Record<string, string>).entity || ""
                      }
                      contractType={
                        (vault.metadata as Record<string, string>)
                          .contract_type || ""
                      }
                      gate={vault.chamber || "discover"}
                      healthPercent={vault.health_score || 0}
                      isActive={selectedVaultId === vault.id}
                      onClick={() => {
                        setSelectedVault(vault.id);
                        router.push(`/contracts/${vault.slug}`);
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            CHAMBER_KEYS.map((key) => (
              <ChamberLabel
                key={key}
                label={CHAMBERS[key].label.toUpperCase()}
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
                        (vault.metadata as Record<string, string>)
                          .contract_type || ""
                      }
                      gate={vault.chamber || "discover"}
                      healthPercent={vault.health_score || 0}
                      isActive={selectedVaultId === vault.id}
                      onClick={() => handleVaultClick(vault.id, vault.slug)}
                    />
                  ))
                )}
              </ChamberLabel>
            ))
          )}
        </div>
      </aside>
      <CreateVaultModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={(data) => {
          if (activeModule === "contracts") {
            const contract = createDemoInboundContractIntake({
              accountName: data.entity,
              ownerName: "Demo Operator",
              contractTitle: data.name,
              contractType: data.contractType,
              fileName: `${data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`,
              source: "Local Upload",
            });
            setSelectedVault(contract.vaultId);
            router.push(`/contracts/${contract.vaultSlug}`);
          } else {
            console.log("Create vault:", data);
          }
          setShowCreateModal(false);
        }}
      />
    </>
  );
}
