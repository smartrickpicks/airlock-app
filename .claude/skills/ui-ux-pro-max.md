---
name: ui-ux-pro-max
description: Use when designing, building, reviewing, or speccing UI/UX for web or mobile - provides design intelligence across 50+ styles, color palettes, font pairings, and UX guidelines for React, Next.js, Tailwind, shadcn/ui and more
---

# UI/UX Pro Max — Design Intelligence

**Stack detection:** Airlock uses Next.js 14 (App Router) + Tailwind + CSS custom properties + Fira Sans/Fira Code.

## Core Workflow

1. **Analyze** — product type, style keywords, industry, tech stack
2. **Design system first** — define surfaces, color roles, typography scale, spacing, motion
3. **Domain-specific patterns** — apply product-type UX conventions
4. **Stack-specific output** — Tailwind token classes, CSS custom properties, JSX structure

## Priority Rules (ranked)

### CRITICAL
- **Accessibility:** min 4.5:1 contrast ratio for normal text, 3:1 for large text, visible focus rings on all interactive elements
- **Touch targets:** min 44×44px for all clickable/tappable elements
- **No layout shift on hover** — use opacity/color transitions only, never padding/margin changes on hover

### HIGH
- **Performance:** no layout-breaking imports, lazy load heavy components, stable CLS
- **Responsive:** test at 375, 768, 1024, 1440px — use `overflow-x-hidden` on root to prevent horizontal scroll
- **Content behind fixed nav:** always add padding-top equal to nav height

### MEDIUM
- **Typography:** body line-height 1.5–1.75, heading line-height 1.2–1.35, max line width 65–75ch
- **Color:** never use raw hex/rgb — always reference design tokens (CSS custom properties)
- **Animation:** 150ms for micro-interactions (hover, focus), 250ms for panels, 350ms for page transitions
- **Style consistency:** one style system per product — don't mix glassmorphism with brutalism

### LOW
- **Charts:** match chart type to data shape (line=trend, bar=comparison, donut=proportion)
- **Empty states:** always design empty, loading, error, and populated states

## Airlock-Specific Design System

### Surface Hierarchy (OLED dark)
```
--surface-sunken   #080A0F  ← deepest (inset areas, code blocks)
--surface-base     #0B0E14  ← page background
--surface-raised   #0F1219  ← cards, panels
--surface-overlay  #151923  ← modals, dropdowns, tooltips
--surface-border         #1E2330
--surface-border-subtle  #161B25
```

### Color Roles
```
--accent-primary   #00D1FF  ← primary actions, active states, links
--accent-secondary #6366F1  ← secondary actions
--accent-success   #22C55E  ← pass, active, connected
--accent-warning   #F59E0B  ← degraded, pending, amber
--accent-danger    #EF4444  ← error, blocked, danger
--text-primary     #E2E8F0
--text-secondary   #94A3B8
--text-muted       #64748B
```

### Glass Card Pattern
```css
background: var(--surface-raised);
border: 1px solid var(--surface-border);
border-radius: var(--radius-lg);
/* subtle inner glow for interactive cards */
box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
```

### Active/Selected State (Discord-style left border)
```css
border-left: 3px solid var(--accent-primary);
background: rgba(0, 209, 255, 0.06);
```

### Status Dot Pattern
```
● green  = active/connected    (--accent-success)
● amber  = pending/degraded    (--accent-warning)
● red    = error/disconnected  (--accent-danger)
○ gray   = disabled            (--text-muted)
```

## Common Professional Mistakes to Avoid

- Using emoji as icons → use SVG (Lucide React)
- Missing `cursor-pointer` on interactive elements
- Insufficient contrast in dark mode (especially muted text over dark surfaces)
- Glass cards in light mode using opacity < 0.8 (use `bg-white/80` or higher)
- Hover states that shift layout (add/remove padding → use opacity/background instead)
- Fixed nav without compensating padding-top on page content
- Tables without keyboard navigation support
- No loading/empty/error state variants

## Permission Matrix UI Pattern (Discord-style)

For role × tool permission grids:
- Rows = resources (tools, channels, modules)
- Columns = roles (narrow, ~80px each)
- Cell states: ✓ allowed (accent-success tint) / — denied (surface-sunken) / ⚠ conditional
- Sticky first column (resource names), scrollable columns
- Row hover: subtle `--surface-overlay` background shift
- Use toggle switches for editable cells, static icons for read-only

## Pre-Delivery Checklist

- [ ] No emojis used as icons (SVG only)
- [ ] All interactive elements have `cursor-pointer`
- [ ] Hover states don't shift layout
- [ ] Text contrast ≥ 4.5:1 on all surfaces
- [ ] All colors reference design tokens (no raw hex)
- [ ] Loading, empty, and error states defined
- [ ] Focus rings visible on keyboard navigation
- [ ] Touch targets ≥ 44×44px
