"use client";

import { GitBranch, Clock, CheckCircle, ScrollText, Bot } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import ControlTab from "@/components/molecules/ControlTab";

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
}

export default function ControlPanel({
  width,
  collapsed,
  onOverlayToggle,
  activeTab,
  onTabChange,
}: ControlPanelProps) {
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
        <p className="text-sm text-text-muted">{activeTabDef.placeholder}</p>
      </div>
    </div>
  );
}
