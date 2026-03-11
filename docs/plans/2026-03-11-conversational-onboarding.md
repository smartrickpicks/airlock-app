# Conversational Onboarding — Otto Forge Chat

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the 6-step card wizard with a conversational Forge Chat experience where Otto (otter avatar + constellation) guides ALL users through workspace setup via interactive chat, with a DAG canvas background and interactive plan cards.

**Architecture:** The existing `forge.store.ts` + `mock-forge.ts` already contain the full conversational flow (LinkedIn → goal chips → autonomy cards → PI profile inference → workspace config). The current `/onboarding/setup/page.tsx` is a card wizard that duplicates this logic. We replace the wizard UI with a chat-based interface that renders the Forge store's conversation, adds the otter SVG as a new atom component, and wraps everything in a grid canvas background. The onboarding store continues to handle checklist/phase tracking; the Forge store drives the conversation.

**Tech Stack:** Next.js 14 (App Router), Zustand, Framer Motion, Tailwind CSS tokens, inline SVG

---

## Existing Assets (Do NOT Rebuild)

| Asset                    | Location                                   | Status                                        |
| ------------------------ | ------------------------------------------ | --------------------------------------------- |
| Forge conversation store | `src/stores/forge.store.ts`                | Complete — LinkedIn, Q1/Q2, inference, launch |
| Forge mock data + types  | `src/lib/mock-forge.ts`                    | Complete — profiles, drives, skills, configs  |
| Constellation avatar     | `src/components/atoms/OttoAvatar.tsx`      | Complete — 23 nodes, 6 archetypes, 6 states   |
| Chat message bubble      | `src/components/molecules/ChatMessage.tsx` | Complete — user/assistant/system rendering    |
| Chat input               | `src/components/molecules/ChatInput.tsx`   | Complete — auto-expand, Enter to send         |
| Onboarding store         | `src/stores/onboarding.store.ts`           | Keep — checklist/phase tracking               |
| Onboarding mock data     | `src/lib/mock-onboarding.ts`               | Keep — types, checklist items, module options |

---

### Task 1: Create OttoOtterAvatar Atom

**Files:**

- Create: `apps/web/src/components/atoms/OttoOtterAvatar.tsx`

The otter SVG lives in the skills-library showcase HTML. Port it to a React component with size, state, and chamber props matching OttoAvatar's interface.

**Step 1: Create the component**

