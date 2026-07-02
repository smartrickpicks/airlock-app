# Realtime Chat Integration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire the Unified Chat (`/api/chat/`) into the existing WebSocket infrastructure so messages, typing indicators, reactions, and read receipts are pushed in real-time.

**Architecture:** No new tables, no new dependencies, no refactors. Connect existing pipes: chat routes → `emit_event()` → `ConnectionManager` → `AirlockWebSocket` → `messenger.store.ts`. Otto SSE responses get bridged to WebSocket for multi-participant visibility.

**Tech Stack:** FastAPI, WebSocket, Redis pub/sub, Zustand, `AirlockWebSocket` singleton

**Source Spec:** `airlock-docs/specs/shell/realtime-chat-integration.md`

---

## Current State

### What exists:

- **Backend:** `ConnectionManager` (topic-based broadcast), `emit_event()` (WS + Redis pub/sub), `emitter.py`, topic validation in `topics.py`
- **Frontend:** `AirlockWebSocket` singleton with auto-reconnect, wildcard handler (`prefix:*`), `useRealtimeStore` with `connectReal()`
- **Chat routes** already call `emit_event()` for messages and reactions, but use `messenger:{id}` prefix (old) and have minimal payloads
- **ShellLayout** already wires `messenger:*` events to `handleIncomingMessage` and subscribes to `messenger:{conv.id}` per conversation

### What's missing:

- `chat` prefix not registered in topic validator
- Event payloads lack enriched sender info (name, avatar)
- No typing indicator endpoint or events
- No read receipt broadcasts
- No `initRealtimeHandlers()` in the store — event wiring is scattered in ShellLayout
- No Otto SSE → WebSocket bridge
- Frontend subscribes to `messenger:` topics, not `chat:` topics

---

## Phase 1 — Backend Event Emission

### Task 1: Register `chat` topic prefix + add typing endpoint

**Files:**

- Modify: `apps/api/src/realtime/topics.py`
- Modify: `apps/api/src/chat/routes.py`

**Step 1: Add `chat` to VALID_PREFIXES**

In `apps/api/src/realtime/topics.py`, add `"chat"` to `VALID_PREFIXES`:

```python
VALID_PREFIXES = {
    "vault",
    "view",
    "module",
    "workspace",
    "user",
    "notifications",
    "presence",
    "messenger",
    "chat",
}
```

**Step 2: Add typing indicator endpoint to chat routes**

In `apps/api/src/chat/routes.py`, add this endpoint (after the existing endpoints, before `/gifs/`):

```python
@router.post("/conversations/{conversation_id}/typing")
async def send_typing_indicator(
    conversation_id: str,
    user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Broadcast typing indicator — fire-and-forget, no persistence."""
    await emit_event(
        f"chat:{conversation_id}:typing",
        {
            "event_type": "typing.start",
            "user_id": user["sub"],
            "user_name": user.get("display_name", "Unknown"),
            "conversation_id": conversation_id,
        },
    )
    return {"ok": True}
```

**Step 3: Verify**

Run: `cd apps/api && source .venv/bin/activate && ruff check src/realtime/topics.py src/chat/routes.py`

**Step 4: Commit**

```bash
git add apps/api/src/realtime/topics.py apps/api/src/chat/routes.py
git commit -m "feat(api): register chat topic prefix + add typing indicator endpoint"
```

---

### Task 2: Enrich event payloads in chat routes — switch to `chat:` prefix

**File:** `apps/api/src/chat/routes.py`

All existing `emit_event` calls use `messenger:{id}` prefix. Switch to `chat:{id}` and enrich payloads with sender info.

**Step 1: Update `post_message` event emission**

Change lines 121-124 from:

```python
    await emit_event(
        f"messenger:{conversation_id}",
        {"event_type": "message.sent", "message": msg},
    )
```

To:

```python
    await emit_event(
        f"chat:{conversation_id}",
        {"event_type": "message.sent", "message": msg},
    )
```

