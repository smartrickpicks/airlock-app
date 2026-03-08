# MCP Registry & Skills — UI Design Spec

> **Status:** DESIGN SPEC — ready for implementation
> **Parent spec:** `docs/specs/admin/overview.md` (Connectors section)
> **Placement:** MCP Registry lives under **Admin > Connectors** as a sub-section. It does NOT create a new top-level admin nav item. The admin overlay retains its canonical 9 sections; MCP Registry is accessed via the Connectors tab.
> **Architecture plan:** `docs/plans/2026-03-06-mcp-registry-and-skills.md`
> **Stack:** Next.js 14 App Router · Tailwind · CSS custom properties (tokens.css) · Fira Sans · Lucide React icons
>
> ### Feature Control Plane Integration
>
> - **Feature flag:** `mcp_registry.enabled` (default: `true` for dogfood)
> - **Audit events:** `mcp.tool_registered`, `mcp.tool_removed`, `mcp.permission_granted`, `mcp.permission_revoked`
> - **Circuit breaker:** MCP tool invocations respect the Feature Control Plane's failure detection and auto-disable thresholds

---

## Design System Applied

| Token               | Value     | Usage                            |
| ------------------- | --------- | -------------------------------- |
| `--surface-base`    | `#0B0E14` | Page/overlay background          |
| `--surface-raised`  | `#0F1219` | Cards, section panels            |
| `--surface-overlay` | `#151923` | Row hovers, dropdowns            |
| `--surface-border`  | `#1E2330` | Card borders, dividers           |
| `--accent-primary`  | `#00D1FF` | Active state, primary CTA, links |
| `--accent-success`  | `#22C55E` | Connected / active status        |
| `--accent-warning`  | `#F59E0B` | Pending / degraded               |
| `--accent-danger`   | `#EF4444` | Error / disconnected             |
| `--text-primary`    | `#E2E8F0` | Primary labels                   |
| `--text-secondary`  | `#94A3B8` | Meta text, descriptions          |
| `--text-muted`      | `#64748B` | Placeholder, disabled            |

**Typography:** Fira Sans, 13px base, 1.5 line-height
**Icons:** Lucide React SVG only — no emoji
**Motion:** 150ms micro-interactions, 250ms panel transitions

---

## 1. Admin Overlay — Connectors Section (Expanded)

The existing Connectors nav item in Workspace Admin expands into three sub-tabs.

### 1.1 Section Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ WORKSPACE ADMIN                                    [✕ Close]    │
├──────────────┬──────────────────────────────────────────────────┤
│ > Dashboard  │  Connectors                                      │
│ > Members    │  ┌─────────────────────────────────────────────┐ │
│ > Roles      │  │ [AI Providers] [MCP Servers] [Integrations] │ │
│ > Flags      │  └─────────────────────────────────────────────┘ │
│ > Calibration│                                                   │
│ > Modules    │  [Active tab content]                            │
│ ▶ Connectors │                                                   │
│ > Audit Log  │                                                   │
│ > Health     │                                                   │
└──────────────┴──────────────────────────────────────────────────┘
```

Sub-tabs are pill-style, same pattern as existing admin tab groups:

- Active: `bg-[--surface-overlay] text-[--text-primary] border border-[--surface-border]`
- Inactive: `text-[--text-secondary] hover:text-[--text-primary]`

---

### 1.2 AI Providers Tab

```
┌─────────────────────────────────────────────────────────────────┐
│ AI Providers                               [+ Add Provider]     │
│ Configure which LLM Otto uses for this workspace.               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐    │
│ │ ● Anthropic (Claude)                    [DEFAULT] [Edit] │    │
│ │   claude-sonnet-4-20250514 · All roles                   │    │
│ │   Last request: 2m ago · $0.14 today                     │    │
│ └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐    │
│ │ ● OpenRouter                                      [Edit] │    │
│ │   anthropic/claude-opus-4 · Owner+ only                  │    │
│ │   Last request: 1h ago · $0.02 today                     │    │
│ └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐    │
│ │ ○ Custom Endpoint              [DISABLED]        [Edit]  │    │
│ │   https://llm.internal.co · Not configured               │    │
│ └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Provider Card spec:**

