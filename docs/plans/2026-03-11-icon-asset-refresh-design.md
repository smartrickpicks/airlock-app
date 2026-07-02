# Icon & Asset Refresh — Design Document

**Date:** 2026-03-11
**Status:** Approved
**Chamber:** Discovery → Build

---

## Objective

Replace all generic icons and assets across the Airlock UI with richer, more polished versions. Custom glassmorphic/gradient SVG icons for domain concepts, comprehensive Lucide audit for everything else, and Framer Motion animations throughout.

## Strategy

- **Lucide** for generic actions (close, search, chevron, etc.) — comprehensive audit of all ~60 icons
- **Custom SVG icons** for 8 domain concept groups (24 icons total) with glassmorphic/gradient style matching the landing page visual language
- **Framer Motion** for entrance, hover, and active-state animations on all icons
- **AirlockIcon component system** with shared gradient defs, composable animation presets, and unified API

## Decisions

| Decision             | Choice                                                                       |
| -------------------- | ---------------------------------------------------------------------------- |
| Strategy             | Lucide for generic + custom SVGs for domain concepts                         |
| Custom icon style    | Glassmorphic/gradient matching landing page                                  |
| Custom icon groups   | All 8: Vault, Chambers, Gates, Modules, Otto, Lockmark, Triptych, Archetypes |
| Animation engine     | Framer Motion — entrance + hover + active states                             |
| Lucide refresh scope | Comprehensive — audit all 60 icons, upgrade where better options exist       |
| Architecture         | Option C — AirlockIcon component library with shared gradient defs           |

---

## Architecture

### File Structure

```
src/components/atoms/
├── Icon.tsx                    # Existing Lucide wrapper (upgraded)
├── AirlockIcon.tsx             # New custom icon component
├── AirlockIconDefs.tsx         # Shared SVG gradient/filter defs (provider)
└── airlock-icons/
    ├── index.ts                # Barrel export
    ├── types.ts                # Icon name union type, animation presets
    ├── VaultIcon.tsx
    ├── ChamberDiscoverIcon.tsx
    ├── ChamberBuildIcon.tsx
    ├── ChamberReviewIcon.tsx
    ├── ChamberShipIcon.tsx
    ├── GateVerifyIcon.tsx
    ├── GateApprovalIcon.tsx
    ├── GateDensityIcon.tsx
    ├── GateDecisionIcon.tsx
    ├── GateConvergenceIcon.tsx
    ├── ModuleContractsIcon.tsx
    ├── ModuleCrmIcon.tsx
    ├── ModuleTriageIcon.tsx
    ├── ModuleCalendarIcon.tsx
    ├── ModuleDocumentsIcon.tsx
    ├── OttoIcon.tsx
    ├── LockmarkIcon.tsx
    ├── TriptychSignalIcon.tsx
    ├── TriptychOrchestrateIcon.tsx
    ├── TriptychControlIcon.tsx
    ├── ArchetypeDriverIcon.tsx
    ├── ArchetypeEnforcerIcon.tsx
    └── ArchetypeInterpreterIcon.tsx
```

### How It Works

1. **AirlockIconDefs** — mounted once in `ShellLayout.tsx`, renders hidden `<svg>` with all shared `<defs>` (gradients, filters, glow effects)
2. **Each icon component** — renders `<svg>` referencing shared defs via `url(#gradient-id)`
3. **AirlockIcon** — public API, takes `name` prop, resolves to correct component, wraps in Framer Motion

### Unified API

```tsx
<AirlockIcon name="vault" size="md" animate="breathe" />
<AirlockIcon name="module-contracts" animate={["entrance", "pulseOnHover"]} />
<Icon icon={ChevronDown} size="sm" />  // Lucide still works
```

Sizes: sm=16, md=20, lg=24, xl=48 (matches existing Icon.tsx)

---

## Visual Design

### Shared Gradient Defs

| Gradient ID          | Colors                                              | Used By                         |
| -------------------- | --------------------------------------------------- | ------------------------------- |
| `gradient-cyan-glow` | `#00D1FF` → `#6366F1`                               | Default accent, Otto, Triptych  |
| `gradient-discover`  | `#EF4444` → `#FF6B6B`                               | Discover chamber, related gates |
| `gradient-build`     | `#EAB308` → `#FBBF24`                               | Build chamber, related gates    |
| `gradient-review`    | `#A855F7` → `#C084FC`                               | Review chamber, related gates   |
| `gradient-ship`      | `#22C55E` → `#4ADE80`                               | Ship chamber, related gates     |
| `gradient-glass`     | `rgba(255,255,255,0.12)` → `rgba(255,255,255,0.03)` | Glassmorphic overlay            |
| `gradient-vault`     | `#00D1FF` → `#A855F7`                               | Vault icon                      |