The `msg` dict already contains `authorId`, `authorName`, `content`, `messageType`, `gifUrl`, etc. from the service layer — the payload is already enriched.

**Step 2: Update `add_message_reaction` event emission**

Change lines 158-165 from `f"messenger:{msg.conversation_id}"` to `f"chat:{msg.conversation_id}:reactions"`.

Also add `user_id` and `user_name` to the reaction payload:

```python
    await emit_event(
        f"chat:{msg.conversation_id}:reactions",
        {
            "event_type": "reaction.added",
            "message_id": message_id,
            "reaction": result,
            "user_id": user["sub"],
            "user_name": user.get("display_name", "Unknown"),
        },
    )
```

**Step 3: Add emission to `remove_message_reaction`**

After the `remove_reaction` call succeeds, emit:

```python
    # Look up conversation_id for broadcast
    from src.messenger.models import Message as MessageModel

    msg = db.query(MessageModel).filter(MessageModel.id == message_id).first()
    if msg:
        await emit_event(
            f"chat:{msg.conversation_id}:reactions",
            {
                "event_type": "reaction.removed",
                "message_id": message_id,
                "user_id": user["sub"],
                "emoji": emoji,
            },
        )
```

**Step 4: Add read receipt emission to `mark_read`**

After `mark_message_read` succeeds, emit:

```python
    await emit_event(
        f"chat:{conversation_id}:read",
        {
            "event_type": "read_receipt",
            "user_id": user["sub"],
            "user_name": user.get("display_name", "Unknown"),
            "message_id": message_id,
        },
    )
```

**Step 5: Verify + commit**

```bash
cd apps/api && source .venv/bin/activate && ruff check src/chat/routes.py && ruff format --check src/chat/routes.py
git add apps/api/src/chat/routes.py
git commit -m "feat(api): enrich chat event payloads, switch to chat: topic prefix"
```

---

## Phase 2 — Frontend Subscription Wiring

### Task 3: Add `initRealtimeHandlers()` to messenger store

**File:** `apps/web/src/stores/messenger.store.ts`

Add a new store action that sets up all WebSocket event handlers in one place. This replaces the scattered wiring in ShellLayout.

**Step 1: Add `initRealtimeHandlers` to the interface**

```typescript
initRealtimeHandlers: () => void;
sendTypingIndicator: (conversationId: string) => void;
```

**Step 2: Implement `initRealtimeHandlers`**

At the top of the file, add the import:

```typescript
import { getWebSocket } from "@/lib/websocket";
```

In the store implementation:

