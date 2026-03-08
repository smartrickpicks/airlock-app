/**
 * MCP Consumer Configuration — airlock-app reads from these MCP servers.
 *
 * This repo is a CONSUMER ONLY — it reads from all MCP servers, writes to none
 * (except airlock-coordination for agent state).
 *
 * The actual MCP client transport is configured in .mcp.json at project root.
 * This file provides typed interfaces for what each source delivers, so app
 * code can reference MCP content with type safety.
 */

// ---------------------------------------------------------------------------
// Source definitions
// ---------------------------------------------------------------------------

export interface McpSource {
  /** GitHub repo name under smartrickpicks/ */
  repo: string;
  /** MCP access mode */
  mode: "read-only" | "read-write";
  /** What this source provides to airlock-app */
  provides: string[];
}

export const MCP_SOURCES = {
  docs: {
    repo: "airlock-docs",
    mode: "read-only",
    provides: [
      "specs/<module>/overview.md",
      "specs/start.md",
      "concepts/00-glossary.mdx",
      "registry/components.json",
      "registry/schema.json",
      "specs/security/*",
    ],
  },

  config: {
    repo: "airlock-config",
    mode: "read-only",
    provides: [
      "mcp-registry.json",
      "pack.json schema",
      "default-settings.json",
    ],
  },

  skills: {
    repo: "airlock-skills-library",
    mode: "read-only",
    provides: [
      "skills/*.md",
      "components/**/*.tsx",
      "templates/**/*",
      "moodboard/*",
    ],
  },

  playbooks: {
    repo: "airlock-playbooks",
    mode: "read-only",
    provides: [
      "deployment/*",
      "prospecting/*",
      "onboarding/*",
      "otto-workflows/*",
    ],
  },

  coordination: {
    repo: "airlock-coordination",
    mode: "read-write",
    provides: ["state.json", "locks/*", "sessions/*", "history/*"],
  },

  genUi: {
    repo: "airlock-gen-ui",
    mode: "read-write",
    provides: ["prompts/*", "configs/*", "generated/*"],
  },
} as const satisfies Record<string, McpSource>;

export type McpSourceName = keyof typeof MCP_SOURCES;

// ---------------------------------------------------------------------------
// Content resolution — the three-layer priority system
// ---------------------------------------------------------------------------

/**
 * Content resolves in priority order:
 *   1. User's custom content (per-workspace overrides)
 *   2. Installed marketplace packs (post-MVP, stubbed)
 *   3. Platform defaults (ships with every Airlock)
 *
 * For MVP: only layers 1 and 3 are active.
 */
export type ContentLayer = "custom" | "marketplace" | "platform";

export const CONTENT_RESOLUTION_ORDER: ContentLayer[] = [
  "custom",
  "marketplace",
  "platform",
];
