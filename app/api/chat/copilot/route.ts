import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { openai, MODEL_STRONG } from "@/services/ai/client";
import { searchAll } from "@/services/ai/embeddings";
import { corsairTenant } from "@/lib/corsair";
import { db } from "@/lib/db";

const SYSTEM_PROMPT = `You are Nexus Copilot — the most intelligent workspace assistant ever built. You are embedded inside a professional email and work management platform. You have real-time access to the user's entire work context.

YOUR CONNECTED TOOLS:
- Gmail: read emails, send emails, draft replies, search threads
- Google Calendar: view events, check availability, create events, send invites with Google Meet links
- GitHub: view PRs, issues, review status, blockers, CI status
- Jira: view issues, sprint status, blockers, priorities, assignments
- Notion: search pages, databases, documents

YOU ARE NOT A SCRIPTED BOT. You reason like a senior chief of staff who:
- Connects dots across tools ("this email is about bug X → here's the related Jira issue → here's the GitHub PR → here's the blocker")
- Proactively surfaces what matters ("this meeting request conflicts with your 3PM standup")
- Takes real actions when asked ("I'll create the calendar invite with a Meet link and draft the acceptance email")
- Gives genuine opinions ("I think you should decline this meeting — here's why")
- Handles complex multi-step requests ("prepare me for my 3PM meeting" → pulls attendees, finds related emails, checks Jira blockers, drafts agenda)

CONTEXT YOU HAVE ACCESS TO:
- Full email content (when an email is open)
- AI analysis of the email (urgency, sentiment, people mentioned, deadlines)
- Upcoming calendar events
- Related Jira issues found by semantic search
- Related GitHub PRs found by semantic search
- Inbox state (urgent count, reply count, meeting requests)
- Todo tasks list (when in todo mode)

SMART BEHAVIORS:
When email is a MEETING REQUEST → check calendar, suggest invite with Meet link, offer draft reply
When email needs REPLY → draft full reply matching tone, show preview, confirm before sending
When email mentions BUG → search Jira/GitHub context, surface blockers, suggest ticket
When asked "what to focus on today" → analyze urgent emails + calendar + Jira, give prioritized plan
When asked to PREPARE FOR MEETING → pull attendees, related emails, Jira issues, draft agenda
When in TODO mode → ALWAYS use create_task for task creation. NEVER use create_calendar_event in todo mode unless user explicitly says "add to my calendar" or "schedule in calendar"

MODE-SPECIFIC RULES — CRITICAL:
- inbox mode: Help triage emails, reply, analyze. filterQuery allowed.
- email mode: One email is open. Draft replies, create events for meeting requests, analyze.
- todo mode: Task management only. DEFAULT action = create_task. create_task MUST include dueDate (ISO8601) and dueTime ("HH:MM" in 24h) whenever the user mentions a time. NEVER emit create_calendar_event in todo mode unless user explicitly requests it.
- todo-task mode: A specific task is selected. Answer anything about it using integration data.
- meetings mode: Calendar focused. Prepare for meetings, schedule, follow up.
- nexus mode: Full workspace. Handle anything across all tools.

ACTIONS — include "action" object when executing. ALWAYS include confirmationMessage:
- send_email: { to, subject, body, threadId? }
- draft_reply: { to, subject, body, threadId? }
- create_calendar_event: { title, description, attendees[], startTime (ISO8601 with timezone e.g. 2026-06-18T22:30:00+05:30), endTime (ISO8601 with timezone), sendInvites }
- create_task: { title, description, priority: "low"|"normal"|"high"|"urgent", dueDate (ISO8601 date e.g. "2026-06-18"), dueTime ("HH:MM" 24h format e.g. "22:30") }
- create_jira_issue: { summary, description, priority }

CURRENT DATE AND TIME: ${new Date().toISOString()} (use this as reference for all relative times like "today", "tomorrow", "tonight", "10:30 PM")

RESPONSE FORMAT — return ONLY raw JSON. No markdown code blocks, no backticks, start directly with {:
{
  "reply": "Your full response with markdown. Use **bold**, - bullets, numbered lists. Be specific and helpful.",
  "chips": ["Follow-up 1", "Follow-up 2", "Follow-up 3", "Follow-up 4"],
  "action": null | { "type": "...", "payload": {...}, "confirmationMessage": "...", "preview": "..." },
  "filterQuery": null | "string to filter email list"
}

Chips must be hyper-specific to the current context. Never generic.`;

