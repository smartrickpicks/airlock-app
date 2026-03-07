import { create } from "zustand";
import type {
  Meeting,
  MeetingIntelligence,
  PrepBrief,
  ConversationThread,
  TranscriptEntry,
} from "@/lib/mock-meetings";
import {
  MOCK_MEETINGS,
  MOCK_INTELLIGENCE,
  MOCK_PREP_BRIEFS,
  MOCK_THREADS,
  MOCK_TRANSCRIPTS,
} from "@/lib/mock-meetings";
import { getWorkspaceMode } from "@/stores/onboarding.store";

interface MeetingState {
  /* data */
  meetings: Meeting[];
  intelligence: Record<string, MeetingIntelligence>;
  prepBriefs: Record<string, PrepBrief>;
  transcripts: Record<string, TranscriptEntry[]>;
  threads: ConversationThread[];

  /* ui */
  selectedMeetingId: string | null;
  activeView: "list" | "summary" | "transcript" | "prep-brief";

  /* actions */
  fetchMeetings: () => Promise<void>;
  selectMeeting: (id: string | null) => void;
  setActiveView: (view: MeetingState["activeView"]) => void;

  /* derived */
  upcomingMeetings: (vaultId?: string) => Meeting[];
  pastMeetings: (vaultId?: string) => Meeting[];
  getMeetingIntelligence: (meetingId: string) => MeetingIntelligence | null;
  getPrepBrief: (meetingId: string) => PrepBrief | null;
  getTranscript: (meetingId: string) => TranscriptEntry[];
  selectedMeeting: () => Meeting | null;
}

export const useMeetingStore = create<MeetingState>((set, get) => ({
  meetings: [],
  intelligence: {},
  prepBriefs: {},
  transcripts: {},
  threads: [],
  selectedMeetingId: null,
  activeView: "list",

  fetchMeetings: async () => {
    try {
      const res = await fetch("/api/meetings");
      const data = await res.json();
      set({
        meetings: data.meetings,
        intelligence: data.intelligence,
        prepBriefs: data.prepBriefs,
        transcripts: data.transcripts,
        threads: data.threads,
      });
    } catch {
      if (getWorkspaceMode() === "clean") {
        set({
          meetings: [],
          intelligence: {},
          prepBriefs: {},
          transcripts: {},
          threads: [],
        });
      } else {
        set({
          meetings: MOCK_MEETINGS,
          intelligence: MOCK_INTELLIGENCE,
          prepBriefs: MOCK_PREP_BRIEFS,
          transcripts: MOCK_TRANSCRIPTS,
          threads: MOCK_THREADS,
        });
      }
    }
  },

  selectMeeting: (id) => set({ selectedMeetingId: id }),
  setActiveView: (view) => set({ activeView: view }),

  upcomingMeetings: (vaultId) => {
    const { meetings } = get();
    const now = new Date().toISOString();
    return meetings
      .filter(
        (m) =>
          (m.status === "scheduled" || m.status === "joining") &&
          m.scheduledStart >= now &&
          (!vaultId || m.vaultId === vaultId),
      )
      .sort(
        (a, b) =>
          new Date(a.scheduledStart).getTime() -
          new Date(b.scheduledStart).getTime(),
      );
  },

  pastMeetings: (vaultId) => {
    const { meetings } = get();
    return meetings
      .filter(
        (m) =>
          ["ended", "processing", "ready"].includes(m.status) &&
          (!vaultId || m.vaultId === vaultId),
      )
      .sort(
        (a, b) =>
          new Date(b.scheduledStart).getTime() -
          new Date(a.scheduledStart).getTime(),
      );
  },

  getMeetingIntelligence: (meetingId) => get().intelligence[meetingId] || null,

  getPrepBrief: (meetingId) => get().prepBriefs[meetingId] || null,

  getTranscript: (meetingId) => get().transcripts[meetingId] || [],

  selectedMeeting: () => {
    const { meetings, selectedMeetingId } = get();
    if (!selectedMeetingId) return null;
    return meetings.find((m) => m.id === selectedMeetingId) || null;
  },
}));
