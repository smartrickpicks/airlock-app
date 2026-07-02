"use client";

import { useCapabilityTreeStore } from "@/stores/capability-tree.store";
import WorkspaceConfig from "@/components/molecules/config/WorkspaceConfig";
import AiProviderConfig from "@/components/molecules/config/AiProviderConfig";
import DataSourceConfig from "@/components/molecules/config/DataSourceConfig";
import ModulesConfig from "@/components/molecules/config/ModulesConfig";
import MembersConfig from "@/components/molecules/config/MembersConfig";
import RolesConfig from "@/components/molecules/config/RolesConfig";
import OttoConfig from "@/components/molecules/config/OttoConfig";
import McpServersConfig from "@/components/molecules/config/McpServersConfig";
import SkillsConfig from "@/components/molecules/config/SkillsConfig";
import IntegrationsConfig from "@/components/molecules/config/IntegrationsConfig";
import WorkflowsConfig from "@/components/molecules/config/WorkflowsConfig";
import EventBusConfig from "@/components/molecules/config/EventBusConfig";
import FeatureFlagsConfig from "@/components/molecules/config/FeatureFlagsConfig";

interface NodeConfigPanelProps {
  nodeId: string;
  config: Record<string, unknown>;
}

const CONFIG_MAP: Record<string, React.ComponentType<ConfigFormProps>> = {
  workspace: WorkspaceConfig,
  ai_provider: AiProviderConfig,
  data_source: DataSourceConfig,
  modules: ModulesConfig,
  members: MembersConfig,
  roles: RolesConfig,
  otto: OttoConfig,
  mcp_servers: McpServersConfig,
  skills: SkillsConfig,
  integrations: IntegrationsConfig,
  workflows: WorkflowsConfig,
  event_bus: EventBusConfig,
  feature_flags: FeatureFlagsConfig,
};

export interface ConfigFormProps {
  config: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => void;
  onCancel: () => void;
}

export default function NodeConfigPanel({
  nodeId,
  config,
}: NodeConfigPanelProps) {
  const saveNodeConfig = useCapabilityTreeStore((s) => s.saveNodeConfig);
  const collapseNode = useCapabilityTreeStore((s) => s.collapseNode);

  const ConfigComponent = CONFIG_MAP[nodeId];
  if (!ConfigComponent) {
    return (
      <div className="p-4 text-xs text-text-muted">
        No configuration available
      </div>
    );
  }

  return (
    <ConfigComponent
      config={config}
      onSave={(newConfig) => saveNodeConfig(nodeId, newConfig)}
      onCancel={collapseNode}
    />
  );
}