```tsx
"use client";

export type OtterSize = "sm" | "md" | "lg" | "xl";
export type OtterState = "idle" | "thinking" | "active" | "celebrating";
export type OtterChamber = "discover" | "build" | "review" | "ship";

interface OttoOtterAvatarProps {
  size?: OtterSize;
  state?: OtterState;
  chamber?: OtterChamber;
  className?: string;
}

const SIZE_MAP: Record<OtterSize, number> = {
  sm: 48,
  md: 80,
  lg: 120,
  xl: 200,
};

const CHAMBER_COLORS: Record<OtterChamber, string> = {
  discover: "#EF4444",
  build: "#EAB308",
  review: "#A855F7",
  ship: "#22C55E",
};

export default function OttoOtterAvatar({
  size = "md",
  state = "idle",
  chamber,
  className = "",
}: OttoOtterAvatarProps) {
  const px = SIZE_MAP[size];
  const isThinking = state === "thinking";
  const isCelebrating = state === "celebrating";

  return (
    <div
      className={`relative flex-shrink-0 ${className}`}
      style={{ width: px, height: px * 1.14 }}
    >
      <svg
        viewBox="0 0 280 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
        role="img"
        aria-label="Otto the otter"
      >
        {/* BODY — with breathing animation */}
        <g style={{ transformOrigin: "center 60%" }}>
          {/* Tail */}
          <path
            d="M 140 250 Q 175 265 185 248 Q 190 238 180 232"
            stroke="rgba(124,92,252,.3)"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          >
            <animate
              attributeName="d"
              values="M 140 250 Q 175 265 185 248 Q 190 238 180 232;M 140 250 Q 180 260 188 244 Q 195 230 182 228;M 140 250 Q 175 265 185 248 Q 190 238 180 232"
              dur="3s"
              repeatCount="indefinite"
            />
          </path>

          {/* Body outline */}
          <ellipse
            cx="140"
            cy="195"
            rx="60"
            ry="72"
            fill="rgba(124,92,252,.06)"
            stroke="rgba(124,92,252,.25)"
            strokeWidth="1.5"
          />
          {/* Body wireframe lines */}
          <line
            x1="100"
            y1="155"
            x2="88"
            y2="200"
            stroke="rgba(124,92,252,.08)"
            strokeWidth="1"
          />
          <line
            x1="120"
            y1="145"
            x2="105"
            y2="210"
            stroke="rgba(124,92,252,.08)"
            strokeWidth="1"
          />
          <line
            x1="140"
            y1="140"
            x2="140"
            y2="220"
            stroke="rgba(124,92,252,.08)"
            strokeWidth="1"
          />
          <line
            x1="160"
            y1="145"
            x2="175"
            y2="210"
            stroke="rgba(124,92,252,.08)"
            strokeWidth="1"
          />
          <line
            x1="180"
            y1="155"
            x2="192"
            y2="200"
            stroke="rgba(124,92,252,.08)"
            strokeWidth="1"
          />
          {/* Cross wires */}
          <line
            x1="85"
            y1="180"
            x2="195"
            y2="180"
            stroke="rgba(124,92,252,.06)"
            strokeWidth="1"
          />
          <line
            x1="88"
            y1="200"
            x2="192"
            y2="200"
            stroke="rgba(124,92,252,.06)"
            strokeWidth="1"
          />
          <line
            x1="95"
            y1="220"
            x2="185"
            y2="220"
            stroke="rgba(124,92,252,.06)"
            strokeWidth="1"
          />

          {/* Chamber dots on belly */}
          {(["discover", "build", "review", "ship"] as const).map((ch, i) => {
            const positions = [
              { cx: 125, cy: 185 },
              { cx: 140, cy: 178 },
              { cx: 155, cy: 185 },
              { cx: 140, cy: 195 },
            ];
            const isActive = chamber === ch;
            return (
              <circle
                key={ch}
                cx={positions[i].cx}
                cy={positions[i].cy}
                r={isActive ? 5 : 4}
                fill={CHAMBER_COLORS[ch]}
                opacity={isActive ? 0.9 : 0.5}
              >
                <animate
                  attributeName="opacity"
                  values={isActive ? ".7;1;.7" : ".3;.6;.3"}
                  dur="3s"
                  begin={`${i * 0.5}s`}
                  repeatCount="indefinite"
                />
              </circle>
            );
          })}

          {/* Paws */}
          <ellipse
            cx="112"
            cy="232"
            rx="16"
            ry="11"
            fill="rgba(124,92,252,.08)"
            stroke="rgba(124,92,252,.2)"
            strokeWidth="1.5"
          />
          <ellipse
            cx="168"
            cy="232"
            rx="16"
            ry="11"
            fill="rgba(124,92,252,.08)"
            stroke="rgba(124,92,252,.2)"
            strokeWidth="1.5"
          />

          {/* Diamond playbook */}
          <polygon
            points="140,215 155,232 140,249 125,232"
            fill="rgba(0,209,255,.08)"
            stroke="#00D1FF"
            strokeWidth="1.5"
          />
          <line
            x1="140"
            y1="220"
            x2="140"
            y2="244"
            stroke="rgba(0,209,255,.2)"
            strokeWidth=".5"
          />
          <line
            x1="130"
            y1="232"
            x2="150"
            y2="232"
            stroke="rgba(0,209,255,.2)"
            strokeWidth=".5"
          />

          {/* Feet */}
          <ellipse
            cx="115"
            cy="265"
            rx="18"
            ry="8"
            fill="rgba(124,92,252,.06)"
            stroke="rgba(124,92,252,.15)"
            strokeWidth="1"
          />
          <ellipse
            cx="165"
            cy="265"
            rx="18"
            ry="8"
            fill="rgba(124,92,252,.06)"
            stroke="rgba(124,92,252,.15)"
            strokeWidth="1"
          />
        </g>

        {/* HEAD */}
        <g>
          <circle
            cx="140"
            cy="95"
            r="52"
            fill="rgba(124,92,252,.08)"
            stroke="rgba(124,92,252,.3)"
            strokeWidth="1.5"
          />
          {/* Head wireframe */}
          <line
            x1="110"
            y1="60"
            x2="100"
            y2="130"
            stroke="rgba(124,92,252,.06)"
            strokeWidth="1"
          />
          <line
            x1="140"
            y1="50"
            x2="140"
            y2="140"
            stroke="rgba(124,92,252,.06)"
            strokeWidth="1"
          />
          <line
            x1="170"
            y1="60"
            x2="180"
            y2="130"
            stroke="rgba(124,92,252,.06)"
            strokeWidth="1"
          />
          {/* Inner face */}
          <circle
            cx="140"
            cy="98"
            r="38"
            fill="#0A0A0F"
            stroke="rgba(124,92,252,.15)"
            strokeWidth="1"
          />

          {/* Ears */}
          <g>
            <circle
              cx="97"
              cy="58"
              r="14"
              fill="rgba(124,92,252,.06)"
              stroke="rgba(124,92,252,.2)"
              strokeWidth="1.5"
            />
            <circle
              cx="97"
              cy="58"
              r="7"
              fill="rgba(124,92,252,.04)"
              stroke="rgba(124,92,252,.1)"
              strokeWidth="1"
            />
          </g>
          <g>
            <circle
              cx="183"
              cy="58"
              r="14"
              fill="rgba(124,92,252,.06)"
              stroke="rgba(124,92,252,.2)"
              strokeWidth="1.5"
            />
            <circle
              cx="183"
              cy="58"
              r="7"
              fill="rgba(124,92,252,.04)"
              stroke="rgba(124,92,252,.1)"
              strokeWidth="1"
            />
          </g>

          {/* Eyes — blink animation */}
          <ellipse cx="122" cy="92" rx="8" ry="8" fill="#7C5CFC">
            <animate
              attributeName="ry"
              values="8;8;8;1;8;8;8"
              dur="4s"
              repeatCount="indefinite"
              keyTimes="0;0.46;0.48;0.5;0.52;0.54;1"
            />
          </ellipse>
          <circle cx="119" cy="89" r="2.5" fill="#fff" opacity=".7" />
          <ellipse cx="158" cy="92" rx="8" ry="8" fill="#7C5CFC">
            <animate
              attributeName="ry"
              values="8;8;8;1;8;8;8"
              dur="4s"
              repeatCount="indefinite"
              keyTimes="0;0.46;0.48;0.5;0.52;0.54;1"
            />
          </ellipse>
          <circle cx="155" cy="89" r="2.5" fill="#fff" opacity=".7" />
          {/* Eye glow */}
          <circle
            cx="122"
            cy="92"
            r="14"
            fill="none"
            stroke="rgba(124,92,252,.15)"
            strokeWidth="1"
          >
            <animate
              attributeName="r"
              values="12;16;12"
              dur="3s"
              repeatCount="indefinite"
            />
          </circle>
          <circle
            cx="158"
            cy="92"
            r="14"
            fill="none"
            stroke="rgba(124,92,252,.15)"
            strokeWidth="1"
          >
            <animate
              attributeName="r"
              values="12;16;12"
              dur="3s"
              repeatCount="indefinite"
            />
          </circle>

          {/* Nose */}
          <ellipse
            cx="140"
            cy="105"
            rx="5"
            ry="3.5"
            fill="rgba(124,92,252,.5)"
          />
          {/* Mouth */}
          <path
            d="M 130 112 Q 140 118 150 112"
            stroke="rgba(124,92,252,.35)"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />

          {/* Whiskers */}
          <g>
            <line
              x1="100"
              y1="100"
              x2="78"
              y2="95"
              stroke="rgba(124,92,252,.15)"
              strokeWidth="1"
              strokeLinecap="round"
            />
            <line
              x1="100"
              y1="106"
              x2="76"
              y2="106"
              stroke="rgba(124,92,252,.15)"
              strokeWidth="1"
              strokeLinecap="round"
            />
            <line
              x1="100"
              y1="112"
              x2="78"
              y2="117"
              stroke="rgba(124,92,252,.15)"
              strokeWidth="1"
              strokeLinecap="round"
            />
            <line
              x1="180"
              y1="100"
              x2="202"
              y2="95"
              stroke="rgba(124,92,252,.15)"
              strokeWidth="1"
              strokeLinecap="round"
            />
            <line
              x1="180"
              y1="106"
              x2="204"
              y2="106"
              stroke="rgba(124,92,252,.15)"
              strokeWidth="1"
              strokeLinecap="round"
            />
            <line
              x1="180"
              y1="112"
              x2="202"
              y2="117"
              stroke="rgba(124,92,252,.15)"
              strokeWidth="1"
              strokeLinecap="round"
            />
          </g>
        </g>

        {/* Thinking ring */}
        {isThinking && (
          <circle
            cx="140"
            cy="160"
            r="100"
            fill="none"
            stroke="rgba(124,92,252,.2)"
            strokeWidth="1.5"
            strokeDasharray="8 16"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 140 160"
              to="360 140 160"
              dur="3s"
              repeatCount="indefinite"
            />
          </circle>
        )}

        {/* Celebrating glow */}
        {isCelebrating && (
          <circle
            cx="140"
            cy="160"
            r="100"
            fill="none"
            stroke="rgba(0,209,255,.15)"
            strokeWidth="1"
          >
            <animate
              attributeName="r"
              values="90;120;90"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
        )}

        {/* Ambient glow */}
        <circle
          cx="140"
          cy="160"
          r="100"
          fill="none"
          stroke="rgba(124,92,252,.06)"
          strokeWidth="1"
        >
          <animate
            attributeName="r"
            values="90;110;90"
            dur="5s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
    </div>
  );
}
```

