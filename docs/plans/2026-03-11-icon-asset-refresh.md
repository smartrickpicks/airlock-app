# Icon & Asset Refresh — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all generic icons with richer Lucide selections and 24 custom glassmorphic SVG icons with Framer Motion animations across the entire Airlock UI.

**Architecture:** AirlockIcon component system with shared SVG gradient defs provider, composable animation presets, and unified API. Custom icons for 8 domain concept groups. Comprehensive Lucide swap across 88 files.

**Tech Stack:** React, TypeScript, Framer Motion, Lucide React, inline SVG with gradient defs

**Design Doc:** `docs/plans/2026-03-11-icon-asset-refresh-design.md`

---

## Phase 1: Infrastructure (Sequential — foundation for everything else)

### Task 1: Create types and animation presets

**Files:**

- Create: `apps/web/src/components/atoms/airlock-icons/types.ts`

**Step 1: Create the types file**

```typescript
import type { Variants } from "framer-motion";

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
```

**Step 2: Verify file compiles**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add apps/web/src/components/atoms/airlock-icons/types.ts
git commit -m "feat(web): add AirlockIcon types and animation presets"
```

---

### Task 2: Create shared SVG gradient defs provider

**Files:**

- Create: `apps/web/src/components/atoms/AirlockIconDefs.tsx`

**Step 1: Create the defs component**

```tsx
"use client";

/**
 * Shared SVG gradient and filter definitions for AirlockIcon system.
 * Mount once in ShellLayout — all custom icons reference these by ID.
 */
