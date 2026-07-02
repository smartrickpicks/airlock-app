# 10 Friends Chatting — Wire Messenger to Real Data

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire the existing mock-driven Messenger to real API + WebSocket so 10 real users can chat in real-time.

**Architecture:** The frontend already mounts MessengerDrawer, calls fetchMessenger(), and connects via connectReal(). The API routes + service layer + DB models all exist. We need to: (1) fix the data shape mismatch between API responses and frontend types, (2) wire sendMessage/markAsRead to real API calls, (3) add WebSocket broadcast on message send so other users see messages in real-time, (4) handle per-conversation message fetching.

**Tech Stack:** Next.js 14, Zustand, FastAPI, SQLAlchemy, WebSocket (native), PostgreSQL 16

**Key Constraint:** This is dev work separate from the brainbrigade.xyz launch. All changes must preserve the mock fallback (apiFetch try/catch pattern).

---

## Current State

What's already wired:

- `ShellLayout.tsx:128` — `<MessengerDrawer />` mounted
- `ShellLayout.tsx:73` — `fetchMessenger()` called on mount
- `ShellLayout.tsx:74` — `connectReal()` called on mount (real WebSocket)
- `main.py:81` — messenger_router registered
- `main.py:101-103` — WebSocket endpoint at `/ws`

What's broken:

1. **Type mismatch** — API returns `{sender_id, conversation_id}` (snake_case), frontend expects `{authorId, authorName, conversationId}` (camelCase with resolved names)
2. **Shape mismatch** — `fetchMessenger()` expects `{conversations, messages}` but API GET `/api/v1/messenger` returns `{conversations}` only
3. **`sendMessage()` is mock-only** — creates message locally, simulates reply
4. **`markAsRead()` is local-only** — clears unread in state, never calls API
5. **No WebSocket broadcast on send** — API saves message to DB but doesn't push to other users
6. **No sender name resolution** — API returns `sender_id` but frontend needs `authorName`
7. **Conversation list missing participants/lastMessage** — API returns flat dict, frontend expects nested `participants[]` and `lastMessage` preview

---

## Task 1: Enrich API conversation list response with participants + last message

The frontend `Conversation` type expects `participants: ConversationParticipant[]` and `lastMessage: MessagePreview | null`. The API currently returns neither.

**Files:**

- Modify: `apps/api/src/messenger/service.py:14-55` (`list_conversations`)
- Modify: `apps/api/src/models/user.py` (import for name resolution)

**Step 1: Update `list_conversations` to include participants and last message**

In `apps/api/src/messenger/service.py`, update the `list_conversations` function to:

1. Query all participants for each conversation (join User table for display_name)
2. Query the latest message per conversation
3. Return enriched dicts matching frontend shape

```python
def list_conversations(db: Session, workspace_id: str, user_id: str) -> list[dict]:
    """List conversations the user participates in."""
    from src.models.user import User

    participants = (
        db.query(ConversationParticipant)
        .filter(
            ConversationParticipant.user_id == user_id,
        )
        .all()
    )

    conv_ids = [p.conversation_id for p in participants]
    if not conv_ids:
        return []

    conversations = (
        db.query(Conversation)
        .filter(
            Conversation.id.in_(conv_ids),
            Conversation.workspace_id == workspace_id,
            Conversation.deleted_at.is_(None),
        )
        .order_by(Conversation.last_message_at.desc().nullslast())
        .all()
    )

    # Build unread map
    unread_map = {p.conversation_id: p.unread_count for p in participants}

    # Build participants map: conv_id -> [{userId, name, online}]
    all_participants = (
        db.query(ConversationParticipant, User)
        .join(User, ConversationParticipant.user_id == User.id)
        .filter(ConversationParticipant.conversation_id.in_(conv_ids))
        .all()
    )
    participants_map: dict[str, list[dict]] = {}
    for cp, user in all_participants:
        participants_map.setdefault(cp.conversation_id, []).append({
            "userId": user.id,
            "name": user.display_name,
            "avatarUrl": user.avatar_url if hasattr(user, "avatar_url") else None,
            "online": False,  # Presence resolved client-side
        })

    # Build last message map: conv_id -> {authorName, content, timestamp}
    last_messages: dict[str, dict] = {}
    for conv in conversations:
        last_msg = (
            db.query(Message)
            .filter(
                Message.conversation_id == conv.id,
                Message.deleted_at.is_(None),
            )
            .order_by(Message.created_at.desc())
            .first()
        )
        if last_msg:
            # Resolve sender name
            sender_name = "System"
            if last_msg.sender_id:
                sender = db.query(User).filter(User.id == last_msg.sender_id).first()
                if sender:
                    sender_name = sender.display_name
                elif last_msg.sender_id == user_id:
                    sender_name = "You"
            last_messages[conv.id] = {
                "authorName": sender_name,
                "content": last_msg.content,
                "timestamp": last_msg.created_at.isoformat() if last_msg.created_at else None,
            }

    return [
        {
            "id": c.id,
            "type": c.conversation_type,
            "name": c.name,
            "moduleId": c.module_scope,
            "vaultId": c.vault_id,
            "chamber": c.chamber,
            "participants": participants_map.get(c.id, []),
            "lastMessage": last_messages.get(c.id),
            "unreadCount": unread_map.get(c.id, 0),
            "muted": False,  # TODO: add muted column to ConversationParticipant
            "createdAt": c.created_at.isoformat() if c.created_at else None,
        }
        for c in conversations
    ]
```

