"use client";

// ---------------------------------------------------------------------------
// DEPRECATED: Use useOttoSound (singular) from "@/hooks/useOttoSound" instead.
// This shim exists for backwards compatibility during migration.
// ---------------------------------------------------------------------------

import { useOttoSound } from "@/hooks/useOttoSound";
import type { SoundEvent } from "@/lib/otto-sound-types";

const EVENT_MAP: Record<string, SoundEvent> = {
  msgReceived: "otto.notify",
  msgSent: "cal.answer",
  dmReceived: "cal.insight",
  mention: "otto.notify",
  callRing: "otto.notify",
  callConnect: "otto.confirm",
  callEnd: "otto.error",
  userJoin: "cal.launchReady",
  userLeave: "otto.error",
  notification: "otto.notify",
  error: "otto.error",
  success: "otto.confirm",
};

/** @deprecated Use useOttoSound().setVolume() instead */
export function setOttoVolume(_vol: number) {
  // no-op: volume is now controlled via useOttoSound().setVolume()
}

/** @deprecated Use useOttoSound() instead */
export type OttoSounds = Record<string, () => void>;

/** @deprecated Use useOttoSound() from "@/hooks/useOttoSound" instead */
export function useOttoSounds(): OttoSounds {
  const { play } = useOttoSound();
  const proxy: Record<string, () => void> = {};
  for (const [old, event] of Object.entries(EVENT_MAP)) {
    proxy[old] = () => play(event);
  }
  return proxy;
}
