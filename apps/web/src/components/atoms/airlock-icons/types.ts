export type AirlockIconSize = "sm" | "md" | "lg" | "xl";

export const sizeMap: Record<AirlockIconSize, number> = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 48,
};

export type AnimationPreset =
  | "entrance"
  | "breathe"
  | "pulseOnHover"
  | "glowOnHover"
  | "spinOnce"
  | "activeGlow"
  | "thinkingPulse";

export type AirlockIconName =
  // Vault
  | "vault"
  // Chambers
  | "chamber-discover"
  | "chamber-build"
  | "chamber-review"
  | "chamber-ship"
  // Gates
  | "gate-verify"
  | "gate-approval"
  | "gate-density"
  | "gate-decision"
  | "gate-convergence"
  // Modules
  | "module-contracts"
  | "module-crm"
  | "module-triage"
  | "module-calendar"
  | "module-documents"
  // Otto
  | "otto"
  // Lockmark
  | "lockmark"
  // Triptych
  | "triptych-signal"
  | "triptych-orchestrate"
  | "triptych-control"
  // Archetypes
  | "archetype-driver"
  | "archetype-enforcer"
  | "archetype-interpreter";

export interface AirlockIconProps {
  name: AirlockIconName;
  size?: AirlockIconSize;
  animate?: AnimationPreset | AnimationPreset[];
  className?: string;
  active?: boolean;
}

export const animationPresets: Record<
  AnimationPreset,
  Record<string, unknown>
> = {
  entrance: {
    initial: { opacity: 0, scale: 0.85 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.35, ease: [0.175, 0.885, 0.32, 1.275] },
  },
  breathe: {
    animate: { opacity: [0.7, 1, 0.7] },
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
  },
  pulseOnHover: {
    whileHover: { scale: 1.12 },
    transition: { duration: 0.2 },
  },
  glowOnHover: {
    whileHover: { filter: "url(#glow-soft)" },
    transition: { duration: 0.25 },
  },
  spinOnce: {
    animate: { rotate: 360 },
    transition: { duration: 0.6, ease: [0, 0, 0.2, 1] },
  },
  activeGlow: {
    animate: { scale: 1.05, filter: "url(#glow-soft)" },
    transition: { duration: 0.3 },
  },
  thinkingPulse: {
    animate: { scale: [1, 1.05, 1] },
    transition: { duration: 1.2, repeat: Infinity, ease: "easeInOut" },
  },
};

/** Merge multiple animation presets into one Framer Motion props object */
export function mergePresets(
  presets: AnimationPreset | AnimationPreset[],
): Record<string, unknown> {
  const list = Array.isArray(presets) ? presets : [presets];
  return list.reduce<Record<string, unknown>>((acc, preset) => {
    const p = animationPresets[preset];
    return { ...acc, ...p };
  }, {});
}