```typescript
initRealtimeHandlers: () => {
    let ws: ReturnType<typeof getWebSocket>;
    try {
        ws = getWebSocket();
    } catch {
        return; // WebSocket unavailable (SSR or mock mode)
    }

    // Messages — listen on chat:* wildcard
    ws.onEvent("chat:*", (topic: string, event: Record<string, unknown>) => {
        // Skip sub-topics (typing, reactions, read)
        const parts = topic.split(":");
        if (parts.length > 2) return;

        const conversationId = parts[1];

        if (event.event_type === "message.sent" && event.message) {
            const msg = event.message as Message;
            // Skip if we sent it (optimistic update already applied)
            if (msg.authorId === "user_self") return;
            get().handleIncomingMessage(conversationId, msg);
        }
    });

    // Typing indicators
    ws.onEvent("chat:*", (topic: string, event: Record<string, unknown>) => {
        if (!topic.includes(":typing")) return;
        const conversationId = topic.split(":")[1];
        const userName = event.user_name as string;
        if (!userName) return;

        set((s) => ({
            typingUsers: {
                ...s.typingUsers,
                [conversationId]: [
                    ...(s.typingUsers[conversationId] || []).filter((n) => n !== userName),
                    userName,
                ],
            },
        }));

        // Auto-clear after 4 seconds
        setTimeout(() => {
            set((s) => ({
                typingUsers: {
                    ...s.typingUsers,
                    [conversationId]: (s.typingUsers[conversationId] || []).filter(
                        (n) => n !== userName,
                    ),
                },
            }));
        }, 4000);
    });

    // Reactions
    ws.onEvent("chat:*", (topic: string, event: Record<string, unknown>) => {
        if (!topic.includes(":reactions")) return;
        const conversationId = topic.split(":")[1];
        const messageId = event.message_id as string;
        if (!messageId) return;

        const messages = get().messages[conversationId] || [];
        const idx = messages.findIndex((m) => m.id === messageId);
        if (idx === -1) return;

        const message = messages[idx];
        let updatedReactions = [...(message.reactions || [])];

        if (event.event_type === "reaction.added") {
            const emoji = (event.reaction as Record<string, unknown>)?.emoji as string;
            if (emoji) {
                const existing = updatedReactions.find((r) => r.emoji === emoji);
                if (existing) {
                    existing.count += 1;
                } else {
                    updatedReactions.push({ emoji, count: 1, userReacted: false });
                }
            }
        } else if (event.event_type === "reaction.removed") {
            const emoji = event.emoji as string;
            updatedReactions = updatedReactions
                .map((r) => (r.emoji === emoji ? { ...r, count: r.count - 1 } : r))
                .filter((r) => r.count > 0);
        }

        const updated = [...messages];
        updated[idx] = { ...message, reactions: updatedReactions };
        set((s) => ({
            messages: { ...s.messages, [conversationId]: updated },
        }));
    });

    // Read receipts
    ws.onEvent("chat:*", (topic: string, event: Record<string, unknown>) => {
        if (!topic.includes(":read")) return;
        const conversationId = topic.split(":")[1];
        const userId = event.user_id as string;
        if (!userId) return;

        set((s) => ({
            conversations: s.conversations.map((c) =>
                c.id !== conversationId
                    ? c
                    : {
                          ...c,
                          participants: c.participants.map((p) =>
                              p.userId === userId
                                  ? { ...p, lastReadAt: event.last_read_at as string }
                                  : p,
                          ),
                      },
            ),
        }));
    });
},
```

**Step 3: Implement `sendTypingIndicator` with throttle**

Add a module-level throttle tracker:

```typescript
let lastTypingSent = 0;
```

In the store:

```typescript
sendTypingIndicator: (conversationId: string) => {
    const now = Date.now();
    if (now - lastTypingSent < 3000) return;
    lastTypingSent = now;

    apiFetch(`/api/chat/conversations/${conversationId}/typing`, {
        method: "POST",
    }).catch(() => {
        // Fire-and-forget
    });
},
```

**Step 4: Commit**

```bash
git add apps/web/src/stores/messenger.store.ts
git commit -m "feat(web): add initRealtimeHandlers + typing indicator to messenger store"
```

---

### Task 4: Subscribe to `chat:` topics in fetchMessenger + update ShellLayout

**Files:**

- Modify: `apps/web/src/stores/messenger.store.ts`
- Modify: `apps/web/src/components/templates/ShellLayout.tsx`

**Step 1: Subscribe to chat topics in fetchMessenger**

In `fetchMessenger`, after `set({ conversations, messages, isLoading: false })`, add subscription logic:

```typescript
// Subscribe to WebSocket topics for each conversation
try {
  const ws = getWebSocket();
  data.conversations.forEach((conv) => {
    ws.subscribe(`chat:${conv.id}`);
    ws.subscribe(`chat:${conv.id}:typing`);
    ws.subscribe(`chat:${conv.id}:reactions`);
    ws.subscribe(`chat:${conv.id}:read`);
  });
} catch {
  // WebSocket unavailable — mock mode
}
```

**Step 2: Update ShellLayout — replace scattered wiring with `initRealtimeHandlers()`**

In `apps/web/src/components/templates/ShellLayout.tsx`:

a) Remove the `import type { Message } from "@/lib/mock-messenger"` (no longer needed directly).

b) Remove the `handleIncomingMessage` and `conversations` store selectors.

c) Remove the two `useEffect` hooks that:

