import { create } from "zustand";
import type { Node, Edge } from "@xyflow/react";
import { apiFetch } from "@/lib/api";
import type { VaultEvent } from "@/stores/event.store";
import type { WorkflowNodeData } from "@/lib/mock-workflows";
import { AUDIT_EVENT_CONFIG, getMockAuditTrail } from "@/lib/mock-audit-trail";
import { getWorkspaceMode } from "@/stores/onboarding.store";

/* ── Pure transform: events → React Flow graph ────────── */

function buildDescription(event: VaultEvent): string {
  const p = event.payload;
  switch (event.event_type) {
    case "vault_created":
      return (p.chamber as string) ?? "new vault";
    case "extraction_complete":
      return `${p.fields_extracted ?? 0} fields, ${Math.round(((p.confidence as number) ?? 0) * 100)}%`;
    case "gate_cleared":
      return (p.gate as string)?.replace("gate_", "") ?? "gate passed";
    case "chamber_advanced":
      return `${p.from ?? "?"} \u2192 ${p.to ?? "?"}`;
    case "vault_updated":
      return Array.isArray(p.fields_modified)
        ? `${p.fields_modified.length} fields`
        : "fields updated";
    case "vault_archived":
      return "archived";
    case "member_added":
      return (p.member_name as string) ?? "member added";
    case "member_removed":
      return (p.member_name as string) ?? "member removed";
    default:
      return event.event_type;
  }
}

export function eventsToFlow(events: VaultEvent[]): {
  nodes: Node<WorkflowNodeData>[];
  edges: Edge[];
} {
  const sorted = [...events].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const nodes: Node<WorkflowNodeData>[] = sorted.map((evt, i) => {
    const config = AUDIT_EVENT_CONFIG[evt.event_type] ?? {
      category: "action" as const,
      nodeType: "log_event" as const,
      label: evt.event_type,
    };

    return {
      id: evt.id,
      type: "workflowNode",
      position: { x: 0, y: 0 },
      data: {
        label: config.label,
        nodeType: config.nodeType,
        category: config.category,
        description: buildDescription(evt),
      },
      draggable: false,
      connectable: false,
    } satisfies Node<WorkflowNodeData>;
  });

  const edges: Edge[] = sorted.slice(1).map((evt, i) => ({
    id: `audit-edge-${i}`,
    source: sorted[i].id,
    target: evt.id,
    type: "smoothstep",
    style: { stroke: "var(--color-text-muted)", strokeWidth: 2 },
  }));

  return { nodes, edges };
}

/* ── Store ─────────────────────────────────────────────── */

interface AuditTrailState {
  events: VaultEvent[];
  nodes: Node<WorkflowNodeData>[];
  edges: Edge[];
  isLoading: boolean;
  fullScreenOpen: boolean;

  fetchAuditTrail: (vaultId: string) => Promise<void>;
  setFullScreenOpen: (open: boolean) => void;
}

export const useAuditTrailStore = create<AuditTrailState>((set) => ({
  events: [],
  nodes: [],
  edges: [],
  isLoading: false,
  fullScreenOpen: false,

  fetchAuditTrail: async (vaultId) => {
    set({ isLoading: true });
    try {
      const data = await apiFetch<{ events: VaultEvent[] }>(
        `/api/v1/events/vault/${vaultId}`,
      );
      const { nodes, edges } = eventsToFlow(data.events);
      set({ events: data.events, nodes, edges, isLoading: false });
    } catch {
      if (getWorkspaceMode() === "clean") {
        set({ events: [], nodes: [], edges: [], isLoading: false });
      } else {
        const mockEvents = getMockAuditTrail(vaultId);
        const { nodes, edges } = eventsToFlow(mockEvents);
        set({ events: mockEvents, nodes, edges, isLoading: false });
      }
    }
  },

  setFullScreenOpen: (open) => set({ fullScreenOpen: open }),
}));
