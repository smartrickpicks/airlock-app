"use client";

import { useEffect } from "react";
import { usePlaybookStore } from "@/stores/playbook.store";
import PlaybookDAG from "@/components/organisms/PlaybookDAG";
import GatePanel from "@/components/organisms/GatePanel";

/* ------------------------------------------------------------------ */
/*  PlaybookView — Template combining DAG + Gate Panel                 */
/* ------------------------------------------------------------------ */

interface PlaybookViewProps {
  readOnly?: boolean;
}

export default function PlaybookView({ readOnly = false }: PlaybookViewProps) {
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

      {/* Right — Gate panel (hidden in readOnly) or info panel */}
      <div className="w-96 shrink-0">
        {readOnly ? (
          <div className="rounded-lg border border-surface-border bg-surface-raised p-6">
            {selectedNode ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-text-primary">
                  {selectedNode.name}
                </h3>
                <p className="text-xs text-text-secondary">
                  {selectedNode.description}
                </p>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <span className="rounded bg-surface-overlay px-2 py-0.5 capitalize">
                    {selectedNode.actor}
                  </span>
                  <span className="rounded bg-surface-overlay px-2 py-0.5 capitalize">
                    {selectedNode.archetype}
                  </span>
                </div>
                {selectedNode.gate && (
                  <div className="mt-2 rounded border border-surface-border bg-surface-sunken p-3">
                    <p className="text-[11px] font-medium uppercase text-text-muted">
                      Gate: {selectedNode.gate.type}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {selectedNode.gate.description}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-sm text-text-muted">
                Click a node to see details
              </p>
            )}
            <div className="mt-4 rounded bg-accent-primary/10 px-3 py-2 text-center">
              <p className="text-xs font-medium text-accent-primary">
                Ready to execute
              </p>
              <p className="text-[10px] text-text-muted">
                This playbook is matched to your PI profile
              </p>
            </div>
          </div>
        ) : selectedGate ? (
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
