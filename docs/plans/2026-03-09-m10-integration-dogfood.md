# M10: Integration + Dogfood — Implementation Plan

**Date:** 2026-03-09
**Milestone:** M10 (MAGS Phase 1 Final)
**Location:** `apps/web/src/`

---

## Objective

Wire the full MAGS flow end-to-end using mock data: Forge → Profile → Playbook Suggestion → DAG Engine → Gate UI → Completion. Create a PlaybookView that combines the DAG visualization with inline gate responses, a playbook store for state management, and wire the forge launch to auto-suggest a playbook.

---

## Deliverables

### 1. Playbook Store — `src/stores/playbook.store.ts`

Zustand store managing active playbook state:

- Active playbook DAG data (from mock)
- Selected node (for gate rendering)
- Gate action handler (mock — updates local state)
- Node completion handler
- Progress tracking
- Wire to forge store: when workspace launches, auto-select a playbook

### 2. PlaybookView — `src/components/templates/PlaybookView.tsx`

Template-level component combining DAG + Gates for a full playbook experience:

- Left: PlaybookDAG visualization
- Right: GatePanel for selected node (when gate is pending)
- Top: PlaybookProgress bar
- Node click → shows gate panel for that node

### 3. Playbook Page Route — `src/app/(shell)/(modules)/contracts/playbook/page.tsx`

Route that renders PlaybookView with mock data, accessible from the contracts module.

### 4. Forge → Playbook Wiring

Update `forge.store.ts` launchWorkspace to set a suggested playbook in the playbook store and redirect to the playbook route.

---

## File Changes

### New Files (3)

1. `apps/web/src/stores/playbook.store.ts`
2. `apps/web/src/components/templates/PlaybookView.tsx`
3. `apps/web/src/app/(shell)/(modules)/contracts/playbook/page.tsx`

### Modified Files (1)

4. `apps/web/src/stores/forge.store.ts` — wire launchWorkspace

---

## Verification

- `pnpm type-check` — zero errors
- `pnpm lint` — zero warnings
