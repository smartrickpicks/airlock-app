# Unified Chat Migration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate from the M21 messenger schema to the Unified Chat spec — merging Otto + Messenger into one chat system with GIFs, reactions, embeds, and per-message read receipts.

**Architecture:** Additive migration (ALTER + CREATE, no DROP). Keep existing columns during transition, add new ones. Rename the API from `/api/v1/messenger` to `/api/chat/` with a compatibility alias. Frontend types evolve to match the new API shape.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, PostgreSQL 16, Zustand, WebSocket

**Source Spec:** The "Airlock Unified Chat — Backend Specification" pasted by the user in conversation on 2026-03-11.

---

## Schema Delta: Current → Unified Chat

### conversations table

| Column            | Current       | Unified Chat                 | Action                                         |
| ----------------- | ------------- | ---------------------------- | ---------------------------------------------- |
| id                | TEXT (ULID)   | TEXT (ULID)                  | Keep (Airlock convention, not UUID)            |
| workspace_id      | TEXT          | TEXT                         | Keep                                           |
| vault_id          | TEXT nullable | —                            | Keep for backwards compat, map to context_id   |
| name              | TEXT nullable | —                            | Keep, alias as `topic`                         |
| conversation_type | TEXT          | TEXT ('otto'\|'dm'\|'group') | Keep, add 'otto' type                          |
| module_scope      | TEXT nullable | —                            | Keep for backwards compat, map to context_type |
| chamber           | TEXT nullable | —                            | Keep for backwards compat                      |
| created_by        | TEXT nullable | TEXT                         | Keep                                           |
| **topic**         | —             | TEXT nullable                | **ADD** (alias for name)                       |
| **context_type**  | —             | TEXT nullable                | **ADD** ('playbook'\|'vault'\|'gate'\|null)    |
| **context_id**    | —             | TEXT nullable                | **ADD** (FK to playbook/vault/gate)            |
| **context_name**  | —             | TEXT nullable                | **ADD** (denormalized display name)            |
| **persona_mode**  | —             | TEXT default 'scholar'       | **ADD** (otto conversations only)              |
| **archived**      | —             | BOOLEAN default false        | **ADD**                                        |
| last_message_at   | TIMESTAMPTZ   | TIMESTAMPTZ                  | Keep                                           |
| metadata          | JSONB         | —                            | Keep (useful for extensions)                   |
| created_at        | TIMESTAMPTZ   | TIMESTAMPTZ                  | Keep                                           |
| updated_at        | TIMESTAMPTZ   | TIMESTAMPTZ                  | Keep                                           |
| deleted_at        | TIMESTAMPTZ   | —                            | Keep (soft delete pattern)                     |

### conversation_participants table

| Column          | Current               | Unified Chat          | Action        |
| --------------- | --------------------- | --------------------- | ------------- |
| conversation_id | TEXT PK               | TEXT PK               | Keep          |
| user_id         | TEXT PK               | TEXT PK               | Keep          |
| role            | TEXT default 'member' | —                     | Keep (useful) |
| unread_count    | INTEGER default 0     | INTEGER default 0     | Keep          |
| last_read_at    | TIMESTAMPTZ           | TIMESTAMPTZ           | Keep          |
| **muted**       | —                     | BOOLEAN default false | **ADD**       |
| joined_at       | TIMESTAMPTZ           | TIMESTAMPTZ           | Keep          |

### messages table