**Step 2: Verify it renders**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && cd apps/web && npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/web/src/components/atoms/OttoOtterAvatar.tsx
git commit -m "feat(web): add OttoOtterAvatar atom — geometric otter SVG"
```

---

### Task 2: Create ForgeCanvas Background Atom

**Files:**

- Create: `apps/web/src/components/atoms/ForgeCanvas.tsx`

A full-screen grid background (Blender-style) that sits behind the chat. CSS-only, no canvas element needed.

**Step 1: Create the component**

```tsx
"use client";

interface ForgeCanvasProps {
  children: React.ReactNode;
  /** Show faint dot grid */
  showGrid?: boolean;
  className?: string;
}

export default function ForgeCanvas({
  children,
  showGrid = true,
  className = "",
}: ForgeCanvasProps) {
  return (
    <div
      className={`relative min-h-screen bg-surface-base overflow-hidden ${className}`}
    >
      {/* Dot grid */}
      {showGrid && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(124,92,252,0.12) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
      )}

      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-accent-primary/8 animate-airlock-glow-breathe" />
        <div
          className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-accent-secondary/6 animate-airlock-drift"
          style={{ animationDelay: "2s" }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
```

**Step 2: Verify**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && cd apps/web && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add apps/web/src/components/atoms/ForgeCanvas.tsx
git commit -m "feat(web): add ForgeCanvas atom — grid background for onboarding"
```

---

### Task 3: Create ForgeInteraction Molecules

**Files:**

- Create: `apps/web/src/components/molecules/ForgeGoalChips.tsx`
- Create: `apps/web/src/components/molecules/ForgeAutonomyCards.tsx`
- Create: `apps/web/src/components/molecules/ForgeProfileCard.tsx`
- Create: `apps/web/src/components/molecules/ForgeLaunchCard.tsx`
- Create: `apps/web/src/components/molecules/ForgeLinkedInInput.tsx`

These are the interactive elements that appear inline in the chat when Otto asks questions. The Forge store already has the data — these are pure UI renderers.

**Step 1: Create ForgeLinkedInInput**

```tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Linkedin } from "lucide-react";

interface ForgeLinkedInInputProps {
  onSubmit: (url: string) => void;
  isLoading?: boolean;
}

export default function ForgeLinkedInInput({
  onSubmit,
  isLoading,
}: ForgeLinkedInInputProps) {
  const [url, setUrl] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 flex gap-2"
    >
      <div className="relative flex-1">
        <Linkedin
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
        />
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" && url.trim() && onSubmit(url.trim())
          }
          placeholder="https://linkedin.com/in/yourname"
          disabled={isLoading}
          className="w-full rounded-lg border border-surface-border bg-surface-sunken pl-9 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary disabled:opacity-50"
        />
      </div>
      <button
        onClick={() => url.trim() && onSubmit(url.trim())}
        disabled={!url.trim() || isLoading}
        className="rounded-lg bg-accent-primary px-4 py-2.5 text-xs font-semibold text-surface-base hover:bg-accent-primary-hover disabled:opacity-40 transition-colors"
      >
        {isLoading ? "Scanning..." : "Go"}
      </button>
      <button
        onClick={() => onSubmit("skip")}
        disabled={isLoading}
        className="rounded-lg px-3 py-2.5 text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        Skip
      </button>
    </motion.div>
  );
}
```

**Step 2: Create ForgeGoalChips**

```tsx
"use client";

import { motion } from "framer-motion";
import { GOAL_CHIPS } from "@/lib/mock-forge";

interface ForgeGoalChipsProps {
  onSelect: (chipId: string) => void;
  selectedId?: string | null;
}

export default function ForgeGoalChips({
  onSelect,
  selectedId,
}: ForgeGoalChipsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 flex flex-wrap gap-2"
    >
      {GOAL_CHIPS.map((chip, i) => (
        <motion.button
          key={chip.id}
          onClick={() => onSelect(chip.id)}
          disabled={!!selectedId}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.08 }}
          className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
            selectedId === chip.id
              ? "border-accent-primary bg-accent-primary/15 text-accent-primary"
              : selectedId
                ? "border-surface-border/50 bg-surface-overlay/50 text-text-muted opacity-50"
                : "border-surface-border bg-surface-overlay text-text-secondary hover:border-accent-primary/40 hover:text-text-primary"
          }`}
        >
          {chip.label}
        </motion.button>
      ))}
    </motion.div>
  );
}
```

**Step 3: Create ForgeAutonomyCards**

```tsx
"use client";

