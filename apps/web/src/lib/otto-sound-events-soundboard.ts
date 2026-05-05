/**
 * Otto Sound Engine — soundboard event registrations.
 *
 * Registers 8 social soundboard sounds (sb.*) that are more character-driven
 * than palette-dependent. Some use the palette baseFreq for consistency
 * (ding, tada), while others use fixed frequencies for recognizability.
 *
 * Each registration is a side-effect import — importing this module wires up
 * the sounds automatically.
 */

import { registerSound } from "@/lib/otto-sound-engine";
import { T, NS, CH, SW } from "@/lib/otto-sound-synthesis";
import type { SoundPalette } from "@/lib/otto-sound-types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Scale a base volume by the master volume. */
const v = (base: number, master: number): number => base * master;

// ---------------------------------------------------------------------------
// 1. sb.rimshot — "Ba Dum Tss"
// ---------------------------------------------------------------------------

registerSound(
  "sb.rimshot",
  (c: AudioContext, _p: SoundPalette, vol: number) => {
    // Kick
    NS(c, 0.04, 150, 0.5, v(0.3, vol));
    // Snare
    setTimeout(() => {
      NS(c, 0.04, 800, 2, v(0.25, vol));
    }, 200);
    // Cymbal
    setTimeout(() => {
      NS(c, 0.08, 8000, 1, v(0.15, vol));
    }, 350);
  },
);

// ---------------------------------------------------------------------------
// 2. sb.airhorn — Rising horn blast
// ---------------------------------------------------------------------------

registerSound(
  "sb.airhorn",
  (c: AudioContext, _p: SoundPalette, vol: number) => {
    // Two detuned sweeps for fat horn attack
    SW(c, 300, 600, 0.15, "sawtooth", v(0.25, vol));
    SW(c, 310, 610, 0.15, "sawtooth", v(0.2, vol));
    // Sustained horn tones
    setTimeout(() => {
      T(c, 600, 0.3, "sawtooth", 0.005, v(0.25, vol));
      T(c, 610, 0.3, "sawtooth", 0.005, v(0.2, vol));
    }, 150);
  },
);

// ---------------------------------------------------------------------------
// 3. sb.sadTrombone — Descending "wah wah wah waaah"
// ---------------------------------------------------------------------------

registerSound(
  "sb.sadTrombone",
  (c: AudioContext, _p: SoundPalette, vol: number) => {
    const notes = [350, 330, 310, 260];
    notes.forEach((f, i) => {
      setTimeout(() => {
        T(c, f, 0.3, "sawtooth", 0.01, v(0.25, vol));
      }, i * 250);
    });
  },
);

// ---------------------------------------------------------------------------
// 4. sb.applause — Crowd clap burst
// ---------------------------------------------------------------------------

registerSound(
  "sb.applause",
  (c: AudioContext, _p: SoundPalette, vol: number) => {
    for (let i = 0; i < 6; i++) {
      const jitter = Math.random() * 20;
      setTimeout(
        () => {
          NS(c, 0.04, 2000 + Math.random() * 2000, 0.8, v(0.12, vol));
        },
        i * 60 + jitter,
      );
    }
  },
);

// ---------------------------------------------------------------------------
// 5. sb.drumroll — Building roll with cymbal crash
// ---------------------------------------------------------------------------

registerSound(
  "sb.drumroll",
  (c: AudioContext, _p: SoundPalette, vol: number) => {
    for (let i = 0; i < 12; i++) {
      setTimeout(() => {
        NS(c, 0.02, 600, 2, v(0.08 + i * 0.015, vol));
      }, i * 50);
    }
    // Cymbal crash at the end
    setTimeout(() => {
      NS(c, 0.12, 10000, 1, v(0.2, vol));
    }, 12 * 50);
  },
);

// ---------------------------------------------------------------------------
// 6. sb.ding — Bell tone (palette-aware)
// ---------------------------------------------------------------------------

registerSound("sb.ding", (c: AudioContext, p: SoundPalette, vol: number) => {
  T(c, p.baseFreq * 2, 0.15, "triangle", 0.005, v(0.3, vol));
  T(c, p.baseFreq * 4, 0.1, "sine", 0.005, v(0.15, vol));
});

// ---------------------------------------------------------------------------
// 7. sb.whoosh — Quick sweep with noise tail
// ---------------------------------------------------------------------------

registerSound("sb.whoosh", (c: AudioContext, _p: SoundPalette, vol: number) => {
  SW(c, 200, 4000, 0.15, "sine", v(0.25, vol));
  NS(c, 0.15, 3000, 0.5, v(0.1, vol));
});

// ---------------------------------------------------------------------------
// 8. sb.tada — Fanfare chord with shimmer (palette-aware)
// ---------------------------------------------------------------------------

registerSound("sb.tada", (c: AudioContext, p: SoundPalette, vol: number) => {
  // Opening chord
  CH(c, p.baseFreq, [1, 1.5, 2], 0.2, "triangle", v(0.25, vol));
  // Resolution chord
  setTimeout(() => {
    CH(c, p.baseFreq * 1.5, [1, 1.25, 1.5, 2], 0.3, "triangle", v(0.25, vol));
    // Shimmer burst
    NS(c, 0.15, p.baseFreq * 4, 2, v(0.06 * p.shimmer, vol));
  }, 120);
});