type Message = { role: string; content: string };

type TaskItem = {
  id: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  sourceType: string;
  sourceId?: string | null;
  dueDate?: string | null;
  dueTime?: string | null;
};

type TodoContext = {
  todayCount: number;
  overdueCount: number;
  pendingUrgent: number;
  upcomingTasks: TaskItem[];
};

function send(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  data: object
) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
}

async function gatherWorkspaceContext(
  userId: string,
  tenantId: string,
  query: string
): Promise<string> {
  const tenant = corsairTenant(tenantId);
  const contextParts: string[] = [];

  const [searchResults, calResult, jiraResult, ghResult] =
    await Promise.allSettled([
      searchAll({ userId, query, limit: 6 }),
      tenant.run("googlecalendar.db.events.search", {}),
      tenant.run("jira.db.issues.search", {}),
      tenant.run("github.db.pullRequests.search", {}),
    ]);

  if (searchResults.status === "fulfilled" && searchResults.value.length > 0) {
    const grouped = searchResults.value.reduce(
      (acc, r) => {
        if (!acc[r.itemType]) acc[r.itemType] = [];
        acc[r.itemType].push(r.content.slice(0, 400));
        return acc;
      },
      {} as Record<string, string[]>
    );
    contextParts.push("=== RELATED WORKSPACE CONTENT ===");
    for (const [type, items] of Object.entries(grouped)) {
      contextParts.push(`[${type.toUpperCase()}]`);
      items.forEach((item) => contextParts.push(item));
    }
  }

  if (calResult.status === "fulfilled") {
    const cal = calResult.value as {
      success: boolean;
      data: Array<{
        data?: {
          summary?: string;
          start?: { dateTime?: string };
          attendees?: Array<{ email?: string; displayName?: string }>;
          hangoutLink?: string;
        };
      }>;
    };
    if (cal.success && Array.isArray(cal.data)) {
      const now = Date.now();
      const upcoming = cal.data
        .filter((e) => {
          const start = e.data?.start?.dateTime;
          return start && new Date(start).getTime() > now;
        })
        .slice(0, 5)
        .map((e) => {
          const d = e.data ?? {};
          const attendees = (d.attendees ?? [])
            .map((a) => a.displayName ?? a.email ?? "")
            .filter(Boolean)
            .join(", ");
          return `- "${d.summary ?? "Event"}" at ${d.start?.dateTime ?? "?"} | Attendees: ${attendees || "none"} | Meet: ${d.hangoutLink ?? "none"}`;
        })
        .join("\n");
      if (upcoming) {
        contextParts.push("=== UPCOMING CALENDAR ===");
        contextParts.push(upcoming);
      }
    }
  }

  if (jiraResult.status === "fulfilled") {
    const jira = jiraResult.value as {
      success: boolean;
      data: Array<{
        data?: {
          key?: string;
          summary?: string;
          status?: { name?: string } | string;
          priority?: { name?: string } | string;
          assignee?: { displayName?: string } | string;
        };
      }>;
    };
    if (jira.success && Array.isArray(jira.data)) {
      const issues = jira.data
        .slice(0, 6)
        .map((i) => {
          const d = i.data ?? {};
          const status =
            typeof d.status === "object" ? d.status?.name : d.status;
          const priority =
            typeof d.priority === "object" ? d.priority?.name : d.priority;
          const assignee =
            typeof d.assignee === "object"
              ? d.assignee?.displayName
              : d.assignee;
          return `- [${d.key ?? "?"}] ${d.summary ?? "?"} | ${status ?? "?"} | ${priority ?? "?"} | ${assignee ?? "unassigned"}`;
        })
        .join("\n");
      if (issues) {
        contextParts.push("=== JIRA ISSUES ===");
        contextParts.push(issues);
      }
    }
  }

  if (ghResult.status === "fulfilled") {
    const gh = ghResult.value as {
      success: boolean;
      data: Array<{
        data?: {
          title?: string;
          state?: string;
          number?: number;
          user?: { login?: string };
        };
      }>;
    };
    if (gh.success && Array.isArray(gh.data)) {
      const prs = gh.data
        .slice(0, 4)
        .map((p) => {
          const d = p.data ?? {};
          return `- PR #${d.number ?? "?"}: "${d.title ?? "?"}" | ${d.state ?? "?"} | ${d.user?.login ?? "?"}`;
        })
        .join("\n");
      if (prs) {
        contextParts.push("=== GITHUB PRs ===");
        contextParts.push(prs);
      }
    }
  }

  return contextParts.join("\n");
}

