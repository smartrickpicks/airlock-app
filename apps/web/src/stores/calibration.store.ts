import { create } from "zustand";
import type {
  ForgeMessage,
  ForgeProfile,
  ForgeDrives,
  ForgeWorkspaceConfig,
  MetaArchetype,
  ProvenanceData,
  CalibrationResponse,
  NextQuestion,
  UnlockEvent,
} from "@/lib/mock-forge";
import {
  GOAL_CHIPS,
  MOCK_PROFILES,
  ARCHETYPE_WORKSPACE_CONFIGS,
  ARCHETYPE_MODULES,
  ARCHETYPE_SKILLS,
} from "@/lib/mock-forge";
import { useOnboardingStore } from "@/stores/onboarding.store";
import { usePlaybookStore } from "@/stores/playbook.store";

let messageCounter = 0;

// ---------------------------------------------------------------------------
// Interaction types for the calibration UI
// ---------------------------------------------------------------------------

export type CalibrationInteraction =
  | { type: "calibration_cards"; question: NextQuestion }
  | { type: "calibration_input"; questionId: string }
  | { type: "bmy_choice" }
  | { type: "deep_complete_choice" }
  | { type: "profile_result" }
  | { type: "launch_ready" };

export interface CalibrationMessage extends ForgeMessage {
  calibrationInteraction?: CalibrationInteraction;
}

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

interface CalibrationStoreState {
  // Conversation
  messages: CalibrationMessage[];
  isTyping: boolean;

  // Calibration state (mirrors server-side CalibrationState)
  drives: ForgeDrives | null;
  confidence: number;
  questionsAsked: string[];
  driveSignalCounts: Record<string, number>;
  archetypeHypothesis: string | null;
  phase: string;

  // Current question tracking
  currentQuestion: NextQuestion | null;
  unlockEvents: UnlockEvent[];

  // Inferred results
  inferredProfile: ForgeProfile | null;
  metaArchetype: MetaArchetype | null;
  workspaceConfig: ForgeWorkspaceConfig | null;
  provenance: ProvenanceData | null;
  confidenceBreakdown: Record<string, number> | null;

  // UI state
  activeModules: string[];
  showProfilePanel: boolean;
  isLaunching: boolean;
  isComplete: boolean;

