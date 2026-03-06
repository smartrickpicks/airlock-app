"use client";

import type { LucideIcon } from "lucide-react";
import Icon from "@/components/atoms/Icon";
import Tooltip from "@/components/atoms/Tooltip";
import Badge from "@/components/atoms/Badge";

interface ModuleIconProps {
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  badgeCount?: number;
  onClick: () => void;
}

export default function ModuleIcon({
  icon,
  label,
  isActive,
  badgeCount = 0,
  onClick,
}: ModuleIconProps) {
  return (
    <Tooltip content={label} position="right" delay={300}>
      <div className="relative flex items-center">
        {/* Active indicator — 3px wide, 36px tall, centered vertically */}
        <div
          className={`
            absolute -left-1.5 top-1/2 -translate-y-1/2
            w-[3px] rounded-full
            bg-accent-primary
            transition-all duration-fast
            ${isActive ? "h-9" : "h-0 group-hover/module:h-2"}
          `}
        />

        <button
          onClick={onClick}
          className={`
            group/module
            relative w-12 h-12 rounded-xl
            flex items-center justify-center
            transition-all duration-fast
            cursor-pointer
            ${
              isActive
                ? "bg-surface-overlay text-accent-primary scale-105 shadow-[inset_0_0_16px_rgba(0,209,255,0.12),0_0_12px_rgba(0,209,255,0.08)]"
                : "bg-surface-raised text-text-muted hover:bg-surface-overlay hover:text-text-primary hover:scale-105"
            }
          `}
          aria-label={label}
          aria-current={isActive ? "page" : undefined}
        >
          <Icon icon={icon} size="lg" />

          {/* Badge in top-right corner */}
          {badgeCount > 0 && (
            <span className="absolute -top-1 -right-1">
              <Badge count={badgeCount} />
            </span>
          )}
        </button>
      </div>
    </Tooltip>
  );
}
