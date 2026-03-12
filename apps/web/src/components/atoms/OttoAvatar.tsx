"use client";

import { useMemo } from "react";

/* ── Types ─────────────────────────────────────────────────────────────── */

export type OttoAvatarSize = "xs" | "sm" | "md" | "lg";
export type OttoArchetype =
  | "analyst"
  | "architect"
  | "connector"
  | "executor"
  | "guardian"
  | "strategist";
export type OttoChamber = "discover" | "build" | "review" | "ship";
export type OttoState =
  | "active"
  | "thinking"
  | "idle"
  | "error"
  | "offline"
  | "transitioning";

interface OttoAvatarProps {
  size?: OttoAvatarSize;
  archetype?: OttoArchetype;
  chamber?: OttoChamber;
  state?: OttoState;
  className?: string;
}

/* ── Color Maps ────────────────────────────────────────────────────────── */

const ARCHETYPE_COLORS: Record<OttoArchetype, string> = {
  analyst: "#6A9BCC",
  architect: "#6366F1",
  connector: "#14B8A6",
  executor: "#F59E0B",
  guardian: "#22C55E",
  strategist: "#A855F7",
};

const CHAMBER_COLORS: Record<OttoChamber, string> = {
  discover: "#EF4444",
  build: "#EAB308",
  review: "#A855F7",
  ship: "#22C55E",
};

const EYE_COLOR = "#00D1FF";

const SIZE_MAP: Record<OttoAvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 48,
  lg: 64,
};

/* ── Constellation Node Data (from airlock-landing) ────────────────────── */

interface ConstellationNode {
  x: number;
  y: number;
  r: number;
  type: "eye" | "node" | "chamber";
  chamberKey?: OttoChamber;
}

const NODES: ConstellationNode[] = [
  // Eyes (index 0, 1)
  { x: 120, y: 130, r: 8, type: "eye" },
  { x: 200, y: 130, r: 8, type: "eye" },
  // Forehead
  { x: 160, y: 75, r: 4, type: "node" },
  { x: 130, y: 85, r: 3, type: "node" },
  { x: 190, y: 85, r: 3, type: "node" },
  // Brow
  { x: 105, y: 110, r: 3, type: "node" },
  { x: 215, y: 110, r: 3, type: "node" },
  // Nose bridge
  { x: 160, y: 150, r: 4, type: "node" },
  // Mouth
  { x: 140, y: 175, r: 3, type: "node" },
  { x: 160, y: 180, r: 3, type: "node" },
  { x: 180, y: 175, r: 3, type: "node" },
  // Jaw
  { x: 110, y: 185, r: 2.5, type: "node" },
  { x: 210, y: 185, r: 2.5, type: "node" },
  // Chin
  { x: 160, y: 205, r: 3, type: "node" },
  // Chamber corners
  { x: 55, y: 50, r: 5, type: "chamber", chamberKey: "discover" },
  { x: 265, y: 50, r: 5, type: "chamber", chamberKey: "build" },
  { x: 265, y: 260, r: 5, type: "chamber", chamberKey: "review" },
  { x: 55, y: 260, r: 5, type: "chamber", chamberKey: "ship" },
  // Outer
  { x: 80, y: 140, r: 2.5, type: "node" },
  { x: 240, y: 140, r: 2.5, type: "node" },
  { x: 100, y: 220, r: 2.5, type: "node" },
  { x: 220, y: 220, r: 2.5, type: "node" },
  { x: 160, y: 240, r: 3, type: "node" },
];

const EDGES: [number, number][] = [
  [0, 3],
  [0, 5],
  [0, 7],
  [1, 4],
  [1, 6],
  [1, 7],
  [2, 3],
  [2, 4],
  [3, 5],
  [4, 6],
  [7, 8],
  [7, 9],
  [7, 10],
  [8, 9],
  [9, 10],
  [5, 11],
  [6, 12],
  [8, 11],
  [10, 12],
  [11, 13],
  [12, 13],
  [9, 13],
  [3, 14],
  [5, 14],
  [4, 15],
  [6, 15],
  [12, 16],
  [21, 16],
  [11, 17],
  [20, 17],
  [5, 18],
  [0, 18],
  [6, 19],
  [1, 19],
  [11, 20],
  [18, 20],
  [12, 21],
  [19, 21],
  [13, 22],
  [20, 22],
  [21, 22],
  [14, 18],
  [15, 19],
  [16, 21],
  [17, 20],
];

