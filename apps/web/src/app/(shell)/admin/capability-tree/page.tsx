"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useCapabilityTreeStore } from "@/stores/capability-tree.store";
import { useOnboardingStore } from "@/stores/onboarding.store";

const CapabilityTree = dynamic(
  () => import("@/components/organisms/CapabilityTree"),
  { ssr: false },
);

export default function AdminCapabilityTreePage() {
  const nodeStates = useCapabilityTreeStore((s) => s.nodeStates);

  // Mark "review_results" when 3+ nodes are configured
  useEffect(() => {
    const configuredCount = Object.values(nodeStates).filter(
      (state) => state === "configured",
    ).length;
    if (configuredCount >= 3) {
      useOnboardingStore.getState().completeAdminItem("review_results");
    }
  }, [nodeStates]);

  return (
    <div className="h-full w-full">
      <CapabilityTree />
    </div>
  );
}
