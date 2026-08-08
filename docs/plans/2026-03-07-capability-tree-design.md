# Capability Tree — Onboarding & Admin Replacement Design

**Status:** DRAFT
**Date:** 2026-03-07
**Scope:** Frontend (Next.js, React Flow, Zustand), replaces Overlay admin + onboarding wizard

---

## Goal

Replace the linear 6-step onboarding wizard AND the tab-based Overlay admin with a single **capability tree** — an interactive node graph that is the workspace's living activation map. Every configurable surface (AI providers, MCP servers, modules, members, skills, workflows) is a node. Dependency edges show what unlocks what. Configured nodes glow; locked nodes are dim.

Day one: admin drops into the tree with everything unconfigured. Critical nodes pulse. They configure nodes in dependency order. The tree never "finishes" — it grows as the workspace evolves.

---

## Decisions (Locked)

| Decision             | Choice                               | Rationale                                            |
| -------------------- | ------------------------------------ | ---------------------------------------------------- |
| Tree location        | Replaces Overlay admin entirely      | Admin IS the tree, not a separate surface            |
| First-run experience | Tree from moment zero                | No separate wizard; unconfigured nodes pulse         |
| Node dependencies    | Strict dependency graph              | Prevents misconfiguration; clear activation path     |
| Visual layout        | Interactive node graph (React Flow)  | Circles + edges, zoom/pan, spatial relationships     |
| Node interaction     | Inline expand (node grows)           | Click node → expands into config form in-place       |
| OTTO placement       | Visible node in the graph            | Connected to AI Provider; click to open chat         |
| Demo scope           | Full interactive graph, mock backend | Shows vision without real API keys/MCP               |
| Graph library        | @xyflow/react (already installed)    | Purpose-built, handles layout + edges + custom nodes |

---

## Architecture

### Node Graph Layout

```
                    ┌─────────────┐
                    │  Workspace  │ ← root node, always first
                    └──────┬──────┘
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
     ┌────────────┐ ┌───────────┐ ┌────────────┐
     │ AI Provider│ │Data Source │ │  Members   │
     └─────┬──────┘ └─────┬─────┘ └─────┬──────┘
           │              │              │
           ▼              ▼              ▼
     ┌────────────┐ ┌───────────┐ ┌────────────┐
     │    OTTO    │ │  Modules  │ │   Roles    │
     └─────┬──────┘ └───────────┘ └────────────┘
           │          (5 child nodes)
           ▼
     ┌────────────┐
     │MCP Servers │
     └─────┬──────┘
           │
           ▼
     ┌────────────┐
     │   Skills   │
     └────────────┘

     ┌────────────┐ ┌────────────┐ ┌────────────┐
     │ Workflows  │ │ Event Bus  │ │Feature Flags│
     └────────────┘ └────────────┘ └────────────┘
     (depend on: Modules + Members)
```

### Four Tiers

| Tier           | Nodes                                   | Dependencies                                          |
| -------------- | --------------------------------------- | ----------------------------------------------------- |
| **Foundation** | Workspace, AI Provider, Data Source     | Workspace is root (no deps)                           |
| **Platform**   | Modules (×5), Members, Roles            | Modules require Data Source; Roles require Members    |
| **Extensions** | OTTO, MCP Servers, Skills, Integrations | OTTO requires AI Provider; Skills require MCP Servers |
| **Scale**      | Workflows, Event Bus, Feature Flags     | Require Modules + Members                             |

### Dependency Graph (Edges)

```typescript
const CAPABILITY_EDGES: CapabilityEdge[] = [
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
```

---

## Node States

Each node has exactly one state at any time:

| State         | Visual                                    | Interaction                                   |
| ------------- | ----------------------------------------- | --------------------------------------------- |
| `locked`      | Dim circle, dashed border, lock icon      | Click shows "Requires: [parent node]" tooltip |
| `available`   | Normal circle, solid border, pulsing glow | Click expands inline config form              |
| `configuring` | Expanded card with form fields            | Fill out config, save                         |
| `configured`  | Bright circle, glowing, check icon        | Click expands to show config + edit button    |
| `error`       | Red circle, warning icon                  | Click expands to show error + retry           |

