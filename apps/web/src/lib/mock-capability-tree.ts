/**
 * Capability Tree — Node definitions, edge definitions, and layout positions.
 * This replaces the linear onboarding wizard + tab-based admin.
 */

import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Brain,
  Database,
  LayoutGrid,
  Users,
  Shield,
  Sparkles,
  Server,
  Wand2,
  Plug,
  GitBranch,
  Radio,
  Flag,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────

export type CapabilityTier = "foundation" | "platform" | "extensions" | "scale";

export type CapabilityNodeState =
  | "locked"
  | "available"
  | "configuring"
  | "configured"
  | "error";

export interface CapabilityNodeDefinition {
  id: string;
  label: string;
  tier: CapabilityTier;
  icon: LucideIcon;
  dependencies: string[];
  defaultConfig: Record<string, unknown>;
  children?: string[];
  isOtto?: boolean;
  description?: string;
  unlockHint?: string;
}

export interface CapabilityEdgeDefinition {
  source: string;
  target: string;
}

// ─── Node Definitions ─────────────────────────────────────────────────

export const CAPABILITY_NODES: CapabilityNodeDefinition[] = [
  // Foundation
  {
    id: "workspace",
    label: "Workspace",
    tier: "foundation",
    icon: Building2,
    dependencies: [],
    defaultConfig: { name: "", industry: "", slug: "" },
    description: "Name your workspace and set your industry",
    unlockHint: "Start here",
  },
  {
    id: "ai_provider",
    label: "AI Provider",
    tier: "foundation",
    icon: Brain,
    dependencies: ["workspace"],
    defaultConfig: {
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      apiKey: "",
    },
    description: "Connect an AI model for OTTO and smart queries",
    unlockHint: "Requires: Workspace",
  },
  {
    id: "data_source",
    label: "Data Source",
    tier: "foundation",
    icon: Database,
    dependencies: ["workspace"],
    defaultConfig: { sourceType: null, connected: false, demoData: false },
    description: "Connect a data source or load demo data",
    unlockHint: "Requires: Workspace",
  },

  // Platform
  {
    id: "modules",
    label: "Modules",
    tier: "platform",
    icon: LayoutGrid,
    dependencies: ["data_source"],
    defaultConfig: { enabled: ["contracts", "crm", "tasks"] },
    children: ["contracts", "crm", "tasks", "calendar", "documents"],
    description: "Enable the modules your team needs",
    unlockHint: "Requires: Data Source",
  },
  {
    id: "members",
    label: "Members",
    tier: "platform",
    icon: Users,
    dependencies: ["workspace"],
    defaultConfig: { invitees: [], skipped: false },
    description: "Invite your team to the workspace",
    unlockHint: "Requires: Workspace",
  },
  {
    id: "roles",
    label: "Roles",
    tier: "platform",
    icon: Shield,
    dependencies: ["members"],
    defaultConfig: { assignments: {} },
    description: "Assign vault roles to team members",
    unlockHint: "Requires: Members",
  },

  // Extensions
  {
    id: "otto",
    label: "OTTO",
    tier: "extensions",
    icon: Sparkles,
    dependencies: ["ai_provider"],
    defaultConfig: {},
    isOtto: true,
    description: "AI assistant — auto-configured when AI Provider is ready",
    unlockHint: "Requires: AI Provider",
  },
  {
    id: "mcp_servers",
    label: "MCP Servers",
    tier: "extensions",
    icon: Server,
    dependencies: ["otto"],
    defaultConfig: { servers: [] },
    description: "Connect Model Context Protocol servers",
    unlockHint: "Requires: OTTO",
  },
  {
    id: "skills",
    label: "Skills",
    tier: "extensions",
    icon: Wand2,
    dependencies: ["mcp_servers"],
    defaultConfig: { skills: [] },
    description: "Create and manage OTTO skills",
    unlockHint: "Requires: MCP Servers",
  },
  {
    id: "integrations",
    label: "Integrations",
    tier: "extensions",
    icon: Plug,
    dependencies: ["workspace"],
    defaultConfig: { connected: [] },
    description: "Connect external services (Slack, DocuSign, etc.)",
    unlockHint: "Requires: Workspace",
  },

  // Scale
  {
    id: "workflows",
    label: "Workflows",
    tier: "scale",
    icon: GitBranch,
    dependencies: ["modules", "members"],
    defaultConfig: { workflows: [] },
    description: "Build automated workflows across modules",
    unlockHint: "Requires: Modules + Members",
  },
  {
    id: "event_bus",
    label: "Event Bus",
    tier: "scale",
    icon: Radio,
    dependencies: ["modules"],
    defaultConfig: { routes: [] },
    description: "Configure event routing rules",
    unlockHint: "Requires: Modules",
  },
  {
    id: "feature_flags",
    label: "Feature Flags",
    tier: "scale",
    icon: Flag,
    dependencies: ["workspace"],
    defaultConfig: { flags: {} },
    description: "Toggle features on, off, or beta",
    unlockHint: "Requires: Workspace",
  },
];

