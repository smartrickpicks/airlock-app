# Omni-Channel Routing

> **Status:** SPECCED — external message ingestion, AI triage, and deterministic vault routing.

> **Key Insight:** The front door of Airlock is not a web form — it is a conversation. An AI agent at the edge qualifies intent and routes to the right vault or pool in real time. This is the feature that makes Airlock a system of action for external relationships, not just an internal tool.

---

## What This Spec Covers

The lifecycle of a message or contact that originates **outside** the organization (prospect, partner, client, vendor) and needs to reach the right internal vault, pool, or person.

---

## Entry Points

| Channel | Mechanism | POC | Scale |
|---|---|---|---|
| **iMessage / SMS** | Mac mini bridge polling `chat.db` every 2s | 1 Mac, 1 Apple ID, user's number | Add Mac minis as needed (50 contacts/day per Mac) |
| **Web Widget** | Embedded JS widget on org website | Mobile: `sms:` URI (prospect sends first) | Desktop: collect phone + send one bridge text |
| **Email** | Inbound SMTP parse (SendGrid Inbound Parse) | Manual routing rule | BullMQ queue for classification |
| **Web Chat** | Widget-initiated real-time chat | Session-based | Pool assignment |

**Rate limit architecture (iMessage):**
- Conservative: max 50 outbound messages/day per Apple ID
- Critical rule: **make the prospect message first** — eliminates "Report Junk" risk entirely
- Poll `chat.db` every 2 seconds in read-only mode (avoids WAL lag false positives)
- Disable macOS auto-update on all bridge Macs

---

## Message Lifecycle

```
INBOUND MESSAGE → NORMALIZE → CLASSIFY → ROUTE → ASSIGN → VAULT CONTEXT → RESPONSE
```

### Stage 1 — Inbound & Normalize

Every channel adapter converts its native format into a canonical `InboundMessage`:

```typescript
interface InboundMessage {
  id: string;                    // Our ULID
  externalId: string;            // Channel-native message ID
  channel: 'imessage' | 'sms' | 'email' | 'webchat';
  direction: 'inbound' | 'outbound';
  contactIdentifier: string;     // E.164 phone number or email address
  conversationId: string;        // Threaded conversation ULID (see threading below)
  body: string;                  // Normalized UTF-8 text
  attachments: Attachment[];     // File references
  meta: Record<string, unknown>; // Channel-specific raw data
  receivedAt: Date;
}
```

**Threading rules:**
- iMessage/SMS: thread by `(contactIdentifier, channel)` pair
- Email: thread by `References` and `In-Reply-To` headers
- Web chat: thread by session ID
- Inactivity window: 24 hours of silence = new conversation (new `conversationId`)

**Deduplication:** Composite unique index on `(external_id, channel)` in the `communications` table.

---

### Stage 2 — AI Triage (Router Agent)

The Router Agent is a PydanticAI agent that runs on every new inbound message.

**Agent inputs:**
- The normalized `InboundMessage`
- Contact record lookup (does this phone/email match a known contact in the vault hierarchy?)
- Recent conversation history (last 5 messages in this thread)
- Org routing rules (deterministic JSON config — evaluated first, before AI)

**Routing decision tree:**

```
1. DETERMINISTIC RULES FIRST (no AI)
   → Is this a known contact linked to an active vault?
      YES → Route directly to vault's pool
      NO ↓

2. AI CLASSIFICATION
   → What is the intent of this message?
      Intents: new_inquiry | support | contract_question | meeting_request |
               payment | complaint | referral | spam | unknown

3. AI ENTITY EXTRACTION
   → Can we identify who this person is or what deal they're referencing?
      Extract: company name, person name, deal reference, topic

4. ROUTING OUTPUT
   → {intent, confidence, suggested_vault_id?, suggested_pool_id, clarification_needed}
```

**Clarification flow (when intent is ambiguous):**
The Router Agent sends a clarifying question back to the contact via the same channel:

```
"Hi — I'm the Airlock assistant for [Org Name].
 Who are you trying to reach, or what can I help you with today?"
```

This is a **Conversational Ask workflow node** — the conversation is held in `waiting` state in the database, no Redis job active, until the contact responds.

---

### Stage 3 — Routing Outcomes

