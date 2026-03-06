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
    <main className="flex-1 overflow-y-auto p-6">
      {showWelcome && <WelcomeModal onClose={() => setShowWelcome(false)} />}
      <div className="mx-auto max-w-4xl">
        {/* Onboarding checklist */}
        <div className="mb-6">
          <OnboardingChecklist />
        </div>

        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary">
            {user ? `Welcome, ${user.name}` : "Welcome to Airlock"}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {totalVaults} active contracts across {CHAMBERS.length} chambers
          </p>
        </div>

        {/* Chamber status cards */}
        <div className="mb-8 grid grid-cols-4 gap-4">
          {CHAMBERS.map((chamber) => (
            <button
              key={chamber}
              onClick={() => router.push("/contracts/triage")}
              className="rounded-lg border border-surface-border bg-surface-raised p-4 text-left transition-colors hover:border-accent-primary/30 hover:bg-surface-overlay"
            >
              <div className="flex items-center gap-2">
                <GateDot gate={chamber} />
                <span className="text-sm font-medium capitalize text-text-secondary">
                  {CHAMBER_LABELS[chamber]}
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-text-primary">
                {chamberCounts[chamber]}
              </p>
            </button>
          ))}
        </div>

        {/* Recent activity */}
        <div className="rounded-lg border border-surface-border bg-surface-raised">
          <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
            <h2 className="text-sm font-semibold text-text-primary">
              Recent Activity
            </h2>
            <span className="text-xs text-text-muted">
              {events.length} events
            </span>
          </div>
          <div className="divide-y divide-surface-border">
            {events.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-text-muted">
                No recent activity
              </p>
            ) : (
              events.slice(0, 10).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-overlay">
                      <GateDot
                        gate={
                          (event.payload.chamber as
                            | "discover"
                            | "build"
                            | "review"
                            | "ship") || "discover"
                        }
                      />
                    </div>
                    <div>
                      <p className="text-sm text-text-primary">
                        {eventSummary(event)}
                      </p>
                      <p className="text-xs text-text-muted">
                        {event.event_type.replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-text-muted">
                    {formatTimeAgo(event.created_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
