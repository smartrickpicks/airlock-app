"use client";

import { useEffect, useState } from "react";

type Report = {
  id: string;
  command: string;
  query: string;
  created_at: string;
  consensus_score: number;
  guardian_gate: string;
  decision_status: string;
  council_count: number;
};

type RepoRelay = {
  repo: string;
  last_refreshed?: string;
  branch?: string;
  recent_commits?: string[];
  stale?: boolean;
  status?: string;
};

type PersonaRelay = {
  persona: string;
  last_updated?: string;
  current_concerns?: string[];
  current_opportunities?: string[];
  stale?: boolean;
  status?: string;
};

type Tab = "reports" | "relays";

export default function ConstellationPage() {
  const [tab, setTab] = useState<Tab>("reports");
  const [reports, setReports] = useState<Report[]>([]);
  const [repoRelays, setRepoRelays] = useState<RepoRelay[]>([]);
  const [personaRelays, setPersonaRelays] = useState<PersonaRelay[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [fullReport, setFullReport] = useState<any>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [reportsRes, repoRes, personaRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/constellation/reports`).then((r) => r.json()),
        fetch(`${API_BASE}/api/v1/constellation/relays/repos`).then((r) =>
          r.json(),
        ),
        fetch(`${API_BASE}/api/v1/constellation/relays/personas`).then((r) =>
          r.json(),
        ),
      ]);
      setReports(reportsRes.reports || []);
      setRepoRelays(repoRes.relays || []);
      setPersonaRelays(personaRes.relays || []);
    } catch (err) {
      console.warn("Failed to fetch constellation data:", err);
    }
    setLoading(false);
  }

  async function loadFullReport(reportId: string) {
    if (expandedReport === reportId) {
      setExpandedReport(null);
      setFullReport(null);
      return;
    }
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/constellation/reports/${reportId}`,
      );
      const data = await res.json();
      setFullReport(data);
      setExpandedReport(reportId);
    } catch (err) {
      console.warn("Failed to load report:", err);
    }
  }

  async function handleDecision(reportId: string, action: string) {
    try {
      await fetch(
        `${API_BASE}/api/v1/constellation/reports/${reportId}/decision`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, reason: "" }),
        },
      );
      fetchData();
    } catch (err) {
      console.warn("Decision update failed:", err);
    }
  }

  async function refreshRelays() {
    try {
      await fetch(`${API_BASE}/api/v1/constellation/relays/refresh`, {
        method: "POST",
      });
      fetchData();
    } catch (err) {
      console.warn("Relay refresh failed:", err);
    }
  }

  function freshnessColor(stale?: boolean, lastTime?: string): string {
    if (stale || !lastTime) return "text-red-400";
    const mins = (Date.now() - new Date(lastTime).getTime()) / 60000;
    if (mins < 15) return "text-green-400";
    if (mins < 30) return "text-yellow-400";
    return "text-red-400";
  }

  function gateColor(gate: string): string {
    if (gate === "HARD_DISAGREE") return "text-amber-400";
    return "text-green-400";
  }

  function statusBadge(status: string): string {
    const colors: Record<string, string> = {
      INFORMATIONAL: "bg-blue-500/20 text-blue-300",
      AWAITING_ZAC: "bg-amber-500/20 text-amber-300",
      BLOCKED: "bg-red-500/20 text-red-300",
      OVERRIDDEN: "bg-purple-500/20 text-purple-300",
      ACCEPTED: "bg-green-500/20 text-green-300",
    };
    return colors[status] || "bg-gray-500/20 text-gray-300";
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">
          Constellation Command
        </h1>
        <div className="flex gap-2">
          {(["reports", "relays"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-accent/20 text-accent"
                  : "bg-surface-overlay text-text-muted hover:text-text-primary"
              }`}
            >
              {t === "reports" ? "Reports" : "Relay Status"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-text-muted text-center py-12">
          Loading constellation data...
        </div>
      ) : tab === "reports" ? (
        <div className="space-y-3">
          {reports.length === 0 ? (
            <div className="text-text-muted text-center py-12">
              No constellation reports yet. Run{" "}
              <code>/constellation discover</code> to create one.
            </div>
          ) : (
            reports.map((r) => (
              <div
                key={r.id}
                className="bg-surface-overlay rounded-xl border border-white/5"
              >
                <button
                  onClick={() => loadFullReport(r.id)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors rounded-xl"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono uppercase text-text-muted w-20">
                      {r.command}
                    </span>
                    <span className="text-text-primary">{r.query || "—"}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-text-muted">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                    <span className="text-sm">
                      Conviction: <strong>{r.consensus_score}</strong>
                    </span>
                    <span className={`text-sm ${gateColor(r.guardian_gate)}`}>
                      {r.guardian_gate === "HARD_DISAGREE"
                        ? "⚠ BLOCKED"
                        : "✓ PASS"}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${statusBadge(r.decision_status)}`}
                    >
                      {r.decision_status}
                    </span>
                  </div>
                </button>

                {expandedReport === r.id && fullReport && (
                  <div className="px-5 pb-5 space-y-4 border-t border-white/5 pt-4">
                    <div>
                      <h3 className="text-sm font-semibold text-text-muted mb-1">
                        Briefing
                      </h3>
                      <p className="text-text-primary text-sm">
                        {fullReport.briefing}
                      </p>
                    </div>

                    {fullReport.perspectives?.map((p: any) => (
                      <div
                        key={p.persona}
                        className="bg-surface-base rounded-lg p-4"
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold text-text-primary capitalize">
                            {p.persona}
                          </span>
                          <span className="text-sm text-text-muted">
                            Conviction: {p.conviction}
                          </span>
                        </div>
                        <p className="text-sm text-text-primary mb-2">
                          {p.position}
                        </p>
                        {p.concerns?.length > 0 && (
                          <div className="text-sm">
                            <span className="text-red-400 font-medium">
                              Concerns:
                            </span>
                            <ul className="ml-4 list-disc text-text-muted">
                              {p.concerns.map((c: string, i: number) => (
                                <li key={i}>{c}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {p.opportunities?.length > 0 && (
                          <div className="text-sm mt-1">
                            <span className="text-green-400 font-medium">
                              Opportunities:
                            </span>
                            <ul className="ml-4 list-disc text-text-muted">
                              {p.opportunities.map((o: string, i: number) => (
                                <li key={i}>{o}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}

                    <div className="bg-surface-base rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-text-muted mb-1">
                        Captain Synthesis
                      </h3>
                      <p className="text-sm text-text-primary">
                        {fullReport.synthesis}
                      </p>
                    </div>

                    {(r.decision_status === "AWAITING_ZAC" ||
                      r.decision_status === "BLOCKED") && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleDecision(r.id, "accept")}
                          className="px-4 py-2 bg-green-500/20 text-green-300 rounded-lg text-sm hover:bg-green-500/30 transition-colors"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleDecision(r.id, "override")}
                          className="px-4 py-2 bg-amber-500/20 text-amber-300 rounded-lg text-sm hover:bg-amber-500/30 transition-colors"
                        >
                          Override
                        </button>
                        <button
                          onClick={() => handleDecision(r.id, "dismiss")}
                          className="px-4 py-2 bg-gray-500/20 text-gray-300 rounded-lg text-sm hover:bg-gray-500/30 transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-text-primary">
              Repo Relays
            </h2>
            <button
              onClick={refreshRelays}
              className="px-4 py-2 bg-accent/20 text-accent rounded-lg text-sm hover:bg-accent/30 transition-colors"
            >
              Refresh All
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {repoRelays.map((r) => (
              <div
                key={r.repo}
                className="bg-surface-overlay rounded-xl p-4 border border-white/5"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-text-primary">
                    {r.repo}
                  </span>
                  <span
                    className={`text-xs ${freshnessColor(r.stale, r.last_refreshed)}`}
                  >
                    {r.status === "no_relay"
                      ? "No data"
                      : r.stale
                        ? "Stale"
                        : "Fresh"}
                  </span>
                </div>
                {r.branch && (
                  <div className="text-xs text-text-muted">
                    Branch: {r.branch} | Commits:{" "}
                    {r.recent_commits?.length || 0}
                  </div>
                )}
                {r.last_refreshed && (
                  <div className="text-xs text-text-muted mt-1">
                    Updated: {new Date(r.last_refreshed).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>

          <h2 className="text-lg font-semibold text-text-primary mt-6">
            Persona Relays
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {personaRelays.map((p) => (
              <div
                key={p.persona}
                className="bg-surface-overlay rounded-xl p-4 border border-white/5"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-text-primary capitalize">
                    {p.persona}
                  </span>
                  <span
                    className={`text-xs ${freshnessColor(p.stale, p.last_updated)}`}
                  >
                    {p.status === "no_relay"
                      ? "No data"
                      : p.stale
                        ? "Stale"
                        : "Fresh"}
                  </span>
                </div>
                {p.current_concerns && p.current_concerns.length > 0 && (
                  <div className="text-xs text-text-muted">
                    Concerns: {p.current_concerns.length}
                  </div>
                )}
                {p.last_updated && (
                  <div className="text-xs text-text-muted mt-1">
                    Updated: {new Date(p.last_updated).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
