"use client";

import { useRef, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useForgeStore } from "@/stores/forge.store";
import { useOnboardingStore } from "@/stores/onboarding.store";
import OttoOtterAvatar from "@/components/atoms/OttoOtterAvatar";
import OttoAvatar from "@/components/atoms/OttoAvatar";
import ChatInput from "@/components/molecules/ChatInput";
import GoalChips from "@/components/molecules/GoalChips";
import AutonomyCards from "@/components/molecules/AutonomyCards";
import ProfileInferencePanel from "@/components/molecules/ProfileInferencePanel";
import ForgeLinkedInInput from "@/components/molecules/ForgeLinkedInInput";
import ForgeLaunchCard from "@/components/molecules/ForgeLaunchCard";
import ForgeApiKeyInput from "@/components/molecules/ForgeApiKeyInput";
import type { PowerProvider } from "@/components/molecules/ForgeApiKeyInput";
import { GOAL_CHIPS, AUTONOMY_OPTIONS } from "@/lib/mock-forge";
import type { ForgeMessage, MetaArchetype } from "@/lib/mock-forge";
import type { OttoArchetype } from "@/components/atoms/OttoAvatar";

/* ── Archetype Mapping ──────────────────────────────────────────────────── */

const ARCHETYPE_MAP: Record<MetaArchetype, OttoArchetype> = {
  driver: "executor",
  enforcer: "guardian",
  interpreter: "connector",
};

/* ── Bold text renderer ─────────────────────────────────────────────────── */

function renderContent(text: string): React.ReactNode[] {
  // Split on **bold** markers
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-text-primary">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

/* ── ForgeMessageBubble ─────────────────────────────────────────────────── */

interface ForgeMessageBubbleProps {
  msg: ForgeMessage;
  isLatest: boolean;
}

function ForgeMessageBubble({ msg, isLatest }: ForgeMessageBubbleProps) {
  const {
    isTyping,
    metaArchetype,
    inferredProfile,
    isScrapingLinkedIn,
    submitLinkedInUrl,
    selectGoalChip,
    goalChipId,
    selectAutonomyOption,
    autonomyOptionId,
    drives,
    confidence,
    overrideProfile,
    activeModules,
    isLaunching,
    launchWorkspace,
    isPowered,
    powerSource,
    powerUp,
  } = useForgeStore();

  const isOtto = msg.role === "otto";
  const isUser = msg.role === "user";
  const showInteraction = isLatest && isOtto && !isTyping && !!msg.interaction;

  // Determine which avatar to show for Otto
  const hasProfile = !!inferredProfile;
  const ottoArchetype =
    hasProfile && metaArchetype ? ARCHETYPE_MAP[metaArchetype] : undefined;

  const workspaceName = useOnboardingStore((s) => s.setupState.workspaceName);

  const paragraphs = msg.content.split("\n").filter(Boolean);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar — Otto only */}
      {isOtto && (
        <div className="mt-0.5 flex-shrink-0">
          {hasProfile && ottoArchetype ? (
            <OttoAvatar size="sm" archetype={ottoArchetype} state="active" />
          ) : (
            <OttoOtterAvatar size="sm" state="idle" />
          )}
        </div>
      )}

      {/* Bubble */}
      <div
        className={`flex max-w-[80%] flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}
      >
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
            isUser
              ? "rounded-tr-sm bg-accent-primary/15 text-text-primary"
              : "rounded-tl-sm bg-surface-raised text-text-secondary"
          }`}
        >
          {paragraphs.map((para, i) => (
            <p key={i} className={i > 0 ? "mt-1.5" : ""}>
              {renderContent(para)}
            </p>
          ))}
        </div>

        {/* Inline interactions */}
        {showInteraction && (
          <div className="w-full max-w-sm">
            {msg.interaction === "linkedin_input" && (
              <ForgeLinkedInInput
                onSubmit={submitLinkedInUrl}
                isLoading={isScrapingLinkedIn}
              />
            )}

            {msg.interaction === "api_key" && (
              <ForgeApiKeyInput
                onSubmit={(key: string, provider: PowerProvider) =>
                  powerUp(key, provider)
                }
                isPowered={isPowered}
                powerSource={powerSource}
              />
            )}

            {msg.interaction === "goal_chips" && (
              <GoalChips
                chips={GOAL_CHIPS}
                onSelect={selectGoalChip}
                selectedId={goalChipId}
              />
            )}

            {msg.interaction === "autonomy_cards" && (
              <AutonomyCards
                options={AUTONOMY_OPTIONS}
                onSelect={selectAutonomyOption}
                selectedId={autonomyOptionId}
              />
            )}

            {msg.interaction === "profile_result" &&
              inferredProfile &&
              drives &&
              metaArchetype && (
                <ProfileInferencePanel
                  profile={inferredProfile}
                  drives={drives}
                  confidence={confidence}
                  archetype={metaArchetype}
                  onOverride={overrideProfile}
                />
              )}

            {msg.interaction === "launch_ready" && (
              <ForgeLaunchCard
                workspaceName={workspaceName || "Your Workspace"}
                moduleCount={activeModules.length}
                isLaunching={isLaunching}
                onLaunch={launchWorkspace}
              />
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ── ForgeOnboardingChat ────────────────────────────────────────────────── */

export default function ForgeOnboardingChat() {
  const { messages, isTyping, step, sendMessage, isComplete } = useForgeStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");

  // Auto-scroll on new messages or typing indicator
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isTyping]);

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
    setInputValue("");
  };

  // Show ChatInput only during free-text steps (2=Q1, 3=Q2) and when not complete
  const showChatInput = (step === 2 || step === 3) && !isComplete;

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4"
      >
        <AnimatePresence mode="popLayout">
          {messages.map((msg, i) => (
            <ForgeMessageBubble
              key={msg.id}
              msg={msg}
              isLatest={i === messages.length - 1}
            />
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <motion.div
              key="typing-indicator"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-3"
            >
              <div className="mt-0.5 flex-shrink-0">
                <OttoOtterAvatar size="sm" state="thinking" />
              </div>
              <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-surface-raised px-3.5 py-2.5">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-text-muted"
                    animate={{ y: [0, -4, 0] }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.15,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Chat input */}
      {showChatInput && (
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
          disabled={isTyping}
          placeholder="Or type your answer..."
        />
      )}
    </div>
  );
}
