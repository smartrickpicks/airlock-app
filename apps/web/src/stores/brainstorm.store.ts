"use client";

import { create } from "zustand";

export type ArtifactType = "recipe" | "playbook" | "tool" | "module";

export type BrainstormAgent =
  | "Scholar"
  | "Architect"
  | "Gatekeeper"
  | "Builder"
  | "Controller"
  | "Orchestrator";

export type BrainstormPhase = "qa" | "plan" | "approved";

export interface QAEntry {
  agent: BrainstormAgent;
  question: string;
  answer: string;
}

export interface BrainstormSession {
  artifactType: ArtifactType;
  phase: BrainstormPhase;
  /** Completed Q&A pairs */
  history: QAEntry[];
  /** Current question being asked (null when generating plan) */
  currentQuestion: { agent: BrainstormAgent; question: string } | null;
  /** Generated plan output (populated after Q&A phase completes) */
  planOutput: string | null;
}

interface BrainstormState {
  session: BrainstormSession | null;

  startSession: (type: ArtifactType) => void;
  submitAnswer: (answer: string) => void;
  approvePlan: () => void;
  reset: () => void;
}

function firstQuestion(type: ArtifactType): {
  agent: BrainstormAgent;
  question: string;
} {
  const questions = QUESTION_SEQUENCES[type];
  return { agent: questions[0].agent, question: questions[0].question };
}

export const useBrainstormStore = create<BrainstormState>((set, get) => ({
  session: null,

  startSession: (type) => {
    set({
      session: {
        artifactType: type,
        phase: "qa",
        history: [],
        currentQuestion: firstQuestion(type),
        planOutput: null,
      },
    });
  },

  submitAnswer: (answer) => {
    const { session } = get();
    if (!session || session.phase !== "qa" || !session.currentQuestion) return;

    const completedEntry: QAEntry = {
      agent: session.currentQuestion.agent,
      question: session.currentQuestion.question,
      answer,
    };
    const newHistory = [...session.history, completedEntry];
    const sequence = QUESTION_SEQUENCES[session.artifactType];
    const nextIndex = newHistory.length;

    if (nextIndex >= sequence.length) {
      // Q&A complete — generate plan
      const plan = generateMockPlan(session.artifactType, newHistory);
      set({
        session: {
          ...session,
          phase: "plan",
          history: newHistory,
          currentQuestion: null,
          planOutput: plan,
        },
      });
    } else {
      set({
        session: {
          ...session,
          history: newHistory,
          currentQuestion: {
            agent: sequence[nextIndex].agent,
            question: sequence[nextIndex].question,
          },
        },
      });
    }
  },

  approvePlan: () => {
    const { session } = get();
    if (!session || session.phase !== "plan") return;
    set({ session: { ...session, phase: "approved" } });
  },

  reset: () => set({ session: null }),
}));

// ---------------------------------------------------------------------------
// Question sequences — imported by mock-brainstorm.ts but defined here
// to keep the store self-contained for mock usage
// ---------------------------------------------------------------------------

export interface QuestionDef {
  agent: BrainstormAgent;
  question: string;
}

export const QUESTION_SEQUENCES: Record<ArtifactType, QuestionDef[]> = {
  recipe: [
    {
      agent: "Scholar",
      question:
        "What problem does this recipe need to solve? Describe the bottleneck or gap in your current workflow.",
    },
    {
      agent: "Architect",
      question:
        "Which vault type and chamber does this recipe apply to? (e.g. Distribution Agreement → Discover)",
    },
    {
      agent: "Builder",
      question:
        "Which role executes this recipe — Builder, Gatekeeper, or Owner?",
    },
    {
      agent: "Gatekeeper",
      question:
        "What hard conditions must be true before the user can advance to the next chamber? (e.g. all required fields filled, confidence ≥ 70%)",
    },
    {
      agent: "Controller",
      question:
        "Are there any steps that must happen in strict sequence, or can any run in parallel?",
    },
    {
      agent: "Orchestrator",
      question:
        "Anything else I should know — edge cases, exceptions, or stakeholders who need to be notified?",
    },
  ],
  playbook: [
    {
      agent: "Scholar",
      question:
        "What outcome does this playbook drive toward? What does success look like for the team executing it?",
    },
    {
      agent: "Architect",
      question:
        "Which module and role is this playbook for? (e.g. Contracts → Gatekeeper)",
    },
    {
      agent: "Builder",
      question:
        "Walk me through the key steps in order. What does the user do first, second, third?",
    },
    {
      agent: "Gatekeeper",
      question:
        "What approvals or sign-offs are required along the way? Who has veto power?",
    },
    {
      agent: "Controller",
      question:
        "What should trigger this playbook — a vault entering a specific chamber, a manual start, or a scheduled event?",
    },
    {
      agent: "Orchestrator",
      question:
        "Any exceptions or escalation paths? What happens when something goes wrong mid-playbook?",
    },
  ],
  tool: [
    {
      agent: "Scholar",
      question:
        "What task does this tool perform? What's the input and what's the expected output?",
    },
    {
      agent: "Architect",
      question:
        "Which surface does this tool live on — Signal panel, Orchestrate panel, or Control panel?",
    },
    {
      agent: "Gatekeeper",
      question:
        "Which roles are allowed to invoke this tool? Are there any permission constraints?",
    },
    {
      agent: "Builder",
      question:
        "Does this tool need to read from or write to any vault data? If so, which fields?",
    },
    {
      agent: "Orchestrator",
      question:
        "Should this tool run automatically in certain conditions, or always require manual invocation?",
    },
  ],
  module: [
    {
      agent: "Scholar",
      question:
        "What domain does this module cover? What problem space is it designed for?",
    },
    {
      agent: "Architect",
      question:
        "What are the primary views this module needs? (e.g. list view, detail view, board view)",
    },
    {
      agent: "Builder",
      question:
        "Which roles will use this module and what are their primary jobs-to-be-done?",
    },
    {
      agent: "Gatekeeper",
      question:
        "Does this module need to integrate with any existing modules? What data does it share?",
    },
    {
      agent: "Controller",
      question:
        "What are the lifecycle stages (chambers) for this module's core entity?",
    },
    {
      agent: "Orchestrator",
      question:
        "What does a successful day-one rollout look like? What's the minimum viable version?",
    },
  ],
};

function generateMockPlan(type: ArtifactType, history: QAEntry[]): string {
  const answers = history.map((h) => `• ${h.agent}: "${h.answer}"`).join("\n");
  return `# ${type.charAt(0).toUpperCase() + type.slice(1)} Plan\n\nBased on your answers:\n\n${answers}\n\n## Proposed Structure\n\nThe Orchestrator has synthesized the above into a draft plan. Review the nodes, conditions, and role assignments below, then approve to save to the library.\n\n_[Node structure will be generated here by the live agent in Phase 2]_`;
}
