"use client";

import type { MetaArchetype, PIProfile } from "@/lib/mock-admin";
import { META_ARCHETYPE_CONFIG, PI_PROFILE_LABELS } from "@/lib/mock-admin";

interface PIProfileBadgeProps {
  piProfile: PIProfile;
  metaArchetype: MetaArchetype;
  size?: "sm" | "md";
}

export default function PIProfileBadge({
  piProfile,
  metaArchetype,
  size = "sm",
}: PIProfileBadgeProps) {
  const config = META_ARCHETYPE_CONFIG[metaArchetype];
  const label = PI_PROFILE_LABELS[piProfile];

  const sizeClasses =
    size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-surface-border ${sizeClasses} font-medium`}
      title={`${label} (${config.label}) — ${config.chamber} affinity`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${config.color.replace("text-", "bg-")}`}
      />
      <span className="text-text-secondary">{label}</span>
    </span>
  );
}
