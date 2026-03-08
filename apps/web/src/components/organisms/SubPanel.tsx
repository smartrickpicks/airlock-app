"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  Calendar,
  FolderOpen,
  GitBranch,
  LayoutGrid,
  Plus,
  PlusCircle,
  BellRing,
  Inbox,
  Star,
  Clock3,
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
import { createDemoInboundContractIntake } from "@/lib/demo-lifecycle-actions";
import { useModuleStore } from "@/stores/module.store";
import { useVaultStore } from "@/stores/vault.store";
import { getWorkspaceMode } from "@/stores/onboarding.store";
import { useCapabilityTreeStore } from "@/stores/capability-tree.store";
import { MODULES, CHAMBERS, type ChamberName } from "@/lib/constants";

const pinnedByModule: Record<
  string,
  {
    icon: typeof AlertTriangle;
    label: string;
    path: string;
    /** Dynamic badge key — resolved at render time from vault data */
    badgeKey?: "discover_count" | "triage_count";
  }[]
> = {
  home: [
    { icon: Inbox, label: "My Queue", path: "/" },
    { icon: BellRing, label: "Gate Alerts", path: "/" },
    { icon: Star, label: "Favorites", path: "/" },
    { icon: Clock3, label: "Recent Vaults", path: "/" },
  ],
  contracts: [
    {
      icon: PlusCircle,
      label: "Intake Lab",
      path: "/contracts/intake",
      badgeKey: "discover_count",
    },
    {
      icon: AlertTriangle,
      label: "Triage Dashboard",
      path: "/contracts/triage",
      badgeKey: "triage_count",
    },
    { icon: PlusCircle, label: "Generator", path: "/contracts/generator" },
  ],
  crm: [
    { icon: GitBranch, label: "Inbox", path: "/crm/inbox" },
    { icon: GitBranch, label: "Qualify", path: "/crm/qualify" },
    { icon: GitBranch, label: "Pipeline", path: "/crm/pipeline" },
    { icon: GitBranch, label: "Contacts", path: "/crm/contacts" },
    { icon: GitBranch, label: "Activity", path: "/crm/activity" },
    { icon: GitBranch, label: "Health", path: "/crm/health" },
    { icon: GitBranch, label: "Renewals", path: "/crm/renewals" },
    { icon: GitBranch, label: "Onboarding", path: "/crm/onboarding" },
  ],
  tasks: [{ icon: LayoutGrid, label: "Board", path: "/tasks/board" }],
  calendar: [{ icon: Calendar, label: "Month View", path: "/calendar/month" }],
  documents: [
    { icon: FolderOpen, label: "Library", path: "/documents/library" },
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
  { label: "Profile", icon: User, route: "/admin/settings" },
  { label: "Appearance", icon: Palette, route: "/admin/settings" },
  { label: "Audit Log", icon: ScrollText, route: "/admin/audit-log" },
];

export default function SubPanel() {
  const pathname = usePathname();
  const router = useRouter();
  const { activeModule, activeChamber, selectedVaultId, setSelectedVault } =
    useModuleStore();
  const { vaults, fetchVaults } = useVaultStore();
  const nodeStates = useCapabilityTreeStore((s) => s.nodeStates);
  const getProgress = useCapabilityTreeStore((s) => s.getProgress);

  const [showCreateModal, setShowCreateModal] = useState(false);

  const isAdmin = pathname.startsWith("/admin");
  const isHome = pathname === "/" || activeModule === "home";
  const currentModule =
    isAdmin || isHome
      ? {
          label: isAdmin ? "Admin" : "Home",
          path: isAdmin ? "/admin" : "/",
          icon: "Home",
        }
      : MODULES[activeModule];
  // Defer localStorage read to avoid SSR hydration mismatch
  const [isClean, setIsClean] = useState(true);
  useEffect(() => {
    setIsClean(getWorkspaceMode() === "clean");
  }, []);
  const progress = getProgress();

  // Derive dynamic badge counts from vault data
  const discoverCount = vaults.filter((v) => v.chamber === "discover").length;
  const triageCount = vaults.filter(
    (v) => v.chamber === "discover" || v.chamber === "build",
  ).length;
  const badgeCounts: Record<string, number> = {
    discover_count: discoverCount,
    triage_count: triageCount,
  };

  const pinned = (pinnedByModule[activeModule] || []).map((pin) => ({
    ...pin,
    badgeCount: isClean
      ? undefined
      : pin.badgeKey
        ? badgeCounts[pin.badgeKey]
        : undefined,
  }));

  // Fetch vaults for the active module (skip for admin)
  useEffect(() => {
    if (isAdmin) return;
    if (isHome) {
      fetchVaults({ module_type: "contracts" });
      return;
    }
    fetchVaults({ module_type: activeModule });
  }, [activeModule, fetchVaults, isAdmin, isHome]);

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
            <div className="theme-panel-main flex h-12 flex-shrink-0 items-center border-b border-surface-border px-4">
              <span className="text-[15px] font-semibold text-text-primary">
                Admin
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
                onClick={() => router.push("/admin")}
                className={`flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  pathname === "/admin"
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
                    const state = nodeStates[node.id] ?? "locked";
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
            <div className="theme-panel-main flex h-12 flex-shrink-0 items-center justify-between border-b border-surface-border px-4">
              <span className="text-[15px] font-semibold text-text-primary">
                {currentModule.label}
              </span>
              <button
                className="rounded p-1 text-text-muted transition-colors duration-fast hover:bg-surface-overlay hover:text-text-primary"
                aria-label="Create new vault"
                onClick={() => setShowCreateModal(true)}
                disabled={isHome}
              >
                <Plus size={18} />
              </button>
            </div>

            {/* Pinned channels */}
            <div className="px-1">
              {pinned.map((pin) => (
                <PinnedChannel
                  key={pin.label}
                  icon={pin.icon}
                  label={pin.label}
                  isActive={pathname === pin.path && pin.path !== "/"}
                  badgeCount={pin.badgeCount}
                  onClick={() => handlePinnedClick(pin.path)}
                />
              ))}
            </div>

            {/* Chamber groups with vaults */}
            <div className="flex-1 overflow-y-auto px-1">
              {isHome ? (
                <div className="space-y-4 px-2 py-2">
                  <div className="theme-card rounded-xl p-3">
                    <div className="theme-section-label theme-label-main">
                      Operator Hub
                    </div>
                    <div className="mt-2 text-sm text-text-primary">
                      Home is now your queue-first workspace. Open a signal,
                      then jump into the right workspace without losing context.
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                      Recent Contract Vaults
                    </div>
                    <div className="space-y-2">
                      {vaults.slice(0, 6).map((vault) => (
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
                          onClick={() => {
                            setSelectedVault(vault.id);
                            router.push(`/contracts/${vault.slug}`);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                CHAMBER_KEYS.map((key) => (
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
                ))
              )}
            </div>
          </>
        )}
      </aside>

      {!isAdmin && (
        <CreateVaultModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={(data) => {
            if (activeModule === "contracts") {
              const contract = createDemoInboundContractIntake({
                accountName: data.entity,
                ownerName: "Demo Operator",
                contractTitle: data.name,
                contractType: data.contractType,
                fileName: `${data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`,
                source: "Local Upload",
              });
              setSelectedVault(contract.vaultId);
              router.push(`/contracts/${contract.vaultSlug}`);
            } else {
              console.log("Create vault:", data);
            }
            setShowCreateModal(false);
          }}
        />
      )}
    </>
  );
}
