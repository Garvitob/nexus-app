import { readFromCache } from "@/lib/corsair";
import { db } from "@/lib/db";

type CalendarTime = {
  dateTime?: string;
  date?: string;
  timeZone?: string;
};

type CalendarAttendee = {
  email?: string;
  displayName?: string;
  organizer?: boolean;
  responseStatus?: string;
  optional?: boolean;
};

type CalendarRow = {
  id?: string;
  entity_id?: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  hangoutLink?: string;
  status?: string;
  start?: CalendarTime;
  end?: CalendarTime;
  attendees?: CalendarAttendee[];
  organizer?: { email?: string; displayName?: string; self?: boolean };
  creator?: { email?: string; displayName?: string; self?: boolean };
  created?: string;
  updated?: string;
};

export type SyncedEvent = {
  corsairEventId: string;
  summary: string;
  description: string;
  location: string;
  meetingLink: string | null;
  start: Date | null;
  end: Date | null;
  attendees: CalendarAttendee[];
  organizerEmail: string | null;
  isOrganizer: boolean;
};

function toDate(t?: CalendarTime): Date | null {
  if (!t) return null;
  const raw = t.dateTime ?? t.date;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalize(row: CalendarRow): SyncedEvent | null {
  const id = row.id ?? row.entity_id;
  if (!id) return null;

  return {
    corsairEventId: id,
    summary: row.summary ?? "(no title)",
    description: row.description ?? "",
    location: row.location ?? "",
    meetingLink: row.hangoutLink ?? row.htmlLink ?? null,
    start: toDate(row.start),
    end: toDate(row.end),
    attendees: Array.isArray(row.attendees) ? row.attendees : [],
    organizerEmail: row.organizer?.email ?? row.creator?.email ?? null,
    isOrganizer: row.organizer?.self === true || row.creator?.self === true,
  };
}

export async function fetchEventsFromCorsair(
  tenantId: string,
  limit = 100
): Promise<SyncedEvent[]> {
  const rows = await readFromCache<CalendarRow>(
    tenantId,
    "googlecalendar.db.events.search",
    {},
    limit,
    0
  );

  return rows
    .map(normalize)
    .filter((e): e is SyncedEvent => e !== null)
    .sort((a, b) => {
      const ta = a.start?.getTime() ?? 0;
      const tb = b.start?.getTime() ?? 0;
      return ta - tb;
    });
}

export async function syncCalendar(params: {
  userId: string;
  tenantId: string;
  limit?: number;
}): Promise<{ fetched: number; newIds: string[] }> {
  const { userId, tenantId, limit = 100 } = params;

  const events = await fetchEventsFromCorsair(tenantId, limit);
  if (events.length === 0) {
    await markSynced(userId, "googlecalendar");
    return { fetched: 0, newIds: [] };
  }

  const existing = await db.meetingBrief.findMany({
    where: {
      userId,
      corsairEventId: { in: events.map((e) => e.corsairEventId) },
    },
    select: { corsairEventId: true },
  });
  const existingIds = new Set(existing.map((e) => e.corsairEventId));

  const newEvents = events.filter(
    (e) => !existingIds.has(e.corsairEventId)
  );

  for (const event of newEvents) {
    await db.meetingBrief.upsert({
      where: {
        userId_corsairEventId: {
          userId,
          corsairEventId: event.corsairEventId,
        },
      },
      update: {},
      create: {
        userId,
        corsairEventId: event.corsairEventId,
      },
    });
  }

  await markSynced(userId, "googlecalendar");

  return {
    fetched: events.length,
    newIds: newEvents.map((e) => e.corsairEventId),
  };
}

async function markSynced(userId: string, pluginId: string) {
  await db.connectedAccount
    .updateMany({
      where: { userId, pluginId },
      data: { lastSyncedAt: new Date() },
    })
    .catch(() => null);
}