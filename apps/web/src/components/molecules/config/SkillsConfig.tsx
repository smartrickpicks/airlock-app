"use client";

import type { ConfigFormProps } from "@/components/molecules/NodeConfigPanel";

const PLACEHOLDER_SKILLS = [
  {
    name: "Contract Analysis",
    description: "Extract key terms from uploaded contracts",
  },
  {
    name: "Entity Resolution",
    description: "Match and deduplicate entity records",
  },
  {
    name: "Document Classification",
    description: "Auto-classify incoming documents",
  },
  {
    name: "Risk Assessment",
    description: "Score contract clauses for risk factors",
  },
];

export default function SkillsConfig({
  config,
  onSave,
  onCancel,
}: ConfigFormProps) {
  return (
    <div className="space-y-3 p-4">
      <p className="text-xs text-text-secondary">
        Skills extend OTTO with domain-specific capabilities. Custom skill
        creation is coming soon.
      </p>

      <div className="space-y-1">
        {PLACEHOLDER_SKILLS.map((skill) => (
          <div
            key={skill.name}
            className="rounded border border-surface-border bg-surface-raised/50 px-3 py-2"
          >
            <p className="text-xs font-medium text-text-primary">
              {skill.name}
            </p>
            <p className="text-[10px] text-text-muted">{skill.description}</p>
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled
        className="w-full rounded border border-dashed border-surface-border py-2 text-xs text-text-muted opacity-50"
      >
        Create Skill (coming soon)
      </button>

      <div className="flex justify-end gap-2 pt-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-surface-border px-4 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-raised hover:text-text-primary"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave({ ...config, acknowledged: true })}
          className="rounded bg-accent-primary px-4 py-1.5 text-xs font-semibold text-text-inverse hover:bg-accent-primary/80"
        >
          Save
        </button>
      </div>
    </div>
  );
}
