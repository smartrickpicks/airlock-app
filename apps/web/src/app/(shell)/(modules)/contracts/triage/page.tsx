"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useTasksStore } from "@/stores/tasks.store";
import { useVaultStore } from "@/stores/vault.store";
import { useOnboardingStore } from "@/stores/onboarding.store";
import { fadeInUp } from "@/lib/animations";
import TriageKanban from "@/components/organisms/TriageKanban";
import TriageTable from "@/components/organisms/TriageTable";
import TriageAgenda from "@/components/organisms/TriageAgenda";

const VaultGantt = dynamic(() => import("@/components/organisms/VaultGantt"), {
  ssr: false,
});

type TriageView = "board" | "table" | "agenda";

const VIEW_OPTIONS: { id: TriageView; label: string }[] = [
  { id: "board", label: "Board" },
  { id: "table", label: "Table" },
  { id: "agenda", label: "Agenda" },
];

const VIEW_ICONS: Record<TriageView, string> = {
  board: "/assets/brand/icons/view-gantt.png",
  table: "/assets/brand/icons/view-timeline.png",
  agenda: "/assets/brand/icons/view-review-queue.png",
};

export default function TriagePage() {
  const router = useRouter();
  const [activeView, setActiveView] = useState<TriageView>("board");
  const [showGantt, setShowGantt] = useState(false);

  const {
    tasks,
    fetchTasks,
    moveTask,
    isLoading: tasksLoading,
  } = useTasksStore();
  const { vaults, fetchVaults, isLoading: vaultsLoading } = useVaultStore();

  useEffect(() => {
    fetchTasks();
    fetchVaults({ module_type: "contracts", chamber: "discover" });
    useOnboardingStore.getState().completeChecklistItem("open_contracts");
  }, [fetchTasks, fetchVaults]);

  // Filter to contracts-module tasks only
  const contractsTasks = tasks.filter((t) => t.moduleType === "contracts");
  const discoverVaults = vaults.filter((v) => v.chamber === "discover");
  const isLoading = tasksLoading || vaultsLoading;

  return (
    <motion.div
      className="h-full overflow-y-auto flex flex-col gap-6 p-6"
      {...fadeInUp}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">
            Triage Board
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Contracts triage — {contractsTasks.length} items across all statuses
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View switcher pills */}
          <div className="flex items-center rounded-lg bg-surface-overlay p-0.5">
            {VIEW_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setActiveView(opt.id)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  activeView === opt.id
                    ? "bg-accent-primary text-text-inverse"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                <Image
                  src={VIEW_ICONS[opt.id]}
                  alt=""
                  width={14}
                  height={14}
                  className="rounded-sm"
                />
                {opt.label}
              </button>
            ))}
          </div>

          {/* Gantt toggle */}
          <button
            onClick={() => setShowGantt((v) => !v)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              showGantt
                ? "bg-chamber-discover/20 text-chamber-discover"
                : "bg-surface-overlay text-text-secondary hover:text-text-primary"
            }`}
          >
            Timeline
          </button>
        </div>
      </div>

      {/* Main content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-text-muted">Loading triage items...</p>
        </div>
      ) : (
        <>
          {activeView === "board" && (
            <TriageKanban tasks={contractsTasks} onMoveTask={moveTask} />
          )}
          {activeView === "table" && <TriageTable tasks={contractsTasks} />}
          {activeView === "agenda" && <TriageAgenda tasks={contractsTasks} />}

          {/* Gantt timeline (collapsible) */}
          {showGantt && discoverVaults.length > 0 && (
            <div className="mt-2">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                Vault Timeline
              </div>
              <VaultGantt
                vaults={discoverVaults}
                onVaultClick={(slug) => router.push(`/contracts/${slug}`)}
              />
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
