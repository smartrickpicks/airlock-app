"use client";

import type { CrmAccount, AccountSegment } from "@/lib/mock-crm";
import { SEGMENT_LABELS } from "@/lib/mock-crm";

interface AccountsTableProps {
  accounts: CrmAccount[];
  onSelectAccount?: (accountId: string) => void;
}

const SEGMENT_COLORS: Record<AccountSegment, string> = {
  enterprise: "bg-chamber-review/15 text-chamber-review",
  mid_market: "bg-accent-primary/15 text-accent-primary",
  smb: "bg-accent-warning/15 text-accent-warning",
};

function healthColor(score: number): string {
  if (score >= 80) return "text-accent-success";
  if (score >= 50) return "text-accent-warning";
  return "text-accent-danger";
}

function trendArrow(trend: number): string {
  if (trend > 0) return `+${trend} ↑`;
  if (trend < 0) return `${trend} ↓`;
  return "—";
}

function trendColor(trend: number): string {
  if (trend > 0) return "text-accent-success";
  if (trend < 0) return "text-accent-danger";
  return "text-text-muted";
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function AccountsTable({
  accounts,
  onSelectAccount,
}: AccountsTableProps) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-surface-border-subtle bg-surface-overlay">
            <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Account
            </th>
            <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Segment
            </th>
            <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Health
            </th>
            <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Deals
            </th>
            <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Value
            </th>
            <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Contacts
            </th>
            <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Last Contact
            </th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => (
            <tr
              key={account.id}
              onClick={() => onSelectAccount?.(account.id)}
              className="border-b border-surface-border-subtle cursor-pointer hover:bg-surface-overlay transition-colors duration-fast"
            >
              <td className="px-4 py-3 text-sm font-medium text-text-primary">
                {account.name}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${SEGMENT_COLORS[account.segment]}`}
                >
                  {SEGMENT_LABELS[account.segment]}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`font-mono text-sm font-medium ${healthColor(account.healthScore)}`}
                  >
                    {account.healthScore}
                  </span>
                  <span
                    className={`text-[10px] ${trendColor(account.healthTrend)}`}
                  >
                    {trendArrow(account.healthTrend)}
                  </span>
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-text-secondary">
                {account.dealCount}
              </td>
              <td className="px-4 py-3 text-right text-sm font-mono text-text-primary">
                ${account.totalValue.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-sm text-text-secondary">
                {account.contacts.length}
              </td>
              <td className="px-4 py-3 text-xs text-text-muted">
                {relativeTime(account.lastContact)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
