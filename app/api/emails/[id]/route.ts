import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { corsairTenant } from "@/lib/corsair";
import { db } from "@/lib/db";

type GmailPayloadPart = {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPayloadPart[];
};

type GmailMessage = {
  id?: string;
  threadId?: string;
  snippet?: string;
  labelIds?: string[];
  internalDate?: string | number | Date | null;
  payload?: {
    headers?: Array<{ name?: string; value?: string }>;
    body?: { data?: string };
    parts?: GmailPayloadPart[];
  };
};

function getHeader(
  headers: Array<{ name?: string; value?: string }> | undefined,
  name: string
): string {
  return (
    headers?.find(
      (h) => (h.name ?? "").toLowerCase() === name.toLowerCase()
    )?.value ?? ""
  );
}

function decodeBase64(data: string): string {
  try {
    return Buffer.from(
      data.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf-8");
  } catch {
    return "";
  }
}

function extractBody(msg: GmailMessage): string {
  const payload = msg.payload;
  if (!payload) return msg.snippet ?? "";
  if (payload.body?.data) return decodeBase64(payload.body.data);

  function findPart(parts: GmailPayloadPart[], mime: string): string | null {
    for (const part of parts) {
      if (part.mimeType === mime && part.body?.data)
        return decodeBase64(part.body.data);
      if (part.parts) {
        const found = findPart(part.parts, mime);
        if (found) return found;
      }
    }
    return null;
  }

  const parts = payload.parts ?? [];
  return (
    findPart(parts, "text/html") ??
    findPart(parts, "text/plain") ??
    msg.snippet ??
    ""
  );
}

function toReceivedAt(
  internalDate?: string | number | Date | null
): string | null {
  if (!internalDate) return null;
  if (internalDate instanceof Date) return internalDate.toISOString();
  const ms = Number(internalDate);
  if (!Number.isNaN(ms) && ms > 0) return new Date(ms).toISOString();
  return null;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const user = await requireUser();
  const tenantId = user.corsairTenantId ?? user.clerkId;
  const tenant = corsairTenant(tenantId);

  try {
    const msgResult = (await tenant.run("gmail.api.messages.get", {
      id,
      format: "full",
    })) as { success: boolean; data: GmailMessage };

    if (!msgResult.success || !msgResult.data) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    const msg = msgResult.data;
    const headers = msg.payload?.headers ?? [];

    const analysis = await db.emailAnalysis
      .findUnique({
        where: {
          userId_corsairMessageId: {
            userId: user.id,
            corsairMessageId: id,
          },
        },
      })
      .catch(() => null);

    return NextResponse.json({
      email: {
        id,
        threadId: msg.threadId ?? null,
        subject: getHeader(headers, "subject") || "(no subject)",
        from: getHeader(headers, "from") || "(unknown)",
        to: getHeader(headers, "to") || "",
        snippet: msg.snippet ?? "",
        body: extractBody(msg),
        receivedAt: toReceivedAt(msg.internalDate),
        category: analysis?.category ?? "primary",
        urgency: analysis?.urgency ?? null,
        summaryShort: analysis?.summaryShort ?? null,
        summaryLong: analysis?.summaryLong ?? null,
        needsReply: analysis?.needsReply ?? false,
        isMeetingRequest: analysis?.isMeetingRequest ?? false,
        sentiment: analysis?.sentiment ?? null,
        urgencyReason: analysis?.urgencyReason ?? null,
        suggestedActions: analysis?.suggestedActions ?? [],
        peopleMentioned: analysis?.peopleMentioned ?? [],
        deadlineDetected: analysis?.deadlineDetected ?? null,
        isRead: !(msg.labelIds ?? []).includes("UNREAD"),
      },
    });
  } catch (err) {
    console.error("[emails/id]", err);
    return NextResponse.json({ error: "Failed to load email" }, { status: 500 });
  }
}