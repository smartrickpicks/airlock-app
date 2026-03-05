"use client";

import { useEffect, useMemo } from "react";
import { useReviewQueueStore } from "@/stores/review-queue.store";
import { MOCK_BUILDERS } from "@/lib/mock-review-queue";
import type { FeedItem } from "@/lib/mock-review-queue";
import EntityCard from "@/components/organisms/EntityCard";
import HandoffSignalPanel from "@/components/molecules/HandoffSignalPanel";
import FilterBar from "@/components/molecules/FilterBar";
import ActivityFeed from "@/components/organisms/ActivityFeed";

const FILTER_PREFIX: Record<string, string[]> = {
  patch: ["patch."],
  rfi: ["rfi."],
  correction: ["correction."],
  anomaly: ["anomaly."],
  activity: ["activity."],
  escalation: ["escalation."],
};

export default function ReviewQueuePage() {
  const {
    parentVaults,
    signals,
    feedItems,
    isLoading,
    expandedCards,
    activeFilter,
    builderFilter,
    entityFilter,
    fetchReviewQueue,
    toggleCard,
    setActiveFilter,
    setBuilderFilter,
    setEntityFilter,
  } = useReviewQueueStore();

  useEffect(() => {
    fetchReviewQueue();
  }, [fetchReviewQueue]);

  const entityNames = useMemo(
    () => parentVaults.map((pv) => pv.name),
    [parentVaults],
  );

  const filteredFeed = useMemo(() => {
    let items: FeedItem[] = feedItems;

    if (activeFilter !== "all") {
      const prefixes = FILTER_PREFIX[activeFilter] ?? [];
      items = items.filter((item) =>
        prefixes.some((p) => item.eventType.startsWith(p)),
      );
    }

    if (builderFilter) {
      items = items.filter((item) => item.builderName === builderFilter);
    }

    if (entityFilter) {
      items = items.filter((item) => item.entityName === entityFilter);
    }

    return items;
  }, [feedItems, activeFilter, builderFilter, entityFilter]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-sm text-text-muted">Loading review queue...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 overflow-y-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">
            Review Queue
          </h1>
          <p className="text-xs text-text-muted">
            Cross-vault review dashboard — Review chamber
          </p>
        </div>
        <span className="rounded-full bg-chamber-review/15 px-3 py-1 text-xs font-medium text-chamber-review">
          Review
        </span>
      </div>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Parent Vault Entities
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {parentVaults.map((card) => (
            <EntityCard
              key={card.id}
              card={card}
              expanded={expandedCards.has(card.id)}
              onToggle={() => toggleCard(card.id)}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Handoff Signals
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {signals.map((signal) => (
            <HandoffSignalPanel key={signal.type} signal={signal} />
          ))}
        </div>
      </section>

      <section>
        <FilterBar
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          builderFilter={builderFilter}
          onBuilderChange={setBuilderFilter}
          entityFilter={entityFilter}
          onEntityChange={setEntityFilter}
          builders={MOCK_BUILDERS}
          entities={entityNames}
        />
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Activity Feed
        </h2>
        <ActivityFeed items={filteredFeed} />
      </section>
    </div>
  );
}
