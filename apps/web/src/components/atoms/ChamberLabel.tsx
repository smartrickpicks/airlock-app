"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

type Chamber = "discover" | "build" | "review" | "ship";

interface ChamberLabelProps {
  label: string;
  chamber: Chamber;
  count: number;
  defaultCollapsed?: boolean;
  children?: ReactNode;
}

const chamberBorderColor: Record<Chamber, string> = {
  discover: "border-l-gate-red",
  build: "border-l-gate-yellow",
  review: "border-l-gate-purple",
  ship: "border-l-gate-green",
};

export default function ChamberLabel({
  label,
  chamber,
  count,
  defaultCollapsed = false,
  children,
}: ChamberLabelProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsCollapsed((prev) => !prev)}
        className={`
          flex items-center w-full h-7
          px-2 gap-1.5
          border-l-2 ${chamberBorderColor[chamber]}
          hover:bg-surface-raised/50
          transition-colors duration-fast
          cursor-pointer
        `}
      >
        <ChevronDown
          size={12}
          className={`
            text-text-muted flex-shrink-0
            transition-transform duration-fast
            ${isCollapsed ? "-rotate-90" : ""}
          `}
        />
        <span className="text-[11px] uppercase tracking-wider font-medium text-text-muted">
          {label}
        </span>
        <span className="ml-auto text-[10px] text-text-muted tabular-nums">
          {count}
        </span>
      </button>
      {!isCollapsed && children && <div>{children}</div>}
    </div>
  );
}