- Listen for `messenger:*` events (lines ~105-115)
- Subscribe to `messenger:{conv.id}` topics (lines ~118-130)

d) Add the `initRealtimeHandlers` selector:

```typescript
const initRealtimeHandlers = useMessengerStore((s) => s.initRealtimeHandlers);
```

e) In the mount `useEffect` (the one that calls `fetchNotifications`, `fetchMessenger`, `connectRealtime`), add:

```typescript
initRealtimeHandlers();
```

**Step 3: Commit**

```bash
git add apps/web/src/stores/messenger.store.ts apps/web/src/components/templates/ShellLayout.tsx
git commit -m "feat(web): subscribe to chat: topics, move event wiring into initRealtimeHandlers"
```

---

### Task 5: Wire typing indicator into chat composer

**File:** `apps/web/src/components/organisms/ChatView.tsx`

**Step 1: Import and use sendTypingIndicator**

```typescript
const sendTypingIndicator = useMessengerStore((s) => s.sendTypingIndicator);
```

Find the text input's `onChange` handler. Add:

```typescript
if (conversation?.id) {
  sendTypingIndicator(conversation.id);
}
```

**Step 2: Display typing indicators below the message list**

Add a typing indicator display. Get `typingUsers` from the store:

```typescript
const typingUsers = useMessengerStore((s) => s.typingUsers);
const conversationId = conversation?.id;
const typing = conversationId ? typingUsers[conversationId] || [] : [];
```

Below the messages, before the composer:

```tsx
{
  typing.length > 0 && (
    <div className="px-4 py-1 text-xs text-text-tertiary italic">
      {typing.join(", ")} {typing.length === 1 ? "is" : "are"} typing...
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add apps/web/src/components/organisms/ChatView.tsx
git commit -m "feat(web): wire typing indicator into chat composer and message view"
```

---

## Phase 3 — Otto SSE → WebSocket Bridge

### Task 6: Bridge Otto SSE responses to WebSocket

**Files:**

- Create: `apps/api/src/otto/bridge.py`
- Modify: `apps/api/src/otto/routes.py`

**Step 1: Create bridge module**

```python
# apps/api/src/otto/bridge.py
"""Bridge Otto SSE responses to WebSocket for multi-participant visibility."""

import logging

from src.realtime.emitter import emit_event

logger = logging.getLogger(__name__)


async def bridge_otto_response_to_ws(
    conversation_id: str | None,
    message_id: str,
    content: str,
    persona_mode: str | None = None,
) -> None:
    """Broadcast Otto's completed response via WebSocket.

    Called after Otto's full response is persisted. The SSE caller
    already has the message via SSE — this broadcast is for other
    participants in the conversation.
    """
    if not conversation_id:
        return

    await emit_event(
        f"chat:{conversation_id}",
        {
            "event_type": "message.sent",
            "message": {
                "id": message_id,
                "conversationId": conversation_id,
                "authorId": "otto",
                "authorName": "Otto",
                "content": content,
                "messageType": "text",
                "personaMode": persona_mode,
                "createdAt": None,  # Will be set by receiver
            },
        },
    )


async def emit_otto_typing(conversation_id: str | None) -> None:
    """Emit typing indicator when Otto starts generating."""
    if not conversation_id:
        return

    await emit_event(
        f"chat:{conversation_id}:typing",
        {
            "event_type": "typing.start",
            "user_id": "otto",
            "user_name": "Otto",
            "conversation_id": conversation_id,
        },
    )
```

**Step 2: Wire into Otto routes**

In `apps/api/src/otto/routes.py`, the `stream_response()` generator is synchronous, so we can't `await` inside it. Instead, use the `save_message` call as the hook point.

The challenge: `stream_response()` is a sync generator inside a `StreamingResponse`. We need to call the async bridge AFTER the generator completes.

**Approach:** Add the bridge call inside the `save_message` function, or better — after `save_message` in the generator, use `asyncio.get_event_loop().create_task()` to fire-and-forget:

