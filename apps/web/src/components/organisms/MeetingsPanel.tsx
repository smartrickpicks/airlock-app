"use client";

import { useEffect } from "react";
import { Video, CalendarPlus, Loader2 } from "lucide-react";
import { useMeetingStore } from "@/stores/meeting.store";
import MeetingCard from "@/components/molecules/MeetingCard";

interface MeetingsPanelProps {
  vaultId?: string;
  onViewSummary?: (meetingId: string) => void;
  onViewTranscript?: (meetingId: string) => void;
  onViewPrepBrief?: (meetingId: string) => void;
}

export default function MeetingsPanel({
  vaultId,
  onViewSummary,
  onViewTranscript,
  onViewPrepBrief,
}: MeetingsPanelProps) {
  const {
    meetings,
    fetchMeetings,
    upcomingMeetings,
    pastMeetings,
    getMeetingIntelligence,
  } = useMeetingStore();

  useEffect(() => {
    if (meetings.length === 0) {
      fetchMeetings();
    }
  }, [meetings.length, fetchMeetings]);

  const upcoming = upcomingMeetings(vaultId);
  const past = pastMeetings(vaultId);

  return (
    <div className="flex h-full flex-col">
      {/* Header with action buttons */}
      <div className="flex items-center gap-2 border-b border-surface-border px-4 py-3">
        <button
          className="flex items-center gap-1.5 rounded-md bg-accent-success/20 px-3 py-1.5 text-xs font-medium text-accent-success transition-colors hover:bg-accent-success/30"
          title="Start an instant meeting"
        >
          <Video size={14} />
          Start Meeting
        </button>
        <button
          className="flex items-center gap-1.5 rounded-md border border-surface-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-hover"
          title="Schedule a meeting"
        >
          <CalendarPlus size={14} />
          Schedule
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {meetings.length === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 size={20} className="animate-spin text-text-muted" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Upcoming */}
            <section>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                Upcoming ({upcoming.length})
              </h3>
              {upcoming.length === 0 ? (
                <p className="text-xs text-text-muted italic">
                  No upcoming meetings
                </p>
              ) : (
                <div className="space-y-2">
                  {upcoming.map((m) => (
                    <MeetingCard
                      key={m.id}
                      meeting={m}
                      variant="upcoming"
                      onViewPrepBrief={
                        onViewPrepBrief
                          ? () => onViewPrepBrief(m.id)
                          : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Past meetings */}
            <section>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                Past Meetings ({past.length})
              </h3>
              {past.length === 0 ? (
                <p className="text-xs text-text-muted italic">
                  No past meetings
                </p>
              ) : (
                <div className="space-y-2">
                  {past.map((m) => {
                    const intel = getMeetingIntelligence(m.id);
                    return (
                      <MeetingCard
                        key={m.id}
                        meeting={m}
                        intelligence={intel}
                        variant="past"
                        onViewSummary={
                          onViewSummary ? () => onViewSummary(m.id) : undefined
                        }
                        onViewTranscript={
                          onViewTranscript
                            ? () => onViewTranscript(m.id)
                            : undefined
                        }
                      />
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
