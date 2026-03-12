# Messaging Parity — Slack/Discord Gap Closure

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the 4 biggest messaging gaps vs Slack/Discord: reply threading, @mentions, edit/delete, file sharing.

**Architecture:** All 4 features layer onto the existing messenger infrastructure. Backend has `reply_to_id`, `edited_at`, `deleted_at` columns on Message model, `search_people` API for mentions. Frontend needs UI components + store methods + mock data extensions.

**Tech Stack:** Next.js 14, Zustand, Tailwind tokens, FastAPI, SQLAlchemy, PostgreSQL

---

## Task 1: Reply Threading UI

**Files:**

- Modify: `apps/web/src/lib/mock-messenger.ts` — add `replyToId`, `replyPreview` to Message type
- Modify: `apps/web/src/components/organisms/ChatView.tsx` — add reply button, quoted reply preview, reply composer state
- Modify: `apps/web/src/stores/messenger.store.ts` — add `replyToMessage` state + `setReplyTo` / `clearReplyTo` actions, pass `reply_to_id` in sendMessage

### Step 1: Extend Message type with reply fields

In `mock-messenger.ts`, add to the `Message` interface:

```typescript
replyToId?: string;
replyPreview?: { authorName: string; content: string };
```

Add a reply-to reference in one of the mock message threads (e.g., `msg_008` replying to `msg_003`):

```typescript
{
  id: "msg_008",
  // ...existing fields...
  replyToId: "msg_003",
  replyPreview: { authorName: "Ana Chen", content: "Extraction completed. 42 fields found..." },
}
```

### Step 2: Add reply state to messenger store

In `messenger.store.ts`, add to MessengerState interface:

```typescript
replyTo: { messageId: string; authorName: string; content: string } | null;
setReplyTo: (messageId: string, authorName: string, content: string) => void;
clearReplyTo: () => void;
```

Add the state + actions:

```typescript
replyTo: null,
setReplyTo: (messageId, authorName, content) =>
  set({ replyTo: { messageId, authorName, content } }),
clearReplyTo: () => set({ replyTo: null }),
```

Update `sendMessage` to include `reply_to_id` in the API body when `replyTo` is set, and include `replyToId` + `replyPreview` on the optimistic message. Clear `replyTo` after sending.

### Step 3: Add reply button to message hover actions in ChatView

In `ChatView.tsx`, add a Reply button (lucide `Reply` icon) next to the EmojiPicker in the message hover group:

```tsx
import { Reply } from "lucide-react";

// Inside the message hover area, next to EmojiPicker:
<button
  onClick={() => setReplyTo(msg.id, msg.authorName, msg.content)}
  className="p-1 text-text-muted hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity"
  aria-label="Reply"
>
  <Reply size={14} />
</button>;
```

### Step 4: Add quoted reply preview above message content

When a message has `replyToId` and `replyPreview`, render a compact quote block above the message text:

```tsx
{
  msg.replyPreview && (
    <div className="mb-1 border-l-2 border-[#00D1FF]/40 pl-2 text-[11px]">
      <span className="font-medium text-text-primary">
        {msg.replyPreview.authorName}
      </span>
      <p className="text-text-muted truncate max-w-[200px]">
        {msg.replyPreview.content}
      </p>
    </div>
  );
}
```

### Step 5: Add reply composer bar above the input

When `replyTo` is set, show a compact bar above the composer:

```tsx
{
  replyTo && (
    <div className="flex items-center gap-2 border-b border-surface-border px-3 py-1.5 bg-surface-overlay/50">
      <Reply size={12} className="text-[#00D1FF]" />
      <span className="text-[11px] text-text-muted">
        Replying to{" "}
        <span className="text-text-primary font-medium">
          {replyTo.authorName}
        </span>
      </span>
      <button
        onClick={clearReplyTo}
        className="ml-auto text-text-muted hover:text-text-primary"
      >
        <X size={14} />
      </button>
    </div>
  );
}
```

---

## Task 2: @Mention Autocomplete

**Files:**

- Create: `apps/web/src/components/molecules/MentionTypeahead.tsx` — dropdown with people results
- Modify: `apps/web/src/components/organisms/ChatView.tsx` — detect `@` trigger in input, show typeahead, insert mention
- Modify: `apps/web/src/lib/mock-messenger.ts` — add mock people data for fallback

### Step 1: Create MentionTypeahead component

`MentionTypeahead.tsx` — a positioned dropdown that appears above the input:

```tsx
interface MentionOption {
  userId: string;
  name: string;
  email?: string;
  avatarUrl?: string;
}

interface MentionTypeaheadProps {
  query: string;
  options: MentionOption[];
  onSelect: (option: MentionOption) => void;
  onClose: () => void;
  activeIndex: number;
}
```

Renders a compact list (max 5 items) with UserAvatar, name, email. Highlights active index. Keyboard navigable (ArrowUp/Down/Enter/Escape handled by parent).

