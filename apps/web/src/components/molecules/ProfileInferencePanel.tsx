"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import ArchetypeBadge from "@/components/atoms/ArchetypeBadge";
import type {
  ForgeProfile,
  ForgeDrives,
  MetaArchetype,
} from "@/lib/mock-forge";
import { MOCK_PROFILES } from "@/lib/mock-forge";

interface ProfileInferencePanelProps {
  profile: ForgeProfile;
  drives: ForgeDrives;
  confidence: number;
  archetype: MetaArchetype;
  onOverride: (profileId: string) => void;
}

const DRIVE_LABELS: { key: keyof ForgeDrives; label: string; color: string }[] =
  [
    { key: "dominance", label: "Dominance", color: "bg-accent-primary" },
    { key: "extraversion", label: "Extraversion", color: "bg-accent-warning" },
    { key: "patience", label: "Patience", color: "bg-accent-success" },
    {
      key: "formality",
      label: "Formality",
      color: "bg-[var(--chamber-review)]",
    },
  ];

export default function ProfileInferencePanel({
  profile,
  drives,
  confidence,
  archetype,
  onOverride,
}: ProfileInferencePanelProps) {
  const [showOverride, setShowOverride] = useState(false);

  return (
    <div className="space-y-4 rounded-lg border border-surface-border bg-surface-raised p-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
            Otto thinks you&apos;re a
          </p>
          <h3 className="mt-0.5 text-lg font-bold text-text-primary">
            {profile.name}
          </h3>
          <p className="mt-0.5 text-xs text-text-secondary">{profile.bio}</p>
        </div>
        <ArchetypeBadge archetype={archetype} size="sm" />
      </div>

      {/* Confidence */}
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-text-muted">Confidence</span>
          <span className="text-[11px] font-semibold text-text-secondary">
            {Math.round(confidence * 100)}%
          </span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-overlay">
          <div
            className="h-full rounded-full bg-accent-primary transition-all duration-500"
            style={{ width: `${confidence * 100}%` }}
          />
        </div>
      </div>

      {/* DECF Drives */}
      <div className="space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
          Behavioral Drives
        </p>
        {DRIVE_LABELS.map(({ key, label, color }) => (
          <div key={key} className="flex items-center gap-2">
            <span className="w-20 text-[11px] text-text-secondary">
              {label}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-overlay">
              <div
                className={`h-full rounded-full ${color} transition-all duration-700`}
                style={{ width: `${(drives[key] / 10) * 100}%` }}
              />
            </div>
            <span className="w-5 text-right text-[11px] font-semibold text-text-muted">
              {drives[key]}
            </span>
          </div>
        ))}
      </div>

      {/* Strengths */}
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
          Strengths
        </p>
        <div className="mt-1 flex flex-wrap gap-1">
          {profile.strengths.map((s) => (
            <span
              key={s}
              className="rounded-full border border-surface-border bg-surface-overlay px-2 py-0.5 text-[10px] text-text-secondary"
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Override */}
      <div className="border-t border-surface-border pt-3">
        <button
          onClick={() => setShowOverride(!showOverride)}
          className="flex items-center gap-1 text-[11px] text-text-muted hover:text-accent-primary transition-colors"
        >
          <span>Not quite right?</span>
          <ChevronDown
            size={12}
            className={`transition-transform ${showOverride ? "rotate-180" : ""}`}
          />
        </button>

        {showOverride && (
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {MOCK_PROFILES.filter((p) => p.id !== profile.id).map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  onOverride(p.id);
                  setShowOverride(false);
                }}
                className="flex items-center gap-1.5 rounded border border-surface-border bg-surface-overlay px-2 py-1.5 text-left transition-colors hover:border-accent-primary/40"
              >
                <ArchetypeBadge
                  archetype={p.metaArchetype}
                  size="sm"
                  showLabel={false}
                />
                <span className="text-[11px] text-text-secondary">
                  {p.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
