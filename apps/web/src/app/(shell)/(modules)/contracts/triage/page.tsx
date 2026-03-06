"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import GateDot from "@/components/atoms/GateDot";
import { useVaultStore } from "@/stores/vault.store";

export default function TriagePage() {
  const router = useRouter();
  const { vaults, fetchVaults, isLoading } = useVaultStore();

  useEffect(() => {
    fetchVaults({ module_type: "contracts", chamber: "discover" });
  }, [fetchVaults]);

  const discoverVaults = vaults.filter((v) => v.chamber === "discover");

  return (
    <div className="flex h-full flex-col bg-surface-sunken">
      {/* Section header — raised surface for lift */}
      <div className="border-b border-surface-border bg-surface-raised px-6 py-4">
        <div className="flex items-center gap-3">
          <GateDot gate="discover" />
          <div>
            <h1 className="text-[15px] font-semibold text-text-primary">
              Triage Board
            </h1>
            <p className="text-xs text-text-muted">
              Incoming contracts — Discover chamber
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-text-muted">Loading vaults...</p>
          </div>
        ) : discoverVaults.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-text-muted">No contracts in triage</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {discoverVaults.map((vault) => {
              const entity =
                (vault.metadata as Record<string, string>).entity || "Unknown";
              const contractType =
                (vault.metadata as Record<string, string>).contract_type ||
                "Contract";
              const health = vault.health_score ?? 0;
              const healthColor =
                health >= 80
                  ? "text-gate-green"
                  : health >= 50
                    ? "text-gate-yellow"
                    : "text-gate-red";

              return (
                <button
                  key={vault.id}
                  onClick={() => router.push(`/contracts/${vault.slug}`)}
                  className="group rounded-lg border border-surface-border border-t-2 border-t-chamber-discover bg-surface-raised p-4 text-left transition-colors hover:bg-surface-overlay"
                >
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-text-primary leading-snug">
                      {vault.name}
                    </span>
                    <span className={`flex-shrink-0 font-mono text-xs ${healthColor}`}>
                      {health}%
                    </span>
                  </div>

                  {/* Entity + type */}
                  <p className="mt-1.5 text-xs text-text-muted">
                    {entity} — {contractType}
                  </p>

                  {/* Footer row */}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="rounded bg-surface-sunken px-2 py-0.5 text-[11px] font-medium text-chamber-discover">
                      {vault.gate?.replace("gate_", "") || "pending"}
                    </span>
                    <span className="text-[11px] text-text-muted">
                      {new Date(vault.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
