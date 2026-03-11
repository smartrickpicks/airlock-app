"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Rocket,
  Layers,
  Cable,
  UsersRound,
  DatabaseZap,
  CheckCircle,
  FileStack,
  UserRound,
  BarChart3,
  Calendar,
  FolderTree,
  Microchip,
  KeyRound,
} from "lucide-react";
import { useOnboardingStore } from "@/stores/onboarding.store";
import { useCapabilityTreeStore } from "@/stores/capability-tree.store";
import { apiFetch } from "@/lib/api";
import { wizardStep as wizardStepVariants } from "@/lib/animations";
import type {
  WizardStep,
  ModuleOption,
  ConnectorOption,
  IndustryOption,
} from "@/lib/mock-onboarding";
import {
  MODULE_OPTIONS,
  CONNECTOR_OPTIONS,
  WIZARD_STEPS,
  INDUSTRY_OPTIONS,
} from "@/lib/mock-onboarding";

/* ─── Step icons mapping ───────────────────────────────────────────────────── */
const STEP_ICONS: Record<WizardStep, React.ReactNode> = {
  create_workspace: <Rocket size={20} />,
  module_config: <Layers size={20} />,
  connect_tools: <Cable size={20} />,
  invite_team: <UsersRound size={20} />,
  connect_data: <DatabaseZap size={20} />,
  ready: <CheckCircle size={20} />,
};

const MODULE_ICONS: Record<string, React.ReactNode> = {
  contracts: <FileStack size={18} />,
  crm: <UserRound size={18} />,
  tasks: <BarChart3 size={18} />,
  calendar: <Calendar size={18} />,
  documents: <FolderTree size={18} />,
};

/* ─── Workspace creation response ──────────────────────────────────────────── */
interface WorkspaceResponse {
  id: string;
  name: string;
  slug: string;
}

/* ═══════════════════════════════════════════════════════════════════════════ */

