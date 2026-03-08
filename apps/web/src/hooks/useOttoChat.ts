"use client";

import { useState, useCallback, useRef } from "react";
import { useCapabilityTreeStore } from "@/stores/capability-tree.store";

interface OttoMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface UseOttoChatOptions {
  vaultId?: string;
  surface?: "task_runner" | "messenger";
  onNodeAdvance?: (
    from: number,
    to: number,
    node: Record<string, unknown>,
  ) => void;
  onSignalPush?: (module: string, signal: Record<string, unknown>) => void;
  onToolStart?: (toolName: string) => void;
}

/**
 * useOttoChat — connects to Otto SSE endpoint with mock fallback.
 *
 * Reads AI provider config from the capability tree store and sends it
 * with each request so the backend uses the configured provider/model.
 */
export function useOttoChat({
  vaultId,
  surface = "task_runner",
  onNodeAdvance,
  onSignalPush,
  onToolStart,
}: UseOttoChatOptions = {}) {
  const [messages, setMessages] = useState<OttoMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const counterRef = useRef(0);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      const userMsg: OttoMessage = {
        id: `msg_${++counterRef.current}`,
        role: "user",
        content,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setError(null);

      const assistantId = `msg_${++counterRef.current}`;

      // Add empty assistant message for streaming
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          timestamp: new Date().toISOString(),
        },
      ]);

      try {
        const endpoint = vaultId
          ? `/api/v3/vaults/${vaultId}/otto/chat`
          : `/api/v3/otto/chat`;

        if (!vaultId && surface === "task_runner") {
          throw new Error("No vault context for task runner");
        }

        abortRef.current = new AbortController();

        // Read AI provider config from capability tree store
        const aiConfig = useCapabilityTreeStore.getState().nodeConfigs[
          "ai_provider"
        ] as { provider?: string; apiKey?: string; model?: string } | undefined;

        const body: Record<string, unknown> = { message: content };
        body.surface = surface;
        if (aiConfig?.apiKey) {
          body.provider_config = {
            provider: aiConfig.provider ?? "Anthropic",
            api_key: aiConfig.apiKey,
            model: aiConfig.model ?? "claude-sonnet-4-6",
          };
        }

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer dev_mock_token",
          },
          body: JSON.stringify(body),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

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
            // Parse Vercel AI SDK wire format
            if (line.startsWith("0:")) {
              try {
                const token = JSON.parse(line.slice(2)) as string;
                accumulated += token;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: accumulated } : m,
                  ),
                );
              } catch {
                // Skip malformed tokens
              }
            }
            if (line.startsWith("9:")) {
              try {
                const data = JSON.parse(line.slice(2));
                onNodeAdvance?.(data.from, data.to, data.node);
              } catch {
                // Skip malformed node advance
              }
            }
            if (line.startsWith("a:")) {
              try {
                const data = JSON.parse(line.slice(2));
                onSignalPush?.(data.module, data.signal);
              } catch {
                // Skip malformed signal push
              }
            }
            if (line.startsWith("b:")) {
              try {
                const data = JSON.parse(line.slice(2));
                onToolStart?.(data.tool);
              } catch {
                // Skip malformed tool start
              }
            }
            if (line.startsWith("d:")) {
              break;
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        console.warn("Otto SSE unavailable, using mock fallback:", err);
        const { OTTO_MOCK_RESPONSES } = await import("@/lib/mock-otto");
        const lower = content.toLowerCase();
        let mockResponse = OTTO_MOCK_RESPONSES.default;
        if (lower.includes("summar"))
          mockResponse = OTTO_MOCK_RESPONSES.summarize;
        else if (lower.includes("risk"))
          mockResponse = OTTO_MOCK_RESPONSES.risks;
        else if (lower.includes("overdue"))
          mockResponse = OTTO_MOCK_RESPONSES.overdue;

        // Simulate word-by-word streaming
        const words = mockResponse.split(" ");
        for (let i = 0; i < words.length; i++) {
          const partial = words.slice(0, i + 1).join(" ");
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: partial } : m,
            ),
          );
          await new Promise((r) => setTimeout(r, 20));
        }
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [vaultId, surface, isLoading, onNodeAdvance, onSignalPush, onToolStart],
  );

  const clearHistory = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearHistory,
    stop,
  };
}
