"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronRight, Check, X, AlertTriangle } from "lucide-react";
import GateDot from "@/components/atoms/GateDot";
import RecordInspector from "@/components/organisms/RecordInspector";
import BuildFieldEditor from "@/components/organisms/BuildFieldEditor";
import AuditTrailFullScreen from "@/components/organisms/AuditTrailFullScreen";
import { useVaultStore } from "@/stores/vault.store";
import { useOnboardingStore } from "@/stores/onboarding.store";
import { CHAMBERS } from "@/lib/constants";
import type { Chamber } from "@/stores/vault.store";
import type { ChamberName } from "@/lib/constants";

export default function VaultDetailPage() {
  const params = useParams<{ vaultId: string }>();
  const {
    selectedVault,
    fetchVault,
    advanceChamber,
    isLoading,
    approvalState,
    advanceError,
    approveVault,
    fetchApprovals,
    clearAdvanceError,
  } = useVaultStore();
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  useEffect(() => {
    if (params.vaultId) {
      fetchVault(params.vaultId);
      // Mark "view_vault" checklist item as complete
      useOnboardingStore.getState().completeChecklistItem("view_vault");
    }
  }, [params.vaultId, fetchVault]);

  // Fetch approval state when vault is in review chamber
  useEffect(() => {
    if (params.vaultId && selectedVault?.chamber === "review") {
      fetchApprovals(params.vaultId);
    }
  }, [params.vaultId, selectedVault?.chamber, fetchApprovals]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-sm text-text-muted">Loading vault...</p>
      </div>
    );
  }

  if (!selectedVault) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-sm text-text-muted">Vault not found</p>
      </div>
    );
  }

  const entity =
    (selectedVault.metadata as Record<string, string>).entity || "";
  const contractType =
    (selectedVault.metadata as Record<string, string>).contract_type || "";
  const healthColor =
    (selectedVault.health_score ?? 0) >= 80
      ? "text-gate-green"
      : (selectedVault.health_score ?? 0) >= 50
        ? "text-gate-yellow"
        : "text-gate-red";

  const currentChamber = (selectedVault.chamber as ChamberName) ?? "discover";
  const chamberOrder = CHAMBERS[currentChamber].order;
  const CHAMBER_KEYS: ChamberName[] = ["discover", "build", "review", "ship"];
  const nextChamber = chamberOrder < 3 ? CHAMBER_KEYS[chamberOrder + 1] : null;

  const handleAdvance = async () => {
    if (!params.vaultId || !nextChamber) return;
    clearAdvanceError();
    setIsAdvancing(true);
    await advanceChamber(params.vaultId);
    setIsAdvancing(false);
  };

  const handleApprove = async () => {
    if (!params.vaultId) return;
    setIsApproving(true);
    await approveVault(params.vaultId);
    setIsApproving(false);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Compact vault header */}
      <div className="flex-shrink-0 border-b border-surface-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GateDot
              gate={(selectedVault.chamber as Chamber) || "discover"}
              className="h-3 w-3"
            />
            <Image
              src={`/assets/brand/icons/chamber-${currentChamber}.png`}
              alt={currentChamber}
              width={20}
              height={20}
              className="rounded"
            />
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                {selectedVault.name}
              </h2>
              <p className="text-xs text-text-muted">
                {entity}
                {contractType ? ` — ${contractType}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs capitalize text-text-secondary">
              {selectedVault.chamber || "—"}
            </span>
            <span className="text-xs text-text-muted">
              {selectedVault.vault_type}
            </span>
            <span className={`font-mono text-sm font-bold ${healthColor}`}>
              {selectedVault.health_score ?? 0}%
            </span>
            {nextChamber && (
              <button
                onClick={handleAdvance}
                disabled={isAdvancing}
                className="flex items-center gap-1.5 rounded-md bg-accent-primary/15 px-3 py-1.5 text-xs font-semibold text-accent-primary transition-colors hover:bg-accent-primary/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAdvancing ? (
                  "Advancing..."
                ) : (
                  <>
                    <ChevronRight size={14} />
                    Advance to {CHAMBERS[nextChamber].label}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Approval status panel — visible in Review chamber */}
      {currentChamber === "review" && approvalState && (
        <div className="flex-shrink-0 border-b border-surface-border bg-surface-secondary/30 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                {approvalState.gatekeeper_approved ? (
                  <Check size={14} className="text-gate-green" />
                ) : (
                  <X size={14} className="text-gate-red" />
                )}
                <span className="text-xs text-text-secondary">Gatekeeper</span>
              </div>
              <div className="flex items-center gap-2">
                {approvalState.owner_approved ? (
                  <Check size={14} className="text-gate-green" />
                ) : (
                  <X size={14} className="text-gate-red" />
                )}
                <span className="text-xs text-text-secondary">Owner</span>
              </div>
            </div>
            <button
              onClick={handleApprove}
              disabled={isApproving}
              className="rounded-md bg-chamber-review/15 px-3 py-1.5 text-xs font-semibold text-chamber-review transition-colors hover:bg-chamber-review/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isApproving ? "Approving..." : "Approve"}
            </button>
          </div>
        </div>
      )}

      {/* Advance error panel — shown when gate rules block advancement */}
      {advanceError && (
        <div className="flex-shrink-0 border-b border-gate-red/30 bg-gate-red/5 px-6 py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="mt-0.5 text-gate-red" />
            <div>
              <p className="text-xs font-semibold text-gate-red">
                {advanceError.message}
              </p>
              {advanceError.unmet_requirements.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {advanceError.unmet_requirements.map((req) => (
                    <li key={req} className="text-xs text-text-muted">
                      &bull; {req}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chamber-aware content */}
      <div className="flex-1 overflow-hidden">
        {currentChamber === "build" ? (
          <BuildFieldEditor vaultId={selectedVault.id} />
        ) : (
          <RecordInspector vaultId={selectedVault.id} />
        )}
      </div>

      <AuditTrailFullScreen />
    </div>
  );
}