/* ── Archetype Mode Transforms ─────────────────────────────────────────── */

function getArchetypePosition(
  node: ConstellationNode,
  index: number,
  archetype: OttoArchetype | undefined,
): { x: number; y: number } {
  const cx = 160,
    cy = 155;
  if (!archetype) return { x: node.x, y: node.y };

  switch (archetype) {
    case "analyst": // Tight precision — contract inward
      return { x: cx + (node.x - cx) * 0.7, y: cy + (node.y - cy) * 0.7 };
    case "executor": // Expanded — explosive outward
      return { x: cx + (node.x - cx) * 1.25, y: cy + (node.y - cy) * 1.25 };
    case "guardian": {
      // Defensive ring — outer nodes collapse to perimeter
      const dx = node.x - cx,
        dy = node.y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 60) {
        const angle = Math.atan2(dy, dx);
        return {
          x: cx + Math.cos(angle) * 95,
          y: cy + Math.sin(angle) * 95,
        };
      }
      return { x: node.x, y: node.y };
    }
    case "strategist": {
      // Systems mapping — radial redistribution
      if (index < 2) return { x: node.x, y: node.y };
      const angle = (index / NODES.length) * Math.PI * 2;
      const radius = 50 + (index % 3) * 35;
      return {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
      };
    }
    case "connector":
      // Outward but softer than executor — social reach
      return { x: cx + (node.x - cx) * 1.1, y: cy + (node.y - cy) * 1.1 };
    case "architect":
      // Structured grid — subtle alignment
      return {
        x: cx + (node.x - cx) * 0.85,
        y: cy + (node.y - cy) * 0.85,
      };
    default:
      return { x: node.x, y: node.y };
  }
}

/* ── State Styles ──────────────────────────────────────────────────────── */

function getStateStyles(state: OttoState) {
  switch (state) {
    case "thinking":
      return { edgeOpacity: 0.4, pulseSpeed: 1.5, eyeBrightness: 0.7 };
    case "active":
      return { edgeOpacity: 0.6, pulseSpeed: 3, eyeBrightness: 1 };
    case "idle":
      return { edgeOpacity: 0.3, pulseSpeed: 5, eyeBrightness: 0.5 };
    case "error":
      return { edgeOpacity: 0.2, pulseSpeed: 1, eyeBrightness: 0.3 };
    case "offline":
      return { edgeOpacity: 0.1, pulseSpeed: 0, eyeBrightness: 0.15 };
    case "transitioning":
      return { edgeOpacity: 0.5, pulseSpeed: 0.8, eyeBrightness: 0.8 };
    default:
      return { edgeOpacity: 0.4, pulseSpeed: 3, eyeBrightness: 0.6 };
  }
}

/* ── Component ─────────────────────────────────────────────────────────── */