### State Transitions

```
locked → available        (when all parent nodes reach "configured")
available → configuring   (user clicks node)
configuring → configured  (user saves valid config)
configuring → available   (user cancels / closes)
configured → configuring  (user clicks "Edit")
configured → error        (health check fails)
error → configuring       (user clicks "Fix")
```

---

## Node Definitions

### Foundation Tier

#### Workspace (root)

- **Config fields**: Name, Industry, Slug
- **Dependencies**: None
- **Configured when**: Name is set
- **Maps to**: Current onboarding step 1

#### AI Provider

- **Config fields**: Provider type (Anthropic/OpenRouter/Custom), API key, Model, Role access
- **Dependencies**: Workspace
- **Configured when**: API key is saved (or mock key in demo mode)
- **Maps to**: Current `mock-connectors.ts` AI Providers section

#### Data Source

- **Config fields**: Source type (Google Drive/Upload/API), Connection config, Demo data toggle
- **Dependencies**: Workspace
- **Configured when**: Source connected or demo data loaded
- **Maps to**: Current onboarding step 5

### Platform Tier

#### Modules (parent node with 5 children)

- **Children**: Contracts, CRM, Tasks, Calendar, Documents
- **Config fields**: Enable/disable toggle per module
- **Dependencies**: Data Source
- **Configured when**: At least 1 module enabled
- **Maps to**: Current onboarding step 2
- **Note**: Each child module is a sub-node that can be individually toggled

#### Members

- **Config fields**: Invite by email, assign org role
- **Dependencies**: Workspace
- **Configured when**: At least 1 member invited (or skipped)
- **Maps to**: Current onboarding step 4

#### Roles

- **Config fields**: Role assignment matrix (user × module role)
- **Dependencies**: Members
- **Configured when**: All members have at least 1 module role

### Extensions Tier

#### OTTO

- **Config fields**: None (auto-configured when AI Provider is ready)
- **Dependencies**: AI Provider
- **Configured when**: AI Provider is configured
- **Special**: Click opens OTTO chat interface within expanded node
- **Status displays**: "Ready", "Needs AI Key", "X tools available"

#### MCP Servers

- **Config fields**: Paste URL → discover tools → assign role permissions
- **Dependencies**: OTTO
- **Configured when**: At least 1 server connected with tools discovered
- **Maps to**: Current `ConnectorsView.tsx` MCP Servers tab
- **Expand view**: Server list + "Add Server" button; drill into tool permission matrix

#### Skills

- **Config fields**: Skill creator (guided conversation or manual JSON)
- **Dependencies**: MCP Servers
- **Configured when**: At least 1 skill created
- **Maps to**: Current `SkillsList.tsx`

#### Integrations

- **Config fields**: OAuth connection flows (Slack, DocuSign, Notion, Jira)
- **Dependencies**: Workspace
- **Configured when**: At least 1 integration connected
- **Maps to**: Current `ConnectorsView.tsx` Integrations tab

### Scale Tier

#### Workflows

- **Config fields**: Workflow builder (future)
- **Dependencies**: Modules, Members
- **Configured when**: At least 1 workflow active

#### Event Bus

- **Config fields**: Event routing rules (future)
- **Dependencies**: Modules
- **Configured when**: At least 1 event route configured

#### Feature Flags

- **Config fields**: Flag toggles
- **Dependencies**: Workspace
- **Configured when**: Any flag modified from default

---

## Inline Expand Interaction

When a user clicks an `available` or `configured` node:

1. **Node grows** — circle animates into a card (React Flow custom node with dynamic dimensions)
2. **Other nodes shift** — React Flow's layout engine repositions surrounding nodes with spring animation
3. **Config form appears** — inside the expanded card
4. **Edges stay connected** — dependency lines stretch/curve to follow the expanded position
5. **Save or Cancel** — saves config and collapses back to circle, or cancels and collapses

### Expanded Node Layout