import { motion } from "framer-motion";
import { AUTONOMY_OPTIONS } from "@/lib/mock-forge";

interface ForgeAutonomyCardsProps {
  onSelect: (optionId: string) => void;
  selectedId?: string | null;
}

export default function ForgeAutonomyCards({
  onSelect,
  selectedId,
}: ForgeAutonomyCardsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 grid grid-cols-2 gap-2"
    >
      {AUTONOMY_OPTIONS.map((opt, i) => (
        <motion.button
          key={opt.id}
          onClick={() => onSelect(opt.id)}
          disabled={!!selectedId}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className={`rounded-lg border p-3 text-left transition-all ${
            selectedId === opt.id
              ? "border-accent-primary/50 bg-accent-primary/10"
              : selectedId
                ? "border-surface-border/50 opacity-50"
                : "border-surface-border bg-surface-overlay hover:border-accent-primary/30"
          }`}
        >
          <div className="text-lg">{opt.emoji}</div>
          <p className="mt-1 text-sm font-medium text-text-primary">
            {opt.label}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">{opt.description}</p>
        </motion.button>
      ))}
    </motion.div>
  );
}
```

**Step 4: Create ForgeProfileCard**

```tsx
"use client";

import { motion } from "framer-motion";
import type {
  ForgeProfile,
  ForgeDrives,
  ForgeSkill,
  MetaArchetype,
} from "@/lib/mock-forge";
import { ARCHETYPE_DISPLAY, MOCK_PROFILES } from "@/lib/mock-forge";

interface ForgeProfileCardProps {
  profile: ForgeProfile;
  drives: ForgeDrives;
  confidence: number;
  activeModules: string[];
  preloadedSkills: ForgeSkill[];
  onOverrideProfile: (profileId: string) => void;
  onToggleModule: (moduleId: string) => void;
}

const DRIVE_LABELS: { key: keyof ForgeDrives; label: string; color: string }[] =
  [
    { key: "dominance", label: "D", color: "bg-chamber-discover" },
    { key: "extraversion", label: "E", color: "bg-chamber-build" },
    { key: "patience", label: "C", color: "bg-chamber-review" },
    { key: "formality", label: "F", color: "bg-chamber-ship" },
  ];

const ALL_MODULES = [
  { id: "contracts", label: "Contracts" },
  { id: "crm", label: "CRM" },
  { id: "tasks", label: "Triage" },
  { id: "calendar", label: "Calendar" },
  { id: "documents", label: "Documents" },
];

