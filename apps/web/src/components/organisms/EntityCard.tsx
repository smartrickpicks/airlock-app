"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import type {
  ParentVaultCard,
  ChildVault,
  GateStatus,
} from "@/lib/mock-review-queue";

interface EntityCardProps {
  card: ParentVaultCard;
  expanded: boolean;
  onToggle: () => void;
}

const GATE_DOT: Record<GateStatus, string> = {
  pass: "bg-accent-success",
  review: "bg-chamber-review",
  fail: "bg-accent-danger",
  failed: "bg-accent-danger",
};

function progressColor(percent: number): string {
  if (percent < 30) return "bg-accent-danger";
  if (percent <= 60) return "bg-accent-warning";
  return "bg-accent-success";
}

function ActionCount({ label, count }: { label: string; count: number }) {
  const urgent = count > 3;
  return (
    <span
      className={`text-xs ${urgent ? "text-accent-warning font-semibold" : "text-text-muted"}`}
    >
      {count} {label}
    </span>
  );
}

function ChildRow({ child }: { child: ChildVault }) {
  return (
    <tr className="border-b border-surface-border-subtle hover:bg-surface-overlay cursor-pointer transition-colors duration-fast">
      <td className="px-3 py-2 text-sm text-text-primary">
        {child.counterparty}
      </td>
      <td className="px-3 py-2 text-sm text-text-secondary">{child.builder}</td>
      <td className="px-3 py-2 text-sm">
        <span
          className={`font-mono ${
            child.healthScore < 40
              ? "text-accent-danger"
              : child.healthScore < 60
                ? "text-accent-warning"
                : "text-accent-success"
          }`}
        >
          {child.healthScore}
        </span>
      </td>
      <td className="px-3 py-2">
        <span className="flex items-center gap-1.5 text-sm text-text-secondary">
          <span
            className={`inline-block h-2 w-2 rounded-full ${GATE_DOT[child.gateStatus]}`}
          />
          {child.gateLabel}
        </span>
      </td>
      <td className="px-3 py-2 text-sm text-text-muted text-right">
        {child.itemCount}
      </td>
    </tr>
  );
}

export default function EntityCard({
  card,
  expanded,
  onToggle,
}: EntityCardProps) {
  const categories = Array.from(new Set(card.children.map((c) => c.category)));

  return (
    <div
      className={`rounded-lg border transition-colors duration-fast ${
        expanded
          ? "border-accent-primary/40 bg-surface-raised"
          : "border-surface-border hover:border-text-muted/30 bg-surface-raised"
      }`}
    >
      <button
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left"
      >
        {expanded ? (
          <ChevronDown size={16} className="text-text-muted flex-shrink-0" />
        ) : (
          <ChevronRight size={16} className="text-text-muted flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text-primary truncate">
              {card.name}
            </span>
            <span className="rounded-full bg-chamber-review/15 px-2 py-0.5 text-[10px] font-medium text-chamber-review">
              {card.typeBadge}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-text-muted">
            <span>{card.vaultCount} vaults</span>
            <span>Health: {card.healthScore}</span>
          </div>
          <div className="mt-0.5 text-xs text-text-secondary">
            {card.assignedBuilders.join(", ")}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-surface-overlay overflow-hidden">
              <div
                className={`h-full rounded-full ${progressColor(card.buildReadyPercent)}`}
                style={{ width: `${card.buildReadyPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-text-muted whitespace-nowrap">
              {card.buildReadyPercent}% build-ready ({card.buildReadyCount}/
              {card.buildReadyTotal})
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-3">
            <ActionCount label="patches" count={card.patches} />
            <ActionCount label="RFIs" count={card.rfis} />
            <ActionCount label="corrections" count={card.corrections} />
            <ActionCount label="anomalies" count={card.anomalies} />
          </div>
        </div>
      </button>

      {expanded && card.children.length > 0 && (
        <div className="border-t border-surface-border-subtle px-4 pb-3 pt-2">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-text-muted">
                <th className="px-3 py-1 text-left font-medium">
                  Counterparty
                </th>
                <th className="px-3 py-1 text-left font-medium">Builder</th>
                <th className="px-3 py-1 text-left font-medium">Health</th>
                <th className="px-3 py-1 text-left font-medium">Status</th>
                <th className="px-3 py-1 text-right font-medium">Count</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => {
                const rows = card.children.filter((c) => c.category === cat);
                return [
                  <tr key={`cat-${cat}`}>
                    <td
                      colSpan={5}
                      className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted"
                    >
                      {cat}
                    </td>
                  </tr>,
                  ...rows.map((child) => (
                    <ChildRow key={child.id} child={child} />
                  )),
                ];
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
