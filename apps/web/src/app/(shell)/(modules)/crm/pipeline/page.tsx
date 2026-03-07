"use client";

import { useEffect } from "react";
import { useCrmStore } from "@/stores/crm.store";
import PipelineBoard from "@/components/organisms/PipelineBoard";

export default function CrmPipelinePage() {
  const { deals, isLoading, fetchCrmData, moveDeal } = useCrmStore();

  useEffect(() => {
    fetchCrmData();
  }, [fetchCrmData]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-sm text-text-muted">Loading pipeline...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Pipeline</h1>
          <p className="text-xs text-text-muted">
            Deal flow across stages — {deals.length} active deals
          </p>
        </div>
        <span className="rounded-full bg-accent-primary/15 px-3 py-1 text-xs font-medium text-accent-primary">
          CRM
        </span>
      </div>
      <PipelineBoard deals={deals} onMoveDeal={moveDeal} />
    </div>
  );
}