```
card:
  background: var(--surface-raised)
  border: 1px solid var(--surface-border)
  border-radius: var(--radius-lg)          ← 10px
  padding: 16px
  transition: border-color 150ms ease

card:hover:
  border-color: var(--surface-border) at 50% opacity towards accent-primary
  background: var(--surface-overlay)

left accent bar (active provider only):
  border-left: 3px solid var(--accent-primary)
  box-shadow: inset 3px 0 8px rgba(0,209,255,0.08)

status dot:
  width: 8px, height: 8px, border-radius: full
  active  → background: var(--accent-success)  + box-shadow: 0 0 6px var(--accent-success)
  error   → background: var(--accent-danger)
  disabled → background: var(--text-muted)

[DEFAULT] badge:
  font-size: 9px, font-weight: 700, text-transform: uppercase, letter-spacing: 0.5px
  background: rgba(0,209,255,0.12), color: var(--accent-primary)
  border-radius: var(--radius-sm), padding: 2px 8px

[DISABLED] badge:
  same as DEFAULT but: background: rgba(100,116,139,0.15), color: var(--text-muted)

[Edit] button:
  height: 32px, padding: 0 12px
  background: var(--surface-overlay)
  border: 1px solid var(--surface-border)
  border-radius: var(--radius-md)
  color: var(--text-secondary)
  hover: color var(--text-primary), border-color shifts to --accent-primary at 40%
```

**Add Provider drawer (slides in from right, 400px):**

```
┌──────────────────────────────────────────────────┐
│ Add AI Provider                           [✕]    │
├──────────────────────────────────────────────────┤
│                                                  │
│ Provider Type                                    │
│ ┌──────────────────────────────────────────────┐ │
│ │ ○ Anthropic   ○ OpenAI   ○ OpenRouter        │ │
│ │ ○ Azure OpenAI            ○ Custom URL       │ │
│ └──────────────────────────────────────────────┘ │
│                                                  │
│ Display Name                                     │
│ [Our Claude Instance                           ] │
│                                                  │
│ API Key                              [👁 Show]   │
│ [sk-ant-••••••••••••••••••••••••••••          ] │
│                                                  │
│ Model                                            │
│ [claude-sonnet-4-20250514            ▼         ] │
│                                                  │
│ Role Access                                      │
│ [All roles ▼]                                    │
│                                                  │
│ [Test Connection]    [Cancel]  [Save Provider]   │
└──────────────────────────────────────────────────┘
```

**Test Connection feedback (inline, below button):**

```
Testing...           → spinner + "Connecting to Anthropic..." text-muted
Success              → ✓ green dot + "Connected · claude-sonnet-4-20250514 · latency 320ms"
Error                → ✕ red dot + "Auth failed: invalid API key" + [View Docs] link
```

---

### 1.3 MCP Servers Tab

The main surface for the MCP Registry.

```
┌─────────────────────────────────────────────────────────────────┐
│ MCP Servers                                [+ Add MCP Server]   │
│ Connect external tool servers. Otto gains their tools based     │
│ on each user's role.                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ ● Vibe Prospecting                [ACTIVE]  [Manage →]   │   │
│ │   explorium.ai · 7 tools · Builder+ in CRM/Contracts     │   │
│ │   Credits: 847 / 1,000 this month  ████████░░  [↻ Sync] │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ ● Google Workspace                [ACTIVE]  [Manage →]   │   │
│ │   google.com · 12 tools · All roles                      │   │
│ │   Service account · zachary@acmerecords.com · [↻ Sync]  │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ ⚠ Salesforce MCP              [ERROR]      [Manage →]   │   │
│ │   Auth token expired · 0 / 5 tools active                │   │
│ │   Last synced: 3 days ago · [Reconnect]                  │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Credit bar spec:**

```
container: height 6px, border-radius full, background var(--surface-sunken), width 120px
fill: height 6px, border-radius full
  0-80%:  background var(--accent-success)
  80-95%: background var(--accent-warning)
  95%+:   background var(--accent-danger) + pulse animation
