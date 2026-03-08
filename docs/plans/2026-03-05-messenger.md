# Messenger Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the Messenger dock tool — a 340px slide-over drawer with conversation list, chat view, scope toggle, and typing indicators — all driven by mock data.

**Architecture:** Messenger is NOT a module. It's a dock tool accessed via a Chat icon in the ModuleBar (alongside Otto). Opens as a 340px slide-over drawer from the right. Four conversation types: vault threads, DMs, team conversations, module conversations. Two views within the drawer: conversation list and chat view (back-navigable). Mock data with 10 conversations and 30+ messages.

**Tech Stack:** Next.js 14 App Router, TypeScript, Zustand, Tailwind CSS tokens, Lucide icons

---

## Context for Implementers

- **Messenger is a dock tool, NOT a module.** No route page needed. It renders as a drawer overlay like OttoDrawer.
- **Existing pattern:** OttoDrawer at `src/components/organisms/OttoDrawer.tsx` — slide-over from right, z-modal, backdrop at z-overlay, Escape to close.
- **ModuleBar** at `src/components/organisms/ModuleBar.tsx` — already has Otto bot icon. Add Chat icon nearby.
- **ShellLayout** at `src/components/templates/ShellLayout.tsx` — already mounts OttoDrawer. Mount MessengerDrawer similarly.
- **Node 20:** `source ~/.nvm/nvm.sh && nvm use 20` before any command.
- **Type check:** `pnpm type-check` (NOT `npx tsc`). **Lint:** `pnpm lint`.
- **Commit format:** `feat(shell): description` with `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`.

### Key Spec Details:

- Drawer width: **340px**, slide-over (overlays content, does NOT push)
- Conversation types: vault_thread, dm, team, module
- Gate dot colors: Discover=red (use chamber-discover token), Build=yellow (chamber-build), Review=purple (chamber-review), Ship=green (chamber-ship)
- Scope toggle: `[Contracts | All]` — left pill = active module name, right = "All"
- Chat: back button to list, auto-scroll, date separators, typing indicator
- Composer: Enter to send, Shift+Enter for newline
- Unread badge on dock icon (red dot with count)

### Key Existing Files:

- `apps/web/src/components/organisms/OttoDrawer.tsx` — Pattern to follow for drawer
- `apps/web/src/components/organisms/OttoChat.tsx` — Pattern for chat interface
- `apps/web/src/components/organisms/ModuleBar.tsx` — Add chat icon here
- `apps/web/src/components/templates/ShellLayout.tsx` — Mount drawer here
- `apps/web/src/stores/module.store.ts` — Has active module for scope toggle
- `apps/web/src/lib/constants.ts` — CHAMBERS with colors

---

### Task 1: Mock Messenger Data

**Files:**

- Create: `apps/web/src/lib/mock-messenger.ts`

**Types:**

```typescript
export type ConversationType = "vault_thread" | "dm" | "team" | "module";
export type MessageType = "text" | "file" | "system";
export type ChamberName = "discover" | "build" | "review" | "ship";

export interface Conversation {
  id: string;
  type: ConversationType;
  name: string | null; // null for DMs (derived from participants)
  moduleId: string | null; // set for vault_thread and module conversations
  vaultId: string | null; // set only for vault_thread
  chamber: ChamberName | null; // current chamber for vault_thread (gate dot color)
  participants: ConversationParticipant[];
  lastMessage: MessagePreview | null;
  unreadCount: number;
  muted: boolean;
  createdAt: string;
}

export interface ConversationParticipant {
  userId: string;
  name: string;
  avatarUrl?: string;
  online: boolean;
}

export interface MessagePreview {
  authorName: string;
  content: string;
  timestamp: string;
}

export interface Message {
  id: string;
  conversationId: string;
  authorId: string | null; // null for system messages
  authorName: string;
  authorAvatar?: string;
  content: string;
  messageType: MessageType;
  fileName?: string;
  fileSize?: number;
  createdAt: string;
}
```

**Config constants:**

```typescript
export const CONVERSATION_TYPE_CONFIG: Record<
  ConversationType,
  { label: string; icon: string }
> = {
  vault_thread: { label: "Vault Thread", icon: "Circle" },
  dm: { label: "Direct Message", icon: "User" },
  team: { label: "Team", icon: "Users" },
  module: { label: "Module", icon: "Hash" },
};

export const CHAMBER_DOT_CONFIG: Record<
  ChamberName,
  { color: string; label: string }
> = {
  discover: { color: "bg-[var(--chamber-discover)]", label: "Discover" },
  build: { color: "bg-[var(--chamber-build)]", label: "Build" },
  review: { color: "bg-[var(--chamber-review)]", label: "Review" },
  ship: { color: "bg-[var(--chamber-ship)]", label: "Ship" },
};
```

**Mock data (10 conversations):**