**Step 2: Verify locally**

Run: `cd apps/api && source .venv/bin/activate && python -c "from src.messenger.service import list_conversations; print('import ok')"`
Expected: No import errors.

**Step 3: Commit**

```bash
git add apps/api/src/messenger/service.py
git commit -m "feat(api): enrich messenger conversations with participants and last message"
```

---

## Task 2: Enrich API message list response with sender names

The frontend `Message` type expects `authorId` and `authorName`. The API returns `sender_id` only.

**Files:**

- Modify: `apps/api/src/messenger/service.py:116-143` (`list_messages`)

**Step 1: Update `list_messages` to resolve sender names**

```python
def list_messages(
    db: Session, conversation_id: str, limit: int = 50, offset: int = 0
) -> list[dict]:
    """List messages in a conversation with resolved sender names."""
    from src.models.user import User

    messages = (
        db.query(Message)
        .filter(
            Message.conversation_id == conversation_id,
            Message.deleted_at.is_(None),
        )
        .order_by(Message.created_at.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    # Batch resolve sender names
    sender_ids = {m.sender_id for m in messages if m.sender_id}
    users = db.query(User).filter(User.id.in_(sender_ids)).all() if sender_ids else []
    name_map = {u.id: u.display_name for u in users}

    return [
        {
            "id": m.id,
            "conversationId": m.conversation_id,
            "authorId": m.sender_id,
            "authorName": name_map.get(m.sender_id, "System") if m.sender_id else "System",
            "content": m.content,
            "messageType": m.message_type,
            "replyToId": m.reply_to_id,
            "createdAt": m.created_at.isoformat() if m.created_at else None,
        }
        for m in messages
    ]
```

**Step 2: Commit**

```bash
git add apps/api/src/messenger/service.py
git commit -m "feat(api): resolve sender display names in message list"
```

---

## Task 3: Add WebSocket broadcast when a message is sent

When a user sends a message, other connected users need to receive it in real-time via the `messenger:{conversation_id}` topic.

**Files:**

- Modify: `apps/api/src/messenger/routes.py:67-84` (`post_message`)
- Reference: `apps/api/src/realtime/emitter.py` (`emit_event`)

**Step 1: Add async broadcast after message creation**

The route handler needs to become `async` and call `emit_event` after saving.

```python
from src.realtime.emitter import emit_event

@router.post("/{conversation_id}/messages")
async def post_message(
    conversation_id: str,
    request: SendMessageRequest,
    db: Session = Depends(get_db),  # noqa: B008
    user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Send a message to a conversation."""
    msg = send_message(
        db,
        conversation_id=conversation_id,
        workspace_id=user.get("workspace_id", "ws_dev"),
        sender_id=user["sub"],
        content=request.content,
        message_type=request.message_type,
        reply_to_id=request.reply_to_id,
    )

    # Broadcast to all subscribers of this conversation
    await emit_event(f"messenger:{conversation_id}", {
        "event_type": "message.sent",
        "message": msg,
    })

    return msg
```

**Step 2: Also make mark_as_read async for consistency**

```python
@router.patch("/{conversation_id}/read")
async def mark_conversation_read(
    conversation_id: str,
    db: Session = Depends(get_db),  # noqa: B008
    user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Mark conversation as read."""
    success = mark_as_read(db, conversation_id, user["sub"])
    if not success:
        raise HTTPException(status_code=404, detail="Not a participant")
    return {"status": "read"}
```

