import { Zap, Shield, Compass } from "lucide-react";
import type { MetaArchetype } from "@/lib/mock-forge";
import { ARCHETYPE_DISPLAY } from "@/lib/mock-forge";

interface ArchetypeBadgeProps {
  archetype: MetaArchetype;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const SIZE_CLASSES = {
  sm: { pill: "px-1.5 py-0.5 gap-1 text-[10px]", icon: 10 },
  md: { pill: "px-2.5 py-1 gap-1.5 text-xs", icon: 14 },
  lg: { pill: "px-3 py-1.5 gap-2 text-sm", icon: 16 },
} as const;

const ICONS = {
  driver: Zap,
  enforcer: Shield,
  interpreter: Compass,
} as const;

export default function ArchetypeBadge({
  archetype,
  size = "md",
  showLabel = true,
}: ArchetypeBadgeProps) {
  const display = ARCHETYPE_DISPLAY[archetype];
  const sizeConfig = SIZE_CLASSES[size];
  const Icon = ICONS[archetype];

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeConfig.pill} ${display.bgColor} ${display.color} border ${display.borderColor}`}
    >
      <Icon size={sizeConfig.icon} />
      {showLabel && <span>{display.label}</span>}
    </span>
  );
}
