# Capability Tree — Admin Dashboard View

> Sub-spec of `docs/specs/admin/overview.md` → Dashboard section (line 59)

## Overview

The Capability Tree is the Admin Dashboard landing view — a full-canvas interactive graph that visualizes all 13 workspace capabilities as a top-down dependency tree. Each node shows its configuration state (Configured / Available / Locked), and the view provides guided next-step prompts to walk admins through workspace setup.

Built with `@xyflow/react` (React Flow), reusing patterns from the Workflow Builder.

## Design Intelligence

Design system validated with UI/UX Pro Max skill:

- **Style**: Dark Mode (OLED) — deep black, minimal glow, high readability
- **Typography**: Fira Code / Fira Sans (matches `tokens.css`)
- **Key Effects**: Minimal glow (`box-shadow: 0 0 20px`), smooth transitions (150–300ms), ease-out entry
- **Accessibility**: WCAG AAA contrast (7:1+ on dark), `prefers-reduced-motion` respected, keyboard navigable, focus rings on all interactive nodes
- **Anti-patterns to avoid**: No emoji icons (use Lucide SVGs), no layout-shifting hover states, no linear easing

## Capability Definitions (13 nodes)

| ID              | Label         | Icon (Lucide) | Parent(s)   | Auto-config?                                      | Admin Route           |
| --------------- | ------------- | ------------- | ----------- | ------------------------------------------------- | --------------------- |
| `workspace`     | Workspace     | `Cloud`       | _(root)_    | —                                                 | `/admin`              |
| `ai_provider`   | AI Provider   | `Brain`       | workspace   | No                                                | `/admin/ai-provider`  |
| `data_source`   | Data Source   | `Database`    | workspace   | No                                                | `/admin/data-source`  |
| `members`       | Members       | `Users`       | workspace   | No                                                | `/admin/members`      |
| `otto`          | OTTO          | `Lock`        | ai_provider | **Yes** — auto-configured when AI Provider is set | —                     |
| `modules`       | Modules       | `Cpu`         | workspace   | No                                                | `/admin/modules`      |
| `rates`         | Rates         | `Shield`      | workspace   | No                                                | `/admin/rates`        |
| `integrations`  | Integrations  | `Plug`        | workspace   | No                                                | `/admin/integrations` |
| `mcp_servers`   | MCP Servers   | `Server`      | otto        | No                                                | `/admin/mcp-servers`  |
| `workflows`     | Workflows     | `GitBranch`   | modules     | No                                                | `/admin/workflows`    |
| `skills`        | Skills        | `Zap`         | mcp_servers | No                                                | `/admin/skills`       |
| `feature_flags` | Feature Flags | `ToggleLeft`  | workflows   | No                                                | `/admin/features`     |
| `event_bus`     | Event Bus     | `Radio`       | workflows   | No                                                | `/admin/event-bus`    |

## Tree Layout (5 rows)

```
                    ┌───────────┐
                    │ Workspace │  ← Row 0 (y=0)
                    └─────┬─────┘
           ┌──────────────┼───────────────┐
    ┌──────┴──────┐ ┌─────┴─────┐ ┌───────┴──────┐
    │ AI Provider │ │Data Source│ │   Members    │  ← Row 1 (y=200)
    └──────┬──────┘ └───────────┘ └──────────────┘
    ┌──────┴──────┐ ┌──────┐ ┌─────┐ ┌─────────────┐
    │    OTTO*    │ │Modules│ │Rates│ │Integrations │  ← Row 2 (y=400)
    └──────┬──────┘ └───┬──┘ └─────┘ └─────────────┘
    ┌──────┴──────┐ ┌───┴──────┐
    │ MCP Servers │ │Workflows │  ← Row 3 (y=600)
    └──────┬──────┘ └──┬───┬──┘
    ┌──────┴──────┐ ┌──┴───────┐ ┌────────┐
    │   Skills    │ │Feat Flags│ │Event Bus│  ← Row 4 (y=800)
    └─────────────┘ └──────────┘ └────────┘
```

_\*OTTO auto-configured upon AI Provider setup_

## State Model

### Three Visual States

