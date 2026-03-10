"use client";

import VerificationGate from "@/components/organisms/gates/VerificationGate";
import ApprovalGate from "@/components/organisms/gates/ApprovalGate";
import QualityGate from "@/components/organisms/gates/QualityGate";
import DecisionGate from "@/components/organisms/gates/DecisionGate";
import ConvergenceGate from "@/components/organisms/gates/ConvergenceGate";
import type { GateResponseState } from "@/lib/mock-gates";

interface GatePanelProps {
  gate: GateResponseState;
  slaDeadline?: string;
  onAction: (action: string, comment?: string, optionId?: string) => void;
  className?: string;
}

export default function GatePanel({
  gate,
  slaDeadline,
  onAction,
  className,
}: GatePanelProps) {
  switch (gate.gateType) {
    case "verification":
      return (
        <VerificationGate
          nodeId={gate.nodeId}
          nodeName={gate.nodeName}
          description={gate.description}
          approvals={gate.approvals}
          requiredApprovals={gate.requiredApprovals}
          slaDeadline={slaDeadline}
          onAction={(action, comment) => onAction(action, comment)}
          className={className}
        />
      );

    case "approval":
      return (
        <ApprovalGate
          nodeId={gate.nodeId}
          nodeName={gate.nodeName}
          description={gate.description}
          approvals={gate.approvals}
          requiredApprovals={gate.requiredApprovals}
          slaDeadline={slaDeadline}
          onAction={(action, comment) => onAction(action, comment)}
          className={className}
        />
      );

    case "density":
      return (
        <QualityGate
          nodeId={gate.nodeId}
          nodeName={gate.nodeName}
          description={gate.description}
          approvals={gate.approvals}
          requiredApprovals={gate.requiredApprovals}
          slaDeadline={slaDeadline}
          onAction={(action, comment) => onAction(action, comment)}
          className={className}
        />
      );

    case "decision":
      return (
        <DecisionGate
          nodeId={gate.nodeId}
          nodeName={gate.nodeName}
          description={gate.description}
          options={gate.options ?? []}
          slaDeadline={slaDeadline}
          onAction={onAction}
          className={className}
        />
      );

    case "convergence":
      return (
        <ConvergenceGate
          nodeId={gate.nodeId}
          nodeName={gate.nodeName}
          description={gate.description}
          summary={gate.summary ?? ""}
          approvals={gate.approvals}
          requiredApprovals={gate.requiredApprovals}
          slaDeadline={slaDeadline}
          onAction={(action, comment) => onAction(action, comment)}
          className={className}
        />
      );

    default: {
      const _exhaustive: never = gate.gateType;
      return null;
    }
  }
}