```

**[+ Add MCP Server] — paste URL flow:**

```
┌──────────────────────────────────────────────────┐
│ Add MCP Server                            [✕]    │
├──────────────────────────────────────────────────┤
│                                                  │
│ Server URL                                       │
│ ┌────────────────────────────────────────────┐  │
│ │ https://mcp.explorium.ai/mcp               │  │
│ └────────────────────────────────────────────┘  │
│   Paste any MCP endpoint, GitHub URL, or npm     │
│   package URL — we'll handle discovery.          │
│                                                  │
│ Auth Type                                        │
│ [API Key ▼]                                      │
│                                                  │
│ API Key                                          │
│ [                                              ] │
│                                                  │
│ ┌──────────────────────────────────────────────┐ │
│ │           [Discover Tools →]                 │ │
│ └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

**Discovery in progress (replaces button area):**

```
┌──────────────────────────────────────────────────┐
│ Discovering tools...                             │
│ ────────────────────────────────── (animated)    │
│                                                  │
│ ✓ Reached mcp.explorium.ai                       │
│ ✓ Auth validated                                 │
│ ↻ Loading tool manifest...           (spinner)   │
└──────────────────────────────────────────────────┘
```

**Discovery complete (same drawer, expanded):**

```
┌──────────────────────────────────────────────────┐
│ Vibe Prospecting — 7 tools found        [✕]     │
├──────────────────────────────────────────────────┤
│                                                  │
│ Display Name                                     │
│ [Vibe Prospecting                              ] │
│                                                  │
│ Default Access                                   │
│ [Owner only ▼]  ← conservative default          │
│                                                  │
│ Tools discovered:                                │
│ ✓ match-business                                 │
│ ✓ fetch-businesses                               │
│ ✓ business-enrichment                            │
│ ✓ fetch-prospects                                │
│ ✓ prospect-enrichment                            │
│ ✓ business-events                                │
│ ✓ export-to-csv                                  │
│                                                  │
│ Permissions can be customized after adding.      │
│                                                  │
│         [Cancel]  [Add Server →]                │
└──────────────────────────────────────────────────┘
```

---

### 1.4 MCP Server Detail Page — Tool Permission Matrix

Accessed via [Manage →] on any server card. Full-width content area, replaces the tab content.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ← Back to MCP Servers                                                           │
│                                                                                 │
│ Vibe Prospecting                          ● ACTIVE         [Sync] [Disconnect] │
│ explorium.ai/mcp · HTTP · API Key · 847/1,000 credits this month               │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Tool Permissions                                               [+ User Override] │
│                                                                                 │
│  Tool                      Builder  Gatekeeper   Owner  Executive   Modules    │
│ ─────────────────────────────────────────────────────────────────────────────  │
│  match-business               ✓          ✓          ✓        ✓      CRM, CTR   │
│  fetch-businesses             ✓          ✓          ✓        ✓      CRM, CTR   │
│  business-enrichment          —          ✓          ✓        ✓      CRM        │
│  fetch-prospects              ✓          ✓          ✓        ✓      CRM, CTR   │
│  prospect-enrichment          ✓          ✓          ✓        ✓      CRM        │
│  business-events              —          —          ✓        ✓      CRM        │
│  export-to-csv                —          —          ✓        ✓      all        │
│                                                                                 │
│ [Save Changes]                                                                  │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│ User Overrides                                                  [+ Add Override] │
│                                                                                 │
│  User                   Type       Tools              Expires    [Remove]       │
│  Sarah (Builder)        ALLOW      all tools          never                    │
│  Guest @acme            BLOCK      export-to-csv      2026-06-01               │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Permission matrix cell spec:**

