import { create } from "zustand";
import type { OttoMessage } from "@/lib/mock-otto";
import { OTTO_WELCOME, OTTO_MOCK_RESPONSES } from "@/lib/mock-otto";

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
}

function pickResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("summar")) return OTTO_MOCK_RESPONSES.summarize;
  if (lower.includes("risk") || lower.includes("analyz"))
    return OTTO_MOCK_RESPONSES.risks;
  if (lower.includes("overdue") || lower.includes("deadline"))
    return OTTO_MOCK_RESPONSES.overdue;
  if (lower.includes("draft") || lower.includes("response"))
    return OTTO_MOCK_RESPONSES.default;
  return OTTO_MOCK_RESPONSES.default;
}

export const useOttoStore = create<OttoState>((set, get) => ({
  messages: [OTTO_WELCOME],
  isStreaming: false,
  isDrawerOpen: false,
  vaultId: null,

  openDrawer: () => set({ isDrawerOpen: true }),
  closeDrawer: () => set({ isDrawerOpen: false }),
  toggleDrawer: () => set((s) => ({ isDrawerOpen: !s.isDrawerOpen })),

  sendMessage: (content) => {
    const userMsg: OttoMessage = {
      id: `msg_${++messageCounter}`,
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };

    set((s) => ({
      messages: [...s.messages, userMsg],
      isStreaming: true,
    }));

    // Simulate streaming response with word-by-word reveal
    const fullResponse = pickResponse(content);
    const words = fullResponse.split(" ");
    const assistantId = `msg_${++messageCounter}`;

    // Add empty assistant message
    setTimeout(() => {
      set((s) => ({
        messages: [
          ...s.messages,
          {
            id: assistantId,
            role: "assistant",
            content: "",
            timestamp: new Date().toISOString(),
          },
        ],
      }));

      // Stream words in
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
          set({ isStreaming: false });
        }
      }, 30);
    }, 500);
  },

  clearHistory: () => {
    set({ messages: [OTTO_WELCOME], isStreaming: false });
  },

  setVaultId: (id) => set({ vaultId: id }),
}));
