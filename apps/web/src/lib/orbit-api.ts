/**
 * Orbit API client — wraps all /api/v1/orbit endpoints.
 * Uses the same apiFetch pattern as lib/api.ts.
 */

import { apiFetch } from "@/lib/api";
import type { OrbitProfile, OrbitSection, OrbitPersona, OrbitLink } from "@/stores/orbit.store";

// ---------------------------------------------------------------------------
// Request / Response types
// ---------------------------------------------------------------------------

export interface CreateOrbitPayload {
  slug: string;
  display_name: string;
  tagline?: string;
}

export interface UpdateOrbitPayload {
  display_name?: string;
  tagline?: string;
  avatar_url?: string;
  brand_pillars?: string[];
  theme?: { primary_color?: string; accent_color?: string; layout_preset?: string };
  is_published?: boolean;
}

export interface CreateSectionPayload {
  section_type: string;
  title: string;
  order_index: number;
  is_visible?: boolean;
  content?: Record<string, unknown>;
}

export interface UpdateSectionPayload {
  title?: string;
  is_visible?: boolean;
  content?: Record<string, unknown>;
}

export interface ReorderSectionsPayload {
  /** Array of [section_id, new_order_index] pairs */
  order: { id: string; order_index: number }[];
}

export interface CreateLinkPayload {
  title: string;
  url: string;
}

export interface UpdatePersonaPayload {
  display_name?: string;
  description?: string;
  traits?: string[];
  emoji?: string;
  order_index?: number;
}

export interface QuizQuestion {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
}

export interface QuizSession {
  session_id: string;
  question: QuizQuestion;
}

export interface QuizAnswer {
  session_id: string;
  question_id: string;
  answer: "a" | "b";
}

export interface QuizResult {
  persona: OrbitPersona;
  is_complete: boolean;
  next_question?: QuizQuestion;
}

// ---------------------------------------------------------------------------
// Creator endpoints (authenticated)
// ---------------------------------------------------------------------------

export const orbitApi = {
  /** Get the authenticated user's orbit profile */
  getMyOrbit(): Promise<OrbitProfile> {
    return apiFetch<OrbitProfile>("/api/v1/orbit/me");
  },

  /** Create a new orbit profile */
  createOrbit(payload: CreateOrbitPayload): Promise<OrbitProfile> {
    return apiFetch<OrbitProfile>("/api/v1/orbit", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /** Update top-level orbit profile fields */
  updateOrbit(payload: UpdateOrbitPayload): Promise<OrbitProfile> {
    return apiFetch<OrbitProfile>("/api/v1/orbit/me", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  /** Add a new section to the orbit */
  createSection(payload: CreateSectionPayload): Promise<OrbitSection> {
    return apiFetch<OrbitSection>("/api/v1/orbit/me/sections", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /** Update an existing section */
  updateSection(sectionId: string, payload: UpdateSectionPayload): Promise<OrbitSection> {
    return apiFetch<OrbitSection>(`/api/v1/orbit/me/sections/${sectionId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  /** Reorder sections */
  reorderSections(payload: ReorderSectionsPayload): Promise<OrbitSection[]> {
    return apiFetch<OrbitSection[]>("/api/v1/orbit/me/sections/reorder", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /** Delete a section */
  deleteSection(sectionId: string): Promise<void> {
    return apiFetch<void>(`/api/v1/orbit/me/sections/${sectionId}`, {
      method: "DELETE",
    });
  },

  /** Create a new link */
  createLink(payload: CreateLinkPayload): Promise<OrbitLink> {
    return apiFetch<OrbitLink>("/api/v1/orbit/me/links", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /** Update a persona */
  updatePersona(personaId: string, payload: UpdatePersonaPayload): Promise<OrbitPersona> {
    return apiFetch<OrbitPersona>(`/api/v1/orbit/me/personas/${personaId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  // ---------------------------------------------------------------------------
  // Public endpoints (unauthenticated)
  // ---------------------------------------------------------------------------

  /** Get a public orbit page by slug */
  getOrbitPage(slug: string): Promise<OrbitProfile> {
    return apiFetch<OrbitProfile>(`/api/v1/orbit/${slug}`);
  },

  /** Start a persona quiz session */
  startQuiz(slug: string): Promise<QuizSession> {
    return apiFetch<QuizSession>(`/api/v1/orbit/${slug}/quiz/start`, {
      method: "POST",
    });
  },

  /** Submit an answer and get the next question or result */
  answerQuiz(slug: string, payload: QuizAnswer): Promise<QuizResult> {
    return apiFetch<QuizResult>(`/api/v1/orbit/${slug}/quiz/answer`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /** Get the final quiz result by session ID */
  getQuizResult(slug: string, sessionId: string): Promise<QuizResult> {
    return apiFetch<QuizResult>(`/api/v1/orbit/${slug}/quiz/result/${sessionId}`);
  },

  /** Track a link click (fire-and-forget) */
  trackClick(slug: string, linkId: string): Promise<void> {
    return apiFetch<void>(`/api/v1/orbit/${slug}/links/${linkId}/click`, {
      method: "POST",
    });
  },
};
