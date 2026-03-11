import AirlockIcon from "@/components/atoms/AirlockIcon";
import type {
  AirlockIconName,
  AirlockIconSize,
} from "@/components/atoms/airlock-icons/types";
import type { MetaArchetype } from "@/lib/mock-forge";
import { ARCHETYPE_DISPLAY } from "@/lib/mock-forge";

interface ArchetypeBadgeProps {
  archetype: MetaArchetype;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const SIZE_CLASSES = {
  sm: {
    pill: "px-1.5 py-0.5 gap-1 text-[10px]",
    iconSize: "sm" as AirlockIconSize,
  },
  md: {
    pill: "px-2.5 py-1 gap-1.5 text-xs",
    iconSize: "sm" as AirlockIconSize,
  },
  lg: { pill: "px-3 py-1.5 gap-2 text-sm", iconSize: "md" as AirlockIconSize },
} as const;

const ARCHETYPE_ICON_MAP: Record<MetaArchetype, AirlockIconName> = {
  driver: "archetype-driver",
  enforcer: "archetype-enforcer",
  interpreter: "archetype-interpreter",
};

export default function ArchetypeBadge({
  archetype,
  size = "md",
  showLabel = true,
}: ArchetypeBadgeProps) {
  const display = ARCHETYPE_DISPLAY[archetype];
  const sizeConfig = SIZE_CLASSES[size];

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeConfig.pill} ${display.bgColor} ${display.color} border ${display.borderColor}`}
    >
      <AirlockIcon
        name={ARCHETYPE_ICON_MAP[archetype]}
        size={sizeConfig.iconSize}
      />
      {showLabel && <span>{display.label}</span>}
    </span>
  );
}
