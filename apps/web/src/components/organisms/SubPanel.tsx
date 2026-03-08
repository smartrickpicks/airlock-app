"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import SearchInput from "@/components/atoms/SearchInput";
import CreateVaultModal from "@/components/molecules/CreateVaultModal";
import ChamberLabel from "@/components/atoms/ChamberLabel";
import PinnedChannel from "@/components/molecules/PinnedChannel";
import VaultItem from "@/components/molecules/VaultItem";
import { useModuleStore } from "@/stores/module.store";
import { useVaultStore } from "@/stores/vault.store";
import { useCapabilityTreeStore } from "@/stores/capability-tree.store";
import { MODULES, CHAMBERS, type ChamberName } from "@/lib/constants";

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

  // Non-module, non-admin routes (home, profile, etc.) — hide sub-panel
  if (!isAdmin && !currentModule) return null;

  // Group vaults by chamber
  const vaultsByChamber = CHAMBER_KEYS.reduce(
    (acc, key) => {
      acc[key] = vaults.filter((v) => v.chamber === key);
      return acc;
    },
    {} as Record<ChamberName, typeof vaults>,
  );

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

            {/* Chamber groups with vaults */}
            <div className="flex-1 overflow-y-auto px-1">
              {CHAMBER_KEYS.map((key) => (
                <ChamberLabel
                  key={key}
                  label={CHAMBERS[key].label.toUpperCase()}
                  chamber={key}
                  count={vaultsByChamber[key].length}
                  defaultCollapsed={key !== activeChamber}
                >
                  {vaultsByChamber[key].length === 0 ? (
                    <p className="px-4 py-2 text-xs text-text-muted">
                      No vaults
                    </p>
                  ) : (
                    vaultsByChamber[key].map((vault) => (
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
                        isActive={selectedVaultId === vault.id}
                        onClick={() => handleVaultClick(vault.id, vault.slug)}
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
    </>
  );
}
