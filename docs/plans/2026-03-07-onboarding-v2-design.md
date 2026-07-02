# Onboarding v2 — Landing, Auth, Wizard, Capability Tree

**Date**: 2026-03-07
**Status**: Approved

## Flow

```
Landing Page (/) → Auth (/onboarding) → Wizard (/onboarding/setup) → Capability Tree (/admin)
```

## Decisions

| Decision           | Choice                                     |
| ------------------ | ------------------------------------------ |
| Wizard scope       | Name only — 1 step                         |
| Landing style      | Hero + single CTA                          |
| Beam edges         | Subtle pulse on satisfied edges            |
| Tree initial state | Fresh (all locked/available by dependency) |
| Architecture       | Route-based (each step is its own route)   |

## Section 1: Landing Page

**Route**: `apps/web/src/app/landing/page.tsx` (outside `(shell)` layout)

Full-screen OLED dark background, centered vertically:

- Airlock logo (text: `AIRLOCK` in `font-mono text-3xl`)
- Tagline: `text-text-secondary`, e.g. "Enterprise data operations, orchestrated."
- "Create Workspace" button: `bg-accent-primary text-surface-base` pill
- "Already have a workspace? Sign in" link (placeholder)

Clicking CTA navigates to `/onboarding`.

## Section 2: Auth Step

**Route**: `apps/web/src/app/onboarding/page.tsx` (modify existing)

Provisions dev auth token, redirects to `/onboarding/setup`.

Future: becomes Google OAuth callback handler. Current: passthrough with dev session provisioning. Shows "Loading workspace..." during transition.

## Section 3: Workspace Wizard

**Route**: `apps/web/src/app/onboarding/setup/page.tsx`

Centered card on dark background (no shell). Single step:

- Header: "Name your workspace"
- Subtitle: "You can change this later"
- Text input (auto-focused, placeholder: "Acme Records")
- "Launch Workspace" button (disabled until name non-empty)

On submit: stores workspace name, calls `initTree(false)`, navigates to `/admin`.

## Section 4: Animated Beam Edges

**File**: `apps/web/src/components/organisms/CapabilityEdge.tsx` (rewrite)

**Satisfied edges** (source configured):

- Thin cyan line (`accent-primary`), 2px
- SVG `<linearGradient>` with animated `<stop>` offset — traveling glow pulse
- ~3s loop, soft glow from source to target

**Unsatisfied edges** (source not configured):

- Static faded line (`surface-border` at 30% opacity), 1px
- Dashed pattern, no animation

Path calculation: `getSmoothStepPath` with `borderRadius: 16`.

## Files

| File                                                   | Action           |
| ------------------------------------------------------ | ---------------- |
| `apps/web/src/app/landing/page.tsx`                    | CREATE           |
| `apps/web/src/app/onboarding/page.tsx`                 | MODIFY           |
| `apps/web/src/app/onboarding/setup/page.tsx`           | MODIFY or CREATE |
| `apps/web/src/components/organisms/CapabilityEdge.tsx` | REWRITE          |
