import { create } from "zustand";
import type { OttoMessage } from "@/lib/mock-otto";
import { OTTO_WELCOME, OTTO_MOCK_RESPONSES } from "@/lib/mock-otto";
import { useCapabilityTreeStore } from "@/stores/capability-tree.store";

let messageCounter = 0;

interface OttoState {
  messages: OttoMessage[];
  isStreaming: boolean;
  isDrawerOpen: boolean;
  vaultId: string | null;

  // Actions
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  sendMessage: (content: string) => void;
  clearHistory: () => void;
  setVaultId: (id: string) => void;
  stop: () => void;
}

/** Pick a canned response when no API is available. */
function pickResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("summar")) return OTTO_MOCK_RESPONSES.summarize;
  if (lower.includes("risk") || lower.includes("analyz"))
    return OTTO_MOCK_RESPONSES.risks;
  if (lower.includes("overdue") || lower.includes("deadline"))
    return OTTO_MOCK_RESPONSES.overdue;
  return OTTO_MOCK_RESPONSES.default;
}

/** Simulate word-by-word streaming of a mock response. */
function streamMock(
  content: string,
  assistantId: string,
  set: (fn: (s: OttoState) => Partial<OttoState>) => void,
) {
  const fullResponse = pickResponse(content);
  const words = fullResponse.split(" ");
  let wordIndex = 0;
  const interval = setInterval(() => {
    wordIndex++;
    const partial = words.slice(0, wordIndex).join(" ");
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === assistantId ? { ...m, content: partial } : m,
      ),
    }));
    if (wordIndex >= words.length) {
      clearInterval(interval);
      set(() => ({ isStreaming: false }));
    }
  }, 30);
}

// Track the current AbortController for SSE cancellation
let currentAbort: AbortController | null = null;

export const useOttoStore = create<OttoState>((set, get) => ({
  messages: [OTTO_WELCOME],
  isStreaming: false,
  isDrawerOpen: false,
  vaultId: null,

  openDrawer: () => set({ isDrawerOpen: true }),
  closeDrawer: () => set({ isDrawerOpen: false }),
  toggleDrawer: () => set((s) => ({ isDrawerOpen: !s.isDrawerOpen })),

  stop: () => {
    currentAbort?.abort();
    currentAbort = null;
    set({ isStreaming: false });
  },

  sendMessage: (content) => {
    const userMsg: OttoMessage = {
      id: `msg_${++messageCounter}`,
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };

    const assistantId = `msg_${++messageCounter}`;

    set((s) => ({
      messages: [
        ...s.messages,
        userMsg,
        {
          id: assistantId,
          role: "assistant" as const,
          content: "",
          timestamp: new Date().toISOString(),
        },
      ],
      isStreaming: true,
    }));

    const { vaultId } = get();

    // Read AI provider config from capability tree
    const aiConfig = useCapabilityTreeStore.getState().nodeConfigs[
      "ai_provider"
    ] as { provider?: string; apiKey?: string; model?: string } | undefined;

    // If no API key configured at all, go straight to mock
    if (!aiConfig?.apiKey) {
      setTimeout(() => streamMock(content, assistantId, set), 300);
      return;
    }

    // Try real SSE endpoint — vault-scoped or general
    const abort = new AbortController();
    currentAbort = abort;

    const body: Record<string, unknown> = {
      message: content,
      provider_config: {
        provider: aiConfig.provider ?? "Anthropic",
        api_key: aiConfig.apiKey,
        model: aiConfig.model ?? "claude-sonnet-4-6",
      },
    };

    const endpoint = vaultId
      ? `/api/v3/vaults/${vaultId}/otto/chat`
      : `/api/v3/otto/chat`;

    fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer dev_mock_token",
      },
      body: JSON.stringify(body),
      signal: abort.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let accumulated = "";

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n").filter((l: string) => l.trim());

          for (const line of lines) {
            // Vercel AI SDK wire format: 0: text, d: done
            if (line.startsWith("0:")) {
              try {
                const token = JSON.parse(line.slice(2)) as string;
                accumulated += token;
                set((s) => ({
                  messages: s.messages.map((m) =>
                    m.id === assistantId ? { ...m, content: accumulated } : m,
                  ),
                }));
              } catch {
                // Skip malformed tokens
              }
            }
          }
        }

        set({ isStreaming: false });
        currentAbort = null;
      })
      .catch((err) => {
        if (err instanceof Error && err.name === "AbortError") return;

        // Show connection error instead of canned mock
        console.warn("Otto SSE unavailable:", err);
        const errorMsg =
          "**Unable to reach Otto API**\n\n" +
          "The backend server isn't responding. Make sure the API is running:\n" +
          "```\ncd apps/api && uvicorn src.main:app --reload\n```\n\n" +
          `*Error: ${err instanceof Error ? err.message : "Connection failed"}*`;
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === assistantId ? { ...m, content: errorMsg } : m,
          ),
          isStreaming: false,
        }));
        currentAbort = null;
      });
  },

  clearHistory: () => {
    currentAbort?.abort();
    currentAbort = null;
    set({ messages: [OTTO_WELCOME], isStreaming: false });
  },

  setVaultId: (id) => set({ vaultId: id }),
}));
