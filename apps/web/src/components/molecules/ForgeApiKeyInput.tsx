"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, Zap, Sparkles, Globe, Crown } from "lucide-react";

export type PowerProvider = "anthropic" | "openrouter" | "claude_max" | "demo";

interface ForgeApiKeyInputProps {
  onSubmit: (key: string, provider: PowerProvider) => void;
  isPowered: boolean;
  powerSource?: PowerProvider | null;
}

const TABS: { id: PowerProvider; label: string; icon: typeof Zap }[] = [
  { id: "anthropic", label: "Claude API", icon: Sparkles },
  { id: "openrouter", label: "OpenRouter", icon: Globe },
  { id: "claude_max", label: "Claude Max", icon: Crown },
];

export default function ForgeApiKeyInput({
  onSubmit,
  isPowered,
  powerSource,
}: ForgeApiKeyInputProps) {
  const [activeTab, setActiveTab] = useState<PowerProvider>("claude_max");
  const [key, setKey] = useState("");
  const [isCharging, setIsCharging] = useState(false);
  const [maxStatus, setMaxStatus] = useState<
    "idle" | "checking" | "found" | "not_found"
  >("idle");

  const handlePowerUp = (provider: PowerProvider, apiKey?: string) => {
    if (isCharging) return;
    setIsCharging(true);
    setTimeout(() => {
      setIsCharging(false);
      onSubmit(apiKey || "claude_max", provider);
    }, 800);
  };

  const handleKeySubmit = () => {
    if (!key.trim() || isCharging) return;
    handlePowerUp(activeTab as "anthropic" | "openrouter", key.trim());
  };

  const handleMaxDetect = () => {
    setMaxStatus("checking");
    // Mock: simulate backend probe for ANTHROPIC_API_KEY env var
    setTimeout(() => {
      // In production, this would call POST /api/v1/ai/detect-provider
      // For now, simulate success (Max plan detected)
      setMaxStatus("found");
      setTimeout(() => {
        handlePowerUp("claude_max", "claude_max_auto");
      }, 600);
    }, 1200);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleKeySubmit();
  };

  if (isPowered) {
    const sourceLabel =
      powerSource === "claude_max"
        ? "Claude Max connected"
        : powerSource === "openrouter"
          ? "OpenRouter connected"
          : powerSource === "anthropic"
            ? "Claude API connected"
            : "Airlock powered up";

    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-2 rounded-lg border border-accent-success/40 bg-accent-success/10 px-4 py-2.5"
      >
        <Zap className="h-4 w-4 text-accent-success" />
        <span className="text-sm font-medium text-accent-success">
          {sourceLabel}
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-3 py-2"
    >
      {/* Provider tabs */}
      <div className="flex gap-1 rounded-lg bg-surface-overlay p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? "text-text-primary"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="api-tab-bg"
                  className="absolute inset-0 rounded-md bg-surface-raised"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
              <span className="relative flex items-center gap-1.5">
                <Icon className="h-3 w-3" />
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === "claude_max" ? (
          <motion.div
            key="claude_max"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-2"
          >
            <p className="text-xs text-text-muted">
              Claude Code Max subscribers get instant access — no key needed.
            </p>

            {maxStatus === "found" ? (
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-2 rounded-lg border border-accent-primary/30 bg-accent-primary/10 px-3 py-2"
              >
                <Crown className="h-4 w-4 text-accent-primary" />
                <span className="text-sm font-medium text-accent-primary">
                  Max plan detected — powering up...
                </span>
              </motion.div>
            ) : (
              <button
                onClick={handleMaxDetect}
                disabled={maxStatus === "checking"}
                className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-accent-primary to-accent-secondary py-2.5 text-sm font-medium text-text-inverse transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {maxStatus === "checking" ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      <Sparkles className="h-4 w-4" />
                    </motion.div>
                    Detecting subscription...
                  </>
                ) : (
                  <>
                    <Crown className="h-4 w-4" />
                    Connect Max Plan
                  </>
                )}
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col gap-2"
          >
            <div className="flex items-center gap-2 rounded-lg border border-surface-border bg-surface-overlay px-3 py-2">
              <KeyRound className="h-4 w-4 shrink-0 text-text-muted" />
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isCharging}
                placeholder={
                  activeTab === "anthropic" ? "sk-ant-..." : "sk-or-..."
                }
                className="flex-1 bg-transparent font-mono text-sm text-text-primary placeholder:font-sans placeholder:text-text-muted focus:outline-none disabled:opacity-50"
              />
            </div>

            <button
              onClick={handleKeySubmit}
              disabled={!key.trim() || isCharging}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-accent-primary py-2 text-sm font-medium text-text-inverse transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <motion.div
                animate={isCharging ? { opacity: [1, 0.4, 1] } : { opacity: 1 }}
                transition={
                  isCharging
                    ? { duration: 0.6, repeat: Infinity, ease: "easeInOut" }
                    : {}
                }
              >
                <Zap className="h-3.5 w-3.5" />
              </motion.div>
              {isCharging ? "Charging..." : "Power Up"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Demo mode */}
      <button
        onClick={() => onSubmit("demo", "demo")}
        disabled={isCharging}
        className="text-xs text-text-muted transition-colors hover:text-text-secondary disabled:opacity-40"
      >
        Skip — use demo mode
      </button>
    </motion.div>
  );
}
