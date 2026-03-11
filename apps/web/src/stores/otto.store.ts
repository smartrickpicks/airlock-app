import { create } from "zustand";
import type { OttoMessage } from "@/lib/mock-otto";
import { OTTO_WELCOME, OTTO_MOCK_RESPONSES } from "@/lib/mock-otto";
import { useCapabilityTreeStore } from "@/stores/capability-tree.store";

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("airlock_access_token");
}

let messageCounter = 0;

export const PERSONA_MODES = [
  { value: null, label: "Auto" },
  { value: "analyst", label: "Analyst" },
  { value: "executor", label: "Executor" },
  { value: "guardian", label: "Guardian" },
  { value: "strategist", label: "Strategist" },
  { value: "connector", label: "Connector" },
  { value: "architect", label: "Architect" },
] as const;

interface OttoState {
  messages: OttoMessage[];
  isStreaming: boolean;
  isDrawerOpen: boolean;
  vaultId: string | null;
  personaMode: string | null;

  // --- Messenger (shell-level, persistent Otto) ---
  messengerMessages: OttoMessage[];
  messengerSessionId: string | null;
  isMessengerOpen: boolean;
  isMessengerStreaming: boolean;
  unreadCount: number;

  // Actions
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  sendMessage: (content: string) => void;
  clearHistory: () => void;
  setVaultId: (id: string) => void;
  setPersonaMode: (mode: string | null) => void;
  stop: () => void;

  // --- Messenger Actions ---
  toggleMessenger: () => void;
  sendMessengerMessage: (content: string) => void;
  clearMessengerHistory: () => void;
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
  target: "taskRunner" | "messenger" = "taskRunner",
) {
  const fullResponse = pickResponse(content);
  const words = fullResponse.split(" ");
  let wordIndex = 0;
  const messagesKey = target === "messenger" ? "messengerMessages" : "messages";
  const interval = setInterval(() => {
    wordIndex++;
    const partial = words.slice(0, wordIndex).join(" ");
    set((s) => ({
      [messagesKey]: (s[messagesKey] as OttoMessage[]).map((m) =>
        m.id === assistantId ? { ...m, content: partial } : m,
      ),
    }));
    if (wordIndex >= words.length) {
      clearInterval(interval);
      const streamingKey =
        target === "messenger" ? "isMessengerStreaming" : "isStreaming";
      set(() => ({ [streamingKey]: false }));
    }
  }, 30);
}

// Separate abort controllers per surface — prevents cross-surface interference
let drawerAbort: AbortController | null = null;
let messengerAbort: AbortController | null = null;

export const useOttoStore = create<OttoState>((set, get) => ({
  messages: [OTTO_WELCOME],
  isStreaming: false,
  isDrawerOpen: false,
  vaultId: null,
  personaMode: null,

  // Messenger state
  messengerMessages: [],
  messengerSessionId: null,
  isMessengerOpen: false,
  isMessengerStreaming: false,
  unreadCount: 0,

  openDrawer: () => set({ isDrawerOpen: true }),
  closeDrawer: () => set({ isDrawerOpen: false }),
  toggleDrawer: () => set((s) => ({ isDrawerOpen: !s.isDrawerOpen })),

  stop: () => {
    drawerAbort?.abort();
    drawerAbort = null;
    set({ isStreaming: false });
  },

  sendMessage: (content) => {
    if (get().isStreaming) return; // Prevent concurrent requests

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

    const { vaultId, personaMode } = get();

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
    drawerAbort = abort;

    const body: Record<string, unknown> = {
      message: content,
      ...(personaMode && { persona_mode: personaMode }),
      provider_config: {
        provider: aiConfig.provider ?? "Anthropic",
        api_key: aiConfig.apiKey,
        model: aiConfig.model ?? "claude-sonnet-4-6",
      },
    };

    const endpoint = vaultId
      ? `/api/v3/vaults/${vaultId}/otto/chat`
      : `/api/v3/otto/chat`;

    const token = getAuthToken();
    fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
        drawerAbort = null;
      })
      .catch((err) => {
        if (err instanceof Error && err.name === "AbortError") {
          set({ isStreaming: false });
          drawerAbort = null;
          return;
        }

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
        drawerAbort = null;
      });
  },

  clearHistory: () => {
    drawerAbort?.abort();
    drawerAbort = null;
    set({ messages: [OTTO_WELCOME], isStreaming: false });
  },

  setVaultId: (id) => set({ vaultId: id }),
  setPersonaMode: (mode) => set({ personaMode: mode }),

  // --- Messenger Actions ---

  toggleMessenger: () =>
    set((s) => ({
      isMessengerOpen: !s.isMessengerOpen,
      unreadCount: s.isMessengerOpen ? s.unreadCount : 0,
    })),

  clearMessengerHistory: () =>
    set({ messengerMessages: [], messengerSessionId: null }),

  sendMessengerMessage: (content) => {
    if (get().isMessengerStreaming) return; // Prevent concurrent requests

    const userMsg: OttoMessage = {
      id: `msg_${++messageCounter}`,
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };

    const assistantId = `msg_${++messageCounter}`;

    set((s) => ({
      messengerMessages: [
        ...s.messengerMessages,
        userMsg,
        {
          id: assistantId,
          role: "assistant" as const,
          content: "",
          timestamp: new Date().toISOString(),
        },
      ],
      isMessengerStreaming: true,
    }));

    const aiConfig = useCapabilityTreeStore.getState().nodeConfigs[
      "ai_provider"
    ] as { provider?: string; apiKey?: string; model?: string } | undefined;

    if (!aiConfig?.apiKey) {
      setTimeout(() => streamMock(content, assistantId, set, "messenger"), 300);
      return;
    }

    const abort = new AbortController();
    messengerAbort = abort;

    const { personaMode: messengerPersona } = get();
    const body: Record<string, unknown> = {
      message: content,
      surface: "messenger",
      ...(messengerPersona && { persona_mode: messengerPersona }),
      provider_config: {
        provider: aiConfig.provider ?? "Anthropic",
        api_key: aiConfig.apiKey,
        model: aiConfig.model ?? "claude-sonnet-4-6",
      },
    };

    const messengerToken = getAuthToken();
    fetch("/api/v3/otto/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(messengerToken
          ? { Authorization: `Bearer ${messengerToken}` }
          : {}),
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
            if (line.startsWith("0:")) {
              try {
                const token = JSON.parse(line.slice(2)) as string;
                accumulated += token;
                set((s) => ({
                  messengerMessages: s.messengerMessages.map((m) =>
                    m.id === assistantId ? { ...m, content: accumulated } : m,
                  ),
                }));
              } catch {
                /* skip malformed */
              }
            }
          }
        }
        set((s) => ({
          isMessengerStreaming: false,
          unreadCount: s.isMessengerOpen ? s.unreadCount : s.unreadCount + 1,
        }));
        messengerAbort = null;
      })
      .catch((err) => {
        if (err instanceof Error && err.name === "AbortError") {
          set({ isMessengerStreaming: false });
          messengerAbort = null;
          return;
        }
        console.warn("Otto messenger SSE unavailable:", err);
        const errorMsg =
          "**Unable to reach Otto API**\n\n" +
          "The backend server isn't responding. Make sure the API is running:\n" +
          "```\ncd apps/api && uvicorn src.main:app --reload\n```";
        set((s) => ({
          messengerMessages: s.messengerMessages.map((m) =>
            m.id === assistantId ? { ...m, content: errorMsg } : m,
          ),
          isMessengerStreaming: false,
        }));
        messengerAbort = null;
      });
  },
}));