**Step 3: Commit**

```bash
git add apps/api/src/messenger/routes.py
git commit -m "feat(api): broadcast message.sent via WebSocket on send"
```

---

## Task 4: Wire frontend `sendMessage` to real API

Replace the mock-only `sendMessage` in the Zustand store with a real API call that falls back to mock behavior.

**Files:**

- Modify: `apps/web/src/stores/messenger.store.ts:108-188` (`sendMessage`)

**Step 1: Rewrite sendMessage with real API call + optimistic update**

```typescript
sendMessage: async (conversationId, content) => {
    const now = new Date().toISOString();
    const newMsg: Message = {
      id: `msg_${Date.now()}`,
      conversationId,
      authorId: "user_self",
      authorName: "You",
      content,
      messageType: "text",
      createdAt: now,
    };

    // Optimistic update — add message to local state immediately
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: [...(s.messages[conversationId] || []), newMsg],
      },
      conversations: s.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              lastMessage: {
                authorName: "You",
                content,
                timestamp: now,
              },
            }
          : c,
      ),
    }));

    try {
      const response = await apiFetch<Message>(
        `/api/v1/messenger/${conversationId}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ content, message_type: "text" }),
        },
      );

      // Replace optimistic message with server response (real id, timestamp)
      set((s) => ({
        messages: {
          ...s.messages,
          [conversationId]: s.messages[conversationId].map((m) =>
            m.id === newMsg.id ? { ...response, authorName: "You" } : m,
          ),
        },
      }));
    } catch {
      // API unavailable — keep optimistic message + simulate reply (mock fallback)
      const reply = MOCK_REPLIES[conversationId];
      if (reply) {
        if (replyTimeout) clearTimeout(replyTimeout);
        if (typingTimeout) clearTimeout(typingTimeout);

        typingTimeout = setTimeout(() => {
          set((s) => ({
            typingUsers: {
              ...s.typingUsers,
              [conversationId]: [reply.authorName],
            },
          }));
        }, 1000);

        replyTimeout = setTimeout(() => {
          const replyMsg: Message = {
            id: `msg_${Date.now()}`,
            conversationId,
            authorId: "user_reply",
            authorName: reply.authorName,
            content: reply.content,
            messageType: "text",
            createdAt: new Date().toISOString(),
          };
          set((s) => ({
            messages: {
              ...s.messages,
              [conversationId]: [
                ...(s.messages[conversationId] || []),
                replyMsg,
              ],
            },
            conversations: s.conversations.map((c) =>
              c.id === conversationId
                ? {
                    ...c,
                    lastMessage: {
                      authorName: reply.authorName,
                      content: reply.content,
                      timestamp: replyMsg.createdAt,
                    },
                  }
                : c,
            ),
            typingUsers: {
              ...s.typingUsers,
              [conversationId]: [],
            },
          }));
        }, 3000);
      }
    }
  },
```

Note: The `sendMessage` signature changes from `(id, content) => void` to `(id, content) => Promise<void>`. Update the interface:

```typescript
sendMessage: (conversationId: string, content: string) => Promise<void>;
```

**Step 2: Commit**

```bash
git add apps/web/src/stores/messenger.store.ts
git commit -m "feat(web): wire sendMessage to real API with optimistic update"
```

---

## Task 5: Wire frontend `markAsRead` to real API

**Files:**

- Modify: `apps/web/src/stores/messenger.store.ts:101-106` (`markAsRead`)

**Step 1: Add API call to markAsRead**

```typescript
markAsRead: (conversationId) => {
    // Optimistic update
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c,
      ),
    }));

    // Fire-and-forget API call
    apiFetch(`/api/v1/messenger/${conversationId}/read`, {
      method: "PATCH",
    }).catch(() => {
      // Mock fallback — already updated locally
    });
  },
