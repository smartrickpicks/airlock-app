"use client";

import type React from "react";
import SovereignBalanceEmbed from "@/components/molecules/chat-embeds/SovereignBalanceEmbed";
import GateAlertEmbed from "@/components/molecules/chat-embeds/GateAlertEmbed";
import NodePreviewEmbed from "@/components/molecules/chat-embeds/NodePreviewEmbed";
import RosterCardEmbed from "@/components/molecules/chat-embeds/RosterCardEmbed";
import PlaybookDiffEmbed from "@/components/molecules/chat-embeds/PlaybookDiffEmbed";
import ProgressTrackerEmbed from "@/components/molecules/chat-embeds/ProgressTrackerEmbed";
import CodeBlockEmbed from "@/components/molecules/chat-embeds/CodeBlockEmbed";
import ActionButtons from "@/components/molecules/chat-actions/ActionButtons";
import MultiChoiceCard from "@/components/molecules/chat-actions/MultiChoiceCard";
import ConfirmationCard from "@/components/molecules/chat-actions/ConfirmationCard";
import GateDecisionCard from "@/components/molecules/chat-actions/GateDecisionCard";
import SelectRoster from "@/components/molecules/chat-actions/SelectRoster";
import QuickActionCard from "@/components/molecules/QuickActionCard";

/* ── Types ─────────────────────────────────────────────────────────────── */

export type EmbedType =
  | "sovereign_balance"
  | "gate_alert"
  | "node_preview"
  | "roster_card"
  | "playbook_diff"
  | "progress_tracker"
  | "code_block";

export type ActionType =
  | "action_buttons"
  | "multi_choice_card"
  | "confirmation_card"
  | "gate_decision"
  | "select_roster"
  | "quick_action";

export interface ChatEmbedData {
  type: EmbedType | ActionType;
  props: Record<string, unknown>;
}

interface ChatEmbedProps {
  embed: ChatEmbedData;
  onAction?: (type: string, payload: Record<string, unknown>) => void;
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

function p<T>(props: Record<string, unknown>): T {
  return props as unknown as T;
}

/* ── Component ─────────────────────────────────────────────────────────── */

export default function ChatEmbed({ embed, onAction }: ChatEmbedProps) {
  const { type, props } = embed;

  switch (type) {
    case "sovereign_balance":
      return (
        <SovereignBalanceEmbed
          {...p<React.ComponentProps<typeof SovereignBalanceEmbed>>(props)}
        />
      );
    case "gate_alert":
      return (
        <GateAlertEmbed
          {...p<React.ComponentProps<typeof GateAlertEmbed>>(props)}
        />
      );
    case "node_preview":
      return (
        <NodePreviewEmbed
          {...p<React.ComponentProps<typeof NodePreviewEmbed>>(props)}
        />
      );
    case "roster_card":
      return (
        <RosterCardEmbed
          {...p<React.ComponentProps<typeof RosterCardEmbed>>(props)}
        />
      );
    case "playbook_diff":
      return (
        <PlaybookDiffEmbed
          {...p<React.ComponentProps<typeof PlaybookDiffEmbed>>(props)}
        />
      );
    case "progress_tracker":
      return (
        <ProgressTrackerEmbed
          {...p<React.ComponentProps<typeof ProgressTrackerEmbed>>(props)}
        />
      );
    case "code_block":
      return (
        <CodeBlockEmbed
          {...p<React.ComponentProps<typeof CodeBlockEmbed>>(props)}
        />
      );

    case "action_buttons": {
      const actionProps = p<React.ComponentProps<typeof ActionButtons>>(props);
      return (
        <ActionButtons
          {...actionProps}
          onSelect={(id: string) =>
            onAction?.("action_buttons", { actionId: id })
          }
        />
      );
    }
    case "multi_choice_card": {
      const mcProps = p<React.ComponentProps<typeof MultiChoiceCard>>(props);
      return (
        <MultiChoiceCard
          {...mcProps}
          onSelect={(id: string) =>
            onAction?.("multi_choice_card", { optionId: id })
          }
        />
      );
    }
    case "confirmation_card": {
      const confProps = p<React.ComponentProps<typeof ConfirmationCard>>(props);
      return (
        <ConfirmationCard
          {...confProps}
          onConfirm={(fields: Record<string, string>) =>
            onAction?.("confirmation_card", { confirmed: true, fields })
          }
          onCancel={() => onAction?.("confirmation_card", { confirmed: false })}
        />
      );
    }
    case "gate_decision": {
      const gateProps = p<React.ComponentProps<typeof GateDecisionCard>>(props);
      return (
        <GateDecisionCard
          {...gateProps}
          onApprove={(
            checklist: { id: string; label: string; checked: boolean }[],
          ) => onAction?.("gate_decision", { approved: true, checklist })}
          onReject={(reason: string) =>
            onAction?.("gate_decision", { approved: false, reason })
          }
        />
      );
    }
    case "select_roster": {
      const rosterProps = p<React.ComponentProps<typeof SelectRoster>>(props);
      return (
        <SelectRoster
          {...rosterProps}
          onSelect={(userId: string) => onAction?.("select_roster", { userId })}
        />
      );
    }

    case "quick_action": {
      const qaProps = p<React.ComponentProps<typeof QuickActionCard>>(props);
      return (
        <QuickActionCard
          {...qaProps}
          onSelect={(actionId: string) =>
            onAction?.("quick_action", { actionId })
          }
        />
      );
    }

    default:
      return null;
  }
}
