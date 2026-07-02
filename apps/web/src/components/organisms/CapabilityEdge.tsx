"use client";

import { memo } from "react";
import { getSmoothStepPath, type EdgeProps } from "@xyflow/react";

function CapabilityEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const gradientId = `grad-${id}`;
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 16,
  });

  const satisfied = !!(data as Record<string, unknown>)?.satisfied;

  if (!satisfied) {
    // Static faded dashed edge
    return (
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke="color-mix(in srgb, var(--surface-border) 30%, transparent)"
        strokeWidth={1}
        strokeDasharray="4 6"
      />
    );
  }

  // Animated beam edge — traveling glow pulse
  return (
    <g>
      {/* Gradient definition with animated stops */}
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1={sourceX}
          y1={sourceY}
          x2={targetX}
          y2={targetY}
        >
          <stop
            offset="0%"
            stopColor="var(--accent-primary)"
            stopOpacity="0.15"
          >
            <animate
              attributeName="stopOpacity"
              values="0.15;0.15;0.6;0.15;0.15"
              dur="3s"
              repeatCount="indefinite"
            />
          </stop>
          <stop
            offset="30%"
            stopColor="var(--accent-primary)"
            stopOpacity="0.15"
          >
            <animate
              attributeName="stopOpacity"
              values="0.15;0.15;0.15;0.6;0.15"
              dur="3s"
              repeatCount="indefinite"
            />
          </stop>
          <stop
            offset="60%"
            stopColor="var(--accent-primary)"
            stopOpacity="0.6"
          >
            <animate
              attributeName="stopOpacity"
              values="0.6;0.15;0.15;0.15;0.6"
              dur="3s"
              repeatCount="indefinite"
            />
          </stop>
          <stop
            offset="100%"
            stopColor="var(--accent-primary)"
            stopOpacity="0.15"
          >
            <animate
              attributeName="stopOpacity"
              values="0.15;0.6;0.15;0.15;0.15"
              dur="3s"
              repeatCount="indefinite"
            />
          </stop>
        </linearGradient>
      </defs>

      {/* Base line (dim) */}
      <path
        d={edgePath}
        fill="none"
        stroke="var(--accent-primary)"
        strokeWidth={2}
        strokeOpacity={0.15}
      />

      {/* Animated beam overlay */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={2}
      />
    </g>
  );
}

export default memo(CapabilityEdgeComponent);