```

**Step 2: Commit**

```bash
git add apps/web/src/stores/messenger.store.ts
git commit -m "feat(web): wire markAsRead to real API"
```

---

## Task 6: Wire frontend `fetchMessenger` to load messages per conversation

Currently `fetchMessenger` expects `{conversations, messages}` from a single endpoint, but the API returns conversations only. Messages need per-conversation fetching.

**Files:**

- Modify: `apps/web/src/stores/messenger.store.ts:51-74` (`fetchMessenger`)

**Step 1: Update fetchMessenger to fetch conversations then messages**

```typescript
fetchMessenger: async () => {
    set({ isLoading: true });
    try {
      const data = await apiFetch<{
        conversations: Conversation[];
      }>("/api/v1/messenger");

      // Fetch messages for each conversation (first 50 per conversation)
      const messagesMap: Record<string, Message[]> = {};
      await Promise.all(
        data.conversations.map(async (conv) => {
          try {
            const msgData = await apiFetch<{ messages: Message[] }>(
              `/api/v1/messenger/${conv.id}/messages?limit=50`,
            );
            messagesMap[conv.id] = msgData.messages;
          } catch {
            messagesMap[conv.id] = [];
          }
        }),
      );

      set({
        conversations: data.conversations,
        messages: messagesMap,
        isLoading: false,
      });
    } catch {
      if (getWorkspaceMode() === "clean") {
        set({ conversations: [], messages: {}, isLoading: false });
      } else {
        set({
          conversations: MOCK_CONVERSATIONS,
          messages: MOCK_MESSAGES,
          isLoading: false,
        });
      }
    }
  },
```

**Step 2: Commit**

```bash
git add apps/web/src/stores/messenger.store.ts
git commit -m "feat(web): fetch messages per conversation from real API"
```

---

## Task 7: Subscribe to messenger WebSocket events for real-time message delivery

When another user sends a message, the frontend needs to receive it via WebSocket and add it to the store.

**Files:**

- Modify: `apps/web/src/stores/messenger.store.ts` (add WebSocket event handler)
- Modify: `apps/web/src/components/templates/ShellLayout.tsx` (subscribe to messenger topics)

**Step 1: Add a `handleIncomingMessage` action to the store**

Add to the interface:

```typescript
handleIncomingMessage: (conversationId: string, message: Message) => void;
```

Add to the store:

```typescript
handleIncomingMessage: (conversationId, message) => {
    // Don't add if we already have this message (optimistic update)
    const existing = get().messages[conversationId] || [];
    if (existing.some((m) => m.id === message.id)) return;

    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: [...(s.messages[conversationId] || []), message],
      },
      conversations: s.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              lastMessage: {
                authorName: message.authorName,
                content: message.content,
                timestamp: message.createdAt,
              },
              // Increment unread if not the active conversation
              unreadCount:
                s.activeConversationId === conversationId
                  ? c.unreadCount
                  : c.unreadCount + 1,
            }
          : c,
      ),
    }));
  },
```

**Step 2: Subscribe to messenger events in ShellLayout**

In `ShellLayout.tsx`, after the existing `useEffect` that calls `fetchMessenger()` and `connectRealtime()`, add a new effect to subscribe to messenger WebSocket events:

```typescript
import { useRealtimeStore } from "@/stores/realtime.store";

// Inside ShellLayout component, after existing effects:
const handleIncomingMessage = useMessengerStore((s) => s.handleIncomingMessage);
const conversations = useMessengerStore((s) => s.conversations);

useEffect(() => {
  const unsubscribe = useRealtimeStore
    .getState()
    .onEvent("messenger:*", (event) => {
      if (event.type === "message.sent" && event.payload?.message) {
        const msg = event.payload.message as Message;
        handleIncomingMessage(msg.conversationId, msg);
      }
    });
  return unsubscribe;
}, [handleIncomingMessage]);

// Subscribe to all conversation topics when conversations load
useEffect(() => {
  if (conversations.length === 0) return;
  const ws = import("@/lib/websocket")
    .then(({ getWebSocket }) => {
      const socket = getWebSocket();
      conversations.forEach((conv) => {
        socket.subscribe(`messenger:${conv.id}`);
      });
    })
    .catch(() => {
      /* mock mode */
    });
}, [conversations]);
```

**Step 3: Commit**

```bash
git add apps/web/src/stores/messenger.store.ts apps/web/src/components/templates/ShellLayout.tsx
git commit -m "feat(web): subscribe to messenger WebSocket events for real-time delivery"
```

---

## Task 8: Add sender name to broadcast message payload

The WebSocket broadcast in Task 3 sends the raw `send_message` return value which has `sender_id` but no `authorName`. The frontend event handler needs `authorName`.

**Files:**

- Modify: `apps/api/src/messenger/routes.py:67-84` (`post_message`)

**Step 1: Resolve sender name before broadcasting**

```python
@router.post("/{conversation_id}/messages")
async def post_message(
    conversation_id: str,
    request: SendMessageRequest,
    db: Session = Depends(get_db),  # noqa: B008
    user: dict = Depends(get_current_user),  # noqa: B008
) -> dict:
    """Send a message to a conversation."""
    msg = send_message(
        db,
        conversation_id=conversation_id,
        workspace_id=user.get("workspace_id", "ws_dev"),
        sender_id=user["sub"],
        content=request.content,
        message_type=request.message_type,
        reply_to_id=request.reply_to_id,
    )

    # Enrich with sender name for WebSocket broadcast
    sender_name = user.get("display_name") or user.get("email", "Unknown")
    broadcast_msg = {
        **msg,
        "authorId": msg["sender_id"],
        "authorName": sender_name,
        "conversationId": msg["conversation_id"],
    }

    # Broadcast to all subscribers of this conversation
    await emit_event(f"messenger:{conversation_id}", {
        "event_type": "message.sent",
        "message": broadcast_msg,
    })

    return msg
