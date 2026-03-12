/**
 * Otto Sound Engine — calibration journey event registrations.
 *
 * Registers 9 calibration sounds (cal.*) that evolve with confidence as the
 * user progresses through the calibration flow. The resolved SoundPalette
 * already reflects confidence blending, so these functions simply use it.
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
// 1. cal.answer — Soft pluck on card tap / text submit
// ---------------------------------------------------------------------------

registerSound("cal.answer", (c: AudioContext, p: SoundPalette, vol: number) => {
  T(c, p.baseFreq, 0.06 * p.decay, p.oscType, 0.005, v(0.15, vol));
});

// ---------------------------------------------------------------------------
// 2. cal.insight — Two-note rise for micro-insight
// ---------------------------------------------------------------------------

registerSound(
  "cal.insight",
  (c: AudioContext, p: SoundPalette, vol: number) => {
    T(c, p.baseFreq * 0.75, 0.08 * p.decay, p.oscType, 0.005, v(0.2, vol));
    setTimeout(() => {
      T(c, p.baseFreq * 1.2, 0.08 * p.decay, p.oscType, 0.005, v(0.2, vol), 10);
    }, 60);
    if (p.shimmer > 0.3) {
      setTimeout(() => {
        NS(c, 0.1 * p.decay, p.baseFreq * 3, 2, v(0.05 * p.shimmer, vol));
      }, 100);
    }
  },
);

// ---------------------------------------------------------------------------
// 3. cal.driveReveal — Deep resonant tone (confidence >= 0.55)
// ---------------------------------------------------------------------------

registerSound(
  "cal.driveReveal",
  (c: AudioContext, p: SoundPalette, vol: number) => {
    T(c, p.baseFreq * 0.5, 0.15 * p.decay, p.oscType, 0.005, v(0.25, vol));
    setTimeout(() => {
      T(c, p.baseFreq * 0.75, 0.12 * p.decay, p.oscType, 0.005, v(0.2, vol));
      NS(c, 0.1 * p.decay, p.baseFreq * 2, 1.5, v(0.05 * p.shimmer, vol));
    }, 80);
  },
);

// ---------------------------------------------------------------------------
// 4. cal.archetypeHint — Half-tinted chord (confidence >= 0.65)
// ---------------------------------------------------------------------------

registerSound(
  "cal.archetypeHint",
  (c: AudioContext, p: SoundPalette, vol: number) => {
    CH(c, p.baseFreq * 0.8, [1, 1.25], 0.12 * p.decay, p.oscType, v(0.2, vol));
    setTimeout(() => {
      NS(c, 0.1 * p.decay, p.baseFreq * 2.5, 2, v(0.06 * p.shimmer, vol));
    }, 100);
  },
);

// ---------------------------------------------------------------------------
// 5. cal.profileReveal — Full chord progression (confidence >= 0.75)
// ---------------------------------------------------------------------------

registerSound(
  "cal.profileReveal",
  (c: AudioContext, p: SoundPalette, vol: number) => {
    CH(c, p.baseFreq, [1, 1.25, 1.5], 0.15 * p.decay, p.oscType, v(0.2, vol));
    setTimeout(() => {
      CH(
        c,
        p.baseFreq * 1.33,
        [1, 1.25, 1.5],
        0.15 * p.decay,
        p.oscType,
        v(0.2, vol),
      );
    }, 90);
    setTimeout(() => {
      CH(
        c,
        p.baseFreq * 1.5,
        [1, 1.25, 1.5],
        0.2 * p.decay,
        p.oscType,
        v(0.22, vol),
      );
      NS(c, 0.15 * p.decay, p.baseFreq * 3, 2, v(0.07 * p.shimmer, vol));
    }, 180);
  },
);

// ---------------------------------------------------------------------------
// 6. cal.provenanceUnlock — Crystalline tone (confidence >= 0.85)
// ---------------------------------------------------------------------------

registerSound(
  "cal.provenanceUnlock",
  (c: AudioContext, p: SoundPalette, vol: number) => {
    const freqs = [p.baseFreq * 2, p.baseFreq * 2.5, p.baseFreq * 3];
    freqs.forEach((f, i) => {
      setTimeout(() => {
        T(c, f, 0.1 * p.decay, "triangle", 0.005, v(0.18, vol));
      }, i * 35);
    });
    setTimeout(() => {
      NS(c, 0.12 * p.decay, p.baseFreq * 4, 3, v(0.06 * p.shimmer, vol));
    }, freqs.length * 35);
  },
);

// ---------------------------------------------------------------------------
// 7. cal.bmyChoice — Gentle arpeggio for decision point
// ---------------------------------------------------------------------------

registerSound(
  "cal.bmyChoice",
  (c: AudioContext, p: SoundPalette, vol: number) => {
    const ratios = [1, 1.25, 1.5, 1.25];
    ratios.forEach((r, i) => {
      setTimeout(() => {
        T(c, p.baseFreq * r, 0.12 * p.decay, p.oscType, 0.005, v(0.18, vol));
      }, i * 180);
    });
  },
);

// ---------------------------------------------------------------------------
// 8. cal.workspaceBuild — Building sequence (~2s)
// ---------------------------------------------------------------------------

registerSound(
  "cal.workspaceBuild",
  (c: AudioContext, p: SoundPalette, vol: number) => {
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        T(
          c,
          p.baseFreq * (1 + i * 0.12),
          0.2 * p.decay,
          p.oscType,
          0.005,
          v(0.15, vol),
        );
        // NS texture on even steps
        if (i % 2 === 0) {
          NS(c, 0.1 * p.decay, p.baseFreq * 2, 1.5, v(0.04 * p.shimmer, vol));
        }
      }, i * 240);
    }
  },
);

// ---------------------------------------------------------------------------
// 9. cal.launchReady — Triumphant finale chord
// ---------------------------------------------------------------------------

registerSound(
  "cal.launchReady",
  (c: AudioContext, p: SoundPalette, vol: number) => {
    CH(
      c,
      p.baseFreq,
      [1, 1.25, 1.5, 2],
      0.3 * p.decay,
      p.oscType,
      v(0.25, vol),
    );
    setTimeout(() => {
      CH(
        c,
        p.baseFreq * 1.5,
        [1, 1.25, 1.5, 2],
        0.35 * p.decay,
        p.oscType,
        v(0.25, vol),
      );
      NS(c, 0.2 * p.decay, p.baseFreq * 4, 2, v(0.08 * p.shimmer, vol));
    }, 120);
  },
);
