"use client";

import { useEffect } from "react";
import { GitBranch, Clock, CheckCircle, ScrollText, Bot } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import ControlTab from "@/components/molecules/ControlTab";
import PatchList from "@/components/molecules/PatchList";
import PatchStateBadge from "@/components/atoms/PatchStateBadge";
import ApprovalChain from "@/components/organisms/ApprovalChain";
import SLATimer from "@/components/molecules/SLATimer";
import { usePatchStore } from "@/stores/patch.store";
import OttoChat from "@/components/organisms/OttoChat";

/** Tab definition with icon, label, and placeholder content */
interface TabDef {
  key: string;
  icon: LucideIcon;
  label: string;
  placeholder: string;
}

const TABS: TabDef[] = [
  {
    key: "lifecycle",
    icon: GitBranch,
    label: "Lifecycle",
    placeholder: "State diagram will render here",
  },
  {
    key: "sla",
    icon: Clock,
    label: "SLA",
    placeholder: "SLA countdown and deadlines",
  },
  {
    key: "approvals",
    icon: CheckCircle,
    label: "Approvals",
    placeholder: "Approval chain stepper",
  },
  {
    key: "audit",
    icon: ScrollText,
    label: "Audit",
    placeholder: "Chronological audit log",
  },
  {
    key: "ai-agent",
    icon: Bot,
    label: "AI Agent",
    placeholder: "Chat interface with Otto",
  },
];

/** Collapsed-mode icon list */
const collapsedIcons: { key: string; icon: LucideIcon; label: string }[] = [
  { key: "lifecycle", icon: GitBranch, label: "Lifecycle" },
  { key: "sla", icon: Clock, label: "SLA" },
  { key: "approvals", icon: CheckCircle, label: "Approvals" },
  { key: "audit", icon: ScrollText, label: "Audit" },
  { key: "ai-agent", icon: Bot, label: "AI Agent" },
];

interface ControlPanelProps {
  /** Panel width in pixels */
  width: number;
  /** Whether the panel is collapsed to icon-only mode */
  collapsed: boolean;
  /** Callback to toggle panel overlay/expand */
  onOverlayToggle: () => void;
  /** Currently active tab key */
  activeTab: string;
  /** Callback when a tab is selected */
  onTabChange: (tab: string) => void;
  /** Vault ID to load patches for */
  vaultId?: string | null;
}

export default function ControlPanel({
  width,
  collapsed,
  onOverlayToggle,
  activeTab,
  onTabChange,
  vaultId,
}: ControlPanelProps) {
  const { patches, selectedPatch, fetchPatches, selectPatch } = usePatchStore();

  useEffect(() => {
    if (vaultId) {
      fetchPatches(vaultId);
    }
  }, [vaultId, fetchPatches]);

  // Collapsed icon-only mode
  if (collapsed) {
    return (
      <div
        className="flex flex-col items-center pt-4 gap-3 bg-surface-raised border-l border-surface-border h-full flex-shrink-0"
        style={{ width }}
      >
        {collapsedIcons.map((item) => {
          const IconComponent = item.icon;
          return (
            <button
              key={item.key}
              onClick={onOverlayToggle}
              className="text-text-muted hover:text-text-secondary cursor-pointer transition-colors duration-fast"
              aria-label={item.label}
            >
              <IconComponent size={20} />
            </button>
          );
        })}
      </div>
    );
  }

  // Find the active tab's placeholder content
  const activeTabDef = TABS.find((t) => t.key === activeTab) ?? TABS[0];

  const renderTabContent = () => {
    switch (activeTab) {
      case "approvals":
        return (
          <div className="flex flex-col gap-4">
            <PatchList
              patches={patches}
              selectedPatchId={selectedPatch?.id ?? null}
              onSelect={selectPatch}
            />
            {selectedPatch && (
              <div className="border-t border-surface-border pt-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-primary">
                    {selectedPatch.field_name}
                  </span>
                  <PatchStateBadge state={selectedPatch.state} />
                </div>
                <ApprovalChain steps={selectedPatch.approval_steps} />
              </div>
            )}
          </div>
        );
      case "sla":
        return (
          <div className="flex flex-col gap-4">
            {patches
              .filter((p) => p.sla_deadline)
              .map((patch) => (
                <div
                  key={patch.id}
                  className="rounded-lg border border-surface-border bg-surface-overlay p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-text-primary">
                      {patch.field_name}
                    </span>
                    <PatchStateBadge state={patch.state} />
                  </div>
                  <SLATimer
                    deadline={patch.sla_deadline}
                    paused={patch.state === "admin_hold"}
                  />
                  <p className="mt-1 text-[10px] text-text-muted">
                    {patch.approval_steps.find((s) => s.status === "active")
                      ?.actor_name ?? "Awaiting assignment"}
                  </p>
                </div>
              ))}
            {patches.filter((p) => p.sla_deadline).length === 0 && (
              <p className="text-sm text-text-muted">
                No active SLA deadlines.
              </p>
            )}
          </div>
        );
      case "ai-agent":
        return (
          <div className="-m-4 h-[calc(100%+2rem)]">
            <OttoChat />
          </div>
        );
      default:
        return (
          <p className="text-sm text-text-muted">{activeTabDef.placeholder}</p>
        );
    }
  };

  // Expanded mode
  return (
    <div
      className="flex flex-col bg-surface-raised border-l border-surface-border h-full overflow-hidden flex-shrink-0"
      style={{ width }}
    >
      {/* Tab bar */}
      <div
        className="h-10 bg-surface-raised border-b border-surface-border flex flex-shrink-0"
        role="tablist"
        aria-label="Control panel tabs"
      >
        {TABS.map((tab) => (
          <ControlTab
            key={tab.key}
            icon={tab.icon}
            label={tab.label}
            isActive={activeTab === tab.key}
            onClick={() => onTabChange(tab.key)}
          />
        ))}
      </div>

      {/* Tab content */}
      <div
        className="flex-1 overflow-y-auto p-4"
        role="tabpanel"
        aria-label={activeTabDef.label}
      >
        {renderTabContent()}
      </div>
    </div>
  );
}