```
cell container: min-width 80px, height 44px, display flex, align-items center, justify-content center

✓ cell (allowed):
  background: rgba(34,197,94,0.08)
  icon: check (16px, color --accent-success)
  hover: background rgba(34,197,94,0.15), cursor pointer
  click: toggles to denied

— cell (denied):
  background: var(--surface-sunken)
  icon: minus (16px, color --text-muted)
  hover: background rgba(239,68,68,0.08), cursor pointer

row hover:
  entire row: background var(--surface-overlay), transition 150ms

tool name column:
  width: 200px, sticky left, font-family mono (--font-mono)
  color: var(--text-primary), font-size: 12px

role header:
  font-size: 9px, font-weight 700, text-transform uppercase
  letter-spacing: 0.5px, color: var(--text-muted)
  padding-bottom: 8px

header separator:
  border-bottom: 2px solid var(--surface-border)

modules pill:
  font-size: 10px, background: rgba(99,102,241,0.12)
  color: var(--accent-secondary), border-radius: var(--radius-full)
  padding: 2px 8px, cursor: pointer (click to edit scope)
```

**[Save Changes] button:**

```
height: 36px, padding: 0 20px
background: var(--accent-primary), color: var(--text-inverse)
border-radius: var(--radius-md), font-weight: 600, font-size: 13px
hover: background var(--accent-primary-hover)
disabled (no unsaved changes): background var(--surface-overlay), color var(--text-muted)
transition: all 150ms ease
```

---

## 2. Personal Settings — Connected Accounts

Replaces the current stub in Personal Settings overlay.

```
┌────────────────────────────────────────────────────────┐
│ PERSONAL SETTINGS                         [✕ Close]   │
├──────────────┬─────────────────────────────────────────┤
│ > Profile    │ Connected Accounts                      │
│ > Notifs     │                                         │
│ > Appearance │ MY CONNECTIONS                [+ Add]  │
│ > Keybindings│ ┌───────────────────────────────────┐  │
│ ▶ Accounts   │ │ ● Google                [Manage]  │  │
│              │ │   zachary@acmerecords.com          │  │
│              │ │   Gmail · Calendar · Drive         │  │
│              │ │   Expires in 87 days               │  │
│              │ └───────────────────────────────────┘  │
│              │ ┌───────────────────────────────────┐  │
│              │ │ ○ Notion               [Connect]  │  │
│              │ │   Personal notes & databases       │  │
│              │ └───────────────────────────────────┘  │
│              │                                         │
│              │ ORG CONNECTIONS (read-only)             │
│              │ ┌───────────────────────────────────┐  │
│              │ │ ● Vibe Prospecting  Builder role  │  │
│              │ │   7 tools · active                 │  │
│              │ └───────────────────────────────────┘  │
│              │ ┌───────────────────────────────────┐  │
│              │ │ ● Google Workspace  All roles     │  │
│              │ │   12 tools · active                │  │
│              │ └───────────────────────────────────┘  │
│              │ Managed by workspace admin.             │
└──────────────┴─────────────────────────────────────────┘
```

**Section header spec:**

```
MY CONNECTIONS / ORG CONNECTIONS:
  font-size: 9px, font-weight: 700, text-transform: uppercase
  letter-spacing: 1px, color: var(--text-muted)
  margin-bottom: 8px, margin-top: 24px (first section: 0)
```

**Connection card spec:**

```
card:
  background: var(--surface-raised)
  border: 1px solid var(--surface-border)
  border-radius: var(--radius-md)
  padding: 12px 16px
  display: flex, align-items: center, gap: 12px

provider icon:
  width: 32px, height: 32px, border-radius: var(--radius-md)
  object-fit: contain, background: var(--surface-overlay)
  padding: 6px (for SVG icons)

connected indicator:
  status dot (8px) + account email, color: var(--text-secondary), font-size: 12px
  expiry: color --text-muted, font-size: 11px

[Connect] button:
  variant: outline, height: 28px, font-size: 12px

[Manage] button:
  variant: outline, height: 28px, font-size: 12px
  expand inline to show: [Test] [Disconnect] options

Org connections:
  identical card but no [Manage] — read-only
  right side: role pill (same style as tool permission pill)
  footer text: "Managed by workspace admin." in text-muted italic 11px
```