### Shared Filters

| Filter ID         | Effect                                       | Used By             |
| ----------------- | -------------------------------------------- | ------------------- |
| `glow-soft`       | `feGaussianBlur(2)` + cyan flood + composite | Hover glow          |
| `glow-chamber`    | Dynamic chamber color glow                   | Active chamber      |
| `glass-highlight` | `feSpecularLighting` glass shine             | Module icons, Vault |

### Design Principles

- Base shape: 1.5px stroked paths (matching Lucide weight)
- Gradient fill on "hero" element of each icon, secondary strokes stay `currentColor`
- Glass overlay: `gradient-glass` clipped to icon shape
- Glow halo: `glow-soft` filter on hover/active

### Per-Group Concepts

**Vault:** Hexagonal container with keyhole negative space. Cyan-to-purple gradient. Glass highlight on upper-left. Hover: keyhole emits soft cyan glow.

**Chambers:**

- Discover: Radar sweep — concentric arcs + scanning beam, red gradient
- Build: Forge anvil with spark particles, yellow/amber gradient
- Review: Eye with shield iris, purple gradient
- Ship: Launch vector — upward arrow + thrust trail, green gradient

**Gates:**

- Verify: Lock with checkmark overlay (inherits chamber gradient)
- Approval: Stamp/seal with radiating lines
- Density: Data bars with threshold line
- Decision: Diamond/fork with diverging paths
- Convergence: Multiple paths merging into one point

**Modules:**

- Contracts: Scroll with seal
- CRM: Network graph (nodes + connections)
- Triage: Signal tower with radiating waves
- Calendar: Clock face with orbital ring
- Documents: Layered pages with glass shine

**Otto:** Geometric face (two dots + arc) inside rounded hex. Always-on subtle breathe. Thinking: eyes pulse, glow intensifies.

**Lockmark:** Current SVG preserved, optimized. Drop the 1.5MB PNG. Add Framer Motion entrance + glow-breathe.

**Triptych Panels:**

- Signal: Lightning bolt inside circle
- Orchestrate: Gear mesh with connecting lines
- Control: Sliders/faders dashboard

**Archetypes:**

- Driver: Bolt with motion trails
- Enforcer: Shield with scanning line
- Interpreter: Compass rose with data streams

---

## Animation Spec

All animations use Framer Motion and respect `prefers-reduced-motion` via `useMotionSafe`.

### Presets

| Preset          | Behavior                   | Duration              |
| --------------- | -------------------------- | --------------------- |
| `entrance`      | fadeIn + scaleIn (0.85→1)  | 350ms, spring         |
| `breathe`       | opacity 0.7→1→0.7 loop     | 3s infinite           |
| `pulseOnHover`  | scale 1→1.12 + glow filter | 200ms in, 300ms out   |
| `glowOnHover`   | `glow-soft` filter fade in | 250ms                 |
| `spinOnce`      | rotate 0→360               | 600ms, decelerate     |
| `activeGlow`    | glow-chamber + scale 1.05  | instant on, 300ms off |
| `thinkingPulse` | scale 1→1.05→1 + glow      | 1.2s loop             |

### Application Map

**ModuleBar:** entrance (staggered 80ms) → inactive: static → hover: pulseOnHover → active: activeGlow
**ChamberStepper:** entrance (staggered) → past: gradient fill + check → current: breathe + activeGlow → future: 30% opacity stroke
**GateCards:** entrance → hover: glowOnHover → passed: gradient + breathe → blocked: desaturate + red pulse
**Otto:** breathe always → send: thinkingPulse → response: popIn
**Triptych headers:** entrance on expand → active: activeGlow → collapsed: 50% opacity
**Archetype badges:** entrance → hover: pulseOnHover → active: breathe
**Lockmark:** scaleIn entrance → hover: pulseOnHover → click: spinOnce

### Composability

```tsx
const presets = {
  entrance: {
    initial: { opacity: 0, scale: 0.85 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.35, ease: [0.175, 0.885, 0.32, 1.275] },
  },
  breathe: {
    animate: { opacity: [0.7, 1, 0.7] },
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
  },
  pulseOnHover: { whileHover: { scale: 1.12 }, transition: { duration: 0.2 } },
};
// Multiple presets compose: <AirlockIcon animate={["entrance", "breathe"]} />
```

---

## Lucide Icon Audit

### Navigation & Chrome

