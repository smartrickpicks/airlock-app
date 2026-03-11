"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { KeyRound, Zap } from "lucide-react";

interface ForgeApiKeyInputProps {
  onSubmit: (key: string) => void;
  isPowered: boolean;
}

export default function ForgeApiKeyInput({
  onSubmit,
  isPowered,
}: ForgeApiKeyInputProps) {
  const [key, setKey] = useState("");
  const [isCharging, setIsCharging] = useState(false);

  const handlePowerUp = () => {
    if (!key.trim() || isCharging) return;
    setIsCharging(true);
    setTimeout(() => {
      setIsCharging(false);
      onSubmit(key.trim());
    }, 800);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handlePowerUp();
  };

  if (isPowered) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="flex items-center gap-2 rounded-lg border border-accent-success/40 bg-accent-success/10 px-4 py-2.5"
      >
        <Zap className="h-4 w-4 text-accent-success" />
        <span className="text-sm font-medium text-accent-success">
          Airlock powered up
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-2 py-2"
    >
      <div className="flex items-center gap-2 rounded-lg border border-surface-border bg-surface-overlay px-3 py-2">
        <KeyRound className="h-4 w-4 shrink-0 text-text-muted" />
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isCharging}
          placeholder="sk-ant-..."
          className="flex-1 bg-transparent font-mono text-sm text-text-primary placeholder:font-sans placeholder:text-text-muted focus:outline-none disabled:opacity-50"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handlePowerUp}
          disabled={!key.trim() || isCharging}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent-primary py-2 text-sm font-medium text-text-inverse transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
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

        <button
          onClick={() => onSubmit("demo")}
          disabled={isCharging}
          className="text-sm text-text-muted transition-colors hover:text-text-secondary disabled:opacity-40"
        >
          Demo mode
        </button>
      </div>
    </motion.div>
  );
}