### Step 2: Add mention state to ChatView

Track mention state in ChatView:

```typescript
const [mentionState, setMentionState] = useState<{
  active: boolean;
  query: string;
  startIndex: number;
  results: MentionOption[];
  activeIndex: number;
} | null>(null);
```

On input change, detect `@` trigger: scan backwards from cursor to find `@` preceded by whitespace or start-of-input. Extract the query string after `@`. If query length >= 1, fetch from `GET /api/chat/people?q={query}` (with mock fallback from conversation participants).

### Step 3: Handle keyboard navigation

In `handleKeyDown`, when mention is active:

- ArrowDown: increment activeIndex (wrap around)
- ArrowUp: decrement activeIndex (wrap around)
- Enter: select active option, prevent send
- Escape: close typeahead

### Step 4: Insert mention into input

On select: replace the `@query` text in the input with `@DisplayName ` (with trailing space). Close typeahead.

### Step 5: Render mentions in message content

In ChatView message rendering, parse `@Name` patterns and wrap in a highlight span:

```tsx
// Simple mention highlight — matches @Word sequences
function renderContentWithMentions(content: string) {
  const parts = content.split(/(@\w[\w\s]*?\b)/g);
  return parts.map((part, i) =>
    part.startsWith("@") ? (
      <span
        key={i}
        className="rounded bg-[#00D1FF]/15 px-0.5 text-[#00D1FF] font-medium"
      >
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}
```

---

## Task 3: Message Edit & Delete

**Files:**

- Modify: `apps/api/src/chat/schemas.py` — add `EditMessageRequest`
- Modify: `apps/api/src/chat/service.py` — add `edit_message`, `soft_delete_message` functions
- Modify: `apps/api/src/chat/routes.py` — add `PATCH /messages/{id}`, `DELETE /messages/{id}` endpoints
- Create: `apps/web/src/components/molecules/MessageActions.tsx` — hover menu with edit/delete/reply
- Modify: `apps/web/src/components/organisms/ChatView.tsx` — integrate MessageActions, inline edit mode
- Modify: `apps/web/src/stores/messenger.store.ts` — add `editMessage`, `deleteMessage` actions
- Modify: `apps/web/src/lib/mock-messenger.ts` — add `editedAt` to Message type

### Step 1: Backend — Add edit/delete schemas

In `chat/schemas.py`:

```python
class EditMessageRequest(BaseModel):
    content: str
```

### Step 2: Backend — Add service functions

In `chat/service.py`:

```python
def edit_message(db, message_id, sender_id, content):
    msg = db.query(Message).filter(
        Message.id == message_id,
        Message.sender_id == sender_id,
        Message.deleted_at.is_(None),
    ).first()
    if not msg:
        return None
    msg.content = content
    msg.edited_at = datetime.now(UTC)
    db.commit()
    db.refresh(msg)
    # Return formatted message dict
    ...

def soft_delete_message(db, message_id, sender_id):
    msg = db.query(Message).filter(
        Message.id == message_id,
        Message.sender_id == sender_id,
        Message.deleted_at.is_(None),
    ).first()
    if not msg:
        return False
    msg.deleted_at = datetime.now(UTC)
    db.commit()
    return True
```

### Step 3: Backend — Add route endpoints

In `chat/routes.py`:

```python
@router.patch("/messages/{message_id}")
async def edit_message_route(message_id, request: EditMessageRequest, ...):
    # Only sender can edit their own messages
    ...

@router.delete("/messages/{message_id}")
async def delete_message_route(message_id, ...):
    # Only sender can delete their own messages
    # Broadcast message.deleted event
    ...
```

### Step 4: Frontend — Create MessageActions hover menu

`MessageActions.tsx` — a compact horizontal bar that appears on hover:

```tsx
interface MessageActionsProps {
  messageId: string;
  conversationId: string;
  isOwnMessage: boolean;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
}
```

Shows: Reply (always), Edit (own messages only), Delete (own messages only), EmojiPicker (always). Renders as a floating bar on the right side of the message.

### Step 5: Frontend — Add store actions

In `messenger.store.ts`:

```typescript
editMessage: async (conversationId, messageId, content) => {
  // Optimistic update with editedAt
  // PATCH /api/chat/messages/{messageId}
  // Mock fallback: keep optimistic
};

deleteMessage: async (conversationId, messageId) => {
  // Optimistic remove from messages array
  // DELETE /api/chat/messages/{messageId}
  // Mock fallback: keep removal
};
```

### Step 6: Frontend — Inline edit mode in ChatView

When editing: replace message text with a textarea pre-filled with content. Enter saves, Escape cancels. Show "(edited)" badge next to timestamp for edited messages:

```tsx
{
  msg.editedAt && (
    <span className="text-[9px] text-text-muted ml-1">(edited)</span>
  );
}
```