| Column           | Current              | Unified Chat                   | Action                                    |
| ---------------- | -------------------- | ------------------------------ | ----------------------------------------- |
| id               | TEXT (ULID)          | TEXT (ULID)                    | Keep                                      |
| conversation_id  | TEXT                 | TEXT                           | Keep                                      |
| workspace_id     | TEXT                 | —                              | Keep (useful for RLS)                     |
| sender_id        | TEXT nullable        | —                              | **RENAME** to `sender`                    |
| content          | TEXT not null        | TEXT nullable                  | **ALTER** to nullable (GIF-only messages) |
| message_type     | TEXT default 'text'  | TEXT ('text'\|'gif'\|'system') | Keep, add 'gif'                           |
| **gif_url**      | —                    | TEXT nullable                  | **ADD**                                   |
| **gif_provider** | —                    | TEXT nullable                  | **ADD** ('tenor'\|'giphy')                |
| **gif_width**    | —                    | INTEGER nullable               | **ADD**                                   |
| **gif_height**   | —                    | INTEGER nullable               | **ADD**                                   |
| **embeds**       | —                    | JSONB default '[]'             | **ADD**                                   |
| **persona_mode** | —                    | TEXT nullable                  | **ADD**                                   |
| **read_at**      | —                    | TIMESTAMPTZ nullable           | **ADD**                                   |
| reply_to_id      | TEXT nullable        | —                              | Keep (useful)                             |
| edited_at        | TIMESTAMPTZ nullable | —                              | Keep                                      |
| metadata         | JSONB                | —                              | Keep                                      |
| created_at       | TIMESTAMPTZ          | TIMESTAMPTZ                    | Keep                                      |
| deleted_at       | TIMESTAMPTZ          | —                              | Keep                                      |

### NEW: message_reactions table

```sql
CREATE TABLE message_reactions (
  id          TEXT PRIMARY KEY,        -- ULID
  message_id  TEXT NOT NULL,           -- FK to messages
  user_id     TEXT NOT NULL,           -- FK to users (or 'otto')
  emoji       TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);
CREATE INDEX idx_reactions_message ON message_reactions(message_id);
```

### NEW: notification_preferences table

```sql
CREATE TABLE notification_preferences (
  user_id             TEXT PRIMARY KEY,  -- FK to users
  toast_enabled       BOOLEAN DEFAULT true,
  toast_otto          BOOLEAN DEFAULT true,
  toast_people        BOOLEAN DEFAULT true,
  sound_enabled       BOOLEAN DEFAULT true,
  sound_send          TEXT DEFAULT 'default',
  sound_receive       TEXT DEFAULT 'default',
  sound_notification  TEXT DEFAULT 'default',
  overlay_default     BOOLEAN DEFAULT true,
  updated_at          TIMESTAMPTZ DEFAULT now()
);
```

---

## Phase 1: Schema Migration (Alembic)

### Task 1: Create Alembic migration 008

**Files:**

- Create: `apps/api/src/migrations/versions/008_unified_chat_schema.py`

**Step 1: Write the migration**

