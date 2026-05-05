/**
 * Otto Sound Engine — system event registrations.
 *
 * Registers 8 system-level sounds (otto.*, persona.*, chamber.*, module.*)
 * that respond to the resolved SoundPalette from the engine's tinting system.
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
// 1. otto.notify — High ping, Navi-style "Hey! Listen!"
// ---------------------------------------------------------------------------

registerSound(
  "otto.notify",
  (c: AudioContext, p: SoundPalette, vol: number) => {
    T(c, p.baseFreq * 2.4, 0.04, p.oscType, 0.005, v(0.35, vol));
    setTimeout(() => {
      T(c, p.baseFreq * 3.0, 0.04, p.oscType, 0.005, v(0.3, vol));
    }, 40);
  },
);

// ---------------------------------------------------------------------------
// 2. otto.insight — Rising two-note with shimmer tail
// ---------------------------------------------------------------------------

registerSound(
  "otto.insight",
  (c: AudioContext, p: SoundPalette, vol: number) => {
    T(c, p.baseFreq, 0.08 * p.decay, p.oscType, 0.005, v(0.25, vol));
    setTimeout(() => {
      T(c, p.baseFreq * 1.33, 0.1 * p.decay, p.oscType, 0.005, v(0.25, vol));
    }, 60);
    if (p.shimmer > 0.3) {
      setTimeout(() => {
        NS(c, 0.12 * p.decay, p.baseFreq * 3, 2, v(0.06 * p.shimmer, vol));
      }, 100);
    }
  },
);

// ---------------------------------------------------------------------------
// 3. otto.confirm — Quick sparkle triad
// ---------------------------------------------------------------------------

registerSound(
  "otto.confirm",
  (c: AudioContext, p: SoundPalette, vol: number) => {
    CH(
      c,
      p.baseFreq * 1.5,
      [1, 1.25, 1.5],
      0.08 * p.decay,
      "triangle",
      v(0.25, vol),
    );
    if (p.shimmer > 0.3) {
      setTimeout(() => {
        NS(c, 0.08 * p.decay, p.baseFreq * 4, 3, v(0.05 * p.shimmer, vol));
      }, 30);
    }
  },
);

// ---------------------------------------------------------------------------
// 4. otto.error — Descending triple sink
// ---------------------------------------------------------------------------

registerSound("otto.error", (c: AudioContext, p: SoundPalette, vol: number) => {
  const base = Math.min(p.baseFreq, 500);
  const freqs = [base * 0.53, base * 0.42, base * 0.33];
  freqs.forEach((f, i) => {
    setTimeout(() => {
      T(c, f, 0.12 * p.decay, p.oscType, 0.005, v(0.3, vol));
    }, i * 60);
  });
});

// ---------------------------------------------------------------------------
// 5. otto.thinking — Gentle pulsing hum
// ---------------------------------------------------------------------------

registerSound(
  "otto.thinking",
  (c: AudioContext, p: SoundPalette, vol: number) => {
    T(
      c,
      p.baseFreq * 0.5,
      0.3 * p.decay,
      p.oscType,
      0.02,
      v(0.15 * p.warmth, vol),
    );
  },
);

// ---------------------------------------------------------------------------
// 6. persona.switch — Crossfade sweep
// ---------------------------------------------------------------------------

registerSound(
  "persona.switch",
  (c: AudioContext, p: SoundPalette, vol: number) => {
    SW(
      c,
      p.baseFreq * 0.8,
      p.baseFreq * 1.2,
      0.2 * p.decay,
      p.oscType,
      v(0.25, vol),
    );
    NS(c, 0.15 * p.decay, p.baseFreq * 2, 1.5, v(0.04, vol));
  },
);

// ---------------------------------------------------------------------------
// 7. chamber.switch — Low frequency shift with texture
// ---------------------------------------------------------------------------

registerSound(
  "chamber.switch",
  (c: AudioContext, p: SoundPalette, vol: number) => {
    T(c, p.baseFreq * 0.5, 0.1 * p.decay, p.oscType, 0.005, v(0.25, vol));
    setTimeout(() => {
      T(c, p.baseFreq * 0.6, 0.1 * p.decay, p.oscType, 0.005, v(0.2, vol));
      NS(c, 0.1 * p.decay, p.baseFreq * 1.5, 1, v(0.04, vol));
    }, 70);
  },
);

// ---------------------------------------------------------------------------
// 8. module.unlock — Rising cascade with shimmer burst
// ---------------------------------------------------------------------------

registerSound(
  "module.unlock",
  (c: AudioContext, p: SoundPalette, vol: number) => {
    const ratios = [1, 1.2, 1.5, 1.8];
    ratios.forEach((r, i) => {
      setTimeout(() => {
        T(c, p.baseFreq * r, 0.1 * p.decay, p.oscType, 0.005, v(0.2, vol));
      }, i * 55);
    });
    // Shimmer burst at the end of the cascade
    setTimeout(() => {
      NS(c, 0.15 * p.decay, p.baseFreq * 3, 2, v(0.08 * p.shimmer, vol));
    }, ratios.length * 55);
  },
);
