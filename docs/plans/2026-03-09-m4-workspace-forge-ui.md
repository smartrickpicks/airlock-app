# M4: Workspace Forge UI — Implementation Plan

> **Date:** 2026-03-09
> **Milestone:** M4 (Critical Path: M1 → M2 → M3 → **M4**)
> **Depends On:** M2 (Inference Engine), M3 (Profile Storage)
> **Est. Effort:** 3-5 days
> **Strategy:** Mock data first — all frontend uses typed mock data with store fallback pattern

---

## Overview

Build the Workspace Forge — Airlock's split-screen onboarding experience that replaces the wizard checklist. Otto (left panel) asks 2-4 goal-based questions while the right panel shows a live workspace preview updating in real time.

**Key UX Principle:** Spellburst pattern (Stanford/Replit, ACM UIST 2023) — chat on left, canvas on right. Conversational + visual confirmation.

---

## Deliverables (Bottom-Up Build Order)

### Layer 1: Foundation (Mock Data + Store)

**1. `src/lib/mock-forge.ts`** — Mock data for the entire Forge flow

- Types: `ForgeMessage`, `ForgeStep`, `ForgeProfile`, `ForgeDrives`, `ForgeWorkspaceConfig`
- `FORGE_CONVERSATION_SCRIPT` — Otto's scripted conversation (4 steps)
- `MOCK_PROFILES` — Subset of 17 PI profiles with display data (name, bio, drives, archetype badge)
- `MOCK_WORKSPACE_CONFIGS` — Pre-built workspace config per meta-archetype (driver/enforcer/interpreter)
- `AUTONOMY_OPTIONS` — The 4 tappable cards for Q2
- `GOAL_CHIPS` — Smart chips for Q1

**2. `src/stores/forge.store.ts`** — Forge state management

```typescript
interface ForgeState {
  // Conversation
  step: number; // 0-4 (welcome, Q1, Q2, Q3/Q4, result)
  messages: ForgeMessage[];
  isTyping: boolean;

  // Inferred profile
  inferredProfile: ForgeProfile | null;
  drives: ForgeDrives | null;
  confidence: number;
  metaArchetype: "driver" | "enforcer" | "interpreter" | null;

  // Workspace preview
  activeModules: string[];
  workspaceConfig: ForgeWorkspaceConfig | null;
  preloadedSkills: string[];

  // UI state
  isLaunching: boolean;
  isComplete: boolean;
  showProfilePanel: boolean;

  // Actions
  sendMessage: (content: string) => void;
  selectAutonomyOption: (option: string) => void;
  selectGoalChip: (chip: string) => void;
  toggleModule: (moduleId: string) => void;
  overrideProfile: (profileId: string) => void;
  launchWorkspace: () => void;
  reset: () => void;
}
```

### Layer 2: Atoms

**3. `src/components/atoms/ArchetypeBadge.tsx`**

- Props: `archetype: 'driver' | 'enforcer' | 'interpreter'`, `size?: 'sm' | 'md' | 'lg'`
- Visual: Colored pill with icon — Driver=cyan/bolt, Enforcer=purple/shield, Interpreter=amber/compass
- No state, pure presentational

### Layer 3: Molecules

**4. `src/components/molecules/ProfileInferencePanel.tsx`**

- Shows "Otto thinks you're a [Profile]..." with confidence bar
- Displays DECF drives as 4 horizontal bars (D/E/C/F)
- ArchetypeBadge for meta-archetype
- "Not quite right?" link to trigger override flow
- Props: `profile`, `drives`, `confidence`, `archetype`, `onOverride`

**5. `src/components/molecules/ModuleToggle.tsx`**

- Row of module icons with toggle state (active/inactive)
- Uses existing ModuleIcon pattern from ModuleBar
- Props: `modules: { id, label, icon, active }[]`, `onToggle: (id) => void`

**6. `src/components/molecules/GoalChips.tsx`**

- Horizontal scrollable row of smart chips for Q1 goals
- Props: `chips: string[]`, `onSelect: (chip) => void`, `selected?: string`

**7. `src/components/molecules/AutonomyCards.tsx`**

