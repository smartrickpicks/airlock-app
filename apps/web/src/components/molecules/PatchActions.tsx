"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CircleCheckBig,
  CircleX,
  MessageSquare,
  SendHorizonal,
  CirclePause,
  LoaderCircle,
} from "lucide-react";
import Button from "@/components/atoms/Button";
import { usePatchStore } from "@/stores/patch.store";
import { useOnboardingStore } from "@/stores/onboarding.store";
import type { Patch, PatchState } from "@/lib/mock-patches";

interface ActionDef {
  targetState: PatchState;
  label: string;
  icon: React.ReactNode;
  variant: "primary" | "secondary" | "danger" | "ghost";
  requiresNote?: boolean;
  notePrompt?: string;
}

/** Map patch state → available actions */
function getActions(patch: Patch): ActionDef[] {
  switch (patch.state) {
    case "draft":
      return [
        {
          targetState: "submitted",
          label: "Submit for Review",
          icon: <SendHorizonal size={14} />,
          variant: "primary",
        },
        {
          targetState: "cancelled",
          label: "Cancel",
          icon: <CircleX size={14} />,
          variant: "ghost",
        },
      ];
    case "submitted":
      return [
        {
          targetState: "verifier_approved",
          label: "Approve",
          icon: <CircleCheckBig size={14} />,
          variant: "primary",
        },
        {
          targetState: "needs_clarification",
          label: "Request Clarification",
          icon: <MessageSquare size={14} />,
          variant: "secondary",
          requiresNote: true,
          notePrompt: "What needs clarification?",
        },
        {
          targetState: "rejected",
          label: "Reject",
          icon: <CircleX size={14} />,
          variant: "danger",
          requiresNote: true,
          notePrompt: "Reason for rejection",
        },
      ];
    case "needs_clarification":
      return [
        {
          targetState: "verifier_responded",
          label: "Respond to Clarification",
          icon: <SendHorizonal size={14} />,
          variant: "primary",
          requiresNote: true,
          notePrompt: "Your clarification response",
        },
        {
          targetState: "cancelled",
          label: "Cancel Patch",
          icon: <CircleX size={14} />,
          variant: "ghost",
        },
      ];
    case "verifier_responded":
      return [
        {
          targetState: "verifier_approved",
          label: "Approve",
          icon: <CircleCheckBig size={14} />,
          variant: "primary",
        },
        {
          targetState: "needs_clarification",
          label: "Request More Info",
          icon: <MessageSquare size={14} />,
          variant: "secondary",
          requiresNote: true,
          notePrompt: "What else is needed?",
        },
        {
          targetState: "rejected",
          label: "Reject",
          icon: <CircleX size={14} />,
          variant: "danger",
          requiresNote: true,
          notePrompt: "Reason for rejection",
        },
      ];
    case "verifier_approved":
      return [
        {
          targetState: "admin_approved",
          label: "Admin Approve",
          icon: <CircleCheckBig size={14} />,
          variant: "primary",
        },
        {
          targetState: "admin_hold",
          label: "Place on Hold",
          icon: <CirclePause size={14} />,
          variant: "secondary",
          requiresNote: true,
          notePrompt: "Reason for hold",
        },
        {
          targetState: "rejected",
          label: "Reject",
          icon: <CircleX size={14} />,
          variant: "danger",
          requiresNote: true,
          notePrompt: "Reason for rejection",
        },
      ];
    case "admin_hold":
      return [
        {
          targetState: "admin_approved",
          label: "Release & Approve",
          icon: <CircleCheckBig size={14} />,
          variant: "primary",
        },
        {
          targetState: "rejected",
          label: "Reject",
          icon: <CircleX size={14} />,
          variant: "danger",
          requiresNote: true,
          notePrompt: "Reason for rejection",
        },
      ];
    case "otto_returned":
      return [
        {
          targetState: "submitted",
          label: "Re-submit",
          icon: <SendHorizonal size={14} />,
          variant: "primary",
        },
        {
          targetState: "cancelled",
          label: "Cancel",
          icon: <CircleX size={14} />,
          variant: "ghost",
        },
      ];
    default:
      return [];
  }
}

interface PatchActionsProps {
  patch: Patch;
  vaultId: string;
}

export default function PatchActions({ patch, vaultId }: PatchActionsProps) {
  const { transitionPatch, isLoading } = usePatchStore();
  const [activeAction, setActiveAction] = useState<PatchState | null>(null);
  const [note, setNote] = useState("");

  const actions = getActions(patch);
  if (actions.length === 0) return null;

  const handleAction = async (action: ActionDef) => {
    if (action.requiresNote && activeAction !== action.targetState) {
      setActiveAction(action.targetState);
      setNote("");
      return;
    }

    await transitionPatch(
      vaultId,
      patch.id,
      action.targetState,
      patch.version,
      note || undefined,
    );

    // Fire checklist completion when a patch is first submitted
    if (action.targetState === "submitted") {
      useOnboardingStore.getState().completeChecklistItem("submit_patch");
    }

    setActiveAction(null);
    setNote("");
  };

  return (
    <motion.div
      className="mt-4 border-t border-surface-border pt-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-text-muted">
        Actions
      </p>

      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button
            key={action.targetState}
            variant={action.variant}
            size="sm"
            onClick={() => handleAction(action)}
            disabled={isLoading}
            className="gap-1.5"
          >
            {isLoading && activeAction === action.targetState ? (
              <LoaderCircle size={14} className="animate-spin" />
            ) : (
              action.icon
            )}
            {action.label}
          </Button>
        ))}
      </div>

      {/* Note input for actions requiring explanation */}
      <AnimatePresence>
        {activeAction && (
          <motion.div
            className="mt-3 space-y-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                actions.find((a) => a.targetState === activeAction)
                  ?.notePrompt ?? "Add a note..."
              }
              rows={2}
              className="w-full resize-none rounded-md border border-surface-border bg-surface-sunken px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const action = actions.find(
                    (a) => a.targetState === activeAction,
                  );
                  if (action) handleAction(action);
                }}
                disabled={!note.trim() || isLoading}
              >
                {isLoading ? (
                  <LoaderCircle size={14} className="animate-spin" />
                ) : (
                  "Confirm"
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActiveAction(null);
                  setNote("");
                }}
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
