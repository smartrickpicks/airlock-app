import { create } from "zustand";
import { usePlaybookStore } from "@/stores/playbook.store";
import type {
  ForgeMessage,
  ForgeProfile,
  ForgeDrives,
  ForgeWorkspaceConfig,
  ForgeSkill,
  MetaArchetype,
} from "@/lib/mock-forge";
import {
  FORGE_WELCOME,
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
} from "@/lib/mock-forge";

let messageCounter = 0;

interface ForgeState {
  // Conversation
  step: number; // 0=welcome, 1=Q1, 2=Q2, 3=result, 4=launch_ready
  messages: ForgeMessage[];
  isTyping: boolean;
  goalChipId: string | null;
  autonomyOptionId: string | null;

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

  // UI state
  isLaunching: boolean;
  isComplete: boolean;
  showProfilePanel: boolean;

  // Actions
  sendMessage: (content: string) => void;
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
  // Initial state
  step: 0,
  messages: [FORGE_WELCOME],
  isTyping: false,
  goalChipId: null,
  autonomyOptionId: null,

  inferredProfile: null,
  drives: null,
  confidence: 0,
  metaArchetype: null,

  activeModules: ["contracts"],
  workspaceConfig: null,
  preloadedSkills: [],
  ottoConfig: null,

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

    set((s) => ({ messages: [...s.messages, userMsg] }));

    // Advance conversation based on current step
    if (step === 0) {
      // After welcome, show Q1
      set({ step: 1 });
      addOttoMessage(set, FORGE_Q1);
    } else if (step === 1) {
      // Free-text answer to Q1 — infer goal from text and advance to Q2
      // In real app, LLM would extract signals from text
      set({ step: 2 });
      addOttoMessage(set, FORGE_Q2);
    } else if (step === 2) {
      // Free-text answer to Q2 — run inference and show result
      const { goalChipId } = get();
      const { profile, drives, confidence } = mockInferProfile(
        goalChipId,
        null,
      );
      const archetype = profile.metaArchetype;

      set({
        step: 3,
        inferredProfile: profile,
        drives,
        confidence,
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
        set({ step: 4 });
      }, 2500);
    }
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
      step: 2,
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
    const archetype = profile.metaArchetype;

    set((s) => ({
      messages: [...s.messages, userMsg],
      autonomyOptionId: optionId,
      step: 3,
      inferredProfile: profile,
      drives,
      confidence,
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
      set({ step: 4 });
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

  launchWorkspace: () => {
    set({ isLaunching: true });

    // Simulate launch delay, then load demo playbook
    setTimeout(() => {
      set({ isLaunching: false, isComplete: true });
      // Wire to playbook store — auto-suggest a playbook after workspace launch
      const { loadDemoPlaybook } = usePlaybookStore.getState();
      loadDemoPlaybook();
    }, 1500);
  },

  reset: () => {
    messageCounter = 0;
    set({
      step: 0,
      messages: [FORGE_WELCOME],
      isTyping: false,
      goalChipId: null,
      autonomyOptionId: null,
      inferredProfile: null,
      drives: null,
      confidence: 0,
      metaArchetype: null,
      activeModules: ["contracts"],
      workspaceConfig: null,
      preloadedSkills: [],
      ottoConfig: null,
      isLaunching: false,
      isComplete: false,
      showProfilePanel: false,
    });
  },
}));

// Re-export for convenience
export { MOCK_PROFILES, AUTONOMY_OPTIONS };
