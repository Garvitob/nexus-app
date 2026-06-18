import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type CorsairEvent = {
  type: string;
  tenantId?: string;
  pluginId?: string;
  data?: Record<string, unknown>;
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

function fireAndForget(path: string, payload: Record<string, unknown>) {
  fetch(`${APP_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => null);
}

export async function POST(req: NextRequest) {
  let event: CorsairEvent;
  try {
    event = (await req.json()) as CorsairEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const tenantId = event.tenantId;
  if (!tenantId) {
    return NextResponse.json({ received: true });
  }

  try {
    const user = await db.user.findUnique({ where: { clerkId: tenantId } });
    if (!user) {
      return NextResponse.json({ received: true });
    }

    switch (event.type) {
      case "account.connected": {
        if (!event.pluginId) break;
        await db.connectedAccount.upsert({
          where: {
            userId_pluginId: { userId: user.id, pluginId: event.pluginId },
          },
          update: {
            status: "connected",
            connectedAt: new Date(),
            errorMessage: null,
          },
          create: {
            userId: user.id,
            pluginId: event.pluginId,
            status: "connected",
            connectedAt: new Date(),
          },
        });
        fireAndForget("/api/sync/initial", {
          userId: user.id,
          pluginId: event.pluginId,
        });
        break;
      }

      case "account.disconnected": {
        if (!event.pluginId) break;
        await db.connectedAccount.updateMany({
          where: { userId: user.id, pluginId: event.pluginId },
          data: { status: "disconnected" },
        });
        break;
      }

      case "account.error": {
        if (!event.pluginId) break;
        await db.connectedAccount.updateMany({
          where: { userId: user.id, pluginId: event.pluginId },
          data: {
            status: "error",
            errorMessage:
              (event.data?.message as string) ?? "Connection error",
          },
        });
        break;
      }

      case "gmail.message.created":
      case "gmail.message.received": {
        const d = event.data ?? {};
        const id = (d.id ?? d.messageId) as string | undefined;
        if (!id) break;
        fireAndForget("/api/ai/analyze", {
          userId: user.id,
          type: "email",
          corsairMessageId: id,
          threadId: d.threadId ?? null,
          subject: d.subject ?? "",
          body: d.body ?? d.snippet ?? "",
          category: d.category ?? "primary",
        });
        break;
      }

      case "googlecalendar.event.created":
      case "googlecalendar.event.updated": {
        const d = event.data ?? {};
        const id = (d.id ?? d.eventId) as string | undefined;
        if (!id) break;
        fireAndForget("/api/ai/analyze", {
          userId: user.id,
          type: "meeting",
          corsairEventId: id,
          summary: d.summary ?? "",
          description: d.description ?? "",
          attendees: d.attendees ?? [],
        });
        break;
      }

      case "github.pull_request.created":
      case "github.pull_request.updated":
      case "github.issue.created":
      case "github.issue.updated": {
        const d = event.data ?? {};
        const id = (d.id ?? d.nodeId) as string | undefined;
        if (!id) break;
        fireAndForget("/api/ai/analyze", {
          userId: user.id,
          type: "github",
          corsairItemId: id,
          itemType: event.type.includes("pull_request")
            ? "pull_request"
            : "issue",
          title: d.title ?? "",
          body: d.body ?? "",
        });
        break;
      }

      case "jira.issue.created":
      case "jira.issue.updated": {
        const d = event.data ?? {};
        const id = (d.id ?? d.key) as string | undefined;
        if (!id) break;
        fireAndForget("/api/ai/analyze", {
          userId: user.id,
          type: "jira",
          corsairIssueId: id,
          summary: d.summary ?? "",
          description: d.description ?? "",
          status: d.status ?? "",
          priority: d.priority ?? "",
        });
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("[webhook]", err);
  }

  return NextResponse.json({ received: true });
}