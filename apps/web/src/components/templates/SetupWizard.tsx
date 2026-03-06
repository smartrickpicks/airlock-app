"use client";

import { useState } from "react";
import {
  Building2,
  Blocks,
  UserPlus,
  Database,
  Rocket,
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  X,
  HardDrive,
  Upload,
  Globe,
  Link2,
  Loader2,
  CheckCircle2,
  Calendar,
  FileText,
  Mail,
  LayoutGrid,
  ArrowLeftRight,
  MessageSquare,
  Hash,
  Reply,
  FolderOpen,
} from "lucide-react";
import { useOnboardingStore } from "@/stores/onboarding.store";
import {
  MODULE_OPTIONS,
  INDUSTRY_OPTIONS,
  DATA_SOURCE_OPTIONS,
  CONNECTOR_OPTIONS,
  WIZARD_STEPS,
  type WizardStep,
  type IndustryOption,
  type InviteeEntry,
  type DataSourceType,
  type ConnectorType,
  type ConnectorSelection,
} from "@/lib/mock-onboarding";
import type { LucideIcon } from "lucide-react";

const STEP_ICONS: Record<WizardStep, LucideIcon> = {
  create_workspace: Building2,
  module_config: Blocks,
  connect_tools: Link2,
  invite_team: UserPlus,
  connect_data: Database,
  ready: Rocket,
};

const DATA_SOURCE_ICONS: Record<DataSourceType, LucideIcon> = {
  google_drive: HardDrive,
  upload: Upload,
  api: Globe,
};

const CONNECTOR_FEATURE_ICONS: Record<string, LucideIcon> = {
  "Calendar events alongside tasks": Calendar,
  "Drive files attached to vaults": FileText,
  "Email threads in context": Mail,
  "Issues appear as Airlock tasks": LayoutGrid,
  "Move cards here, status updates there": ArrowLeftRight,
  "Custom field mapping": Database,
  "Channel threads in vault detail": MessageSquare,
  "Reply from Airlock": Reply,
  "Mount channels to modules": FolderOpen,
};

