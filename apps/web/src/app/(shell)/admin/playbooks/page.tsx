"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  BookMarked,
  GitBranch,
  Shield,
  FileText,
  Users,
  Loader2,
} from "lucide-react";

interface TemplateSummary {
  id: string;
  name: string;
  description: string;
  module: string;
  version: string;
  node_count: number;
  gate_count: number;
}

const MODULE_ICONS: Record<string, typeof FileText> = {
  contracts: FileText,
  crm: Users,
};

const MODULE_COLORS: Record<string, string> = {
  contracts: "text-accent-primary",
  crm: "text-accent-warning",
};

// Fallback templates shown when API is unreachable
const FALLBACK_TEMPLATES: TemplateSummary[] = [
  {
    id: "contract-intake",
    name: "Contract Intake",
    description:
      "Full lifecycle from triage to publish — 7-node DAG with compliance and verification gates.",
    module: "contracts",
    version: "1.0.0",
    node_count: 7,
    gate_count: 2,
  },
  {
    id: "pilot-close",
    name: "Pilot Close",
    description:
      "Convert a successful pilot into a full contract — business case, proposal, negotiation flow.",
    module: "contracts",
    version: "1.0.0",
    node_count: 6,
    gate_count: 2,
  },
  {
    id: "research-deep-dive",
    name: "Research Deep Dive",
    description:
      "Parallel research gathering with analysis, peer review, and synthesis gates.",
    module: "crm",
    version: "1.0.0",
    node_count: 8,
    gate_count: 3,
  },
];

export default function AdminPlaybooksPage() {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromApi, setFromApi] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("airlock_access_token");
    fetch("/api/v1/playbooks/templates", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          templates: TemplateSummary[];
          total: number;
        };
        setTemplates(data.templates);
        setFromApi(true);
      })
      .catch(() => {
        setTemplates(FALLBACK_TEMPLATES);
        setFromApi(false);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-3xl">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold text-text-primary">Playbooks</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Pre-built DAG workflows with Otto archetypes and gate checkpoints.
            </p>
          </div>
          <Link
            href="/admin/playbooks/create"
            className="flex items-center gap-1.5 rounded-md bg-accent-primary px-3 py-1.5 text-sm font-medium text-text-inverse transition-colors hover:bg-accent-primary-hover"
          >
            <Plus size={14} />
            Create a Playbook
          </Link>
        </div>

        {/* Loading */}
        {loading && (
          <div className="mt-12 flex items-center justify-center gap-2 text-text-muted">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Loading templates...</span>
          </div>
        )}

        {/* Template Gallery */}
        {!loading && templates.length > 0 && (
          <>
            <div className="mt-6 mb-4 flex items-center gap-2">
              <BookMarked size={14} className="text-text-muted" />
              <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                {fromApi ? "Available Templates" : "Built-in Templates"}
              </span>
              <span className="text-[10px] text-text-muted">
                ({templates.length})
              </span>
            </div>

            <div className="grid gap-3">
              {templates.map((t) => {
                const Icon = MODULE_ICONS[t.module] || FileText;
                const color = MODULE_COLORS[t.module] || "text-text-muted";

                return (
                  <Link
                    key={t.id}
                    href={`/admin/playbooks/${t.id}`}
                    className="group rounded-lg border border-surface-border bg-surface-raised p-4 transition-all hover:border-accent-primary/30 hover:bg-surface-overlay"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-overlay">
                          <Icon size={18} className={color} />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent-primary transition-colors">
                            {t.name}
                          </h3>
                          <p className="mt-0.5 text-xs text-text-secondary line-clamp-2">
                            {t.description}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-text-muted">
                        v{t.version}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-4 pl-12">
                      <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                        <GitBranch size={12} />
                        <span>{t.node_count} nodes</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                        <Shield size={12} />
                        <span>{t.gate_count} gates</span>
                      </div>
                      <span className="rounded-full bg-surface-overlay px-2 py-0.5 text-[10px] font-medium text-text-secondary capitalize">
                        {t.module}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>

            {!fromApi && (
              <p className="mt-3 text-[10px] text-text-muted">
                Showing built-in templates. Connect the API for live data.
              </p>
            )}
          </>
        )}

        {/* Empty state (shouldn't happen with fallbacks, but just in case) */}
        {!loading && templates.length === 0 && (
          <div className="mt-6 flex flex-col items-center gap-3 py-12 text-center">
            <BookMarked size={32} className="text-text-muted" />
            <p className="text-sm font-medium text-text-primary">
              No playbooks yet
            </p>
            <p className="text-xs text-text-muted">
              Create your first playbook to define role-specific guidance for
              your team.
            </p>
            <Link
              href="/admin/playbooks/create"
              className="mt-2 flex items-center gap-1.5 rounded-md border border-surface-border px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-surface-overlay hover:text-text-primary"
            >
              <Plus size={14} />
              Create a Playbook
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
