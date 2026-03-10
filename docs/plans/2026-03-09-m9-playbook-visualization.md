# M9: Playbook Visualization — Implementation Plan

**Date:** 2026-03-09
**Milestone:** M9 (MAGS Phase 1)
**Location:** `apps/web/src/`

---

## Objective

Build a DAG visualization component that renders playbook node graphs with status indicators, gate badges, and progress tracking. This component lets users see the overall playbook flow, where execution currently is, and which gates are pending.

---

## Deliverables

### 1. Mock Data — `src/lib/mock-playbook-dag.ts`

Types and mock data for DAG visualization. Mirrors the API's PlaybookTemplate/NodeState types.

Types:

- `DAGNodeStatus` — pending, in_progress, completed, blocked, skipped
- `DAGNodeData` — id, name, description, actor, archetype, chamber, status, gate info, position
- `DAGEdgeData` — source, target, status
- `PlaybookDAGData` — nodes, edges, template metadata, progress stats

### 2. DAG Node Component — `src/components/molecules/DAGNode.tsx`

Individual node in the DAG. Shows:

- Node name + actor type icon (Otto=Bot, Human=User, Hybrid=Users)
- Status indicator (colored dot + ring animation for in_progress)
- Chamber color accent
- Gate badge when gate is present (type + status)
- Compact layout for rendering in a vertical/horizontal flow

### 3. PlaybookDAG Component — `src/components/organisms/PlaybookDAG.tsx`

Main DAG visualization rendering nodes and edges in a vertical flow layout.

- Renders nodes in topological order with dependency edges
- Status-aware edge colors (completed=green, active=cyan, pending=gray)
- Gate badges on gated nodes
- Responsive — scrollable in container
- No external graph library — pure CSS/SVG layout for the linear DAG structure

### 4. PlaybookProgress Component — `src/components/molecules/PlaybookProgress.tsx`

Overall playbook completion summary bar.

- Template name + completion percentage
- ProgressBar with dynamic color (red <33%, amber <66%, green >=66%)
- Node status counts (X completed, Y blocked, Z pending)
- Chamber progress indicators

---

## File Changes

### New Files (4)

1. `apps/web/src/lib/mock-playbook-dag.ts`
2. `apps/web/src/components/molecules/DAGNode.tsx`
3. `apps/web/src/components/molecules/PlaybookProgress.tsx`
4. `apps/web/src/components/organisms/PlaybookDAG.tsx`

---

## Implementation Order

1. `mock-playbook-dag.ts` — types and mock data
2. `DAGNode.tsx` — individual node rendering
3. `PlaybookProgress.tsx` — progress summary bar
4. `PlaybookDAG.tsx` — full DAG with nodes + edges

---

## Verification

- `pnpm type-check` — zero errors
- `pnpm lint` — zero warnings