// ─── Edge Definitions ─────────────────────────────────────────────────

export const CAPABILITY_EDGES: CapabilityEdgeDefinition[] = [
  // Foundation
  { source: "workspace", target: "ai_provider" },
  { source: "workspace", target: "data_source" },
  { source: "workspace", target: "members" },

  // Platform
  { source: "data_source", target: "modules" },
  { source: "members", target: "roles" },

  // Extensions
  { source: "ai_provider", target: "otto" },
  { source: "otto", target: "mcp_servers" },
  { source: "mcp_servers", target: "skills" },
  { source: "workspace", target: "integrations" },

  // Scale
  { source: "modules", target: "workflows" },
  { source: "members", target: "workflows" },
  { source: "modules", target: "event_bus" },
  { source: "workspace", target: "feature_flags" },
];

// ─── Node Positions (React Flow layout) ───────────────────────────────

export const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  // Foundation (y: 50)
  workspace: { x: 400, y: 50 },
  ai_provider: { x: 150, y: 200 },
  data_source: { x: 400, y: 200 },
  // Platform (y: 350)
  members: { x: 650, y: 200 },
  modules: { x: 400, y: 380 },
  roles: { x: 650, y: 380 },
  // Extensions (y: 530)
  otto: { x: 50, y: 380 },
  mcp_servers: { x: 50, y: 540 },
  skills: { x: 50, y: 700 },
  integrations: { x: 800, y: 380 },
  // Scale (y: 700)
  workflows: { x: 400, y: 560 },
  event_bus: { x: 550, y: 700 },
  feature_flags: { x: 250, y: 700 },
};

// ─── Tier Y Ranges (for background zones) ─────────────────────────────

export const TIER_ZONES: {
  tier: CapabilityTier;
  label: string;
  yStart: number;
  yEnd: number;
}[] = [
  { tier: "foundation", label: "Foundation", yStart: -20, yEnd: 160 },
  { tier: "platform", label: "Platform", yStart: 160, yEnd: 440 },
  { tier: "extensions", label: "Extensions", yStart: 440, yEnd: 650 },
  { tier: "scale", label: "Scale", yStart: 650, yEnd: 850 },
];

// ─── Demo Pre-configured Nodes ────────────────────────────────────────

export const DEMO_CONFIGURED_NODES = [
  "workspace",
  "ai_provider",
  "data_source",
  "modules",
  "members",
  "otto",
  "integrations",
];

export const DEMO_CONFIGS: Record<string, Record<string, unknown>> = {
  workspace: {
    name: "Airlock Demo",
    industry: "Music & Entertainment",
    slug: "airlock-demo",
  },
  ai_provider: {
    provider: "anthropic",
    model: "claude-sonnet-4-6",
    apiKey: "sk-ant-demo-key",
  },
  data_source: { sourceType: "demo", connected: true, demoData: true },
  modules: { enabled: ["contracts", "crm", "tasks", "calendar", "documents"] },
  members: {
    invitees: ["jane@airlock.dev", "tom@airlock.dev", "sarah@airlock.dev"],
    skipped: false,
  },
  otto: { ready: true, toolCount: 12 },
  integrations: { connected: ["slack"] },
};

// ─── Suggested Next Step Logic ────────────────────────────────────────

export interface SuggestedStep {
  nodeId: string;
  label: string;
  description: string;
}

/**
 * Priority order of nodes to suggest. First available (unlocked + not configured) wins.
 */
export const SUGGESTION_PRIORITY: string[] = [
  "workspace",
  "ai_provider",
  "data_source",
  "members",
  "modules",
  "otto",
  "roles",
  "mcp_servers",
  "integrations",
  "skills",
  "workflows",
  "event_bus",
  "feature_flags",
];

export const SUGGESTION_DESCRIPTIONS: Record<string, string> = {
  workspace: "to name your workspace and set industry",
  ai_provider: "to unlock OTTO and smart queries",
  data_source: "to connect data and enable modules",
  members: "to invite your team",
  modules: "to enable the modules your team needs",
  otto: "is ready — click to activate your AI assistant",
  roles: "to assign vault permissions to members",
  mcp_servers: "to connect external tool servers",
  integrations: "to connect Slack, DocuSign, and more",
  skills: "to create custom OTTO skills",
  workflows: "to automate cross-module processes",
  event_bus: "to configure event routing",
  feature_flags: "to toggle features for your workspace",
};
