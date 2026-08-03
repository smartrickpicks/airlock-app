import { create } from "zustand";
import { usePlaybookStore } from "@/stores/playbook.store";
import { useCapabilityTreeStore } from "@/stores/capability-tree.store";
import { useOnboardingStore } from "@/stores/onboarding.store";
import type {
  ForgeMessage,
  ForgeProfile,
  ForgeDrives,
  ForgeWorkspaceConfig,
  ForgeSkill,
  MetaArchetype,
  LinkedInProfile,
  ProvenanceData,
  BMYApiResponse,
} from "@/lib/mock-forge";
import {
  FORGE_LINKEDIN_ASK,
  FORGE_API_KEY_ASK,
  FORGE_Q1,
  FORGE_Q2,
  FORGE_LAUNCH_READY,
  ARCHETYPE_WORKSPACE_CONFIGS,
  ARCHETYPE_SKILLS,
  ARCHETYPE_MODULES,
  GOAL_CHIPS,
  MOCK_PROFILES,
  AUTONOMY_OPTIONS,
  mockInferProfile,
  createProfileResultMessage,
  createLinkedInResultMessage,
} from "@/lib/mock-forge";
import { apiFetch, ApiError } from "@/lib/api";

let messageCounter = 0;

type PowerProvider = "anthropic" | "openrouter" | "claude_max" | "demo";

interface ForgeState {
  // Conversation
  step: number; // 0=linkedin, 1=api_key, 2=Q1, 3=Q2, 4=result, 5=launch_ready
  messages: ForgeMessage[];
  isTyping: boolean;
  goalChipId: string | null;
  autonomyOptionId: string | null;

  // LinkedIn
  linkedInProfile: LinkedInProfile | null;
  linkedInDrives: Partial<ForgeDrives> | null;
  isScrapingLinkedIn: boolean;

  // Inferred profile
  inferredProfile: ForgeProfile | null;
  drives: ForgeDrives | null;
  confidence: number;
  metaArchetype: MetaArchetype | null;

  // Workspace preview
  activeModules: string[];
  workspaceConfig: ForgeWorkspaceConfig | null;
  preloadedSkills: ForgeSkill[];
  ottoConfig: {
    defaultArchetype: string;
    autonomyCeiling: number;
    interactionMode: string;
  } | null;

  // Power state
  isPowered: boolean;
  apiKey: string | null;
  powerSource: PowerProvider | null;
  powerUp: (key: string, provider: PowerProvider) => void;

  // Provenance (from real API)
  provenance: ProvenanceData | null;
  confidenceBreakdown: Record<string, number> | null;
  explanation: string | null;
  enrichmentSuggestions: string[];
  topCandidates: Array<{
    profile_id: string;
    profile_name: string;
    distance: number;
    meta_archetype: MetaArchetype;
  }>;

  // UI state
  isLaunching: boolean;
  isComplete: boolean;
  showProfilePanel: boolean;

  // Actions
  sendMessage: (content: string) => void;
  submitLinkedInUrl: (url: string) => Promise<void>;
  selectGoalChip: (chipId: string) => void;
  selectAutonomyOption: (optionId: string) => Promise<void>;
  toggleModule: (moduleId: string) => void;
  overrideProfile: (profileId: string) => void;
  launchWorkspace: () => void;
  reset: () => void;
}

function addOttoMessage(
  set: (fn: (s: ForgeState) => Partial<ForgeState>) => void,
  message: ForgeMessage,
  delay = 800,
) {
  set(() => ({ isTyping: true }));
  setTimeout(() => {
    set((s) => ({
      messages: [...s.messages, message],
      isTyping: false,
    }));
  }, delay);
}

