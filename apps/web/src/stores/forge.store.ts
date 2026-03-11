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
import { apiFetch } from "@/lib/api";

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

  // UI state
  isLaunching: boolean;
  isComplete: boolean;
  showProfilePanel: boolean;

  // Actions
  sendMessage: (content: string) => void;
  submitLinkedInUrl: (url: string) => Promise<void>;
  selectGoalChip: (chipId: string) => void;
  selectAutonomyOption: (optionId: string) => void;
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

  selectAutonomyOption: (optionId: string) => {
    const { goalChipId } = get();

    const option = AUTONOMY_OPTIONS.find((o) => o.id === optionId);
    if (!option) return;

    const userMsg: ForgeMessage = {
      id: `forge_user_${++messageCounter}`,
      role: "user",
      content: `${option.emoji} ${option.label}`,
      timestamp: new Date().toISOString(),
    };

    // Run inference
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
      messages: [...s.messages, userMsg],
      autonomyOptionId: optionId,
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
    }));

    addOttoMessage(set, createProfileResultMessage(profile), 1200);

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

  launchWorkspace: () => {
    set({ isLaunching: true });

    // Sync modules to onboarding store
    const { activeModules } = get();
    const onboarding = useOnboardingStore.getState();
    for (const mod of activeModules) {
      if (!onboarding.setupState.enabledModules.includes(mod)) {
        onboarding.toggleModule(mod);
      }
    }

    // Simulate launch delay, then load archetype-matched playbook
    setTimeout(() => {
      set({ isLaunching: false, isComplete: true });
      const { metaArchetype } = get();
      const { loadDemoPlaybook } = usePlaybookStore.getState();
      loadDemoPlaybook(metaArchetype || undefined);
    }, 1500);
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
