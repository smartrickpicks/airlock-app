/**
 * Otto Sound Engine — types, event unions, and persona/chamber palette data.
 *
 * Provides the tinting system that lets Otto's audio feedback shift based on
 * the active MAGS persona, lifecycle chamber, and meta-archetype.
 */

import type { MetaArchetype } from "@/lib/mock-forge";
import type { ChamberName } from "@/lib/constants";

// Re-export for convenience
export type { MetaArchetype } from "@/lib/mock-forge";
export type { ChamberName } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

export type MAGSPersona =
  | "captain"
  | "guardian"
  | "scholar"
  | "maverick"
  | "strategist"
  | "artisan";

export interface SoundPalette {
  baseFreq: number;
  oscType: OscillatorType;
  warmth: number;
  decay: number;
  shimmer: number;
}

export interface SoundContext {
  persona: MAGSPersona | null;
  chamber: ChamberName | null;
  archetype: MetaArchetype | null;
  confidence: number;
}

// ---------------------------------------------------------------------------
// Event definitions
// ---------------------------------------------------------------------------

export const SYSTEM_EVENTS = [
  "otto.notify",
  "otto.insight",
  "otto.confirm",
  "otto.error",
  "otto.thinking",
  "persona.switch",
  "chamber.switch",
  "module.unlock",
] as const;

export type SystemEvent = (typeof SYSTEM_EVENTS)[number];

export const CALIBRATION_EVENTS = [
  "cal.answer",
  "cal.insight",
  "cal.driveReveal",
  "cal.archetypeHint",
  "cal.profileReveal",
  "cal.provenanceUnlock",
  "cal.bmyChoice",
  "cal.workspaceBuild",
  "cal.launchReady",
] as const;

export type CalibrationEvent = (typeof CALIBRATION_EVENTS)[number];

export const SOUNDBOARD_EVENTS = [
  "sb.rimshot",
  "sb.airhorn",
  "sb.sadTrombone",
  "sb.applause",
  "sb.drumroll",
  "sb.ding",
  "sb.whoosh",
  "sb.tada",
] as const;

export type SoundboardEvent = (typeof SOUNDBOARD_EVENTS)[number];

export type SoundEvent = SystemEvent | CalibrationEvent | SoundboardEvent;

// ---------------------------------------------------------------------------
// Persona palettes
// ---------------------------------------------------------------------------

export const PERSONA_PALETTES: Record<MAGSPersona, SoundPalette> = {
  captain: {
    baseFreq: 660,
    oscType: "sine",
    warmth: 1.0,
    decay: 1.0,
    shimmer: 0.4,
  },
  guardian: {
    baseFreq: 440,
    oscType: "sine",
    warmth: 1.4,
    decay: 1.3,
    shimmer: 0.2,
  },
  scholar: {
    baseFreq: 880,
    oscType: "triangle",
    warmth: 0.8,
    decay: 0.8,
    shimmer: 0.7,
  },
  maverick: {
    baseFreq: 550,
    oscType: "sawtooth",
    warmth: 0.6,
    decay: 0.6,
    shimmer: 0.9,
  },
  strategist: {
    baseFreq: 740,
    oscType: "triangle",
    warmth: 1.1,
    decay: 1.1,
    shimmer: 0.5,
  },
  artisan: {
    baseFreq: 520,
    oscType: "sine",
    warmth: 1.3,
    decay: 1.4,
    shimmer: 0.6,
  },
};

// ---------------------------------------------------------------------------
// Chamber modifiers
// ---------------------------------------------------------------------------

export interface ChamberModifier {
  freqMult: number;
  decayMult: number;
  shimmerMult: number;
}

export const CHAMBER_MODIFIERS: Record<ChamberName, ChamberModifier> = {
  discover: { freqMult: 1.0, decayMult: 1.0, shimmerMult: 1.0 },
  build: { freqMult: 1.0, decayMult: 0.8, shimmerMult: 1.2 },
  review: { freqMult: 0.95, decayMult: 1.2, shimmerMult: 0.7 },
  ship: { freqMult: 1.1, decayMult: 0.6, shimmerMult: 1.5 },
};

// ---------------------------------------------------------------------------
// Archetype tints
// ---------------------------------------------------------------------------

export interface ArchetypeTint {
  warmthMod: number;
  shimmerMod: number;
}

export const ARCHETYPE_TINTS: Record<MetaArchetype, ArchetypeTint> = {
  driver: { warmthMod: -0.1, shimmerMod: 0.15 },
  enforcer: { warmthMod: 0.15, shimmerMod: -0.1 },
  interpreter: { warmthMod: 0.05, shimmerMod: 0.1 },
};

// ---------------------------------------------------------------------------
// Default palette (used when no persona is active)
// ---------------------------------------------------------------------------

export const DEFAULT_PALETTE: SoundPalette = {
  baseFreq: 600,
  oscType: "sine",
  warmth: 1.0,
  decay: 1.0,
  shimmer: 0.3,
};