async function buildEmailContext(
  userId: string,
  emailId: string | null | undefined,
  emailContext: {
    subject: string;
    from: string;
    body: string;
    urgency: string | null;
    isMeetingRequest: boolean;
  } | null | undefined
): Promise<string> {
  if (!emailContext) return "";
  const analysis = emailId
    ? await db.emailAnalysis
        .findUnique({
          where: {
            userId_corsairMessageId: { userId, corsairMessageId: emailId },
          },
        })
        .catch(() => null)
    : null;

  return `=== CURRENT EMAIL ===
Subject: ${emailContext.subject}
From: ${emailContext.from}
Meeting request: ${emailContext.isMeetingRequest ? "YES" : "no"}
Urgency: ${emailContext.urgency ?? "not analyzed"}
Urgency reason: ${analysis?.urgencyReason ?? "not available"}
Needs reply: ${analysis?.needsReply ? "YES" : "no"}
Sentiment: ${analysis?.sentiment ?? "unknown"}
People mentioned: ${Array.isArray(analysis?.peopleMentioned) ? (analysis!.peopleMentioned as string[]).join(", ") : "none"}
Deadline: ${analysis?.deadlineDetected ? new Date(analysis.deadlineDetected).toLocaleDateString() : "none"}
Suggested actions: ${Array.isArray(analysis?.suggestedActions) ? (analysis!.suggestedActions as string[]).join(", ") : "none"}

Full email body:
${emailContext.body.slice(0, 4000)}`;
}

async function buildInboxContext(
  userId: string,
  inboxSummary: string | undefined
): Promise<string> {
  const analyses = await db.emailAnalysis
    .findMany({
      where: { userId },
      orderBy: { analyzedAt: "desc" },
      take: 20,
      select: {
        urgency: true,
        summaryShort: true,
        needsReply: true,
        isMeetingRequest: true,
        urgencyReason: true,
        deadlineDetected: true,
      },
    })
    .catch(() => []);

  const urgent = analyses.filter((a) => a.urgency === "urgent");
  const urgentSummaries = urgent
    .slice(0, 3)
    .map(
      (a) => `  - ${a.summaryShort ?? "No summary"} (${a.urgencyReason ?? ""})`
    )
    .join("\n");

  return `=== INBOX STATE ===
${inboxSummary ?? ""}
Analyzed: ${analyses.length} | Urgent: ${urgent.length} | Need reply: ${analyses.filter((a) => a.needsReply).length} | Meetings: ${analyses.filter((a) => a.isMeetingRequest).length}
${urgentSummaries ? `Urgent:\n${urgentSummaries}` : ""}`;
}