In the `stream_response()` function (around line 235-244), after `save_message(...)`:

```python
            # Bridge to WebSocket for other participants
            import asyncio

            loop = asyncio.get_event_loop()
            from src.otto.bridge import bridge_otto_response_to_ws

            loop.create_task(
                bridge_otto_response_to_ws(
                    conversation_id=getattr(request, "conversation_id", None),
                    message_id=f"msg_otto_{session.id}_{int(time.time())}",
                    content=full_response,
                    persona_mode=getattr(request, "persona_mode", None),
                )
            )
```

**Note:** If the ChatRequest model doesn't have `conversation_id`, add it as an optional field:

```python
class ChatRequest(BaseModel):
    message: str
    # ... existing fields ...
    conversation_id: str | None = None  # For WS bridge
    persona_mode: str | None = None
```

Also emit typing before the stream starts (right before `def stream_response()`):

This is tricky because we're in a sync context returning a StreamingResponse. Simplest approach: add the typing emit as the first `yield` in a wrapper, or emit it before returning the StreamingResponse.

Since the route handler is `async def`, emit typing BEFORE returning the StreamingResponse:

```python
    # Emit Otto typing indicator
    if getattr(request, "conversation_id", None):
        from src.otto.bridge import emit_otto_typing

        await emit_otto_typing(request.conversation_id)
```

**Step 3: Verify + commit**

```bash
cd apps/api && source .venv/bin/activate && ruff check src/otto/bridge.py src/otto/routes.py && ruff format --check src/otto/bridge.py src/otto/routes.py
git add apps/api/src/otto/bridge.py apps/api/src/otto/routes.py
git commit -m "feat(api): bridge Otto SSE responses to WebSocket for multi-participant visibility"
```

---

### Task 7: Frontend dedup for Otto WebSocket messages

**File:** `apps/web/src/stores/messenger.store.ts`

In the `initRealtimeHandlers` message handler, add Otto dedup logic:

The existing `handleIncomingMessage` already deduplicates by message ID. The SSE-initiated Otto message and the WS-bridged one will have different IDs (SSE uses client-generated, WS bridge uses server-generated).

