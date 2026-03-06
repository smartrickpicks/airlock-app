"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Inbox, FileCheck, Users, Zap, Activity } from "lucide-react";
import GateDot from "@/components/atoms/GateDot";
import OnboardingChecklist from "@/components/molecules/OnboardingChecklist";
import WelcomeModal from "@/components/organisms/WelcomeModal";
import { useAuthStore } from "@/stores/auth.store";
import { useVaultStore } from "@/stores/vault.store";
import { useEventStore } from "@/stores/event.store";
import { useOnboardingStore } from "@/stores/onboarding.store";
import type { VaultEvent } from "@/stores/event.store";

const CHAMBERS = ["discover", "build", "review", "ship"] as const;

const CHAMBER_LABELS: Record<string, string> = {
  discover: "Discover",
  build: "Build",
  review: "Review",
  ship: "Ship",
};

const CHAMBER_BORDER: Record<string, string> = {
  discover: "border-t-chamber-discover",
  build: "border-t-chamber-build",
  review: "border-t-chamber-review",
  ship: "border-t-chamber-ship",
};

const CHAMBER_TEXT: Record<string, string> = {
  discover: "text-chamber-discover",
  build: "text-chamber-build",
  review: "text-chamber-review",
  ship: "text-chamber-ship",
};

// Static signal cards — will come from API later
const SIGNAL_CARDS = [
  {
    icon: AlertTriangle,
    label: "Critical Gates",
    value: "3 waiting",
    accent: "text-gate-red",
    border: "border-l-gate-red",
  },
  {
    icon: Inbox,
    label: "Inbound Threads",
    value: "5 unread",
    accent: "text-accent-primary",
    border: "border-l-accent-primary",
  },
  {
    icon: FileCheck,
    label: "Contracts Ready",
    value: "2 ready for signature",
    accent: "text-gate-green",
    border: "border-l-gate-green",
  },
  {
    icon: Users,
    label: "Team Coverage",
    value: "1 owner missing",
    accent: "text-gate-amber",
    border: "border-l-gate-amber",
  },
];

function formatTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function eventSummary(event: VaultEvent): string {
  const p = event.payload;
  switch (event.event_type) {
    case "vault_created":
      return `Created "${(p.name as string) || "vault"}"`;
    case "chamber_advanced":
      return `${(p.vault_name as string) || "Vault"} → ${(p.chamber as string) || ""}`;
    case "vault_archived":
      return `Archived "${(p.name as string) || ""}"`;
    case "gate_cleared":
      return `Gate cleared: ${(p.vault_name as string) || ""}`;
    case "extraction_complete":
      return `Extraction: ${(p.fields_extracted as number) || 0} fields`;
    default:
      return event.event_type.replace(/_/g, " ");
  }
}

