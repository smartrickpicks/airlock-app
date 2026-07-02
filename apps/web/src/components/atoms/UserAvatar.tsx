"use client";

import { useState } from "react";

/* ── Types ─────────────────────────────────────────────────────────────── */

export type MetaArchetype = "driver" | "enforcer" | "interpreter";
export type UserAvatarSize = "xs" | "sm" | "md" | "lg";

interface UserAvatarProps {
  name: string;
  imageUrl?: string;
  metaArchetype?: MetaArchetype;
  size?: UserAvatarSize;
  className?: string;
}

/* ── Constants ─────────────────────────────────────────────────────────── */

const META_ARCHETYPE_BORDER: Record<MetaArchetype, string> = {
  driver: "#EF4444",
  enforcer: "#6366F1",
  interpreter: "#14B8A6",
};

const SIZE_MAP: Record<UserAvatarSize, { px: number; text: string }> = {
  xs: { px: 24, text: "text-[9px]" },
  sm: { px: 32, text: "text-[11px]" },
  md: { px: 48, text: "text-sm" },
  lg: { px: 64, text: "text-lg" },
};

/* ── Helpers ───────────────────────────────────────────────────────────── */

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2)
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] ?? "?").toUpperCase();
}

function getInitialsBg(name: string): string {
  const COLORS = [
    "bg-[#00D1FF]/20",
    "bg-[#6366F1]/20",
    "bg-[#EF4444]/20",
    "bg-[#EAB308]/20",
    "bg-[#A855F7]/20",
    "bg-[#22C55E]/20",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

/* ── Component ─────────────────────────────────────────────────────────── */

export default function UserAvatar({
  name,
  imageUrl,
  metaArchetype,
  size = "md",
  className = "",
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const { px, text } = SIZE_MAP[size];
  const initials = getInitials(name);
  const bgColor = getInitialsBg(name);
  const showImage = imageUrl && !imgError;

  const borderColor = metaArchetype
    ? META_ARCHETYPE_BORDER[metaArchetype]
    : undefined;

  return (
    <div
      className={`relative flex-shrink-0 rounded-full overflow-hidden ${className}`}
      style={{
        width: px,
        height: px,
        ...(borderColor ? { border: `2px solid ${borderColor}` } : {}),
      }}
    >
      {showImage ? (
        <img
          src={imageUrl}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center ${bgColor} ${text} font-semibold text-text-primary`}
        >
          {initials}
        </div>
      )}
    </div>
  );
}
