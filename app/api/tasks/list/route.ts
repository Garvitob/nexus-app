import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { corsairTenant } from "@/lib/corsair";

export async function GET(req: NextRequest) {
  const user = await requireUser();
  const { searchParams } = new URL(req.url);

  const status = searchParams.get("status") ?? undefined;
  const priority = searchParams.get("priority") ?? undefined;
  const source = searchParams.get("source") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const tenantId = user.corsairTenantId ?? user.clerkId;
  const tenant = corsairTenant(tenantId);

  // Fetch DB tasks
  const dbTasks = await db.task.findMany({
    where: {
      userId: user.id,
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(source ? { sourceType: source } : {}),
      ...(from || to
        ? {
            dueDate: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    orderBy: { dueDate: "asc" },
  });

  // Auto-fetch from integrations in parallel (all through Corsair)
  const [calendarRes, gmailAnalyses, jiraAnalyses, githubAnalyses, notionAnalyses] =
    await Promise.allSettled([
      tenant.run("googlecalendar.db.events.search", {}),
      db.emailAnalysis.findMany({
        where: {
          userId: user.id,
          OR: [{ needsReply: true }, { suggestedActions: { not: null } }],
        },
        take: 50,
      }),
      db.jiraAnalysis.findMany({ where: { userId: user.id }, take: 50 }),
      db.gitHubAnalysis.findMany({
        where: { userId: user.id, reviewNeeded: true },
        take: 50,
      }),
      db.notionAnalysis.findMany({ where: { userId: user.id }, take: 50 }),
    ]);

  const autoTasks: AutoTask[] = [];

  // Calendar events → locked time blocks
  if (calendarRes.status === "fulfilled") {
    const events = (calendarRes.value as { success: boolean; data?: { entity_id: string; data: Record<string, unknown> }[] }).data ?? [];
    for (const row of events) {
      const e = row.data as {
        summary?: string;
        description?: string;
        start?: { dateTime?: string; date?: string };
        end?: { dateTime?: string; date?: string };
        attendees?: { email: string }[];
        htmlLink?: string;
      };
      autoTasks.push({
        id: `cal_${row.entity_id}`,
        title: e.summary ?? "Untitled Event",
        description: e.description ?? "",
        sourceType: "calendar",
        sourceId: row.entity_id,
        sourceLink: e.htmlLink ?? null,
        priority: "normal",
        status: "pending",
        dueDate: e.start?.dateTime ?? e.start?.date ?? null,
        endDate: e.end?.dateTime ?? e.end?.date ?? null,
        isLocked: true,
        attendees: (e.attendees ?? []).map((a) => a.email),
      });
    }
  }

  // Gmail analyses → actionable tasks
  if (gmailAnalyses.status === "fulfilled") {
    for (const a of gmailAnalyses.value) {
      // Skip if already a DB task with this sourceId
      const exists = dbTasks.some((t) => t.sourceId === a.corsairMessageId);
      if (exists) continue;
      autoTasks.push({
        id: `gmail_${a.corsairMessageId}`,
        title: a.summaryShort ?? "Email needs attention",
        description: a.summaryLong ?? "",
        sourceType: "email",
        sourceId: a.corsairMessageId,
        sourceLink: null,
        priority: (a.urgency as "low" | "normal" | "high" | "urgent") ?? "normal",
        status: "pending",
        dueDate: a.deadlineDetected ? a.deadlineDetected.toISOString() : null,
        endDate: null,
        isLocked: false,
        attendees: [],
      });
    }
  }

  // Jira analyses → tasks
  if (jiraAnalyses.status === "fulfilled") {
    for (const a of jiraAnalyses.value) {
      const exists = dbTasks.some((t) => t.sourceId === a.corsairIssueId);
      if (exists) continue;
      autoTasks.push({
        id: `jira_${a.corsairIssueId}`,
        title: a.summary ?? "Jira issue",
        description: a.suggestedNextAction ?? "",
        sourceType: "jira",
        sourceId: a.corsairIssueId,
        sourceLink: null,
        priority: (a.urgency as "low" | "normal" | "high" | "urgent") ?? "normal",
        status: "pending",
        dueDate: null,
        endDate: null,
        isLocked: false,
        attendees: [],
      });
    }
  }

  // GitHub analyses → tasks
  if (githubAnalyses.status === "fulfilled") {
    for (const a of githubAnalyses.value) {
      const exists = dbTasks.some((t) => t.sourceId === a.corsairItemId);
      if (exists) continue;
      autoTasks.push({
        id: `github_${a.corsairItemId}`,
        title: a.summary ?? "GitHub PR needs review",
        description: "",
        sourceType: "github",
        sourceId: a.corsairItemId,
        sourceLink: null,
        priority: a.risk === "high" ? "high" : "normal",
        status: "pending",
        dueDate: null,
        endDate: null,
        isLocked: false,
        attendees: [],
      });
    }
  }

  // Notion analyses → tasks
  if (notionAnalyses.status === "fulfilled") {
    for (const a of notionAnalyses.value) {
      const exists = dbTasks.some((t) => t.sourceId === a.corsairPageId);
      if (exists) continue;
      const actionItems = (a.actionItems as string[] | null) ?? [];
      if (!actionItems.length) continue;
      autoTasks.push({
        id: `notion_${a.corsairPageId}`,
        title: actionItems[0] ?? "Notion action item",
        description: actionItems.slice(1).join("\n"),
        sourceType: "notion",
        sourceId: a.corsairPageId,
        sourceLink: null,
        priority: "normal",
        status: "pending",
        dueDate: null,
        endDate: null,
        isLocked: false,
        attendees: [],
      });
    }
  }

  // Normalize DB tasks to same shape
  const normalizedDb = dbTasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description ?? "",
    sourceType: t.sourceType,
    sourceId: t.sourceId ?? null,
    sourceLink: null,
    priority: t.priority,
    status: t.status,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    dueTime: t.dueTime ?? null,
    endDate: null,
    isLocked: false,
    attendees: [],
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
    isDbTask: true,
  }));

  const normalizedAuto = autoTasks.map((t) => ({
    ...t,
    dueTime: null,
    completedAt: null,
    createdAt: new Date().toISOString(),
    isDbTask: false,
  }));

  return NextResponse.json({
    tasks: [...normalizedDb, ...normalizedAuto],
  });
}

type AutoTask = {
  id: string;
  title: string;
  description: string;
  sourceType: string;
  sourceId: string | null;
  sourceLink: string | null;
  priority: string;
  status: string;
  dueDate: string | null;
  endDate: string | null;
  isLocked: boolean;
  attendees: string[];
};