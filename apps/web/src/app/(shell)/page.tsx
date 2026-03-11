"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BellRing,
  Bot,
  FileUp,
  FolderOpen,
  MessageSquare,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import { useVaultStore } from "@/stores/vault.store";
import { useEventStore } from "@/stores/event.store";
import { useNotificationStore } from "@/stores/notification.store";
import { useShellStore } from "@/stores/shell.store";
import {
  useOnboardingStore,
  getWorkspaceMode,
} from "@/stores/onboarding.store";
import OnboardingChecklist from "@/components/molecules/OnboardingChecklist";
import InboundContractIntakeModal from "@/components/organisms/InboundContractIntakeModal";
import dynamic from "next/dynamic";
const DispatchCharts = dynamic(
  () => import("@/components/organisms/DispatchCharts"),
  { ssr: false },
);
import {
  MOCK_OPERATOR_FEED,
  MOCK_OPERATOR_QUEUE,
  MOCK_OPERATOR_SIGNALS,
} from "@/lib/mock-operator-hub";
import type { VaultEvent } from "@/stores/event.store";

const CHAMBERS = ["discover", "build", "review", "ship"] as const;

const CHAMBER_LABELS: Record<string, string> = {
  discover: "Discover",
  build: "Build",
  review: "Review",
  ship: "Ship",
};

function formatTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function eventSummary(event: VaultEvent): string {
  const p = event.payload;
  switch (event.event_type) {
    case "vault_created":
      return `Created "${(p.name as string) || "vault"}"`;
    case "chamber_advanced":
      return `${(p.vault_name as string) || "Vault"} → ${(p.chamber as string) || ""}`;
    case "vault_archived":
      return `Archived "${(p.name as string) || ""}"`;
    case "gate_cleared":
      return `Gate cleared: ${(p.vault_name as string) || ""}`;
    case "extraction_complete":
      return `Extraction: ${(p.fields_extracted as number) || 0} fields`;
    default:
      return event.event_type.replace(/_/g, " ");
  }
}

/* ─── First Upload Empty State ───────────────────────────────── */

