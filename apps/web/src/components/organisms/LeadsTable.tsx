"use client";

import type { CrmLead } from "@/lib/mock-crm";
import { LEAD_SOURCE_LABELS, LEAD_STAGE_CONFIG } from "@/lib/mock-crm";

interface LeadsTableProps {
  leads: CrmLead[];
}

function scoreColor(score: number | null): string {
  if (score === null) return "text-text-muted";
  if (score >= 70) return "text-accent-success";
  if (score >= 40) return "text-accent-warning";
  return "text-accent-danger";
}

const MATCH_BADGE: Record<string, string> = {
  matched: "",
  unmatched: "text-accent-warning",
  unknown: "text-accent-danger",
};

export default function LeadsTable({ leads }: LeadsTableProps) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-surface-border-subtle bg-surface-overlay">
            <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Lead
            </th>
            <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Source
            </th>
            <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Score
            </th>
            <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Stage
            </th>
            <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Assigned
            </th>
            <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Age
            </th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            const stageConfig = LEAD_STAGE_CONFIG[lead.stage];
            return (
              <tr
                key={lead.id}
                className="border-b border-surface-border-subtle cursor-pointer hover:bg-surface-overlay transition-colors duration-fast"
              >
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-text-primary">
                    {lead.name}
                  </div>
                  {lead.matchStatus !== "matched" && (
                    <div
                      className={`text-[10px] ${MATCH_BADGE[lead.matchStatus]}`}
                    >
                      ({lead.matchStatus})
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-text-secondary">
                  {LEAD_SOURCE_LABELS[lead.source]}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`font-mono text-sm ${scoreColor(lead.score)}`}
                  >
                    {lead.score !== null ? lead.score : "—"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold text-surface-base ${stageConfig.color}`}
                  >
                    {stageConfig.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-text-secondary">
                  {lead.assignedRep || (
                    <span className="text-text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-xs text-text-muted">
                  {lead.ageDays === 0 ? "Today" : `${lead.ageDays}d`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
