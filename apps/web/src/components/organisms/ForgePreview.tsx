"use client";

import { Rocket, LoaderCircle, Bot } from "lucide-react";
import ModuleToggle from "@/components/molecules/ModuleToggle";
import ProfileInferencePanel from "@/components/molecules/ProfileInferencePanel";
import ArchetypeBadge from "@/components/atoms/ArchetypeBadge";
import type {
  ForgeProfile,
  ForgeDrives,
  ForgeWorkspaceConfig,
  ForgeSkill,
  MetaArchetype,
} from "@/lib/mock-forge";
import { MODULES } from "@/lib/constants";

interface ForgePreviewProps {
  step: number;
  activeModules: string[];
  inferredProfile: ForgeProfile | null;
  drives: ForgeDrives | null;
  confidence: number;
  metaArchetype: MetaArchetype | null;
  workspaceConfig: ForgeWorkspaceConfig | null;
  preloadedSkills: ForgeSkill[];
  showProfilePanel: boolean;
  isLaunching: boolean;
  isComplete: boolean;
  onToggleModule: (moduleId: string) => void;
  onOverrideProfile: (profileId: string) => void;
  onLaunch: () => void;
}

const CONFIG_LABELS: Record<string, string> = {
  cognitiveMode: "Cognitive Mode",
  informationDensity: "Information Density",
  interfaceStructure: "Interface Structure",
  updatePace: "Update Pace",
  explanationStyle: "Explanation Style",
};

const CONFIG_DISPLAY: Record<string, string> = {
  visual: "Visual",
  verbal_procedural: "Procedural",
  verbal_narrative: "Narrative",
  interactive: "Interactive",
  context_dependent: "Context-Dependent",
  low: "Summary-first",
  medium: "Balanced",
  medium_high: "Detailed",
  high: "Full Detail",
  exploratory: "Exploratory",
  guided: "Guided",
  guided_flexible: "Guided Flexible",
  alerts: "Real-time Alerts",
  batch: "Batched Updates",
  summary_first: "Summary First",
  evidence_first: "Evidence First",
  labeled: "Labeled Sections",
};

export default function ForgePreview({
  step,
  activeModules,
  inferredProfile,
  drives,
  confidence,
  metaArchetype,
  workspaceConfig,
  preloadedSkills,
  showProfilePanel,
  isLaunching,
  isComplete,
  onToggleModule,
  onOverrideProfile,
  onLaunch,
}: ForgePreviewProps) {
  // Build module list for toggle
  const allModules = Object.entries(MODULES).map(([id, mod]) => ({
    id,
    label: mod.label,
    active: activeModules.includes(id),
  }));

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">
            Workspace Preview
          </h2>
          <p className="text-[11px] text-text-muted">
            {step < 3
              ? "Answer Otto's questions to configure..."
              : "Your workspace is ready to launch"}
          </p>
        </div>
        {metaArchetype && (
          <ArchetypeBadge archetype={metaArchetype} size="md" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="space-y-6">
          {/* Modules Section */}
          <section>
            <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-muted">
              Active Modules
            </h3>
            <ModuleToggle modules={allModules} onToggle={onToggleModule} />
          </section>

          {/* Profile Inference Panel */}
          {showProfilePanel && inferredProfile && drives && metaArchetype && (
            <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <ProfileInferencePanel
                profile={inferredProfile}
                drives={drives}
                confidence={confidence}
                archetype={metaArchetype}
                onOverride={onOverrideProfile}
              />
            </section>
          )}

          {/* Workspace Config */}
          {workspaceConfig && (
            <section className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
              <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-muted">
                Workspace Configuration
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(workspaceConfig).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-md border border-surface-border bg-surface-overlay px-3 py-2"
                  >
                    <span className="text-xs text-text-secondary">
                      {CONFIG_LABELS[key] || key}
                    </span>
                    <span className="text-xs font-medium text-text-primary">
                      {CONFIG_DISPLAY[value] || value}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Skills */}
          {preloadedSkills.length > 0 && (
            <section className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300">
              <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-muted">
                Preloaded Skills
              </h3>
              <div className="space-y-1.5">
                {preloadedSkills.map((skill) => (
                  <div
                    key={skill.id}
                    className="flex items-center gap-3 rounded-md border border-surface-border bg-surface-overlay px-3 py-2"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-primary/10">
                      <span className="text-xs text-accent-primary">✦</span>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-text-primary">
                        {skill.name}
                      </p>
                      <p className="text-[10px] text-text-muted">
                        {skill.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Waiting state */}
          {step < 3 && !showProfilePanel && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-overlay">
                <Bot size={24} className="text-text-muted" />
              </div>
              <p className="text-sm text-text-muted">
                Chat with Otto to configure your workspace
              </p>
              <p className="mt-1 text-[11px] text-text-muted">
                The preview will update as you answer questions
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Launch Button */}
      {step >= 3 && (
        <div className="border-t border-surface-border p-4">
          <button
            onClick={onLaunch}
            disabled={isLaunching || isComplete}
            className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-all ${
              isComplete
                ? "bg-accent-success/15 text-accent-success border border-accent-success/30"
                : isLaunching
                  ? "bg-accent-primary/50 text-text-inverse cursor-wait"
                  : "bg-accent-primary text-text-inverse hover:bg-accent-primary-hover"
            }`}
          >
            {isComplete ? (
              <>
                <span>✓</span>
                <span>Workspace Launched!</span>
              </>
            ) : isLaunching ? (
              <>
                <LoaderCircle size={16} className="animate-spin" />
                <span>Launching...</span>
              </>
            ) : (
              <>
                <Rocket size={16} />
                <span>Launch Workspace</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