1. Henderson MSA (vault_thread, contracts, review chamber, 3 unread)
2. Acme Distribution Agreement (vault_thread, contracts, build chamber, 0 unread)
3. Summit Publishing License (vault_thread, contracts, ship chamber, 1 unread)
4. DM with Ana Chen (dm, online, 0 unread)
5. DM with Marco Li (dm, offline, 2 unread)
6. #design-reviews (team, 1 unread)
7. #onboarding (team, 0 unread)
8. #contracts-general (module, contracts, 0 unread)
9. #crm-general (module, crm, 0 unread)
10. #tasks-general (module, tasks, 0 unread)

**Mock messages (MOCK_MESSAGES: Record<string, Message[]>):**

- Henderson MSA thread: 8 messages (system creation, extraction discussion, SLA mention)
- DM with Ana: 5 messages (casual work chat)
- #design-reviews: 4 messages
- Other conversations: 2-3 messages each

Each conversation should have realistic messages with timestamps spread across the last few days. Include at least 1 system message per vault thread.

**Step 1:** Create the file with all types and mock data.
**Step 2:** Run `pnpm type-check`.
**Step 3:** Commit: `feat(shell): add messenger mock data and types`

---

### Task 2: Messenger Zustand Store

**Files:**

- Create: `apps/web/src/stores/messenger.store.ts`

**Store interface:**

```typescript
interface MessengerState {
  conversations: Conversation[];
  messages: Record<string, Message[]>; // keyed by conversationId
  isLoading: boolean;

  // UI state
  isDrawerOpen: boolean;
  activeConversationId: string | null;
  scope: "module" | "global";
  searchQuery: string;
  typingUsers: Record<string, string[]>; // conversationId -> user names

  // Actions
  fetchMessenger: () => Promise<void>;
  toggleDrawer: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  openConversation: (id: string) => void;
  backToList: () => void;
  setScope: (scope: "module" | "global") => void;
  setSearchQuery: (query: string) => void;
  sendMessage: (conversationId: string, content: string) => void;
  markAsRead: (conversationId: string) => void;

  // Derived
  filteredConversations: (activeModule: string) => Conversation[];
  totalUnread: () => number;
}
```

**Implementation details:**

- `fetchMessenger()` — try apiFetch, catch → load MOCK_CONVERSATIONS and MOCK_MESSAGES
- `filteredConversations(activeModule)` — when scope="module", show vault threads + module conversation for activeModule + all DMs. When scope="global", show all. Filter by searchQuery on name.
- `sendMessage()` — append new Message to messages[conversationId], update conversation's lastMessage and move it to top
- `markAsRead()` — set unreadCount = 0 for that conversation
- `openConversation(id)` — sets activeConversationId, calls markAsRead(id)
- `totalUnread()` — sum of unreadCount across non-muted conversations
- Simulate typing: when user sends a message, after 1.5s set a typing user for 2s, then add a mock reply

**Step 1:** Create the store file.
**Step 2:** Run `pnpm type-check`.
**Step 3:** Commit: `feat(shell): add messenger Zustand store`

---

### Task 3: ConversationListItem Molecule

**Files:**

- Create: `apps/web/src/components/molecules/ConversationListItem.tsx`

**What to build:**

A single row in the conversation list. Anatomy from spec:

```
[icon] Conversation Name              [time]
       Author: Last message preview... (3)
```

**Props:**

```typescript
interface ConversationListItemProps {
  conversation: Conversation;
  onClick: () => void;
}
```

**Rendering rules by type:**

