// ─── Types ───────────────────────────────────────────────────────────

import type { ChatEmbedData } from "@/components/molecules/ChatEmbed";

export type OttoMessageRole = "user" | "assistant" | "system";

export interface OttoMessage {
  id: string;
  role: OttoMessageRole;
  content: string;
  timestamp: string;
  embeds?: ChatEmbedData[];
}

export interface OttoSuggestion {
  id: string;
  label: string;
  prompt: string;
}

// ─── Mock Suggestions ────────────────────────────────────────────────

export const OTTO_SUGGESTIONS: OttoSuggestion[] = [
  {
    id: "sug_01",
    label: "Summarize this vault",
    prompt: "Summarize the key details and current status of this vault.",
  },
  {
    id: "sug_02",
    label: "Check for risks",
    prompt: "Analyze this contract for potential risks or missing clauses.",
  },
  {
    id: "sug_03",
    label: "Draft a response",
    prompt: "Draft a professional response to the latest counterparty request.",
  },
  {
    id: "sug_04",
    label: "What's overdue?",
    prompt:
      "Show me all overdue tasks and approaching deadlines across my vaults.",
  },
];

// ─── Mock Streaming Responses ────────────────────────────────────────

export const OTTO_MOCK_RESPONSES: Record<string, string> = {
  default:
    "I've analyzed the current context. Here's what I found:\n\n**Key Observations:**\n- The vault is currently in the Review chamber awaiting gatekeeper approval\n- Territory clause has a pending patch from the Builder\n- SLA deadline is approaching in 3 days\n\n**Recommended Actions:**\n1. Review the territory clause patch before the SLA expires\n2. Verify entity resolution matches with CRM records\n3. Schedule a follow-up with the counterparty for clause clarification\n\nWould you like me to elaborate on any of these points?",

  summarize:
    "**Vault Summary: Distribution Agreement -- Acme Records**\n\n**Chamber:** Review (Gate 3 of 4)\n**Health Score:** 72/100\n**Days in Current Chamber:** 5\n\n**Key Terms:**\n- Contract Type: Distribution Agreement\n- Territory: Worldwide\n- Term: 3 years with auto-renewal\n- Value: $2.4M annual minimum guarantee\n\n**Open Items:**\n- 1 pending patch (territory clause modification)\n- 2 unresolved tasks\n- Gatekeeper review required before Ship promotion\n\n**Risk Flags:**\n- Territory clause broader than standard template\n- Missing force majeure language in section 8.2",

  risks:
    "**Risk Analysis Complete**\n\nI've identified 3 potential issues:\n\n1. **Territory Scope (High)** -- The worldwide territory grant exceeds the standard regional template. Consider limiting to specific markets.\n\n2. **Missing Clause (Medium)** -- Section 8.2 lacks force majeure provisions. This is standard in distribution agreements of this scale.\n\n3. **SLA Pressure (Low)** -- The review gate SLA expires in 3 days. If the patch isn't resolved, an automatic escalation will trigger.\n\n**Recommendation:** Address items 1 and 2 before promoting to Ship chamber.",

  overdue:
    "**Overdue & Approaching Deadlines**\n\n**Overdue (2):**\n- Update royalty schedule -- Summit NDA (2 days overdue)\n- Verify entity match -- Horizon Media (1 day overdue)\n\n**Due This Week (3):**\n- Review territory clause -- Acme Distribution (3 days)\n- Complete onboarding checklist (4 days)\n- Contract Renewal -- Acme Records (10 days)\n\nWould you like me to prioritize these or reassign any tasks?",
};

// ─── Welcome Message ─────────────────────────────────────────────────

export const OTTO_WELCOME: OttoMessage = {
  id: "otto_welcome",
  role: "assistant",
  content:
    "Hi, I'm **Otto** -- your AI assistant for Airlock. I can help you analyze contracts, summarize vaults, identify risks, draft responses, and manage tasks.\n\nWhat would you like to work on?",
  timestamp: new Date().toISOString(),
};
