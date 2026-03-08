"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import CapabilityTree from "@/components/organisms/CapabilityTree";
import { useCapabilityTreeStore } from "@/stores/capability-tree.store";

export default function AdminPage() {
  const searchParams = useSearchParams();
  const expandNode = useCapabilityTreeStore((s) => s.expandNode);
  const initTree = useCapabilityTreeStore((s) => s.initTree);

  // Demo mode via ?demo=true
  useEffect(() => {
    if (searchParams.get("demo") === "true") {
      initTree(true);
    }
  }, [searchParams, initTree]);

  // Auto-expand node via ?node=<id>
  useEffect(() => {
    const nodeId = searchParams.get("node");
    if (nodeId) {
      // Small delay to let tree render first
      const t = setTimeout(() => expandNode(nodeId), 100);
      return () => clearTimeout(t);
    }
  }, [searchParams, expandNode]);

  return <CapabilityTree />;
}