---

## 3. Skill Creator — Otto Conversation Mode

Accessed from: Workspace Admin → Skills (new nav item) → [+ Create Skill]
Also accessible via Context Panel slash command `/skill create`.

### 3.1 Skills List Page

```
┌─────────────────────────────────────────────────────────────────┐
│ Skills                                      [+ Create Skill]    │
│ Custom tools created for this workspace. Otto uses them based   │
│ on each user's role.                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ ✦ Headcount Trend Check               [Active]  [Edit]    │  │
│ │   Pulls LinkedIn workforce trend from Vibe Prospecting     │  │
│ │   Builder, Gatekeeper · CRM, Contracts · Created by Zach  │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                 │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ ✦ Qualify Lead via Vibe               [Active]  [Edit]    │  │
│ │   Enriches a CRM vault with prospect data and scores fit   │  │
│ │   Builder · CRM · Created by Zach                         │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Skill card spec:**

```
✦ icon (sparkle):
  Lucide Sparkles icon, 16px, color var(--accent-secondary)
  — distinguishes custom skills from MCP server tools

skill name: font-weight 600, color var(--text-primary)
description: font-size 12px, color var(--text-secondary), single line truncated

meta row: font-size: 11px, color: var(--text-muted)
  role pills + module pills + "Created by [name]"
  pill style: same as module scope pill (--accent-secondary tint)
```

### 3.2 Skill Creator Conversation View

Full-screen panel, distinct from normal Otto. Uses left/right bubble layout.

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Skills       Create New Skill                                 │
├────────────────────────────────────────────────────────┬────────┤
│                                                        │ DRAFT  │
│  ┌─────────────────────────────────────────────────┐  │ ──────  │
│  │ Otto                                 ✦          │  │        │
│  │ What should this skill do? Describe it in plain  │  │ (empty │
│  │ language.                                        │  │  until │
│  └─────────────────────────────────────────────────┘  │  Otto  │
│                                              ↓         │  gen-  │
│    ┌────────────────────────────────────────────────┐  │  erate │
│    │ When I'm looking at a company vault, I want    │  │  def)  │
│    │ to pull their headcount trend from Vibe        │  │        │
│    │ Prospecting and see if they're growing.        │  │        │
│    └────────────────────────────────────────────────┘  │        │
│                                              ↓         │        │
│  ┌─────────────────────────────────────────────────┐  │        │
│  │ Otto                                 ✦          │  │        │
│  │ Got it. This skill will:                         │  │        │
│  │  1. Get the company domain from vault metadata   │  │        │
│  │  2. Call Vibe Prospecting: business-enrichment   │  │        │
│  │  3. Extract workforce_trend                      │  │        │
│  │  4. Return % change vs last quarter              │  │        │
│  │                                                  │  │        │
│  │ Should it also check for recent funding events?  │  │        │
│  │ [Yes] [No] [Modify]                              │  │        │
│  └─────────────────────────────────────────────────┘  │        │
│                                                        │        │
│  ┌─────────────────────────────────────────────────┐  │        │
│  │ Type a message...              [Send ↵]         │  │        │
│  └─────────────────────────────────────────────────┘  │        │
└────────────────────────────────────────────────────────┴────────┘
```

**Conversation bubble spec:**