interface SetupWizardProps {
  onComplete: () => void;
}

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const {
    wizardStep,
    setupState,
    setWizardStep,
    setWorkspaceName,
    setIndustry,
    toggleModule,
    toggleConnector,
    addInvitee,
    removeInvitee,
    setDataSource,
    setLoadDemoData,
  } = useOnboardingStore();

  const currentIdx = WIZARD_STEPS.findIndex((s) => s.id === wizardStep);
  const isFirst = currentIdx === 0;
  const isLast = currentIdx === WIZARD_STEPS.length - 1;

  function goNext() {
    if (isLast) {
      onComplete();
      return;
    }
    setWizardStep(WIZARD_STEPS[currentIdx + 1].id);
  }

  function goBack() {
    if (!isFirst) {
      setWizardStep(WIZARD_STEPS[currentIdx - 1].id);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-base p-4">
      <div className="w-full max-w-lg rounded-xl border border-surface-border bg-surface-overlay shadow-2xl">
        {/* Step indicator */}
        <div className="flex items-center justify-between border-b border-surface-border px-6 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
            Workspace Setup
          </h2>
          <span className="text-sm font-medium text-text-secondary">
            {currentIdx + 1} / {WIZARD_STEPS.length}
          </span>
        </div>

        {/* Step progress dots */}
        <div className="flex justify-center gap-2 px-6 pt-4">
          {WIZARD_STEPS.map((step, i) => {
            const Icon = STEP_ICONS[step.id];
            const isActive = i === currentIdx;
            const isDone = i < currentIdx;
            return (
              <div
                key={step.id}
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                  isActive
                    ? "bg-accent-primary text-white"
                    : isDone
                      ? "bg-accent-success/20 text-accent-success"
                      : "bg-surface-sunken text-text-muted"
                }`}
              >
                {isDone ? <Check size={14} /> : <Icon size={14} />}
              </div>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-6">
          {wizardStep === "create_workspace" && (
            <StepCreateWorkspace
              name={setupState.workspaceName}
              industry={setupState.industry}
              onNameChange={setWorkspaceName}
              onIndustryChange={setIndustry}
            />
          )}
          {wizardStep === "module_config" && (
            <StepModuleConfig
              enabled={setupState.enabledModules}
              onToggle={toggleModule}
            />
          )}
          {wizardStep === "connect_tools" && (
            <StepConnectTools
              connectors={setupState.connectors}
              onToggle={toggleConnector}
            />
          )}
          {wizardStep === "invite_team" && (
            <StepInviteTeam
              invitees={setupState.invitees}
              onAdd={addInvitee}
              onRemove={removeInvitee}
            />
          )}
          {wizardStep === "connect_data" && (
            <StepConnectData
              selected={setupState.dataSource}
              loadDemo={setupState.loadDemoData}
              onSelect={setDataSource}
              onToggleDemo={setLoadDemoData}
            />
          )}
          {wizardStep === "ready" && <StepReady state={setupState} />}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between border-t border-surface-border px-6 py-4">
          <button
            onClick={goBack}
            disabled={isFirst}
            className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-text-muted transition-colors hover:bg-surface-hover disabled:invisible"
          >
            <ChevronLeft size={14} />
            Back
          </button>

          <div className="flex items-center gap-2">
            {wizardStep === "connect_tools" ||
            wizardStep === "invite_team" ||
            wizardStep === "connect_data" ? (
              <button
                onClick={goNext}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-text-muted transition-colors hover:bg-surface-hover"
              >
                Skip
              </button>
            ) : null}
            <button
              onClick={goNext}
              disabled={
                wizardStep === "create_workspace" &&
                !setupState.workspaceName.trim()
              }
              className="flex items-center gap-1 rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-primary/80 disabled:opacity-40"
            >
              {isLast ? "Go to Workspace" : "Continue"}
              {!isLast && <ChevronRight size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Step 1: Create Workspace ────────────────────────────────── */

function StepCreateWorkspace({
  name,
  industry,
  onNameChange,
  onIndustryChange,
}: {
  name: string;
  industry: string;
  onNameChange: (v: string) => void;
  onIndustryChange: (v: IndustryOption) => void;
}) {
  return (
    <div>
      <h3 className="mb-1 text-lg font-bold text-text-primary">
        Welcome to Airlock
      </h3>
      <p className="mb-6 text-sm text-text-secondary">
        Create your workspace to get started.
      </p>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">
            Workspace name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g. Acme Records"
            className="w-full rounded-md border border-surface-border bg-surface-sunken px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-text-secondary">
            Industry
          </label>
          <select
            value={industry}
            onChange={(e) => onIndustryChange(e.target.value as IndustryOption)}
            className="w-full rounded-md border border-surface-border bg-surface-sunken px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
          >
            <option value="">Select industry...</option>
            {INDUSTRY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

/* ─── Step 2: Module Config ───────────────────────────────────── */

function StepModuleConfig({
  enabled,
  onToggle,
}: {
  enabled: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <h3 className="mb-1 text-lg font-bold text-text-primary">
        Which modules do you need?
      </h3>
      <p className="mb-6 text-sm text-text-secondary">
        You can always enable more later.
      </p>

      <div className="space-y-2">
        {MODULE_OPTIONS.map((mod) => {
          const isEnabled = enabled.includes(mod.id);
          return (
            <button
              key={mod.id}
              onClick={() => onToggle(mod.id)}
              className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                isEnabled
                  ? "border-accent-primary/40 bg-accent-primary/5"
                  : "border-surface-border bg-surface-sunken hover:border-surface-border/80"
              }`}
            >
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                  isEnabled
                    ? "border-accent-primary bg-accent-primary"
                    : "border-text-muted"
                }`}
              >
                {isEnabled && <Check size={12} className="text-white" />}
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {mod.name}
                </p>
                <p className="text-xs text-text-muted">{mod.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Step 3: Invite Team ─────────────────────────────────────── */

function StepInviteTeam({
  invitees,
  onAdd,
  onRemove,
}: {
  invitees: InviteeEntry[];
  onAdd: (e: InviteeEntry) => void;
  onRemove: (i: number) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteeEntry["role"]>("builder");

  function handleAdd() {
    if (!email.trim()) return;
    onAdd({ email: email.trim(), role });
    setEmail("");
  }

  return (
    <div>
      <h3 className="mb-1 text-lg font-bold text-text-primary">
        Invite your team
      </h3>
      <p className="mb-6 text-sm text-text-secondary">
        Add team members by email. You can change roles later.
      </p>

      {/* Add row */}
      <div className="mb-4 flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="email@example.com"
          className="flex-1 rounded-md border border-surface-border bg-surface-sunken px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as InviteeEntry["role"])}
          className="rounded-md border border-surface-border bg-surface-sunken px-2 py-2 text-xs text-text-primary focus:border-accent-primary focus:outline-none"
        >
          <option value="builder">Builder</option>
          <option value="gatekeeper">Gatekeeper</option>
          <option value="owner">Owner</option>
        </select>
        <button
          onClick={handleAdd}
          disabled={!email.trim()}
          className="rounded-md bg-accent-primary p-2 text-white transition-colors hover:bg-accent-primary/80 disabled:opacity-40"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Invitee list */}
      {invitees.length > 0 && (
        <div className="space-y-2">
          {invitees.map((inv, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-md border border-surface-border bg-surface-sunken px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-primary">{inv.email}</span>
                <span className="rounded-full bg-surface-hover px-2 py-0.5 text-[10px] capitalize text-text-muted">
                  {inv.role}
                </span>
              </div>
              <button
                onClick={() => onRemove(i)}
                className="rounded p-1 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Role guide */}
      <div className="mt-6 rounded-md border border-surface-border bg-surface-sunken p-3">
        <p className="mb-2 text-xs font-semibold text-text-secondary">
          Role guide
        </p>
        <div className="space-y-1 text-xs text-text-muted">
          <p>
            <span className="font-medium text-text-secondary">Builder</span> —
            Creates and edits data
          </p>
          <p>
            <span className="font-medium text-text-secondary">Gatekeeper</span>{" "}
            — Reviews and approves
          </p>
          <p>
            <span className="font-medium text-text-secondary">Owner</span> —
            Manages team and settings
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Step 3: Connect Tools ───────────────────────────────────── */

function StepConnectTools({
  connectors,
  onToggle,
}: {
  connectors: ConnectorSelection[];
  onToggle: (type: ConnectorType) => void;
}) {
  return (
    <div>
      <h3 className="mb-1 text-lg font-bold text-text-primary">
        Connect your tools
      </h3>
      <p className="mb-6 text-sm text-text-secondary">
        Bring your existing tools into Airlock. Data syncs automatically.
      </p>

      <div className="space-y-3">
        {CONNECTOR_OPTIONS.map((option) => {
          const selection = connectors.find((c) => c.type === option.type);
          const isEnabled = selection?.enabled ?? false;
          const status = selection?.status ?? "idle";

          return (
            <div
              key={option.type}
              className={`rounded-xl border transition-all ${
                isEnabled
                  ? status === "connected"
                    ? "border-accent-success/40 bg-accent-success/5"
                    : "border-accent-primary/40 bg-accent-primary/5"
                  : "border-surface-border bg-surface-sunken hover:border-surface-border/80"
              }`}
            >
              {/* Header */}
              <button
                onClick={() => onToggle(option.type)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    isEnabled
                      ? status === "connected"
                        ? "bg-accent-success/10"
                        : "bg-accent-primary/10"
                      : "bg-surface-hover"
                  }`}
                >
                  {status === "connecting" ? (
                    <Loader2
                      size={18}
                      className="animate-spin text-accent-primary"
                    />
                  ) : status === "connected" ? (
                    <CheckCircle2 size={18} className="text-accent-success" />
                  ) : (
                    <Link2
                      size={18}
                      className={
                        isEnabled ? "text-accent-primary" : "text-text-muted"
                      }
                    />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-text-primary">
                      {option.name}
                    </p>
                    {status === "connected" && (
                      <span className="rounded-full bg-accent-success/10 px-2 py-0.5 text-[10px] font-medium text-accent-success">
                        Connected
                      </span>
                    )}
                    {status === "connecting" && (
                      <span className="rounded-full bg-accent-primary/10 px-2 py-0.5 text-[10px] font-medium text-accent-primary">
                        Connecting...
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted">
                    {option.description}
                  </p>
                </div>
                <span className="text-xs text-text-muted">
                  {option.setupTime}
                </span>
              </button>

              {/* Features (shown when enabled) */}
              {isEnabled && (
                <div className="border-t border-surface-border/50 px-4 pb-3 pt-2">
                  <div className="space-y-1.5">
                    {option.features.map((feature) => {
                      const FeatureIcon =
                        CONNECTOR_FEATURE_ICONS[feature] || Check;
                      return (
                        <div
                          key={feature}
                          className="flex items-center gap-2 text-xs text-text-secondary"
                        >
                          <FeatureIcon
                            size={12}
                            className={
                              status === "connected"
                                ? "text-accent-success"
                                : "text-text-muted"
                            }
                          />
                          {feature}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs text-text-muted">
        You can add more connectors later in Admin &gt; Connectors
      </p>
    </div>
  );
}

/* ─── Step 5: Connect Data ────────────────────────────────────── */

function StepConnectData({
  selected,
  loadDemo,
  onSelect,
  onToggleDemo,
}: {
  selected: DataSourceType | null;
  loadDemo: boolean;
  onSelect: (s: DataSourceType | null) => void;
  onToggleDemo: (v: boolean) => void;
}) {
  return (
    <div>
      <h3 className="mb-1 text-lg font-bold text-text-primary">
        Connect a data source
      </h3>
      <p className="mb-6 text-sm text-text-secondary">
        Choose how to bring data into Airlock, or skip and add later.
      </p>

      <div className="space-y-2">
        {DATA_SOURCE_OPTIONS.map((opt) => {
          const Icon = DATA_SOURCE_ICONS[opt.type];
          const isSelected = selected === opt.type;
          return (
            <button
              key={opt.type}
              onClick={() => onSelect(isSelected ? null : opt.type)}
              className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                isSelected
                  ? "border-accent-primary/40 bg-accent-primary/5"
                  : "border-surface-border bg-surface-sunken hover:border-surface-border/80"
              }`}
            >
              <Icon
                size={18}
                className={
                  isSelected ? "text-accent-primary" : "text-text-muted"
                }
              />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {opt.label}
                </p>
                <p className="text-xs text-text-muted">{opt.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Demo data option */}
      <div className="mt-6 rounded-lg border border-surface-border bg-surface-sunken p-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => onToggleDemo(!loadDemo)}
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
              loadDemo
                ? "border-accent-primary bg-accent-primary"
                : "border-text-muted"
            }`}
          >
            {loadDemo && <Check size={12} className="text-white" />}
          </button>
          <div>
            <p className="text-sm font-medium text-text-primary">
              Load demo data
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Pre-load sample accounts, contracts, and tasks to explore Airlock
              with realistic data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Step 5: Ready ───────────────────────────────────────────── */

function StepReady({
  state,
}: {
  state: {
    enabledModules: string[];
    connectors: ConnectorSelection[];
    invitees: InviteeEntry[];
    dataSource: DataSourceType | null;
    loadDemoData: boolean;
  };
}) {
  const connectedTools = state.connectors.filter((c) => c.enabled);

  return (
    <div className="text-center">
      <div className="mb-4 flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-success/10">
          <Rocket size={32} className="text-accent-success" />
        </div>
      </div>

      <h3 className="mb-2 text-lg font-bold text-text-primary">
        Your workspace is ready!
      </h3>

      <div className="mb-6 space-y-1.5 text-sm text-text-secondary">
        <p>{state.enabledModules.length} modules enabled</p>
        {connectedTools.length > 0 && (
          <p>
            {connectedTools
              .map(
                (c) => CONNECTOR_OPTIONS.find((o) => o.type === c.type)?.name,
              )
              .join(", ")}{" "}
            connected
          </p>
        )}
        <p>
          {state.invitees.length} team member
          {state.invitees.length !== 1 ? "s" : ""} invited
        </p>
        {state.dataSource && (
          <p>
            {state.dataSource === "google_drive"
              ? "Google Drive"
              : state.dataSource === "upload"
                ? "File upload"
                : "API"}{" "}
            connected
          </p>
        )}
        {state.loadDemoData && (
          <p className="text-accent-primary">Demo data loaded</p>
        )}
      </div>

      <div className="rounded-lg border border-surface-border bg-surface-sunken p-4 text-left">
        <p className="mb-2 text-xs font-semibold text-text-secondary">
          What&apos;s next
        </p>
        <ol className="space-y-1.5 text-xs text-text-muted">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-surface-hover text-[10px] font-bold text-text-secondary">
              1
            </span>
            Upload your first contract batch
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-surface-hover text-[10px] font-bold text-text-secondary">
              2
            </span>
            Watch extraction + preflight run
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-surface-hover text-[10px] font-bold text-text-secondary">
              3
            </span>
            Review results in Triage Board
          </li>
        </ol>
      </div>
    </div>
  );
}