export default function AirlockIconDefs() {
  return (
    <svg
      aria-hidden="true"
      className="absolute h-0 w-0 overflow-hidden"
      style={{ position: "absolute", width: 0, height: 0 }}
    >
      <defs>
        {/* ── Gradients ─────────────────────────────────── */}
        <linearGradient
          id="gradient-cyan-glow"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#00D1FF" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>

        <linearGradient
          id="gradient-discover"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#FF6B6B" />
        </linearGradient>

        <linearGradient id="gradient-build" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EAB308" />
          <stop offset="100%" stopColor="#FBBF24" />
        </linearGradient>

        <linearGradient
          id="gradient-review"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#C084FC" />
        </linearGradient>

        <linearGradient id="gradient-ship" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22C55E" />
          <stop offset="100%" stopColor="#4ADE80" />
        </linearGradient>

        <linearGradient id="gradient-vault" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00D1FF" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>

        <linearGradient id="gradient-glass" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.03)" />
        </linearGradient>

        {/* ── Filters ───────────────────────────────────── */}
        <filter id="glow-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feFlood floodColor="#00D1FF" floodOpacity="0.3" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="glow-discover" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feFlood floodColor="#EF4444" floodOpacity="0.3" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="glow-build" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feFlood floodColor="#EAB308" floodOpacity="0.3" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="glow-review" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feFlood floodColor="#A855F7" floodOpacity="0.3" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="glow-ship" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feFlood floodColor="#22C55E" floodOpacity="0.3" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="glass-highlight" x="0" y="0" width="100%" height="100%">
          <feSpecularLighting
            surfaceScale="2"
            specularConstant="0.6"
            specularExponent="30"
            result="specular"
          >
            <fePointLight x="50" y="-20" z="80" />
          </feSpecularLighting>
          <feComposite
            in="specular"
            in2="SourceGraphic"
            operator="in"
            result="highlight"
          />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="highlight" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
}
```

**Step 2: Mount in ShellLayout**

Modify: `apps/web/src/components/templates/ShellLayout.tsx`

Add import: `import AirlockIconDefs from "@/components/atoms/AirlockIconDefs";`

Add `<AirlockIconDefs />` as the first child inside the root `<div>`:

```tsx
return (
  <div className="flex h-screen w-screen overflow-hidden bg-surface-base">
    <AirlockIconDefs />
    <motion.div ...>
```

**Step 3: Verify compiles**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 4: Commit**

```bash
git add apps/web/src/components/atoms/AirlockIconDefs.tsx apps/web/src/components/templates/ShellLayout.tsx
git commit -m "feat(web): add shared SVG gradient defs provider"
```

---

### Task 3: Create AirlockIcon wrapper component

**Files:**

- Create: `apps/web/src/components/atoms/AirlockIcon.tsx`

**Step 1: Create the component**

```tsx
"use client";

import { motion } from "framer-motion";
import { useMotionSafe } from "@/lib/animations";
import {
  type AirlockIconProps,
  type AirlockIconName,
  sizeMap,
  mergePresets,
} from "@/components/atoms/airlock-icons/types";

/* ── Lazy-load icon map (one import per icon, code-split friendly) ────────── */
import VaultIcon from "@/components/atoms/airlock-icons/VaultIcon";
import ChamberDiscoverIcon from "@/components/atoms/airlock-icons/ChamberDiscoverIcon";
import ChamberBuildIcon from "@/components/atoms/airlock-icons/ChamberBuildIcon";
import ChamberReviewIcon from "@/components/atoms/airlock-icons/ChamberReviewIcon";
import ChamberShipIcon from "@/components/atoms/airlock-icons/ChamberShipIcon";
import GateVerifyIcon from "@/components/atoms/airlock-icons/GateVerifyIcon";
import GateApprovalIcon from "@/components/atoms/airlock-icons/GateApprovalIcon";
import GateDensityIcon from "@/components/atoms/airlock-icons/GateDensityIcon";
import GateDecisionIcon from "@/components/atoms/airlock-icons/GateDecisionIcon";
import GateConvergenceIcon from "@/components/atoms/airlock-icons/GateConvergenceIcon";
import ModuleContractsIcon from "@/components/atoms/airlock-icons/ModuleContractsIcon";
import ModuleCrmIcon from "@/components/atoms/airlock-icons/ModuleCrmIcon";
import ModuleTriageIcon from "@/components/atoms/airlock-icons/ModuleTriageIcon";
import ModuleCalendarIcon from "@/components/atoms/airlock-icons/ModuleCalendarIcon";
import ModuleDocumentsIcon from "@/components/atoms/airlock-icons/ModuleDocumentsIcon";
import OttoIcon from "@/components/atoms/airlock-icons/OttoIcon";
import LockmarkIcon from "@/components/atoms/airlock-icons/LockmarkIcon";
import TriptychSignalIcon from "@/components/atoms/airlock-icons/TriptychSignalIcon";
import TriptychOrchestrateIcon from "@/components/atoms/airlock-icons/TriptychOrchestrateIcon";
import TriptychControlIcon from "@/components/atoms/airlock-icons/TriptychControlIcon";
import ArchetypeDriverIcon from "@/components/atoms/airlock-icons/ArchetypeDriverIcon";
import ArchetypeEnforcerIcon from "@/components/atoms/airlock-icons/ArchetypeEnforcerIcon";
import ArchetypeInterpreterIcon from "@/components/atoms/airlock-icons/ArchetypeInterpreterIcon";

type IconComponent = React.ComponentType<{ size: number; className?: string }>;

const iconMap: Record<AirlockIconName, IconComponent> = {
  vault: VaultIcon,
  "chamber-discover": ChamberDiscoverIcon,
  "chamber-build": ChamberBuildIcon,
  "chamber-review": ChamberReviewIcon,
  "chamber-ship": ChamberShipIcon,
  "gate-verify": GateVerifyIcon,
  "gate-approval": GateApprovalIcon,
  "gate-density": GateDensityIcon,
  "gate-decision": GateDecisionIcon,
  "gate-convergence": GateConvergenceIcon,
  "module-contracts": ModuleContractsIcon,
  "module-crm": ModuleCrmIcon,
  "module-triage": ModuleTriageIcon,
  "module-calendar": ModuleCalendarIcon,
  "module-documents": ModuleDocumentsIcon,
  otto: OttoIcon,
  lockmark: LockmarkIcon,
  "triptych-signal": TriptychSignalIcon,
  "triptych-orchestrate": TriptychOrchestrateIcon,
  "triptych-control": TriptychControlIcon,
  "archetype-driver": ArchetypeDriverIcon,
  "archetype-enforcer": ArchetypeEnforcerIcon,
  "archetype-interpreter": ArchetypeInterpreterIcon,
};

export default function AirlockIcon({
  name,
  size = "md",
  animate,
  className,
}: AirlockIconProps) {
  const IconSvg = iconMap[name];
  const pixelSize = sizeMap[size];
  const motionProps = useMotionSafe(animate ? mergePresets(animate) : {});

  return (
    <motion.div
      className={`inline-flex items-center justify-center ${className ?? ""}`}
      style={{ width: pixelSize, height: pixelSize }}
      {...motionProps}
    >
      <IconSvg size={pixelSize} className={className} />
    </motion.div>
  );
}
```

**Step 2: Create barrel export**

Create: `apps/web/src/components/atoms/airlock-icons/index.ts`

```typescript
export { default as AirlockIcon } from "../AirlockIcon";
export { default as AirlockIconDefs } from "../AirlockIconDefs";
export * from "./types";
```

**NOTE:** This task will have compile errors until the 24 icon components exist. That's expected — Tasks 4-11 create them. The plan is structured so Task 3 is committed as a WIP, then Tasks 4-11 fill in the icons, and it all compiles after Task 11.

**Step 3: Commit (WIP)**

```bash
git add apps/web/src/components/atoms/AirlockIcon.tsx apps/web/src/components/atoms/airlock-icons/index.ts
git commit -m "feat(web): add AirlockIcon wrapper component (WIP — icons pending)"
```

---

## Phase 2: Custom Glassmorphic Icons (Parallelizable — all independent)

Each icon component follows this pattern:

- Functional React component accepting `{ size, className }`
- SVG viewBox `0 0 24 24` (matches Lucide's viewBox)
- 1.5px stroke weight on structural paths
- Gradient fills reference shared defs via `url(#gradient-id)`
- Glass overlay via `url(#gradient-glass)` on a clipped rect
- Export default

### Task 4: Vault icon

**Files:**

- Create: `apps/web/src/components/atoms/airlock-icons/VaultIcon.tsx`

**Step 1: Create the icon**

```tsx
interface Props {
  size: number;
  className?: string;
}

export default function VaultIcon({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Hexagonal vault container */}
      <path
        d="M12 2L21 7V17L12 22L3 17V7L12 2Z"
        stroke="url(#gradient-vault)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="url(#gradient-vault)"
        fillOpacity="0.08"
      />
      {/* Glass overlay */}
      <path
        d="M12 2L21 7V17L12 22L3 17V7L12 2Z"
        fill="url(#gradient-glass)"
        fillOpacity="0.5"
      />
      {/* Keyhole */}
      <circle
        cx="12"
        cy="10"
        r="2.5"
        stroke="url(#gradient-vault)"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M12 12.5V16"
        stroke="url(#gradient-vault)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/atoms/airlock-icons/VaultIcon.tsx
git commit -m "feat(web): add Vault glassmorphic icon"
```

---

### Task 5: Chamber icons (4 icons)

**Files:**

- Create: `apps/web/src/components/atoms/airlock-icons/ChamberDiscoverIcon.tsx`
- Create: `apps/web/src/components/atoms/airlock-icons/ChamberBuildIcon.tsx`
- Create: `apps/web/src/components/atoms/airlock-icons/ChamberReviewIcon.tsx`
- Create: `apps/web/src/components/atoms/airlock-icons/ChamberShipIcon.tsx`

**Step 1: Create ChamberDiscoverIcon (radar sweep)**

```tsx
interface Props {
  size: number;
  className?: string;
}

export default function ChamberDiscoverIcon({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      {/* Outer ring */}
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="url(#gradient-discover)"
        strokeWidth="1.5"
        strokeOpacity="0.3"
      />
      {/* Mid ring */}
      <circle
        cx="12"
        cy="12"
        r="6.5"
        stroke="url(#gradient-discover)"
        strokeWidth="1.5"
        strokeOpacity="0.5"
      />
      {/* Inner ring */}
      <circle
        cx="12"
        cy="12"
        r="3"
        stroke="url(#gradient-discover)"
        strokeWidth="1.5"
        strokeOpacity="0.7"
      />
      {/* Center dot */}
      <circle cx="12" cy="12" r="1.5" fill="url(#gradient-discover)" />
      {/* Scanning beam */}
      <path
        d="M12 12L18 4"
        stroke="url(#gradient-discover)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Glass */}
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="url(#gradient-glass)"
        fillOpacity="0.3"
      />
    </svg>
  );
}
```

**Step 2: Create ChamberBuildIcon (forge anvil with sparks)**

```tsx
interface Props {
  size: number;
  className?: string;
}

export default function ChamberBuildIcon({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      {/* Anvil body */}
      <path
        d="M5 16H19L21 20H3L5 16Z"
        stroke="url(#gradient-build)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="url(#gradient-build)"
        fillOpacity="0.08"
      />
      {/* Anvil top */}
      <path
        d="M7 16V13C7 12 8 11 10 11H14C16 11 17 12 17 13V16"
        stroke="url(#gradient-build)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Hammer */}
      <path
        d="M12 11V6"
        stroke="url(#gradient-build)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <rect
        x="9"
        y="3"
        width="6"
        height="3"
        rx="1"
        stroke="url(#gradient-build)"
        strokeWidth="1.5"
        fill="url(#gradient-build)"
        fillOpacity="0.15"
      />
      {/* Sparks */}
      <circle cx="7" cy="8" r="0.8" fill="url(#gradient-build)" />
      <circle cx="17" cy="7" r="0.6" fill="url(#gradient-build)" />
      <circle
        cx="5"
        cy="6"
        r="0.5"
        fill="url(#gradient-build)"
        fillOpacity="0.6"
      />
      {/* Glass */}
      <path
        d="M5 16H19L21 20H3L5 16Z"
        fill="url(#gradient-glass)"
        fillOpacity="0.3"
      />
    </svg>
  );
}
```

**Step 3: Create ChamberReviewIcon (eye with shield iris)**

```tsx
interface Props {
  size: number;
  className?: string;
}

export default function ChamberReviewIcon({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      {/* Eye outline */}
      <path
        d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z"
        stroke="url(#gradient-review)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="url(#gradient-review)"
        fillOpacity="0.05"
      />
      {/* Shield iris */}
      <path
        d="M12 8L15.5 10V13.5C15.5 15 14 16.5 12 17C10 16.5 8.5 15 8.5 13.5V10L12 8Z"
        stroke="url(#gradient-review)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="url(#gradient-review)"
        fillOpacity="0.15"
      />
      {/* Pupil */}
      <circle cx="12" cy="12.5" r="1.5" fill="url(#gradient-review)" />
      {/* Glass */}
      <path
        d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z"
        fill="url(#gradient-glass)"
        fillOpacity="0.3"
      />
    </svg>
  );
}
```

**Step 4: Create ChamberShipIcon (launch vector)**

```tsx
interface Props {
  size: number;
  className?: string;
}

export default function ChamberShipIcon({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      {/* Arrow body */}
      <path
        d="M12 3L17 10H14V18H10V10H7L12 3Z"
        stroke="url(#gradient-ship)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="url(#gradient-ship)"
        fillOpacity="0.1"
      />
      {/* Thrust trail left */}
      <path
        d="M9 18C9 18 8 21 7 22"
        stroke="url(#gradient-ship)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.5"
      />
      {/* Thrust trail right */}
      <path
        d="M15 18C15 18 16 21 17 22"
        stroke="url(#gradient-ship)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.5"
      />
      {/* Thrust trail center */}
      <path
        d="M12 18V22"
        stroke="url(#gradient-ship)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.3"
      />
      {/* Glass */}
      <path
        d="M12 3L17 10H14V18H10V10H7L12 3Z"
        fill="url(#gradient-glass)"
        fillOpacity="0.3"
      />
    </svg>
  );
}
```

**Step 5: Commit**

```bash
git add apps/web/src/components/atoms/airlock-icons/Chamber*.tsx
git commit -m "feat(web): add Chamber glassmorphic icons (Discover/Build/Review/Ship)"
```

---

### Task 6: Gate icons (5 icons)

**Files:**

- Create: `apps/web/src/components/atoms/airlock-icons/GateVerifyIcon.tsx`
- Create: `apps/web/src/components/atoms/airlock-icons/GateApprovalIcon.tsx`
- Create: `apps/web/src/components/atoms/airlock-icons/GateDensityIcon.tsx`
- Create: `apps/web/src/components/atoms/airlock-icons/GateDecisionIcon.tsx`
- Create: `apps/web/src/components/atoms/airlock-icons/GateConvergenceIcon.tsx`

**Step 1: Create GateVerifyIcon (lock with checkmark)**

```tsx
interface Props {
  size: number;
  className?: string;
}

export default function GateVerifyIcon({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <rect
        x="5"
        y="10"
        width="14"
        height="10"
        rx="2"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.06"
      />
      <path
        d="M8 10V7C8 4.79 9.79 3 12 3C14.21 3 16 4.79 16 7V10"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10 15L11.5 16.5L14.5 13.5"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="5"
        y="10"
        width="14"
        height="10"
        rx="2"
        fill="url(#gradient-glass)"
        fillOpacity="0.3"
      />
    </svg>
  );
}
```

**Step 2: Create GateApprovalIcon (stamp with radiating lines)**

```tsx
interface Props {
  size: number;
  className?: string;
}

export default function GateApprovalIcon({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <circle
        cx="12"
        cy="12"
        r="7"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.06"
      />
      <circle
        cx="12"
        cy="12"
        r="4"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.1"
      />
      <path
        d="M10 12L11.5 13.5L14 10.5"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Radiating lines */}
      <path
        d="M12 2V4"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.4"
      />
      <path
        d="M12 20V22"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.4"
      />
      <path
        d="M2 12H4"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.4"
      />
      <path
        d="M20 12H22"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.4"
      />
      <circle
        cx="12"
        cy="12"
        r="7"
        fill="url(#gradient-glass)"
        fillOpacity="0.3"
      />
    </svg>
  );
}
```

**Step 3: Create GateDensityIcon (data bars with threshold)**

```tsx
interface Props {
  size: number;
  className?: string;
}

export default function GateDensityIcon({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <rect
        x="4"
        y="14"
        width="3"
        height="7"
        rx="1"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.15"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
      />
      <rect
        x="10.5"
        y="8"
        width="3"
        height="13"
        rx="1"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.15"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
      />
      <rect
        x="17"
        y="4"
        width="3"
        height="17"
        rx="1"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.15"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
      />
      {/* Threshold line */}
      <path
        d="M2 11H22"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeDasharray="2 2"
        strokeOpacity="0.5"
      />
    </svg>
  );
}
```

**Step 4: Create GateDecisionIcon (diamond fork)**

```tsx
interface Props {
  size: number;
  className?: string;
}

export default function GateDecisionIcon({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M12 3L19 12L12 21L5 12L12 3Z"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.06"
      />
      {/* Diverging paths */}
      <path
        d="M12 12L7 17"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.6"
      />
      <path
        d="M12 12L17 17"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.6"
      />
      <path
        d="M12 6V12"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="1.5" fill="url(#gradient-cyan-glow)" />
      <path
        d="M12 3L19 12L12 21L5 12L12 3Z"
        fill="url(#gradient-glass)"
        fillOpacity="0.3"
      />
    </svg>
  );
}
```

**Step 5: Create GateConvergenceIcon (paths merging)**

```tsx
interface Props {
  size: number;
  className?: string;
}

export default function GateConvergenceIcon({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      {/* Converging paths */}
      <path
        d="M4 4L12 14"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M20 4L12 14"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M4 10L12 14"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.5"
      />
      <path
        d="M20 10L12 14"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.5"
      />
      {/* Convergence point */}
      <circle
        cx="12"
        cy="14"
        r="2.5"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.15"
      />
      {/* Output */}
      <path
        d="M12 16.5V21"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle
        cx="12"
        cy="14"
        r="2.5"
        fill="url(#gradient-glass)"
        fillOpacity="0.3"
      />
    </svg>
  );
}
```

**Step 6: Commit**

```bash
git add apps/web/src/components/atoms/airlock-icons/Gate*.tsx
git commit -m "feat(web): add Gate glassmorphic icons (Verify/Approval/Density/Decision/Convergence)"
```

---

### Task 7: Module icons (5 icons)

**Files:**

- Create: `apps/web/src/components/atoms/airlock-icons/ModuleContractsIcon.tsx`
- Create: `apps/web/src/components/atoms/airlock-icons/ModuleCrmIcon.tsx`
- Create: `apps/web/src/components/atoms/airlock-icons/ModuleTriageIcon.tsx`
- Create: `apps/web/src/components/atoms/airlock-icons/ModuleCalendarIcon.tsx`
- Create: `apps/web/src/components/atoms/airlock-icons/ModuleDocumentsIcon.tsx`

**Step 1: Create ModuleContractsIcon (scroll with seal)**

```tsx
interface Props {
  size: number;
  className?: string;
}

export default function ModuleContractsIcon({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      {/* Scroll body */}
      <path
        d="M7 3C5.9 3 5 3.9 5 5V19C5 20.1 5.9 21 7 21H17C18.1 21 19 20.1 19 19V8L14 3H7Z"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.06"
      />
      <path
        d="M14 3V8H19"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Seal */}
      <circle
        cx="12"
        cy="15"
        r="2.5"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.15"
      />
      <circle cx="12" cy="15" r="1" fill="url(#gradient-cyan-glow)" />
      {/* Text lines */}
      <path
        d="M8 11H13"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1"
        strokeLinecap="round"
        strokeOpacity="0.4"
      />
      <path
        d="M8 13H11"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1"
        strokeLinecap="round"
        strokeOpacity="0.3"
      />
      {/* Glass */}
      <path
        d="M7 3C5.9 3 5 3.9 5 5V19C5 20.1 5.9 21 7 21H17C18.1 21 19 20.1 19 19V8L14 3H7Z"
        fill="url(#gradient-glass)"
        fillOpacity="0.3"
      />
    </svg>
  );
}
```

**Step 2: Create ModuleCrmIcon (network graph)**

```tsx
interface Props {
  size: number;
  className?: string;
}

export default function ModuleCrmIcon({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      {/* Connections */}
      <path
        d="M12 8L6 14"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeOpacity="0.4"
      />
      <path
        d="M12 8L18 14"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeOpacity="0.4"
      />
      <path
        d="M12 8L12 18"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeOpacity="0.4"
      />
      <path
        d="M6 14L12 18"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeOpacity="0.3"
      />
      <path
        d="M18 14L12 18"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeOpacity="0.3"
      />
      {/* Nodes */}
      <circle
        cx="12"
        cy="6"
        r="3"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.12"
      />
      <circle
        cx="6"
        cy="14"
        r="2.5"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.08"
      />
      <circle
        cx="18"
        cy="14"
        r="2.5"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.08"
      />
      <circle
        cx="12"
        cy="19"
        r="2"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.08"
      />
      {/* Center node glow */}
      <circle cx="12" cy="6" r="1.2" fill="url(#gradient-cyan-glow)" />
    </svg>
  );
}
```

**Step 3: Create ModuleTriageIcon (signal tower with waves)**

```tsx
interface Props {
  size: number;
  className?: string;
}

export default function ModuleTriageIcon({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      {/* Tower */}
      <path
        d="M10 21H14L13 12H11L10 21Z"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.06"
      />
      <rect
        x="10"
        y="9"
        width="4"
        height="3"
        rx="0.5"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.1"
      />
      {/* Antenna */}
      <path
        d="M12 9V5"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="4" r="1" fill="url(#gradient-cyan-glow)" />
      {/* Radiating waves */}
      <path
        d="M8 7C8 7 9.5 5 12 5C14.5 5 16 7 16 7"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.6"
        fill="none"
      />
      <path
        d="M5.5 5C5.5 5 7.5 2 12 2C16.5 2 18.5 5 18.5 5"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.3"
        fill="none"
      />
      {/* Glass */}
      <path
        d="M10 21H14L13 12H11L10 21Z"
        fill="url(#gradient-glass)"
        fillOpacity="0.3"
      />
    </svg>
  );
}
```

**Step 4: Create ModuleCalendarIcon (clock with orbital ring)**

```tsx
interface Props {
  size: number;
  className?: string;
}

export default function ModuleCalendarIcon({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      {/* Clock face */}
      <circle
        cx="12"
        cy="12"
        r="8"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.06"
      />
      {/* Hour hand */}
      <path
        d="M12 8V12L14.5 14"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Center dot */}
      <circle cx="12" cy="12" r="1" fill="url(#gradient-cyan-glow)" />
      {/* Orbital ring */}
      <ellipse
        cx="12"
        cy="12"
        rx="11"
        ry="4"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1"
        strokeOpacity="0.25"
        strokeDasharray="3 2"
        transform="rotate(-30 12 12)"
      />
      {/* Orbit dot */}
      <circle
        cx="21"
        cy="8"
        r="1.5"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.6"
      />
      {/* Glass */}
      <circle
        cx="12"
        cy="12"
        r="8"
        fill="url(#gradient-glass)"
        fillOpacity="0.3"
      />
    </svg>
  );
}
```

**Step 5: Create ModuleDocumentsIcon (layered pages)**

```tsx
interface Props {
  size: number;
  className?: string;
}

export default function ModuleDocumentsIcon({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      {/* Back page */}
      <rect
        x="6"
        y="2"
        width="14"
        height="18"
        rx="2"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeOpacity="0.3"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.03"
      />
      {/* Middle page */}
      <rect
        x="5"
        y="3.5"
        width="14"
        height="18"
        rx="2"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeOpacity="0.5"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.05"
      />
      {/* Front page */}
      <rect
        x="4"
        y="5"
        width="14"
        height="18"
        rx="2"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.08"
      />
      {/* Text lines */}
      <path
        d="M7 10H15"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1"
        strokeLinecap="round"
        strokeOpacity="0.4"
      />
      <path
        d="M7 13H13"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1"
        strokeLinecap="round"
        strokeOpacity="0.3"
      />
      <path
        d="M7 16H11"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1"
        strokeLinecap="round"
        strokeOpacity="0.2"
      />
      {/* Glass */}
      <rect
        x="4"
        y="5"
        width="14"
        height="18"
        rx="2"
        fill="url(#gradient-glass)"
        fillOpacity="0.3"
      />
    </svg>
  );
}
```

**Step 6: Commit**

```bash
git add apps/web/src/components/atoms/airlock-icons/Module*.tsx
git commit -m "feat(web): add Module glassmorphic icons (Contracts/CRM/Triage/Calendar/Documents)"
```

---

### Task 8: Otto and Lockmark icons

**Files:**

- Create: `apps/web/src/components/atoms/airlock-icons/OttoIcon.tsx`
- Create: `apps/web/src/components/atoms/airlock-icons/LockmarkIcon.tsx`

**Step 1: Create OttoIcon (geometric face in rounded hex)**

```tsx
interface Props {
  size: number;
  className?: string;
}

export default function OttoIcon({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      {/* Rounded hex container */}
      <path
        d="M12 2.5L20 7.25V16.75L12 21.5L4 16.75V7.25L12 2.5Z"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.06"
      />
      {/* Eyes */}
      <circle cx="9" cy="11" r="1.5" fill="url(#gradient-cyan-glow)" />
      <circle cx="15" cy="11" r="1.5" fill="url(#gradient-cyan-glow)" />
      {/* Mouth arc */}
      <path
        d="M9.5 15C9.5 15 10.5 16.5 12 16.5C13.5 16.5 14.5 15 14.5 15"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Glass */}
      <path
        d="M12 2.5L20 7.25V16.75L12 21.5L4 16.75V7.25L12 2.5Z"
        fill="url(#gradient-glass)"
        fillOpacity="0.3"
      />
    </svg>
  );
}
```

**Step 2: Create LockmarkIcon (optimized brand SVG)**

Read the existing lockmark SVG first: `public/assets/airlock-lockmark.svg`

Then create the component version:

```tsx
interface Props {
  size: number;
  className?: string;
}

export default function LockmarkIcon({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      {/* Outer circle */}
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.04"
      />
      {/* Lock body */}
      <rect
        x="8"
        y="11"
        width="8"
        height="7"
        rx="1.5"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.1"
      />
      {/* Lock shackle */}
      <path
        d="M9.5 11V8.5C9.5 7.12 10.62 6 12 6C13.38 6 14.5 7.12 14.5 8.5V11"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Keyhole */}
      <circle cx="12" cy="14" r="1" fill="url(#gradient-cyan-glow)" />
      <path
        d="M12 15V16.5"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Glass */}
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="url(#gradient-glass)"
        fillOpacity="0.3"
      />
    </svg>
  );
}
```

**Step 3: Commit**

```bash
git add apps/web/src/components/atoms/airlock-icons/OttoIcon.tsx apps/web/src/components/atoms/airlock-icons/LockmarkIcon.tsx
git commit -m "feat(web): add Otto and Lockmark glassmorphic icons"
```

---

### Task 9: Triptych panel icons (3 icons)

**Files:**

- Create: `apps/web/src/components/atoms/airlock-icons/TriptychSignalIcon.tsx`
- Create: `apps/web/src/components/atoms/airlock-icons/TriptychOrchestrateIcon.tsx`
- Create: `apps/web/src/components/atoms/airlock-icons/TriptychControlIcon.tsx`

**Step 1: Create TriptychSignalIcon (lightning in circle)**

```tsx
interface Props {
  size: number;
  className?: string;
}

export default function TriptychSignalIcon({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.06"
      />
      <path
        d="M13 5L9 13H12L11 19L15 11H12L13 5Z"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.15"
      />
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="url(#gradient-glass)"
        fillOpacity="0.3"
      />
    </svg>
  );
}
```

**Step 2: Create TriptychOrchestrateIcon (gear mesh with lines)**

```tsx
interface Props {
  size: number;
  className?: string;
}

export default function TriptychOrchestrateIcon({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      {/* Main gear */}
      <circle
        cx="10"
        cy="10"
        r="4"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.06"
      />
      <circle cx="10" cy="10" r="1.5" fill="url(#gradient-cyan-glow)" />
      {/* Gear teeth (main) */}
      <path
        d="M10 5.5V4"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10 16V14.5"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M5.5 10H4"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M16 10H14.5"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Secondary gear */}
      <circle
        cx="17"
        cy="16"
        r="3"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeOpacity="0.6"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.04"
      />
      <circle
        cx="17"
        cy="16"
        r="1"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.6"
      />
      {/* Connection line */}
      <path
        d="M13 13L14.5 14.5"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1"
        strokeOpacity="0.4"
        strokeDasharray="2 1"
      />
      <circle
        cx="10"
        cy="10"
        r="4"
        fill="url(#gradient-glass)"
        fillOpacity="0.3"
      />
    </svg>
  );
}
```

**Step 3: Create TriptychControlIcon (sliders dashboard)**

```tsx
interface Props {
  size: number;
  className?: string;
}

export default function TriptychControlIcon({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      {/* Slider tracks */}
      <path
        d="M6 4V20"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.3"
      />
      <path
        d="M12 4V20"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.3"
      />
      <path
        d="M18 4V20"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.3"
      />
      {/* Slider handles */}
      <rect
        x="4"
        y="8"
        width="4"
        height="3"
        rx="1.5"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.15"
      />
      <rect
        x="10"
        y="14"
        width="4"
        height="3"
        rx="1.5"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.15"
      />
      <rect
        x="16"
        y="6"
        width="4"
        height="3"
        rx="1.5"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.15"
      />
      {/* Active portions */}
      <path
        d="M6 11V20"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12 17V20"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M18 9V20"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
```

**Step 4: Commit**

```bash
git add apps/web/src/components/atoms/airlock-icons/Triptych*.tsx
git commit -m "feat(web): add Triptych glassmorphic icons (Signal/Orchestrate/Control)"
```

---

### Task 10: Archetype icons (3 icons)

**Files:**

- Create: `apps/web/src/components/atoms/airlock-icons/ArchetypeDriverIcon.tsx`
- Create: `apps/web/src/components/atoms/airlock-icons/ArchetypeEnforcerIcon.tsx`
- Create: `apps/web/src/components/atoms/airlock-icons/ArchetypeInterpreterIcon.tsx`

**Step 1: Create ArchetypeDriverIcon (bolt with motion trails)**

```tsx
interface Props {
  size: number;
  className?: string;
}

export default function ArchetypeDriverIcon({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      {/* Lightning bolt */}
      <path
        d="M13 2L4 14H11L10 22L20 10H13L13 2Z"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.1"
      />
      {/* Motion trails */}
      <path
        d="M2 8H6"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1"
        strokeLinecap="round"
        strokeOpacity="0.3"
      />
      <path
        d="M1 12H5"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1"
        strokeLinecap="round"
        strokeOpacity="0.2"
      />
      <path
        d="M3 16H6"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1"
        strokeLinecap="round"
        strokeOpacity="0.15"
      />
      {/* Glass */}
      <path
        d="M13 2L4 14H11L10 22L20 10H13L13 2Z"
        fill="url(#gradient-glass)"
        fillOpacity="0.3"
      />
    </svg>
  );
}
```

**Step 2: Create ArchetypeEnforcerIcon (shield with scan line)**

```tsx
interface Props {
  size: number;
  className?: string;
}

export default function ArchetypeEnforcerIcon({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      {/* Shield */}
      <path
        d="M12 3L20 7V13C20 17.4 16.4 20.5 12 22C7.6 20.5 4 17.4 4 13V7L12 3Z"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.06"
      />
      {/* Scan line */}
      <path
        d="M6 12H18"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.6"
      />
      {/* Scan beam */}
      <path
        d="M6 12H18"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeOpacity="0.08"
      />
      {/* Lock indicator */}
      <circle
        cx="12"
        cy="12"
        r="2"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.15"
      />
      {/* Glass */}
      <path
        d="M12 3L20 7V13C20 17.4 16.4 20.5 12 22C7.6 20.5 4 17.4 4 13V7L12 3Z"
        fill="url(#gradient-glass)"
        fillOpacity="0.3"
      />
    </svg>
  );
}
```

**Step 3: Create ArchetypeInterpreterIcon (compass rose with data streams)**

```tsx
interface Props {
  size: number;
  className?: string;
}

export default function ArchetypeInterpreterIcon({ size, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      {/* Compass circle */}
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.06"
      />
      {/* Compass rose */}
      <path
        d="M12 3V7"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12 17V21"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M3 12H7"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M17 12H21"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Diamond pointer */}
      <path
        d="M12 8L14.5 12L12 16L9.5 12L12 8Z"
        stroke="url(#gradient-cyan-glow)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.15"
      />
      {/* Data stream dots */}
      <circle
        cx="5.5"
        cy="5.5"
        r="0.8"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.4"
      />
      <circle
        cx="18.5"
        cy="5.5"
        r="0.8"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.4"
      />
      <circle
        cx="5.5"
        cy="18.5"
        r="0.8"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.4"
      />
      <circle
        cx="18.5"
        cy="18.5"
        r="0.8"
        fill="url(#gradient-cyan-glow)"
        fillOpacity="0.4"
      />
      {/* Glass */}
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="url(#gradient-glass)"
        fillOpacity="0.3"
      />
    </svg>
  );
}
```

**Step 4: Commit**

```bash
git add apps/web/src/components/atoms/airlock-icons/Archetype*.tsx
git commit -m "feat(web): add Archetype glassmorphic icons (Driver/Enforcer/Interpreter)"
```

---

### Task 11: Verify Phase 2 compiles

**Step 1: Run type check**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && cd apps/web && pnpm type-check`

**Step 2: Fix any type errors**

**Step 3: Commit fixes if any**

```bash
git add -A apps/web/src/components/atoms/airlock-icons/
git commit -m "fix(web): resolve type errors in AirlockIcon system"
```

---

## Phase 3: Lucide Icon Swaps (Parallelizable — grouped by domain)

Each task swaps icons in a group of related files. Pattern:

1. Update imports (old icon → new icon)
2. Replace usage in JSX
3. Verify no type errors
4. Commit

### Task 12: Swap navigation & chrome icons

**Files to modify:**

- `apps/web/src/components/organisms/ModuleBar.tsx` — Settings→SlidersHorizontal, LogOut→DoorOpen
- `apps/web/src/components/organisms/SubPanel.tsx` — Settings→SlidersHorizontal if used

**Step 1: Update imports and usages**

In ModuleBar.tsx, change:

```typescript
// Old
import {
  FileText,
  Users,
  CheckSquare,
  Calendar,
  FolderOpen,
  Settings,
  LogOut,
} from "lucide-react";
// New (modules will be replaced by AirlockIcon in Phase 4, but swap Settings/LogOut now)
import {
  FileText,
  Users,
  CheckSquare,
  Calendar,
  FolderOpen,
  SlidersHorizontal,
  DoorOpen,
} from "lucide-react";
```

Replace all `Settings` usages with `SlidersHorizontal`, `LogOut` with `DoorOpen`.

**Step 2: Verify compiles**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add apps/web/src/components/organisms/ModuleBar.tsx apps/web/src/components/organisms/SubPanel.tsx
git commit -m "refactor(web): swap navigation icons (Settings→SlidersHorizontal, LogOut→DoorOpen)"
```

---

### Task 13: Swap status & state icons

**Files to modify (all files using CheckCircle, XCircle, AlertCircle, AlertTriangle, Circle, Loader2, Clock, Lock):**

- `apps/web/src/components/molecules/PatchActions.tsx`
- `apps/web/src/app/(shell)/(modules)/contracts/patch/page.tsx`
- `apps/web/src/app/(shell)/admin/data-source/page.tsx`
- `apps/web/src/app/(shell)/admin/ai-provider/page.tsx`
- `apps/web/src/components/molecules/AdminOnboardingChecklist.tsx`
- `apps/web/src/components/molecules/OnboardingChecklist.tsx`
- `apps/web/src/components/molecules/DAGNode.tsx`
- `apps/web/src/components/organisms/gates/ApprovalGate.tsx`
- `apps/web/src/components/organisms/gates/VerificationGate.tsx`
- `apps/web/src/components/organisms/gates/QualityGate.tsx`
- `apps/web/src/components/organisms/gates/ConvergenceGate.tsx`
- `apps/web/src/components/organisms/CapabilityNode.tsx`
- `apps/web/src/components/organisms/ForgePreview.tsx`

**Swap map:**

- `CheckCircle` → `CircleCheckBig`
- `CheckCircle2` → `CircleCheckBig`
- `XCircle` → `CircleX`
- `AlertCircle` → `TriangleAlert`
- `AlertTriangle` → `OctagonAlert`
- `Circle` → `CircleDashed`
- `Loader2` → `LoaderCircle`
- `Clock` → `Timer`
- `Lock` (non-gate context) → `ShieldBan`

**Step 1: Update each file's imports and usages**

For each file, update the import line and all JSX references.

**Step 2: Verify compiles**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add apps/web/src/components/molecules/PatchActions.tsx apps/web/src/app/ apps/web/src/components/molecules/AdminOnboardingChecklist.tsx apps/web/src/components/molecules/OnboardingChecklist.tsx apps/web/src/components/molecules/DAGNode.tsx apps/web/src/components/organisms/gates/ apps/web/src/components/organisms/CapabilityNode.tsx apps/web/src/components/organisms/ForgePreview.tsx
git commit -m "refactor(web): swap status icons (CircleCheckBig, CircleX, TriangleAlert, etc.)"
```

---

### Task 14: Swap action icons

**Files to modify:**

- `apps/web/src/components/molecules/PatchActions.tsx` — Send→SendHorizonal
- `apps/web/src/app/(shell)/(modules)/contracts/patch/page.tsx` — Send→SendHorizonal
- `apps/web/src/components/organisms/ForgeChat.tsx` — Send→SendHorizonal
- `apps/web/src/app/(shell)/(modules)/documents/library/page.tsx` — Pencil→PenLine, Trash2→Eraser, LayoutGrid→LayoutDashboard, Table2→TableProperties
- `apps/web/src/components/organisms/WorkflowList.tsx` — Pencil→PenLine, Play→CirclePlay, Pause→CirclePause
- `apps/web/src/components/molecules/VaultContextMenu.tsx` — Archive→ArchiveRestore, Link2→ClipboardCopy
- `apps/web/src/app/(shell)/admin/data-source/page.tsx` — Upload→CloudUpload

**Swap map:**

- `Send` → `SendHorizonal`
- `Pencil` → `PenLine`
- `Trash2` → `Eraser`
- `Upload` → `CloudUpload`
- `Archive` → `ArchiveRestore`
- `Play` → `CirclePlay`
- `Pause` → `CirclePause`
- `Link2` → `ClipboardCopy`
- `LayoutGrid` → `LayoutDashboard`
- `Table2` → `TableProperties`
- `LayoutList` → `Rows3`

**Step 1: Update each file**

**Step 2: Verify compiles**

**Step 3: Commit**

```bash
git commit -m "refactor(web): swap action icons (SendHorizonal, PenLine, CloudUpload, etc.)"
```

---

### Task 15: Swap data, content, AI, and collaboration icons

**Files to modify:**

- `apps/web/src/components/molecules/ModuleToggle.tsx` — FileText→FileStack, File→FileBadge
- `apps/web/src/app/onboarding/setup/page.tsx` — FileText→FileStack, FolderOpen→FolderTree, Cpu→Microchip, Key→KeyRound
- `apps/web/src/components/organisms/SubPanel.tsx` — FolderOpen→FolderTree, Users→UsersRound, User→UserRound, Database→DatabaseZap, Server→ServerCog, Plug→Cable, Radio→Podcast, Flag→ToggleLeft, Building2→Landmark, Brain→BrainCircuit
- `apps/web/src/lib/mock-capability-tree.ts` — same swaps as SubPanel (shared capability icons)
- `apps/web/src/components/organisms/ForgeChat.tsx` — Bot→custom (Phase 4), User→UserRound
- `apps/web/src/app/(shell)/page.tsx` — FolderOpen→FolderTree, MessageSquare→MessageSquareText, BellRing→BellDot
- `apps/web/src/app/(shell)/admin/otto/page.tsx` — Bot→custom (Phase 4), Brain→BrainCircuit, Eye→ScanEye, MessageSquare→MessageSquareText
- `apps/web/src/components/organisms/WelcomeModal.tsx` — update icon map entries
- `apps/web/src/app/page.tsx` — update landing feature icons

**Step 1: Update each file**

**Step 2: Verify compiles**

**Step 3: Commit**

```bash
git commit -m "refactor(web): swap data/AI/collab icons (FileStack, BrainCircuit, UsersRound, etc.)"
```

---

### Task 16: Swap admin & infrastructure icons

**Files to modify:**

- `apps/web/src/components/organisms/SubPanel.tsx` — remaining infrastructure icons
- `apps/web/src/lib/mock-capability-tree.ts` — remaining infrastructure icons
- `apps/web/src/components/organisms/gates/DecisionGate.tsx` — Star→Sparkle

**Step 1: Update remaining icons not covered in Task 15**

**Step 2: Verify compiles**

**Step 3: Commit**

```bash
git commit -m "refactor(web): swap admin/infra icons (ServerCog, DatabaseZap, Cable, etc.)"
```

---

## Phase 4: Integration — Replace Domain Icons with AirlockIcon (Sequential)

### Task 17: Replace module navigation with AirlockIcon

**Files to modify:**

- `apps/web/src/components/organisms/ModuleBar.tsx`
- `apps/web/src/components/molecules/ModuleToggle.tsx`
- `apps/web/src/components/molecules/ModuleIcon.tsx`

**Step 1: Update ModuleBar to use AirlockIcon for modules**

Replace the module icon constants to use AirlockIcon instead of Lucide.

Add import: `import AirlockIcon from "@/components/atoms/AirlockIcon";`

Replace module icon rendering:

```tsx
// Old
<FileText size={18} />

// New
<AirlockIcon name="module-contracts" size="md" animate={isActive ? ["entrance", "activeGlow"] : "pulseOnHover"} />
```

**Step 2: Replace lockmark PNG with AirlockIcon**

```tsx
// Old
<img src="/assets/padlock_no_bg.png" alt="Airlock" width={90} height={90} />

// New
<AirlockIcon name="lockmark" size="xl" animate={["entrance", "pulseOnHover"]} />
```

**Step 3: Verify compiles and commit**

```bash
git commit -m "feat(web): integrate AirlockIcon into ModuleBar navigation"
```

---

### Task 18: Replace chamber stepper with AirlockIcon

**Files to modify:**

- `apps/web/src/components/organisms/ChamberStepper.tsx`

**Step 1: Replace chamber icon map**

```tsx
// Old
const CHAMBER_ICONS = {
  discover: Search,
  build: Hammer,
  review: ShieldCheck,
  ship: Rocket,
};

// New
const CHAMBER_NAMES: Record<string, AirlockIconName> = {
  discover: "chamber-discover",
  build: "chamber-build",
  review: "chamber-review",
  ship: "chamber-ship",
};
```

Add animation logic:

- Current chamber: `animate={["entrance", "breathe", "activeGlow"]}`
- Past chambers: `animate="entrance"` with full opacity
- Future chambers: `animate="entrance"` with 30% opacity

**Step 2: Verify and commit**

```bash
git commit -m "feat(web): integrate AirlockIcon into ChamberStepper"
```

---

### Task 19: Replace gate icons with AirlockIcon

**Files to modify:**

- `apps/web/src/components/molecules/GateCard.tsx`
- `apps/web/src/components/molecules/DAGNode.tsx`
- `apps/web/src/components/organisms/gates/VerificationGate.tsx`
- `apps/web/src/components/organisms/gates/ApprovalGate.tsx`
- `apps/web/src/components/organisms/gates/QualityGate.tsx`
- `apps/web/src/components/organisms/gates/DecisionGate.tsx`
- `apps/web/src/components/organisms/gates/ConvergenceGate.tsx`

**Step 1: Update GateCard gate type → AirlockIcon mapping**

```tsx
const GATE_ICON_MAP: Record<string, AirlockIconName> = {
  verification: "gate-verify",
  approval: "gate-approval",
  density: "gate-density",
  decision: "gate-decision",
  convergence: "gate-convergence",
};
```

**Step 2: Update each gate component's header icon**

**Step 3: Verify and commit**

```bash
git commit -m "feat(web): integrate AirlockIcon into gate components"
```

---

### Task 20: Replace Otto and Archetype icons

**Files to modify:**

- `apps/web/src/components/organisms/ForgeChat.tsx` — Bot→AirlockIcon otto
- `apps/web/src/components/organisms/OttoDrawer.tsx` — Bot→AirlockIcon otto
- `apps/web/src/app/(shell)/admin/otto/page.tsx` — Bot→AirlockIcon otto
- `apps/web/src/components/organisms/ForgePreview.tsx` — Bot→AirlockIcon otto
- `apps/web/src/components/atoms/ArchetypeBadge.tsx` — Zap/Shield/Compass→AirlockIcon archetypes
- `apps/web/src/components/organisms/ControlPanel.tsx` — Bot tab→AirlockIcon otto

**Step 1: Swap all Bot references to AirlockIcon otto with breathe animation**

**Step 2: Swap archetype badge icons**

```tsx
const ARCHETYPE_ICONS: Record<string, AirlockIconName> = {
  driver: "archetype-driver",
  enforcer: "archetype-enforcer",
  interpreter: "archetype-interpreter",
};
```

**Step 3: Verify and commit**

```bash
git commit -m "feat(web): integrate AirlockIcon for Otto and Archetypes"
```

---

## Phase 5: Cleanup & Verification

### Task 21: Remove unused assets

**Files to modify:**

- Delete: `apps/web/public/assets/padlock_no_bg.png` (1.5MB — replaced by LockmarkIcon)

**Step 1: Verify no remaining references to padlock_no_bg.png**

Run: `grep -r "padlock_no_bg" apps/web/src/`

**Step 2: Delete the file**

```bash
rm apps/web/public/assets/padlock_no_bg.png
git add -u
git commit -m "chore(web): remove 1.5MB padlock PNG (replaced by SVG LockmarkIcon)"
```

---

### Task 22: Full verification

**Step 1: Type check**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && cd apps/web && pnpm type-check`

**Step 2: Lint**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && cd apps/web && pnpm lint`

**Step 3: Build**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && cd apps/web && pnpm build`

**Step 4: Fix any errors and commit**

```bash
git commit -m "fix(web): resolve build errors from icon refresh"
```

---

### Task 23: Update component registry

**Files to modify:**

- `airlock-docs/registry/components.json` (via MCP)

**Step 1: Add entries for new components**

Add registry entries for:

- AirlockIcon (atom)
- AirlockIconDefs (atom)
- All 24 custom icon components (atoms, in airlock-icons subdirectory)

**Step 2: Commit**

```bash
git commit -m "docs(web): update component registry with AirlockIcon system"
```

---

## Execution Summary

| Phase             | Tasks | Parallelizable | Est. Files          |
| ----------------- | ----- | -------------- | ------------------- |
| 1. Infrastructure | 1-3   | Sequential     | 4 new               |
| 2. Custom Icons   | 4-11  | All parallel   | 24 new              |
| 3. Lucide Swaps   | 12-16 | All parallel   | ~40 modified        |
| 4. Integration    | 17-20 | Sequential     | ~15 modified        |
| 5. Cleanup        | 21-23 | Sequential     | 1 deleted, registry |

**Total: 23 tasks, ~28 new files, ~55 modified files, 1 deleted asset**
