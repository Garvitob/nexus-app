import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { corsairTenant } from "@/lib/corsair";
import { db } from "@/lib/db";
import { openai, MODEL_STRONG } from "@/services/ai/client";
import { searchAll } from "@/services/ai/embeddings";

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const tenantId = user.corsairTenantId ?? user.clerkId;
  const tenant = corsairTenant(tenantId);

  let body: {
    meetingId: string;
    title: string;
    description?: string;
    startTime: string;
    attendees: Array<{ email: string; displayName: string }>;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { meetingId, title, description, startTime, attendees } = body;

  if (!meetingId || !title) {
    return NextResponse.json({ error: "meetingId and title required" }, { status: 400 });
  }

  // Check if we have a recent brief (< 1 hour old)
  const existing = await db.meetingBrief
    .findUnique({
      where: { userId_corsairEventId: { userId: user.id, corsairEventId: meetingId } },
    })
    .catch(() => null);

  if (existing?.generatedAt) {
    const age = Date.now() - new Date(existing.generatedAt).getTime();
    if (age < 60 * 60 * 1000 && existing.summary) {
      return NextResponse.json({ brief: existing });
    }
  }

  // Gather context in parallel via Corsair
  const attendeeEmails = attendees.map((a) => a.email).join(", ");

  const [emailSearch, jiraSearch, ghSearch] = await Promise.allSettled([
    searchAll({ userId: user.id, query: title, limit: 5 }),
    tenant.run("jira.db.issues.search", {}),
    tenant.run("github.db.pullRequests.search", {}),
  ]);

  const contextParts: string[] = [];

  contextParts.push(`Meeting: ${title}
Time: ${new Date(startTime).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
Attendees: ${attendeeEmails || "none"}
Description: ${description || "none"}`);

  if (emailSearch.status === "fulfilled" && emailSearch.value.length > 0) {
    contextParts.push("=== RELATED EMAILS & CONTENT ===");
    emailSearch.value.slice(0, 4).forEach((r) => {
      contextParts.push(r.content.slice(0, 500));
    });
  }

  if (jiraSearch.status === "fulfilled") {
    const jira = jiraSearch.value as { success: boolean; data?: Array<{ data?: Record<string, unknown> }> };
    if (jira.success && Array.isArray(jira.data) && jira.data.length > 0) {
      contextParts.push("=== JIRA ISSUES ===");
      jira.data.slice(0, 5).forEach((i) => {
        const d = i.data ?? {};
        const status = typeof d.status === "object" ? (d.status as { name?: string })?.name : d.status;
        contextParts.push(`- [${d.key ?? "?"}] ${d.summary ?? "?"} | ${status ?? "?"}`);
      });
    }
  }

  if (ghSearch.status === "fulfilled") {
    const gh = ghSearch.value as { success: boolean; data?: Array<{ data?: Record<string, unknown> }> };
    if (gh.success && Array.isArray(gh.data) && gh.data.length > 0) {
      contextParts.push("=== GITHUB PRs ===");
      gh.data.slice(0, 4).forEach((p) => {
        const d = p.data ?? {};
        contextParts.push(`- PR #${d.number ?? "?"}: "${d.title ?? "?"}" | ${d.state ?? "?"}`);
      });
    }
  }

  const prompt = `You are preparing a meeting brief for a busy professional. Based on the context below, generate a comprehensive but concise meeting brief.

${contextParts.join("\n")}

Generate a JSON response with exactly this structure:
{
  "summary": "2-3 sentence overview of what this meeting is about and why it matters",
  "agenda": ["agenda item 1", "agenda item 2", "agenda item 3"],
  "keyPoints": ["important context point 1", "important context point 2"],
  "openItems": ["open question or blocker 1", "open question or blocker 2"],
  "preparationNotes": ["thing to prepare 1", "thing to prepare 2"],
  "suggestedFollowUps": ["follow-up action 1", "follow-up action 2"]
}

Return ONLY the JSON. No backticks, no markdown.`;

  let briefData: {
    summary?: string;
    agenda?: string[];
    keyPoints?: string[];
    openItems?: string[];
    preparationNotes?: string[];
    suggestedFollowUps?: string[];
  } = {};

  try {
    const response = await openai.chat.completions.create({
      model: MODEL_STRONG,
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 1000,
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    briefData = JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    briefData = {
      summary: `Meeting: ${title} with ${attendeeEmails || "attendees"}`,
      agenda: ["Review current status", "Discuss blockers", "Align on next steps"],
      keyPoints: [],
      openItems: [],
      preparationNotes: ["Review related emails", "Check Jira issues"],
      suggestedFollowUps: ["Send meeting notes", "Update Jira tickets"],
    };
  }

  // Upsert brief in DB
  const brief = await db.meetingBrief
    .upsert({
      where: {
        userId_corsairEventId: { userId: user.id, corsairEventId: meetingId },
      },
      update: {
        summary: briefData.summary ?? null,
        agenda: briefData.agenda ?? [],
        preparationNotes: briefData.preparationNotes ?? [],
        relatedJiraIssues: briefData.openItems ?? [],
        followUpDraft: briefData.suggestedFollowUps?.join("\n") ?? null,
        generatedAt: new Date(),
      },
      create: {
        userId: user.id,
        corsairEventId: meetingId,
        summary: briefData.summary ?? null,
        agenda: briefData.agenda ?? [],
        preparationNotes: briefData.preparationNotes ?? [],
        relatedJiraIssues: briefData.openItems ?? [],
        followUpDraft: briefData.suggestedFollowUps?.join("\n") ?? null,
      },
    })
    .catch(() => null);

  return NextResponse.json({
    brief: {
      ...brief,
      keyPoints: briefData.keyPoints ?? [],
      openItems: briefData.openItems ?? [],
      suggestedFollowUps: briefData.suggestedFollowUps ?? [],
    },
  });
}