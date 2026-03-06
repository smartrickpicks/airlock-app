"use client";

import { useEffect } from "react";
import { Bell, MessageSquare, Bot } from "lucide-react";
import { useEventStore } from "@/stores/event.store";
import type { VaultEvent } from "@/stores/event.store";

interface SignalPanelProps {
  width: number;
  collapsed: boolean;
  onOverlayToggle: () => void;
  vaultId?: string;
}

const EVENT_STYLES: Record<string, { border: string; label: string }> = {
  vault_created: { border: "border-l-accent-primary", label: "Vault Created" },
  vault_updated: {
    border: "border-l-accent-secondary",
    label: "Vault Updated",
  },
  chamber_advanced: {
    border: "border-l-gate-green",
    label: "Chamber Advanced",
  },
  vault_archived: { border: "border-l-gate-red", label: "Vault Archived" },
  gate_cleared: { border: "border-l-gate-green", label: "Gate Cleared" },
  extraction_complete: {
    border: "border-l-accent-secondary",
    label: "Extraction Complete",
  },
  member_added: { border: "border-l-accent-primary", label: "Member Added" },
};

function formatTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getEventDescription(event: VaultEvent): string {
  const p = event.payload;
  switch (event.event_type) {
    case "vault_created":
      return `New ${(p.vault_type as string) || "vault"}: "${(p.name as string) || ""}"`;
    case "chamber_advanced":
      return `Moved to ${(p.chamber as string) || "next chamber"} — ${((p.vault_name as string) || "").slice(0, 40)}`;
    case "vault_archived":
      return `Archived: "${(p.name as string) || ""}"`;
    case "gate_cleared":
      return `${((p.gate as string) || "").replace("gate_", "")} passed — ${(p.vault_name as string) || ""}`;
    case "extraction_complete":
      return `${(p.fields_extracted as number) || 0} fields extracted (${Math.round(((p.confidence as number) || 0) * 100)}% avg)`;
    default:
      return event.event_type.replace(/_/g, " ");
  }
}

export default function SignalPanel({
  width,
  collapsed,
  onOverlayToggle,
  vaultId,
}: SignalPanelProps) {
  const { events, fetchVaultEvents, fetchRecentEvents } = useEventStore();

  useEffect(() => {
    if (vaultId) {
      fetchVaultEvents(vaultId);
    } else {
      fetchRecentEvents();
    }
  }, [vaultId, fetchVaultEvents, fetchRecentEvents]);

  if (collapsed) {
    return (
      <div
        className="flex h-full flex-shrink-0 flex-col items-center gap-3 border-r border-surface-border bg-surface-raised pt-4"
        style={{ width }}
      >
        <button
          onClick={onOverlayToggle}
          className="cursor-pointer text-text-muted transition-colors duration-fast hover:text-text-secondary"
          aria-label="Open notifications"
        >
          <Bell size={20} />
        </button>
        <button
          onClick={onOverlayToggle}
          className="cursor-pointer text-text-muted transition-colors duration-fast hover:text-text-secondary"
          aria-label="Open messages"
        >
          <MessageSquare size={20} />
        </button>
        <button
          onClick={onOverlayToggle}
          className="cursor-pointer text-text-muted transition-colors duration-fast hover:text-text-secondary"
          aria-label="Open AI agent"
        >
          <Bot size={20} />
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex h-full flex-shrink-0 flex-col overflow-hidden border-r border-surface-border"
      style={{ background: "var(--panel-signal-bg)" }}
      style={{ width }}
    >
      <div className="flex h-10 flex-shrink-0 items-center justify-between px-4" style={{ background: "var(--panel-signal-header)" }}>
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--panel-signal-accent)" }}>
          Signal
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {events.length === 0 ? (
          <p className="py-4 text-center text-xs text-text-muted">
            No events yet
          </p>
        ) : (
          events.map((event) => {
            const style = EVENT_STYLES[event.event_type] || {
              border: "border-l-surface-border",
              label: event.event_type,
            };
            return (
              <div
                key={event.id}
                className={`relative mb-2 rounded-md border-l-[3px] bg-surface-overlay p-3 ${style.border}`}
              >
                <h4 className="pr-14 text-[13px] font-semibold text-text-primary">
                  {style.label}
                </h4>
                <p className="mt-1 text-xs text-text-muted">
                  {getEventDescription(event)}
                </p>
                <span className="absolute right-3 top-3 font-mono text-[11px] text-text-muted">
                  {formatTimeAgo(event.created_at)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