function FirstUploadView() {
  const router = useRouter();
  const workspaceName = useOnboardingStore((s) => s.setupState.workspaceName);
  const markFirstUploadDone = useOnboardingStore((s) => s.markFirstUploadDone);
  const isOnboardingComplete = useOnboardingStore(
    (s) => s.isOnboardingComplete,
  );
  const checklistDismissed = useOnboardingStore((s) => s.checklistDismissed);
  const [intakeOpen, setIntakeOpen] = useState(false);

  return (
    <main className="h-full overflow-y-auto p-6">
      <div className="mx-auto flex h-full max-w-5xl flex-col gap-6 xl:flex-row">
        {/* Main content */}
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center">
          <div className="w-full max-w-2xl space-y-8">
            {/* Welcome header */}
            <div className="text-center">
              <h1 className="text-3xl font-bold text-text-primary">
                {workspaceName
                  ? `Welcome to ${workspaceName}`
                  : "Your Workspace Is Ready"}
              </h1>
              <p className="mt-3 text-base text-text-secondary">
                Start by uploading your first contract. Airlock will parse it,
                run preflight checks, extract key fields, and create a vault
                that tracks the entire lifecycle.
              </p>
            </div>

            {/* Primary action — Upload Contract PDF */}
            <button
              onClick={() => router.push("/contracts/intake")}
              className="group flex w-full flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-accent-primary/30 bg-accent-primary/5 p-10 transition-colors hover:border-accent-primary/60 hover:bg-accent-primary/10"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-primary/15 transition-colors group-hover:bg-accent-primary/25">
                <FileUp size={32} className="text-accent-primary" />
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-text-primary">
                  Upload a Contract PDF
                </div>
                <p className="mt-1 text-sm text-text-secondary">
                  Drop a real PDF to parse, extract, and create your first vault
                </p>
              </div>
            </button>

            {/* Secondary actions */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <button
                onClick={() => setIntakeOpen(true)}
                className="flex items-start gap-3 rounded-xl border border-surface-border bg-surface-raised p-4 text-left transition-colors hover:bg-surface-overlay"
              >
                <Plus
                  size={18}
                  className="mt-0.5 shrink-0 text-accent-primary"
                />
                <div>
                  <div className="text-sm font-semibold text-text-primary">
                    Quick Demo Intake
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">
                    Create a sample contract with mock data to explore the
                    lifecycle
                  </p>
                </div>
              </button>

              <button
                onClick={() => router.push("/documents/library")}
                className="flex items-start gap-3 rounded-xl border border-surface-border bg-surface-raised p-4 text-left transition-colors hover:bg-surface-overlay"
              >
                <FolderOpen
                  size={18}
                  className="mt-0.5 shrink-0 text-accent-primary"
                />
                <div>
                  <div className="text-sm font-semibold text-text-primary">
                    Document Library
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">
                    Upload documents, briefs, and files to your workspace
                  </p>
                </div>
              </button>

              <button
                onClick={() => markFirstUploadDone()}
                className="flex items-start gap-3 rounded-xl border border-surface-border bg-surface-raised p-4 text-left transition-colors hover:bg-surface-overlay"
              >
                <ArrowRight
                  size={18}
                  className="mt-0.5 shrink-0 text-text-muted"
                />
                <div>
                  <div className="text-sm font-semibold text-text-primary">
                    Skip to Dashboard
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">
                    Browse the operator hub with sample data
                  </p>
                </div>
              </button>
            </div>

            {/* What happens next */}
            <div className="rounded-xl border border-surface-border bg-surface-raised p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                What happens when you upload
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
                {[
                  { step: "1", label: "Parse", detail: "PDF text extraction" },
                  {
                    step: "2",
                    label: "Preflight",
                    detail: "Gate color + health score",
                  },
                  {
                    step: "3",
                    label: "Extract",
                    detail: "Key field extraction",
                  },
                  {
                    step: "4",
                    label: "Vault",
                    detail: "Lifecycle tracking begins",
                  },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-primary/15 text-[10px] font-bold text-accent-primary">
                      {item.step}
                    </span>
                    <div>
                      <div className="text-sm font-medium text-text-primary">
                        {item.label}
                      </div>
                      <div className="text-xs text-text-muted">
                        {item.detail}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar — checklist */}
        {!isOnboardingComplete() && !checklistDismissed && (
          <div className="w-full shrink-0 xl:w-[280px]">
            <OnboardingChecklist />
          </div>
        )}
      </div>

      {/* Demo intake modal */}
      <InboundContractIntakeModal
        isOpen={intakeOpen}
        onClose={() => setIntakeOpen(false)}
        onCreated={() => markFirstUploadDone()}
      />
    </main>
  );
}

/* ─── Operator Hub (full dashboard) ──────────────────────────── */

export default function Home() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { vaults, fetchVaults } = useVaultStore();
  const { events, fetchRecentEvents } = useEventStore();
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const notifications = useNotificationStore((s) => s.notifications);
  const openTool = useShellStore((s) => s.openTool);
  const welcomeSeen = useOnboardingStore((s) => s.welcomeSeen);
  const isOnboardingComplete = useOnboardingStore(
    (s) => s.isOnboardingComplete,
  );
  const checklistDismissed = useOnboardingStore((s) => s.checklistDismissed);
  const firstUploadDone = useOnboardingStore((s) => s.firstUploadDone);
  const [selectedQueueId, setSelectedQueueId] = useState(
    MOCK_OPERATOR_QUEUE[0]?.id,
  );
  const [bannerDismissed, setBannerDismissed] = useState(false);
  // Defer localStorage read to avoid SSR hydration mismatch
  const [isClean, setIsClean] = useState(true);
  useEffect(() => {
    setIsClean(getWorkspaceMode() === "clean");
  }, []);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const showBanner =
    !bannerDismissed && (!welcomeSeen || !isOnboardingComplete());
  const recommendedQueue = useMemo(
    () =>
      MOCK_OPERATOR_QUEUE.filter((item) => item.urgency !== "normal").slice(
        0,
        3,
      ),
    [],
  );

  useEffect(() => {
    fetchVaults({ module_type: "contracts" });
    fetchRecentEvents();
    fetchNotifications();
    // Mark "view_home" checklist item as complete on first visit
    useOnboardingStore.getState().completeChecklistItem("view_home");
  }, [fetchVaults, fetchRecentEvents, fetchNotifications]);

  // Show first-upload view when no vaults exist AND user hasn't skipped.
  // If real vaults are already seeded/created, go straight to Operator Hub.
  if (!firstUploadDone && vaults.length === 0) {
    return <FirstUploadView />;
  }

  const chamberCounts = CHAMBERS.reduce(
    (acc, chamber) => {
      acc[chamber] = vaults.filter((v) => v.chamber === chamber).length;
      return acc;
    },
    {} as Record<string, number>,
  );

  const totalVaults = vaults.length;
  const selectedQueue =
    MOCK_OPERATOR_QUEUE.find((item) => item.id === selectedQueueId) ??
    MOCK_OPERATOR_QUEUE[0];
  const unreadNotifications = notifications.filter((item) => !item.read).length;

  return (
    <div className="theme-shell-canvas h-full overflow-y-auto p-6">
      <div className="grid h-full gap-6 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <section className="theme-panel-frame theme-panel-signal space-y-4 rounded-[28px] p-4">
          {!isClean && (
            <>
              <div className="theme-card rounded-2xl p-4">
                <div className="theme-section-label theme-label-signal">
                  Signals
                </div>
                <div className="mt-3 space-y-2">
                  {MOCK_OPERATOR_SIGNALS.map((signal) => (
                    <div
                      key={signal.id}
                      className={`rounded-xl border px-3 py-2 ${
                        signal.tone === "critical"
                          ? "border-accent-danger/25 bg-accent-danger/10"
                          : signal.tone === "warning"
                            ? "border-accent-warning/25 bg-accent-warning/10"
                            : "theme-card-soft"
                      }`}
                    >
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                        {signal.label}
                      </div>
                      <div className="mt-1 text-sm font-medium text-text-primary">
                        {signal.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="theme-card rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div className="theme-section-label theme-label-signal">
                    Recommended Queue
                  </div>
                  <span className="text-[11px] text-text-muted">
                    {recommendedQueue.length} high signal
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {recommendedQueue.map((item) => (
                    <button
                      key={item.id}
                      className="theme-card-soft theme-card-hover block w-full rounded-xl p-3 text-left"
                      onClick={() => {
                        setSelectedQueueId(item.id);
                        router.push(item.href);
                      }}
                    >
                      <div className="text-sm font-medium text-text-primary">
                        {item.title}
                      </div>
                      <div className="mt-1 text-xs text-text-muted">
                        {item.nextActionLabel}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          {isClean && (
            <div className="rounded-xl border border-surface-border bg-surface-overlay p-4 text-center">
              <p className="text-sm text-text-muted">
                No signals yet. Upload a contract to get started.
              </p>
            </div>
          )}
        </section>

        <section className="theme-panel-frame theme-panel-main space-y-6 rounded-[28px] p-5">
          {showBanner && (
            <div className="relative rounded-2xl border border-accent-primary/30 bg-accent-primary/5 p-5 shadow-[0_0_0_1px_rgba(0,209,255,0.08),0_0_28px_rgba(0,209,255,0.08)]">
              <button
                onClick={() => setBannerDismissed(true)}
                className="absolute right-3 top-3 rounded p-1 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
              >
                <span className="sr-only">Dismiss</span>
                <X size={14} />
              </button>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-accent-primary">
                Getting Started
              </div>
              <h2 className="mt-2 text-lg font-bold text-text-primary">
                Start Your First Workspace
              </h2>
              <p className="mt-1 max-w-xl text-sm text-text-secondary">
                Set up your workspace, upload your first contract, and see how
                Airlock orchestrates the lifecycle.
              </p>
              <button
                onClick={() => router.push("/onboarding")}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent-primary px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-accent-primary-hover"
              >
                <Sparkles size={14} />
                Launch Setup Wizard
                <ArrowRight size={14} />
              </button>
            </div>
          )}

          <div className="theme-card rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="theme-section-label theme-label-main">
                  Operator Hub
                </div>
                <h1 className="mt-2 text-2xl font-bold text-text-primary">
                  {user ? `Good morning, ${user.name}` : "Operator Hub"}
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-text-secondary">
                  Your next moves arrive here by gate, message, workflow, and
                  deadline. Stay in one operating surface, then jump into the
                  right workspace only when you need depth.
                </p>
              </div>
              <button
                className="inline-flex items-center gap-2 rounded-full bg-accent-primary px-3 py-1.5 text-xs font-semibold text-background transition-colors hover:bg-accent-primary-hover"
                onClick={() => openTool("compose")}
              >
                <MessageSquare size={14} />
                Quick Compose
              </button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              {CHAMBERS.map((chamber) => (
                <button
                  key={chamber}
                  onClick={() => router.push("/contracts/triage")}
                  className={`theme-card-soft theme-card-hover rounded-xl border-t-2 p-3 text-left ${
                    chamber === "discover"
                      ? "border-t-chamber-discover"
                      : chamber === "build"
                        ? "border-t-chamber-build"
                        : chamber === "review"
                          ? "border-t-chamber-review"
                          : "border-t-chamber-ship"
                  }`}
                >
                  <div
                    className={`text-[10px] font-semibold uppercase tracking-wider ${
                      chamber === "discover"
                        ? "text-chamber-discover"
                        : chamber === "build"
                          ? "text-chamber-build"
                          : chamber === "review"
                            ? "text-chamber-review"
                            : "text-chamber-ship"
                    }`}
                  >
                    {CHAMBER_LABELS[chamber]}
                  </div>
                  <div className="mt-2 text-3xl font-bold text-text-primary">
                    {chamberCounts[chamber]}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {!isClean && (
            <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
              <div className="theme-card rounded-2xl">
                <div className="border-b border-surface-border px-4 py-3 theme-section-label theme-label-main">
                  My Queue
                </div>
                <div className="divide-y divide-surface-border">
                  {MOCK_OPERATOR_QUEUE.map((item) => (
                    <button
                      key={item.id}
                      className={`block w-full px-4 py-3 text-left transition-colors ${
                        selectedQueue.id === item.id
                          ? "theme-active-signal"
                          : "hover:bg-surface-overlay"
                      }`}
                      onClick={() => setSelectedQueueId(item.id)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-text-primary">
                          {item.title}
                        </div>
                        <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                          {item.workspace}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-text-muted">
                        {item.accountLabel ?? "No account"} ·{" "}
                        {item.nextActionLabel}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="theme-card rounded-2xl p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="theme-section-label theme-label-main">
                      Selected Work
                    </div>
                    <div className="mt-2 text-xl font-semibold text-text-primary">
                      {selectedQueue.title}
                    </div>
                    <div className="mt-1 text-sm text-text-secondary">
                      {selectedQueue.accountLabel ?? "No linked account"} ·{" "}
                      {selectedQueue.nextActionLabel}
                    </div>
                  </div>
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-overlay/60 px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-overlay hover:text-text-primary"
                    onClick={() => router.push(selectedQueue.href)}
                  >
                    Open Workspace
                    <ArrowRight size={14} />
                  </button>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <HubAction
                    icon={BellRing}
                    label="Activity"
                    value={`${unreadNotifications} unread`}
                    onClick={() => openTool("activity")}
                  />
                  <HubAction
                    icon={Bot}
                    label="Otto"
                    value="Ask for next-best action"
                    onClick={() => openTool("otto")}
                  />
                  <HubAction
                    icon={Sparkles}
                    label="Quick Actions"
                    value="Jump into scoped tools"
                    onClick={() => openTool("quick_actions")}
                  />
                </div>

                <div className="theme-card-soft mt-5 rounded-2xl p-4">
                  <div className="theme-section-label theme-label-main">
                    Operational Feed
                  </div>
                  <div className="mt-3 space-y-3">
                    {MOCK_OPERATOR_FEED.map((item) => (
                      <div key={item.id} className="theme-card rounded-xl p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-medium text-text-primary">
                            {item.title}
                          </div>
                          <div className="text-[10px] text-text-muted">
                            {item.timeLabel}
                          </div>
                        </div>
                        <div className="mt-1 text-xs text-text-secondary">
                          {item.body}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          {isClean && (
            <div className="rounded-xl border border-surface-border bg-surface-overlay p-4 text-center">
              <p className="text-sm text-text-muted">
                No signals yet. Upload a contract to get started.
              </p>
            </div>
          )}
        </section>

        <section className="theme-panel-frame theme-panel-control space-y-4 rounded-[28px] p-4">
          {!isOnboardingComplete() && !checklistDismissed && (
            <OnboardingChecklist />
          )}

          <div className="theme-card rounded-2xl p-4">
            <div className="theme-section-label theme-label-control">
              Command Center
            </div>
            <div className="mt-3 space-y-3">
              <MetricCard label="Active Vaults" value={`${totalVaults}`} />
              <MetricCard
                label="Unread Alerts"
                value={`${unreadNotifications}`}
              />
              <MetricCard label="Recent Events" value={`${events.length}`} />
            </div>
          </div>

          <div className="theme-card rounded-2xl p-4">
            <div className="theme-section-label theme-label-control">
              Recent Events
            </div>
            <div className="mt-3 space-y-3">
              {events.slice(0, 5).map((event) => (
                <button
                  key={event.id}
                  className="theme-card-soft theme-card-hover block w-full rounded-xl p-3 text-left"
                  onClick={() => router.push("/contracts/triage")}
                >
                  <div className="text-sm font-medium text-text-primary">
                    {eventSummary(event)}
                  </div>
                  <div className="mt-1 text-xs text-text-muted">
                    {mounted ? formatTimeAgo(event.created_at) : ""}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <DispatchCharts />
        </section>
      </div>
    </div>
  );
}

function HubAction({
  icon: Icon,
  label,
  value,
  onClick,
}: {
  icon: typeof BellRing;
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      className="theme-card-soft theme-card-hover rounded-xl p-3 text-left"
      onClick={onClick}
    >
      <div className="flex items-center gap-2 text-text-primary">
        <Icon size={14} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="mt-1 text-xs text-text-muted">{value}</div>
    </button>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="theme-card-soft rounded-xl p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-text-primary">
        {value}
      </div>
    </div>
  );
}