```
┌─────────────────────────────────┐
│ ● AI Provider              [×] │  ← header with close
│─────────────────────────────────│
│ Provider:  [Anthropic     ▼]   │
│ API Key:   [sk-ant-•••••••••]  │
│ Model:     [claude-sonnet-4 ▼] │
│ Access:    [All roles      ▼]  │
│                                 │
│ Status: ● Connected  12ms ago  │
│                                 │
│         [Save]  [Cancel]       │
└─────────────────────────────────┘
```

### React Flow Custom Node Component

```typescript
// Simplified — actual implementation will use @xyflow/react
interface CapabilityNodeData {
  id: string;
  label: string;
  tier: "foundation" | "platform" | "extensions" | "scale";
  state: "locked" | "available" | "configuring" | "configured" | "error";
  icon: string;
  dependencies: string[];
  configComponent: React.ComponentType<ConfigPanelProps>;
}

function CapabilityNode({ data }: NodeProps<CapabilityNodeData>) {
  const isExpanded = data.state === "configuring";

  return (
    <div className={cn(
      "capability-node",
      `capability-node--${data.state}`,
      `capability-node--${data.tier}`,
      isExpanded && "capability-node--expanded"
    )}>
      {isExpanded ? (
        <ExpandedConfig data={data} />
      ) : (
        <CollapsedCircle data={data} />
      )}
    </div>
  );
}
```

---

## Zustand Store

### New Store: `capability-tree.store.ts`

Replaces `onboarding.store.ts` and the admin tab navigation.

```typescript
interface CapabilityNode {
  id: string;
  label: string;
  tier: "foundation" | "platform" | "extensions" | "scale";
  state: "locked" | "available" | "configuring" | "configured" | "error";
  config: Record<string, unknown>; // node-specific config data
  dependencies: string[]; // IDs of parent nodes
  statusMessage?: string;
  lastConfiguredAt?: string;
}

interface CapabilityTreeState {
  nodes: Record<string, CapabilityNode>;
  expandedNodeId: string | null; // only one node expanded at a time

  // Actions
  expandNode: (id: string) => void;
  collapseNode: () => void;
  saveNodeConfig: (id: string, config: Record<string, unknown>) => void;
  setNodeError: (id: string, message: string) => void;

  // Derived
  getNodeState: (id: string) => CapabilityNode["state"];
  getAvailableNodes: () => CapabilityNode[];
  getProgress: () => { configured: number; total: number };
  isNodeUnlocked: (id: string) => boolean;
}
```

### Dependency Resolution

```typescript
function resolveNodeState(
  nodeId: string,
  nodes: Record<string, CapabilityNode>,
  edges: CapabilityEdge[],
): "locked" | "available" {
  const parentEdges = edges.filter((e) => e.target === nodeId);
  const allParentsConfigured = parentEdges.every(
    (e) => nodes[e.source]?.state === "configured",
  );
  return allParentsConfigured ? "available" : "locked";
}
```

### Persistence

