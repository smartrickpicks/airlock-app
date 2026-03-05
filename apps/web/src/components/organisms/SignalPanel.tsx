"use client";

import { Bell, MessageSquare, Bot } from "lucide-react";

interface SignalPanelProps {
  /** Panel width in pixels */
  width: number;
  /** Whether the panel is collapsed to icon-only mode */
  collapsed: boolean;
  /** Callback to toggle panel overlay/expand */
  onOverlayToggle: () => void;
}

/** Placeholder signal card data */
const signalCards = [
  {
    id: "gate-cleared",
    borderColor: "border-l-gate-green",
    title: "Gate Cleared",
    body: "Preflight checks passed for Distribution Agreement v3.",
    timestamp: "2m ago",
  },
  {
    id: "ai-suggestion",
    borderColor: "border-l-accent-primary",
    title: "AI Suggestion",
    body: 'Entity match found: "Acme Corp" resolves to existing counterparty.',
    timestamp: "8m ago",
  },
  {
    id: "sla-warning",
    borderColor: "border-l-gate-amber",
    title: "SLA Warning",
    body: "Review due in 4 hours for Licensing Agreement #1042.",
    timestamp: "15m ago",
  },
  {
    id: "extraction-complete",
    borderColor: "border-l-accent-secondary",
    title: "Extraction Complete",
    body: "14 fields extracted from uploaded PDF with 92% avg confidence.",
    timestamp: "23m ago",
  },
] as const;

export default function SignalPanel({
  width,
  collapsed,
  onOverlayToggle,
}: SignalPanelProps) {
  // Collapsed icon-only mode
  if (collapsed) {
    return (
      <div
        className="flex flex-col items-center pt-4 gap-3 bg-surface-raised border-r border-surface-border h-full flex-shrink-0"
        style={{ width }}
      >
        <button
          onClick={onOverlayToggle}
          className="text-text-muted hover:text-text-secondary cursor-pointer transition-colors duration-fast"
          aria-label="Open notifications"
        >
          <Bell size={20} />
        </button>
        <button
          onClick={onOverlayToggle}
          className="text-text-muted hover:text-text-secondary cursor-pointer transition-colors duration-fast"
          aria-label="Open messages"
        >
          <MessageSquare size={20} />
        </button>
        <button
          onClick={onOverlayToggle}
          className="text-text-muted hover:text-text-secondary cursor-pointer transition-colors duration-fast"
          aria-label="Open AI agent"
        >
          <Bot size={20} />
        </button>
      </div>
    );
  }

  // Expanded mode
  return (
    <div
      className="flex flex-col bg-surface-raised border-r border-surface-border h-full overflow-hidden flex-shrink-0"
      style={{ width }}
    >
      {/* Header */}
      <div className="h-10 px-4 flex items-center flex-shrink-0">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Signal
        </span>
      </div>

      {/* Content: scrollable signal cards */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {signalCards.map((card) => (
          <div
            key={card.id}
            className={`
              bg-surface-overlay rounded-md p-3 mb-2
              border-l-[3px] ${card.borderColor}
              relative
            `}
          >
            <h4 className="text-[13px] font-semibold text-text-primary pr-14">
              {card.title}
            </h4>
            <p className="text-xs text-text-muted mt-1">{card.body}</p>
            <span className="font-mono text-[11px] text-text-muted absolute top-3 right-3">
              {card.timestamp}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