| State          | Color                        | Icon Overlay        | Glow                                       | Opacity |
| -------------- | ---------------------------- | ------------------- | ------------------------------------------ | ------- |
| **Configured** | `--accent-primary` (#00D1FF) | Green checkmark     | `box-shadow: 0 0 20px rgba(0,209,255,0.3)` | 100%    |
| **Available**  | `--text-muted` (#64748B)     | None (subtle pulse) | None                                       | 100%    |
| **Locked**     | `--text-muted` (#64748B)     | Lock icon           | None                                       | 60%     |

### State Derivation

```
for each capability:
  if capability.id in configuredIds → "configured"
  else if ALL parents are "configured" → "available"
  else → "locked"
```

### Auto-configuration Rule

When `ai_provider` transitions to "configured", `otto` is automatically marked as "configured" (with a brief cyan pulse animation).

### Edge Styling

| Source State | Target State | Stroke                                |
| ------------ | ------------ | ------------------------------------- |
| Configured   | Configured   | `--accent-primary` (#00D1FF), 2px     |
| Configured   | Available    | `--text-muted` (#64748B), 2px, dashed |
| Any          | Locked       | `--surface-border` (#1E2330), 1px     |

## HUD Overlays

### Capabilities Counter (top-right)

```
┌──────────────────────┐
│ CAPABILITIES         │
│ X/13 configured      │
│ ████████░░░░░░░░░░░ │  ← ProgressBar atom, color="primary"
└──────────────────────┘
```

### State Legend (top-right, below counter)

```
┌──────────────────────────────┐
│ STATE DEFINITIONS            │
│ ● Configured (Cyan)          │
│ ● Available (Grey-blue)      │
│ 🔒 Locked (Grey-blue + lock) │
└──────────────────────────────┘
```

### Next-Step Banner (bottom center)

```
┌────────────────────────────────────────────────────────┐
│ Next: Configure AI Provider                    [Go] [×]│
│ to unlock OTTO and smart queries                       │
└────────────────────────────────────────────────────────┘
```

- Dynamically selects the highest-priority available capability
- Priority order: ai_provider > data_source > members > modules > rates > integrations > mcp_servers > workflows > skills > feature_flags > event_bus
- "Go" navigates to the capability's `adminRoute`
- Dismissable (persisted per session)

## Interaction Model

| Action                 | Behavior                                      |
| ---------------------- | --------------------------------------------- |
| Click configured node  | Navigate to its admin route (view config)     |
| Click available node   | Navigate to its admin route (configure)       |
| Click locked node      | Tooltip: "Configure [parent] first to unlock" |
| Hover any node         | Subtle scale (1.02) + border brighten         |
| Keyboard Tab           | Focus moves through nodes in reading order    |
| Keyboard Enter on node | Same as click                                 |
| Zoom +/-               | React Flow Controls (bottom-left)             |

## Accessibility

- All nodes have `role="button"` and `aria-label`
- Locked nodes have `aria-disabled="true"`
- State legend uses text labels, not just color
- Focus rings: `ring-2 ring-accent-primary ring-offset-1 ring-offset-surface-base`
- `prefers-reduced-motion`: disable glow pulse animation, use instant state transitions
- Minimum touch target: 44×44px (nodes are ~80×100px)

## Component Map

| Component        | Level    | Path                                          |
| ---------------- | -------- | --------------------------------------------- |
| `CapabilityNode` | molecule | `src/components/molecules/CapabilityNode.tsx` |
| `CapabilityTree` | organism | `src/components/organisms/CapabilityTree.tsx` |

## Data Layer

| File                             | Purpose                                                 |
| -------------------------------- | ------------------------------------------------------- |
| `src/lib/mock-capabilities.ts`   | Types, definitions, positions, state derivation helpers |
| `src/stores/capability.store.ts` | Zustand store for configuredIds, nodes, edges           |

## Integration

- Admin nav: add "Dashboard" as first tab → `/admin/dashboard`
- Route: `src/app/(shell)/admin/dashboard/page.tsx`
- Cross-store reads: capability store reads from `admin.store` (members, flags) and `onboarding.store` (workspace, modules, data source) to derive initial state
