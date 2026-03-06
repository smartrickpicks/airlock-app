import type { LucideIcon } from "lucide-react";
import Icon from "@/components/atoms/Icon";
import Badge from "@/components/atoms/Badge";

interface PinnedChannelProps {
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  badgeCount?: number;
  onClick: () => void;
}

export default function PinnedChannel({
  icon,
  label,
  isActive,
  badgeCount = 0,
  onClick,
}: PinnedChannelProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full h-9 px-3
        flex flex-row items-center gap-2
        rounded cursor-pointer
        transition-all duration-fast
        ${
          isActive
            ? "border-l-2 border-accent-primary"
            : "border-l-2 border-transparent hover:bg-surface-overlay"
        }
      `}
      style={
        isActive
          ? { background: "var(--gradient-signal-active)" }
          : undefined
      }
      aria-current={isActive ? "page" : undefined}
    >
      {/* Icon — 16px */}
      <Icon
        icon={icon}
        size="sm"
        className={isActive ? "text-accent-primary" : "text-text-muted"}
      />

      {/* Label */}
      <span className="text-[13px] font-semibold text-text-primary truncate flex-1 text-left">
        {label}
      </span>

      {/* Badge (right-aligned) */}
      {badgeCount > 0 && (
        <span className="flex-shrink-0">
          <Badge count={badgeCount} />
        </span>
      )}
    </button>
  );
}
