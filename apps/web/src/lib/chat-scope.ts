/**
 * Conversation scoping for Otto chat surfaces.
 *
 * Each chat surface pulls different MAGS context:
 * - vault:    Scoped to a single vault — gets vault record, events, patches, gate status
 * - play:     Scoped to a playbook execution — gets playbook nodes, progress, assignments
 * - dispatch: Workspace-level — gets cross-module signals, triage items, calendar deadlines
 * - forge:    Onboarding/config — gets workspace setup, capability tree, team roster
 */

export type ChatScope = "vault" | "play" | "dispatch" | "forge";

export interface ChatContext {
  scope: ChatScope;
  /** Vault ID when scope is "vault" */
  vaultId?: string;
  /** Playbook ID when scope is "play" */
  playbookId?: string;
  /** Current chamber (vault/play scopes) */
  chamber?: "discover" | "build" | "review" | "ship";
  /** Current module context */
  module?: string;
  /** Workspace ID (always present) */
  workspaceId?: string;
}

/** Build context label for the ChatInput context indicator. */
export function formatContextLabel(ctx: ChatContext): string {
  switch (ctx.scope) {
    case "vault":
      return [ctx.module, ctx.vaultId, ctx.chamber]
        .filter(Boolean)
        .join(" \u00B7 ");
    case "play":
      return ["Playbook", ctx.playbookId, ctx.chamber]
        .filter(Boolean)
        .join(" \u00B7 ");
    case "dispatch":
      return "Dispatch \u00B7 Workspace";
    case "forge":
      return "Forge \u00B7 Configuration";
    default:
      return "";
  }
}

/** Build the API endpoint based on scope. */
export function getChatEndpoint(ctx: ChatContext): string {
  switch (ctx.scope) {
    case "vault":
      return ctx.vaultId
        ? `/api/v3/vaults/${ctx.vaultId}/otto/chat`
        : "/api/v3/otto/chat";
    case "play":
      return ctx.playbookId
        ? `/api/v3/playbooks/${ctx.playbookId}/otto/chat`
        : "/api/v3/otto/chat";
    case "dispatch":
      return "/api/v3/otto/chat?scope=dispatch";
    case "forge":
      return "/api/v3/otto/chat?scope=forge";
    default:
      return "/api/v3/otto/chat";
  }
}

/** Default scopes for each chat surface. */
export const DEFAULT_CONTEXTS: Record<ChatScope, Partial<ChatContext>> = {
  vault: { scope: "vault" },
  play: { scope: "play" },
  dispatch: { scope: "dispatch" },
  forge: { scope: "forge" },
};
