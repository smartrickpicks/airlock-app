"use client";

import ForgeChat from "@/components/organisms/ForgeChat";
import ForgePreview from "@/components/organisms/ForgePreview";
import { useForgeStore } from "@/stores/forge.store";

export default function WorkspaceForge() {
  const {
    step,
    messages,
    isTyping,
    goalChipId,
    autonomyOptionId,
    isScrapingLinkedIn,
    inferredProfile,
    drives,
    confidence,
    metaArchetype,
    activeModules,
    workspaceConfig,
    preloadedSkills,
    showProfilePanel,
    isLaunching,
    isComplete,
    sendMessage,
    submitLinkedInUrl,
    selectGoalChip,
    selectAutonomyOption,
    toggleModule,
    overrideProfile,
    launchWorkspace,
  } = useForgeStore();

  return (
    <div className="flex h-full w-full overflow-hidden bg-surface-base">
      {/* Left Panel — Otto Chat (45%) */}
      <div className="flex h-full w-[45%] min-w-[340px] flex-col border-r border-surface-border">
        <ForgeChat
          messages={messages}
          isTyping={isTyping}
          step={step}
          goalChipId={goalChipId}
          autonomyOptionId={autonomyOptionId}
          isScrapingLinkedIn={isScrapingLinkedIn}
          onSendMessage={sendMessage}
          onSelectGoalChip={selectGoalChip}
          onSelectAutonomyOption={selectAutonomyOption}
          onSubmitLinkedInUrl={submitLinkedInUrl}
        />
      </div>

      {/* Right Panel — Preview (55%) */}
      <div className="flex h-full flex-1 flex-col">
        <ForgePreview
          step={step}
          activeModules={activeModules}
          inferredProfile={inferredProfile}
          drives={drives}
          confidence={confidence}
          metaArchetype={metaArchetype}
          workspaceConfig={workspaceConfig}
          preloadedSkills={preloadedSkills}
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