| Outcome | What happens | Who sees it |
|---|---|---|
| **Direct vault route** | Message appended to vault's Signal panel as an external event | Vault's assigned Builder/Owner |
| **Pool assignment** | Message enters a shared pool queue, assigned to next available agent | Pool members |
| **New lead creation** | A new `counterparty` vault is created at Level 3, message linked to it | CRM team |
| **Escalation** | Flagged as high-priority, Slack/notification to a human | Admin or designated escalation contact |
| **Spam/ignore** | Logged, no response, no vault created | Admin audit log only |

---

### Stage 4 — Pool Model (Shared Inbox)

Pools are internal teams that share incoming contact streams. Modeled on Heymarket's shared inbox pattern.

**Assignment strategies:**
- `balanced` (default) — assign to agent with fewest active conversations
- `round_robin` — rotate through available agents
- `manual` — messages queue unassigned until claimed
- `territory` — assign based on contact's region or account tier

**Collision detection (from day one):**
- When an agent opens a conversation: broadcast WebSocket event `{type: "agent_viewing", conversation_id, agent}`
- When an agent starts typing: broadcast `{type: "agent_typing", conversation_id, agent}`
- On reply submission: optimistic lock check — if another reply was submitted since the agent opened the conversation, show conflict dialog

**Presence:** Redis pub/sub for real-time agent status. Agents with status `away` are skipped in round-robin.

---

### Stage 5 — Vault Context

Once a message is linked to a vault (new or existing), all context flows to the internal team:

**In the Signal panel:**
```
[New External Message]  ────────────────────────────────
  iMessage · +1 (310) 555-0192 · 2 min ago
  "Hi, I wanted to follow up on the distribution agreement
   we discussed last week."

  Router: Matched → Sony Distribution 2024 (87% confidence)
  [Confirm Route]  [Re-route]  [Create New Vault]
```

**In the Orchestrate panel:**
The full conversation thread is visible alongside the vault's field data.

---

## Database Schema

### `contacts` table

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT (ULID) | Primary key |
| `workspace_id` | TEXT (ULID) | RLS key |
| `vault_id` | TEXT (ULID) | FK to counterparty vault (Level 3), nullable if unresolved |
| `identifier` | TEXT | E.164 phone or email |
| `channel` | TEXT | imessage, sms, email, webchat |
| `display_name` | TEXT | Name from contact card or extracted from message |
| `company_name` | TEXT | Extracted or manually entered |
| `metadata` | JSONB | Channel-specific data, enrichment fields |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |
| `deleted_at` | TIMESTAMPTZ | |

### `communications` table

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT (ULID) | Primary key |
| `workspace_id` | TEXT (ULID) | RLS key |
| `contact_id` | TEXT (ULID) | FK to contacts |
| `vault_id` | TEXT (ULID) | FK to vaults, nullable until routed |
| `pool_id` | TEXT (ULID) | FK to pools, nullable |
| `assigned_agent_id` | TEXT (ULID) | FK to users, nullable |
| `external_id` | TEXT | Channel-native message ID |
| `channel` | TEXT | imessage, sms, email, webchat |
| `conversation_id` | TEXT (ULID) | Thread grouping key |
| `direction` | TEXT | inbound, outbound |
| `body` | TEXT | Normalized message text |
| `attachments` | JSONB | Array of `{url, type, size}` |
| `router_intent` | TEXT | AI-classified intent |
| `router_confidence` | FLOAT | 0.0 – 1.0 |
| `router_suggested_vault_id` | TEXT | |
| `routing_status` | TEXT | pending, routed, clarifying, escalated, ignored |
| `meta` | JSONB | Channel-specific raw payload |
| `received_at` | TIMESTAMPTZ | When the message arrived |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### `pools` table

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT (ULID) | Primary key |
| `workspace_id` | TEXT (ULID) | RLS key |
| `name` | TEXT | "Inbound Sales", "Client Support" |
| `assignment_method` | TEXT | balanced, round_robin, manual, territory |
| `sla_response_seconds` | INTEGER | Target first-response time |
| `metadata` | JSONB | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |
| `deleted_at` | TIMESTAMPTZ | |

### `pool_agents` table

| Column | Type | Notes |
|---|---|---|
| `pool_id` | TEXT (ULID) | FK to pools |
| `agent_id` | TEXT (ULID) | FK to users |
| `is_active` | BOOLEAN | Available for assignment |
| `last_assigned_at` | TIMESTAMPTZ | For round-robin tracking |
| `open_conversation_count` | INTEGER | For balanced assignment |