- 4 tappable cards for Q2 (autonomy preference)
- Cards: "Run things for me" / "Draft it, I'll review" / "Help me while I drive" / "Just a second opinion"
- Props: `options`, `onSelect`, `selected`

### Layer 4: Organisms

**8. `src/components/organisms/ForgeChat.tsx`**

- Left panel — Otto's conversation interface
- Renders messages (Otto bubbles + user bubbles)
- Shows GoalChips for Q1, AutonomyCards for Q2
- Text input for open-ended responses
- Typing indicator (Otto is thinking...)
- Follows ChatView pattern (auto-scroll, enter-to-send)

**9. `src/components/organisms/ForgePreview.tsx`**

- Right panel — Live workspace preview
- ModuleToggle bar at top
- ProfileInferencePanel (when profile is inferred)
- Workspace config summary cards (cognitive mode, info density, update pace, etc.)
- Skill cards (preloaded skills)
- "Launch" button at bottom
- Animates in sections as conversation progresses (step-driven visibility)

### Layer 5: Template + Route

**10. `src/components/templates/WorkspaceForge.tsx`**

- Split-screen container: ForgeChat (left, 45%) | ForgePreview (right, 55%)
- Responsive: stacks vertically on mobile
- Connects to forge.store.ts
- Entry animation (fade-in sections)

**11. `src/app/(shell)/forge/page.tsx`**

- Route container wrapping WorkspaceForge template
- Metadata: `title: "Workspace Forge — Airlock"`

---

## File Creation Order (Build Sequence)

```
1. src/lib/mock-forge.ts                          # Types + mock data
2. src/stores/forge.store.ts                      # State management
3. src/components/atoms/ArchetypeBadge.tsx         # Pure presentational
4. src/components/molecules/GoalChips.tsx          # Q1 smart chips
5. src/components/molecules/AutonomyCards.tsx      # Q2 tappable cards
6. src/components/molecules/ProfileInferencePanel.tsx  # Profile display
7. src/components/molecules/ModuleToggle.tsx       # Module bar in preview
8. src/components/organisms/ForgeChat.tsx          # Left panel
9. src/components/organisms/ForgePreview.tsx       # Right panel
10. src/components/templates/WorkspaceForge.tsx    # Split-screen container
11. src/app/(shell)/forge/page.tsx                 # Route
```

---

## Acceptance Criteria

- [ ] Split-screen renders (chat left, preview right)
- [ ] Otto asks 2-4 questions with smart chips/cards
- [ ] Right panel updates as conversation progresses
- [ ] Profile inference visible ("Otto thinks you're a [Profile]...")
- [ ] DECF drive bars render with correct values
- [ ] ArchetypeBadge shows correct meta-archetype
- [ ] User can toggle modules in preview
- [ ] User can correct profile ("Not quite right?")
- [ ] "Launch" button present (mock action)
- [ ] All tokens from tokens.css — no raw colors
- [ ] `pnpm type-check` passes
- [ ] `pnpm lint` passes

---

## Mock Conversation Script

### Step 0: Welcome

**Otto:** "Welcome to the Workspace Forge. I'm Otto — I'll help configure your workspace based on how you work. Let's start with a simple question..."

### Step 1: Q1 — Goals (open-ended + chips)

**Otto:** "What are you here to accomplish? Pick what resonates, or tell me in your own words."
**Chips:** "Close deals faster" / "Manage contracts" / "Organize my team" / "Track projects" / "Store & find documents"
**Signal extraction:** Module affinity, Dominance (D), Patience (C)

### Step 2: Q2 — Autonomy (tappable cards)

**Otto:** "How much should I handle on my own?"
**Cards:**

- 🚀 "Run things for me" → high autonomy (D: high, F: low)
- 📝 "Draft it, I'll review" → medium autonomy (balanced)
- 🎯 "Help me while I drive" → low autonomy (D: high, F: high)
- 💡 "Just a second opinion" → advisory only (E: high, F: high)

### Step 3: Profile Result

**Otto:** "Based on what you've told me, here's how I've configured your workspace..."
**Right panel:** Full preview with profile, modules, skills, config

### Step 4: Confirmation

**Otto:** "Everything look good? You can adjust anything, or we can launch."
**Actions:** "Launch" button, module toggles, "Not quite right?" override
