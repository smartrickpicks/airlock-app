"use client";

import {
  Plus,
  AlertTriangle,
  PlusCircle,
  GitBranch,
  LayoutGrid,
  Calendar,
  FolderOpen,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  MODULES,
  CHAMBERS,
  type ModuleName,
  type ChamberName,
} from "@/lib/constants";
import { useModuleStore } from "@/stores/module.store";
import SearchInput from "@/components/atoms/SearchInput";
import PinnedChannel from "@/components/molecules/PinnedChannel";
import ChamberLabel from "@/components/atoms/ChamberLabel";

/** Pinned channels per module */
interface PinnedDef {
  icon: LucideIcon;
  label: string;
}

const pinnedByModule: Record<ModuleName, PinnedDef[]> = {
  contracts: [
    { icon: AlertTriangle, label: "Triage Dashboard" },
    { icon: PlusCircle, label: "Generator" },
  ],
  crm: [{ icon: GitBranch, label: "Pipeline" }],
  tasks: [{ icon: LayoutGrid, label: "Board" }],
  calendar: [{ icon: Calendar, label: "Month View" }],
  documents: [{ icon: FolderOpen, label: "All Documents" }],
};

export default function SubPanel() {
  const { activeModule } = useModuleStore();

  const currentModule = MODULES[activeModule];
  const pinnedItems = pinnedByModule[activeModule];
  const chamberKeys = Object.keys(CHAMBERS) as ChamberName[];

  return (
    <aside
      className="w-[240px] h-full bg-surface-raised border-r border-surface-border flex flex-col overflow-hidden flex-shrink-0"
      aria-label="Sub-panel navigation"
    >
      {/* Module header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-surface-border flex-shrink-0">
        <span className="text-[15px] font-semibold text-text-primary">
          {currentModule.label}
        </span>
        <button
          className="text-text-muted hover:text-text-primary cursor-pointer transition-colors duration-fast"
          aria-label="Create new vault"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Search */}
      <SearchInput className="mx-3 my-2" placeholder="Search..." />

      {/* Pinned channels */}
      <div className="px-1">
        {pinnedItems.map((item) => (
          <PinnedChannel
            key={item.label}
            icon={item.icon}
            label={item.label}
            isActive={false}
            onClick={() => {}}
          />
        ))}

        {/* Divider */}
        <div className="h-px bg-surface-border my-2 mx-3" />
      </div>

      {/* Chamber groups */}
      <div className="flex-1 overflow-y-auto px-1">
        {chamberKeys.map((chamber) => (
          <ChamberLabel
            key={chamber}
            label={CHAMBERS[chamber].label}
            chamber={chamber}
            count={0}
          >
            <p className="text-xs text-text-muted px-3 py-1">No vaults</p>
          </ChamberLabel>
        ))}
      </div>
    </aside>
  );
}
