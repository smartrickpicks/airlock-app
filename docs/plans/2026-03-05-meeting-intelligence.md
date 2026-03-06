# Meeting Intelligence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the Meeting Intelligence cross-cutting capability UI at 60% — mock data, Zustand store, and key panels (MeetingsPanel, PrepBriefPanel, TranscriptViewer) that integrate into the vault triptych.

**Architecture:** Meeting Intelligence is NOT a module — it has no Module Bar entry and no route pages. It surfaces as panels within the existing triptych (Control panel "Meetings" tab, Orchestrate panel for prep briefs and transcripts). All data is mock at this stage.

**Tech Stack:** Next.js 14, TypeScript, Zustand, Tailwind CSS tokens, Lucide icons

---

### Task 1: Mock Meeting Data

**Files:**

- Create: `apps/web/src/lib/mock-meetings.ts`

Types: MeetingStatus (9 states), TranscriptSource, MeetingParticipant, Meeting, MeetingIntelligence (summary, action items, topics, sentiment), PrepBrief (attendee profiles, related meetings, active vaults, open tasks, topic threads), ConversationThread.

Mock data: 8 meetings across vaults (2 upcoming/scheduled, 4 past/ready, 1 processing, 1 cancelled), 6 participants, intelligence results for past meetings, 1 prep brief, 4 conversation threads.

### Task 2: Meeting Zustand Store

**Files:**

- Create: `apps/web/src/stores/meeting.store.ts`

State: meetings, intelligence (Record<string, MeetingIntelligence>), prepBriefs (Record<string, PrepBrief>), threads, selectedMeetingId.
Actions: fetchMeetings, selectMeeting, getUpcomingMeetings(vaultId), getPastMeetings(vaultId), getMeetingIntelligence(meetingId), getPrepBrief(meetingId).

### Task 3: MeetingCard Molecule

**Files:**

- Create: `apps/web/src/components/molecules/MeetingCard.tsx`

Props: meeting, onClick, variant ("upcoming" | "past").
Upcoming: date/time, title, participant avatars, "View Prep Brief" + "Join" buttons.
Past: date/time, title, participant names, duration, action item count, "View Summary" + "View Transcript" buttons.

### Task 4: MeetingSummaryCard Molecule

**Files:**

- Create: `apps/web/src/components/molecules/MeetingSummaryCard.tsx`

Props: intelligence (MeetingIntelligence), onViewTranscript.
Displays: one-liner summary, bullet points, key decisions, action items list (with urgency dots), topics as pills, sentiment indicator.

### Task 5: MeetingsPanel Organism (Control Panel Tab)

**Files:**

- Create: `apps/web/src/components/organisms/MeetingsPanel.tsx`

Rendered inside vault triptych Control panel as a new tab.
Sections: "Start Meeting" + "Schedule Meeting" buttons (disabled/placeholder), "Upcoming" meetings list, "Past Meetings" list.
Uses MeetingCard for each item.

### Task 6: PrepBriefPanel Organism

**Files:**

- Create: `apps/web/src/components/organisms/PrepBriefPanel.tsx`

Props: prepBrief, onClose.
Sections: Attendee Profiles (name, company, role, last interaction, sentiment, open action items), Related Meetings (title, date, summary, unresolved items), Active Vaults (name, module, chamber, health), Topic Threads (topic name, first mentioned, meeting count, key decisions).

### Task 7: TranscriptViewer Organism

**Files:**

- Create: `apps/web/src/components/organisms/TranscriptViewer.tsx`

Props: intelligence, meeting, onClose.
Header: meeting title, date, duration, participant count.
Body: Summary card (MeetingSummaryCard), raw transcript with speaker labels and timestamps, action items section.
Search within transcript input.

### Task 8: Shell Wiring + Registry + Verify + Commit + Push

- Update `docs/registry/components.json` with new components
- Run `pnpm type-check` and `pnpm lint`
- Commit with `feat(shell): add Meeting Intelligence panels, store, and mock data`
- Push to remote
- Update milestones.md
