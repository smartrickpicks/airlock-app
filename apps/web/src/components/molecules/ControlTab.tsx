import type { LucideIcon } from "lucide-react";
import Icon from "@/components/atoms/Icon";

interface ControlTabProps {
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export default function ControlTab({
  icon,
  label,
  isActive,
  onClick,
}: ControlTabProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 h-10
        flex items-center justify-center gap-1.5
        cursor-pointer
        transition-colors duration-fast
        ${
          isActive
            ? "text-text-primary border-b-2 border-accent-primary"
            : "text-text-muted hover:text-text-secondary"
        }
      `}
      role="tab"
      aria-selected={isActive}
    >
      <Icon icon={icon} size="sm" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
