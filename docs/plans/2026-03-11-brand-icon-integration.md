# Brand Icon Integration — Handoff for App Repo Agent

## Status

Brand assets committed and staged. Run this in the app repo to finalize:

```bash
git commit -m "feat(web): add liquid glass brand assets + favicon metadata"
```

## What Was Done

- **Favicon + apple-touch-icon** added to `apps/web/src/app/layout.tsx`
- **Full brand kit** deployed to `apps/web/public/assets/brand/`

## Asset Inventory

### Marks (app chrome, favicon, OG)

| File              | Size    | Use                           |
| ----------------- | ------- | ----------------------------- |
| `airlock-256.png` | 256×256 | Favicon, small logo           |
| `airlock-512.png` | 512×512 | Apple touch icon, OG fallback |
| `otto-256.png`    | 256×256 | Otto avatar small             |
| `otto-512.png`    | 512×512 | Otto avatar, chat header      |
| `mags-512.png`    | 512×512 | MAGS branding                 |

### Hero Images (1200×1200, multi-arc DAG style)

| File                          | Use                             |
| ----------------------------- | ------------------------------- |
| `hero/hero-airlock.png`       | OG image, about pages           |
| `hero/hero-otto.png`          | Otto chat header, /otto pages   |
| `hero/hero-mags.png`          | MAGS documentation, agent pages |
| `hero/hero-constellation.png` | Architecture pages              |

### Dashboard Icons (256×256 constellation glass style)

All at `assets/brand/icons/`. Import via Next.js `Image` component:

```tsx
import Image from "next/image";

<Image
  src="/assets/brand/icons/mod-contracts.png"
  alt="Contracts"
  width={24}
  height={24}
  className="rounded"
/>;
```

#### Module Icons (sidebar, module bar)

| File                | Module    | Airlock Term                       |
| ------------------- | --------- | ---------------------------------- |
| `mod-contracts.png` | Contracts | Contracts module                   |
| `mod-crm.png`       | CRM       | CRM module (vault hierarchy lens)  |
| `mod-triage.png`    | Triage    | Triage module (project management) |
| `mod-calendar.png`  | Calendar  | Calendar module                    |
| `mod-documents.png` | Documents | Documents module                   |

#### Chamber Icons (chamber navigation, gate indicators)

| File                   | Chamber  | Color Token                 |
| ---------------------- | -------- | --------------------------- |
| `chamber-discover.png` | Discover | `--chamber-discover` (red)  |
| `chamber-build.png`    | Build    | `--chamber-build` (yellow)  |
| `chamber-review.png`   | Review   | `--chamber-review` (purple) |
| `chamber-ship.png`     | Ship     | `--chamber-ship` (green)    |

#### Concept Icons (Triptych headers, Dispatch widgets)

| File                   | Concept  | Where It Goes              |
| ---------------------- | -------- | -------------------------- |
| `concept-vault.png`    | Vault    | Vault detail header        |
| `concept-gate.png`     | Gate     | Gate checkpoint indicators |
| `concept-triptych.png` | Triptych | Triptych panel headers     |
| `concept-dispatch.png` | Dispatch | Dispatch homepage header   |

#### View Icons (view switcher, breadcrumbs)

| File                        | View             | Module Context                 |
| --------------------------- | ---------------- | ------------------------------ |
| `view-gantt.png`            | Gantt            | Triage                         |
| `view-timeline.png`         | Timeline         | Contracts, Calendar            |
| `view-extraction.png`       | Extraction       | Contracts (Discover chamber)   |
| `view-patch.png`            | Patch            | Contracts (Build/Review)       |
| `view-pipeline.png`         | Pipeline         | CRM                            |
| `view-signal.png`           | Signal           | Dispatch (Triptych left panel) |
| `view-record-inspector.png` | Record Inspector | Contracts (vault detail)       |
| `view-focus-mode.png`       | Focus Mode       | Documents                      |
| `view-review-queue.png`     | Review Queue     | Contracts (Review chamber)     |
| `view-preflight.png`        | Preflight        | Contracts (Ship chamber)       |

#### Admin Icons

| File                | Concept                  |
| ------------------- | ------------------------ |
| `admin-overlay.png` | Overlay (admin settings) |

## Integration Points

### 1. Module Sidebar / Module Bar

Replace Lucide icons with brand icons in the module navigation. The module store (`stores/module.store.ts`) tracks `activeModule` — use this to highlight the active icon.

```tsx
// Example: ModuleSidebar.tsx
const moduleIcons: Record<string, string> = {
  contracts: "/assets/brand/icons/mod-contracts.png",
  crm: "/assets/brand/icons/mod-crm.png",
  triage: "/assets/brand/icons/mod-triage.png",
  calendar: "/assets/brand/icons/mod-calendar.png",
  documents: "/assets/brand/icons/mod-documents.png",
};
```

### 2. Chamber Navigation

Use chamber icons in the chamber timeline/stepper component. Match to existing chamber color tokens.

### 3. Otto Chat Avatar

Replace any placeholder Otto avatar with the brand mark:

```tsx
<Image
  src="/assets/brand/otto-256.png"
  alt="Otto"
  width={32}
  height={32}
  className="rounded-full"
/>
```

### 4. View Switcher

When views have tab/toggle navigation, use view icons as visual indicators alongside text labels.

### 5. Dispatch Homepage

Use `concept-dispatch.png` in the Dispatch view header and `view-signal.png` for the Signal panel.

## Design Rules

- All icons are transparent-background PNGs with constellation glass style
- Use `rounded` or `rounded-lg` Tailwind class on the Image for consistency
- Never apply additional filters — the glass rendering handles all visual effects
- Icons work at any scale from 16px to 256px
- Pair with existing Tailwind color tokens (never raw hex values)
- Background glow: `bg-[color-mix(in srgb, var(--accent-primary) 10%, transparent)]`
