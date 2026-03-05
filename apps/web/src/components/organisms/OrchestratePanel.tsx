"use client";

import type { ReactNode } from "react";

interface OrchestratePanelProps {
  /** Main content rendered inside the panel */
  children: ReactNode;
  /** Title shown in the header bar */
  title?: string;
  /** Breadcrumb text shown before the title */
  breadcrumb?: string;
  /** Optional governance bar rendered below the header */
  governanceBar?: ReactNode | null;
}

export default function OrchestratePanel({
  children,
  title = "",
  breadcrumb = "",
  governanceBar = null,
}: OrchestratePanelProps) {
  return (
    <div className="flex flex-col flex-1 overflow-hidden min-w-[400px]">
      {/* Header bar */}
      <div className="h-12 bg-surface-raised border-b border-surface-border px-4 flex items-center justify-between flex-shrink-0">
        {/* Left: breadcrumb + title */}
        <div className="flex items-center gap-1 min-w-0">
          {breadcrumb && (
            <>
              <span className="text-xs text-text-muted truncate">
                {breadcrumb}
              </span>
              <span className="text-xs text-text-muted mx-1">/</span>
            </>
          )}
          {title && (
            <span className="text-[15px] font-semibold text-text-primary truncate">
              {title}
            </span>
          )}
        </div>

        {/* Right: action buttons slot (empty for now) */}
        <div className="flex items-center gap-2 flex-shrink-0" />
      </div>

      {/* Governance bar (optional) */}
      {governanceBar}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