```python
"""Unified Chat schema evolution — add columns for GIFs, embeds, reactions, prefs."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "008"
down_revision = "007"


def upgrade() -> None:
    # --- conversations: add unified chat columns ---
    op.add_column("conversations", sa.Column("topic", sa.Text, nullable=True))
    op.add_column("conversations", sa.Column("context_type", sa.Text, nullable=True))
    op.add_column("conversations", sa.Column("context_id", sa.Text, nullable=True))
    op.add_column("conversations", sa.Column("context_name", sa.Text, nullable=True))
    op.add_column("conversations", sa.Column("persona_mode", sa.Text, server_default="scholar", nullable=True))
    op.add_column("conversations", sa.Column("archived", sa.Boolean, server_default="false", nullable=False))
    op.create_index("idx_conversations_context", "conversations", ["context_type", "context_id"])

    # --- conversation_participants: add muted ---
    op.add_column("conversation_participants", sa.Column("muted", sa.Boolean, server_default="false", nullable=False))

    # --- messages: add GIF, embeds, persona, read_at; make content nullable ---
    op.alter_column("messages", "content", nullable=True)
    op.add_column("messages", sa.Column("gif_url", sa.Text, nullable=True))
    op.add_column("messages", sa.Column("gif_provider", sa.Text, nullable=True))
    op.add_column("messages", sa.Column("gif_width", sa.Integer, nullable=True))
    op.add_column("messages", sa.Column("gif_height", sa.Integer, nullable=True))
    op.add_column("messages", sa.Column("embeds", JSONB, server_default="[]", nullable=False))
    op.add_column("messages", sa.Column("persona_mode", sa.Text, nullable=True))
    op.add_column("messages", sa.Column("read_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("idx_messages_search", "messages", [sa.text("to_tsvector('english', coalesce(content, ''))")], postgresql_using="gin")

    # --- NEW: message_reactions ---
    op.create_table(
        "message_reactions",
        sa.Column("id", sa.Text, primary_key=True),
        sa.Column("message_id", sa.Text, sa.ForeignKey("messages.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Text, nullable=False),
        sa.Column("emoji", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("message_id", "user_id", "emoji", name="uq_reaction_per_user_emoji"),
    )
    op.create_index("idx_reactions_message", "message_reactions", ["message_id"])

    # --- NEW: notification_preferences ---
    op.create_table(
        "notification_preferences",
        sa.Column("user_id", sa.Text, primary_key=True),
        sa.Column("toast_enabled", sa.Boolean, server_default="true", nullable=False),
        sa.Column("toast_otto", sa.Boolean, server_default="true", nullable=False),
        sa.Column("toast_people", sa.Boolean, server_default="true", nullable=False),
        sa.Column("sound_enabled", sa.Boolean, server_default="true", nullable=False),
        sa.Column("sound_send", sa.Text, server_default="default", nullable=False),
        sa.Column("sound_receive", sa.Text, server_default="default", nullable=False),
        sa.Column("sound_notification", sa.Text, server_default="default", nullable=False),
        sa.Column("overlay_default", sa.Boolean, server_default="true", nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # --- Backfill: copy name → topic for existing conversations ---
    op.execute("UPDATE conversations SET topic = name WHERE name IS NOT NULL")
    # --- Backfill: copy vault_id → context_id, set context_type ---
    op.execute("UPDATE conversations SET context_type = 'vault', context_id = vault_id, context_name = name WHERE vault_id IS NOT NULL")


def downgrade() -> None:
    op.drop_table("notification_preferences")
    op.drop_index("idx_reactions_message")
    op.drop_table("message_reactions")
    op.drop_index("idx_messages_search", "messages")
    op.drop_column("messages", "read_at")
    op.drop_column("messages", "persona_mode")
    op.drop_column("messages", "embeds")
    op.drop_column("messages", "gif_height")
    op.drop_column("messages", "gif_width")
    op.drop_column("messages", "gif_provider")
    op.drop_column("messages", "gif_url")
    op.alter_column("messages", "content", nullable=False)
    op.drop_column("conversation_participants", "muted")
    op.drop_index("idx_conversations_context", "conversations")
    op.drop_column("conversations", "archived")
    op.drop_column("conversations", "persona_mode")
    op.drop_column("conversations", "context_name")
    op.drop_column("conversations", "context_id")
    op.drop_column("conversations", "context_type")
    op.drop_column("conversations", "topic")
```

**Step 2: Commit**

```bash
git add apps/api/src/migrations/versions/008_unified_chat_schema.py
git commit -m "feat(api): add unified chat schema migration (GIFs, reactions, embeds, prefs)"
```

---

### Task 2: Update SQLAlchemy models to match new schema

**Files:**

- Modify: `apps/api/src/messenger/models.py`
- Create: `apps/api/src/messenger/reaction_models.py`
- Create: `apps/api/src/messenger/notification_models.py`

**Step 1: Update Conversation model**

Add to `Conversation`:

```python
topic: Mapped[str | None] = mapped_column(Text, nullable=True)
context_type: Mapped[str | None] = mapped_column(Text, nullable=True)
context_id: Mapped[str | None] = mapped_column(Text, nullable=True)
context_name: Mapped[str | None] = mapped_column(Text, nullable=True)
persona_mode: Mapped[str | None] = mapped_column(Text, server_default="scholar", nullable=True)
archived: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
```

**Step 2: Update ConversationParticipant model**

Add to `ConversationParticipant`:

```python
muted: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
```

**Step 3: Update Message model**

Make `content` nullable. Add GIF + embed + read fields:

