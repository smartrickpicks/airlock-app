"use client";

import { MOCK_SKILLS, type WorkspaceSkill } from "@/lib/mock-connectors";
import EmptyState from "@/components/atoms/EmptyState";

export default function SkillsList() {
  const skills = MOCK_SKILLS;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Skills</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Custom tools created for this workspace. Otto uses them based on each
          user&apos;s role.
        </p>
      </div>

      <div className="flex items-center justify-end">
        <button className="rounded-md border border-surface-border bg-surface-overlay px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary">
          + Create Skill
        </button>
      </div>

      {skills.length === 0 ? (
        <EmptyState
          message="No custom skills yet. Create a skill by describing what you need to Otto in plain language."
          icon={
            <svg
              className="h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
              />
            </svg>
          }
        />
      ) : (
        <div className="space-y-3">
          {skills.map((skill) => (
            <SkillCard key={skill.id} skill={skill} />
          ))}
        </div>
      )}
    </div>
  );
}

function SkillCard({ skill }: { skill: WorkspaceSkill }) {
  return (
    <div className="group rounded-lg border border-surface-border bg-surface-raised p-4 transition-colors hover:bg-surface-overlay">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Sparkle icon */}
          <svg
            className="h-4 w-4 flex-shrink-0 text-indigo-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
            />
          </svg>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-text-primary">
                {skill.name}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                  skill.isActive
                    ? "bg-accent-success/15 text-accent-success"
                    : "bg-text-muted/15 text-text-muted"
                }`}
              >
                {skill.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-text-secondary truncate max-w-md">
              {skill.description}
            </p>
            <p className="mt-1 text-[11px] text-text-muted">
              {skill.roles.join(", ")} &middot;{" "}
              {skill.modules
                .map((m) => m.charAt(0).toUpperCase() + m.slice(1))
                .join(", ")}{" "}
              &middot; Created by {skill.createdBy}
            </p>
          </div>
        </div>
        <button className="rounded-md border border-surface-border bg-surface-overlay px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-accent-primary/40 hover:text-text-primary">
          Edit
        </button>
      </div>

      {/* Tool chain */}
      {skill.toolChain.length > 0 && (
        <div className="mt-3 flex items-center gap-2 pl-7">
          {skill.toolChain.map((step, i) => (
            <div key={i} className="flex items-center gap-1">
              {i > 0 && (
                <span className="text-[10px] text-text-muted">&rarr;</span>
              )}
              <span className="rounded bg-surface-overlay px-1.5 py-0.5 font-mono text-[10px] text-accent-primary">
                {step.tool}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
