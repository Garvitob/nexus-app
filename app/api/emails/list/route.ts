import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { corsairTenant } from "@/lib/corsair";
import { db } from "@/lib/db";

export type EmailRow = {
  id: string;
  threadId: string | null;
  subject: string;
  from: string;
  to: string;
  snippet: string;
  body: string;
  receivedAt: string | null;
  category: string;
  urgency: string | null;
  summaryShort: string | null;
  needsReply: boolean;
  isMeetingRequest: boolean;
  isRead: boolean;
};

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

const CATEGORY_QUERIES: Record<string, string | null> = {
  primary: "category:primary",
  promotions: "category:promotions",
  spam: "in:spam",
  all: null,
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

export async function GET(req: NextRequest) {
  const user = await requireUser();
  const tenantId = user.corsairTenantId ?? user.clerkId;
  const tenant = corsairTenant(tenantId);

  const { searchParams } = req.nextUrl;
  const category = searchParams.get("category") ?? "primary";
  const pageToken = searchParams.get("pageToken") ?? undefined;
  const limit = 20;

  const q = CATEGORY_QUERIES[category];
  const listInput: Record<string, unknown> = { maxResults: limit };
  if (q) listInput.q = q;
  if (category === "all") listInput.includeSpamTrash = true;
  if (pageToken) listInput.pageToken = pageToken;

  const listResult = (await tenant.run(
    "gmail.api.messages.list",
    listInput
  )) as {
    success: boolean;
    data: {
      messages?: Array<{ id?: string; threadId?: string }>;
      nextPageToken?: string;
    };
  };

  if (!listResult.success || !listResult.data?.messages) {
    return NextResponse.json({ emails: [], nextPageToken: null });
  }

  const messageIds = listResult.data.messages
    .map((m) => m.id)
    .filter((id): id is string => !!id);

  const nextPageToken = listResult.data.nextPageToken ?? null;

  if (messageIds.length === 0) {
    return NextResponse.json({ emails: [], nextPageToken: null });
  }

  const analyses = await db.emailAnalysis.findMany({
    where: { userId: user.id, corsairMessageId: { in: messageIds } },
    select: {
      corsairMessageId: true,
      urgency: true,
      summaryShort: true,
      needsReply: true,
      isMeetingRequest: true,
      category: true,
    },
  });
  const analysisMap = new Map(analyses.map((a) => [a.corsairMessageId, a]));

  const emails: EmailRow[] = [];

  await Promise.all(
    messageIds.map(async (msgId) => {
      try {
        const msgResult = (await tenant.run("gmail.api.messages.get", {
          id: msgId,
          format: "full",
        })) as { success: boolean; data: GmailMessage };

        if (!msgResult.success || !msgResult.data) return;

        const msg = msgResult.data;
        const headers = msg.payload?.headers ?? [];
        const subject = getHeader(headers, "subject") || "(no subject)";
        const from = getHeader(headers, "from") || "(unknown)";
        const to = getHeader(headers, "to") || "";
        const body = extractBody(msg);
        const snippet = msg.snippet ?? "";
        const receivedAt = toReceivedAt(msg.internalDate);
        const analysis = analysisMap.get(msgId);

        emails.push({
          id: msgId,
          threadId: msg.threadId ?? null,
          subject,
          from,
          to,
          snippet,
          body,
          receivedAt,
          category: analysis?.category ?? category,
          urgency: analysis?.urgency ?? null,
          summaryShort: analysis?.summaryShort ?? null,
          needsReply: analysis?.needsReply ?? false,
          isMeetingRequest: analysis?.isMeetingRequest ?? false,
          isRead: !(msg.labelIds ?? []).includes("UNREAD"),
        });
      } catch {
        // skip silently
      }
    })
  );

  const idOrder = new Map(messageIds.map((id, idx) => [id, idx]));
  emails.sort(
    (a, b) => (idOrder.get(a.id) ?? 999) - (idOrder.get(b.id) ?? 999)
  );

  return NextResponse.json({ emails, nextPageToken });
}