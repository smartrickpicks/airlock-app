"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

/** Static Tailwind classes — must not be dynamically constructed (purge) */
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
    if (!welcomeSeen) {
      setShowWelcome(true);
    }
  }, [welcomeSeen]);

  const chamberCounts = CHAMBERS.reduce(
    (acc, chamber) => {
      acc[chamber] = vaults.filter((v) => v.chamber === chamber).length;
      return acc;
    },
    {} as Record<string, number>,
  );

  const totalVaults = vaults.length;

  return (
    <main className="flex-1 overflow-y-auto bg-surface-sunken">
      {showWelcome && <WelcomeModal onClose={() => setShowWelcome(false)} />}

      {/* Page header — raised surface creates visual lift above sunken bg */}
      <div className="border-b border-surface-border bg-surface-raised px-8 py-5">
        <h1 className="text-xl font-semibold text-text-primary">
          {user ? `Good morning, ${user.name.split(" ")[0]}` : "Home"}
        </h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          {totalVaults} active contracts across {CHAMBERS.length} chambers
        </p>
      </div>

      <div className="mx-auto max-w-5xl space-y-8 px-8 py-6">
        {/* Onboarding checklist */}
        <OnboardingChecklist />

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

        {/* Recent activity */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
              Recent Activity
            </h2>
            <span className="text-[11px] text-text-muted">
              {events.length} events
            </span>
          </div>
          <div className="overflow-hidden rounded-lg border border-surface-border bg-surface-raised">
            {events.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-text-muted">
                No recent activity
              </p>
            ) : (
              <div className="divide-y divide-surface-border">
                {events.slice(0, 10).map((event) => {
                  const chamber = (
                    (event.payload.chamber as string) || "discover"
                  ) as "discover" | "build" | "review" | "ship";
                  return (
                    <div
                      key={event.id}
                      className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-overlay"
                    >
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-surface-sunken">
                        <GateDot gate={chamber} />
                      </div>
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
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