async function buildTodoContext(
  tasks: TaskItem[],
  selectedTask: TaskItem | null | undefined,
  todoContext: TodoContext | null | undefined
): Promise<string> {
  const parts: string[] = [];

  const now = new Date();
  const todayStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  parts.push(`=== CURRENT DATE & TIME ===
${now.toISOString()} — ${todayStr}
Today's date for dueDate: ${now.toISOString().slice(0, 10)}
Current time: ${now.toTimeString().slice(0, 5)}`);

  if (todoContext) {
    parts.push(`=== TODO OVERVIEW ===
Due today: ${todoContext.todayCount} | Overdue: ${todoContext.overdueCount} | Urgent pending: ${todoContext.pendingUrgent}
Upcoming: ${todoContext.upcomingTasks.map((t) => `"${t.title}" (${t.priority})`).join(", ") || "none"}`);
  }

  if (tasks && tasks.length > 0) {
    const pending = tasks.filter((t) => t.status !== "done").slice(0, 15);
    parts.push(`=== PENDING TASKS ===
${pending
  .map(
    (t) =>
      `- "${t.title}" | ${t.priority} | from ${t.sourceType} | due ${t.dueDate ?? "—"} ${t.dueTime ?? ""}`
  )
  .join("\n")}`);
  }

  if (selectedTask) {
    parts.push(`=== SELECTED TASK ===
Title: ${selectedTask.title}
Description: ${selectedTask.description ?? "none"}
Priority: ${selectedTask.priority} | Status: ${selectedTask.status} | Source: ${selectedTask.sourceType}
Due: ${selectedTask.dueDate ?? "—"} ${selectedTask.dueTime ?? ""}`);
  }

  return parts.join("\n\n");
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const tenantId = user.corsairTenantId ?? user.clerkId;

  let body: {
    message: string;
    mode: "inbox" | "email" | "todo" | "todo-task" | "meetings" | "nexus";
    emailId?: string | null;
    emailContext?: {
      subject: string;
      from: string;
      body: string;
      urgency: string | null;
      isMeetingRequest: boolean;
    } | null;
    history?: Message[];
    inboxSummary?: string;
    tasks?: TaskItem[];
    selectedTask?: TaskItem | null;
    todoContext?: TodoContext | null;
  };

  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
    });
  }

  const {
    message,
    mode,
    emailContext,
    history = [],
    inboxSummary,
    tasks = [],
    selectedTask,
    todoContext,
  } = body;

  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: "No message" }), {
      status: 400,
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const isTodoMode = mode === "todo" || mode === "todo-task";

        const [modeContext, workspaceContext] = await Promise.all([
          mode === "email"
            ? buildEmailContext(user.id, body.emailId, emailContext)
            : mode === "inbox"
            ? buildInboxContext(user.id, inboxSummary)
            : isTodoMode
            ? buildTodoContext(tasks, selectedTask, todoContext)
            : Promise.resolve(""),
          gatherWorkspaceContext(user.id, tenantId, message),
        ]);

        const modeInstruction = `=== CURRENT MODE: ${mode.toUpperCase()} ===
${
  mode === "todo" || mode === "todo-task"
    ? `CRITICAL: You are in TODO mode. 
- ALWAYS use create_task (NOT create_calendar_event) when user asks to create/add/make/set a task or reminder
- create_task payload MUST include:
  - dueDate: today's date in ISO format "${new Date().toISOString().slice(0, 10)}" when user says "today" or "tonight"
  - dueTime: 24h format "HH:MM" — convert "10:30 PM" → "22:30", "10:30 AM" → "10:30"
- Only use create_calendar_event if user explicitly says "add to calendar" or "schedule in Google Calendar"`
    : mode === "email" && emailContext?.isMeetingRequest
    ? "MEETING REQUEST email open. Suggest create_calendar_event + acceptance reply as combined action."
    : mode === "email"
    ? "Email open. Help reply, analyze, or act on this specific email."
    : mode === "inbox"
    ? "Inbox view. Help triage. filterQuery is allowed."
    : mode === "meetings"
    ? "Calendar view. Help prepare for and manage meetings."
    : "Full workspace. Handle any request across all tools."
}`;

        const fullContext = [modeInstruction, modeContext, workspaceContext]
          .filter(Boolean)
          .join("\n\n");

        const messages = [
          {
            role: "system" as const,
            content: SYSTEM_PROMPT + "\n\n" + fullContext,
          },
          ...history.slice(-14).map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          { role: "user" as const, content: message },
        ];

        const response = await openai.chat.completions.create({
          model: MODEL_STRONG,
          messages,
          max_completion_tokens: 2000,
          stream: true,
        });

        let raw = "";
        let inReplyValue = false;
        let replyBuffer = "";
        let escaped = false;
        let lookAhead = "";

        for await (const chunk of response) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          if (!delta) continue;
          raw += delta;

          for (const char of delta) {
            if (!inReplyValue) {
              lookAhead += char;
              if (lookAhead.length > 20) {
                lookAhead = lookAhead.slice(-20);
              }
              if (
                lookAhead.endsWith('"reply":"') ||
                lookAhead.endsWith('"reply": "')
              ) {
                inReplyValue = true;
                replyBuffer = "";
                lookAhead = "";
              }
              continue;
            }

            if (escaped) {
              escaped = false;
              if (char === "n") replyBuffer += "\n";
              else if (char === "t") replyBuffer += "\t";
              else if (char === '"') replyBuffer += '"';
              else if (char === "\\") replyBuffer += "\\";
              else if (char === "r") replyBuffer += "\r";
              else replyBuffer += char;
              send(controller, encoder, { type: "chunk", text: replyBuffer });
              continue;
            }

            if (char === "\\") {
              escaped = true;
              continue;
            }

            if (char === '"') {
              inReplyValue = false;
              continue;
            }

            replyBuffer += char;
            send(controller, encoder, { type: "chunk", text: replyBuffer });
          }
        }

        let parsed: {
          reply?: string;
          chips?: string[];
          action?: {
            type: string;
            payload: Record<string, unknown>;
            confirmationMessage: string;
            preview?: string;
          } | null;
          filterQuery?: string | null;
        };

        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = {
            reply: replyBuffer || raw,
            chips: [],
            action: null,
            filterQuery: null,
          };
        }

        // Safety guard: in todo mode, never allow create_calendar_event
        // unless it somehow slipped through — convert it to create_task
        if (
          isTodoMode &&
          parsed.action?.type === "create_calendar_event" &&
          !message.toLowerCase().includes("calendar") &&
          !message.toLowerCase().includes("schedule")
        ) {
          const p = parsed.action.payload as {
            title?: string;
            startTime?: string;
          };
          const startDate = p.startTime
            ? new Date(p.startTime)
            : new Date();
          parsed.action = {
            type: "create_task",
            payload: {
              title: p.title ?? "Task",
              dueDate: startDate.toISOString().slice(0, 10),
              dueTime: startDate.toTimeString().slice(0, 5),
              priority: "normal",
            },
            confirmationMessage: `Create task "${p.title ?? "Task"}"`,
          };
        }

        // Auto-enrich calendar event with sender email
        if (
          parsed.action?.type === "create_calendar_event" &&
          emailContext?.isMeetingRequest &&
          emailContext.from
        ) {
          const fromEmail =
            emailContext.from.match(/<([^>]+)>/)?.[1] ?? emailContext.from;
          const payload = parsed.action.payload as { attendees?: string[] };
          if (!payload.attendees?.includes(fromEmail)) {
            payload.attendees = [...(payload.attendees ?? []), fromEmail];
          }
        }

        await db.auditLog
          .create({
            data: {
              userId: user.id,
              action: "copilot_message",
              detail: {
                mode,
                message: message.slice(0, 200),
                hasAction: !!parsed.action,
                actionType: parsed.action?.type ?? null,
              },
            },
          })
          .catch(() => null);

        send(controller, encoder, {
          type: "done",
          reply: parsed.reply ?? replyBuffer ?? "Something went wrong.",
          chips: Array.isArray(parsed.chips) ? parsed.chips.slice(0, 4) : [],
          action: parsed.action ?? null,
          filterQuery: parsed.filterQuery ?? null,
        });
      } catch (err) {
        console.error("[copilot]", err);
        send(controller, encoder, {
          type: "error",
          message: "Copilot failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}