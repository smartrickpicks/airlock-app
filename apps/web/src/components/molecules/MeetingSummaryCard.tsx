"use client";

import { CheckSquare, Tag, TrendingUp } from "lucide-react";
import type { MeetingIntelligence } from "@/lib/mock-meetings";
import { URGENCY_CONFIG, SENTIMENT_CONFIG } from "@/lib/mock-meetings";

interface MeetingSummaryCardProps {
  intelligence: MeetingIntelligence;
  onViewTranscript?: () => void;
}

export default function MeetingSummaryCard({
  intelligence,
  onViewTranscript,
}: MeetingSummaryCardProps) {
  const { summary, actionItems, topics, sentiment } = intelligence;
  const sentimentCfg = SENTIMENT_CONFIG[sentiment.overall];

  return (
    <div className="space-y-4">
      {/* One-liner */}
      <div className="rounded-lg border border-surface-border bg-surface-overlay p-3">
        <p className="text-sm font-semibold text-text-primary">
          {summary.oneLiner}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <TrendingUp size={12} className={sentimentCfg.color} />
          <span className={`text-[11px] font-medium ${sentimentCfg.color}`}>
            {sentimentCfg.label} ({Math.round(sentiment.score * 100)}%)
          </span>
        </div>
      </div>

      {/* Key bullets */}
      <div>
        <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Summary
        </h4>
        <ul className="space-y-1">
          {summary.bullets.map((b, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-sm text-text-secondary"
            >
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent-primary" />
              {b}
            </li>
          ))}
        </ul>
      </div>

      {/* Key decisions */}
      {summary.keyDecisions.length > 0 && (
        <div>
          <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Key Decisions
          </h4>
          <ul className="space-y-1">
            {summary.keyDecisions.map((d, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-text-secondary"
              >
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent-success" />
                {d}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action items */}
      {actionItems.length > 0 && (
        <div>
          <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted">
            <CheckSquare size={12} />
            Action Items ({actionItems.length})
          </h4>
          <div className="space-y-1.5">
            {actionItems.map((item, i) => {
              const urgCfg = URGENCY_CONFIG[item.urgency];
              return (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded border border-surface-border bg-surface-sunken p-2"
                >
                  <span
                    className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${urgCfg.color.replace("text-", "bg-")}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-text-primary">
                      {item.description}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-text-muted">
                      {item.assigneeName && <span>{item.assigneeName}</span>}
                      {item.suggestedDue && (
                        <span>
                          Due:{" "}
                          {new Date(item.suggestedDue).toLocaleDateString(
                            undefined,
                            { month: "short", day: "numeric" },
                          )}
                        </span>
                      )}
                      <span className={urgCfg.color}>{urgCfg.label}</span>
                      {item.taskId && (
                        <span className="rounded bg-accent-primary/20 px-1 text-accent-primary">
                          Task created
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Topics */}
      {topics.length > 0 && (
        <div>
          <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted">
            <Tag size={12} />
            Topics
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {topics.map((t, i) => (
              <span
                key={i}
                className="rounded-full bg-accent-primary/15 px-2.5 py-0.5 text-[11px] font-medium text-accent-primary"
              >
                {t.name}
                <span className="ml-1 text-text-muted">
                  {Math.round(t.confidence * 100)}%
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* View transcript link */}
      {onViewTranscript && (
        <button
          onClick={onViewTranscript}
          className="text-xs font-medium text-accent-primary hover:underline"
        >
          View full transcript
        </button>
      )}
    </div>
  );
}
