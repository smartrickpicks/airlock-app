"use client";

import Modal from "@/components/molecules/Modal";
import Button from "@/components/atoms/Button";
import type { Workflow } from "@/lib/mock-workflows";

interface WorkflowRunModalProps {
  workflow: Workflow | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function WorkflowRunModal({
  workflow,
  isOpen,
  onClose,
}: WorkflowRunModalProps) {
  if (!workflow) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Workflow Test Run"
      size="md"
    >
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          Sample execution queued for{" "}
          <span className="font-medium text-text-primary">{workflow.name}</span>
          .
        </p>

        <div className="grid grid-cols-2 gap-3">
          <SummaryCard label="Trigger" value={workflow.triggerType} />
          <SummaryCard label="Nodes" value={`${workflow.nodes.length}`} />
          <SummaryCard label="Current Version" value={`v${workflow.version}`} />
          <SummaryCard
            label="Expected Path"
            value="Preflight -> Task -> Notify"
          />
        </div>

        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          Demo result: test run completed successfully and no blocking errors
          were detected.
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-overlay p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </div>
      <div className="mt-1 text-sm text-text-primary">{value}</div>
    </div>
  );
}