  // Actions
  submitAnswer: (
    questionId: string,
    optionId: string | null,
    freeText: string | null,
  ) => Promise<void>;
  continueCalibration: () => void;
  launchWorkspace: () => void;
  toggleModule: (moduleId: string) => void;
  overrideProfile: (profileId: string) => void;
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nextId(prefix: string): string {
  return `cal_${prefix}_${++messageCounter}`;
}

function ottoMessage(
  content: string,
  interaction?: CalibrationInteraction,
): CalibrationMessage {
  return {
    id: nextId("otto"),
    role: "otto",
    content,
    timestamp: new Date().toISOString(),
    calibrationInteraction: interaction,
  };
}

function userMessage(content: string): CalibrationMessage {
  return {
    id: nextId("user"),
    role: "user",
    content,
    timestamp: new Date().toISOString(),
  };
}

function buildPriorState(state: CalibrationStoreState) {
  return {
    drives: state.drives,
    confidence: state.confidence,
    questions_asked: state.questionsAsked,
    drive_signal_counts: state.driveSignalCounts,
    archetype_hypothesis: state.archetypeHypothesis,
    phase: state.phase,
  };
}

// Build the initial goal_statement question from GOAL_CHIPS
function buildGoalQuestion(): NextQuestion {
  return {
    id: "goal_statement",
    text: "What are you here to accomplish? Pick what resonates, or tell me in your own words.",
    format: "card_tap",
    options: GOAL_CHIPS.map((chip) => ({
      id: chip.id,
      label: chip.label,
    })),
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const initialGoalQuestion = buildGoalQuestion();

const INITIAL_MESSAGES: CalibrationMessage[] = [
  ottoMessage(
    "Welcome to Brain Brigade! I'm Otto. Let's figure out how you work best so I can build your perfect workspace.\n\nWhat are you here to accomplish?",
    { type: "calibration_cards", question: initialGoalQuestion },
  ),
];

export const useCalibrationStore = create<CalibrationStoreState>(
  (set, get) => ({
    // Initial state
    messages: INITIAL_MESSAGES,
    isTyping: false,

    drives: null,
    confidence: 0,
    questionsAsked: [],
    driveSignalCounts: {},
    archetypeHypothesis: null,
    phase: "in_progress",

    currentQuestion: initialGoalQuestion,
    unlockEvents: [],

    inferredProfile: null,
    metaArchetype: null,
    workspaceConfig: null,
    provenance: null,
    confidenceBreakdown: null,

    activeModules: ["contracts"],
    showProfilePanel: false,
    isLaunching: false,
    isComplete: false,

    // ---------------------------------------------------------------------------
    // submitAnswer — core adaptive loop
    // ---------------------------------------------------------------------------
    submitAnswer: async (
      questionId: string,
      optionId: string | null,
      freeText: string | null,
    ) => {
      const state = get();

      // Determine display text for the user bubble
      let displayText = freeText || "";
      if (optionId && state.currentQuestion) {
        const opt = state.currentQuestion.options.find(
          (o) => o.id === optionId,
        );
        if (opt) displayText = opt.label;
      }

      // Add user message + start typing
      set((s) => ({
        messages: [...s.messages, userMessage(displayText)],
        isTyping: true,
      }));

      const priorState = buildPriorState(state);

      try {
        const resp = await fetch("/api/v1/calibration/next", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question_id: questionId,
            selected_option_id: optionId,
            free_text: freeText,
            session_id: "forge-session",
            prior_state: priorState.drives ? priorState : undefined,
          }),
        });

        if (!resp.ok) throw new Error(`Calibration API error: ${resp.status}`);

        const data: CalibrationResponse = await resp.json();

        // Build new messages from the response
        const newMessages: CalibrationMessage[] = [];

        // 1. Micro-insight from Otto
        if (data.micro_insight) {
          newMessages.push(ottoMessage(data.micro_insight));
        }

        // 2. Unlock event messages
        for (const evt of data.unlock_events) {
          newMessages.push(ottoMessage(evt.message));
        }

        // 3. Profile match at BMY complete
        let matchedProfile: ForgeProfile | null = null;
        let matchedArchetype: MetaArchetype | null = null;

        if (data.profile_match) {
          matchedProfile = MOCK_PROFILES.find(
            (p) => p.id === data.profile_match!.profile_id,
          ) ?? {
            id: data.profile_match.profile_id,
            name: data.profile_match.profile_name,
            bio: data.micro_insight.split(".")[0] + ".",
            metaArchetype: data.profile_match.meta_archetype as MetaArchetype,
            category: "Inferred",
            strengths: [],
            cautions: [],
            drives: data.drives,
          };
          matchedArchetype = matchedProfile.metaArchetype;

          newMessages.push(
            ottoMessage(
              `Based on what you've told me, I see you as a **${matchedProfile.name}** — ${matchedProfile.bio.toLowerCase()}`,
              { type: "profile_result" },
            ),
          );
        }

        // 4. BMY complete — show choice cards
        if (data.bmy_complete && data.phase === "bmy_complete") {
          newMessages.push(
            ottoMessage(
              "I've got a solid read on how you work. Want to jump straight into your workspace, or keep going for a deeper calibration?",
              { type: "bmy_choice" },
            ),
          );
        }

        // 5. Deep calibration complete
        if (data.phase === "fully_calibrated") {
          newMessages.push(
            ottoMessage(
              "Full calibration complete. Your workspace is dialed in. Ready to launch?",
              { type: "deep_complete_choice" },
            ),
          );
        }

        // 6. Next question (if calibration continues)
        if (data.next_question && !data.bmy_complete) {
          const interaction: CalibrationInteraction =
            data.next_question.format === "card_tap"
              ? { type: "calibration_cards", question: data.next_question }
              : {
                  type: "calibration_input",
                  questionId: data.next_question.id,
                };

          newMessages.push(ottoMessage(data.next_question.text, interaction));
        }

        // Update state
        set((s) => ({
          messages: [...s.messages, ...newMessages],
          isTyping: false,
          drives: data.drives,
          confidence: data.confidence,
          questionsAsked: data.questions_asked,
          archetypeHypothesis: data.archetype_hypothesis,
          phase: data.phase,
          currentQuestion: data.next_question,
          unlockEvents: [...s.unlockEvents, ...data.unlock_events],
          driveSignalCounts: {
            ...s.driveSignalCounts,
            [questionId]: (s.driveSignalCounts[questionId] || 0) + 1,
          },
          // Profile results
          ...(matchedProfile
            ? {
                inferredProfile: matchedProfile,
                metaArchetype: matchedArchetype,
                showProfilePanel: true,
                activeModules: [
                  ...new Set([
                    ...s.activeModules,
                    ...ARCHETYPE_MODULES[matchedArchetype!],
                  ]),
                ],
                workspaceConfig: ARCHETYPE_WORKSPACE_CONFIGS[matchedArchetype!],
              }
            : {}),
        }));
      } catch (err) {
        console.error("Calibration API unavailable:", err);
        // On failure, just clear typing — don't break the conversation
        set({ isTyping: false });
      }
    },

    // ---------------------------------------------------------------------------
    // continueCalibration — user chose "Keep going" after BMY
    // ---------------------------------------------------------------------------
    continueCalibration: () => {
      const state = get();

      const continueMsg = userMessage("Keep going — I want the full picture.");

      // If there's a next_question queued from the BMY response, show it
      const { currentQuestion } = state;

      const newMessages: CalibrationMessage[] = [continueMsg];

      if (currentQuestion) {
        const interaction: CalibrationInteraction =
          currentQuestion.format === "card_tap"
            ? { type: "calibration_cards", question: currentQuestion }
            : { type: "calibration_input", questionId: currentQuestion.id };

        newMessages.push(
          ottoMessage(
            `Let's go deeper.\n\n${currentQuestion.text}`,
            interaction,
          ),
        );
      } else {
        newMessages.push(
          ottoMessage(
            "Let's keep going. Tell me more about how you prefer to work day-to-day.",
            {
              type: "calibration_input",
              questionId: "deep_freeform",
            },
          ),
        );
      }

      set((s) => ({
        messages: [...s.messages, ...newMessages],
        phase: "deep_calibration",
      }));
    },

    // ---------------------------------------------------------------------------
    // launchWorkspace — 2s animation then complete
    // ---------------------------------------------------------------------------
    launchWorkspace: () => {
      const launchMsg = userMessage("Launch my workspace");

      set((s) => ({
        messages: [
          ...s.messages,
          launchMsg,
          ottoMessage("Building your workspace..."),
        ],
        isLaunching: true,
      }));

      setTimeout(async () => {
        // Sync modules to onboarding store
        const { activeModules, metaArchetype } = get();
        try {
          const onboarding = useOnboardingStore.getState();
          for (const mod of activeModules) {
            if (!onboarding.setupState.enabledModules.includes(mod)) {
              onboarding.toggleModule(mod);
            }
          }
        } catch {
          // Onboarding store may not be available
        }

        set((s) => ({
          messages: [
            ...s.messages,
            ottoMessage("Your workspace is ready. Welcome to Brain Brigade.", {
              type: "launch_ready",
            }),
          ],
          isLaunching: false,
          isComplete: true,
        }));

        // Load demo playbook
        try {
          const { metaArchetype } = get();
          const { loadDemoPlaybook } = usePlaybookStore.getState();
          loadDemoPlaybook(metaArchetype || undefined);
        } catch {
          // Playbook store may not be available
        }
      }, 2000);
    },

    // ---------------------------------------------------------------------------
    // toggleModule
    // ---------------------------------------------------------------------------
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

    // ---------------------------------------------------------------------------
    // overrideProfile — user manually picks a different profile
    // ---------------------------------------------------------------------------
    overrideProfile: (profileId: string) => {
      const overrideProfile = MOCK_PROFILES.find((p) => p.id === profileId);
      if (!overrideProfile) return;

      const archetype = overrideProfile.metaArchetype;

      set((s) => ({
        messages: [
          ...s.messages,
          ottoMessage(
            `Got it — you know yourself best. I've reconfigured your workspace for the **${overrideProfile.name}** profile.`,
          ),
        ],
        inferredProfile: overrideProfile,
        drives: overrideProfile.drives,
        confidence: 0.9,
        metaArchetype: archetype,
        activeModules: [
          ...new Set([...s.activeModules, ...ARCHETYPE_MODULES[archetype]]),
        ],
        workspaceConfig: ARCHETYPE_WORKSPACE_CONFIGS[archetype],
        provenance: null,
        confidenceBreakdown: null,
      }));
    },

    // ---------------------------------------------------------------------------
    // reset
    // ---------------------------------------------------------------------------
    reset: () => {
      messageCounter = 0;
      set({
        messages: INITIAL_MESSAGES,
        isTyping: false,
        drives: null,
        confidence: 0,
        questionsAsked: [],
        driveSignalCounts: {},
        archetypeHypothesis: null,
        phase: "in_progress",
        currentQuestion: initialGoalQuestion,
        unlockEvents: [],
        inferredProfile: null,
        metaArchetype: null,
        workspaceConfig: null,
        provenance: null,
        confidenceBreakdown: null,
        activeModules: ["contracts"],
        showProfilePanel: false,
        isLaunching: false,
        isComplete: false,
      });
    },
  }),
);
