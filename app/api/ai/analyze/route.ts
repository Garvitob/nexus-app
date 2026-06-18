import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { batchAnalyzeForUser, analyzeEmail, analyzeMeeting, analyzeGitHubItem, analyzeJiraIssue } from "@/services/ai/analyzer";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const userId = body.userId as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: "No userId" }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, corsairTenantId: true, clerkId: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const tenantId = user.corsairTenantId ?? user.clerkId;
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant" }, { status: 400 });
  }

  const mode = body.mode as string | undefined;

  try {
    if (mode === "batch") {
      await batchAnalyzeForUser({ userId: user.id, tenantId });
      return NextResponse.json({ ok: true, mode: "batch" });
    }

    const type = body.type as string | undefined;

    if (type === "email") {
      await analyzeEmail({
        userId: user.id,
        tenantId,
        corsairMessageId: body.corsairMessageId as string,
        subject: (body.subject as string) ?? "",
        from: (body.from as string) ?? "",
        to: (body.to as string) ?? "",
        body: (body.body as string) ?? "",
        threadId: (body.threadId as string) ?? null,
        category: (body.category as string) ?? "primary",
      });
      return NextResponse.json({ ok: true, type: "email" });
    }

    if (type === "meeting") {
      await analyzeMeeting({
        userId: user.id,
        tenantId,
        corsairEventId: body.corsairEventId as string,
        summary: (body.summary as string) ?? "",
        description: (body.description as string) ?? "",
        attendees: (body.attendees as []) ?? [],
        organizerEmail: (body.organizerEmail as string) ?? null,
        isOrganizer: (body.isOrganizer as boolean) ?? false,
        start: (body.start as string) ?? null,
      });
      return NextResponse.json({ ok: true, type: "meeting" });
    }

    if (type === "github") {
      await analyzeGitHubItem({
        userId: user.id,
        corsairItemId: body.corsairItemId as string,
        itemType: (body.itemType as "pull_request" | "issue") ?? "pull_request",
        title: (body.title as string) ?? "",
        body: (body.body as string) ?? "",
        state: (body.state as string) ?? "open",
        repo: (body.repo as string) ?? null,
        number: (body.number as number) ?? null,
      });
      return NextResponse.json({ ok: true, type: "github" });
    }

    if (type === "jira") {
      await analyzeJiraIssue({
        userId: user.id,
        corsairIssueId: body.corsairIssueId as string,
        key: (body.key as string) ?? null,
        summary: (body.summary as string) ?? "",
        description: (body.description as string) ?? "",
        status: (body.status as string) ?? "",
        priority: (body.priority as string) ?? "",
        issueType: (body.issueType as string) ?? "",
        assignee: (body.assignee as string) ?? null,
      });
      return NextResponse.json({ ok: true, type: "jira" });
    }

    await batchAnalyzeForUser({ userId: user.id, tenantId });
    return NextResponse.json({ ok: true, mode: "batch-fallback" });
  } catch (err) {
    console.error("[ai/analyze]", err);
    return NextResponse.json({ error: "analysis failed" }, { status: 500 });
  }
}