export default function ForgeProfileCard({
  profile,
  drives,
  confidence,
  activeModules,
  preloadedSkills,
  onOverrideProfile,
  onToggleModule,
}: ForgeProfileCardProps) {
  const display = ARCHETYPE_DISPLAY[profile.metaArchetype];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 rounded-xl border border-surface-border bg-surface-raised/80 backdrop-blur-xl p-5 space-y-4"
    >
      {/* Profile header */}
      <div className="flex items-center gap-3">
        <div
          className={`rounded-lg px-2.5 py-1 text-xs font-bold ${display.bgColor} ${display.color}`}
        >
          {display.label}
        </div>
        <div>
          <h3 className="text-sm font-bold text-text-primary">
            {profile.name}
          </h3>
          <p className="text-xs text-text-muted">{profile.bio}</p>
        </div>
        <div className="ml-auto text-xs text-text-muted">
          {Math.round(confidence * 100)}% match
        </div>
      </div>

      {/* DECF Drives */}
      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium">
          DECF Drives
        </p>
        {DRIVE_LABELS.map((d) => (
          <div key={d.key} className="flex items-center gap-2">
            <span className="w-4 text-[10px] font-bold text-text-muted">
              {d.label}
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-surface-border/50">
              <motion.div
                className={`h-full rounded-full ${d.color}`}
                initial={{ width: 0 }}
                animate={{ width: `${drives[d.key] * 10}%` }}
                transition={{ duration: 0.6, delay: 0.2 }}
              />
            </div>
            <span className="w-5 text-right text-[10px] text-text-muted">
              {drives[d.key]}
            </span>
          </div>
        ))}
      </div>

      {/* Active modules */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium mb-1.5">
          Modules
        </p>
        <div className="flex flex-wrap gap-1.5">
          {ALL_MODULES.map((mod) => {
            const isActive = activeModules.includes(mod.id);
            return (
              <button
                key={mod.id}
                onClick={() => onToggleModule(mod.id)}
                className={`rounded-full border px-2.5 py-1 text-[10px] font-medium transition-all ${
                  isActive
                    ? "border-accent-primary/30 bg-accent-primary/10 text-accent-primary"
                    : "border-surface-border bg-surface-overlay text-text-muted hover:text-text-secondary"
                }`}
              >
                {mod.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Skills */}
      {preloadedSkills.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium mb-1.5">
            Preloaded Skills
          </p>
          <div className="space-y-1">
            {preloadedSkills.map((skill) => (
              <div
                key={skill.id}
                className="flex items-center gap-2 text-xs text-text-secondary"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-accent-primary/60" />
                {skill.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Override */}
      <details className="text-xs">
        <summary className="cursor-pointer text-text-muted hover:text-text-secondary">
          Not quite right? Pick a different profile
        </summary>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {MOCK_PROFILES.filter((p) => p.id !== profile.id).map((p) => (
            <button
              key={p.id}
              onClick={() => onOverrideProfile(p.id)}
              className="rounded-full border border-surface-border px-2.5 py-1 text-[10px] text-text-muted hover:border-accent-primary/30 hover:text-text-secondary transition-all"
            >
              {p.name}
            </button>
          ))}
        </div>
      </details>
    </motion.div>
  );
}
```

**Step 5: Create ForgeLaunchCard**

```tsx
"use client";

import { motion } from "framer-motion";
import { Rocket } from "lucide-react";

interface ForgeLaunchCardProps {
  workspaceName: string;
  moduleCount: number;
  isLaunching: boolean;
  onLaunch: () => void;
}

export default function ForgeLaunchCard({
  workspaceName,
  moduleCount,
  isLaunching,
  onLaunch,
}: ForgeLaunchCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 rounded-xl border border-accent-primary/20 bg-accent-primary/5 p-5 text-center"
    >
      <motion.div
        className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-primary/15"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Rocket size={24} className="text-accent-primary" />
      </motion.div>
      <h3 className="text-sm font-bold text-text-primary">
        {workspaceName || "Your workspace"} is ready
      </h3>
      <p className="mt-1 text-xs text-text-muted">
        {moduleCount} modules configured
      </p>
      <motion.button
        onClick={onLaunch}
        disabled={isLaunching}
        className="mt-4 w-full rounded-lg bg-accent-primary py-3 text-sm font-semibold text-surface-base transition-all hover:bg-accent-primary-hover hover:shadow-[0_0_30px_rgba(0,209,255,0.15)] disabled:opacity-60"
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.98 }}
      >
        {isLaunching ? "Launching..." : "Launch Workspace"}
      </motion.button>
    </motion.div>
  );
}
```

**Step 6: Verify all**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && cd apps/web && npx tsc --noEmit`

**Step 7: Commit**

```bash
git add apps/web/src/components/molecules/Forge*.tsx
git commit -m "feat(web): add Forge interaction molecules — chips, cards, profile, launch"
```

---

### Task 4: Create ForgeChat Organism

**Files:**

- Create: `apps/web/src/components/organisms/ForgeChat.tsx`

The main conversational UI. Renders Forge store messages as chat bubbles with inline interactive elements. Otto otter avatar in the sidebar, constellation transitions on archetype reveal.

**Step 1: Create the organism**

```tsx
"use client";

import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForgeStore } from "@/stores/forge.store";
import { useOnboardingStore } from "@/stores/onboarding.store";
import OttoOtterAvatar from "@/components/atoms/OttoOtterAvatar";
import OttoAvatar from "@/components/atoms/OttoAvatar";
import ChatInput from "@/components/molecules/ChatInput";
import ForgeLinkedInInput from "@/components/molecules/ForgeLinkedInInput";
import ForgeGoalChips from "@/components/molecules/ForgeGoalChips";
import ForgeAutonomyCards from "@/components/molecules/ForgeAutonomyCards";
import ForgeProfileCard from "@/components/molecules/ForgeProfileCard";
import ForgeLaunchCard from "@/components/molecules/ForgeLaunchCard";
import type { ForgeMessage } from "@/lib/mock-forge";

function ForgeMessageBubble({
  msg,
  isLatest,
}: {
  msg: ForgeMessage;
  isLatest: boolean;
}) {
  const {
    step,
    isTyping,
    goalChipId,
    autonomyOptionId,
    isScrapingLinkedIn,
    inferredProfile,
    drives,
    confidence,
    activeModules,
    preloadedSkills,
    isLaunching,
    selectGoalChip,
    selectAutonomyOption,
    submitLinkedInUrl,
    toggleModule,
    overrideProfile,
    launchWorkspace,
  } = useForgeStore();
  const workspaceName = useOnboardingStore((s) => s.setupState.workspaceName);

  const isOtto = msg.role === "otto";
  const isUser = msg.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar — only for Otto messages */}
      {isOtto && (
        <div className="flex-shrink-0 mt-1">
          {inferredProfile ? (
            <OttoAvatar
              size="sm"
              archetype={
                inferredProfile.metaArchetype === "driver"
                  ? "executor"
                  : inferredProfile.metaArchetype === "enforcer"
                    ? "guardian"
                    : "connector"
              }
              state={isTyping ? "thinking" : "active"}
            />
          ) : (
            <OttoOtterAvatar size="sm" state={isTyping ? "thinking" : "idle"} />
          )}
        </div>
      )}

      <div className={`max-w-[85%] ${isUser ? "ml-auto" : ""}`}>
        {/* Name */}
        {isOtto && (
          <p className="mb-1 text-[10px] font-medium text-accent-secondary">
            Otto
          </p>
        )}

        {/* Bubble */}
        <div
          className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-accent-primary/15 text-text-primary"
              : "bg-surface-overlay/80 text-text-secondary border border-surface-border/50"
          }`}
        >
          {msg.content.split("\n").map((line, i) => (
            <p key={i} className={i > 0 ? "mt-2" : ""}>
              {line.split("**").map((segment, j) =>
                j % 2 === 1 ? (
                  <strong key={j} className="text-text-primary font-semibold">
                    {segment}
                  </strong>
                ) : (
                  segment
                ),
              )}
            </p>
          ))}
        </div>

        {/* Inline interactions — only on latest Otto message */}
        {isOtto && isLatest && !isTyping && (
          <>
            {msg.interaction === "linkedin_input" && (
              <ForgeLinkedInInput
                onSubmit={(url) => {
                  if (url === "skip") {
                    // Skip LinkedIn — jump to Q1
                    useForgeStore
                      .getState()
                      .sendMessage("I'd rather skip LinkedIn for now");
                  } else {
                    submitLinkedInUrl(url);
                  }
                }}
                isLoading={isScrapingLinkedIn}
              />
            )}
            {msg.interaction === "goal_chips" && (
              <ForgeGoalChips
                onSelect={selectGoalChip}
                selectedId={goalChipId}
              />
            )}
            {msg.interaction === "autonomy_cards" && (
              <ForgeAutonomyCards
                onSelect={selectAutonomyOption}
                selectedId={autonomyOptionId}
              />
            )}
            {msg.interaction === "profile_result" &&
              inferredProfile &&
              drives && (
                <ForgeProfileCard
                  profile={inferredProfile}
                  drives={drives}
                  confidence={confidence}
                  activeModules={activeModules}
                  preloadedSkills={preloadedSkills}
                  onOverrideProfile={overrideProfile}
                  onToggleModule={toggleModule}
                />
              )}
            {msg.interaction === "launch_ready" && (
              <ForgeLaunchCard
                workspaceName={workspaceName}
                moduleCount={activeModules.length}
                isLaunching={isLaunching}
                onLaunch={launchWorkspace}
              />
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

export default function ForgeChat() {
  const { messages, isTyping, step, sendMessage, isComplete } = useForgeStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, isTyping]);

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
      >
        <AnimatePresence mode="popLayout">
          {messages.map((msg, i) => (
            <ForgeMessageBubble
              key={msg.id}
              msg={msg}
              isLatest={i === messages.length - 1}
            />
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3"
          >
            <OttoOtterAvatar size="sm" state="thinking" />
            <div className="rounded-xl bg-surface-overlay/80 border border-surface-border/50 px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-accent-secondary"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input — visible when step allows free text (steps 1, 2) and not complete */}
      {!isComplete && (step === 1 || step === 2) && (
        <div className="border-t border-surface-border/50 px-4 py-3">
          <ChatInput
            value=""
            onChange={() => {}}
            onSend={() => {}}
            placeholder="Or type your answer..."
            disabled={isTyping}
          />
        </div>
      )}
    </div>
  );
}
```

> **Note to implementer:** The ChatInput in ForgeChat needs local state wiring — add `useState` for input value and wire `onChange`/`onSend` to `sendMessage`. The code above shows structure; wire the state in implementation.

**Step 2: Verify**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && cd apps/web && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add apps/web/src/components/organisms/ForgeChat.tsx
git commit -m "feat(web): add ForgeChat organism — conversational onboarding UI"
```

---

### Task 5: Rewrite Onboarding Setup Page

**Files:**

- Modify: `apps/web/src/app/onboarding/setup/page.tsx`

Replace the 6-step card wizard with a split-panel layout: left panel = ForgeChat conversation, right panel = otter avatar (large, centered, shrinks when profile revealed). The ForgeCanvas wraps everything.

**Step 1: Rewrite the page**

Replace the entire contents of `page.tsx` with:

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useForgeStore } from "@/stores/forge.store";
import { useOnboardingStore } from "@/stores/onboarding.store";
import ForgeCanvas from "@/components/atoms/ForgeCanvas";
import OttoOtterAvatar from "@/components/atoms/OttoOtterAvatar";
import OttoAvatar from "@/components/atoms/OttoAvatar";
import ForgeChat from "@/components/organisms/ForgeChat";

export default function OnboardingSetupPage() {
  const router = useRouter();
  const { isComplete, inferredProfile, metaArchetype, step, reset } =
    useForgeStore();
  const completeAdminItem = useOnboardingStore((s) => s.completeAdminItem);

  // Navigate on launch complete
  useEffect(() => {
    if (isComplete) {
      completeAdminItem("create_workspace");
      completeAdminItem("enable_modules");
      localStorage.setItem("airlock_onboarding_complete", "true");
      const timer = setTimeout(() => router.push("/contracts/triage"), 1200);
      return () => clearTimeout(timer);
    }
  }, [isComplete, completeAdminItem, router]);

  // Reset forge on mount
  useEffect(() => {
    reset();
  }, [reset]);

  const showConstellation = !!inferredProfile;

  return (
    <ForgeCanvas>
      <div className="flex min-h-screen">
        {/* Left: Chat panel */}
        <div className="flex flex-1 flex-col max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-surface-border/30">
            <OttoOtterAvatar size="sm" state={step < 3 ? "idle" : "active"} />
            <div>
              <h1 className="text-sm font-bold text-text-primary">
                Workspace Forge
              </h1>
              <p className="text-[10px] text-text-muted">
                Otto is configuring your workspace
              </p>
            </div>

            {/* Step indicator */}
            <div className="ml-auto flex gap-1">
              {[0, 1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-1 rounded-full transition-all duration-500 ${
                    s <= step
                      ? "w-6 bg-accent-primary"
                      : "w-2 bg-surface-border/50"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Chat */}
          <div className="flex-1">
            <ForgeChat />
          </div>
        </div>

        {/* Right: Avatar panel (desktop only) */}
        <div className="hidden lg:flex lg:w-80 items-center justify-center border-l border-surface-border/20">
          <AnimatePresence mode="wait">
            {showConstellation ? (
              <motion.div
                key="constellation"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.6 }}
                className="text-center"
              >
                <OttoAvatar
                  size="lg"
                  archetype={
                    metaArchetype === "driver"
                      ? "executor"
                      : metaArchetype === "enforcer"
                        ? "guardian"
                        : "connector"
                  }
                  state="active"
                />
                <p className="mt-3 text-xs text-text-muted">
                  {metaArchetype
                    ? `${metaArchetype.charAt(0).toUpperCase()}${metaArchetype.slice(1)} Mode`
                    : ""}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="otter"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4 }}
              >
                <OttoOtterAvatar size="xl" state="idle" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </ForgeCanvas>
  );
}
```

**Step 2: Verify**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && cd apps/web && npx tsc --noEmit`

**Step 3: Run lint**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && cd apps/web && pnpm lint`

**Step 4: Commit**

```bash
git add apps/web/src/app/onboarding/setup/page.tsx
git commit -m "feat(web): replace wizard with conversational Forge Chat onboarding"
```

---

### Task 6: Wire Forge Store → Onboarding Store Bridge

**Files:**

- Modify: `apps/web/src/stores/forge.store.ts`

The Forge store's `launchWorkspace` currently doesn't update the onboarding store's `setupState` (workspace name, modules, etc.). Bridge the two so the onboarding checklist stays in sync.

**Step 1: Add bridge logic**

In `forge.store.ts`, update the `launchWorkspace` action to sync state:

```typescript
// Inside launchWorkspace:
const { activeModules, workspaceConfig } = get();
const onboarding = useOnboardingStore.getState();
// Sync enabled modules to onboarding
for (const mod of activeModules) {
  if (!onboarding.setupState.enabledModules.includes(mod)) {
    onboarding.toggleModule(mod);
  }
}
```

Add import at top:

```typescript
import { useOnboardingStore } from "@/stores/onboarding.store";
```

> **Note:** `useOnboardingStore` is already a Zustand store — calling `.getState()` outside React is safe.

**Step 2: Verify**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && cd apps/web && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add apps/web/src/stores/forge.store.ts
git commit -m "feat(web): bridge forge store to onboarding store on launch"
```

---

### Task 7: Type Check + Lint Full Build

**Files:** None (verification only)

**Step 1: Type check**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && cd apps/web && npx tsc --noEmit`

**Step 2: Lint**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && pnpm lint`

**Step 3: Fix any errors**

Address type errors or lint warnings. Common issues:

- Missing `"use client"` directives
- Unused imports from old wizard code
- Framer Motion types needing explicit `React.ReactNode`

**Step 4: Final commit**

```bash
git add -A
git commit -m "fix(web): resolve type and lint errors for forge chat onboarding"
```

---

## Architecture Summary

```
/onboarding/setup
├── ForgeCanvas (grid background + ambient orbs)
│   └── Split Layout
│       ├── Left Panel (max-w-2xl)
│       │   ├── Header (otter avatar sm + step dots)
│       │   └── ForgeChat (organism)
│       │       ├── ForgeMessageBubble × N
│       │       │   ├── OttoOtterAvatar or OttoAvatar (avatar transitions)
│       │       │   ├── Chat bubble (markdown-lite)
│       │       │   └── Inline interaction:
│       │       │       ├── ForgeLinkedInInput (step 0)
│       │       │       ├── ForgeGoalChips (step 1)
│       │       │       ├── ForgeAutonomyCards (step 2)
│       │       │       ├── ForgeProfileCard (step 3)
│       │       │       └── ForgeLaunchCard (step 4)
│       │       ├── Typing indicator
│       │       └── ChatInput (free text for steps 1-2)
│       └── Right Panel (lg:only)
│           └── AnimatePresence
│               ├── OttoOtterAvatar xl (before profile)
│               └── OttoAvatar lg + archetype (after profile)
```

## Data Flow

```
User types/clicks → forge.store action → updates messages[] + step
                  → ForgeChat re-renders → new bubble + interaction
                  → On launch → bridge to onboarding.store → navigate
```

---

### Task 8: API Key Power-Up Animation ("Charging the Airlock")

**Files:**

- Create: `apps/web/src/components/molecules/ForgeApiKeyInput.tsx`
- Modify: `apps/web/src/components/atoms/ForgeCanvas.tsx`
- Modify: `apps/web/src/stores/forge.store.ts`
- Modify: `apps/web/src/components/organisms/ForgeChat.tsx`

**Concept:** Until the user enters an API key, the entire platform feels dormant — muted colors, no glow, grid barely visible, otter eyes dim. When the API key is entered, a power-up sequence fires:

1. **Before key:** Grid dots at 5% opacity, no ambient orbs, otter eyes dim (opacity 0.3), all UI tinted gray, constellation nodes offline
2. **Key entered:** Pulse wave radiates from the API key input → grid brightens to full → ambient orbs fade in → otter eyes glow to full → chamber dots ignite one by one (D→B→R→S) → constellation nodes spark online
3. **After key:** Full-power state, all animations active, platform "alive"

**Step 1: Add `isPowered` state to forge store**

In `forge.store.ts`, add to the interface and initial state:

```typescript
// Interface addition:
isPowered: boolean;
apiKey: string | null;
powerUp: (key: string) => void;

// Initial state:
isPowered: false,
apiKey: null,

// Action:
powerUp: (key: string) => {
  set({ apiKey: key, isPowered: true });
  // Save to capability tree (same as old wizard step 5)
  const { saveNodeConfig } = useCapabilityTreeStore.getState();
  saveNodeConfig("ai_provider", {
    provider: "Anthropic",
    apiKey: key,
    model: "claude-sonnet-4-20250514",
  });
},
```

Also update `reset` to include `isPowered: false, apiKey: null`.

**Step 2: Add `isPowered` prop to ForgeCanvas**

```tsx
interface ForgeCanvasProps {
  children: React.ReactNode;
  showGrid?: boolean;
  isPowered?: boolean; // NEW
  className?: string;
}

// Grid opacity based on power state
<div
  className="pointer-events-none absolute inset-0 transition-opacity duration-[2000ms]"
  style={{
    backgroundImage:
      "radial-gradient(circle, rgba(124,92,252,0.12) 1px, transparent 1px)",
    backgroundSize: "24px 24px",
    opacity: isPowered ? 1 : 0.15,
  }}
/>;

// Ambient orbs — hidden until powered
{
  isPowered && (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-accent-primary/8"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2, ease: "easeOut" }}
      />
      {/* ... second orb with delay */}
    </div>
  );
}

// Power-up pulse ring (plays once on transition)
{
  isPowered && (
    <motion.div
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 2, delay: 0.5 }}
    >
      <motion.div
        className="rounded-full border-2 border-accent-primary/40"
        initial={{ width: 0, height: 0 }}
        animate={{ width: "200vw", height: "200vw" }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />
    </motion.div>
  );
}
```

**Step 3: Create ForgeApiKeyInput molecule**

```tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { KeyRound, Zap } from "lucide-react";

interface ForgeApiKeyInputProps {
  onSubmit: (key: string) => void;
  isPowered: boolean;
}

export default function ForgeApiKeyInput({
  onSubmit,
  isPowered,
}: ForgeApiKeyInputProps) {
  const [key, setKey] = useState("");
  const [isCharging, setIsCharging] = useState(false);

  async function handleCharge() {
    if (!key.trim()) return;
    setIsCharging(true);
    // Simulate validation delay for dramatic effect
    await new Promise((r) => setTimeout(r, 800));
    onSubmit(key.trim());
    setIsCharging(false);
  }

  if (isPowered) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mt-3 rounded-lg border border-accent-success/30 bg-accent-success/5 px-4 py-3 text-center"
      >
        <Zap size={16} className="inline text-accent-success mr-1" />
        <span className="text-xs font-medium text-accent-success">
          Airlock powered up
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 space-y-2"
    >
      <div className="relative">
        <KeyRound
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
        />
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCharge()}
          placeholder="sk-ant-..."
          className="w-full rounded-lg border border-surface-border bg-surface-sunken pl-9 pr-4 py-2.5 text-sm text-text-primary font-mono placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
        />
      </div>
      <div className="flex gap-2">
        <motion.button
          onClick={handleCharge}
          disabled={!key.trim() || isCharging}
          className="flex-1 rounded-lg bg-accent-primary py-2.5 text-xs font-semibold text-surface-base hover:bg-accent-primary-hover disabled:opacity-40 transition-colors"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
        >
          {isCharging ? (
            <span className="flex items-center justify-center gap-1.5">
              <Zap size={12} className="animate-pulse" /> Charging...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-1.5">
              <Zap size={12} /> Power Up
            </span>
          )}
        </motion.button>
        <button
          onClick={() => onSubmit("demo")}
          className="rounded-lg px-3 py-2.5 text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          Demo mode
        </button>
      </div>
    </motion.div>
  );
}
```

**Step 4: Update conversation flow**

In `mock-forge.ts`, insert a new step between LinkedIn result and Q1. Add a new interaction type `"api_key"` and a new message:

```typescript
export const FORGE_API_KEY_ASK: ForgeMessage = {
  id: "forge_api_key",
  role: "otto",
  content:
    "One more thing — to power me up, drop in your API key. Without it, I'm just a cute face on a dark screen.",
  timestamp: new Date().toISOString(),
  interaction: "api_key",
};
```

Update forge.store step flow: after LinkedIn (step 0) → API key (step 0.5 or renumber to 1) → goal chips (step 2) → autonomy (step 3) → result (step 4) → launch (step 5).

**Step 5: Wire power state through the UI**

In `ForgeChat`, pass `isPowered` to interactions. In the onboarding page, pass `isPowered` to `ForgeCanvas`. The otter/constellation avatars get a `dimmed` class when `!isPowered`:

```tsx
// OttoOtterAvatar addition: dim state
className={`... ${!isPowered ? "opacity-30 saturate-0" : ""}`}
```

**Step 6: Add dimmed state to ForgeCanvas children**

```tsx
// In the page layout, wrap children in a powered-state container:
<div
  className={`transition-all duration-[2000ms] ${
    isPowered ? "saturate-100" : "saturate-[0.3] brightness-50"
  }`}
>
  {/* all content */}
</div>
```

**Step 7: Verify + commit**

Run: `source ~/.nvm/nvm.sh && nvm use 20 && cd apps/web && npx tsc --noEmit && pnpm lint`

```bash
git add apps/web/src/components/molecules/ForgeApiKeyInput.tsx apps/web/src/components/atoms/ForgeCanvas.tsx apps/web/src/stores/forge.store.ts apps/web/src/components/organisms/ForgeChat.tsx apps/web/src/lib/mock-forge.ts
git commit -m "feat(web): add API key power-up animation — charging the Airlock"
```

---

## What's Preserved

- **Onboarding store** — phase tracking, checklists, localStorage persistence
- **Forge store** — entire conversation flow, PI inference, workspace config
- **OttoAvatar** — constellation renders after profile inference
- **ChatMessage/ChatInput** — reused from messenger

## What's New

- **OttoOtterAvatar** — geometric otter SVG atom
- **ForgeCanvas** — grid background atom
- **5 Forge molecules** — LinkedIn input, goal chips, autonomy cards, profile card, launch card
- **ForgeChat** — organism wiring it all together
- **Page rewrite** — split-panel conversational layout replaces card wizard