```python
content: Mapped[str | None] = mapped_column(Text, nullable=True)
gif_url: Mapped[str | None] = mapped_column(Text, nullable=True)
gif_provider: Mapped[str | None] = mapped_column(Text, nullable=True)
gif_width: Mapped[int | None] = mapped_column(Integer, nullable=True)
gif_height: Mapped[int | None] = mapped_column(Integer, nullable=True)
embeds: Mapped[list] = mapped_column(JSONB, server_default="[]", nullable=False)
persona_mode: Mapped[str | None] = mapped_column(Text, nullable=True)
read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
```

**Step 4: Create MessageReaction model**

```python
# apps/api/src/messenger/reaction_models.py
class MessageReaction(Base):
    __tablename__ = "message_reactions"
    id: Mapped[str] = mapped_column(Text, primary_key=True)
    message_id: Mapped[str] = mapped_column(Text, ForeignKey("messages.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[str] = mapped_column(Text, nullable=False)
    emoji: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    __table_args__ = (UniqueConstraint("message_id", "user_id", "emoji", name="uq_reaction_per_user_emoji"),)
```

**Step 5: Create NotificationPreferences model**

```python
# apps/api/src/messenger/notification_models.py
class NotificationPreferences(Base):
    __tablename__ = "notification_preferences"
    user_id: Mapped[str] = mapped_column(Text, primary_key=True)
    toast_enabled: Mapped[bool] = mapped_column(Boolean, server_default="true", nullable=False)
    toast_otto: Mapped[bool] = mapped_column(Boolean, server_default="true", nullable=False)
    toast_people: Mapped[bool] = mapped_column(Boolean, server_default="true", nullable=False)
    sound_enabled: Mapped[bool] = mapped_column(Boolean, server_default="true", nullable=False)
    sound_send: Mapped[str] = mapped_column(Text, server_default="default", nullable=False)
    sound_receive: Mapped[str] = mapped_column(Text, server_default="default", nullable=False)
    sound_notification: Mapped[str] = mapped_column(Text, server_default="default", nullable=False)
    overlay_default: Mapped[bool] = mapped_column(Boolean, server_default="true", nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

**Step 6: Commit**

```bash
git add apps/api/src/messenger/
git commit -m "feat(api): update models for unified chat (reactions, GIFs, embeds, prefs)"
```

---

## Phase 2: API Routes — `/api/chat/`

### Task 3: Create new chat router with cursor pagination

**Files:**

- Create: `apps/api/src/chat/__init__.py`
- Create: `apps/api/src/chat/routes.py`
- Create: `apps/api/src/chat/schemas.py`
- Create: `apps/api/src/chat/service.py`
- Modify: `apps/api/src/main.py` (register new router)

The new `/api/chat/` router implements the Unified Chat spec endpoints:

| Endpoint                                         | Method | Purpose                                             |
| ------------------------------------------------ | ------ | --------------------------------------------------- |
| `/api/chat/conversations`                        | GET    | List conversations (cursor pagination, type filter) |
| `/api/chat/conversations`                        | POST   | Create conversation (dedup DMs)                     |
| `/api/chat/conversations/:id`                    | PATCH  | Update (rename, archive, persona, mute)             |
| `/api/chat/conversations/:id/messages`           | GET    | Messages (cursor pagination with before/after)      |
| `/api/chat/conversations/:id/messages`           | POST   | Send message (text or GIF, triggers WS broadcast)   |
| `/api/chat/conversations/:id/messages/:mid/read` | POST   | Mark message read                                   |
| `/api/chat/messages/:mid/reactions`              | POST   | Add reaction                                        |
| `/api/chat/messages/:mid/reactions/:emoji`       | DELETE | Remove reaction                                     |
| `/api/chat/people`                               | GET    | Search workspace members for new DM                 |
| `/api/chat/search`                               | GET    | Full-text message search                            |

Keep the old `/api/v1/messenger` routes as-is for backwards compatibility during migration. The frontend will switch to `/api/chat/` incrementally.

**Step 1: Create Pydantic schemas**

```python
# apps/api/src/chat/schemas.py
class CreateConversationRequest(BaseModel):
    conversation_type: str  # 'otto' | 'dm' | 'group'
    participant_ids: list[str] = []
    topic: str | None = None
    context_type: str | None = None
    context_id: str | None = None

