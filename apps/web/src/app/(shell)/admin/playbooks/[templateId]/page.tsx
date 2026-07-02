"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Play, Loader2, GitBranch, Shield } from "lucide-react";
import { usePlaybookStore } from "@/stores/playbook.store";
import PlaybookView from "@/components/templates/PlaybookView";
import type {
  PlaybookDAGData,
  DAGNodeData,
  DAGEdgeData,
  Chamber,
  ActorType,
} from "@/lib/mock-playbook-dag";

interface ApiGate {
  type: "verification" | "approval" | "density" | "decision" | "convergence";
  required_approvals: number;
  roles: string[];
  description: string | null;
}

interface ApiNode {
  id: string;
  name: string;
  description: string;
  actor: ActorType;
  otto_archetype: string | null;
  chamber: string;
  team_type: string | null;
  depends_on: string[];
  gate: ApiGate | null;
}

interface ApiTemplate {
  id: string;
  name: string;
  description: string;
  module: string;
  version: string;
  team_composition: string | null;
  nodes: ApiNode[];
}

function mapToDAGData(t: ApiTemplate): PlaybookDAGData {
  const nodes: DAGNodeData[] = t.nodes.map((n) => ({
    id: n.id,
    name: n.name,
    description: n.description,
    actor: n.actor,
    archetype: n.otto_archetype || "executor",
    chamber: n.chamber as Chamber,
    status: "pending",
    dependsOn: n.depends_on,
    gate: n.gate
      ? {
          type: n.gate.type,
          status: "pending" as const,
          requiredApprovals: n.gate.required_approvals,
          currentApprovals: 0,
          roles: n.gate.roles,
          description: n.gate.description || "",
        }
      : null,
  }));

  // Build edges from depends_on
  const edges: DAGEdgeData[] = [];
  for (const node of t.nodes) {
    for (const dep of node.depends_on) {
      edges.push({ source: dep, target: node.id });
    }
  }

  return {
    templateId: t.id,
    templateName: t.name,
    templateDescription: t.description,
    instanceId: `preview_${t.id}`,
    nodes,
    edges,
  };
}

export default function PlaybookTemplatePage() {
  const params = useParams();
  const templateId = params.templateId as string;
  const setActivePlaybook = usePlaybookStore((s) => s.setActivePlaybook);
  const reset = usePlaybookStore((s) => s.reset);

  const [template, setTemplate] = useState<ApiTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    reset();
    const token = localStorage.getItem("airlock_access_token");
    fetch(`/api/v1/playbooks/templates/${templateId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Template not found (${res.status})`);
        const data = (await res.json()) as ApiTemplate;
        setTemplate(data);
        setActivePlaybook(mapToDAGData(data));
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load"),
      )
      .finally(() => setLoading(false));

    return () => reset();
  }, [templateId, setActivePlaybook, reset]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 size={20} className="animate-spin text-text-muted" />
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="p-6">
        <Link
          href="/admin/playbooks"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft size={14} />
          Back to Playbooks
        </Link>
        <p className="text-sm text-accent-danger">{error || "Not found"}</p>
      </div>
    );
  }

  const gateCount = template.nodes.filter((n) => n.gate).length;

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Breadcrumb + header */}
      <Link
        href="/admin/playbooks"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft size={14} />
        Playbooks
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold text-text-primary">
            {template.name}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {template.description}
          </p>
          <div className="mt-2 flex items-center gap-4 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <GitBranch size={12} />
              {template.nodes.length} nodes
            </span>
            <span className="flex items-center gap-1">
              <Shield size={12} />
              {gateCount} gates
            </span>
            <span className="capitalize">{template.module}</span>
            <span className="font-mono">v{template.version}</span>
            {template.team_composition && (
              <span className="rounded-full bg-surface-overlay px-2 py-0.5">
                {template.team_composition}
              </span>
            )}
          </div>
        </div>
        <button className="flex items-center gap-1.5 rounded-md bg-accent-primary px-3 py-1.5 text-sm font-medium text-text-inverse transition-colors hover:bg-accent-primary-hover">
          <Play size={14} />
          Launch Playbook
        </button>
      </div>

      {/* DAG view */}
      <PlaybookView readOnly />
    </div>
  );
}