```

Note: Check if `get_current_user` returns `display_name`. If not, query the User model:

```python
from src.models.user import User

# Inside post_message, after send_message:
sender = db.query(User).filter(User.id == user["sub"]).first()
sender_name = sender.display_name if sender else user.get("email", "Unknown")
```

**Step 2: Commit**

```bash
git add apps/api/src/messenger/routes.py
git commit -m "feat(api): include sender display name in WebSocket message broadcast"
```

---

## Task 9: Update `send_message` service to return camelCase keys

The frontend expects camelCase keys. Update the service return to match.

**Files:**

- Modify: `apps/api/src/messenger/service.py:146-189` (`send_message`)

**Step 1: Return camelCase keys**

```python
def send_message(
    db: Session,
    conversation_id: str,
    workspace_id: str,
    sender_id: str,
    content: str,
    message_type: str = "text",
    reply_to_id: str | None = None,
) -> dict:
    """Send a message to a conversation."""
    msg = Message(
        id=f"msg_{ULID()}",
        conversation_id=conversation_id,
        workspace_id=workspace_id,
        sender_id=sender_id,
        content=content,
        message_type=message_type,
        reply_to_id=reply_to_id,
    )
    db.add(msg)

    # Update conversation last_message_at
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if conv:
        conv.last_message_at = datetime.now(UTC)

    # Increment unread for other participants
    db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id != sender_id,
    ).update({"unread_count": ConversationParticipant.unread_count + 1})

    db.commit()
    db.refresh(msg)

    return {
        "id": msg.id,
        "conversationId": msg.conversation_id,
        "authorId": msg.sender_id,
        "content": msg.content,
        "messageType": msg.message_type,
        "replyToId": msg.reply_to_id,
        "createdAt": msg.created_at.isoformat() if msg.created_at else None,
    }
```

**Step 2: Commit**

```bash
git add apps/api/src/messenger/service.py
git commit -m "refactor(api): return camelCase keys from messenger service"
```

---

## Task 10: Type-check and lint

**Step 1: Run type-check**

```bash
cd /Users/zacharyholwerda/Desktop/airlock-app && source ~/.nvm/nvm.sh && nvm use 20 && pnpm type-check
```

Fix any TypeScript errors (likely around the async `sendMessage` signature change).

**Step 2: Run lint**

```bash
pnpm lint
```

**Step 3: Run Python lint**

```bash
cd apps/api && source .venv/bin/activate && ruff check src/messenger/ && ruff format --check src/messenger/
```

**Step 4: Commit any fixes**

```bash
git add -A && git commit -m "fix(web,api): resolve type-check and lint errors"
```

---

## Verification Checklist

After all tasks, verify:

- [ ] `pnpm type-check` passes
- [ ] `pnpm lint` passes
- [ ] `ruff check` + `ruff format --check` pass on `apps/api/src/messenger/`
- [ ] Frontend still works with mock data when API is unavailable (try/catch fallback intact)
- [ ] When API IS running: sendMessage POSTs to API and broadcasts via WebSocket
- [ ] When API IS running: fetchMessenger loads real conversations + messages
- [ ] When API IS running: markAsRead PATCHes the API
- [ ] WebSocket message.sent events add messages to other users' stores

## What's NOT in this plan (future work)

- Database deployment (Postgres/Redis hosting)
- Real auth flow (Google OAuth production credentials)
- Invite email flow (Resend domain verification)
- File uploads
- Message search
- Typing indicators via WebSocket (currently mock-only)
- Create new conversation UI (currently no "new DM" button wired)