| Current      | Context       | → New                 | Reason           |
| ------------ | ------------- | --------------------- | ---------------- |
| ChevronDown  | Collapse      | **Keep**              | Standard         |
| ChevronRight | Nav arrows    | **Keep**              | Standard         |
| ChevronLeft  | Back          | **Keep**              | Standard         |
| X            | Close/dismiss | **Keep**              | Standard         |
| Search       | Search input  | **Keep**              | Standard         |
| ArrowRight   | CTAs          | **Keep**              | Standard         |
| Plus         | Add/create    | **Keep**              | Standard         |
| Settings     | Admin         | → `SlidersHorizontal` | More modern      |
| LogOut       | Sign out      | → `DoorOpen`          | More descriptive |
| ExternalLink | New tab       | **Keep**              | Standard         |

### Status & State

| Current       | Context   | → New              | Reason            |
| ------------- | --------- | ------------------ | ----------------- |
| CheckCircle   | Success   | → `CircleCheckBig` | Bolder            |
| CheckCircle2  | Completed | → `CircleCheckBig` | Consolidate       |
| Check         | Inline    | **Keep**           | Fine inline       |
| XCircle       | Reject    | → `CircleX`        | Consistent        |
| AlertCircle   | Warning   | → `TriangleAlert`  | More urgency      |
| AlertTriangle | Danger    | → `OctagonAlert`   | Stronger          |
| Circle        | Pending   | → `CircleDashed`   | "Incomplete"      |
| Loader2       | Spinner   | → `LoaderCircle`   | Smoother          |
| Clock         | SLA       | → `Timer`          | Urgency           |
| Lock          | Blocked   | → `ShieldBan`      | Security language |

### Actions

| Current | Context   | → New              | Reason           |
| ------- | --------- | ------------------ | ---------------- |
| Send    | Submit    | → `SendHorizonal`  | Cleaner          |
| Pencil  | Edit      | → `PenLine`        | Refined          |
| Trash2  | Delete    | → `Eraser`         | Soft delete feel |
| Upload  | Upload    | → `CloudUpload`    | Modern           |
| Pin     | Pin       | **Keep**           | Good             |
| Archive | Archive   | → `ArchiveRestore` | Retrievability   |
| Play    | Run       | → `CirclePlay`     | More weight      |
| Pause   | Hold      | → `CirclePause`    | Pairs            |
| Link2   | Copy link | → `ClipboardCopy`  | Clearer          |

### Data & Content

| Current    | Context    | → New               | Reason         |
| ---------- | ---------- | ------------------- | -------------- |
| FileText   | Document   | → `FileStack`       | Richer         |
| File       | Single doc | → `FileBadge`       | Presence       |
| FolderOpen | Library    | → `FolderTree`      | Hierarchy      |
| Table2     | Table view | → `TableProperties` | Detail         |
| LayoutGrid | Grid view  | → `LayoutDashboard` | Dashboard feel |
| LayoutList | List view  | → `Rows3`           | Cleaner        |
| ScrollText | Audit      | **Keep**            | Good           |

### AI & Otto

| Current  | Context        | → New                       | Reason          |
| -------- | -------------- | --------------------------- | --------------- |
| Bot      | Otto           | → **Custom OttoIcon**       | Domain          |
| Sparkles | AI features    | **Keep**                    | Well-understood |
| Brain    | AI provider    | → `BrainCircuit`            | Neural network  |
| Cpu      | Compute        | → `Microchip`               | Modern          |
| Eye      | AI observation | → `ScanEye`                 | Active          |
| Wand2    | Skills         | → consolidate to `Sparkles` | One AI icon     |

### Collaboration

| Current       | Context       | → New                 | Reason      |
| ------------- | ------------- | --------------------- | ----------- |
| Users         | Team          | → `UsersRound`        | Softer      |
| User          | Person        | → `UserRound`         | Pairs       |
| UserCircle    | Profile       | → `UserRound`         | Consolidate |
| MessageSquare | Chat          | → `MessageSquareText` | Content     |
| BellRing      | Notifications | → `BellDot`           | Cleaner     |

### Admin & Infrastructure

| Current   | Context       | → New           | Reason        |
| --------- | ------------- | --------------- | ------------- |
| Server    | MCP           | → `ServerCog`   | Configuration |
| Database  | Data source   | → `DatabaseZap` | Active        |
| Plug      | Integrations  | → `Cable`       | Technical     |
| Key       | API keys      | → `KeyRound`    | Modern        |
| Radio     | Event bus     | → `Podcast`     | Broadcast     |
| Flag      | Feature flags | → `ToggleLeft`  | Literal       |
| Building2 | Workspace     | → `Landmark`    | Distinctive   |

**Total: ~45 Lucide swaps + 24 custom glassmorphic icons**

---

## Impact

- **88 files** touched for Lucide swaps
- **24 new icon components** created
- **3 new infrastructure components** (AirlockIcon, AirlockIconDefs, types)
- **1 asset removed** (1.5MB padlock PNG → optimized SVG)
- **ShellLayout.tsx** updated to mount AirlockIconDefs provider