export default function OttoAvatar({
  size = "md",
  archetype,
  chamber,
  state = "active",
  className = "",
}: OttoAvatarProps) {
  const px = SIZE_MAP[size];
  const archetypeColor = archetype ? ARCHETYPE_COLORS[archetype] : "#7C5CFC";
  const styles = getStateStyles(state);
  const showChamberRing = (size === "md" || size === "lg") && chamber;

  const positions = useMemo(
    () =>
      NODES.map((n, i) => ({
        ...getArchetypePosition(n, i, archetype),
        r: n.r,
        type: n.type,
        chamberKey: n.chamberKey,
      })),
    [archetype],
  );

  return (
    <div
      className={`relative flex-shrink-0 ${className}`}
      style={{ width: px, height: px }}
    >
      {/* Chamber ring (md/lg only) */}
      {showChamberRing && (
        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: `2px solid ${CHAMBER_COLORS[chamber]}`,
            opacity: 0.2,
          }}
        />
      )}

      <svg
        viewBox="0 0 320 320"
        className="h-full w-full"
        role="img"
        aria-label={`Otto avatar${archetype ? ` — ${archetype} mode` : ""}`}
      >
        {/* Edges */}
        {EDGES.map(([a, b], i) => {
          const pa = positions[a],
            pb = positions[b];
          return (
            <line
              key={`e-${i}`}
              x1={pa.x}
              y1={pa.y}
              x2={pb.x}
              y2={pb.y}
              stroke={archetypeColor}
              strokeWidth="1"
              strokeDasharray="4 4"
              opacity={styles.edgeOpacity}
            >
              {styles.pulseSpeed > 0 && (
                <animate
                  attributeName="stroke-opacity"
                  values={`${styles.edgeOpacity * 0.5};${styles.edgeOpacity};${styles.edgeOpacity * 0.5}`}
                  dur={`${styles.pulseSpeed + i * 0.1}s`}
                  repeatCount="indefinite"
                />
              )}
            </line>
          );
        })}

        {/* Nodes */}
        {positions.map((n, i) => (
          <g key={`n-${i}`}>
            {/* Eye glow ring */}
            {n.type === "eye" && (
              <circle
                cx={n.x}
                cy={n.y}
                r={n.r * 2.2}
                fill="none"
                stroke={EYE_COLOR}
                strokeWidth="1"
                opacity={styles.eyeBrightness * 0.2}
              >
                {styles.pulseSpeed > 0 && (
                  <animate
                    attributeName="r"
                    values={`${n.r * 1.8};${n.r * 2.5};${n.r * 1.8}`}
                    dur={`${styles.pulseSpeed}s`}
                    repeatCount="indefinite"
                  />
                )}
              </circle>
            )}

            {/* Node dot */}
            <circle
              cx={n.x}
              cy={n.y}
              r={n.r}
              fill={
                n.type === "eye"
                  ? EYE_COLOR
                  : n.type === "chamber" && n.chamberKey
                    ? CHAMBER_COLORS[n.chamberKey]
                    : archetypeColor
              }
              opacity={
                n.type === "eye"
                  ? styles.eyeBrightness
                  : n.type === "chamber"
                    ? 0.6
                    : 0.5
              }
            >
              {n.type !== "eye" && styles.pulseSpeed > 0 && (
                <animate
                  attributeName="r"
                  values={`${n.r - 0.5};${n.r + 0.5};${n.r - 0.5}`}
                  dur={`${styles.pulseSpeed + i * 0.15}s`}
                  repeatCount="indefinite"
                />
              )}
            </circle>

            {/* Eye highlight */}
            {n.type === "eye" && (
              <circle
                cx={n.x - 2}
                cy={n.y - 2}
                r="2.5"
                fill="#fff"
                opacity={styles.eyeBrightness * 0.6}
              />
            )}
          </g>
        ))}

        {/* Thinking state — rotating ring */}
        {state === "thinking" && (
          <circle
            cx="160"
            cy="155"
            r="120"
            fill="none"
            stroke={archetypeColor}
            strokeWidth="1.5"
            strokeDasharray="8 16"
            opacity="0.3"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 160 155"
              to="360 160 155"
              dur="3s"
              repeatCount="indefinite"
            />
          </circle>
        )}

        {/* Error state — red pulse */}
        {state === "error" && (
          <circle
            cx="160"
            cy="155"
            r="110"
            fill="none"
            stroke="#EF4444"
            strokeWidth="2"
            opacity="0.3"
          >
            <animate
              attributeName="opacity"
              values="0.1;0.4;0.1"
              dur="1.5s"
              repeatCount="indefinite"
            />
          </circle>
        )}
      </svg>

      {/* Offline overlay */}
      {state === "offline" && (
        <div className="absolute inset-0 rounded-full bg-surface-base/50" />
      )}
    </div>
  );
}