export default function Home() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { vaults, fetchVaults } = useVaultStore();
  const { events, fetchRecentEvents } = useEventStore();
  const { welcomeSeen } = useOnboardingStore();
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    fetchVaults({ module_type: "contracts" });
    fetchRecentEvents();
  }, [fetchVaults, fetchRecentEvents]);

  useEffect(() => {
    if (!welcomeSeen) setShowWelcome(true);
  }, [welcomeSeen]);

  const chamberCounts = CHAMBERS.reduce(
    (acc, chamber) => {
      acc[chamber] = vaults.filter((v) => v.chamber === chamber).length;
      return acc;
    },
    {} as Record<string, number>,
  );

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.name.split(" ")[0] ?? "there";

  return (
    <div className="flex h-full overflow-hidden bg-surface-sunken">
      {showWelcome && <WelcomeModal onClose={() => setShowWelcome(false)} />}

      {/* ── SIGNAL panel (left) — cyan identity ── */}
      <aside className="flex w-[272px] flex-shrink-0 flex-col overflow-hidden border-r border-surface-border border-t-2 border-t-panel-signal bg-[var(--panel-signal-bg)]">
        <div className="flex h-11 flex-shrink-0 items-center border-b border-surface-border px-4">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-panel-signal">
            Signals
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {/* Alert cards */}
          {SIGNAL_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className={`rounded-lg border border-surface-border border-l-2 ${card.border} bg-surface-raised px-3 py-2.5`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={13} className={card.accent} />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    {card.label}
                  </span>
                </div>
                <p className={`text-sm font-medium ${card.accent}`}>{card.value}</p>
              </div>
            );
          })}

          {/* Recommended Queue */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
                Recommended Queue
              </span>
              <span className="rounded-full bg-panel-signal/20 px-1.5 py-0.5 text-[10px] font-semibold text-panel-signal">
                {Math.min(vaults.length, 3)} high signal
              </span>
            </div>
            <div className="space-y-1">
              {vaults.slice(0, 3).map((vault) => (
                <button
                  key={vault.id}
                  onClick={() => router.push(`/contracts/${vault.slug}`)}
                  className="w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-left hover:bg-surface-overlay transition-colors"
                >
                  <p className="text-sm font-medium text-text-primary truncate">{vault.name}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {vault.chamber
                      ? `Open ${vault.chamber} gate`
                      : "No gate assigned"}
                  </p>
                </button>
              ))}
              {vaults.length === 0 && (
                <p className="px-3 py-4 text-center text-xs text-text-muted">
                  No signals yet
                </p>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* ── OPERATOR HUB (center) — neutral, main work surface ── */}
      <main className="flex flex-1 flex-col overflow-hidden border-t-2 border-t-surface-border">
        {/* Header */}
        <div className="flex h-11 flex-shrink-0 items-center border-b border-surface-border bg-surface-raised px-6">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
            Operator Hub
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <OnboardingChecklist />

          {/* Greeting */}
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              {greeting}, {firstName}
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Your next moves arrive here by gate, message, workflow, and deadline.
            </p>
          </div>

          {/* Chamber pipeline cards */}
          <section>
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-text-muted">
              Pipeline
            </h2>
            <div className="grid grid-cols-4 gap-3">
              {CHAMBERS.map((chamber) => (
                <button
                  key={chamber}
                  onClick={() => router.push("/contracts/triage")}
                  className={`rounded-lg border border-surface-border bg-surface-raised border-t-2 ${CHAMBER_BORDER[chamber]} p-4 text-left transition-colors hover:bg-surface-overlay`}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <GateDot gate={chamber} />
                    <span
                      className={`text-xs font-semibold uppercase tracking-wider ${CHAMBER_TEXT[chamber]}`}
                    >
                      {CHAMBER_LABELS[chamber]}
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-text-primary">
                    {chamberCounts[chamber]}
                  </p>
                  <p className="mt-1 text-[11px] text-text-muted">
                    {chamberCounts[chamber] === 1 ? "vault" : "vaults"}
                  </p>
                </button>
              ))}
            </div>
          </section>

          {/* My Queue */}
          <section>
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-text-muted">
              My Queue
            </h2>
            <div className="overflow-hidden rounded-lg border border-surface-border bg-surface-raised divide-y divide-surface-border">
              {events.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-text-muted">
                  Nothing in your queue
                </p>
              ) : (
                events.slice(0, 5).map((event) => {
                  const chamber = (
                    (event.payload.chamber as string) || "discover"
                  ) as "discover" | "build" | "review" | "ship";
                  return (
                    <div
                      key={event.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-surface-overlay transition-colors cursor-pointer"
                    >
                      <GateDot gate={chamber} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-text-primary">
                          {eventSummary(event)}
                        </p>
                        <p className="text-xs text-text-muted">
                          {event.event_type.replace(/_/g, " ")}
                        </p>
                      </div>
                      <span className="flex-shrink-0 font-mono text-[11px] text-text-muted">
                        {formatTimeAgo(event.created_at)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </main>

      {/* ── COMMAND CENTER (right) — indigo identity ── */}
      <aside className="flex w-[272px] flex-shrink-0 flex-col overflow-hidden border-l border-surface-border border-t-2 border-t-panel-control bg-[var(--panel-control-bg)]">
        <div className="flex h-11 flex-shrink-0 items-center border-b border-surface-border px-4">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-panel-control">
            Command Center
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Stats */}
          <div className="space-y-2">
            {[
              {
                label: "Active Vaults",
                value: vaults.length,
                icon: Activity,
              },
              {
                label: "Unread Alerts",
                value: SIGNAL_CARDS.reduce(
                  (sum, c) => sum + parseInt(c.value.match(/\d+/)?.[0] ?? "0"),
                  0,
                ),
                icon: AlertTriangle,
              },
              {
                label: "Recent Events",
                value: events.length,
                icon: Zap,
              },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="flex items-center justify-between rounded-lg border border-surface-border bg-surface-raised px-3 py-2.5"
                >
                  <div className="flex items-center gap-2">
                    <Icon size={13} className="text-panel-control" />
                    <span className="text-xs text-text-secondary">{stat.label}</span>
                  </div>
                  <span className="text-lg font-bold text-text-primary">{stat.value}</span>
                </div>
              );
            })}
          </div>

          {/* Recent Events */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
                Recent Events
              </span>
            </div>
            <div className="space-y-1">
              {events.slice(0, 6).map((event) => {
                const chamber = (
                  (event.payload.chamber as string) || "discover"
                ) as "discover" | "build" | "review" | "ship";
                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-2 rounded-lg px-2 py-2 hover:bg-surface-overlay transition-colors cursor-pointer"
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      <GateDot gate={chamber} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-text-primary truncate">
                        {eventSummary(event)}
                      </p>
                      <p className="text-[11px] text-text-muted">
                        {formatTimeAgo(event.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
              {events.length === 0 && (
                <p className="px-2 py-4 text-center text-xs text-text-muted">
                  No recent events
                </p>
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