export default function OnboardingSetupPage() {
  const router = useRouter();
  const wizardStep = useOnboardingStore((s) => s.wizardStep);
  const setWizardStep = useOnboardingStore((s) => s.setWizardStep);

  const currentIndex = WIZARD_STEPS.findIndex((s) => s.id === wizardStep);
  const progress = ((currentIndex + 1) / WIZARD_STEPS.length) * 100;

  function goNext() {
    const next = WIZARD_STEPS[currentIndex + 1];
    if (next) setWizardStep(next.id);
  }

  function goBack() {
    const prev = WIZARD_STEPS[currentIndex - 1];
    if (prev) setWizardStep(prev.id);
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-surface-base overflow-hidden">
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-accent-primary/8 animate-airlock-glow-breathe" />
        <div
          className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-accent-secondary/6 animate-airlock-drift"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute top-1/4 right-1/3 h-48 w-48 rounded-full bg-chamber-ship/5 animate-airlock-glow-breathe"
          style={{ animationDelay: "1.5s" }}
        />
      </div>

      {/* Grid */}
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-30" />

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-surface-border/50">
        <motion.div
          className="h-full bg-gradient-to-r from-accent-primary via-accent-secondary to-chamber-review"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>

      {/* Step indicators */}
      <motion.div
        className="relative mb-8 flex items-center gap-2"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {WIZARD_STEPS.map((step, i) => {
          const isActive = i === currentIndex;
          const isComplete = i < currentIndex;
          return (
            <div key={step.id} className="flex items-center gap-2">
              <motion.div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-normal ${
                  isActive
                    ? "bg-accent-primary text-surface-base scale-110 shadow-[0_0_20px_rgba(0,209,255,0.3)]"
                    : isComplete
                      ? "bg-accent-success/20 text-accent-success"
                      : "bg-surface-border/50 text-text-muted"
                }`}
                layout
              >
                {isComplete ? <CheckCircle size={14} /> : step.number}
              </motion.div>
              {i < WIZARD_STEPS.length - 1 && (
                <div
                  className={`h-px w-6 transition-colors duration-slow ${
                    isComplete ? "bg-accent-success/40" : "bg-surface-border/50"
                  }`}
                />
              )}
            </div>
          );
        })}
      </motion.div>

      {/* Card container */}
      <div className="relative w-full max-w-lg px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={wizardStep}
            variants={wizardStepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="rounded-xl border border-surface-border/80 bg-surface-raised/90 backdrop-blur-xl p-8 shadow-2xl shadow-black/40"
          >
            {wizardStep === "create_workspace" && (
              <StepWorkspaceName onNext={goNext} />
            )}
            {wizardStep === "module_config" && (
              <StepModules onNext={goNext} onBack={goBack} />
            )}
            {wizardStep === "connect_tools" && (
              <StepConnectors onNext={goNext} onBack={goBack} />
            )}
            {wizardStep === "invite_team" && (
              <StepInviteTeam onNext={goNext} onBack={goBack} />
            )}
            {wizardStep === "connect_data" && (
              <StepAiProvider onNext={goNext} onBack={goBack} />
            )}
            {wizardStep === "ready" && <StepReady onBack={goBack} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Step label */}
      <motion.p
        className="relative mt-4 text-xs text-text-muted"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        Step {currentIndex + 1} of {WIZARD_STEPS.length} —{" "}
        {WIZARD_STEPS[currentIndex]?.label}
      </motion.p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Step 1: Workspace Name                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function StepWorkspaceName({ onNext }: { onNext: () => void }) {
  const setupState = useOnboardingStore((s) => s.setupState);
  const setWorkspaceName = useOnboardingStore((s) => s.setWorkspaceName);
  const setIndustry = useOnboardingStore((s) => s.setIndustry);
  const initTree = useCapabilityTreeStore((s) => s.initTree);
  const saveNodeConfig = useCapabilityTreeStore((s) => s.saveNodeConfig);
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleNext() {
    if (!setupState.workspaceName.trim()) return;
    setError("");
    setLoading(true);

    const trimmed = setupState.workspaceName.trim();

    try {
      const workspace = await apiFetch<WorkspaceResponse>(
        "/api/v1/workspaces",
        {
          method: "POST",
          body: JSON.stringify({ name: trimmed }),
        },
      );

      // Workspace created — refresh JWT so token has the new workspace_id
      try {
        const refreshToken = localStorage.getItem("airlock_refresh_token");
        if (refreshToken) {
          const refreshed = await apiFetch<{
            access_token: string;
            refresh_token?: string;
            user?: {
              id: string;
              email: string;
              display_name: string;
              avatar_url?: string;
              org_role: string;
            };
          }>("/api/v1/auth/refresh", {
            method: "POST",
            body: JSON.stringify({ refresh_token: refreshToken }),
          });
          // Update stored token with new workspace_id claim
          localStorage.setItem("airlock_access_token", refreshed.access_token);
          document.cookie = `airlock_access_token=${refreshed.access_token}; path=/; max-age=900; SameSite=Lax`;
        }
      } catch {
        // Token refresh failed — non-blocking, workspace was still created
      }

      if (typeof window !== "undefined") {
        localStorage.removeItem("airlock_capability_tree");
      }
      initTree(false);
      saveNodeConfig("workspace", {
        name: workspace.name,
        industry: setupState.industry,
        slug: workspace.slug,
        id: workspace.id,
      });
    } catch (err) {
      setLoading(false);

      if (err instanceof Error && err.message.includes("409")) {
        setError("A workspace with that name already exists.");
        return;
      }

      // Show the actual error instead of silently proceeding
      if (err instanceof Error && err.message.includes("401")) {
        setError(
          "Your session expired. Please go back to the login page and sign in again.",
        );
        return;
      }

      setError(
        "Could not create workspace. Check your connection and try again.",
      );
      return;
    }

    setLoading(false);
    onNext();
  }

  return (
    <>
      <StepHeader
        icon={<Rocket size={24} className="text-accent-primary" />}
        title="Name your workspace"
        subtitle="This is your team's home base in Airlock."
      />

      <div className="mt-6 space-y-4">
        <input
          ref={inputRef}
          type="text"
          value={setupState.workspaceName}
          onChange={(e) => setWorkspaceName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleNext()}
          placeholder="Acme Records"
          className="w-full rounded-lg border border-surface-border bg-surface-sunken px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary transition-all duration-fast"
        />
        {error && <p className="text-xs text-accent-danger">{error}</p>}

        <div>
          <label className="mb-2 block text-xs font-medium text-text-muted uppercase tracking-wider">
            Industry
          </label>
          <div className="grid grid-cols-2 gap-2">
            {INDUSTRY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setIndustry(opt.value)}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-fast ${
                  setupState.industry === opt.value
                    ? "border-accent-primary/50 bg-accent-primary/10 text-accent-primary"
                    : "border-surface-border bg-surface-overlay text-text-secondary hover:border-surface-border hover:bg-surface-overlay/80"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <WizardNav
        onNext={handleNext}
        nextLabel={loading ? "Creating..." : "Continue"}
        nextDisabled={!setupState.workspaceName.trim() || loading}
      />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Step 2: Module Selection                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */

function StepModules({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const setupState = useOnboardingStore((s) => s.setupState);
  const toggleModule = useOnboardingStore((s) => s.toggleModule);

  return (
    <>
      <StepHeader
        icon={<Layers size={24} className="text-accent-secondary" />}
        title="Choose your modules"
        subtitle="Enable the tools your team needs. You can change this later."
      />

      <div className="mt-6 space-y-2">
        {MODULE_OPTIONS.map((mod: ModuleOption) => {
          const isEnabled = setupState.enabledModules.includes(mod.id);
          return (
            <motion.button
              key={mod.id}
              onClick={() => toggleModule(mod.id)}
              className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all duration-fast ${
                isEnabled
                  ? "border-accent-primary/30 bg-accent-primary/5"
                  : "border-surface-border bg-surface-overlay hover:bg-surface-overlay/80"
              }`}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-fast ${
                  isEnabled
                    ? "bg-accent-primary/15 text-accent-primary"
                    : "bg-surface-border/50 text-text-muted"
                }`}
              >
                {MODULE_ICONS[mod.id] || <Layers size={18} />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">
                  {mod.name}
                </p>
                <p className="text-xs text-text-muted">{mod.description}</p>
              </div>
              <div
                className={`h-5 w-5 rounded-full border-2 transition-all duration-fast ${
                  isEnabled
                    ? "border-accent-primary bg-accent-primary"
                    : "border-surface-border"
                }`}
              >
                {isEnabled && (
                  <CheckCircle size={16} className="text-surface-base" />
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      <WizardNav onNext={onNext} onBack={onBack} />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Step 3: Connect Tools                                                     */
/* ═══════════════════════════════════════════════════════════════════════════ */

function StepConnectors({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const setupState = useOnboardingStore((s) => s.setupState);
  const toggleConnector = useOnboardingStore((s) => s.toggleConnector);

  return (
    <>
      <StepHeader
        icon={<Cable size={24} className="text-chamber-build" />}
        title="Connect your tools"
        subtitle="Optional. Bring in data from tools you already use."
      />

      <div className="mt-6 space-y-3">
        {CONNECTOR_OPTIONS.map((conn: ConnectorOption) => {
          const state = setupState.connectors.find((c) => c.type === conn.type);
          const isConnected = state?.status === "connected";
          const isConnecting = state?.status === "connecting";

          return (
            <motion.button
              key={conn.type}
              onClick={() => toggleConnector(conn.type)}
              disabled={isConnecting}
              className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all duration-fast ${
                isConnected
                  ? "border-accent-success/30 bg-accent-success/5"
                  : isConnecting
                    ? "border-accent-warning/30 bg-accent-warning/5"
                    : "border-surface-border bg-surface-overlay hover:bg-surface-overlay/80"
              }`}
              whileHover={!isConnecting ? { scale: 1.01 } : {}}
              whileTap={!isConnecting ? { scale: 0.99 } : {}}
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">
                  {conn.name}
                </p>
                <p className="text-xs text-text-muted">{conn.description}</p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  isConnected
                    ? "bg-accent-success/15 text-accent-success"
                    : isConnecting
                      ? "bg-accent-warning/15 text-accent-warning"
                      : "bg-surface-border/50 text-text-muted"
                }`}
              >
                {isConnected
                  ? "Connected"
                  : isConnecting
                    ? "Connecting..."
                    : "Connect"}
              </span>
            </motion.button>
          );
        })}
      </div>

      <WizardNav
        onNext={onNext}
        onBack={onBack}
        nextLabel="Continue"
        skipLabel="Skip for now"
        onSkip={onNext}
      />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Step 4: Invite Team                                                       */
/* ═══════════════════════════════════════════════════════════════════════════ */

function StepInviteTeam({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const setupState = useOnboardingStore((s) => s.setupState);
  const addInvitee = useOnboardingStore((s) => s.addInvitee);
  const removeInvitee = useOnboardingStore((s) => s.removeInvitee);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"builder" | "gatekeeper" | "owner">(
    "builder",
  );

  function handleAdd() {
    if (!email.includes("@")) return;
    addInvitee({ email, role });
    setEmail("");
  }

  return (
    <>
      <StepHeader
        icon={<UsersRound size={24} className="text-chamber-review" />}
        title="Invite your team"
        subtitle="Add people now or invite them later from Admin."
      />

      <div className="mt-6 space-y-4">
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="teammate@company.com"
            className="flex-1 rounded-lg border border-surface-border bg-surface-sunken px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary transition-all duration-fast"
          />
          <select
            value={role}
            onChange={(e) =>
              setRole(e.target.value as "builder" | "gatekeeper" | "owner")
            }
            className="rounded-lg border border-surface-border bg-surface-sunken px-2 py-2.5 text-xs text-text-secondary focus:outline-none"
          >
            <option value="builder">Builder</option>
            <option value="gatekeeper">Gatekeeper</option>
            <option value="owner">Owner</option>
          </select>
          <button
            onClick={handleAdd}
            disabled={!email.includes("@")}
            className="rounded-lg bg-accent-primary px-4 py-2.5 text-xs font-semibold text-surface-base transition-colors hover:bg-accent-primary-hover disabled:opacity-40"
          >
            Add
          </button>
        </div>

        {setupState.invitees.length > 0 && (
          <div className="space-y-1.5">
            {setupState.invitees.map((inv, i) => (
              <motion.div
                key={`${inv.email}-${i}`}
                className="flex items-center justify-between rounded-lg border border-surface-border bg-surface-overlay px-3 py-2"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div>
                  <p className="text-sm text-text-primary">{inv.email}</p>
                  <p className="text-[10px] uppercase tracking-wider text-text-muted">
                    {inv.role}
                  </p>
                </div>
                <button
                  onClick={() => removeInvitee(i)}
                  className="text-xs text-text-muted hover:text-accent-danger transition-colors"
                >
                  Remove
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <WizardNav
        onNext={onNext}
        onBack={onBack}
        nextLabel={
          setupState.invitees.length > 0
            ? `Continue (${setupState.invitees.length} invited)`
            : "Continue"
        }
        skipLabel="Skip for now"
        onSkip={onNext}
      />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Step 5: AI Provider (replaces "connect_data")                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

function StepAiProvider({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const saveNodeConfig = useCapabilityTreeStore((s) => s.saveNodeConfig);
  const [provider, setProvider] = useState("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("claude-sonnet-4-20250514");

  const providers = [
    {
      id: "anthropic",
      label: "Anthropic",
      models: ["claude-sonnet-4-20250514", "claude-haiku-4-5-20251001"],
    },
    {
      id: "openrouter",
      label: "OpenRouter",
      models: ["anthropic/claude-sonnet-4", "openai/gpt-4o"],
    },
    { id: "custom", label: "Custom / Self-hosted", models: ["custom"] },
  ];

  function handleConfigure() {
    if (apiKey.trim()) {
      saveNodeConfig("ai_provider", {
        provider: providers.find((p) => p.id === provider)?.label || provider,
        apiKey: apiKey.trim(),
        model,
      });
    }
    onNext();
  }

  return (
    <>
      <StepHeader
        icon={<Microchip size={24} className="text-accent-primary" />}
        title="Connect your AI"
        subtitle="Power Otto and contract extraction with your own API key."
      />

      <div className="mt-6 space-y-4">
        <div>
          <label className="mb-2 block text-xs font-medium text-text-muted uppercase tracking-wider">
            Provider
          </label>
          <div className="grid grid-cols-3 gap-2">
            {providers.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setProvider(p.id);
                  setModel(p.models[0]);
                }}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-fast ${
                  provider === p.id
                    ? "border-accent-primary/50 bg-accent-primary/10 text-accent-primary"
                    : "border-surface-border bg-surface-overlay text-text-secondary hover:bg-surface-overlay/80"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium text-text-muted uppercase tracking-wider">
            API Key
          </label>
          <div className="relative">
            <KeyRound
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full rounded-lg border border-surface-border bg-surface-sunken pl-9 pr-4 py-3 text-sm text-text-primary font-mono placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary transition-all duration-fast"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium text-text-muted uppercase tracking-wider">
            Model
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full rounded-lg border border-surface-border bg-surface-sunken px-4 py-3 text-sm text-text-secondary focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary"
          >
            {providers
              .find((p) => p.id === provider)
              ?.models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
          </select>
        </div>
      </div>

      <WizardNav
        onNext={handleConfigure}
        onBack={onBack}
        nextLabel={apiKey.trim() ? "Configure & Continue" : "Continue"}
        skipLabel="Skip — use demo mode"
        onSkip={onNext}
      />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Step 6: Ready!                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */

function StepReady({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const setupState = useOnboardingStore((s) => s.setupState);
  const completeAdminItem = useOnboardingStore((s) => s.completeAdminItem);
  const saveNodeConfig = useCapabilityTreeStore((s) => s.saveNodeConfig);

  function handleLaunch() {
    // Mark admin checklist items
    completeAdminItem("create_workspace");
    if (setupState.enabledModules.length > 0)
      completeAdminItem("enable_modules");
    if (setupState.invitees.length > 0) completeAdminItem("invite_team");

    // Save data source config
    saveNodeConfig("data_source", {
      type: "local",
      label: "Local File Storage",
    });

    localStorage.setItem("airlock_onboarding_complete", "true");
    router.push("/contracts/triage");
  }

  return (
    <>
      <div className="text-center">
        <motion.div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-success/10 border border-accent-success/20"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.1,
          }}
        >
          <CheckCircle size={32} className="text-accent-success" />
        </motion.div>

        <h2 className="text-xl font-bold text-text-primary">
          {setupState.workspaceName || "Your workspace"} is ready
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          {setupState.enabledModules.length} modules enabled
          {setupState.invitees.length > 0 &&
            ` \u00B7 ${setupState.invitees.length} team members invited`}
        </p>
      </div>

      <div className="mt-6 space-y-2">
        {[
          { label: "Workspace created", done: true },
          {
            label: `${setupState.enabledModules.length} modules enabled`,
            done: setupState.enabledModules.length > 0,
          },
          {
            label:
              setupState.invitees.length > 0
                ? `${setupState.invitees.length} invites queued`
                : "No team members yet",
            done: setupState.invitees.length > 0,
          },
          {
            label: setupState.connectors.some((c) => c.status === "connected")
              ? "Tools connected"
              : "No integrations yet",
            done: setupState.connectors.some((c) => c.status === "connected"),
          },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.08, duration: 0.3 }}
          >
            <div
              className={`h-2 w-2 rounded-full ${
                item.done ? "bg-accent-success" : "bg-surface-border"
              }`}
            />
            <span
              className={item.done ? "text-text-primary" : "text-text-muted"}
            >
              {item.label}
            </span>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 space-y-3">
        <motion.button
          onClick={handleLaunch}
          className="w-full rounded-lg bg-accent-primary py-3 text-sm font-semibold text-surface-base transition-all hover:bg-accent-primary-hover hover:shadow-[0_0_30px_rgba(0,209,255,0.15)]"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
        >
          Launch Workspace
        </motion.button>
        <button
          onClick={onBack}
          className="w-full rounded-lg py-2 text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          Back
        </button>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Shared sub-components                                                     */
/* ═══════════════════════════════════════════════════════════════════════════ */

function StepHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-overlay border border-surface-border">
        {icon}
      </div>
      <h2 className="text-lg font-bold text-text-primary">{title}</h2>
      <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
    </div>
  );
}

function WizardNav({
  onNext,
  onBack,
  nextLabel = "Continue",
  nextDisabled = false,
  skipLabel,
  onSkip,
}: {
  onNext: () => void;
  onBack?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  skipLabel?: string;
  onSkip?: () => void;
}) {
  return (
    <div className="mt-8 space-y-2">
      <motion.button
        onClick={onNext}
        disabled={nextDisabled}
        className="w-full rounded-lg bg-accent-primary py-3 text-sm font-semibold text-surface-base transition-all hover:bg-accent-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
        whileHover={!nextDisabled ? { y: -1 } : {}}
        whileTap={!nextDisabled ? { scale: 0.98 } : {}}
      >
        {nextLabel}
      </motion.button>

      <div className="flex items-center justify-between">
        {onBack ? (
          <button
            onClick={onBack}
            className="text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            Back
          </button>
        ) : (
          <span />
        )}
        {skipLabel && onSkip && (
          <button
            onClick={onSkip}
            className="text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            {skipLabel}
          </button>
        )}
      </div>
    </div>
  );
}
