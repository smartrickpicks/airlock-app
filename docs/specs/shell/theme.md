# Airlock Visual Theme Spec

> **Status:** SPECCED — OLED dark palette with panel identity, depth layers, and glow system.
> **Source of truth for:** `src/styles/tokens.css`, `tailwind.config.ts`

---

## The Problem We Solved

The original surface palette had only 2% luminance difference between `surface-base`, `surface-raised`, and `surface-overlay`. On OLED panels this is imperceptible — everything merged into a single flat grey plane. Add identical headers on all three triptych panels and the UI becomes unreadable.

**Root causes:**
1. Surface levels too close in luminance
2. No visual identity distinguishing the three triptych panels
3. Chamber indicator dots (GateDot) too small and flat — read as noise
4. Active states using flat `border-l-2` with no fill depth
5. Borders nearly invisible against raised surfaces

---

## Design Principles

| Principle | Implementation |
|---|---|
| **OLED-first** | True blacks (`#07090F`) as base. Surfaces must be perceivably different at arm's length. |
| **Panel identity** | Each triptych panel has a unique color identity communicated through its top border and header tint. |
| **Glow = significance** | Glows on GateDots signal "this is the thing you're working on." Used sparingly. |
| **Gradient \!= decoration** | Active state gradients serve readability, not decoration. They create ground under selected items. |
| **Tokens only** | No raw hex in components. Every color referenced via CSS custom property. |

---

## Surface Depth Scale

| Token | Value | Use |
|---|---|---|
| `--surface-sunken` | `#040609` | Deepest: code blocks, inset fields |
| `--surface-base` | `#07090F` | Page background |
| `--surface-raised` | `#0D1117` | Cards, panels (+4% luminance) |
| `--surface-overlay` | `#161E2E` | Dropdowns, floating surfaces (+9%) |
| `--surface-border` | `#222D42` | Dividers — clearly visible, not loud |
| `--surface-border-subtle` | `#151D2E` | Hairlines within panels |

---

## Panel Identity System

| Panel | Identity Color | Token | Semantic meaning |
|---|---|---|---|
| **Signal** | `#00D1FF` (cyan) | `--panel-signal-accent` | Live data, events, incoming information |
| **Orchestrate** | `#F59E0B` (amber) | `--panel-orchestrate-accent` | Work surface (lit in Artifact Focus only) |
| **Control** | `#6366F1` (indigo) | `--panel-control-accent` | Decisions, metadata, approvals |

Each panel has: 2px colored top border + 4% color-tinted background + 6% color-tinted header row + colored label text.

---

## GateDot Glow System

| Mode | When | How |
|---|---|---|
| **Standard** (default) | Dense lists, sidebars | Flat colored circle |
| **Glow** (`glow` prop) | Active vault header, single-item displays | Circle + radial box-shadow |

Use glow on at most one item visible at a time. Never in tables or dense lists.

---

## Active State Gradients

All active/selected items use: `border-l-2 border-accent-primary` + gradient background fill.



---

## Anti-Patterns

| Don't | Do instead |
|---|---|
| Raw hex in components | Use CSS custom property tokens |
| Multiple glowing GateDots in a list | Only active item glows |
| All panels looking identical | Each has distinct top border color |
| `border-l-2` alone for active state | Add gradient background too |
| `box-shadow` directly in JSX | Use `shadow-glow-*` Tailwind utility |

---

## Component Inventory

| Component | Enhancement |
|---|---|
| `tokens.css` | Surface depth scale, glow tokens, panel identity, gradients |
| `tailwind.config.ts` | `shadow-glow-*`, `colors.panel.*`, gradient utilities |
| `GateDot.tsx` | `glow?: boolean` prop |
| `TriptychLayout.tsx` | Colored top borders per panel |
| `SignalPanel.tsx` | Cyan-tinted bg + cyan header label |
| `ControlPanel.tsx` | Indigo-tinted bg + indigo tab bar |
| `OrchestratePanel.tsx` | Elevated `surface-overlay` header |
| `VaultItem.tsx` | Gradient active + glow GateDot when active |
| `PinnedChannel.tsx` | Gradient active state |
