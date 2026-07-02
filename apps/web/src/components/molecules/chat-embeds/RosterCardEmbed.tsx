"use client";

import UserAvatar from "@/components/atoms/UserAvatar";
import type { MetaArchetype } from "@/components/atoms/UserAvatar";

interface RosterCardEmbedProps {
  name: string;
  role: string;
  imageUrl?: string;
  metaArchetype?: MetaArchetype;
  drives?: { D: number; E: number; C: number; F: number };
}

const DRIVE_LABELS: Record<string, string> = {
  D: "Dominance",
  E: "Extraversion",
  C: "Patience",
  F: "Formality",
};

export default function RosterCardEmbed({
  name,
  role,
  imageUrl,
  metaArchetype,
  drives,
}: RosterCardEmbedProps) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised p-3">
      <div className="mb-2 text-[10px] font-mono uppercase tracking-wider text-text-muted">
        Team Member
      </div>

      <div className="flex items-center gap-3">
        <UserAvatar
          name={name}
          imageUrl={imageUrl}
          metaArchetype={metaArchetype}
          size="md"
        />
        <div>
          <p className="text-sm font-semibold text-text-primary">{name}</p>
          <p className="text-[11px] text-text-muted capitalize">{role}</p>
          {metaArchetype && (
            <p className="text-[10px] text-text-muted capitalize">
              {metaArchetype}
            </p>
          )}
        </div>
      </div>

      {drives && (
        <div className="mt-2 grid grid-cols-4 gap-1">
          {(Object.entries(drives) as [string, number][]).map(([key, val]) => (
            <div key={key} className="text-center">
              <span className="text-[9px] text-text-muted">
                {DRIVE_LABELS[key] || key}
              </span>
              <p className="text-xs font-semibold text-text-primary">
                {val.toFixed(1)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
