"use client";

import ForgeChat from "@/components/organisms/ForgeChat";
import ForgePreview from "@/components/organisms/ForgePreview";
import { useCalibrationStore } from "@/stores/calibration.store";
import { ARCHETYPE_SKILLS } from "@/lib/mock-forge";

export default function WorkspaceForge() {
  const {
    messages,
    isTyping,
    confidence,
    phase,
    drives,
    driveSignalCounts,
    inferredProfile,
    metaArchetype,
    activeModules,
    workspaceConfig,
    provenance,
    confidenceBreakdown,
    showProfilePanel,
    isLaunching,
    isComplete,
    submitAnswer,
    continueCalibration,
    launchWorkspace,
    toggleModule,
    overrideProfile,
  } = useCalibrationStore();

  // Derive preloaded skills from the current meta-archetype
  const preloadedSkills = metaArchetype
    ? ARCHETYPE_SKILLS[metaArchetype] || []
    : [];

  return (
    <div className="flex h-full w-full overflow-hidden bg-surface-base">
      {/* Left Panel — Otto Chat (45%) */}
      <div className="flex h-full w-[45%] min-w-[340px] flex-col border-r border-surface-border">
        <ForgeChat
          messages={messages}
          isTyping={isTyping}
          confidence={confidence}
          phase={phase}
          onSubmitAnswer={submitAnswer}
          onContinueCalibration={continueCalibration}
          onLaunchWorkspace={launchWorkspace}
        />
      </div>

      {/* Right Panel — Preview (55%) */}
      <div className="flex h-full flex-1 flex-col">
        <ForgePreview
          activeModules={activeModules}
          inferredProfile={inferredProfile}
          drives={drives}
          confidence={confidence}
          driveSignalCounts={driveSignalCounts}
          metaArchetype={metaArchetype}
          workspaceConfig={workspaceConfig}
          preloadedSkills={preloadedSkills}
          provenance={provenance}
          confidenceBreakdown={confidenceBreakdown}
          showProfilePanel={showProfilePanel}
          isLaunching={isLaunching}
          isComplete={isComplete}
          onToggleModule={toggleModule}
          onOverrideProfile={overrideProfile}
          onLaunch={launchWorkspace}
        />
      </div>
    </div>
  );
}
