"use client";

// ---------------------------------------------------------------------------
// useOttoSound — React hook for the unified Otto Sound Engine
// Replaces useOttoSounds (plural). Import this in components.
// ---------------------------------------------------------------------------

import { OttoSoundEngine } from "@/lib/otto-sound-engine";
import type {
  SoundContext,
  SoundEvent,
  SoundPalette,
} from "@/lib/otto-sound-types";

// Side-effect imports: register all sound events with the engine
import "@/lib/otto-sound-events-system";
import "@/lib/otto-sound-events-calibration";
import "@/lib/otto-sound-events-soundboard";

const engine = OttoSoundEngine.getInstance();

export interface OttoSoundAPI {
  play: (event: SoundEvent) => void;
  playWithPalette: (event: SoundEvent, palette: SoundPalette) => void;
  setContext: (partial: Partial<SoundContext>) => void;
  setVolume: (vol: number) => void;
  setEnabled: (on: boolean) => void;
}

export function useOttoSound(): OttoSoundAPI {
  return {
    play: (event) => engine.play(event),
    playWithPalette: (event, palette) => engine.playWithPalette(event, palette),
    setContext: (partial) => engine.setContext(partial),
    setVolume: (vol) => engine.setVolume(vol),
    setEnabled: (on) => engine.setEnabled(on),
  };
}
