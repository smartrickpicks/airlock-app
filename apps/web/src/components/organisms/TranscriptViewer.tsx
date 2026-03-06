"use client";

import { useState } from "react";
import { ArrowLeft, Search, Clock, Users } from "lucide-react";
import type {
  Meeting,
  MeetingIntelligence,
  TranscriptEntry,
} from "@/lib/mock-meetings";
import MeetingSummaryCard from "@/components/molecules/MeetingSummaryCard";

interface TranscriptViewerProps {
  meeting: Meeting;
  intelligence: MeetingIntelligence;
  transcript: TranscriptEntry[];
  onClose: () => void;
}

export default function TranscriptViewer({
  meeting,
  intelligence,
  transcript,
  onClose,
}: TranscriptViewerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"summary" | "transcript">(
    "summary",
  );

  const filteredTranscript = searchQuery
    ? transcript.filter(
        (e) =>
          e.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.speaker.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : transcript;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-surface-border px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="text-text-muted transition-colors hover:text-text-primary"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-text-primary">
              {meeting.title}
            </p>
            <div className="mt-0.5 flex items-center gap-3 text-[11px] text-text-muted">
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {new Date(meeting.scheduledStart).toLocaleDateString(
                  undefined,
                  {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                )}
              </span>
              {meeting.durationSeconds && (
                <span>{Math.round(meeting.durationSeconds / 60)} min</span>
              )}
              <span className="flex items-center gap-1">
                <Users size={10} />
                {meeting.participants.filter((p) => p.attended).length}
              </span>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="mt-3 flex gap-1">
          <button
            onClick={() => setActiveTab("summary")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "summary"
                ? "bg-accent-primary/20 text-accent-primary"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            Summary
          </button>
          <button
            onClick={() => setActiveTab("transcript")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "transcript"
                ? "bg-accent-primary/20 text-accent-primary"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            Transcript
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {activeTab === "summary" ? (
          <MeetingSummaryCard
            intelligence={intelligence}
            onViewTranscript={() => setActiveTab("transcript")}
          />
        ) : (
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transcript..."
                className="w-full rounded-lg border border-surface-border bg-surface-overlay py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
              />
            </div>

            {/* Processing note */}
            <div className="rounded bg-surface-overlay p-2 text-[11px] text-text-muted">
              Source: {intelligence.transcriptSource} · Processed{" "}
              {new Date(intelligence.processedAt).toLocaleDateString(
                undefined,
                {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                },
              )}{" "}
              via {intelligence.processingModel}
            </div>

            {/* Transcript entries */}
            {transcript.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-text-muted">
                  Full transcript not available for this meeting.
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  See the Summary tab for AI-generated notes.
                </p>
              </div>
            ) : filteredTranscript.length === 0 ? (
              <p className="py-4 text-center text-sm text-text-muted">
                No matches for &ldquo;{searchQuery}&rdquo;
              </p>
            ) : (
              <div className="space-y-1">
                {filteredTranscript.map((entry, i) => {
                  const prevEntry = filteredTranscript[i - 1];
                  const showSpeaker =
                    !prevEntry || prevEntry.speaker !== entry.speaker;

                  return (
                    <div
                      key={i}
                      className={`flex gap-2.5 ${showSpeaker ? "mt-3" : "mt-0.5"} ${
                        entry.isActionItem
                          ? "rounded border-l-2 border-accent-primary bg-accent-primary/5 pl-2"
                          : ""
                      }`}
                    >
                      {/* Timestamp */}
                      <span className="w-12 flex-shrink-0 pt-0.5 text-[10px] font-mono text-text-muted">
                        {entry.timestamp}
                      </span>

                      <div className="min-w-0 flex-1">
                        {showSpeaker && (
                          <p className="text-xs font-semibold text-text-primary">
                            {entry.speaker}
                          </p>
                        )}
                        <p className="text-sm leading-relaxed text-text-secondary">
                          {searchQuery
                            ? highlightMatch(entry.content, searchQuery)
                            : entry.content}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const regex = new RegExp(`(${escapeRegex(query)})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-500/30 text-text-primary">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
