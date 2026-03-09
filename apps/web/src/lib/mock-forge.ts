/**
 * Mock data for the Workspace Forge onboarding experience.
 *
 * Types + mock constants for:
 * - Forge conversation (Otto's scripted questions)
 * - PI profile inference results
 * - Workspace configuration output
 * - Goal chips and autonomy cards
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MetaArchetype = "driver" | "enforcer" | "interpreter";

export type ForgeMessageRole = "otto" | "user" | "system";

export interface ForgeMessage {
  id: string;
  role: ForgeMessageRole;
  content: string;
  timestamp: string;
  /** Optional interactive element attached to this message */
  interaction?:
    | "goal_chips"
    | "autonomy_cards"
    | "profile_result"
    | "launch_ready";
}

export interface ForgeDrives {
  dominance: number; // 1-10
  extraversion: number; // 1-10
  patience: number; // 1-10
  formality: number; // 1-10
}

export interface ForgeProfile {
  id: string;
  name: string;
  bio: string;
  drives: ForgeDrives;
  metaArchetype: MetaArchetype;
  category: string;
  strengths: string[];
  cautions: string[];
}

export interface ForgeWorkspaceConfig {
  cognitiveMode: string;
  informationDensity: string;
  interfaceStructure: string;
  updatePace: string;
  explanationStyle: string;
}

export interface ForgeOttoConfig {
  defaultArchetype: string;
  autonomyCeiling: number;
  interactionMode: string;
}

