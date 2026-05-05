"use client";

import { useRef, useCallback } from "react";
import { SoundBite } from "@/components/atoms/SoundBite";
import { useOttoSound } from "@/hooks/useOttoSound";
import type { SoundboardEvent } from "@/lib/otto-sound-types";

export interface SoundBitePayload {
  soundId: string;
  label: string;
  color: string;
}

interface SoundboardPanelProps {
  onSend: (payload: SoundBitePayload) => void;
}

const STARTER_SOUNDS: { id: SoundboardEvent; label: string; color: string }[] =
  [
    { id: "sb.rimshot", label: "Ba Dum Tss", color: "#FF6B6B" },
    { id: "sb.airhorn", label: "Air Horn", color: "#FFA726" },
    { id: "sb.sadTrombone", label: "Sad Trombone", color: "#7E57C2" },
    { id: "sb.applause", label: "Applause", color: "#66BB6A" },
    { id: "sb.drumroll", label: "Drum Roll", color: "#42A5F5" },
    { id: "sb.ding", label: "Ding!", color: "#4ECDC4" },
    { id: "sb.whoosh", label: "Whoosh", color: "#26C6DA" },
    { id: "sb.tada", label: "Ta-da!", color: "#FFE66D" },
  ];

const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 10_000;

export function SoundboardPanel({ onSend }: SoundboardPanelProps) {
  const { play } = useOttoSound();
  const timestamps = useRef<number[]>([]);

  const handleClick = useCallback(
    (sound: (typeof STARTER_SOUNDS)[number]) => {
      const now = Date.now();
      timestamps.current = timestamps.current.filter(
        (t) => now - t < RATE_WINDOW_MS,
      );
      if (timestamps.current.length >= RATE_LIMIT) return;

      timestamps.current.push(now);
      play(sound.id);
      onSend({ soundId: sound.id, label: sound.label, color: sound.color });
    },
    [play, onSend],
  );

  return (
    <div className="grid grid-cols-4 gap-2 rounded-xl border border-surface-border bg-surface-base p-3">
      {STARTER_SOUNDS.map((sound) => (
        <button
          key={sound.id}
          onClick={() => handleClick(sound)}
          className="cursor-pointer"
        >
          <SoundBite
            soundId={sound.id}
            label={sound.label}
            color={sound.color}
          />
        </button>
      ))}
    </div>
  );
}
