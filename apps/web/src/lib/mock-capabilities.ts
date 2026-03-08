/* ─── Mock Capabilities Data ───────────────────────────────────── */

import type { Node, Edge } from "@xyflow/react";

/* ─── Types ───────────────────────────────────────────────────── */

export type CapabilityId =
  | "workspace"
  | "ai_provider"
  | "data_source"
  | "members"
  | "otto"
  | "modules"
  | "rates"
  | "integrations"
  | "mcp_servers"
  | "workflows"
  | "skills"
  | "feature_flags"
  | "event_bus";

export type CapabilityState = "configured" | "available" | "locked";

export interface CapabilityDefinition {
  id: CapabilityId;
  label: string;
  icon: string; // lucide icon name
  parentIds: CapabilityId[];
  description: string;
  adminRoute: string | null;
  note?: string;
  autoConfigTrigger?: CapabilityId; // auto-configures when this parent is configured
}

export interface CapabilityNodeData {
  [key: string]: unknown;
  label: string;
  icon: string;
  state: CapabilityState;
  adminRoute: string | null;
  note?: string;
  capabilityId: CapabilityId;
}

/* ─── Definitions ─────────────────────────────────────────────── */

export const CAPABILITY_DEFINITIONS: CapabilityDefinition[] = [
  {
    id: "workspace",
    label: "Workspace",
    icon: "Cloud",
    parentIds: [],
    description: "Top-level workspace configuration",
    adminRoute: "/admin",
  },
  {
    id: "ai_provider",
    label: "AI Provider",
    icon: "Brain",
    parentIds: ["workspace"],
    description: "Configure AI model provider for extraction and OTTO",
    adminRoute: "/admin/ai-provider",
  },
  {
    id: "data_source",
    label: "Data Source",
    icon: "Database",
    parentIds: ["workspace"],
    description: "Connect document ingestion sources",
    adminRoute: "/admin/data-source",
  },
  {
    id: "members",
    label: "Members",
    icon: "Users",
    parentIds: ["workspace"],
    description: "Invite and manage workspace members",
    adminRoute: "/admin/members",
  },
  {
    id: "otto",
    label: "OTTO",
    icon: "Lock",
    parentIds: ["ai_provider"],
    description: "AI assistant — auto-configured upon AI Provider setup",
    adminRoute: null,
    note: "Note: OTTO auto-configured upon AI Provider setup.",
    autoConfigTrigger: "ai_provider",
  },
  {
    id: "modules",
    label: "Modules",
    icon: "Cpu",
    parentIds: ["workspace"],
    description: "Enable Contracts, CRM, Tasks, Calendar, Documents",
    adminRoute: "/admin/modules",
  },
  {
    id: "rates",
    label: "Rates",
    icon: "Shield",
    parentIds: ["workspace"],
    description: "Configure rate limits and quotas",
    adminRoute: "/admin/rates",
  },
  {
    id: "integrations",
    label: "Integrations",
    icon: "Plug",
    parentIds: ["workspace"],
    description: "OAuth connectors and third-party integrations",
    adminRoute: "/admin/integrations",
  },
  {
    id: "mcp_servers",
    label: "MCP Servers",
    icon: "Server",
    parentIds: ["otto"],
    description: "Model Context Protocol server configuration",
    adminRoute: "/admin/mcp-servers",
  },
  {
    id: "workflows",
    label: "Workflows",
    icon: "GitBranch",
    parentIds: ["modules"],
    description: "Automation workflow engine",
    adminRoute: "/admin/workflows",
  },
  {
    id: "skills",
    label: "Skills",
    icon: "Zap",
    parentIds: ["mcp_servers"],
    description: "OTTO skill packs and custom skills",
    adminRoute: "/admin/skills",
  },
  {
    id: "feature_flags",
    label: "Feature Flags",
    icon: "ToggleLeft",
    parentIds: ["workflows"],
    description: "Feature control plane toggles",
    adminRoute: "/admin/features",
  },
  {
    id: "event_bus",
    label: "Event Bus",
    icon: "Radio",
    parentIds: ["workflows"],
    description: "BullMQ event queue monitoring",
    adminRoute: "/admin/event-bus",
  },
];

/* ─── Positions (5-row tree layout) ───────────────────────────── */

const ROW_GAP = 180;
const COL_GAP = 200;

function centeredX(count: number, index: number): number {
  const totalWidth = (count - 1) * COL_GAP;
  return -totalWidth / 2 + index * COL_GAP;
}

export const CAPABILITY_POSITIONS: Record<
  CapabilityId,
  { x: number; y: number }
