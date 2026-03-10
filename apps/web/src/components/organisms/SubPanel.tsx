"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  AlertTriangle,
  Calendar,
  FolderOpen,
  GitBranch,
  LayoutGrid,
  Plus,
  PlusCircle,
  Building2,
  Brain,
  Database,
  Users,
  Shield,
  Sparkles,
  Server,
  Wand2,
  Plug,
  Radio,
  Flag,
  ScrollText,
  User,
  Palette,
  ChevronRight,
  Check,
  Lock,
  Orbit,
} from "lucide-react";
import SearchInput from "@/components/atoms/SearchInput";
import CreateVaultModal from "@/components/molecules/CreateVaultModal";
import ChamberLabel from "@/components/atoms/ChamberLabel";
import PinnedChannel from "@/components/molecules/PinnedChannel";
import VaultItem from "@/components/molecules/VaultItem";
import VaultContextMenu from "@/components/molecules/VaultContextMenu";
import { useModuleStore } from "@/stores/module.store";
import { useVaultStore } from "@/stores/vault.store";
import { useNotificationStore } from "@/stores/notification.store";
import { useCapabilityTreeStore } from "@/stores/capability-tree.store";
import { useRealtimeStore } from "@/stores/realtime.store";
import { MODULES, CHAMBERS, type ChamberName } from "@/lib/constants";

type GroupingMode = "chamber" | "entity" | "status" | "lifecycle";

const GROUPING_OPTIONS: { value: GroupingMode; label: string }[] = [
  { value: "chamber", label: "By Chamber" },
  { value: "entity", label: "By Entity" },
  { value: "status", label: "By Status" },
  { value: "lifecycle", label: "By Lifecycle" },
];

const pinnedByModule: Record<
  string,
  { icon: typeof AlertTriangle; label: string; path: string }[]
> = {
  contracts: [
    {
      icon: AlertTriangle,
      label: "Triage Dashboard",
      path: "/contracts/triage",
    },
    { icon: PlusCircle, label: "Generator", path: "/contracts/generator" },
  ],
  crm: [{ icon: GitBranch, label: "Pipeline", path: "/crm/pipeline" }],
  tasks: [{ icon: LayoutGrid, label: "Board", path: "/tasks/board" }],
  calendar: [{ icon: Calendar, label: "Month View", path: "/calendar/month" }],
  documents: [
    { icon: FolderOpen, label: "All Documents", path: "/documents/all" },
  ],
};

const CHAMBER_KEYS: ChamberName[] = ["discover", "build", "review", "ship"];

const ADMIN_TIERS = [
  {
    label: "Foundation",
    nodes: [
      {
        id: "workspace",
        label: "Workspace",
        icon: Building2,
        route: "/admin/workspace",
      },
      {
        id: "ai_provider",
        label: "AI Provider",
        icon: Brain,
        route: "/admin/ai-provider",
      },
      {
        id: "data_source",
        label: "Data Source",
        icon: Database,
        route: "/admin/data-source",
      },
    ],
  },
  {
    label: "Platform",
    nodes: [
      {
        id: "modules",
        label: "Modules",
        icon: LayoutGrid,
        route: "/admin/modules",
      },
      { id: "members", label: "Members", icon: Users, route: "/admin/members" },
      {
        id: "constellation",
        label: "Constellation",
        icon: Orbit,
        route: "/admin/constellation",
      },
      { id: "roles", label: "Roles", icon: Shield, route: "/admin/roles" },
    ],
  },
  {
    label: "Configure",
    nodes: [
      {
        id: "recipes",
        label: "Recipes",
        icon: GitBranch,
        route: "/admin/recipes",
      },
      {
        id: "playbooks",
        label: "Playbooks",
        icon: ScrollText,
        route: "/admin/playbooks",
      },
    ],
  },
  {
    label: "Extensions",
    nodes: [
      { id: "otto", label: "OTTO", icon: Sparkles, route: "/admin/otto" },
      {
        id: "mcp_servers",
        label: "MCP Servers",
        icon: Server,
        route: "/admin/mcp-servers",
      },
      { id: "skills", label: "Skills", icon: Wand2, route: "/admin/skills" },
      {
        id: "integrations",
        label: "Integrations",
        icon: Plug,
        route: "/admin/integrations",
      },
    ],
  },
  {
    label: "Scale",
    nodes: [
      {
        id: "workflows",
        label: "Workflows",
        icon: GitBranch,
        route: "/admin/workflows",
      },
      {
        id: "event_bus",
        label: "Event Bus",
        icon: Radio,
        route: "/admin/event-bus",
      },
      {
        id: "feature_flags",
        label: "Feature Flags",
        icon: Flag,
        route: "/admin/features",
      },
    ],
  },
];

