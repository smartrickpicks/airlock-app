"use client";

import { useEffect, useRef } from "react";
import { getWebSocket } from "@/lib/websocket";

/**
 * useRealtimeEvents — subscribe to a WebSocket topic and handle events.
 *
 * Subscribes on mount, unsubscribes on unmount.
 * Auto-reconnects via AirlockWebSocket.
 */
export function useRealtimeEvents(
  topic: string | null,
  handler: (topic: string, event: Record<string, unknown>) => void,
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!topic) return;

    const ws = getWebSocket();

    // Ensure connected
    if (ws.getStatus() === "disconnected") {
      ws.connect();
    }

    // Subscribe to topic
    ws.subscribe(topic);

    // Register handler
    const unsubscribe = ws.onEvent(topic, (t, e) => {
      handlerRef.current(t, e);
    });

    return () => {
      unsubscribe();
      ws.unsubscribe(topic);
    };
  }, [topic]);
}
