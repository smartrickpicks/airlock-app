/**
 * Mock dossier data for member PI profiles.
 * In production, this comes from GET /api/v1/profiles/:userId/dossier.
 */

import type { MetaArchetype } from "@/lib/mock-forge";

export interface MemberDossier {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  piProfile: string;
  metaArchetype: MetaArchetype;
  confidence: number;
  source: string;
  drives: {
    dominance: number;
    extraversion: number;
    patience: number;
    formality: number;
  };
  strengths: string[];
  cautions: string[];
  ottoConfig: {
    archetype: string;
    autonomyCeiling: number;
    interactionMode: string;
  };
  workspacePrefs: {
    cognitiveMode: string;
    informationDensity: string;
    interfaceStructure: string;
    updatePace: string;
  };
  linkedInSummary?: {
    headline: string;
    company: string;
    yearsExperience: number;
    topSkills: string[];
  };
  communicationPatterns: {
    strength: string;
    failurePattern: string;
    bestTooling: string;
  };
}

export const MOCK_DOSSIERS: Record<string, MemberDossier> = {
  mem_001: {
    userId: "mem_001",
    name: "Zach Holwerda",
    email: "zach@airlock.so",
    piProfile: "captain",
    metaArchetype: "driver",
    confidence: 0.92,
    source: "conversation + linkedin",
    drives: { dominance: 9, extraversion: 8, patience: 3, formality: 2 },
    strengths: [
      "Delegation mastery",
      "Quick decision-making",
      "Fearless risk-taking",
    ],
    cautions: ["Authoritative presence", "Structure-resistant"],
    ottoConfig: {
      archetype: "executor",
      autonomyCeiling: 0.85,
      interactionMode: "autonomous",
    },
    workspacePrefs: {
      cognitiveMode: "visual",
      informationDensity: "low",
      interfaceStructure: "exploratory",
      updatePace: "alerts",
    },
    linkedInSummary: {
      headline: "Founder & CEO",
      company: "Airlock",
      yearsExperience: 10,
      topSkills: ["Product Strategy", "AI/ML", "Team Building"],
    },
    communicationPatterns: {
      strength: "Direct and decisive",
      failurePattern: "May skip context",
      bestTooling: "Async with summaries",
    },
  },
  mem_002: {
    userId: "mem_002",
    name: "Sarah Chen",
    email: "sarah@company.com",
    piProfile: "strategist",
    metaArchetype: "interpreter",
    confidence: 0.87,
    source: "linkedin",
    drives: { dominance: 7, extraversion: 4, patience: 5, formality: 6 },
    strengths: [
      "Strategic thinking",
      "Data-driven decisions",
      "Long-term planning",
    ],
    cautions: ["Analysis paralysis", "Slow to act"],
    ottoConfig: {
      archetype: "connector",
      autonomyCeiling: 0.6,
      interactionMode: "collaborative",
    },
    workspacePrefs: {
      cognitiveMode: "interactive",
      informationDensity: "medium",
      interfaceStructure: "guided_flexible",
      updatePace: "alerts",
    },
    linkedInSummary: {
      headline: "VP Product",
      company: "TechCorp",
      yearsExperience: 12,
      topSkills: ["Product Strategy", "Go-to-Market", "Analytics"],
    },
    communicationPatterns: {
      strength: "Thorough and balanced",
      failurePattern: "Overthinks small decisions",
      bestTooling: "Collaborative docs",
    },
  },
  mem_003: {
    userId: "mem_003",
    name: "Tom Rodriguez",
    email: "tom@company.com",
    piProfile: "guardian",
    metaArchetype: "enforcer",
    confidence: 0.81,
    source: "conversation",
    drives: { dominance: 3, extraversion: 3, patience: 8, formality: 9 },
    strengths: ["Attention to detail", "Process adherence", "Risk mitigation"],
    cautions: ["Resistant to change", "Overly cautious"],
    ottoConfig: {
      archetype: "guardian",
      autonomyCeiling: 0.4,
      interactionMode: "collaborative",
    },
    workspacePrefs: {
      cognitiveMode: "verbal_procedural",
      informationDensity: "high",
      interfaceStructure: "guided",
      updatePace: "batch",
    },
    communicationPatterns: {
      strength: "Precise and thorough",
      failurePattern: "Can be rigid",
      bestTooling: "Checklists and SOPs",
    },
  },
};

export function getDossier(userId: string): MemberDossier | null {
  return MOCK_DOSSIERS[userId] || null;
}
