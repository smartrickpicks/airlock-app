"use client";

import type { MemberDossier as DossierType } from "@/lib/mock-dossier";
import { ARCHETYPE_DISPLAY } from "@/lib/mock-forge";

function DriveBar({
  label,
  value,
  max = 10,
}: {
  label: string;
  value: number;
  max?: number;
}) {
  const pct = (value / max) * 100;
  return (
    <div className="flex items-center gap-3">
      <span className="w-4 text-xs font-bold text-text-muted">{label}</span>
      <div className="flex-1 h-3 rounded-full bg-surface-overlay overflow-hidden">
        <div
          className="h-full rounded-full bg-accent-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 text-right text-xs font-medium text-text-secondary">
        {value}
      </span>
    </div>
  );
}

export default function MemberDossier({ dossier }: { dossier: DossierType }) {
  const archetypeDisplay =
    ARCHETYPE_DISPLAY[dossier.metaArchetype] ??
    ARCHETYPE_DISPLAY["interpreter"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-accent-primary/20 text-xl font-bold text-accent-primary">
          {dossier.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-primary">
            {dossier.name}
          </h2>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${archetypeDisplay.bgColor} ${archetypeDisplay.color}`}
            >
              {dossier.piProfile.charAt(0).toUpperCase() +
                dossier.piProfile.slice(1)}
            </span>
            <span className="text-xs text-text-muted">&middot;</span>
            <span
              className={`text-xs font-medium capitalize ${archetypeDisplay.color}`}
            >
              {archetypeDisplay.label}
            </span>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            {Math.round(dossier.confidence * 100)}% confidence &middot; Source:{" "}
            {dossier.source}
          </p>
        </div>
      </div>

      {/* Drives + Strengths grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Drives */}
        <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Drives
          </h3>
          <div className="space-y-2.5">
            <DriveBar label="D" value={dossier.drives.dominance} />
            <DriveBar label="E" value={dossier.drives.extraversion} />
            <DriveBar label="P" value={dossier.drives.patience} />
            <DriveBar label="F" value={dossier.drives.formality} />
          </div>
        </div>

        {/* Strengths + Cautions */}
        <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Strengths
          </h3>
          <ul className="space-y-1.5">
            {dossier.strengths.map((s) => (
              <li
                key={s}
                className="flex items-start gap-2 text-xs text-text-secondary"
              >
                <span className="mt-0.5 text-accent-success">&#x2713;</span> {s}
              </li>
            ))}
          </ul>
          <h3 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Cautions
          </h3>
          <ul className="space-y-1.5">
            {dossier.cautions.map((c) => (
              <li
                key={c}
                className="flex items-start gap-2 text-xs text-text-secondary"
              >
                <span className="mt-0.5 text-accent-warning">&#x26A0;</span> {c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Otto Config + Workspace Prefs */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Otto Config
          </h3>
          <dl className="space-y-2 text-xs">
            <div className="flex justify-between">
              <dt className="text-text-muted">Archetype</dt>
              <dd className="font-medium text-text-primary capitalize">
                {dossier.ottoConfig.archetype}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Autonomy</dt>
              <dd className="font-medium text-text-primary">
                {Math.round(dossier.ottoConfig.autonomyCeiling * 100)}%
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Mode</dt>
              <dd className="font-medium text-text-primary capitalize">
                {dossier.ottoConfig.interactionMode.replace(/_/g, " ")}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Workspace Prefs
          </h3>
          <dl className="space-y-2 text-xs">
            <div className="flex justify-between">
              <dt className="text-text-muted">Cognitive</dt>
              <dd className="font-medium text-text-primary capitalize">
                {dossier.workspacePrefs.cognitiveMode.replace(/_/g, " ")}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Density</dt>
              <dd className="font-medium text-text-primary capitalize">
                {dossier.workspacePrefs.informationDensity}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Structure</dt>
              <dd className="font-medium text-text-primary capitalize">
                {dossier.workspacePrefs.interfaceStructure.replace(/_/g, " ")}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Updates</dt>
              <dd className="font-medium text-text-primary capitalize">
                {dossier.workspacePrefs.updatePace}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* LinkedIn Summary */}
      {dossier.linkedInSummary && (
        <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
            LinkedIn Summary
          </h3>
          <p className="text-sm text-text-primary">
            {dossier.linkedInSummary.headline} at{" "}
            {dossier.linkedInSummary.company} &middot;{" "}
            {dossier.linkedInSummary.yearsExperience} years experience
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {dossier.linkedInSummary.topSkills.map((skill) => (
              <span
                key={skill}
                className="rounded bg-surface-overlay px-2 py-0.5 text-[10px] text-text-secondary"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Communication */}
      <div className="rounded-lg border border-surface-border bg-surface-raised p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Communication Patterns
        </h3>
        <dl className="space-y-2 text-xs">
          <div className="flex justify-between">
            <dt className="text-text-muted">Strength</dt>
            <dd className="font-medium text-text-primary">
              {dossier.communicationPatterns.strength}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-muted">Failure Pattern</dt>
            <dd className="font-medium text-accent-warning">
              {dossier.communicationPatterns.failurePattern}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-muted">Best Tooling</dt>
            <dd className="font-medium text-text-primary">
              {dossier.communicationPatterns.bestTooling}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
