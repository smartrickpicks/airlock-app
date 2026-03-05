"use client";

import { useEffect } from "react";
import { useCrmStore } from "@/stores/crm.store";
import LeadsTable from "@/components/organisms/LeadsTable";

export default function CrmLeadsPage() {
  const { leads, isLoading, fetchCrmData } = useCrmStore();

  useEffect(() => {
    fetchCrmData();
  }, [fetchCrmData]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-sm text-text-muted">Loading leads...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 overflow-y-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">New Leads</h1>
          <p className="text-xs text-text-muted">
            Entities from contract ingestion + inbound — {leads.length} leads
          </p>
        </div>
        <span className="rounded-full bg-accent-primary/15 px-3 py-1 text-xs font-medium text-accent-primary">
          CRM
        </span>
      </div>
      <LeadsTable leads={leads} />
    </div>
  );
}
