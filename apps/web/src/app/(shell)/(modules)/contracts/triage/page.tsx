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
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">
          Triage Board
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Incoming contracts awaiting triage — Discover chamber
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-text-muted">Loading vaults...</p>
        </div>
      ) : discoverVaults.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-text-muted">No contracts in triage</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {discoverVaults.map((vault) => {
            const entity =
              (vault.metadata as Record<string, string>).entity || "Unknown";
            const contractType =
              (vault.metadata as Record<string, string>).contract_type ||
              "Contract";
            const healthColor =
              (vault.health_score ?? 0) >= 80
                ? "text-gate-green"
                : (vault.health_score ?? 0) >= 50
                  ? "text-gate-yellow"
                  : "text-gate-red";

            return (
              <button
                key={vault.id}
                onClick={() => router.push(`/contracts/${vault.slug}`)}
                className="rounded-lg border border-surface-border bg-surface-raised p-4 text-left transition-colors hover:border-accent-primary/30 hover:bg-surface-overlay"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GateDot gate="discover" />
                    <span className="text-sm font-medium text-text-primary">
                      {vault.name}
                    </span>
                  </div>
                  <span className={`font-mono text-xs ${healthColor}`}>
                    {vault.health_score ?? 0}%
                  </span>
                </div>

                <div className="mt-2 text-xs text-text-muted">
                  {entity} — {contractType}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="rounded bg-surface-overlay px-2 py-0.5 text-[11px] text-text-secondary">
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
  );
}
