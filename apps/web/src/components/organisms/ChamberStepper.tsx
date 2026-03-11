"use client";

import { motion } from "framer-motion";
import { ChevronRight, Lock } from "lucide-react";
import AirlockIcon from "@/components/atoms/AirlockIcon";
import type { AirlockIconName } from "@/components/atoms/airlock-icons/types";
import { CHAMBERS } from "@/lib/constants";
import type { ChamberName } from "@/lib/constants";
import { staggerContainer, staggerItem } from "@/lib/animations";

const CHAMBER_ICON_NAMES: Record<string, AirlockIconName> = {
  discover: "chamber-discover",
  build: "chamber-build",
  review: "chamber-review",
  ship: "chamber-ship",
};

interface ChamberStepDef {
  key: ChamberName;
  label: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  role: string;
}

const STEPS: ChamberStepDef[] = [
  {
    key: "discover",
    label: "Discover",
    colorClass: "text-chamber-discover",
    bgClass: "bg-chamber-discover/15",
    borderClass: "border-chamber-discover/40",
    role: "Builder",
  },
  {
    key: "build",
    label: "Build",
    colorClass: "text-chamber-build",
    bgClass: "bg-chamber-build/15",
    borderClass: "border-chamber-build/40",
    role: "Builder",
  },
  {
    key: "review",
    label: "Review",
    colorClass: "text-chamber-review",
    bgClass: "bg-chamber-review/15",
    borderClass: "border-chamber-review/40",
    role: "Gatekeeper",
  },
  {
    key: "ship",
    label: "Ship",
    colorClass: "text-chamber-ship",
    bgClass: "bg-chamber-ship/15",
    borderClass: "border-chamber-ship/40",
    role: "Owner",
  },
];

interface ChamberStepperProps {
  /** Current chamber of the vault */
  currentChamber: ChamberName | null;
  /** Whether advance is possible (permissions + gate checks pass) */
  canAdvance?: boolean;
  /** Callback to advance to next chamber */
  onAdvance?: () => void;
  /** Whether advance is in progress */
  isAdvancing?: boolean;
  /** Compact mode for sidebar display */
  compact?: boolean;
}

export default function ChamberStepper({
  currentChamber,
  canAdvance = false,
  onAdvance,
  isAdvancing = false,
  compact = false,
}: ChamberStepperProps) {
  const currentOrder = currentChamber ? CHAMBERS[currentChamber].order : -1;

  const nextChamber = currentOrder < 3 ? STEPS[currentOrder + 1] : null;

  return (
    <motion.div
      className="flex flex-col gap-3"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Chamber progression steps */}
      <div className={compact ? "flex flex-col gap-1" : "flex flex-col gap-2"}>
        {STEPS.map((step, idx) => {
          const isComplete = idx < currentOrder;
          const isCurrent = idx === currentOrder;
          const isFuture = idx > currentOrder;

          return (
            <motion.div key={step.key} variants={staggerItem}>
              <div className="flex items-center gap-2">
                {/* Step indicator */}
                <div
                  className={`
                    flex items-center justify-center rounded-full flex-shrink-0
                    ${compact ? "h-7 w-7" : "h-8 w-8"}
                    ${
                      isComplete
                        ? `${step.bgClass} ${step.colorClass}`
                        : isCurrent
                          ? `${step.bgClass} ${step.colorClass} ring-2 ring-offset-1 ring-offset-surface-base ${step.borderClass.replace("border", "ring")}`
                          : "bg-surface-overlay text-text-muted"
                    }
                    transition-colors duration-200
                  `}
                >
                  {isFuture ? (
                    <Lock size={compact ? 12 : 14} />
                  ) : isCurrent ? (
                    <AirlockIcon
                      name={CHAMBER_ICON_NAMES[step.key]}
                      size="md"
                      animate={["entrance", "breathe"]}
                    />
                  ) : (
                    <AirlockIcon
                      name={CHAMBER_ICON_NAMES[step.key]}
                      size="md"
                      animate="entrance"
                    />
                  )}
                </div>

                {/* Step label */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs font-semibold ${
                      isCurrent
                        ? step.colorClass
                        : isComplete
                          ? "text-text-primary"
                          : "text-text-muted"
                    }`}
                  >
                    {step.label}
                    {isCurrent && (
                      <span className="ml-1.5 text-[10px] font-normal text-text-muted">
                        (current)
                      </span>
                    )}
                  </p>
                  {!compact && (
                    <p className="text-[10px] text-text-muted">{step.role}</p>
                  )}
                </div>

                {/* Status */}
                <div className="flex-shrink-0">
                  {isComplete && (
                    <span className="text-[10px] font-medium text-accent-success">
                      Done
                    </span>
                  )}
                  {isCurrent && (
                    <span
                      className={`text-[10px] font-medium ${step.colorClass}`}
                    >
                      Active
                    </span>
                  )}
                </div>
              </div>

              {/* Connector line */}
              {idx < STEPS.length - 1 && (
                <div
                  className={`ml-[14px] h-3 w-px ${
                    compact ? "ml-[13px] h-1" : ""
                  } ${
                    idx < currentOrder
                      ? "bg-accent-success/40"
                      : "bg-surface-border"
                  }`}
                />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Advance button */}
      {nextChamber && onAdvance && (
        <motion.div variants={staggerItem} className="pt-2">
          <button
            onClick={onAdvance}
            disabled={!canAdvance || isAdvancing}
            className={`
              flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5
              text-xs font-semibold transition-all duration-200
              ${
                canAdvance && !isAdvancing
                  ? `${nextChamber.bgClass} ${nextChamber.colorClass} border ${nextChamber.borderClass} hover:opacity-80 cursor-pointer`
                  : "bg-surface-overlay text-text-muted border border-surface-border cursor-not-allowed opacity-50"
              }
            `}
          >
            {isAdvancing ? (
              <span className="animate-pulse">Advancing...</span>
            ) : (
              <>
                <ChevronRight size={14} />
                Advance to {nextChamber.label}
              </>
            )}
          </button>
          {!canAdvance && !isAdvancing && (
            <p className="mt-1.5 text-center text-[10px] text-text-muted">
              Gate requirements must be met before advancing
            </p>
          )}
        </motion.div>
      )}

      {/* Completion state */}
      {currentChamber === "ship" && (
        <motion.div
          variants={staggerItem}
          className="flex items-center justify-center gap-2 rounded-lg border border-accent-success/30 bg-accent-success/10 px-3 py-2.5"
        >
          <AirlockIcon
            name="chamber-ship"
            size="sm"
            className="text-accent-success"
          />
          <span className="text-xs font-semibold text-accent-success">
            Vault shipped
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}
