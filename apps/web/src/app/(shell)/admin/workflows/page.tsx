"use client";

import { useWorkflowStore } from "@/stores/workflow.store";
import WorkflowList from "@/components/organisms/WorkflowList";
import WorkflowBuilder from "@/components/templates/WorkflowBuilder";

export default function WorkflowsPage() {
  const { activeView, openBuilder, setActiveView } = useWorkflowStore();

  if (activeView === "builder") {
    return <WorkflowBuilder onBack={() => setActiveView("list")} />;
  }

  return <WorkflowList onOpenBuilder={openBuilder} />;
}