```
Otto messages (left-aligned):
  max-width: 80%, background: var(--surface-raised)
  border: 1px solid var(--surface-border)
  border-radius: 0 var(--radius-lg) var(--radius-lg) var(--radius-lg)
  padding: 12px 16px
  ✦ icon: Lucide Sparkles 14px, color var(--accent-secondary), float right

User messages (right-aligned):
  max-width: 80%, background: rgba(0,209,255,0.08)
  border: 1px solid rgba(0,209,255,0.15)
  border-radius: var(--radius-lg) 0 var(--radius-lg) var(--radius-lg)
  padding: 12px 16px

Quick reply buttons ([Yes] [No] [Modify]):
  height: 32px, padding: 0 14px
  border: 1px solid var(--surface-border)
  border-radius: var(--radius-full)
  color: var(--text-secondary)
  hover: border-color var(--accent-primary), color var(--text-primary)
  background: var(--surface-overlay)
```

**Right panel — Draft Definition (appears after Otto generates):**

```
┌─────────────────────────┐
│ DRAFT SKILL DEFINITION  │
│ ─────────────────────── │
│ Name                    │
│ [Headcount Trend Check] │
│                         │
│ Assign to               │
│ ☑ Builder               │
│ ☑ Gatekeeper            │
│ ☐ Owner                 │
│                         │
│ Modules                 │
│ [CRM ×] [Contracts ×]   │
│ [+ Add module]          │
│                         │
│ Tool chain              │
│ ─────────────────────── │
│ 1. match-business       │
│    ↳ Vibe Prospecting   │
│ 2. business-enrichment  │
│    ↳ fields: workforce  │
│                         │
│ ─────────────────────── │
│ [Save Skill]            │
│ [Discard]               │
└─────────────────────────┘
```

**Draft panel spec:**

```
container:
  width: 280px, background: var(--surface-raised)
  border-left: 1px solid var(--surface-border)
  padding: 16px

section header:
  font-size: 9px, font-weight 700, text-transform uppercase
  letter-spacing 0.5px, color var(--text-muted)
  margin-bottom 8px

Name input:
  background var(--surface-overlay), border 1px solid var(--surface-border)
  border-radius var(--radius-md), padding 8px 12px
  font-size 13px, color var(--text-primary)
  width 100%
  focus: border-color var(--accent-primary), outline none

Checkbox rows:
  height 36px, display flex, align items center, gap 8px
  font-size 13px, color var(--text-secondary)
  hover: color var(--text-primary)

Tool chain steps:
  font-size 12px, font-family var(--font-mono)
  color var(--text-primary)
  step number: color var(--text-muted)
  tool name: color var(--accent-primary)
  ↳ server: color var(--text-muted), font-size 11px

[Save Skill] button:
  full width, height 36px
  background var(--accent-primary), color var(--text-inverse)
  border-radius var(--radius-md), font-weight 600
  hover: background var(--accent-primary-hover)
```

---

## 4. Navigation — Admin Sidebar Updates

The Workspace Admin sidebar needs two new items:

```
Current items:
  Dashboard / Members / Roles / Feature Flags / Calibration / Modules / Connectors / Audit Log / Health

Updated items:
  Dashboard / Members / Roles / Feature Flags / Calibration / Modules
  ── Connectors (expanded group) ──
    └ AI Providers
    └ MCP Servers
    └ Integrations (existing Salesforce/Slack/etc)
  Skills    ← NEW
  Audit Log / Health
```

**Connectors group header spec:**

```
Same as .nav-section-header:
  font-size: 9px, font-weight: 700, text-transform: uppercase
  letter-spacing: 1px, color: var(--text-muted)
  padding: 16px 20px 6px

Sub-items (indented 8px more than top-level):
  padding-left: 28px
  font-size: 12px (vs 12.5px for top-level)
  active: same left-border accent pattern
```

---

## 5. Component File Map

All new components follow atomic level placement from `apps/web/CLAUDE.md`.