export const useForgeStore = create<ForgeState>((set, get) => ({
  // Initial state — start with LinkedIn ask instead of welcome
  step: 0,
  messages: [FORGE_LINKEDIN_ASK],
  isTyping: false,
  goalChipId: null,
  autonomyOptionId: null,

  linkedInProfile: null,
  linkedInDrives: null,
  isScrapingLinkedIn: false,

  inferredProfile: null,
  drives: null,
  confidence: 0,
  metaArchetype: null,

  activeModules: ["contracts"],
  workspaceConfig: null,
  preloadedSkills: [],
  ottoConfig: null,

  provenance: null,
  confidenceBreakdown: null,
  explanation: null,
  enrichmentSuggestions: [],
  topCandidates: [],

  isPowered: false,
  apiKey: null,
  powerSource: null,

  isLaunching: false,
  isComplete: false,
  showProfilePanel: false,

  // --- Actions ---

  sendMessage: (content: string) => {
    const { step } = get();

    const userMsg: ForgeMessage = {
      id: `forge_user_${++messageCounter}`,
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };

    // Step 0 is LinkedIn — delegate entirely (it adds its own user message)
    if (step === 0) {
      get().submitLinkedInUrl(content);
      return;
    }

    set((s) => ({ messages: [...s.messages, userMsg] }));

    if (step === 2) {
      // Free-text answer to Q1 — infer goal from text and advance to Q2
      // In real app, LLM would extract signals from text
      set({ step: 3 });
      addOttoMessage(set, FORGE_Q2);
    } else if (step === 3) {
      // Free-text answer to Q2 — run inference and show result
      const { goalChipId, linkedInDrives, linkedInProfile } = get();
      const { profile, drives, confidence } = mockInferProfile(
        goalChipId,
        null,
      );

      // Merge LinkedIn pre-inferred drives if available
      if (linkedInDrives) {
        if (linkedInDrives.dominance != null)
          drives.dominance = Math.round(
            (drives.dominance + linkedInDrives.dominance) / 2,
          );
        if (linkedInDrives.extraversion != null)
          drives.extraversion = Math.round(
            (drives.extraversion + linkedInDrives.extraversion) / 2,
          );
        if (linkedInDrives.patience != null)
          drives.patience = Math.round(
            (drives.patience + linkedInDrives.patience) / 2,
          );
        if (linkedInDrives.formality != null)
          drives.formality = Math.round(
            (drives.formality + linkedInDrives.formality) / 2,
          );
      }

      const hasLinkedIn = !!linkedInProfile;
      const adjustedConfidence = hasLinkedIn
        ? Math.min(0.95, confidence + 0.1)
        : confidence;
      const archetype = profile.metaArchetype;

      set({
        step: 4,
        inferredProfile: profile,
        drives,
        confidence: adjustedConfidence,
        metaArchetype: archetype,
        activeModules: [...ARCHETYPE_MODULES[archetype]],
        workspaceConfig: ARCHETYPE_WORKSPACE_CONFIGS[archetype],
        preloadedSkills: ARCHETYPE_SKILLS[archetype],
        showProfilePanel: true,
      });

      addOttoMessage(set, createProfileResultMessage(profile), 1200);

      // After showing result, show launch ready
      setTimeout(() => {
        addOttoMessage(set, FORGE_LAUNCH_READY, 400);
        set({ step: 5 });
      }, 2500);
    }
  },

  submitLinkedInUrl: async (url: string) => {
    // Show user message
    const userMsg: ForgeMessage = {
      id: `forge_user_${++messageCounter}`,
      role: "user",
      content: url,
      timestamp: new Date().toISOString(),
    };
    set((s) => ({
      messages: [...s.messages, userMsg],
      isScrapingLinkedIn: true,
    }));

    // Scrape LinkedIn
    let profile: LinkedInProfile;
    try {
      profile = await apiFetch<LinkedInProfile>("/api/v1/linkedin/scrape", {
        method: "POST",
        body: JSON.stringify({ linkedin_url: url }),
      });
    } catch {
      // Mock fallback
      profile = {
        name:
          url
            .split("/")
            .pop()
            ?.replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase()) || "New Member",
        headline: "Professional",
        location: null,
        summary: "Experienced professional.",
        experience: [],
        skills: ["Leadership", "Strategy"],
        education: [],
        source_url: url,
        inferred_drives: {
          dominance: 7,
          extraversion: 6,
          patience: 4,
          formality: 4,
        },
      };
    }

    set({
      linkedInProfile: profile,
      linkedInDrives: profile.inferred_drives,
      isScrapingLinkedIn: false,
    });

    // Show Otto's LinkedIn summary
    addOttoMessage(set, createLinkedInResultMessage(profile), 1000);

    // Then advance to API key step
    setTimeout(() => {
      set({ step: 1 });
      addOttoMessage(set, FORGE_API_KEY_ASK, 400);
    }, 2000);
  },

  selectGoalChip: (chipId: string) => {
    const chip = GOAL_CHIPS.find((c) => c.id === chipId);
    if (!chip) return;

    const userMsg: ForgeMessage = {
      id: `forge_user_${++messageCounter}`,
      role: "user",
      content: chip.label,
      timestamp: new Date().toISOString(),
    };

    set((s) => ({
      messages: [...s.messages, userMsg],
      goalChipId: chipId,
      activeModules: [...new Set([...s.activeModules, ...chip.modules])],
      step: 3,
    }));

    addOttoMessage(set, FORGE_Q2);
  },

  selectAutonomyOption: async (optionId: string) => {
    const { goalChipId } = get();

    const option = AUTONOMY_OPTIONS.find((o) => o.id === optionId);
    if (!option) return;

    const userMsg: ForgeMessage = {
      id: `forge_user_${++messageCounter}`,
      role: "user",
      content: `${option.emoji} ${option.label}`,
      timestamp: new Date().toISOString(),
    };

    set((s) => ({
      messages: [...s.messages, userMsg],
      autonomyOptionId: optionId,
    }));

    // Try real BMY API first, fall back to mock
    try {
      const signals: Record<string, unknown> = {
        signal_sources: ["conversation"],
      };

      // Add goal from selected chip
      const goalChip = GOAL_CHIPS.find((c) => c.id === goalChipId);
      if (goalChip) signals.goal_statement = goalChip.label;

      // Add autonomy preference
      const autoOption = AUTONOMY_OPTIONS.find((o) => o.id === optionId);
      if (autoOption) signals.autonomy_preference = autoOption.label;

      // Add LinkedIn signals if available
      const linkedIn = get().linkedInProfile;
      if (linkedIn) {
        signals.job_title = linkedIn.headline;
        signals.signal_sources = ["conversation", "linkedin"];
      }

      const res = await fetch("/api/v1/inference/bmy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signals }),
      });

      if (!res.ok) throw new Error(`BMY API error: ${res.status}`);
      const bmy: BMYApiResponse = await res.json();

      // Map API profile to local ForgeProfile shape
      const matchedProfile = MOCK_PROFILES.find(
        (p) => p.id === bmy.profile.profile_id,
      ) ?? {
        id: bmy.profile.profile_id,
        name: bmy.profile.profile_name,
        bio: bmy.explanation.split(".")[0] + ".",
        metaArchetype: bmy.profile.meta_archetype as MetaArchetype,
        category: "Inferred",
        strengths: [],
        cautions: [],
        drives: bmy.drives,
      };

      const archetype = matchedProfile.metaArchetype;

      set((s) => ({
        inferredProfile: matchedProfile,
        drives: {
          dominance: Math.round(bmy.drives.dominance),
          extraversion: Math.round(bmy.drives.extraversion),
          patience: Math.round(bmy.drives.patience),
          formality: Math.round(bmy.drives.formality),
        },
        confidence: bmy.confidence,
        metaArchetype: archetype,
        provenance: bmy.provenance,
        confidenceBreakdown: bmy.confidence_breakdown,
        explanation: bmy.explanation,
        enrichmentSuggestions: bmy.enrichment_suggestions,
        topCandidates: bmy.top_candidates,
        activeModules: [
          ...new Set([...s.activeModules, ...ARCHETYPE_MODULES[archetype]]),
        ],
        workspaceConfig: {
          cognitiveMode: bmy.workspace_config.cognitiveMode,
          informationDensity: bmy.workspace_config.informationDensity,
          interfaceStructure: bmy.workspace_config.interfaceStructure,
          updatePace: bmy.workspace_config.updatePace,
          explanationStyle: bmy.workspace_config.explanationStyle,
        },
        preloadedSkills: ARCHETYPE_SKILLS[archetype],
        ottoConfig: {
          defaultArchetype: bmy.otto_config.default_archetype,
          autonomyCeiling: bmy.otto_config.autonomy_ceiling,
          interactionMode: bmy.otto_config.interaction_mode,
        },
        showProfilePanel: true,
        step: 4,
      }));

      addOttoMessage(set, createProfileResultMessage(matchedProfile), 1200);
    } catch (err) {
      console.error("BMY API unavailable, using mock inference:", err);

      // Existing mockInferProfile fallback
      const { profile, drives, confidence } = mockInferProfile(
        goalChipId,
        optionId,
      );

      // Merge LinkedIn pre-inferred drives if available
      const { linkedInDrives, linkedInProfile } = get();
      if (linkedInDrives) {
        if (linkedInDrives.dominance != null)
          drives.dominance = Math.round(
            (drives.dominance + linkedInDrives.dominance) / 2,
          );
        if (linkedInDrives.extraversion != null)
          drives.extraversion = Math.round(
            (drives.extraversion + linkedInDrives.extraversion) / 2,
          );
        if (linkedInDrives.patience != null)
          drives.patience = Math.round(
            (drives.patience + linkedInDrives.patience) / 2,
          );
        if (linkedInDrives.formality != null)
          drives.formality = Math.round(
            (drives.formality + linkedInDrives.formality) / 2,
          );
      }

      const hasLinkedIn = !!linkedInProfile;
      const adjustedConfidence = hasLinkedIn
        ? Math.min(0.95, confidence + 0.1)
        : confidence;
      const archetype = profile.metaArchetype;

      set((s) => ({
        step: 4,
        inferredProfile: profile,
        drives,
        confidence: adjustedConfidence,
        metaArchetype: archetype,
        activeModules: [
          ...new Set([...s.activeModules, ...ARCHETYPE_MODULES[archetype]]),
        ],
        workspaceConfig: ARCHETYPE_WORKSPACE_CONFIGS[archetype],
        preloadedSkills: ARCHETYPE_SKILLS[archetype],
        ottoConfig: {
          defaultArchetype:
            option.interactionMode === "autonomous" ? "executor" : "connector",
          autonomyCeiling: option.autonomyCeiling,
          interactionMode: option.interactionMode,
        },
        showProfilePanel: true,
        provenance: null,
        confidenceBreakdown: null,
        explanation: null,
        enrichmentSuggestions: [],
        topCandidates: [],
      }));

      addOttoMessage(set, createProfileResultMessage(profile), 1200);
    }

    // After showing result, show launch ready
    setTimeout(() => {
      addOttoMessage(set, FORGE_LAUNCH_READY, 400);
      set({ step: 5 });
    }, 2500);
  },

  toggleModule: (moduleId: string) => {
    set((s) => {
      const isActive = s.activeModules.includes(moduleId);
      return {
        activeModules: isActive
          ? s.activeModules.filter((m) => m !== moduleId)
          : [...s.activeModules, moduleId],
      };
    });
  },

  overrideProfile: (profileId: string) => {
    const { profile, drives, confidence } = mockInferProfile(
      profileId,
      get().autonomyOptionId,
    );

    // Find the profile from our mock list
    const overrideProfile = MOCK_PROFILES.find((p) => p.id === profileId);
    if (!overrideProfile) return;

    const archetype = overrideProfile.metaArchetype;

    const overrideMsg: ForgeMessage = {
      id: `forge_otto_override_${++messageCounter}`,
      role: "otto",
      content: `Got it — you know yourself best. I've reconfigured your workspace for the **${overrideProfile.name}** profile.`,
      timestamp: new Date().toISOString(),
    };

    set((s) => ({
      messages: [...s.messages, overrideMsg],
      inferredProfile: overrideProfile,
      drives: overrideProfile.drives,
      confidence: 0.9, // User override = 0.90 per confidence-rules.yaml
      metaArchetype: archetype,
      activeModules: [
        ...new Set([...s.activeModules, ...ARCHETYPE_MODULES[archetype]]),
      ],
      workspaceConfig: ARCHETYPE_WORKSPACE_CONFIGS[archetype],
      preloadedSkills: ARCHETYPE_SKILLS[archetype],
      // Override bypasses inference — clear provenance
      provenance: null,
      confidenceBreakdown: null,
      explanation: null,
      enrichmentSuggestions: [],
      topCandidates: [],
    }));
  },

  powerUp: (key: string, provider: PowerProvider) => {
    set({ apiKey: key, isPowered: true, powerSource: provider });

    // Save to capability tree (maps provider for Otto routing)
    const capProvider =
      provider === "openrouter"
        ? "OpenRouter"
        : provider === "claude_max"
          ? "Anthropic"
          : "Anthropic";
    const { saveNodeConfig } = useCapabilityTreeStore.getState();
    saveNodeConfig("ai_provider", {
      provider: capProvider,
      apiKey: key,
      model:
        provider === "claude_max"
          ? "claude-sonnet-4-6"
          : "claude-sonnet-4-20250514",
    });

    // Advance to Q1 (goal chips)
    set({ step: 2 });
    addOttoMessage(set, FORGE_Q1, 600);
  },

  launchWorkspace: async () => {
    set({ isLaunching: true });

    // Sync modules to onboarding store
    const { activeModules } = get();
    const onboarding = useOnboardingStore.getState();
    for (const mod of activeModules) {
      if (!onboarding.setupState.enabledModules.includes(mod)) {
        onboarding.toggleModule(mod);
      }
    }

    // Create workspace via API
    const workspaceName = onboarding.setupState.workspaceName || "My Workspace";
    try {
      await apiFetch<{ id: string; name: string; slug: string }>(
        "/api/v1/workspaces",
        {
          method: "POST",
          body: JSON.stringify({ name: workspaceName }),
        },
      );
    } catch (err) {
      // 409 = this workspace already exists, which is the normal case on any
      // re-run. It is NOT a failure and must not abort the refresh below.
      if (err instanceof ApiError && err.status === 409) {
        console.info("[forge] workspace already exists — continuing");
      } else {
        console.warn("[forge] workspace creation failed:", err);
      }
    }

    // Refresh the JWT so it carries workspace_id.
    //
    // This used to live inside the try above, after the workspace POST — so a
    // benign 409 ("already exists") skipped it entirely. The user finished
    // onboarding holding a token with no workspace, and the shell bounced them
    // back to the landing page. Runs unconditionally now: whether the workspace
    // was just created or already existed, the token still needs the claim.
    try {
      const refreshToken = localStorage.getItem("airlock_refresh_token");
      if (refreshToken) {
        const refreshData = await apiFetch<{ access_token: string }>(
          "/api/v1/auth/refresh",
          {
            method: "POST",
            body: JSON.stringify({ refresh_token: refreshToken }),
          },
        );
        localStorage.setItem("airlock_access_token", refreshData.access_token);
        document.cookie = `airlock_access_token=${refreshData.access_token}; path=/; max-age=900; SameSite=Lax`;
        const { useAuthStore } = await import("@/stores/auth.store");
        useAuthStore.getState().setAccessToken(refreshData.access_token);
      } else {
        console.warn("[forge] no refresh token — workspace claim not applied");
      }
    } catch (err) {
      console.warn("[forge] token refresh failed:", err);
    }

    // Persist the behavioural profile server-side.
    //
    // /api/v1/inference/bmy (called during the conversation) is a stateless
    // calculator — it has no db dependency and writes nothing. The profile the
    // rest of the system reads is created by /onboarding/member/infer, which
    // runs the same inference and upserts it. Without this call the user
    // finishes onboarding with no profile row, and /onboarding/opening-move
    // answers 404 "No profile found — complete onboarding first".
    //
    // Must run BEFORE the opening-move fetch below: that endpoint reads the row
    // this call writes.
    try {
      const { goalChipId, autonomyOptionId, linkedInProfile } = get();
      const goalChip = GOAL_CHIPS.find((c) => c.id === goalChipId);
      const autoOption = AUTONOMY_OPTIONS.find((o) => o.id === autonomyOptionId);

      await apiFetch("/api/v1/onboarding/member/infer", {
        method: "POST",
        body: JSON.stringify({
          goal_statement: goalChip?.label,
          autonomy_preference: autoOption?.label,
          job_title: linkedInProfile?.headline,
        }),
      });
    } catch (err) {
      // Non-fatal: the workspace still opens, but Otto's opening move will be
      // missing because there is no profile to personalise it from.
      console.warn("[forge] profile persist failed — opening move will 404:", err);
    }

    set({ isLaunching: false, isComplete: true });
    const { metaArchetype } = get();
    const { loadDemoPlaybook } = usePlaybookStore.getState();
    loadDemoPlaybook(metaArchetype || undefined);

    // Fetch Otto's Opening Move and inject into chat
    try {
      const token = localStorage.getItem("airlock_access_token");
      const moveRes = await fetch("/api/v1/onboarding/opening-move", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (moveRes.ok) {
        const move = await moveRes.json();
        const { useOttoStore } = await import("@/stores/otto.store");
        useOttoStore.getState().injectOpeningMove(move);
      }
    } catch (err) {
      console.warn("[forge] Opening move fetch failed:", err);
    }
  },

  reset: () => {
    messageCounter = 0;
    set({
      step: 0,
      messages: [FORGE_LINKEDIN_ASK],
      isTyping: false,
      goalChipId: null,
      autonomyOptionId: null,
      linkedInProfile: null,
      linkedInDrives: null,
      isScrapingLinkedIn: false,
      inferredProfile: null,
      drives: null,
      confidence: 0,
      metaArchetype: null,
      activeModules: ["contracts"],
      workspaceConfig: null,
      preloadedSkills: [],
      ottoConfig: null,
      provenance: null,
      confidenceBreakdown: null,
      explanation: null,
      enrichmentSuggestions: [],
      topCandidates: [],
      isPowered: false,
      apiKey: null,
      powerSource: null,
      isLaunching: false,
      isComplete: false,
      showProfilePanel: false,
    });
  },
}));

// Re-export for convenience
export { MOCK_PROFILES, AUTONOMY_OPTIONS };
