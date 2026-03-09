import type { Metadata } from "next";
import WorkspaceForge from "@/components/templates/WorkspaceForge";

export const metadata: Metadata = {
  title: "Workspace Forge — Airlock",
  description: "Configure your workspace with Otto, the AI assistant",
};

export default function ForgePage() {
  return <WorkspaceForge />;
}