```
atoms/
  StatusDot.tsx              ← reusable ●/○ with pulse for active
  PermissionToggleCell.tsx   ← ✓/— matrix cell with animations
  CreditBar.tsx              ← colored progress bar with threshold colors

molecules/
  ProviderCard.tsx           ← AI provider card with status + meta
  McpServerCard.tsx          ← MCP server card with credit bar + actions
  ConnectionCard.tsx         ← personal/org connection card
  SkillCard.tsx              ← custom skill card with sparkle icon
  DiscoveryProgress.tsx      ← step-by-step discovery feedback

organisms/
  AiProvidersSection.tsx     ← full AI Providers tab content
  McpServersSection.tsx      ← full MCP Servers tab content
  McpServerDetail.tsx        ← server detail with permission matrix
  PermissionMatrix.tsx       ← Discord-style role × tool grid
  ConnectedAccountsSection.tsx ← personal settings accounts list
  SkillsList.tsx             ← skills list for admin
  SkillCreator.tsx           ← Otto conversation + draft panel

views/
  AdminConnectors.tsx        ← Connectors section with 3 sub-tabs
  AdminSkills.tsx            ← Skills list + creator view
  PersonalConnectedAccounts.tsx ← Personal Settings accounts
```

---

## 6. State (Zustand) — New Stores

```typescript
// stores/mcp.store.ts
interface McpState {
  servers: WorkspaceMcpServer[];
  selectedServerId: string | null;
  isDiscovering: boolean;
  discoverySteps: DiscoveryStep[];

  fetchServers: () => Promise<void>;
  discoverServer: (url: string, auth: McpAuthConfig) => Promise<void>;
  addServer: (server: McpServerInput) => Promise<void>;
  updateToolPermissions: (
    serverId: string,
    permissions: ToolPermission[],
  ) => Promise<void>;
  removeServer: (serverId: string) => Promise<void>;
}

// stores/skills.store.ts
interface SkillsState {
  skills: WorkspaceSkill[];
  creatorConversation: SkillCreatorMessage[];
  draftSkill: SkillDraft | null;
  isCreating: boolean;

  fetchSkills: () => Promise<void>;
  sendCreatorMessage: (message: string) => Promise<void>;
  saveDraftSkill: (skill: SkillDraft) => Promise<void>;
  deleteSkill: (skillId: string) => Promise<void>;
}

// stores/connections.store.ts  (personal connections, extends auth.store)
interface ConnectionsState {
  personalConnections: UserConnection[];
  orgConnections: WorkspaceMcpServer[]; // read from mcp.store filtered by user role

  fetchPersonalConnections: () => Promise<void>;
  connectProvider: (provider: string) => Promise<void>; // OAuth flow
  disconnectProvider: (connectionId: string) => Promise<void>;
}
```

---

## 7. Empty States

Every list needs an empty state variant.

**MCP Servers — empty:**

```
┌────────────────────────────────────────────────┐
│                                                │
│        [plug icon 48px, text-muted]            │
│        No MCP servers connected                │
│        Add your first server to give Otto      │
│        access to external data and tools.      │
│                                                │
│            [+ Add MCP Server]                  │
│                                                │
└────────────────────────────────────────────────┘
```

**Skills — empty:**

```
        [sparkles icon 48px, text-muted]
        No custom skills yet
        Create a skill by describing what you need
        to Otto in plain language.

            [+ Create Skill]
```

---

## 8. Accessibility Checklist

- [ ] All interactive cells in permission matrix are keyboard-navigable (Tab, Space to toggle)
- [ ] Permission matrix announces cell state changes via `aria-live`
- [ ] Discovery progress steps use `role="status"` for screen reader announcements
- [ ] API key inputs have `type="password"` with visible toggle (eye icon), `autocomplete="off"`
- [ ] Drawer/modal trap focus when open, restore focus on close
- [ ] All status dots have `aria-label` (not color alone to convey status)
- [ ] Credit bar has `role="progressbar"` with `aria-valuenow` / `aria-valuemax`
- [ ] Min 44×44px touch targets on all buttons, toggles, cells

---

## Related Files

- `docs/specs/admin/overview.md` — Parent spec (Connectors section lines 128-137)
- `docs/plans/2026-03-06-mcp-registry-and-skills.md` — Full architecture and data model
- `apps/web/src/styles/tokens.css` — All design tokens
- `docs/specs/admin/admin-demo.html` — Visual reference for admin shell
