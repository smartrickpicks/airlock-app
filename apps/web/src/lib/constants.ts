/**
 * Canonical vocabulary and constants for the Airlock platform.
 * Source of truth: docs/concepts/00-glossary.mdx
 */

/** Module definitions — top-level functional domains */
export const MODULES = {
  contracts: { label: "Contracts", icon: "FileText", path: "/contracts" },
  crm: { label: "CRM", icon: "Users", path: "/crm" },
  tasks: { label: "Tasks", icon: "CheckSquare", path: "/tasks" },
  calendar: { label: "Calendar", icon: "Calendar", path: "/calendar" },
  documents: { label: "Documents", icon: "File", path: "/documents" },
} as const;

/** Chamber definitions — lifecycle stages */
export const CHAMBERS = {
  discover: { label: "Discover", color: "var(--chamber-discover)", order: 0 },
  build: { label: "Build", color: "var(--chamber-build)", order: 1 },
  review: { label: "Review", color: "var(--chamber-review)", order: 2 },
  ship: { label: "Ship", color: "var(--chamber-ship)", order: 3 },
} as const;

/** Role definitions */
export const ROLES = {
  builder: {
    label: "Builder",
    chambers: ["discover", "build"],
    description: "Drafts, assembles vault content",
  },
  gatekeeper: {
    label: "Gatekeeper",
    chambers: ["review"],
    description: "Reviews, approves vault content",
  },
  owner: {
    label: "Owner",
    chambers: ["ship"],
    description: "Promotes, publishes vault content",
  },
  designer: {
    label: "Designer",
    chambers: [],
    description: "Configures module templates and rules",
  },
  viewer: {
    label: "Viewer",
    chambers: [],
    description: "Read-only access to vault data",
  },
} as const;

/** Triptych panel names */
export const TRIPTYCH_PANELS = {
  signal: "Signal",
  orchestrate: "Orchestrate",
  control: "Control",
} as const;

export type ModuleName = keyof typeof MODULES;
export type ChamberName = keyof typeof CHAMBERS;
export type RoleName = keyof typeof ROLES;