class SendMessageRequest(BaseModel):
    content: str | None = None
    message_type: str = "text"
    gif_url: str | None = None
    gif_provider: str | None = None
    gif_width: int | None = None
    gif_height: int | None = None

class AddReactionRequest(BaseModel):
    emoji: str

class UpdateConversationRequest(BaseModel):
    topic: str | None = None
    archived: bool | None = None
    persona_mode: str | None = None
    muted: bool | None = None
```

**Step 2: Create service layer**

The service builds on the existing `messenger/service.py` functions but adds:

- Cursor pagination (keyset on `last_message_at` / `created_at`)
- DM dedup (check existing conversation before creating)
- Reaction CRUD
- Full-text search via PostgreSQL `to_tsvector`
- People search (query User table by name/email)

**Step 3: Create routes**

Each route calls the service layer and broadcasts WS events where needed.

**Step 4: Register in main.py**

```python
from src.chat.routes import router as chat_router
app.include_router(chat_router)
```

**Step 5: Commit**

```bash
git add apps/api/src/chat/ apps/api/src/main.py
git commit -m "feat(api): add /api/chat/ unified chat routes with cursor pagination"
```

---

### Task 4: Add GIF proxy endpoints

**Files:**

- Create: `apps/api/src/chat/gif_service.py`
- Modify: `apps/api/src/chat/routes.py`
- Modify: `apps/api/src/config.py` (add TENOR_API_KEY)

Proxy Tenor API through our backend to avoid exposing the API key:

| Endpoint                                | Purpose       |
| --------------------------------------- | ------------- |
| `GET /api/chat/gifs/search?q=&limit=20` | Search GIFs   |
| `GET /api/chat/gifs/trending?limit=20`  | Trending GIFs |

**Step 1: Add Tenor API key to config**

```python
# In config.py Settings:
tenor_api_key: str = ""
```

**Step 2: Create gif_service.py**

Uses `httpx` to call `https://tenor.googleapis.com/v2/search` and `https://tenor.googleapis.com/v2/featured`.

**Step 3: Add routes**

**Step 4: Commit**

```bash
git add apps/api/src/chat/gif_service.py apps/api/src/chat/routes.py apps/api/src/config.py
git commit -m "feat(api): add Tenor GIF proxy endpoints"
```

---

## Phase 3: Frontend Evolution

### Task 5: Update TypeScript types for Unified Chat

**Files:**

- Modify: `apps/web/src/lib/mock-messenger.ts` (update types)

Add to existing types:

```typescript
// Extend Message type
interface Message {
  // ... existing fields ...
  gifUrl?: string;
  gifProvider?: string;
  gifWidth?: number;
  gifHeight?: number;
  embeds?: Embed[];
  personaMode?: string;
  readAt?: string;
  reactions?: ReactionSummary[];
}

interface Embed {
  type:
    | "sovereign_balance"
    | "node_preview"
    | "gate_alert"
    | "roster_card"
    | "playbook_diff"
    | "code_block";
  data: Record<string, unknown>;
}

interface ReactionSummary {
  emoji: string;
  count: number;
  userReacted: boolean;
}

// Extend Conversation type
interface Conversation {
  // ... existing fields ...
  topic?: string;
  contextType?: string;
  contextId?: string;
  contextName?: string;
  personaMode?: string;
  archived?: boolean;
}
```

**Step 1: Commit**

```bash
git add apps/web/src/lib/mock-messenger.ts
git commit -m "feat(web): extend messenger types for unified chat (GIFs, reactions, embeds)"
```

---

### Task 6: Add emoji reaction UI to ChatView

**Files:**

- Create: `apps/web/src/components/molecules/MessageReactions.tsx`
- Create: `apps/web/src/components/molecules/EmojiPicker.tsx`
- Modify: `apps/web/src/components/organisms/ChatView.tsx`

