"use client";

import { useState } from "react";
import { useOttoSound } from "@/hooks/useOttoSound";
import type { SoundEvent } from "@/lib/otto-sound-types";

interface SoundBiteProps {
  soundId: string;
  label: string;
  color: string;
  sentBy?: string;
}

export function SoundBite({ soundId, label, color, sentBy }: SoundBiteProps) {
  const { play } = useOttoSound();
  const [pulsing, setPulsing] = useState(false);

  const handleClick = () => {
    play(soundId as SoundEvent);
    setPulsing(true);
    setTimeout(() => setPulsing(false), 300);
  };

  return (
    <div className="inline-flex flex-col items-center gap-0.5">
      <button
        onClick={handleClick}
        className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/20 text-[10px] font-semibold text-white transition-transform"
        style={{
          backgroundColor: color,
          textShadow: "0 1px 2px rgba(0,0,0,0.3)",
          transform: pulsing ? "scale(1.15)" : "scale(1)",
          lineHeight: 1.1,
          wordBreak: "break-word",
          padding: 4,
          textAlign: "center",
        }}
      >
        {label}
      </button>
      {sentBy && (
        <span className="text-[9px] text-text-muted opacity-70">{sentBy}</span>
      )}
    </div>
  );
}