- **localStorage key**: `airlock_capability_tree`
- Persists node configs + states
- On load: re-resolve `locked` vs `available` from dependency graph (don't trust stored lock state)

---

## Visual Design

### OLED Dark Theme Integration

- **Locked nodes**: `bg-surface-secondary/30`, `border-surface-border` (dashed), `text-text-muted`
- **Available nodes**: `bg-surface-secondary`, `border-surface-border`, pulsing `ring-accent-primary/40`
- **Configured nodes**: `bg-surface-secondary`, `border-accent-primary`, `text-accent-primary` icon
- **Error nodes**: `border-status-error`, `text-status-error` icon
- **Edges (satisfied)**: `stroke-accent-primary/60`, animated dash
- **Edges (unsatisfied)**: `stroke-surface-border/40`, static dash

### Tier Color Accents

Each tier gets a subtle background zone on the canvas:

| Tier       | Zone Color                  | Label        |
| ---------- | --------------------------- | ------------ |
| Foundation | `surface-primary` (default) | "Foundation" |
| Platform   | subtle blue tint            | "Platform"   |
| Extensions | subtle purple tint          | "Extensions" |
| Scale      | subtle green tint           | "Scale"      |

### Node Sizes

- **Collapsed**: 80×80px circle
- **Expanded**: 320×auto card (height depends on form)
- **Transition**: 300ms spring animation via React Flow + CSS

### OTTO Node Special Treatment

- Larger than other nodes (100×100px)
- Sparkle/brain icon
- When configured: shows mini status ("3 tools ready", "Chat available")
- Pulsing animation when ready but unused

---

## Routing

### URL Structure

The capability tree replaces the admin layout. New routes:

```
/admin                  → Capability tree graph (replaces tab layout)
/admin?node=ai_provider → Tree with ai_provider node auto-expanded
```

Query param `?node=` deep-links to a specific expanded node. This replaces the old tab-based routing (`/admin/connectors`, `/admin/members`, etc.).

### Redirect Map (backwards compat)

| Old Route           | New Route                              |
| ------------------- | -------------------------------------- |
| `/admin`            | `/admin` (no change, but renders tree) |
| `/admin/connectors` | `/admin?node=mcp_servers`              |
| `/admin/skills`     | `/admin?node=skills`                   |
| `/admin/members`    | `/admin?node=members`                  |
| `/admin/features`   | `/admin?node=feature_flags`            |
| `/admin/settings`   | `/admin?node=workspace`                |
| `/admin/event-bus`  | `/admin?node=event_bus`                |
| `/admin/workflows`  | `/admin?node=workflows`                |
| `/onboarding`       | `/admin` (tree from moment zero)       |

### Layout Change

The admin layout (`apps/web/src/app/(shell)/admin/layout.tsx`) drops the tab navigation entirely. The tree IS the navigation.

---

## Onboarding Flow (Tree from Moment Zero)

### First Visit Sequence

1. New workspace → `/admin` (capability tree)
2. Only `Workspace` node is `available` (pulsing). Everything else is `locked`.
3. Admin clicks Workspace → inline expand → enters name + industry → saves
4. Workspace becomes `configured` → AI Provider, Data Source, Members unlock (become `available`, start pulsing)
5. Admin configures AI Provider → OTTO unlocks
6. Admin configures Data Source → Modules unlock
7. Pattern continues down the dependency graph

### Suggested Next Steps

When a node is configured, its children start pulsing. Additionally, a subtle "Next:" indicator appears near the most impactful unconfigured node:

```
┌──────────────────────────────┐
│ Next: Connect an AI Provider │
│ to unlock OTTO               │
│            [Go →]            │
└──────────────────────────────┘
```

This appears as a floating card near the bottom of the canvas, pointing toward the suggested node.

### Progress Indicator

Top-right corner of the canvas:

```
Capabilities: 3/15 configured
████░░░░░░░░░░░ 20%
```

---

## Mock Data Layer

### `lib/mock-capability-tree.ts`

Defines the initial node graph, default configs, and simulated states for demo mode.

```typescript
export const INITIAL_NODES: CapabilityNodeDefinition[] = [
  // Foundation
  {
    id: "workspace",
    label: "Workspace",
    tier: "foundation",
    icon: "Building2",
    dependencies: [],
    defaultConfig: { name: "", industry: "", slug: "" },
  },
  {
    id: "ai_provider",
    label: "AI Provider",
    tier: "foundation",
    icon: "Brain",
    dependencies: ["workspace"],
    defaultConfig: {
      provider: "anthropic",
      model: "claude-sonnet-4",
      apiKey: "",
    },
  },
  {
    id: "data_source",
    label: "Data Source",
    tier: "foundation",
    icon: "Database",
    dependencies: ["workspace"],
    defaultConfig: { sourceType: null, connected: false, demoData: false },
  },
  // Platform
  {
    id: "modules",
    label: "Modules",
    tier: "platform",
    icon: "LayoutGrid",
    dependencies: ["data_source"],
    defaultConfig: { enabled: ["contracts", "crm", "tasks"] },
    children: ["contracts", "crm", "tasks", "calendar", "documents"],
  },
  {
    id: "members",
    label: "Members",
    tier: "platform",
    icon: "Users",
    dependencies: ["workspace"],
    defaultConfig: { invitees: [], skipped: false },
  },
  {
    id: "roles",
    label: "Roles",
    tier: "platform",
    icon: "Shield",
    dependencies: ["members"],
    defaultConfig: { assignments: {} },
  },
  // Extensions
  {
    id: "otto",
    label: "OTTO",
    tier: "extensions",
    icon: "Sparkles",
    dependencies: ["ai_provider"],
    defaultConfig: {}, // auto-configured
  },
  {
    id: "mcp_servers",
    label: "MCP Servers",
    tier: "extensions",
    icon: "Server",
    dependencies: ["otto"],
    defaultConfig: { servers: [] },
  },
  {
    id: "skills",
    label: "Skills",
    tier: "extensions",
    icon: "Wand2",
    dependencies: ["mcp_servers"],
    defaultConfig: { skills: [] },
  },
  {
    id: "integrations",
    label: "Integrations",
    tier: "extensions",
    icon: "Plug",
    dependencies: ["workspace"],
    defaultConfig: { connected: [] },
  },
  // Scale
  {
    id: "workflows",
    label: "Workflows",
    tier: "scale",
    icon: "GitBranch",
    dependencies: ["modules", "members"],
    defaultConfig: { workflows: [] },
  },
  {
    id: "event_bus",
    label: "Event Bus",
    tier: "scale",
    icon: "Radio",
    dependencies: ["modules"],
    defaultConfig: { routes: [] },
  },
  {
    id: "feature_flags",
    label: "Feature Flags",
    tier: "scale",
    icon: "Flag",
    dependencies: ["workspace"],
    defaultConfig: { flags: {} },
  },
];

// Pre-configured demo state (for demo mode / screenshots)
export const DEMO_CONFIGURED_NODES = [
  "workspace",
  "ai_provider",
  "data_source",
  "modules",
  "members",
  "otto",
  "integrations",
];
```

### Demo Mode

A `?demo=true` query param pre-configures Foundation + Platform + OTTO with mock data, letting the demo show a workspace mid-activation with Extensions partially configured.

---

## Files Touched

### New Files

| File                                                              | Purpose                                                          |
| ----------------------------------------------------------------- | ---------------------------------------------------------------- |
| `apps/web/src/stores/capability-tree.store.ts`                    | Zustand store for tree state, dependency resolution, persistence |
| `apps/web/src/lib/mock-capability-tree.ts`                        | Node definitions, edge definitions, demo state                   |
| `apps/web/src/components/organisms/CapabilityTree.tsx`            | React Flow graph wrapper, layout, zoom/pan                       |
| `apps/web/src/components/organisms/CapabilityNode.tsx`            | Custom React Flow node (collapsed circle + expanded card)        |
| `apps/web/src/components/organisms/CapabilityEdge.tsx`            | Custom React Flow edge (animated, state-aware)                   |
| `apps/web/src/components/molecules/NodeConfigPanel.tsx`           | Generic wrapper for inline config forms                          |
| `apps/web/src/components/molecules/config/WorkspaceConfig.tsx`    | Workspace name/industry form                                     |
| `apps/web/src/components/molecules/config/AiProviderConfig.tsx`   | AI provider setup form                                           |
| `apps/web/src/components/molecules/config/DataSourceConfig.tsx`   | Data source connection form                                      |
| `apps/web/src/components/molecules/config/ModulesConfig.tsx`      | Module enable/disable toggles                                    |
| `apps/web/src/components/molecules/config/MembersConfig.tsx`      | Invite members form                                              |
| `apps/web/src/components/molecules/config/RolesConfig.tsx`        | Role assignment matrix                                           |
| `apps/web/src/components/molecules/config/OttoConfig.tsx`         | OTTO status + mini chat                                          |
| `apps/web/src/components/molecules/config/McpServersConfig.tsx`   | MCP server list + add flow                                       |
| `apps/web/src/components/molecules/config/SkillsConfig.tsx`       | Skill list + creator                                             |
| `apps/web/src/components/molecules/config/IntegrationsConfig.tsx` | OAuth integration cards                                          |
| `apps/web/src/components/molecules/config/WorkflowsConfig.tsx`    | Workflow builder placeholder                                     |
| `apps/web/src/components/molecules/config/EventBusConfig.tsx`     | Event bus placeholder                                            |
| `apps/web/src/components/molecules/config/FeatureFlagsConfig.tsx` | Flag toggle list                                                 |

### Modified Files

| File                                                 | Change                                            |
| ---------------------------------------------------- | ------------------------------------------------- |
| `apps/web/src/app/(shell)/admin/layout.tsx`          | Remove tab navigation, render tree as full canvas |
| `apps/web/src/app/(shell)/admin/page.tsx`            | Render `CapabilityTree` component                 |
| `apps/web/src/app/(shell)/admin/connectors/page.tsx` | Redirect to `/admin?node=mcp_servers`             |
| `apps/web/src/app/(shell)/admin/skills/page.tsx`     | Redirect to `/admin?node=skills`                  |
| `apps/web/src/app/(shell)/admin/members/page.tsx`    | Redirect to `/admin?node=members`                 |
| `apps/web/src/app/(shell)/admin/features/page.tsx`   | Redirect to `/admin?node=feature_flags`           |
| `apps/web/src/app/(shell)/admin/settings/page.tsx`   | Redirect to `/admin?node=workspace`               |
| `apps/web/src/app/(shell)/admin/event-bus/page.tsx`  | Redirect to `/admin?node=event_bus`               |
| `apps/web/src/app/(shell)/admin/workflows/page.tsx`  | Redirect to `/admin?node=workflows`               |
| `apps/web/src/app/onboarding/page.tsx`               | Redirect to `/admin`                              |

### Preserved (Not Deleted)

- `ConnectorsView.tsx` — config forms extracted and reused in node config panels
- `SkillsList.tsx` — skill list UI reused in SkillsConfig
- `onboarding.store.ts` — deprecated but kept for backwards compat during transition

---

## Relationship to Existing Plans

### OTTO MCP Gateway (`2026-03-07-otto-mcp-gateway-design.md`)

The capability tree's OTTO node visualizes the gateway's readiness. When AI Provider is configured, OTTO node shows "Ready". When MCP servers are added, OTTO's status updates to "X tools available". The tree doesn't replace the gateway — it's the admin's view INTO the gateway's configuration.

### MCP Registry (`2026-03-06-mcp-registry-and-skills.md`)

The MCP Servers and Skills nodes in the tree are the admin UI for the MCP Registry backend. The `McpServersConfig` panel renders the tool permission matrix from the registry spec. The `SkillsConfig` panel wraps the Interactive Skill Creator flow.

### Demo Readiness Build Plan (`demo-readiness-build-plan.md`)

This design is additive to the existing tracks. The capability tree is a **new track** (Track C) that can run in parallel with Track A (seeded demo) and Track B (intake proof). The tree uses mock data for demo, then progressively wires to real backend as Tracks A/B complete.

---

## Implementation Order

1. **Store + mock data** — `capability-tree.store.ts`, `mock-capability-tree.ts`, dependency resolver
2. **Graph shell** — `CapabilityTree.tsx` with React Flow, custom nodes (collapsed only), edges
3. **Inline expand** — `CapabilityNode.tsx` expand/collapse animation, `NodeConfigPanel.tsx` wrapper
4. **Config forms** — One at a time, starting with Foundation tier (Workspace, AI Provider, Data Source)
5. **Admin layout swap** — Replace tab layout with tree canvas, add redirects
6. **Platform tier configs** — Modules, Members, Roles
7. **Extensions tier configs** — OTTO, MCP Servers (reuse ConnectorsView internals), Skills (reuse SkillsList)
8. **Scale tier configs** — Workflows, Event Bus, Feature Flags (placeholder forms)
9. **Polish** — Suggested next steps floating card, progress indicator, demo mode
10. **Onboarding redirect** — `/onboarding` → `/admin`
