import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { corsairTenant } from "@/lib/corsair";
import { db } from "@/lib/db";

export async function GET() {
  const user = await requireUser();
  const tenantId = user.corsairTenantId ?? user.clerkId;
  const tenant = corsairTenant(tenantId);

  const [calResult, briefsResult] = await Promise.allSettled([
    tenant.run("googlecalendar.db.events.search", {}),
    db.meetingBrief.findMany({
      where: { userId: user.id },
      select: { corsairEventId: true, summary: true, generatedAt: true },
    }),
  ]);

  const briefs =
    briefsResult.status === "fulfilled"
      ? new Map(briefsResult.value.map((b) => [b.corsairEventId, b]))
      : new Map();

  if (calResult.status === "rejected") {
    return NextResponse.json({ meetings: [] });
  }

  const cal = calResult.value as {
    success: boolean;
    data?: Array<{
      entity_id: string;
      data?: Record<string, unknown>;
    }>;
  };

  if (!cal.success || !Array.isArray(cal.data)) {
    return NextResponse.json({ meetings: [] });
  }

  const now = new Date();
  const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const meetings = cal.data
    .map((row) => {
      const d = row.data ?? {};
      const start = d.start as { dateTime?: string; date?: string } | undefined;
      const end = d.end as { dateTime?: string; date?: string } | undefined;
      const startStr = start?.dateTime ?? start?.date ?? null;
      const endStr = end?.dateTime ?? end?.date ?? null;
      const attendees = (
        d.attendees as Array<{ email?: string; displayName?: string; responseStatus?: string }> ?? []
      ).map((a) => ({
        email: a.email ?? "",
        displayName: a.displayName ?? a.email ?? "",
        responseStatus: a.responseStatus ?? "needsAction",
      }));

      const brief = briefs.get(row.entity_id);

      return {
        id: row.entity_id,
        title: (d.summary as string) ?? "Untitled Event",
        description: (d.description as string) ?? "",
        startTime: startStr,
        endTime: endStr,
        attendees,
        meetLink: (d.hangoutLink as string) ?? null,
        htmlLink: (d.htmlLink as string) ?? null,
        location: (d.location as string) ?? null,
        isAllDay: !start?.dateTime,
        organizer: d.organizer as { email?: string; displayName?: string } | null ?? null,
        hasBrief: !!brief,
        briefSummary: brief?.summary ?? null,
      };
    })
    .filter((m) => {
      if (!m.startTime) return false;
      const start = new Date(m.startTime);
      return start >= now && start <= twoWeeksOut;
    })
    .sort((a, b) => {
      return new Date(a.startTime!).getTime() - new Date(b.startTime!).getTime();
    });

  return NextResponse.json({ meetings });
}