> = {
  // Row 0 — root
  workspace: { x: 0, y: 0 },
  // Row 1 — workspace children
  ai_provider: { x: centeredX(3, 0), y: ROW_GAP },
  data_source: { x: centeredX(3, 1), y: ROW_GAP },
  members: { x: centeredX(3, 2), y: ROW_GAP },
  // Row 2 — second-level children
  otto: { x: centeredX(4, 0), y: ROW_GAP * 2 },
  modules: { x: centeredX(4, 1), y: ROW_GAP * 2 },
  rates: { x: centeredX(4, 2), y: ROW_GAP * 2 },
  integrations: { x: centeredX(4, 3), y: ROW_GAP * 2 },
  // Row 3
  mcp_servers: { x: centeredX(2, 0), y: ROW_GAP * 3 },
  workflows: { x: centeredX(2, 1), y: ROW_GAP * 3 },
  // Row 4
  skills: { x: centeredX(3, 0), y: ROW_GAP * 4 },
  feature_flags: { x: centeredX(3, 1), y: ROW_GAP * 4 },
  event_bus: { x: centeredX(3, 2), y: ROW_GAP * 4 },
};

/* ─── State Derivation ────────────────────────────────────────── */

export function deriveCapabilityStates(
  configuredIds: Set<CapabilityId>,
): Record<CapabilityId, CapabilityState> {
  const states: Record<string, CapabilityState> = {};

  for (const cap of CAPABILITY_DEFINITIONS) {
    if (configuredIds.has(cap.id)) {
      states[cap.id] = "configured";
    } else if (
      cap.parentIds.length === 0 ||
      cap.parentIds.every((pid) => configuredIds.has(pid as CapabilityId))
    ) {
      states[cap.id] = "available";
    } else {
      states[cap.id] = "locked";
    }
  }

  return states as Record<CapabilityId, CapabilityState>;
}

/* ─── Next Recommended ────────────────────────────────────────── */

const PRIORITY_ORDER: CapabilityId[] = [
  "ai_provider",
  "data_source",
  "members",
  "modules",
  "rates",
  "integrations",
  "mcp_servers",
  "workflows",
  "skills",
  "feature_flags",
  "event_bus",
];

export function getNextRecommended(
  states: Record<CapabilityId, CapabilityState>,
): CapabilityDefinition | null {
  for (const id of PRIORITY_ORDER) {
    if (states[id] === "available") {
      return CAPABILITY_DEFINITIONS.find((c) => c.id === id) ?? null;
    }
  }
  return null;
}

/* ─── Unlock Description ──────────────────────────────────────── */

export function getUnlockDescription(capId: CapabilityId): string {
  const dependents = CAPABILITY_DEFINITIONS.filter((c) =>
    c.parentIds.includes(capId),
  );
  if (dependents.length === 0) return "";
  const names = dependents.map((d) => d.label).join(" and ");
  return `to unlock ${names}`;
}

/* ─── React Flow Node/Edge Generation ─────────────────────────── */

export function buildCapabilityNodes(
  states: Record<CapabilityId, CapabilityState>,
): Node<CapabilityNodeData>[] {
  return CAPABILITY_DEFINITIONS.map((cap) => ({
    id: cap.id,
    type: "capabilityNode",
    position: CAPABILITY_POSITIONS[cap.id],
    data: {
      label: cap.label,
      icon: cap.icon,
      state: states[cap.id],
      adminRoute: cap.adminRoute,
      note: cap.note,
      capabilityId: cap.id,
    },
    draggable: false,
    connectable: false,
  }));
}

export function buildCapabilityEdges(
  states: Record<CapabilityId, CapabilityState>,
): Edge[] {
  const edges: Edge[] = [];

  for (const cap of CAPABILITY_DEFINITIONS) {
    for (const parentId of cap.parentIds) {
      const sourceState = states[parentId as CapabilityId];
      const targetState = states[cap.id];

      let stroke = "var(--color-surface-border)";
      let strokeWidth = 1;
      let strokeDasharray: string | undefined;

      if (sourceState === "configured" && targetState === "configured") {
        stroke = "var(--color-accent-primary)";
        strokeWidth = 2;
      } else if (sourceState === "configured" && targetState === "available") {
        stroke = "var(--color-text-muted)";
        strokeWidth = 2;
        strokeDasharray = "6 4";
      }

      edges.push({
        id: `${parentId}-${cap.id}`,
        source: parentId,
        target: cap.id,
        type: "smoothstep",
        style: { stroke, strokeWidth, strokeDasharray },
      });
    }
  }

  return edges;
}

/* ─── Initial Configured State (workspace only) ───────────────── */

export const INITIAL_CONFIGURED = new Set<CapabilityId>(["workspace"]);

/* ─── Capability count ────────────────────────────────────────── */

export const TOTAL_CAPABILITIES = CAPABILITY_DEFINITIONS.length;
