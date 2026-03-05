"use client";

import { ArrowRight } from "lucide-react";
import {
  FEED_EVENT_COLORS,
  FEED_EVENT_PULSE,
  type FeedItem,
  type FeedEventType,
} from "@/lib/mock-review-queue";

interface ActivityFeedProps {
  items: FeedItem[];
}

const BADGE_COLORS: Record<string, string> = {
  RFI: "bg-accent-warning/15 text-accent-warning",
  CORRECTION: "bg-accent-secondary/15 text-accent-secondary",
  ANOMALY: "bg-accent-danger/15 text-accent-danger",
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getTimePeriod(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  if (date >= today) return "Today";
  if (date >= yesterday) return "Yesterday";
  if (date >= weekAgo) return "This Week";
  return "Earlier";
}

function groupByPeriod(items: FeedItem[]): Map<string, FeedItem[]> {
  const groups = new Map<string, FeedItem[]>();
  const order = ["Today", "Yesterday", "This Week", "Earlier"];

  for (const period of order) {
    const matched = items.filter((i) => getTimePeriod(i.timestamp) === period);
    if (matched.length > 0) groups.set(period, matched);
  }

  return groups;
}

function FeedItemRow({ item }: { item: FeedItem }) {
  const dotColor =
    FEED_EVENT_COLORS[item.eventType as FeedEventType] ?? "bg-text-muted";
  const pulse = FEED_EVENT_PULSE[item.eventType as FeedEventType] ?? false;

  return (
    <div className="group flex items-start gap-3 rounded-md px-3 py-2.5 cursor-pointer hover:bg-surface-overlay transition-colors duration-fast">
      <div className="mt-1.5 flex-shrink-0">
        <span
          className={`inline-block h-2.5 w-2.5 rounded-full ${dotColor} ${
            pulse ? "animate-pulse" : ""
          }`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">
            {item.title}
          </span>
          {item.badge && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                BADGE_COLORS[item.badge] ?? "bg-surface-overlay text-text-muted"
              }`}
            >
              {item.badge}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-text-muted">
          <span className="font-medium text-text-secondary">
            {item.vaultName}
          </span>
          <span>·</span>
          <span>{item.entityName}</span>
          <span>·</span>
          <span>{item.builderName}</span>
          <span>·</span>
          <span>{relativeTime(item.timestamp)}</span>
        </div>
        <p className="mt-0.5 text-xs text-text-muted">{item.detail}</p>
      </div>
      <ArrowRight
        size={14}
        className="mt-1.5 flex-shrink-0 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity duration-fast"
      />
    </div>
  );
}

export default function ActivityFeed({ items }: ActivityFeedProps) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-surface-border bg-surface-raised py-12">
        <span className="text-sm text-text-muted">No matching events</span>
      </div>
    );
  }

  const groups = groupByPeriod(items);

  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised">
      {Array.from(groups.entries()).map(
        ([period, groupItems]: [string, FeedItem[]]) => (
          <div key={period}>
            <div className="sticky top-0 z-[1] border-b border-surface-border-subtle bg-surface-raised px-4 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                {period}
              </span>
            </div>
            <div className="flex flex-col">
              {groupItems.map((item) => (
                <FeedItemRow key={item.id} item={item} />
              ))}
            </div>
          </div>
        ),
      )}
    </div>
  );
}