export interface ForgeSkill {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface AutonomyOption {
  id: string;
  label: string;
  description: string;
  emoji: string;
  autonomyCeiling: number;
  interactionMode: string;
  driveSignals: Partial<ForgeDrives>;
}

export interface GoalChip {
  id: string;
  label: string;
  modules: string[];
  driveSignals: Partial<ForgeDrives>;
}

// ---------------------------------------------------------------------------
// Goal Chips (Q1)
// ---------------------------------------------------------------------------

export const GOAL_CHIPS: GoalChip[] = [
  {
    id: "close_deals",
    label: "Close deals faster",
    modules: ["contracts", "crm"],
    driveSignals: { dominance: 8, patience: 3 },
  },
  {
    id: "manage_contracts",
    label: "Manage contracts",
    modules: ["contracts", "documents"],
    driveSignals: { formality: 7, patience: 6 },
  },
  {
    id: "organize_team",
    label: "Organize my team",
    modules: ["tasks", "calendar"],
    driveSignals: { extraversion: 7, dominance: 6 },
  },
  {
    id: "track_projects",
    label: "Track projects",
    modules: ["tasks"],
    driveSignals: { formality: 6, patience: 7 },
  },
  {
    id: "store_documents",
    label: "Store & find documents",
    modules: ["documents"],
    driveSignals: { formality: 8, patience: 8 },
  },
];

// ---------------------------------------------------------------------------
// Autonomy Options (Q2)
// ---------------------------------------------------------------------------

export const AUTONOMY_OPTIONS: AutonomyOption[] = [
  {
    id: "full_auto",
    label: "Run things for me",
    description: "Otto handles tasks autonomously and notifies you of results",
    emoji: "🚀",
    autonomyCeiling: 0.9,
    interactionMode: "autonomous",
    driveSignals: { dominance: 9, formality: 2 },
  },
  {
    id: "draft_review",
    label: "Draft it, I'll review",
    description: "Otto prepares drafts and waits for your approval",
    emoji: "📝",
    autonomyCeiling: 0.65,
    interactionMode: "draft_then_review",
    driveSignals: { dominance: 6, formality: 5 },
  },
  {
    id: "assist",
    label: "Help me while I drive",
    description: "You lead, Otto assists with suggestions and research",
    emoji: "🎯",
    autonomyCeiling: 0.4,
    interactionMode: "collaborative",
    driveSignals: { dominance: 8, formality: 7 },
  },
  {
    id: "advisory",
    label: "Just a second opinion",
    description: "Otto only chimes in when you ask",
    emoji: "💡",
    autonomyCeiling: 0.2,
    interactionMode: "on_demand",
    driveSignals: { extraversion: 7, formality: 8 },
  },
];

// ---------------------------------------------------------------------------
// Mock PI Profiles (subset of 17 for display)
// ---------------------------------------------------------------------------

export const MOCK_PROFILES: ForgeProfile[] = [
  {
    id: "captain",
    name: "Captain",
    bio: "The natural-born leader with an articulate, authoritative voice.",
    drives: { dominance: 9, extraversion: 8, patience: 3, formality: 2 },
    metaArchetype: "driver",
    category: "Social",
    strengths: [
      "Delegation mastery",
      "Quick decision-making",
      "Fearless risk-taking",
    ],
    cautions: ["Authoritative presence", "Structure-resistant"],
  },
  {
    id: "maverick",
    name: "Maverick",
    bio: "The innovative risk-taker who thrives on variety and change.",
    drives: { dominance: 8, extraversion: 6, patience: 2, formality: 2 },
    metaArchetype: "driver",
    category: "Social",
    strengths: ["Innovation", "Adaptability", "Bold decision-making"],
    cautions: ["Impatient with routine", "May overlook details"],
  },
  {
    id: "strategist",
    name: "Strategist",
    bio: "The analytical planner who balances innovation with precision.",
    drives: { dominance: 7, extraversion: 4, patience: 5, formality: 6 },
    metaArchetype: "interpreter",
    category: "Analytical",
    strengths: [
      "Strategic thinking",
      "Data-driven decisions",
      "Long-term planning",
    ],
    cautions: ["Analysis paralysis", "Slow to act"],
  },
  {
    id: "guardian",
    name: "Guardian",
    bio: "The reliable backbone who ensures stability and compliance.",
    drives: { dominance: 3, extraversion: 3, patience: 8, formality: 9 },
    metaArchetype: "enforcer",
    category: "Stabilizing",
    strengths: ["Attention to detail", "Process adherence", "Risk mitigation"],
    cautions: ["Resistant to change", "Overly cautious"],
  },
  {
    id: "collaborator",
    name: "Collaborator",
    bio: "The team-oriented connector who builds consensus and harmony.",
    drives: { dominance: 4, extraversion: 8, patience: 7, formality: 4 },
    metaArchetype: "interpreter",
    category: "Social",
    strengths: ["Team building", "Conflict resolution", "Empathetic listening"],
    cautions: ["Avoids confrontation", "Slow to decide alone"],
  },
  {
    id: "analyzer",
    name: "Analyzer",
    bio: "The methodical expert who digs deep into data and systems.",
    drives: { dominance: 4, extraversion: 2, patience: 7, formality: 9 },
    metaArchetype: "enforcer",
    category: "Analytical",
    strengths: ["Deep analysis", "Quality focus", "Systematic approach"],
    cautions: ["Perfectionism", "Reluctant to delegate"],
  },
  {
    id: "promoter",
    name: "Promoter",
    bio: "The charismatic communicator who inspires action and enthusiasm.",
    drives: { dominance: 7, extraversion: 9, patience: 3, formality: 2 },
    metaArchetype: "driver",
    category: "Social",
    strengths: ["Persuasion", "Networking", "Energizing teams"],
    cautions: ["Overlooks follow-through", "Overpromises"],
  },
];

// ---------------------------------------------------------------------------
// Workspace Config Templates (per meta-archetype)
// ---------------------------------------------------------------------------

export const ARCHETYPE_WORKSPACE_CONFIGS: Record<
  MetaArchetype,
  ForgeWorkspaceConfig
> = {
  driver: {
    cognitiveMode: "visual",
    informationDensity: "low",
    interfaceStructure: "exploratory",
    updatePace: "alerts",
    explanationStyle: "summary_first",
  },
  enforcer: {
    cognitiveMode: "verbal_procedural",
    informationDensity: "high",
    interfaceStructure: "guided",
    updatePace: "batch",
    explanationStyle: "evidence_first",
  },
  interpreter: {
    cognitiveMode: "interactive",
    informationDensity: "medium",
    interfaceStructure: "guided_flexible",
    updatePace: "alerts",
    explanationStyle: "labeled",
  },
};

export const ARCHETYPE_OTTO_CONFIGS: Record<MetaArchetype, ForgeOttoConfig> = {
  driver: {
    defaultArchetype: "executor",
    autonomyCeiling: 0.75,
    interactionMode: "draft_then_review",
  },
  enforcer: {
    defaultArchetype: "guardian",
    autonomyCeiling: 0.4,
    interactionMode: "collaborative",
  },
  interpreter: {
    defaultArchetype: "connector",
    autonomyCeiling: 0.6,
    interactionMode: "collaborative",
  },
};

// ---------------------------------------------------------------------------
// Mock Skills (per meta-archetype)
// ---------------------------------------------------------------------------

export const ARCHETYPE_SKILLS: Record<MetaArchetype, ForgeSkill[]> = {
  driver: [
    {
      id: "lead-scoring",
      name: "Lead Scoring Engine",
      description: "Rank and prioritize leads",
      icon: "Target",
    },
    {
      id: "deal-velocity",
      name: "Deal Velocity Calculator",
      description: "Track deal pipeline speed",
      icon: "TrendingUp",
    },
    {
      id: "territory-mapper",
      name: "Territory Mapper",
      description: "Map and assign sales territories",
      icon: "Map",
    },
  ],
  enforcer: [
    {
      id: "compliance-checker",
      name: "Compliance Checker",
      description: "Verify regulatory compliance",
      icon: "Shield",
    },
    {
      id: "audit-trail",
      name: "Audit Trail Generator",
      description: "Generate compliance audit logs",
      icon: "FileCheck",
    },
    {
      id: "risk-scanner",
      name: "Risk Scanner",
      description: "Scan contracts for risk factors",
      icon: "AlertTriangle",
    },
  ],
  interpreter: [
    {
      id: "team-pulse",
      name: "Team Pulse",
      description: "Monitor team workload and sentiment",
      icon: "Heart",
    },
    {
      id: "meeting-prep",
      name: "Meeting Prep",
      description: "Auto-generate meeting agendas",
      icon: "Calendar",
    },
    {
      id: "stakeholder-map",
      name: "Stakeholder Map",
      description: "Visualize stakeholder relationships",
      icon: "Users",
    },
  ],
};

// ---------------------------------------------------------------------------
// Default Module Activations (per meta-archetype)
// ---------------------------------------------------------------------------

export const ARCHETYPE_MODULES: Record<MetaArchetype, string[]> = {
  driver: ["contracts", "crm"],
  enforcer: ["contracts", "documents"],
  interpreter: ["contracts", "tasks", "calendar"],
};

// ---------------------------------------------------------------------------
// Archetype Display Config
// ---------------------------------------------------------------------------

export const ARCHETYPE_DISPLAY: Record<
  MetaArchetype,
  {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    icon: string;
    description: string;
  }
> = {
  driver: {
    label: "Driver",
    color: "text-accent-primary",
    bgColor: "bg-accent-primary/10",
    borderColor: "border-accent-primary/30",
    icon: "Zap",
    description: "Fast-moving, results-oriented, action-first",
  },
  enforcer: {
    label: "Enforcer",
    color: "text-accent-secondary",
    bgColor: "bg-accent-secondary/10",
    borderColor: "border-accent-secondary/30",
    icon: "Shield",
    description: "Detail-oriented, process-driven, risk-aware",
  },
  interpreter: {
    label: "Interpreter",
    color: "text-accent-warning",
    bgColor: "bg-accent-warning/10",
    borderColor: "border-accent-warning/30",
    icon: "Compass",
    description: "People-focused, balanced, collaborative",
  },
};

// ---------------------------------------------------------------------------
// Conversation Script
// ---------------------------------------------------------------------------

export const FORGE_WELCOME: ForgeMessage = {
  id: "forge_welcome",
  role: "otto",
  content:
    "Welcome to the Workspace Forge. I'm Otto — I'll help configure your workspace based on how you work.\n\nLet's start with a simple question...",
  timestamp: new Date().toISOString(),
};

export const FORGE_Q1: ForgeMessage = {
  id: "forge_q1",
  role: "otto",
  content:
    "What are you here to accomplish? Pick what resonates, or tell me in your own words.",
  timestamp: new Date().toISOString(),
  interaction: "goal_chips",
};

export const FORGE_Q2: ForgeMessage = {
  id: "forge_q2",
  role: "otto",
  content: "Great choice. Now — how much should I handle on my own?",
  timestamp: new Date().toISOString(),
  interaction: "autonomy_cards",
};

export function createProfileResultMessage(
  profile: ForgeProfile,
): ForgeMessage {
  return {
    id: "forge_result",
    role: "otto",
    content: `Based on what you've told me, I see you as a **${profile.name}** — ${profile.bio.toLowerCase()}\n\nI've configured your workspace to match. Take a look at the preview and let me know if anything needs adjusting.`,
    timestamp: new Date().toISOString(),
    interaction: "profile_result",
  };
}

export const FORGE_LAUNCH_READY: ForgeMessage = {
  id: "forge_launch",
  role: "otto",
  content:
    "Everything look good? You can adjust modules, tweak your profile, or launch when you're ready.",
  timestamp: new Date().toISOString(),
  interaction: "launch_ready",
};

// ---------------------------------------------------------------------------
// Drive Inference Helper (mock — real inference is in API M2)
// ---------------------------------------------------------------------------

/**
 * Simple mock inference: merge drive signals from goal + autonomy selections.
 * Real inference engine uses Euclidean distance on DECF vectors.
 */
export function mockInferProfile(
  goalChipId: string | null,
  autonomyOptionId: string | null,
): { profile: ForgeProfile; drives: ForgeDrives; confidence: number } {
  const baseD = 5;
  const baseE = 5;
  const baseC = 5;
  const baseF = 5;

  const goal = GOAL_CHIPS.find((c) => c.id === goalChipId);
  const autonomy = AUTONOMY_OPTIONS.find((o) => o.id === autonomyOptionId);

  const d = Math.min(
    10,
    Math.max(
      1,
      (goal?.driveSignals.dominance ?? baseD) +
        (autonomy?.driveSignals.dominance
          ? autonomy.driveSignals.dominance - 5
          : 0),
    ),
  );
  const e = Math.min(
    10,
    Math.max(
      1,
      (goal?.driveSignals.extraversion ?? baseE) +
        (autonomy?.driveSignals.extraversion
          ? autonomy.driveSignals.extraversion - 5
          : 0),
    ),
  );
  const c = Math.min(
    10,
    Math.max(
      1,
      (goal?.driveSignals.patience ?? baseC) +
        (autonomy?.driveSignals.patience
          ? autonomy.driveSignals.patience - 5
          : 0),
    ),
  );
  const f = Math.min(
    10,
    Math.max(
      1,
      (goal?.driveSignals.formality ?? baseF) +
        (autonomy?.driveSignals.formality
          ? autonomy.driveSignals.formality - 5
          : 0),
    ),
  );

  const drives: ForgeDrives = {
    dominance: d,
    extraversion: e,
    patience: c,
    formality: f,
  };

  // Find closest profile by Euclidean distance
  let bestProfile = MOCK_PROFILES[0];
  let bestDistance = Infinity;

  for (const profile of MOCK_PROFILES) {
    const dist = Math.sqrt(
      (profile.drives.dominance - d) ** 2 +
        (profile.drives.extraversion - e) ** 2 +
        (profile.drives.patience - c) ** 2 +
        (profile.drives.formality - f) ** 2,
    );
    if (dist < bestDistance) {
      bestDistance = dist;
      bestProfile = profile;
    }
  }

  // Confidence based on distance (closer = higher confidence)
  const maxDist = Math.sqrt(4 * 81); // max possible distance in 4D (9^2 * 4)
  const confidence = Math.round((1 - bestDistance / maxDist) * 100) / 100;

  return {
    profile: bestProfile,
    drives,
    confidence: Math.max(0.6, confidence),
  };
}
