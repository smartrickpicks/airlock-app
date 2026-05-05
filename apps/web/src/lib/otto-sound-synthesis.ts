/**
 * Otto Sound Engine — core synthesis primitives.
 *
 * Low-level Web Audio helpers used by the engine to build every sound effect.
 * Volume scaling is handled by the engine layer; these functions operate at
 * the raw gain values passed in.
 */

// ---------------------------------------------------------------------------
// T — single oscillator tone
// ---------------------------------------------------------------------------

export function T(
  c: AudioContext,
  f: number,
  d: number,
  t: OscillatorType = "sine",
  a = 0.005,
  v = 0.3,
  det = 0,
): void {
  const g = c.createGain();
  const o = c.createOscillator();
  o.type = t;
  o.frequency.value = f;
  if (det) o.detune.value = det;
  g.gain.setValueAtTime(0, c.currentTime);
  g.gain.linearRampToValueAtTime(v, c.currentTime + a);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d);
  o.connect(g);
  g.connect(c.destination);
  o.start();
  o.stop(c.currentTime + d + 0.05);
}

// ---------------------------------------------------------------------------
// NS — bandpass-filtered noise burst
// ---------------------------------------------------------------------------

export function NS(c: AudioContext, d: number, f = 1000, q = 1, v = 0.1): void {
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
  g.gain.setValueAtTime(v, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d);
  src.connect(fl);
  fl.connect(g);
  g.connect(c.destination);
  src.start();
  src.stop(c.currentTime + d + 0.05);
}

// ---------------------------------------------------------------------------
// CH — chord / harmony (multiple T() tones at frequency ratios)
// ---------------------------------------------------------------------------

export function CH(
  c: AudioContext,
  root: number,
  ratios: number[],
  d: number,
  t: OscillatorType = "sine",
  v = 0.3,
): void {
  const perVoice = v / Math.sqrt(ratios.length);
  for (const r of ratios) {
    T(c, root * r, d, t, 0.008, perVoice);
  }
}

// ---------------------------------------------------------------------------
// SW — frequency sweep (glide between two frequencies)
// ---------------------------------------------------------------------------

export function SW(
  c: AudioContext,
  from: number,
  to: number,
  d: number,
  t: OscillatorType = "sine",
  v = 0.3,
): void {
  const g = c.createGain();
  const o = c.createOscillator();
  o.type = t;
  o.frequency.setValueAtTime(from, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(Math.max(to, 1), c.currentTime + d);
  g.gain.setValueAtTime(v, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d);
  o.connect(g);
  g.connect(c.destination);
  o.start();
  o.stop(c.currentTime + d + 0.05);
}
