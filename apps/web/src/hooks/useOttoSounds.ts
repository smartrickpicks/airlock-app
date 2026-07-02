"use client";

// ---------------------------------------------------------------------------
// Otto Sound Hook — OTTER sound pack v2 (Zac's picks)
// Pure Web Audio API synthesis. No audio files needed.
// ---------------------------------------------------------------------------

let ctx: AudioContext | null = null;
let masterVolume = 0.5;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

/** Set master volume (0 – 1). */
export function setOttoVolume(vol: number) {
  masterVolume = Math.max(0, Math.min(1, vol));
}

// --- Core helpers ----------------------------------------------------------

function T(
  c: AudioContext,
  f: number,
  d: number,
  t: OscillatorType = "sine",
  a = 0.005,
  v = 0.3,
  det = 0,
) {
  const g = c.createGain();
  const o = c.createOscillator();
  o.type = t;
  o.frequency.value = f;
  if (det) o.detune.value = det;
  g.gain.setValueAtTime(0, c.currentTime);
  g.gain.linearRampToValueAtTime(v * masterVolume, c.currentTime + a);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d);
  o.connect(g);
  g.connect(c.destination);
  o.start();
  o.stop(c.currentTime + d + 0.05);
}

function NS(c: AudioContext, d: number, f = 1000, q = 1, v = 0.1) {
  const len = c.sampleRate * d;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const fl = c.createBiquadFilter();
  fl.type = "bandpass";
  fl.frequency.value = f;
  fl.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(v * masterVolume, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d);
  src.connect(fl);
  fl.connect(g);
  g.connect(c.destination);
  src.start();
  src.stop(c.currentTime + d + 0.05);
}

// --- Sound definitions -----------------------------------------------------

/** B — Deep Plop */
function msgReceived() {
  const c = getCtx();
  T(c, 500, 0.06, "sine", 0.003, 0.28);
  setTimeout(() => {
    T(c, 800, 0.08, "sine", 0.005, 0.3, 10);
    NS(c, 0.05, 3200, 1.5, 0.05);
  }, 60);
  setTimeout(() => {
    T(c, 1000, 0.05, "sine", 0.003, 0.15, 8);
  }, 130);
}

/** A — Soft Pluck */
function msgSent() {
  const c = getCtx();
  T(c, 660, 0.06, "sine", 0.005, 0.15);
}

/** C — Cascade Drop */
function dmReceived() {
  const c = getCtx();
  T(c, 600, 0.06, "sine", 0.004, 0.3);
  setTimeout(() => {
    T(c, 800, 0.06, "sine", 0.004, 0.28);
  }, 55);
  setTimeout(() => {
    T(c, 1000, 0.06, "sine", 0.004, 0.26);
    NS(c, 0.03, 4000, 2, 0.03);
  }, 110);
  setTimeout(() => {
    T(c, 1200, 0.1, "sine", 0.005, 0.3, 10);
    NS(c, 0.05, 3500, 1.5, 0.04);
  }, 175);
}

/** C — Double Knock */
function mention() {
  const c = getCtx();
  T(c, 900, 0.04, "sine", 0.003, 0.3);
  setTimeout(() => {
    T(c, 900, 0.04, "sine", 0.003, 0.28);
  }, 90);
  setTimeout(() => {
    T(c, 1350, 0.08, "sine", 0.005, 0.34);
    NS(c, 0.04, 5500, 2, 0.04);
  }, 160);
}

/** B — Gentle Arpeggio (looped 8 notes) */
function callRing() {
  const c = getCtx();
  const notes = [523, 659, 784, 659];
  for (let i = 0; i < 8; i++) {
    setTimeout(() => {
      T(c, notes[i % 4], 0.18, "sine", 0.01, 0.28);
    }, i * 280);
  }
}

/** A — Rising Cascade */
function callConnect() {
  const c = getCtx();
  T(c, 800, 0.06, "sine", 0.003, 0.3);
  setTimeout(() => {
    T(c, 1000, 0.06, "sine", 0.003, 0.28, 8);
  }, 55);
  setTimeout(() => {
    T(c, 1200, 0.08, "sine", 0.005, 0.32);
    NS(c, 0.04, 5000, 2, 0.04);
  }, 120);
  setTimeout(() => {
    T(c, 1400, 0.12, "sine", 0.005, 0.25, 15);
  }, 190);
}

/** C — Soft Close */
function callEnd() {
  const c = getCtx();
  T(c, 700, 0.08, "sine", 0.006, 0.24);
  setTimeout(() => {
    T(c, 525, 0.14, "sine", 0.008, 0.2);
  }, 80);
  setTimeout(() => {
    NS(c, 0.06, 1800, 1, 0.03);
  }, 160);
}

/** B — Confident Knock */
function userJoin() {
  const c = getCtx();
  T(c, 600, 0.08, "triangle", 0.003, 0.32);
  setTimeout(() => {
    T(c, 900, 0.1, "sine", 0.005, 0.35, 6);
    NS(c, 0.05, 3500, 1.5, 0.05);
  }, 75);
}

/** A — Gentle Fall */
function userLeave() {
  const c = getCtx();
  T(c, 784, 0.1, "sine", 0.01, 0.18);
  setTimeout(() => {
    T(c, 659, 0.15, "sine", 0.01, 0.15);
  }, 80);
}

/** A — High Ping */
function notification() {
  const c = getCtx();
  T(c, 1600, 0.04, "triangle", 0.001, 0.25);
  setTimeout(() => {
    T(c, 2000, 0.06, "triangle", 0.002, 0.2);
  }, 40);
}

/** C — Triple Sink */
function error() {
  const c = getCtx();
  T(c, 350, 0.1, "sine", 0.008, 0.28);
  setTimeout(() => {
    T(c, 280, 0.1, "sine", 0.008, 0.26);
  }, 85);
  setTimeout(() => {
    T(c, 220, 0.16, "sine", 0.01, 0.22);
    NS(c, 0.05, 500, 0.5, 0.03);
  }, 175);
}

/** B — Sparkle Triad */
function success() {
  const c = getCtx();
  T(c, 1000, 0.03, "triangle", 0.001, 0.22);
  setTimeout(() => {
    T(c, 1250, 0.03, "triangle", 0.001, 0.22);
  }, 30);
  setTimeout(() => {
    T(c, 1500, 0.06, "triangle", 0.002, 0.28);
    NS(c, 0.03, 8000, 4, 0.03);
  }, 60);
}

// --- Hook ------------------------------------------------------------------

const ottoSounds = {
  msgReceived,
  msgSent,
  dmReceived,
  mention,
  callRing,
  callConnect,
  callEnd,
  userJoin,
  userLeave,
  notification,
  error,
  success,
} as const;

export type OttoSounds = typeof ottoSounds;

export function useOttoSounds() {
  return ottoSounds;
}
