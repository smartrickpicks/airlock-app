"use client";

/* ── Types ─────────────────────────────────────────────────────────────── */

export type OtterSize = "sm" | "md" | "lg" | "xl";
export type OtterState = "idle" | "thinking" | "active" | "celebrating";
export type OtterChamber = "discover" | "build" | "review" | "ship";

interface OttoOtterAvatarProps {
  size?: OtterSize;
  state?: OtterState;
  chamber?: OtterChamber;
  className?: string;
}

/* ── Constants ──────────────────────────────────────────────────────────── */

const SIZE_MAP: Record<OtterSize, number> = {
  sm: 48,
  md: 80,
  lg: 120,
  xl: 200,
};

// Structural purple — wireframe design language
const PURPLE = "#7C5CFC";
// Accent cyan — playbook / highlights
const CYAN = "#00D1FF";
// OLED dark fill for inner face
const OLED_DARK = "#0A0A0F";

const CHAMBER_COLORS: Record<OtterChamber, string> = {
  discover: "#EF4444",
  build: "#EAB308",
  review: "#A855F7",
  ship: "#22C55E",
};

// Belly chamber dot positions
const CHAMBER_DOTS: { key: OtterChamber; cx: number; cy: number }[] = [
  { key: "discover", cx: 125, cy: 185 },
  { key: "build", cx: 140, cy: 178 },
  { key: "review", cx: 155, cy: 185 },
  { key: "ship", cx: 140, cy: 195 },
];

/* ── Component ──────────────────────────────────────────────────────────── */