const ADMIN_PERSONAL = [
  { label: "Profile", icon: User, route: "/admin/profile" },
  { label: "Appearance", icon: Palette, route: "/admin/settings" },
  { label: "Audit Log", icon: ScrollText, route: "/admin/audit-log" },
];

export default function SubPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const { activeModule, activeChamber, selectedVaultId, setSelectedVault } =
    useModuleStore();
  const { vaults, fetchVaults } = useVaultStore();
  const nodeStates = useCapabilityTreeStore((s) => s.nodeStates);
  const getProgress = useCapabilityTreeStore((s) => s.getProgress);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groupingMode, setGroupingMode] = useState<GroupingMode>("chamber");
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    vaultId: string;
    vaultSlug: string;
  } | null>(null);

  const notifications = useNotificationStore((s) => s.notifications);

  // Derive unread counts per vault from notification hrefs
  const unreadByVault = useMemo(() => {
    const map: Record<string, number> = {};
    for (const n of notifications) {
      if (!n.read && n.href) {
        // href format: /<module>/<slug>
        const slug = n.href.split("/").pop();
        if (slug) {
          const vault = vaults.find((v) => v.slug === slug || v.id === slug);
          if (vault) {
            map[vault.id] = (map[vault.id] || 0) + 1;
          }
        }
      }
    }
    return map;
  }, [notifications, vaults]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, vaultId: string, vaultSlug: string) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, vaultId, vaultSlug });
    },
    [],
  );

  const handleContextAction = useCallback(
    (action: string, vaultId: string) => {
      if (action === "pin") {
        // Future: persist pin state
      } else if (action === "mark_read") {
        // Future: mark all vault notifications read
      } else if (action === "archive") {
        useVaultStore.getState().archiveVault(vaultId);
      } else if (action === "view_triage") {
        router.push(`/${activeModule}/triage`);
      }
    },
    [activeModule, router],
  );

  const isAdmin = activeModule === "admin";
  const currentModule = !isAdmin
    ? (MODULES[activeModule as keyof typeof MODULES] ?? null)
    : null;
  const pinned = !isAdmin ? pinnedByModule[activeModule] || [] : [];
  const progress = getProgress();

  // Fetch vaults for the active module (skip for admin and non-module routes)
  useEffect(() => {
    if (!isAdmin && currentModule) {
      fetchVaults({ module_type: activeModule });
    }
  }, [activeModule, fetchVaults, isAdmin, currentModule]);

  // Subscribe to vault realtime events for live updates
  const subscribeRealtime = useRealtimeStore((s) => s.subscribe);
  const unsubscribeRealtime = useRealtimeStore((s) => s.unsubscribe);
  const onRealtimeEvent = useRealtimeStore((s) => s.onEvent);

  useEffect(() => {
    if (isAdmin || !currentModule) return;

    const topic = "vault:*" as Parameters<typeof subscribeRealtime>[0];

    // Subscribe to vault:* wildcard for all vault events in this module
    subscribeRealtime(topic);

    // Handle vault events — update local store on chamber advance, health change, etc.
    const unsubHandler = onRealtimeEvent("vault:*", (event) => {
      const payload = event.payload as Record<string, unknown>;
      const vaultId = payload.vault_id as string | undefined;
      if (!vaultId) return;

      if (
        event.type === "vault.chamber_advanced" ||
        event.type === "vault.updated"
      ) {
        // Re-fetch the vault list to reflect changes
        fetchVaults({ module_type: activeModule });
      } else if (event.type === "vault.archived") {
        // Remove from local list immediately
        useVaultStore.setState((s) => ({
          vaults: s.vaults.filter((v) => v.id !== vaultId),
        }));
      }
    });

    return () => {
      unsubHandler();
      unsubscribeRealtime(topic);
    };
  }, [
    isAdmin,
    currentModule,
    activeModule,
    subscribeRealtime,
    unsubscribeRealtime,
    onRealtimeEvent,
    fetchVaults,
  ]);

  // Group vaults by selected mode
  const vaultGroups = useMemo(() => {
    if (groupingMode === "chamber") {
      return CHAMBER_KEYS.map((key) => ({
        key,
        label: CHAMBERS[key].label.toUpperCase(),
        chamber: key,
        vaults: vaults.filter((v) => v.chamber === key),
      }));
    }
    if (groupingMode === "entity") {
      const byEntity: Record<string, typeof vaults> = {};
      for (const v of vaults) {
        const entity =
          (v.metadata as Record<string, string>).entity || "Unassigned";
        (byEntity[entity] ??= []).push(v);
      }
      return Object.entries(byEntity).map(([entity, items]) => ({
        key: entity,
        label: entity.toUpperCase(),
        chamber: undefined,
        vaults: items,
      }));
    }
    if (groupingMode === "status") {
      const buckets: Record<string, typeof vaults> = {
        blocked: [],
        "at-risk": [],
        pending: [],
        passing: [],
      };
      for (const v of vaults) {
        const score = v.health_score ?? 0;
        if (score < 30) buckets.blocked.push(v);
        else if (score < 60) buckets["at-risk"].push(v);
        else if (score < 80) buckets.pending.push(v);
        else buckets.passing.push(v);
      }
      return Object.entries(buckets).map(([status, items]) => ({
        key: status,
        label: status.toUpperCase(),
        chamber: undefined,
        vaults: items,
      }));
    }
    // lifecycle — group by vault_level
    const byLevel: Record<number, typeof vaults> = {};
    for (const v of vaults) {
      const lvl = v.vault_level ?? 1;
      (byLevel[lvl] ??= []).push(v);
    }
    const levelLabels: Record<number, string> = {
      1: "WORKSPACE",
      2: "MODULE",
      3: "INSTANCE",
      4: "SUB-ITEM",
    };
    return Object.entries(byLevel).map(([lvl, items]) => ({
      key: `level-${lvl}`,
      label: levelLabels[Number(lvl)] || `LEVEL ${lvl}`,
      chamber: undefined,
      vaults: items,
    }));
  }, [vaults, groupingMode]);

  // Non-module, non-admin routes (home, profile, etc.) — hide sub-panel
  if (!isAdmin && !currentModule) return null;

  const handleVaultClick = (vaultId: string, slug: string) => {
    setSelectedVault(vaultId);
    router.push(`/${activeModule}/${slug}`);
  };

  const handlePinnedClick = (path: string) => {
    setSelectedVault(null);
    router.push(path);
  };

  return (
    <>
      <aside className="flex h-full w-[240px] flex-shrink-0 flex-col overflow-hidden border-r border-surface-border bg-surface-raised">
        {isAdmin ? (
          <>
            {/* Admin header */}
            <div className="flex h-12 flex-shrink-0 items-center border-b border-surface-border px-4">
              <span className="text-[15px] font-semibold text-text-primary">
                Control Panel
              </span>
            </div>

            {/* Personal section */}
            <div className="px-1 pt-2">
              {ADMIN_PERSONAL.map((item) => (
                <button
                  key={item.label}
                  onClick={() => router.push(item.route)}
                  className={`flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                    pathname === item.route
                      ? "bg-surface-overlay text-text-primary"
                      : "text-text-secondary hover:bg-surface-overlay/50 hover:text-text-primary"
                  }`}
                >
                  <item.icon size={16} className="text-text-muted" />
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mx-3 my-2 h-px bg-surface-border" />

            {/* Capability Tree link */}
            <div className="px-1">
              <button
                onClick={() => router.push("/admin/capability-tree")}
                className={`flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  pathname === "/admin/capability-tree"
                    ? "bg-accent-primary/10 text-accent-primary"
                    : "text-text-secondary hover:bg-surface-overlay/50 hover:text-text-primary"
                }`}
              >
                <LayoutGrid size={16} />
                Capability Tree
                <span className="ml-auto text-[10px] text-text-muted">
                  {progress.configured}/{progress.total}
                </span>
              </button>
            </div>

            <div className="mx-3 my-2 h-px bg-surface-border" />

            {/* Tier-grouped nodes */}
            <div className="flex-1 overflow-y-auto px-1">
              {ADMIN_TIERS.map((tier) => (
                <div key={tier.label} className="mb-3">
                  <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    {tier.label}
                  </div>
                  {tier.nodes.map((node) => {
                    const state = nodeStates[node.id] ?? "available";
                    const isActive = pathname === node.route;
                    const isLocked = state === "locked";
                    return (
                      <button
                        key={node.id}
                        onClick={() => !isLocked && router.push(node.route)}
                        disabled={isLocked}
                        className={`flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                          isLocked
                            ? "cursor-not-allowed opacity-40"
                            : isActive
                              ? "bg-surface-overlay text-text-primary"
                              : "text-text-secondary hover:bg-surface-overlay/50 hover:text-text-primary"
                        }`}
                      >
                        {isLocked ? (
                          <Lock size={14} className="text-text-muted" />
                        ) : state === "configured" ? (
                          <Check size={14} className="text-accent-success" />
                        ) : (
                          <node.icon size={14} className="text-text-muted" />
                        )}
                        <span className="flex-1 text-left">{node.label}</span>
                        {!isLocked && (
                          <ChevronRight size={12} className="text-text-muted" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Module header */}
            <div className="flex h-12 flex-shrink-0 items-center justify-between border-b border-surface-border px-4">
              <span className="text-[15px] font-semibold text-text-primary">
                {currentModule!.label}
              </span>
              <button
                className="rounded p-1 text-text-muted transition-colors duration-fast hover:bg-surface-overlay hover:text-text-primary"
                aria-label="Create new vault"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus size={18} />
              </button>
            </div>

            {/* Search */}
            <SearchInput
              className="mx-3 my-2"
              placeholder={`Search ${currentModule!.label.toLowerCase()}...`}
            />

            {/* Pinned channels */}
            <div className="px-1">
              {pinned.map((pin) => (
                <PinnedChannel
                  key={pin.label}
                  icon={pin.icon}
                  label={pin.label}
                  isActive={false}
                  onClick={() => handlePinnedClick(pin.path)}
                />
              ))}
            </div>

            <div className="mx-3 my-2 h-px bg-surface-border" />

            {/* Grouping mode selector */}
            <div className="mx-3 mb-2">
              <select
                value={groupingMode}
                onChange={(e) =>
                  setGroupingMode(e.target.value as GroupingMode)
                }
                className="w-full rounded border border-surface-border bg-surface-overlay px-2 py-1 text-xs text-text-secondary focus:border-accent-primary focus:outline-none"
              >
                {GROUPING_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Grouped vaults */}
            <div className="flex-1 overflow-y-auto px-1">
              {vaultGroups.map((group) => (
                <ChamberLabel
                  key={group.key}
                  label={group.label}
                  chamber={(group.chamber as ChamberName) ?? "discover"}
                  count={group.vaults.length}
                  defaultCollapsed={
                    groupingMode === "chamber"
                      ? group.key !== activeChamber
                      : false
                  }
                >
                  {group.vaults.length === 0 ? (
                    <p className="px-4 py-2 text-xs text-text-muted">
                      No vaults
                    </p>
                  ) : (
                    group.vaults.map((vault) => (
                      <VaultItem
                        key={vault.id}
                        name={vault.name}
                        entity={
                          (vault.metadata as Record<string, string>).entity ||
                          ""
                        }
                        contractType={
                          (vault.metadata as Record<string, string>)
                            .contract_type || ""
                        }
                        gate={vault.chamber || "discover"}
                        healthPercent={vault.health_score || 0}
                        unreadCount={unreadByVault[vault.id] || 0}
                        isActive={selectedVaultId === vault.id}
                        onClick={() => handleVaultClick(vault.id, vault.slug)}
                        onContextMenu={(e) =>
                          handleContextMenu(e, vault.id, vault.slug)
                        }
                      />
                    ))
                  )}
                </ChamberLabel>
              ))}
            </div>
          </>
        )}
      </aside>

      {!isAdmin && (
        <CreateVaultModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={(data) => {
            console.log("Create vault:", data);
            setShowCreateModal(false);
          }}
        />
      )}

      {contextMenu && (
        <VaultContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          vaultId={contextMenu.vaultId}
          vaultSlug={contextMenu.vaultSlug}
          moduleName={activeModule}
          onClose={() => setContextMenu(null)}
          onAction={handleContextAction}
        />
      )}
    </>
  );
}
