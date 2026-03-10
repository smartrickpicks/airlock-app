"use client";

import { useEffect } from "react";
import { usePlaybookStore } from "@/stores/playbook.store";
import PlaybookDAG from "@/components/organisms/PlaybookDAG";
import GatePanel from "@/components/organisms/GatePanel";

/* ------------------------------------------------------------------ */
/*  PlaybookView — Template combining DAG + Gate Panel                 */
/* ------------------------------------------------------------------ */

export default function PlaybookView() {
  const activePlaybook = usePlaybookStore((s) => s.activePlaybook);
  const selectedNode = usePlaybookStore((s) => s.selectedNode);
  const selectedGate = usePlaybookStore((s) => s.selectedGate);
  const selectNode = usePlaybookStore((s) => s.selectNode);
  const handleGateAction = usePlaybookStore((s) => s.handleGateAction);
  const loadDemoPlaybook = usePlaybookStore((s) => s.loadDemoPlaybook);

  // Auto-load demo playbook on mount if none is active
  useEffect(() => {
    if (!activePlaybook) {
      loadDemoPlaybook();
    }
  }, [activePlaybook, loadDemoPlaybook]);

  if (!activePlaybook) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-text-muted">Loading playbook...</p>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Left — DAG visualization */}
      <div className="min-w-0 flex-1">
        <PlaybookDAG
          data={activePlaybook}
          onNodeClick={(nodeId) => selectNode(nodeId)}
          className="rounded-lg border border-surface-border bg-surface-raised p-4"
        />
      </div>

      {/* Right — Gate panel or empty state */}
      <div className="w-96 shrink-0">
        {selectedGate ? (
          <GatePanel
            gate={selectedGate}
            onAction={(action, comment, optionId) =>
              handleGateAction(action, comment, optionId)
            }
            className="rounded-lg border border-surface-border bg-surface-raised p-4"
          />
        ) : (
          <div className="rounded-lg border border-surface-border bg-surface-raised p-6">
            <p className="text-center text-sm text-text-muted">
              {selectedNode
                ? `"${selectedNode.name}" has no gate checkpoint.`
                : "Select a gated node to review"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