export default function OttoOtterAvatar({
  size = "md",
  state = "idle",
  chamber,
  className = "",
}: OttoOtterAvatarProps) {
  const px = SIZE_MAP[size];
  // viewBox is 280×320; height is taller than wide
  const height = Math.round(px * 1.14);

  return (
    <div
      className={`relative flex-shrink-0 ${className}`}
      style={{ width: px, height }}
    >
      <svg
        viewBox="0 0 280 320"
        width={px}
        height={height}
        role="img"
        aria-label="Otto the Otter — AI assistant"
        overflow="visible"
      >
        <defs>
          {/* Ambient purple glow filter */}
          <filter
            id="otto-glow-purple"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Cyan glow filter */}
          <filter
            id="otto-glow-cyan"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Tail ──────────────────────────────────────────────────────── */}
        <path
          d="M 140 255 Q 175 272 185 292 Q 195 308 170 310 Q 148 312 140 295"
          fill="none"
          stroke={PURPLE}
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.55"
        >
          <animate
            attributeName="d"
            values="
              M 140 255 Q 175 272 185 292 Q 195 308 170 310 Q 148 312 140 295;
              M 140 255 Q 165 268 172 290 Q 178 308 155 312 Q 136 314 132 297;
              M 140 255 Q 175 272 185 292 Q 195 308 170 310 Q 148 312 140 295
            "
            dur="3s"
            repeatCount="indefinite"
          />
        </path>

        {/* ── Body ──────────────────────────────────────────────────────── */}
        {/* Main body ellipse */}
        <ellipse
          cx="140"
          cy="195"
          rx="60"
          ry="72"
          fill="none"
          stroke={PURPLE}
          strokeWidth="1.5"
          opacity="0.45"
        />

        {/* Body wireframe — 5 vertical lines (shoulders to hips) */}
        <line
          x1="100"
          y1="138"
          x2="100"
          y2="252"
          stroke={PURPLE}
          strokeWidth="0.75"
          opacity="0.12"
        />
        <line
          x1="115"
          y1="127"
          x2="112"
          y2="262"
          stroke={PURPLE}
          strokeWidth="0.75"
          opacity="0.10"
        />
        <line
          x1="140"
          y1="123"
          x2="140"
          y2="267"
          stroke={PURPLE}
          strokeWidth="0.75"
          opacity="0.12"
        />
        <line
          x1="165"
          y1="127"
          x2="168"
          y2="262"
          stroke={PURPLE}
          strokeWidth="0.75"
          opacity="0.10"
        />
        <line
          x1="180"
          y1="138"
          x2="180"
          y2="252"
          stroke={PURPLE}
          strokeWidth="0.75"
          opacity="0.12"
        />

        {/* Body wireframe — 3 horizontal cross-wires */}
        <line
          x1="82"
          y1="175"
          x2="198"
          y2="175"
          stroke={PURPLE}
          strokeWidth="0.75"
          opacity="0.08"
        />
        <line
          x1="80"
          y1="195"
          x2="200"
          y2="195"
          stroke={PURPLE}
          strokeWidth="0.75"
          opacity="0.10"
        />
        <line
          x1="85"
          y1="215"
          x2="195"
          y2="215"
          stroke={PURPLE}
          strokeWidth="0.75"
          opacity="0.08"
        />

        {/* ── Chamber Dots on Belly ──────────────────────────────────────── */}
        {CHAMBER_DOTS.map(({ key, cx, cy }) => {
          const isActive = chamber === key;
          return (
            <circle
              key={key}
              cx={cx}
              cy={cy}
              r={isActive ? 5 : 4}
              fill={CHAMBER_COLORS[key]}
              opacity={isActive ? 0.9 : 0.5}
            >
              <animate
                attributeName="opacity"
                values={isActive ? "0.75;0.95;0.75" : "0.35;0.55;0.35"}
                dur={isActive ? "1.8s" : "3s"}
                repeatCount="indefinite"
              />
            </circle>
          );
        })}

        {/* ── Paws ──────────────────────────────────────────────────────── */}
        {/* Left paw */}
        <ellipse
          cx="112"
          cy="232"
          rx="14"
          ry="9"
          fill="none"
          stroke={PURPLE}
          strokeWidth="1.5"
          opacity="0.5"
        />
        {/* Right paw */}
        <ellipse
          cx="168"
          cy="232"
          rx="14"
          ry="9"
          fill="none"
          stroke={PURPLE}
          strokeWidth="1.5"
          opacity="0.5"
        />

        {/* ── Diamond Playbook between paws ────────────────────────────── */}
        <polygon
          points="140,215 155,232 140,249 125,232"
          fill={CYAN}
          fillOpacity="0.06"
          stroke={CYAN}
          strokeWidth="1.5"
          opacity="0.75"
          filter="url(#otto-glow-cyan)"
        >
          <animate
            attributeName="opacity"
            values="0.55;0.85;0.55"
            dur="2.5s"
            repeatCount="indefinite"
          />
        </polygon>

        {/* ── Feet ──────────────────────────────────────────────────────── */}
        {/* Left foot */}
        <ellipse
          cx="115"
          cy="265"
          rx="18"
          ry="8"
          fill="none"
          stroke={PURPLE}
          strokeWidth="1.25"
          opacity="0.4"
        />
        {/* Right foot */}
        <ellipse
          cx="165"
          cy="265"
          rx="18"
          ry="8"
          fill="none"
          stroke={PURPLE}
          strokeWidth="1.25"
          opacity="0.4"
        />

        {/* ── Head ──────────────────────────────────────────────────────── */}
        {/* Outer head circle */}
        <circle
          cx="140"
          cy="95"
          r="52"
          fill="none"
          stroke={PURPLE}
          strokeWidth="1.5"
          opacity="0.45"
        />
        {/* Inner face circle — OLED dark fill */}
        <circle
          cx="140"
          cy="95"
          r="38"
          fill={OLED_DARK}
          stroke={PURPLE}
          strokeWidth="1"
          opacity="0.9"
        />

        {/* Head wireframe lines */}
        <line
          x1="140"
          y1="43"
          x2="140"
          y2="147"
          stroke={PURPLE}
          strokeWidth="0.75"
          opacity="0.10"
        />
        <line
          x1="88"
          y1="95"
          x2="192"
          y2="95"
          stroke={PURPLE}
          strokeWidth="0.75"
          opacity="0.10"
        />
        <line
          x1="99"
          y1="68"
          x2="181"
          y2="122"
          stroke={PURPLE}
          strokeWidth="0.75"
          opacity="0.06"
        />

        {/* ── Ears ──────────────────────────────────────────────────────── */}
        {/* Left ear outer */}
        <circle
          cx="97"
          cy="58"
          r="14"
          fill="none"
          stroke={PURPLE}
          strokeWidth="1.5"
          opacity="0.45"
        />
        {/* Left ear inner */}
        <circle
          cx="97"
          cy="58"
          r="7"
          fill={OLED_DARK}
          stroke={PURPLE}
          strokeWidth="1"
          opacity="0.6"
        />
        {/* Right ear outer */}
        <circle
          cx="183"
          cy="58"
          r="14"
          fill="none"
          stroke={PURPLE}
          strokeWidth="1.5"
          opacity="0.45"
        />
        {/* Right ear inner */}
        <circle
          cx="183"
          cy="58"
          r="7"
          fill={OLED_DARK}
          stroke={PURPLE}
          strokeWidth="1"
          opacity="0.6"
        />

        {/* ── Eyes ──────────────────────────────────────────────────────── */}
        {/* Left eye glow ring */}
        <circle
          cx="122"
          cy="92"
          r="14"
          fill="none"
          stroke={PURPLE}
          strokeWidth="1"
          opacity="0.2"
        >
          <animate
            attributeName="r"
            values="12;16;12"
            dur="3s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.15;0.3;0.15"
            dur="3s"
            repeatCount="indefinite"
          />
        </circle>
        {/* Right eye glow ring */}
        <circle
          cx="158"
          cy="92"
          r="14"
          fill="none"
          stroke={PURPLE}
          strokeWidth="1"
          opacity="0.2"
        >
          <animate
            attributeName="r"
            values="12;16;12"
            dur="3s"
            begin="0.5s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.15;0.3;0.15"
            dur="3s"
            begin="0.5s"
            repeatCount="indefinite"
          />
        </circle>

        {/* Left eye — with blink */}
        <ellipse cx="122" cy="92" rx="7" ry="7" fill={PURPLE} opacity="0.9">
          <animate
            attributeName="ry"
            values="7;7;7;7;1;7;7"
            keyTimes="0;0.4;0.48;0.49;0.5;0.51;1"
            dur="4s"
            repeatCount="indefinite"
          />
        </ellipse>
        {/* Left eye highlight */}
        <circle cx="119" cy="89" r="2.5" fill="#ffffff" opacity="0.7" />

        {/* Right eye — with blink (slight offset) */}
        <ellipse cx="158" cy="92" rx="7" ry="7" fill={PURPLE} opacity="0.9">
          <animate
            attributeName="ry"
            values="7;7;7;7;1;7;7"
            keyTimes="0;0.4;0.48;0.49;0.5;0.51;1"
            dur="4s"
            begin="0.08s"
            repeatCount="indefinite"
          />
        </ellipse>
        {/* Right eye highlight */}
        <circle cx="155" cy="89" r="2.5" fill="#ffffff" opacity="0.7" />

        {/* ── Nose ──────────────────────────────────────────────────────── */}
        <ellipse
          cx="140"
          cy="105"
          rx="5"
          ry="3.5"
          fill={PURPLE}
          opacity="0.75"
        />

        {/* ── Mouth (subtle smile) ──────────────────────────────────────── */}
        <path
          d="M 131 112 Q 140 119 149 112"
          fill="none"
          stroke={PURPLE}
          strokeWidth="1.25"
          strokeLinecap="round"
          opacity="0.5"
        />

        {/* ── Whiskers ──────────────────────────────────────────────────── */}
        {/* Left whiskers */}
        <line
          x1="100"
          y1="106"
          x2="78"
          y2="103"
          stroke={PURPLE}
          strokeWidth="0.75"
          opacity="0.4"
          strokeLinecap="round"
        />
        <line
          x1="100"
          y1="110"
          x2="78"
          y2="110"
          stroke={PURPLE}
          strokeWidth="0.75"
          opacity="0.4"
          strokeLinecap="round"
        />
        <line
          x1="100"
          y1="114"
          x2="78"
          y2="117"
          stroke={PURPLE}
          strokeWidth="0.75"
          opacity="0.4"
          strokeLinecap="round"
        />
        {/* Right whiskers */}
        <line
          x1="180"
          y1="106"
          x2="202"
          y2="103"
          stroke={PURPLE}
          strokeWidth="0.75"
          opacity="0.4"
          strokeLinecap="round"
        />
        <line
          x1="180"
          y1="110"
          x2="202"
          y2="110"
          stroke={PURPLE}
          strokeWidth="0.75"
          opacity="0.4"
          strokeLinecap="round"
        />
        <line
          x1="180"
          y1="114"
          x2="202"
          y2="117"
          stroke={PURPLE}
          strokeWidth="0.75"
          opacity="0.4"
          strokeLinecap="round"
        />

        {/* ── State-Specific Layers ─────────────────────────────────────── */}

        {/* Thinking: rotating dashed ring */}
        {state === "thinking" && (
          <circle
            cx="140"
            cy="160"
            r="100"
            fill="none"
            stroke={PURPLE}
            strokeWidth="1.5"
            strokeDasharray="8 16"
            opacity="0.3"
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

        {/* Celebrating: pulsing cyan glow ring */}
        {state === "celebrating" && (
          <circle
            cx="140"
            cy="160"
            r="100"
            fill="none"
            stroke={CYAN}
            strokeWidth="2"
            opacity="0.4"
            filter="url(#otto-glow-cyan)"
          >
            <animate
              attributeName="r"
              values="90;120;90"
              dur="1.2s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.3;0.6;0.3"
              dur="1.2s"
              repeatCount="indefinite"
            />
          </circle>
        )}

        {/* Idle: ambient purple glow (very subtle) */}
        {state === "idle" && (
          <circle
            cx="140"
            cy="160"
            r="100"
            fill="none"
            stroke={PURPLE}
            strokeWidth="1"
            opacity="0.1"
          >
            <animate
              attributeName="r"
              values="90;110;90"
              dur="4s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.06;0.14;0.06"
              dur="4s"
              repeatCount="indefinite"
            />
          </circle>
        )}

        {/* Active: ambient purple glow (slightly brighter) */}
        {state === "active" && (
          <circle
            cx="140"
            cy="160"
            r="100"
            fill="none"
            stroke={PURPLE}
            strokeWidth="1.25"
            opacity="0.15"
          >
            <animate
              attributeName="r"
              values="90;110;90"
              dur="3s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.10;0.22;0.10"
              dur="3s"
              repeatCount="indefinite"
            />
          </circle>
        )}

        {/* ── Always-on ambient purple glow ring (bottom) ───────────────── */}
        <circle
          cx="140"
          cy="260"
          r="55"
          fill={PURPLE}
          fillOpacity="0.04"
          stroke={PURPLE}
          strokeWidth="0.5"
          opacity="0.25"
          filter="url(#otto-glow-purple)"
        >
          <animate
            attributeName="opacity"
            values="0.18;0.32;0.18"
            dur="5s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
    </div>
  );
}
