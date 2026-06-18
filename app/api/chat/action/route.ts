import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { corsairTenant } from "@/lib/corsair";
import { db } from "@/lib/db";

// Extract clean email address from "Name <email@domain.com>" or plain "email@domain.com"
function extractEmail(raw: string): string {
  if (!raw) return raw;
  const match = raw.match(/<([^>]+)>/);
  if (match) return match[1].trim();
  return raw.trim();
}

// Ensure ISO8601 with timezone for Corsair calendar API
function ensureTimezone(dateStr: string): string {
  if (!dateStr) return dateStr;
  if (dateStr.includes("+") || dateStr.endsWith("Z")) return dateStr;
  if (dateStr.match(/T\d{2}:\d{2}:\d{2}$/)) return `${dateStr}+05:30`;
  if (dateStr.match(/T\d{2}:\d{2}$/)) return `${dateStr}:00+05:30`;
  return dateStr;
}

// Strip HTML tags for plain text email body
function cleanEmailBody(body: string): string {
  return body.replace(/<[^>]*>/g, "").trim();
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const tenantId = user.corsairTenantId ?? user.clerkId;
  const tenant = corsairTenant(tenantId);

  let body: {
    action: {
      type: string;
      payload: Record<string, unknown>;
    };
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action } = body;

  try {
    switch (action.type) {
      case "send_email":
      case "draft_reply": {
        const p = action.payload as {
          to: string;
          subject: string;
          body: string;
          threadId?: string;
        };

        if (!p.to || !p.subject || !p.body) {
          return NextResponse.json(
            { error: "Missing required fields: to, subject, body" },
            { status: 400 }
          );
        }

        // Clean the to field — Corsair needs plain email, not "Name <email>"
        const toEmail = extractEmail(p.to);

        // Strip any HTML tags from body — Corsair expects plain text
        const cleanBody = cleanEmailBody(p.body);

        const result = (await tenant.run("gmail.api.messages.send", {
          to: toEmail,
          subject: p.subject,
          body: cleanBody,
          threadId: p.threadId ?? undefined,
        })) as { success: boolean };

        if (!result.success) {
          return NextResponse.json(
            { error: "Failed to send email" },
            { status: 500 }
          );
        }

        await db.auditLog.create({
          data: {
            userId: user.id,
            action: "email_sent",
            detail: {
              to: toEmail,
              subject: p.subject,
              threadId: p.threadId,
            },
          },
        });

        return NextResponse.json({
          ok: true,
          message: `✅ Email sent to ${toEmail}`,
        });
      }

      case "create_calendar_event": {
        const p = action.payload as {
          title: string;
          description?: string;
          attendees?: string[];
          startTime: string;
          endTime: string;
          sendInvites?: boolean;
        };

        if (!p.title || !p.startTime || !p.endTime) {
          return NextResponse.json(
            { error: "Missing required fields: title, startTime, endTime" },
            { status: 400 }
          );
        }

        // Normalize times to proper ISO8601 with timezone
        const startTime = ensureTimezone(p.startTime);
        const endTime = ensureTimezone(p.endTime);

        // Clean attendee emails
        const attendees = (p.attendees ?? [])
          .map(extractEmail)
          .filter(Boolean)
          .map((email) => ({ email }));

        const result = (await tenant.run(
          "googlecalendar.api.events.create",
          {
            summary: p.title,
            description: p.description ?? "",
            attendees,
            start: { dateTime: startTime },
            end: { dateTime: endTime },
            conferenceData: {
              createRequest: {
                requestId: crypto.randomUUID(),
                conferenceSolutionKey: { type: "hangoutsMeet" },
              },
            },
            guestsCanModify: false,
            sendUpdates: p.sendInvites !== false ? "all" : "none",
          }
        )) as {
          success: boolean;
          data?: { htmlLink?: string; hangoutLink?: string; id?: string };
        };

        if (!result.success) {
          return NextResponse.json(
            { error: "Failed to create calendar event" },
            { status: 500 }
          );
        }

        const meetLink =
          result.data?.hangoutLink ?? result.data?.htmlLink ?? "";
        const eventId = result.data?.id;

        if (eventId) {
          await db.meetingBrief
            .upsert({
              where: {
                userId_corsairEventId: {
                  userId: user.id,
                  corsairEventId: eventId,
                },
              },
              update: {},
              create: { userId: user.id, corsairEventId: eventId },
            })
            .catch(() => null);
        }

        await db.auditLog.create({
          data: {
            userId: user.id,
            action: "event_created",
            detail: {
              title: p.title,
              startTime,
              endTime,
              attendees: p.attendees,
              meetLink,
            },
          },
        });

        return NextResponse.json({
          ok: true,
          message: `✅ Calendar event "${p.title}" created${
            meetLink ? `\n📎 Meet link: ${meetLink}` : ""
          }`,
          meetLink,
        });
      }

      case "create_task": {
        const p = action.payload as {
          title: string;
          description?: string;
          priority?: string;
          dueDate?: string;
          dueTime?: string;
        };

        if (!p.title?.trim()) {
          return NextResponse.json(
            { error: "Task title is required" },
            { status: 400 }
          );
        }

        const task = await db.task.create({
          data: {
            userId: user.id,
            title: p.title.trim(),
            description: p.description ?? "",
            priority:
              (p.priority as "low" | "normal" | "high" | "urgent") ?? "normal",
            sourceType: "ai",
            dueDate: p.dueDate ? new Date(p.dueDate) : undefined,
            dueTime: p.dueTime ?? undefined,
          },
        });

        await db.auditLog.create({
          data: {
            userId: user.id,
            action: "task_created",
            detail: {
              taskId: task.id,
              title: p.title,
              priority: p.priority,
              dueDate: p.dueDate,
              dueTime: p.dueTime,
            },
          },
        });

        const dateLabel = p.dueDate
          ? ` for ${new Date(p.dueDate).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}${p.dueTime ? ` at ${p.dueTime}` : ""}`
          : "";

        return NextResponse.json({
          ok: true,
          message: `✅ Task "${p.title}" created${dateLabel}`,
          taskId: task.id,
        });
      }

      case "create_jira_issue": {
        const p = action.payload as {
          summary: string;
          description?: string;
          priority?: string;
        };

        if (!p.summary?.trim()) {
          return NextResponse.json(
            { error: "Jira issue summary is required" },
            { status: 400 }
          );
        }

        const result = (await tenant.run("jira.api.issues.create", {
          fields: {
            summary: p.summary,
            description: p.description ?? "",
            issuetype: { name: "Task" },
            priority: { name: p.priority ?? "Medium" },
          },
        })) as { success: boolean; data?: { key?: string; id?: string } };

        if (!result.success) {
          return NextResponse.json(
            { error: "Failed to create Jira issue" },
            { status: 500 }
          );
        }

        await db.auditLog.create({
          data: {
            userId: user.id,
            action: "jira_issue_created",
            detail: {
              key: result.data?.key,
              summary: p.summary,
            },
          },
        });

        return NextResponse.json({
          ok: true,
          message: `✅ Jira issue ${result.data?.key ?? ""} created: "${p.summary}"`,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action type: ${action.type}` },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error("[chat/action]", err);
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}