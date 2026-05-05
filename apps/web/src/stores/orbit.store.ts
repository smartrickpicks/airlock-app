import { create } from "zustand";

export interface OrbitSection {
  id: string;
  section_type: string;
  title: string;
  order_index: number;
  is_visible: boolean;
  content: Record<string, unknown>;
}

export interface OrbitPersona {
  id: string;
  pi_profile: string;
  display_name: string;
  description: string;
  traits: string[];
  emoji: string;
  order_index: number;
}

export interface OrbitLink {
  id: string;
  title: string;
  url: string;
  click_count: number;
}

export interface OrbitProfile {
  id: string;
  slug: string;
  display_name: string;
  tagline: string;
  avatar_url: string | null;
  brand_pillars: string[];
  theme: { primary_color: string; accent_color: string; layout_preset: string };
  is_published: boolean;
  spellcast_completed: boolean;
  page_views: number;
  sections: OrbitSection[];
  personas: OrbitPersona[];
  links: OrbitLink[];
}

interface OrbitState {
  /** Current orbit profile for authenticated creator */
  profile: OrbitProfile | null;
  /** Whether the orbit data is loading */
  isLoading: boolean;
  /** Last error message */
  error: string | null;

  /** Set the orbit profile */
  setProfile: (profile: OrbitProfile | null) => void;
  /** Set loading state */
  setLoading: (isLoading: boolean) => void;
  /** Set error state */
  setError: (error: string | null) => void;
  /** Update a single section in the profile */
  updateSection: (section: OrbitSection) => void;
  /** Reorder sections by providing a new ordered array of sections */
  reorderSections: (sections: OrbitSection[]) => void;
  /** Reset to initial state */
  reset: () => void;
}

export const useOrbitStore = create<OrbitState>((set) => ({
  profile: null,
  isLoading: false,
  error: null,

  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  updateSection: (section) =>
    set((state) => {
      if (!state.profile) return state;
      return {
        profile: {
          ...state.profile,
          sections: state.profile.sections.map((s) =>
            s.id === section.id ? section : s,
          ),
        },
      };
    }),

  reorderSections: (sections) =>
    set((state) => {
      if (!state.profile) return state;
      return {
        profile: {
          ...state.profile,
          sections,
        },
      };
    }),

  reset: () => set({ profile: null, isLoading: false, error: null }),
}));
