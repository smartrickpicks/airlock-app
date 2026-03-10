/**
 * AirlockWebSocket — real-time event client with auto-reconnect.
 *
 * Connects to ws://api/ws?token=JWT, subscribes to topics,
 * dispatches events to handlers. Falls back gracefully if unavailable.
 */

type EventHandler = (topic: string, event: Record<string, unknown>) => void;
type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "auth_expired";

interface WebSocketMessage {
  type: string;
  topic?: string;
  event?: Record<string, unknown>;
  connection_id?: string;
  user_id?: string;
  workspace_id?: string;
}

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 32000, 60000];
const MAX_RECONNECT_ATTEMPTS = 10;

// Close codes that indicate auth failure — do NOT reconnect
const AUTH_FAILURE_CODES = new Set([4001, 4003, 4401]);

export class AirlockWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string;
  private _status: ConnectionStatus = "disconnected";
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private handlers = new Map<string, Set<EventHandler>>();
  private subscriptions = new Set<string>();
  private statusListeners = new Set<(status: ConnectionStatus) => void>();

  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.setStatus("connecting");

    try {
      this.ws = new WebSocket(`${this.url}?token=${this.token}`);

      this.ws.onopen = () => {
        this.setStatus("connected");
        this.reconnectAttempt = 0;

        // Re-subscribe to all topics after reconnect
        Array.from(this.subscriptions).forEach((topic) => {
          this.ws?.send(JSON.stringify({ type: "subscribe", topic }));
        });
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data as string) as WebSocketMessage;
          this.handleMessage(msg);
        } catch {
          // Ignore malformed messages
        }
      };

      this.ws.onclose = (event: CloseEvent) => {
        this.ws = null;
        if (AUTH_FAILURE_CODES.has(event.code)) {
          this.setStatus("auth_expired");
          return;
        }
        if (
          this._status !== "disconnected" &&
          this._status !== "auth_expired"
        ) {
          this.attemptReconnect();
        }
      };

      this.ws.onerror = () => {
        // onclose will fire after onerror
      };
    } catch {
      this.attemptReconnect();
    }
  }

  disconnect(): void {
    this.setStatus("disconnected");
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      // Clear handlers before close to prevent stale onclose from firing
      this.ws.onclose = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.close();
      this.ws = null;
    }
  }

  subscribe(topic: string): void {
    this.subscriptions.add(topic);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "subscribe", topic }));
    }
  }

  unsubscribe(topic: string): void {
    this.subscriptions.delete(topic);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "unsubscribe", topic }));
    }
  }

  onEvent(topic: string, handler: EventHandler): () => void {
    if (!this.handlers.has(topic)) {
      this.handlers.set(topic, new Set());
    }
    this.handlers.get(topic)!.add(handler);

    return () => {
      this.handlers.get(topic)?.delete(handler);
    };
  }

  onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  getStatus(): ConnectionStatus {
    return this._status;
  }

  private handleMessage(msg: WebSocketMessage): void {
    if (msg.type === "event" && msg.topic && msg.event) {
      // Dispatch to exact topic handlers
      const handlers = this.handlers.get(msg.topic);
      if (handlers) {
        handlers.forEach((h) => h(msg.topic!, msg.event!));
      }

      // Dispatch to wildcard handlers
      if (msg.topic.includes(":")) {
        const wildcard = msg.topic.split(":")[0] + ":*";
        const wildcardHandlers = this.handlers.get(wildcard);
        if (wildcardHandlers) {
          wildcardHandlers.forEach((h) => h(msg.topic!, msg.event!));
        }
      }

      // Dispatch to global handler
      const globalHandlers = this.handlers.get("*");
      if (globalHandlers) {
        globalHandlers.forEach((h) => h(msg.topic!, msg.event!));
      }
    }

    if (msg.type === "ping") {
      this.ws?.send(JSON.stringify({ type: "pong" }));
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
      this.setStatus("disconnected");
      return;
    }

    this.setStatus("reconnecting");
    const delay =
      RECONNECT_DELAYS[
        Math.min(this.reconnectAttempt, RECONNECT_DELAYS.length - 1)
      ];
    this.reconnectAttempt++;

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private setStatus(status: ConnectionStatus): void {
    this._status = status;
    this.statusListeners.forEach((l) => l(status));
  }
}

// Singleton instance (lazy)
let _instance: AirlockWebSocket | null = null;

/**
 * Get or create the WebSocket singleton.
 * Reads token from localStorage on creation; call reconnectWithToken()
 * after a JWT refresh to swap credentials without losing subscriptions.
 */
export function getWebSocket(): AirlockWebSocket {
  if (!_instance) {
    const wsUrl =
      typeof window !== "undefined"
        ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws`
        : "ws://localhost:8000/ws";
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("airlock_access_token") || "dev_mock_token"
        : "dev_mock_token";
    _instance = new AirlockWebSocket(wsUrl, token);
  }
  return _instance;
}

/**
 * Reconnect with a fresh token (call after JWT refresh).
 * Preserves all topic subscriptions — they re-subscribe on open.
 */
export function reconnectWithToken(newToken: string): void {
  if (_instance) {
    _instance.disconnect();
    _instance = null;
  }
  const wsUrl =
    typeof window !== "undefined"
      ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws`
      : "ws://localhost:8000/ws";
  _instance = new AirlockWebSocket(wsUrl, newToken);
  _instance.connect();
}
