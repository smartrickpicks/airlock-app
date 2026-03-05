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
import { MODULES, CHAMBERS, type ChamberName } from "@/lib/constants";

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

const CHAMBER_KEYS: ChamberName[] = ["discover", "build", "review", "ship"];

export default function SubPanel() {
  const router = useRouter();
  const { activeModule, activeChamber, selectedVaultId, setSelectedVault } =
    useModuleStore();
  const { vaults, fetchVaults } = useVaultStore();

  const currentModule = MODULES[activeModule];
  const pinned = pinnedByModule[activeModule] || [];

  // Fetch vaults for the active module
  useEffect(() => {
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
    <aside className="flex h-full w-[240px] flex-shrink-0 flex-col overflow-hidden border-r border-surface-border bg-surface-raised">
      {/* Module header */}
      <div className="flex h-12 flex-shrink-0 items-center justify-between border-b border-surface-border px-4">
        <span className="text-[15px] font-semibold text-text-primary">
          {currentModule.label}
        </span>
        <button
          className="rounded p-1 text-text-muted transition-colors duration-fast hover:bg-surface-overlay hover:text-text-primary"
          aria-label="Create new vault"
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
            isActive={false}
            onClick={() => handlePinnedClick(pin.path)}
          />
        ))}
      </div>

      <div className="mx-3 my-2 h-px bg-surface-border" />

      {/* Chamber groups with vaults */}
      <div className="flex-1 overflow-y-auto px-1">
        {CHAMBER_KEYS.map((key) => (
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