Quick emoji set (no full picker needed for v1): 👍 ❤️ 😂 🎉 🤔 👀

**Step 1: Create MessageReactions molecule**

Shows reaction pills below each message. Click to toggle your reaction. Hover to see who reacted.

**Step 2: Create EmojiPicker molecule**

6-emoji quick picker that appears on message hover/long-press.

**Step 3: Wire into ChatView**

**Step 4: Commit**

---

### Task 7: Add GIF picker to ChatView composer

**Files:**

- Create: `apps/web/src/components/molecules/GifPicker.tsx`
- Modify: `apps/web/src/components/organisms/ChatView.tsx`

GIF button next to the send button. Opens a search panel with trending GIFs. Selecting a GIF sends it as a `gif` message type.

**Step 1: Create GifPicker molecule**

Search bar + grid of GIF thumbnails. Uses `/api/chat/gifs/search` and `/api/chat/gifs/trending`.

**Step 2: Wire into ChatView composer**

**Step 3: Commit**

---

### Task 8: Merge Otto into Unified Chat

**Files:**

- Modify: `apps/web/src/stores/messenger.store.ts`
- Modify: `apps/web/src/components/organisms/ConversationList.tsx`
- Modify: `apps/web/src/components/organisms/ChatView.tsx`

Otto becomes a pinned conversation at the top of the conversation list. The OttoDrawer functionality merges into the messenger.

**Step 1: Pin Otto conversations at top of list**

In `filteredConversations`, sort otto conversations first:

```typescript
return filtered.sort((a, b) => {
  // Otto pinned first
  if (a.type === "otto" && b.type !== "otto") return -1;
  if (b.type === "otto" && a.type !== "otto") return 1;
  // Then by last message
  const aTime = a.lastMessage?.timestamp || a.createdAt;
  const bTime = b.lastMessage?.timestamp || b.createdAt;
  return new Date(bTime).getTime() - new Date(aTime).getTime();
});
```

**Step 2: Add persona indicator in ChatView for Otto conversations**

Show the active persona mode (Scholar, Maverick, etc.) in the chat header when talking to Otto.

**Step 3: Commit**

---

### Task 9: Switch frontend to `/api/chat/` endpoints

**Files:**

- Modify: `apps/web/src/stores/messenger.store.ts`

Update all `apiFetch` calls from `/api/v1/messenger` to `/api/chat/conversations`:

- `fetchMessenger`: GET `/api/chat/conversations`
- `sendMessage`: POST `/api/chat/conversations/:id/messages`
- `markAsRead`: POST `/api/chat/conversations/:id/messages/:mid/read`

Keep the mock fallback pattern.

**Step 1: Commit**

---

### Task 10: Add notification preferences UI

**Files:**

- Create: `apps/web/src/components/organisms/ChatPreferences.tsx`
- Modify: `apps/web/src/stores/messenger.store.ts`

Settings panel accessible from the messenger drawer header. Toggles for toast/sound/overlay preferences.

---

### Task 11: Type-check + lint + verify

```bash
pnpm type-check && pnpm lint
cd apps/api && source .venv/bin/activate && ruff check src/chat/ src/messenger/ && ruff format --check src/chat/ src/messenger/
```

---

## Priority Order for "10 Friends Chatting"

| Priority              | Tasks             | Why                                                |
| --------------------- | ----------------- | -------------------------------------------------- |
| **P0 — Must Have**    | 1, 2, 3, 5, 9, 11 | Schema migration, API routes, frontend wiring      |
| **P1 — High Value**   | 6, 7              | Reactions + GIFs make it feel like a real chat app |
| **P2 — Nice to Have** | 4, 8, 10          | GIF proxy, Otto merge, notification prefs          |

## What's NOT in this plan (future work)

- Otto response pipeline (LLM integration for auto-replies)
- Proactive Otto messages (EventBus triggers)
- Sound effects (audio files + playback)
- Group conversations (v2)
- Rich embed rendering (sovereign balance cards, node previews)
- Full emoji picker (use 6-emoji quick set for now)
- Message editing/deletion
- File attachments