### `routing_rules` table

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT (ULID) | Primary key |
| `workspace_id` | TEXT (ULID) | RLS key |
| `priority` | INTEGER | Evaluated in ascending order (1 = first) |
| `conditions` | JSONB | `{contact_identifier_pattern?, channel?, keywords?, company_pattern?}` |
| `action` | JSONB | `{type: route_to_vault | route_to_pool | create_lead | escalate | ignore, target_id?}` |
| `is_active` | BOOLEAN | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/webhooks/imessage` | iMessage bridge webhook |
| `POST` | `/api/v1/webhooks/sms` | Twilio SMS webhook |
| `POST` | `/api/v1/webhooks/email` | SendGrid inbound parse webhook |
| `POST` | `/api/v1/webhooks/webchat` | Web widget session message |
| `GET` | `/api/v1/communications` | List all communications (filterable by vault, pool, status) |
| `GET` | `/api/v1/communications/{id}` | Get single communication with full thread |
| `POST` | `/api/v1/communications/{id}/route` | Manually route or re-route a communication |
| `POST` | `/api/v1/communications/{id}/reply` | Send outbound reply via originating channel |
| `GET` | `/api/v1/pools` | List pools |
| `POST` | `/api/v1/pools` | Create pool |
| `PATCH` | `/api/v1/pools/{id}` | Update pool settings |
| `GET` | `/api/v1/routing-rules` | List routing rules |
| `POST` | `/api/v1/routing-rules` | Create routing rule |
| `PUT` | `/api/v1/routing-rules/{id}` | Update routing rule |
| `DELETE` | `/api/v1/routing-rules/{id}` | Soft-delete routing rule |

---

## Frontend — What Needs to Exist

### 1. Communications Inbox (new view in CRM module)
**Path:** `/crm/communications`
**What:** Unified inbox showing all inbound messages across channels. Filterable by channel, routing_status, pool, assignee. Each row shows: channel icon, contact identifier, message preview, routing status badge, time since received.

### 2. Routing Decision Card (in Signal panel)
**Where:** Vault Signal panel, when a communication has been routed to this vault
**What:** Shows the inbound message, AI router confidence, and action buttons: [Confirm Route] [Re-route] [Create New Vault]

### 3. Conversation Thread View (in Orchestrate panel)
**Where:** Vault Orchestrate panel, new tab: "Communications"
**What:** Full conversation history with this contact. Inline reply composer. Shows sent/received with timestamps. Channel icon per message.

### 4. Routing Rules Builder (in Admin)
**Path:** `/admin/routing-rules`
**What:** List of deterministic routing rules with priority order. Each rule has condition builder (channel, identifier pattern, keyword match) and action selector (route to vault/pool, create lead, escalate, ignore). Drag-to-reorder priority.

### 5. Pool Management (in Admin)
**Path:** `/admin/pools`
**What:** List of pools with member assignment, assignment strategy selector, SLA configuration.

---

## Router Agent — AI System Prompt

```
You are the Airlock routing assistant for [WORKSPACE_NAME].
Your job is to classify the intent of inbound messages and route them to the correct internal team or vault.

When analyzing a message, return a JSON object with:
- intent: one of [new_inquiry, support, contract_question, meeting_request, payment, complaint, referral, spam, unknown]
- confidence: float 0.0-1.0
- entities: {person_name?, company_name?, deal_reference?, topic?}
- suggested_vault_id: ULID of matching vault, if found in context
- clarification_needed: boolean
- clarification_question: string (only if clarification_needed is true)

Active vaults context: [VAULT_LIST]
Known contacts: [CONTACT_LIST]

Always respond in JSON. Never hallucinate vault IDs — only use IDs from the provided context.
```

---

## Demo Sequence (Show Don't Tell)

1. External prospect texts the org's iMessage number: "Hey, I'm interested in a distribution deal for my label."
2. Airlock receives the message (iMessage bridge picks it up from `chat.db`)
3. Router Agent classifies: `intent = new_inquiry`, `confidence = 0.91`, no existing vault match
4. Router Agent replies via iMessage: "Hi! I'm the Airlock assistant for Summit Publishing. What label are you with and what territory are you looking at? I'll get you to the right person."
5. Prospect replies: "I'm with Acme Records. Looking at US/Canada distribution."
6. Router Agent: matches to Acme Records vault (or creates new lead vault)
7. Internal team sees in CRM Communications inbox: new thread, routed to "Inbound Sales" pool
8. Sales rep claims conversation, sees full Acme Records context in Orchestrate panel
9. Responds inline — message delivered via iMessage, no context switch
