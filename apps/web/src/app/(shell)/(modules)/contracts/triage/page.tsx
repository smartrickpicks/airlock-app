"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import GateDot from "@/components/atoms/GateDot";
import { SkeletonCard } from "@/components/atoms/Skeleton";
import { useVaultStore } from "@/stores/vault.store";
import { staggerContainer, staggerItem, fadeInUp } from "@/lib/animations";
import { useOnboardingStore } from "@/stores/onboarding.store";

const VaultGantt = dynamic(() => import("@/components/organisms/VaultGantt"), {
  ssr: false,
});

export default function TriagePage() {
  const router = useRouter();
  const { vaults, fetchVaults, isLoading } = useVaultStore();

  useEffect(() => {
    fetchVaults({ module_type: "contracts", chamber: "discover" });
    // Mark "open_contracts" checklist item as complete
    useOnboardingStore.getState().completeChecklistItem("open_contracts");
  }, [fetchVaults]);

  const discoverVaults = vaults.filter((v) => v.chamber === "discover");

  return (
    <motion.div
      className="h-full overflow-y-auto flex flex-col gap-6 p-6"
      {...fadeInUp}
    >
      <div>
        <h1 className="text-xl font-semibold text-text-primary">
          Triage Board
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Incoming contracts awaiting triage — Discover chamber
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : discoverVaults.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-text-muted">No contracts in triage</p>
        </div>
      ) : (
        <>
          <motion.div
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
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
                <motion.button
                  key={vault.id}
                  variants={staggerItem}
                  onClick={() => router.push(`/contracts/${vault.slug}`)}
                  className="rounded-lg border border-surface-border bg-surface-raised p-4 text-left transition-colors hover:border-accent-primary/30 hover:bg-surface-overlay"
                  whileHover={{ y: -2, transition: { duration: 0.2 } }}
                  whileTap={{ scale: 0.98 }}
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
                </motion.button>
              );
            })}
          </motion.div>
          <VaultGantt
            vaults={discoverVaults}
            onVaultClick={(slug) => router.push(`/contracts/${slug}`)}
          />
        </>
      )}
    </motion.div>
  );
}
