import { useQuery } from "@tanstack/react-query";

export type MeetingAttendee = {
  email: string;
  displayName: string;
  responseStatus: string;
};

export type Meeting = {
  id: string;
  title: string;
  description: string;
  startTime: string | null;
  endTime: string | null;
  attendees: MeetingAttendee[];
  meetLink: string | null;
  htmlLink: string | null;
  location: string | null;
  isAllDay: boolean;
  organizer: { email?: string; displayName?: string } | null;
  hasBrief: boolean;
  briefSummary: string | null;
};

export type MeetingBrief = {
  summary: string | null;
  agenda: string[];
  keyPoints: string[];
  openItems: string[];
  preparationNotes: string[];
  suggestedFollowUps: string[];
};

async function fetchMeetings(): Promise<Meeting[]> {
  const res = await fetch("/api/meetings/list");
  if (!res.ok) throw new Error("Failed to fetch meetings");
  const data = await res.json();
  return data.meetings;
}

async function fetchBrief(meeting: Meeting): Promise<MeetingBrief> {
  const res = await fetch("/api/meetings/brief", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      meetingId: meeting.id,
      title: meeting.title,
      description: meeting.description,
      startTime: meeting.startTime,
      attendees: meeting.attendees,
    }),
  });
  if (!res.ok) throw new Error("Failed to fetch brief");
  const data = await res.json();
  return data.brief;
}

export function useMeetings() {
  return useQuery({
    queryKey: ["meetings"],
    queryFn: fetchMeetings,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMeetingBrief(meeting: Meeting | null) {
  return useQuery({
    queryKey: ["meeting-brief", meeting?.id],
    queryFn: () => fetchBrief(meeting!),
    enabled: !!meeting,
    staleTime: 60 * 60 * 1000,
  });
}