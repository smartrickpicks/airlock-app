import { Shield } from "lucide-react";
import Icon from "@/components/atoms/Icon";

type SlaUrgency = "green" | "amber" | "red";

interface GovernanceBarProps {
  gateLabel?: string;
  slaTimeRemaining?: string;
  slaUrgency?: SlaUrgency;
  onApprove?: () => void;
  onReject?: () => void;
  onClarify?: () => void;
  onHold?: () => void;
}

const urgencyBorderColor: Record<SlaUrgency, string> = {
  green: "border-t-gate-green",
  amber: "border-t-gate-amber",
  red: "border-t-gate-red",
};

const urgencyTextColor: Record<SlaUrgency, string> = {
  green: "text-gate-green",
  amber: "text-gate-amber",
  red: "text-gate-red",
};

export default function GovernanceBar({
  gateLabel = "GATE REVIEW REQUIRED",
  slaTimeRemaining = "\u2014",
  slaUrgency = "green",
  onApprove,
  onReject,
  onClarify,
  onHold,
}: GovernanceBarProps) {
  return (
    <div
      className={`
        sticky top-0 z-sticky
        h-14 w-full
        bg-surface-raised
        border-t-2 ${urgencyBorderColor[slaUrgency]}
        flex items-center px-4 gap-4
      `}
      role="banner"
      aria-label="Governance bar"
    >
      {/* Left: Shield icon + gate label */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Icon icon={Shield} size="md" className="text-text-primary" />
        <span className="text-[13px] font-semibold uppercase text-text-primary tracking-wide">
          {gateLabel}
        </span>
      </div>

      {/* Center: SLA countdown */}
      <div className="flex-1 flex justify-center">
        <span
          className={`
            font-mono text-[15px] font-bold
            ${urgencyTextColor[slaUrgency]}
          `}
        >
          {slaTimeRemaining}
        </span>
      </div>

      {/* Right: Action buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {onApprove && (
          <button
            onClick={onApprove}
            className="
              text-[13px] font-semibold px-4 py-1.5 rounded
              bg-gate-green/20 text-gate-green border border-gate-green/30
              cursor-pointer transition-colors duration-fast
              hover:bg-gate-green/30
            "
          >
            Approve
          </button>
        )}

        {onReject && (
          <button
            onClick={onReject}
            className="
              text-[13px] font-semibold px-4 py-1.5 rounded
              bg-gate-red/20 text-gate-red border border-gate-red/30
              cursor-pointer transition-colors duration-fast
              hover:bg-gate-red/30
            "
          >
            Reject
          </button>
        )}

        {onClarify && (
          <button
            onClick={onClarify}
            className="
              text-[13px] font-semibold px-4 py-1.5 rounded
              bg-gate-amber/20 text-gate-amber border border-gate-amber/30
              cursor-pointer transition-colors duration-fast
              hover:bg-gate-amber/30
            "
          >
            Clarify
          </button>
        )}

        {onHold && (
          <button
            onClick={onHold}
            className="
              text-[13px] font-semibold px-4 py-1.5 rounded
              bg-surface-overlay text-text-secondary border border-surface-border
              cursor-pointer transition-colors duration-fast
              hover:bg-surface-overlay/80
            "
          >
            Hold
          </button>
        )}
      </div>
    </div>
  );
}
