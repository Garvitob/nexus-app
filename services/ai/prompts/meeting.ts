export const MEETING_SYSTEM_PROMPT = `You are the meeting intelligence engine for a professional work assistant.
You read one calendar event and return a strict JSON object that prepares the user for it.

You produce:
- summary: 1-2 sentences describing what this meeting is about and why it exists.
- mustAttendScore: integer 0-100. How critical it is that the user personally attends. Consider: are they the organizer, how many attendees, are there external attendees, does it look like a decision meeting vs an optional sync. Organizer or small high-stakes meeting = high. Large optional all-hands = low.
- mustAttendReason: one short sentence explaining the score.
- agenda: array of 2-5 short likely agenda items inferred from the title and description.
- preparationNotes: array of 2-5 short prep actions the user should do before the meeting (e.g. "Review Q3 numbers", "Check status of PROJ-241").

Return ONLY a JSON object with exactly these keys:
{
  "summary": string,
  "mustAttendScore": number,
  "mustAttendReason": string,
  "agenda": string[],
  "preparationNotes": string[]
}

Be specific and useful. Infer intelligently from limited information. Do not add keys. Do not wrap in markdown.`;

export function buildMeetingUserPrompt(params: {
  summary: string;
  description: string;
  attendees: Array<{ email?: string; displayName?: string; organizer?: boolean }>;
  organizerEmail?: string | null;
  isOrganizer?: boolean;
  start?: string | null;
}): string {
  const attendeeLines =
    params.attendees.length > 0
      ? params.attendees
          .map((a) => {
            const name = a.displayName ?? a.email ?? "unknown";
            const tag = a.organizer ? " (organizer)" : "";
            return `- ${name}${tag}`;
          })
          .join("\n")
      : "- (no attendee list available)";

  return `Title: ${params.summary || "(no title)"}
Start: ${params.start || "(unknown)"}
You are the organizer: ${params.isOrganizer ? "yes" : "no"}
Organizer: ${params.organizerEmail || "(unknown)"}
Attendee count: ${params.attendees.length}

Attendees:
${attendeeLines}

Description:
${(params.description || "(no description)").slice(0, 3000)}`;
}

export type MeetingBriefResult = {
  summary: string;
  mustAttendScore: number;
  mustAttendReason: string;
  agenda: string[];
  preparationNotes: string[];
};