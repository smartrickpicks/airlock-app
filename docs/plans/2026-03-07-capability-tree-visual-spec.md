# Capability Tree — Visual Design Specification

**Status:** DRAFT
**Date:** 2026-03-07
**Depends on:** `2026-03-07-capability-tree-design.md` (architecture), `tokens.css` (theme tokens)

---

## Design System Summary

| Property      | Value                                                          |
| ------------- | -------------------------------------------------------------- |
| Style         | OLED Dark Mode — high contrast, deep black, minimal glow       |
| Colors        | Existing `tokens.css` palette — no new tokens needed           |
| Typography    | Fira Code (headings/labels), Fira Sans (body) — already in use |
| Icon Set      | Lucide React (already installed)                               |
| Graph Library | @xyflow/react v12.10.1 (already installed)                     |
| Accessibility | WCAG AAA dark mode, visible focus rings, aria-labels           |

---

## Canvas

### Background

```css
.react-flow__pane {
  background: var(--surface-base); /* #0B0E14 */
  background-image: radial-gradient(
    circle at 1px 1px,
    var(--surface-border-subtle) 1px,
    transparent 0
  );
  background-size: 24px 24px; /* dot grid */
}
```

The canvas uses a subtle dot grid pattern on `--surface-base` for spatial orientation during pan/zoom. Grid dots use `--surface-border-subtle` (#161B25) — visible on close zoom, invisible at distance.

### Tier Zone Backgrounds

Each tier occupies a horizontal band on the canvas with a barely-visible tinted background:

| Tier       | Y Range | Background                               |
| ---------- | ------- | ---------------------------------------- |
| Foundation | 0–200   | `transparent` (inherits canvas base)     |
| Platform   | 200–450 | `rgba(99, 102, 241, 0.03)` (indigo tint) |
| Extensions | 450–700 | `rgba(168, 85, 247, 0.03)` (purple tint) |
| Scale      | 700–900 | `rgba(34, 197, 94, 0.03)` (green tint)   |

Tier labels rendered as `<text>` elements on the left edge of each zone:

```css
.tier-label {
  font-family: var(--font-mono);
  font-size: 11px;
  fill: var(--text-muted); /* #64748B */
  text-transform: uppercase;
  letter-spacing: 0.1em;
  opacity: 0.6;
}
```

---

## Node Design

### Collapsed State (Circle)

All non-expanded nodes render as circles. Size and style vary by state.

```
    ┌─ icon (Lucide, 20×20) ─┐
    │        ┌────┐          │
    │   ┌────│ ◆  │────┐    │
    │   │    └────┘    │    │
    │   │   [label]    │    │
    │   └──────────────┘    │
    └───── 80×80 circle ─────┘
```

#### Dimensions

| Variant  | Diameter | Icon Size | Font Size | Notes                 |
| -------- | -------- | --------- | --------- | --------------------- |
| Standard | 80px     | 20×20     | 11px      | All nodes except OTTO |
| OTTO     | 100px    | 28×28     | 13px      | Larger for prominence |

#### State Styles

**Locked**

```css
.node--locked {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--surface-raised) 30%, transparent);
  border: 1.5px dashed var(--surface-border);
  opacity: 0.5;
  cursor: not-allowed;
}
.node--locked .node-icon {
  color: var(--text-muted); /* #64748B */
}
.node--locked .node-label {
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 11px;
}
/* Lock overlay icon (bottom-right of circle) */
.node--locked::after {
  content: "";
  /* Lucide Lock icon rendered as pseudo-element or child */
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 14px;
  height: 14px;
  color: var(--text-muted);
}
```

**Available (pulsing)**

```css
.node--available {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-full);
  background: var(--surface-raised); /* #0F1219 */
  border: 1.5px solid var(--surface-border); /* #1E2330 */
  cursor: pointer;
  transition: all var(--transition-normal);
}
.node--available:hover {
  border-color: var(--accent-primary); /* #00D1FF */
  box-shadow: 0 0 0 3px
    color-mix(in srgb, var(--accent-primary) 20%, transparent);
}
.node--available .node-icon {
  color: var(--text-secondary); /* #94A3B8 */
}
.node--available .node-label {
  color: var(--text-primary); /* #E2E8F0 */
}

/* Pulse animation for "next step" suggestion */
@keyframes node-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0
      color-mix(in srgb, var(--accent-primary) 30%, transparent);
  }
  50% {
    box-shadow: 0 0 0 8px
      color-mix(in srgb, var(--accent-primary) 0%, transparent);
  }
}
.node--available.node--suggested {
  animation: node-pulse 2s ease-in-out infinite;
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .node--available.node--suggested {
    animation: none;
    border-color: var(--accent-primary);
  }
}
```

**Configured (glowing)**

```css
.node--configured {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-full);
  background: var(--surface-raised);
  border: 1.5px solid var(--accent-primary); /* #00D1FF */
  box-shadow: 0 0 12px
    color-mix(in srgb, var(--accent-primary) 25%, transparent);
  cursor: pointer;
  transition: all var(--transition-normal);
}
.node--configured:hover {
  box-shadow: 0 0 16px
    color-mix(in srgb, var(--accent-primary) 40%, transparent);
}
.node--configured .node-icon {
  color: var(--accent-primary);
}
/* Check badge (top-right) */
.node--configured .node-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 18px;
  height: 18px;
  border-radius: var(--radius-full);
  background: var(--accent-success); /* #22C55E */
  display: flex;
  align-items: center;
  justify-content: center;
}
.node--configured .node-badge svg {
  width: 10px;
  height: 10px;
  color: var(--surface-base); /* dark check on green */
}
```

**Error**

```css
.node--error {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-full);
  background: var(--surface-raised);
  border: 1.5px solid var(--accent-danger); /* #EF4444 */
  box-shadow: 0 0 8px color-mix(in srgb, var(--accent-danger) 20%, transparent);
  cursor: pointer;
}
.node--error .node-icon {
  color: var(--accent-danger);
}
/* Warning badge (top-right) */
.node--error .node-badge {
  background: var(--accent-danger);
}
```

### Collapsed Node Internal Layout

```tsx
// Inside the 80×80 circle
<div className="flex flex-col items-center justify-center gap-1 p-2">
  {/* Icon */}
  <LucideIcon name={data.icon} className="w-5 h-5" />
  {/* Label */}
  <span className="font-mono text-[11px] leading-tight text-center max-w-[72px] truncate">
    {data.label}
  </span>
</div>
```

---

## Expanded State (Config Card)

When clicked, a node animates from 80×80 circle → 320×auto card.

### Expand Animation

```css
.node--configuring {
  width: 320px;
  min-height: 200px;
  border-radius: var(--radius-xl); /* 12px */
  background: var(--surface-overlay); /* #151923 */
  border: 1px solid var(--accent-primary);
  box-shadow:
    0 0 20px color-mix(in srgb, var(--accent-primary) 15%, transparent),
    0 4px 24px rgba(0, 0, 0, 0.5);
  transition:
    width 300ms cubic-bezier(0.34, 1.56, 0.64, 1),
    min-height 300ms cubic-bezier(0.34, 1.56, 0.64, 1),
    border-radius 200ms ease;
}
```

The `cubic-bezier(0.34, 1.56, 0.64, 1)` gives a slight spring overshoot — feels alive, not robotic.

### Card Layout

```
┌─── 320px ───────────────────────────┐
│ ┌──────────────────────────────┐   │
│ │ ● AI Provider            [×]│   │  ← Header (40px)
│ └──────────────────────────────┘   │
│ ─────────────────────────────────  │  ← Divider
│                                     │
│  Provider  ┌─────────────────┐    │  ← Form fields
│            │ Anthropic     ▼ │    │
│            └─────────────────┘    │
│                                     │
│  API Key   ┌─────────────────┐    │
│            │ sk-ant-••••••   │    │
│            └─────────────────┘    │
│                                     │
│  Model     ┌─────────────────┐    │
│            │ claude-sonnet-4 ▼│    │
│            └─────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Status: ● Connected  12ms  │   │  ← Status bar
│  └─────────────────────────────┘   │
│                                     │
│       ┌────────┐  ┌────────┐      │  ← Actions
│       │  Save  │  │ Cancel │      │
│       └────────┘  └────────┘      │
└─────────────────────────────────────┘
```

### Card Header

```css
.node-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md) var(--space-lg); /* 12px 16px */
  border-bottom: 1px solid var(--surface-border);
}
.node-card-header h3 {
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}
.node-card-header .close-btn {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.node-card-header .close-btn:hover {
  background: var(--surface-raised);
  color: var(--text-primary);
}
```

### Form Fields

```css
.node-form-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs); /* 4px */
  padding: 0 var(--space-lg); /* 0 16px */
  margin-bottom: var(--space-md); /* 12px */
}
.node-form-field label {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.node-form-field input,
.node-form-field select {
  height: 36px;
  padding: 0 var(--space-md);
  background: var(--surface-raised);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 13px;
  transition: border-color var(--transition-fast);
}
.node-form-field input:focus,
.node-form-field select:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px
    color-mix(in srgb, var(--accent-primary) 20%, transparent);
}
```

### Action Buttons

```css
.node-actions {
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-md) var(--space-lg) var(--space-lg);
  justify-content: flex-end;
}
.btn-save {
  height: 32px;
  padding: 0 var(--space-xl);
  background: var(--accent-primary);
  color: var(--text-inverse); /* #0B0E14 */
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.btn-save:hover {
  background: var(--accent-primary-hover);
}
.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-cancel {
  height: 32px;
  padding: 0 var(--space-xl);
  background: transparent;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  border-radius: var(--radius-md);
  border: 1px solid var(--surface-border);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.btn-cancel:hover {
  background: var(--surface-raised);
  color: var(--text-primary);
}
```

### Status Bar

```css
.node-status {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-lg);
  margin: 0 var(--space-lg) var(--space-md);
  background: var(--surface-sunken);
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: 11px;
}
.node-status .dot {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
}
.node-status .dot--connected {
  background: var(--accent-success);
}
.node-status .dot--connecting {
  background: var(--accent-warning);
  animation: status-blink 1s ease-in-out infinite;
}
.node-status .dot--error {
  background: var(--accent-danger);
}

@keyframes status-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}
```

---

## Edge Design

### Dependency Edges

Edges connect parent nodes to child nodes using React Flow's `smoothstep` edge type.

**Satisfied edge** (parent is `configured`):

```css
.edge--satisfied path {
  stroke: color-mix(in srgb, var(--accent-primary) 60%, transparent);
  stroke-width: 1.5;
  stroke-dasharray: 6 4;
  animation: edge-flow 1s linear infinite;
}
@keyframes edge-flow {
  from {
    stroke-dashoffset: 10;
  }
  to {
    stroke-dashoffset: 0;
  }
}
```

**Unsatisfied edge** (parent is NOT `configured`):

```css
.edge--unsatisfied path {
  stroke: color-mix(in srgb, var(--surface-border) 40%, transparent);
  stroke-width: 1;
  stroke-dasharray: 4 6;
}
```

**Edge labels** (optional, for bridge nodes):

```css
.edge-label {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
  background: var(--surface-base);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--surface-border-subtle);
}
```

---

## Progress Indicator

Top-right corner of the canvas, always visible:

```
┌──────────────────────────────────┐
│  Capabilities  3/15 configured  │
│  ████░░░░░░░░░░░░░░  20%       │
└──────────────────────────────────┘
```

```css
.progress-indicator {
  position: absolute;
  top: var(--space-lg);
  right: var(--space-lg);
  z-index: var(--z-raised);
  padding: var(--space-md) var(--space-lg);
  background: var(--surface-overlay);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(8px);
}
.progress-indicator .label {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.progress-indicator .count {
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}
.progress-bar {
  width: 160px;
  height: 4px;
  background: var(--surface-border);
  border-radius: var(--radius-full);
  margin-top: var(--space-xs);
  overflow: hidden;
}
.progress-bar-fill {
  height: 100%;
  background: var(--accent-primary);
  border-radius: var(--radius-full);
  transition: width var(--transition-slow);
}
```

---

## Suggested Next Step Card

Floating near bottom-center of the canvas when there's an obvious next action:

```
┌──────────────────────────────────────────┐
│  Next: Connect an AI Provider            │
│  to unlock OTTO and smart queries        │
│                              [Go →]      │
└──────────────────────────────────────────┘
```

```css
.next-step-card {
  position: absolute;
  bottom: var(--space-xl);
  left: 50%;
  transform: translateX(-50%);
  z-index: var(--z-raised);
  padding: var(--space-md) var(--space-xl);
  background: var(--surface-overlay);
  border: 1px solid color-mix(in srgb, var(--accent-primary) 30%, transparent);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  gap: var(--space-xl);
  max-width: 400px;
  animation: slide-up 300ms ease-out;
}
@keyframes slide-up {
  from {
    transform: translateX(-50%) translateY(16px);
    opacity: 0;
  }
  to {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
}
.next-step-card .next-label {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 500;
}
.next-step-card .next-desc {
  font-family: var(--font-sans);
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}
.next-step-card .go-btn {
  flex-shrink: 0;
  height: 28px;
  padding: 0 var(--space-lg);
  background: var(--accent-primary);
  color: var(--text-inverse);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--transition-fast);
}
.next-step-card .go-btn:hover {
  background: var(--accent-primary-hover);
}
```

---

## OTTO Node — Special Treatment

OTTO is visually larger and more prominent than other nodes.

### Collapsed (100×100)

```css
.node--otto.node--configured {
  width: 100px;
  height: 100px;
  background: var(--surface-raised);
  border: 2px solid var(--accent-secondary); /* #6366F1 indigo */
  box-shadow:
    0 0 16px color-mix(in srgb, var(--accent-secondary) 30%, transparent),
    0 0 32px color-mix(in srgb, var(--accent-secondary) 10%, transparent);
}
.node--otto .node-icon {
  color: var(--accent-secondary);
}
.node--otto .node-sublabel {
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--text-muted);
  margin-top: 2px;
}
```

### Ready-but-unused Pulse

```css
@keyframes otto-pulse {
  0%,
  100% {
    box-shadow:
      0 0 16px color-mix(in srgb, var(--accent-secondary) 30%, transparent),
      0 0 32px color-mix(in srgb, var(--accent-secondary) 10%, transparent);
  }
  50% {
    box-shadow:
      0 0 24px color-mix(in srgb, var(--accent-secondary) 50%, transparent),
      0 0 48px color-mix(in srgb, var(--accent-secondary) 20%, transparent);
  }
}
.node--otto.node--configured.node--unused {
  animation: otto-pulse 3s ease-in-out infinite;
}
```

---

## Tooltip (Locked Nodes)

When hovering a locked node, show a tooltip explaining what needs to happen:

```css
.node-tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  padding: var(--space-sm) var(--space-md);
  background: var(--surface-overlay);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-md);
  font-family: var(--font-sans);
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  pointer-events: none;
  z-index: var(--z-tooltip);
}
.node-tooltip::after {
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: var(--surface-border);
}
```

Content: `"Requires: AI Provider"` — dynamically filled from dependency graph.

---

## Module Sub-Tree Nodes (Milestones)

When zooming into a module (e.g., Contracts), the 3-5 milestone nodes use smaller circles:

| Property  | Value |
| --------- | ----- |
| Diameter  | 64px  |
| Icon size | 16×16 |
| Font size | 10px  |

### Milestone Progress Stars

Below each milestone node, render star indicators:

```tsx
<div className="flex gap-0.5 mt-1">
  {Array.from({ length: totalStars }, (_, i) => (
    <Star
      key={i}
      className={cn(
        "w-3 h-3",
        i < completedStars
          ? "fill-accent-primary text-accent-primary"
          : "text-text-muted",
      )}
    />
  ))}
</div>
```

---

## Responsive Behavior

| Breakpoint | Behavior                                        |
| ---------- | ----------------------------------------------- |
| >= 1024px  | Full canvas, expanded cards 320px               |
| 768–1023px | Full canvas, expanded cards 280px, smaller font |
| < 768px    | Scrollable list view (fallback, no graph)       |

Mobile fallback renders nodes as a stacked card list grouped by tier, preserving dependency order but dropping the graph visualization.

---

## Accessibility Checklist

- [ ] All nodes have `aria-label` with name + state (e.g., "AI Provider — available, click to configure")
- [ ] Lock icon has `aria-label="Locked — requires Workspace"`
- [ ] Tab order follows dependency graph (Foundation → Platform → Extensions → Scale)
- [ ] Focus ring visible on all nodes: `outline: 2px solid var(--accent-primary); outline-offset: 2px`
- [ ] `prefers-reduced-motion` disables pulse, edge flow, and spring animations
- [ ] Expanded card form fields have proper `<label>` associations
- [ ] Status dot colors paired with text labels (never color-only)
- [ ] Canvas zoom/pan accessible via keyboard (React Flow default keyboard nav)
- [ ] Screen reader announces progress: "3 of 15 capabilities configured"

---

## Color Token Usage Map

| Element                  | Token                    | Hex     |
| ------------------------ | ------------------------ | ------- |
| Canvas background        | `--surface-base`         | #0B0E14 |
| Node background          | `--surface-raised`       | #0F1219 |
| Expanded card background | `--surface-overlay`      | #151923 |
| Status bar background    | `--surface-sunken`       | #080A0F |
| Default border           | `--surface-border`       | #1E2330 |
| Active/focus border      | `--accent-primary`       | #00D1FF |
| Configured glow          | `--accent-primary` @ 25% | #00D1FF |
| OTTO glow                | `--accent-secondary`     | #6366F1 |
| Error border             | `--accent-danger`        | #EF4444 |
| Success badge            | `--accent-success`       | #22C55E |
| Primary text             | `--text-primary`         | #E2E8F0 |
| Secondary text           | `--text-secondary`       | #94A3B8 |
| Muted text / labels      | `--text-muted`           | #64748B |
| Button text on accent    | `--text-inverse`         | #0B0E14 |
| Satisfied edge           | `--accent-primary` @ 60% | #00D1FF |
| Unsatisfied edge         | `--surface-border` @ 40% | #1E2330 |

Every color maps to an existing token. **No new tokens required.**