To handle this: if the sender is `otto` and the current user triggered the SSE (they're the active conversation viewer), skip the WS message.

In the message handler within `initRealtimeHandlers`:

```typescript
if (event.event_type === "message.sent" && event.message) {
  const msg = event.message as Message;
  // Skip own messages
  if (msg.authorId === "user_self") return;
  // Skip Otto messages if we're viewing that conversation (we get them via SSE)
  if (msg.authorId === "otto" && get().activeConversationId === conversationId)
    return;

  get().handleIncomingMessage(conversationId, msg);
}
```

**Step 1: Commit**

```bash
git add apps/web/src/stores/messenger.store.ts
git commit -m "feat(web): add Otto WebSocket dedup in initRealtimeHandlers"
```

---

## Phase 4 — Auto-subscribe to New Conversations

### Task 8: Subscribe on conversation create/join

**File:** `apps/web/src/stores/messenger.store.ts`

**Step 1: Add a helper function for subscribing to a conversation's topics**

```typescript
function subscribeToConversation(conversationId: string) {
  try {
    const ws = getWebSocket();
    ws.subscribe(`chat:${conversationId}`);
    ws.subscribe(`chat:${conversationId}:typing`);
    ws.subscribe(`chat:${conversationId}:reactions`);
    ws.subscribe(`chat:${conversationId}:read`);
  } catch {
    // WebSocket unavailable
  }
}
```

**Step 2: Call it in fetchMessenger (replace inline subscription code)**

Replace the subscription block added in Task 4 with:

```typescript
data.conversations.forEach((conv) => subscribeToConversation(conv.id));
```

**Step 3: Add `createConversation` action to the store**

Add to the interface:

```typescript
createConversation: (participantIds: string[], topic?: string) =>
  Promise<Conversation | null>;
```

Implementation:

```typescript
createConversation: async (participantIds, topic) => {
    try {
        const conv = await apiFetch<Conversation>("/api/chat/conversations", {
            method: "POST",
            body: JSON.stringify({
                conversation_type: participantIds.length === 1 ? "dm" : "group",
                participant_ids: participantIds,
                topic,
            }),
        });
        set((s) => ({
            conversations: [conv, ...s.conversations],
        }));
        subscribeToConversation(conv.id);
        return conv;
    } catch {
        return null;
    }
},
```

**Step 4: In `initRealtimeHandlers`, listen for personal `user:*` events for being added to conversations**

```typescript
// Listen for being added to a conversation
ws.onEvent("user:*", (topic: string, event: Record<string, unknown>) => {
  if (event.event_type === "conversation.added" && event.conversation) {
    const conv = event.conversation as Conversation;
    set((s) => ({
      conversations: [conv, ...s.conversations],
    }));
    subscribeToConversation(conv.id);
  }
});
```

**Step 5: Commit**

```bash
git add apps/web/src/stores/messenger.store.ts
git commit -m "feat(web): auto-subscribe to new conversations on create/join"
```

---

### Task 9: Type-check + lint + verify

**Step 1: TypeScript**

```bash
cd /Users/zacharyholwerda/Desktop/airlock-app && source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check
```

**Step 2: ESLint**

```bash
pnpm lint
```

**Step 3: Ruff**

```bash
cd apps/api && source .venv/bin/activate && ruff check src/chat/ src/otto/ src/realtime/topics.py && ruff format --check src/chat/ src/otto/ src/realtime/
```

**Step 4: Commit any fixes**

---

## Acceptance Checks

| #   | Check            | How to verify                                                         |
| --- | ---------------- | --------------------------------------------------------------------- |
| 1   | Message delivery | User A sends → User B sees in <200ms without polling                  |
| 2   | Typing indicator | User A types → User B sees "typing..." within 200ms → clears after 4s |
| 3   | Reactions        | User A reacts → User B sees pill appear instantly                     |
| 4   | Read receipts    | User A opens conv → User B sees "Seen" update                         |
| 5   | Otto visibility  | User A asks Otto → User B sees response via WebSocket                 |
| 6   | Otto typing      | Otto starts generating → participants see "Otto is typing..."         |
| 7   | Dedup (self)     | User A sends → no duplicate from WebSocket echo                       |
| 8   | Dedup (Otto)     | User A triggers Otto → no duplicate from WS bridge                    |
| 9   | Auto-subscribe   | Create DM → immediately get real-time events                          |
| 10  | No regressions   | vault:_, presence:_, notifications:\* still work                      |

## Priority Order

| Priority | Tasks         | Why                                              |
| -------- | ------------- | ------------------------------------------------ |
| **P0**   | 1, 2, 3, 4, 9 | Backend emission + frontend handlers = live chat |
| **P1**   | 5, 7          | Typing indicators + dedup polish                 |
| **P2**   | 6, 8          | Otto bridge + auto-subscribe                     |

## File Index

| File                                                | Tasks      | Changes                                                   |
| --------------------------------------------------- | ---------- | --------------------------------------------------------- |
| `apps/api/src/realtime/topics.py`                   | 1          | Add `chat` prefix                                         |
| `apps/api/src/chat/routes.py`                       | 1, 2       | Typing endpoint, enrich events, switch to `chat:` prefix  |
| `apps/api/src/otto/bridge.py`                       | 6          | New — bridge + typing emit                                |
| `apps/api/src/otto/routes.py`                       | 6          | Wire bridge after save_message                            |
| `apps/web/src/stores/messenger.store.ts`            | 3, 4, 7, 8 | initRealtimeHandlers, subscriptions, dedup, create conv   |
| `apps/web/src/components/templates/ShellLayout.tsx` | 4          | Remove old messenger:\* wiring, call initRealtimeHandlers |
| `apps/web/src/components/organisms/ChatView.tsx`    | 5          | Typing indicator display + emit on input change           |