- **vault_thread:** Gate dot (colored by chamber) + vault name
- **dm:** First letter avatar + other participant name + online green dot
- **team:** Hash icon (#) + team name
- **module:** Hash icon (#) + module name + "-general"

**Styling:**

- Container: `px-3 py-2.5 cursor-pointer hover:bg-surface-hover transition-colors`
- Name: `text-sm font-medium text-text-primary truncate`
- Preview: `text-xs text-text-muted truncate` — "AuthorName: content..."
- Time: `text-[10px] text-text-muted` — relative ("2m", "1h", "3d")
- Unread badge: `bg-accent-error text-white text-[10px] rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center`
- Gate dot: 8px circle, color from CHAMBER_DOT_CONFIG
- Online dot: 8px circle, bg-accent-success, positioned on avatar

**Step 1:** Create the component.
**Step 2:** Run `pnpm type-check`.
**Step 3:** Commit: `feat(shell): add ConversationListItem molecule`

---

### Task 4: ConversationList Organism

**Files:**

- Create: `apps/web/src/components/organisms/ConversationList.tsx`

**What to build:**

The default view when Messenger opens — search bar, scope toggle, and scrollable conversation list.

**Layout:**

```
+--------------------------------------+
|  [search icon]  Search...            |
|  [ Contracts  |  All ]               |
+--------------------------------------+
|  [conversation list items...]        |
+--------------------------------------+
```

**Props:**

```typescript
interface ConversationListProps {
  conversations: Conversation[];
  scope: "module" | "global";
  activeModule: string;
  searchQuery: string;
  onSelectConversation: (id: string) => void;
  onScopeChange: (scope: "module" | "global") => void;
  onSearchChange: (query: string) => void;
}
```

**Implementation:**

- Search bar: text input with Search icon, filters in real-time
- Scope toggle: two pills side by side. Left pill shows activeModule label (capitalize first letter). Right pill is "All". Active pill gets `bg-accent-primary/15 text-accent-primary`, inactive gets `text-text-muted`
- List: sorted by lastMessage timestamp (most recent first), rendered with ConversationListItem
- Empty state: "No conversations found" when search returns nothing

**Step 1:** Create the component.
**Step 2:** Run `pnpm type-check`.
**Step 3:** Commit: `feat(shell): add ConversationList organism`

---

### Task 5: ChatView Organism

**Files:**

- Create: `apps/web/src/components/organisms/ChatView.tsx`

**What to build:**

The chat interface shown when a conversation is opened. Matches the spec layout:

```
+--------------------------------------+
|  [<] Henderson MSA        [gate dot] |
+--------------------------------------+
|  [messages...]                       |
|  Ana is typing...                    |
+--------------------------------------+
|  [  Type a message...       ] [send] |
+--------------------------------------+
```

**Props:**

```typescript
interface ChatViewProps {
  conversation: Conversation;
  messages: Message[];
  typingUsers: string[];
  onBack: () => void;
  onSendMessage: (content: string) => void;
}
```

**Implementation:**

1. **Header:** Back arrow button + conversation name + context indicator (gate dot for vault threads, online dot for DMs, member count badge for team/module)

2. **Message list:** Scrollable div, auto-scroll to bottom on new messages.
   - Date separators between messages from different days
   - System messages: italic, muted, centered, no avatar
   - Text messages: avatar (first letter) + author name + time + content
   - Group consecutive messages from same author (only show avatar/name on first)

3. **Typing indicator:** Below messages, "Ana is typing..." or "Ana and Marco are typing..."

4. **Composer:** Input + Send button. Enter to send, Shift+Enter for newline. Use textarea that auto-expands (1-5 lines). Send button disabled when empty.

**Time formatting:**

- Today: "10:30 AM"
- Yesterday: "Yesterday 10:30 AM"
- Older: "Mar 1"

**Step 1:** Create the component.
**Step 2:** Run `pnpm type-check`.
**Step 3:** Commit: `feat(shell): add ChatView organism`

---

### Task 6: MessengerDrawer Organism + Shell Integration

**Files:**

- Create: `apps/web/src/components/organisms/MessengerDrawer.tsx`
- Modify: `apps/web/src/components/templates/ShellLayout.tsx`
- Modify: `apps/web/src/components/organisms/ModuleBar.tsx`

**What to build:**

1. **MessengerDrawer:** 340px slide-over drawer (same pattern as OttoDrawer):
   - Fixed position, right-0, top-0, h-full, z-modal (var(--z-modal))
   - Backdrop at z-overlay
   - Escape key closes
   - Transition: translate-x animation
   - Contains ConversationList or ChatView based on activeConversationId
   - Pulls state from useMessengerStore
   - Gets activeModule from useModuleStore

2. **ShellLayout changes:**
   - Import MessengerDrawer + useMessengerStore
   - Mount `<MessengerDrawer />` alongside OttoDrawer
   - Add Cmd+M keyboard shortcut for toggle (alongside Cmd+K for search, Cmd+J for Otto)
   - Call fetchMessenger() on mount

3. **ModuleBar changes:**
   - Import MessageCircle from lucide-react
   - Import useMessengerStore
   - Add Chat button with unread badge (same pattern as Bell icon for notifications)
   - Place near the Otto bot icon
   - Show red badge with totalUnread() count

**Step 1:** Create MessengerDrawer.
**Step 2:** Update ShellLayout — mount drawer, add Cmd+M shortcut, fetch on mount.
**Step 3:** Update ModuleBar — add Chat icon with unread badge.
**Step 4:** Run `pnpm type-check && pnpm lint`.
**Step 5:** Commit: `feat(shell): add MessengerDrawer with shell integration`

---

### Task 7: Component Registry Update + Final Verification

**Files:**

- Modify: `docs/registry/components.json`

**Add 4 entries:**

```json
{
  "name": "ConversationListItem",
  "level": "molecule",
  "path": "src/components/molecules/ConversationListItem.tsx",
  "description": "Single conversation row with type-specific icon, preview, time, and unread badge",
  "milestone": "M21"
},
{
  "name": "ConversationList",
  "level": "organism",
  "path": "src/components/organisms/ConversationList.tsx",
  "description": "Searchable conversation list with module/global scope toggle",
  "milestone": "M21"
},
{
  "name": "ChatView",
  "level": "organism",
  "path": "src/components/organisms/ChatView.tsx",
  "description": "Chat interface with message list, date separators, typing indicator, and composer",
  "milestone": "M21"
},
{
  "name": "MessengerDrawer",
  "level": "organism",
  "path": "src/components/organisms/MessengerDrawer.tsx",
  "description": "340px slide-over drawer for Messenger dock tool with conversation list and chat views",
  "milestone": "M21"
}
```

**Step 1:** Update registry.
**Step 2:** Run `pnpm type-check && pnpm lint` — both must pass clean.
**Step 3:** Commit: `feat(shell): register messenger components in registry`
