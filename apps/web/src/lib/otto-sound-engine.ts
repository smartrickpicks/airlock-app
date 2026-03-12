"use client";

/**
 * Otto Sound Engine — singleton that resolves palette from context and plays events.
 *
 * The engine merges persona palette, chamber modifier, and archetype tint into a
 * single SoundPalette, then dispatches to registered synthesis functions.
 */

import {
  type SoundContext,
  type SoundPalette,
  type SoundEvent,
  type MAGSPersona,
  type ChamberName,
  PERSONA_PALETTES,
  CHAMBER_MODIFIERS,
  ARCHETYPE_TINTS,
  DEFAULT_PALETTE,
} from "@/lib/otto-sound-types";
import type { MetaArchetype } from "@/lib/mock-forge";

// ---------------------------------------------------------------------------
// Sound function registry
// ---------------------------------------------------------------------------

/** A synthesis function that plays audio for an event. */
type SoundFn = (ctx: AudioContext, palette: SoundPalette, vol: number) => void;

/** Maps event names to synthesis functions. Populated by event modules. */
const SOUND_REGISTRY: Record<string, SoundFn> = {};

/** Register a sound function for an event. Called by event modules. */
export function registerSound(event: SoundEvent, fn: SoundFn): void {
  SOUND_REGISTRY[event] = fn;
}

// ---------------------------------------------------------------------------
// Engine singleton
// ---------------------------------------------------------------------------

export class OttoSoundEngine {
  private static _instance: OttoSoundEngine | null = null;
  private audioCtx: AudioContext | null = null;
  private context: SoundContext = {
    persona: null,
    chamber: null,
    archetype: null,
    confidence: 0,
  };
  private masterVolume = 0.5;
  private enabled = true;

  private constructor() {}

  static getInstance(): OttoSoundEngine {
    if (!OttoSoundEngine._instance) {
      OttoSoundEngine._instance = new OttoSoundEngine();
    }
    return OttoSoundEngine._instance;
  }

  // -------------------------------------------------------------------------
  // Context & settings
  // -------------------------------------------------------------------------

  setContext(partial: Partial<SoundContext>): void {
    Object.assign(this.context, partial);
  }

  getContext(): Readonly<SoundContext> {
    return { ...this.context };
  }

  setVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol));
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
  }

  // -------------------------------------------------------------------------
  // Audio context (lazy init + auto-resume)
  // -------------------------------------------------------------------------

  private getAudioCtx(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }
    if (this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // -------------------------------------------------------------------------
  // Palette resolution
  // -------------------------------------------------------------------------

  /**
   * Resolve the current sound palette from context.
   * 1. Start with persona base palette (or DEFAULT_PALETTE)
   * 2. Apply chamber modifier (freq, decay, shimmer multipliers)
   * 3. Apply archetype tint (warmth, shimmer additive)
   * 4. Blend by confidence (shimmer/warmth increase with confidence)
   */
  resolvePalette(): SoundPalette {
    const { persona, chamber, archetype, confidence } = this.context;

    // 1. Base palette
    const p: SoundPalette = persona
      ? { ...PERSONA_PALETTES[persona] }
      : { ...DEFAULT_PALETTE };

    // 2. Chamber modifier
    if (chamber) {
      const mod = CHAMBER_MODIFIERS[chamber];
      p.baseFreq *= mod.freqMult;
      p.decay *= mod.decayMult;
      p.shimmer = Math.min(1, p.shimmer * mod.shimmerMult);
    }

    // 3. Archetype tint
    if (archetype) {
      const tint = ARCHETYPE_TINTS[archetype];
      p.warmth = Math.max(0.1, p.warmth + tint.warmthMod);
      p.shimmer = Math.max(0, Math.min(1, p.shimmer + tint.shimmerMod));
    }

    // 4. Confidence blending — no persona set? blend toward archetype as confidence grows
    if (!persona && confidence > 0 && confidence < 1) {
      p.shimmer = Math.min(1, p.shimmer + confidence * 0.15);
      p.warmth = Math.max(0.1, p.warmth + confidence * 0.1);
    }

    return p;
  }

  // -------------------------------------------------------------------------
  // Playback
  // -------------------------------------------------------------------------

  /** Play a sound event using the current context palette. */
  play(event: SoundEvent): void {
    if (!this.enabled) return;
    const fn = SOUND_REGISTRY[event];
    if (!fn) return;
    const ctx = this.getAudioCtx();
    const palette = this.resolvePalette();
    fn(ctx, palette, this.masterVolume);
  }

  /** Play with a specific palette override (for soundboard previews). */
  playWithPalette(event: SoundEvent, palette: SoundPalette): void {
    if (!this.enabled) return;
    const fn = SOUND_REGISTRY[event];
    if (!fn) return;
    const ctx = this.getAudioCtx();
    fn(ctx, palette, this.masterVolume);
  }
}