### Step 7: Frontend — Delete confirmation

On delete click, show a small confirmation inline: "Delete this message?" with Cancel/Delete buttons. Delete button is `text-accent-danger`.

---

## Task 4: File Sharing

**Files:**

- Modify: `apps/api/src/chat/schemas.py` — add file fields to `SendMessageRequest`
- Modify: `apps/api/src/chat/service.py` — handle file message type
- Create: `apps/web/src/components/molecules/FilePreview.tsx` — file attachment card
- Modify: `apps/web/src/components/organisms/ChatView.tsx` — add file drop zone, paste handler, file preview in messages
- Modify: `apps/web/src/stores/messenger.store.ts` — add `sendFileMessage` action
- Modify: `apps/web/src/lib/mock-messenger.ts` — add `fileUrl` to Message type, add mock file messages

### Step 1: Extend Message type for files

In `mock-messenger.ts`, add to Message interface:

```typescript
fileUrl?: string;
fileMimeType?: string;
```

Add a mock file message to one conversation.

### Step 2: Backend — Extend schemas for file messages

In `chat/schemas.py`, add to `SendMessageRequest`:

```python
file_name: str | None = None
file_size: int | None = None
file_url: str | None = None
file_mime_type: str | None = None
```

Update `send_message_chat` to persist these fields.

### Step 3: Backend — Add file fields to Message model

In `messenger/models.py`, add:

```python
file_name: Mapped[str | None] = mapped_column(Text, nullable=True)
file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
file_url: Mapped[str | None] = mapped_column(Text, nullable=True)
file_mime_type: Mapped[str | None] = mapped_column(Text, nullable=True)
```

Note: These columns may need an Alembic migration. Since Docker/Postgres isn't running, write the migration file manually.

### Step 4: Create FilePreview component

`FilePreview.tsx` — renders different previews based on mime type:

- Images (`image/*`): thumbnail with click-to-expand
- PDFs: icon + filename + size
- Other: generic file icon + filename + size + download link

```tsx
interface FilePreviewProps {
  fileName: string;
  fileSize?: number;
  fileUrl?: string;
  fileMimeType?: string;
}
```

Styled as a compact card (border, rounded, surface-raised bg). File size formatted as KB/MB.

### Step 5: Add file rendering to ChatView

In the message rendering section of ChatView, add a case for `messageType === "file"`:

```tsx
{
  msg.messageType === "file" && msg.fileName && (
    <FilePreview
      fileName={msg.fileName}
      fileSize={msg.fileSize}
      fileUrl={msg.fileUrl}
      fileMimeType={msg.fileMimeType}
    />
  );
}
```

### Step 6: Add paste + drag-drop to ChatView composer

Add clipboard paste handler for images:

```tsx
const handlePaste = (e: React.ClipboardEvent) => {
  const files = Array.from(e.clipboardData.files);
  if (files.length > 0) {
    e.preventDefault();
    handleFileSelect(files[0]);
  }
};
```

Add drag-drop zone around the composer:

```tsx
const [isDragging, setIsDragging] = useState(false);

onDragOver → setIsDragging(true), preventDefault
onDragLeave → setIsDragging(false)
onDrop → extract file, handleFileSelect, setIsDragging(false)
```

When dragging, show a visual overlay: "Drop file to share".

### Step 7: Add file staging in composer

When a file is selected (paste/drop/button), show a preview bar above the input:

```tsx
{
  stagedFile && (
    <div className="flex items-center gap-2 border-b border-surface-border px-3 py-1.5">
      <Paperclip size={12} className="text-text-muted" />
      <span className="text-[11px] text-text-primary truncate">
        {stagedFile.name}
      </span>
      <span className="text-[10px] text-text-muted">
        {formatFileSize(stagedFile.size)}
      </span>
      <button
        onClick={() => setStagedFile(null)}
        className="ml-auto text-text-muted hover:text-text-primary"
      >
        <X size={14} />
      </button>
    </div>
  );
}
```

### Step 8: Add sendFileMessage to store

In `messenger.store.ts`:

```typescript
sendFileMessage: async (conversationId, file) => {
  // Create optimistic message with file metadata
  // In real mode: upload file to presigned URL, then send message with file_url
  // In mock mode: create blob URL for preview
};
```

### Step 9: Add file button to composer

Add a Paperclip button next to the GIF button:

```tsx
<button onClick={() => fileInputRef.current?.click()} ...>
  <Paperclip size={16} />
</button>
<input ref={fileInputRef} type="file" className="hidden" onChange={handleFileInput} />
```

---

## Verification

After all 4 tasks:

```bash
source ~/.nvm/nvm.sh && nvm use 20 && cd apps/web && pnpm type-check && pnpm lint
```

Both must pass with zero errors (pre-existing `<img>` warnings acceptable).
