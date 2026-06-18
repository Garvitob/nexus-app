import { readFromCache } from "@/lib/corsair";
import { db } from "@/lib/db";
import { LIMITS } from "@/lib/constants";

type GmailRow = {
  id?: string;
  entity_id?: string;
  threadId?: string;
  snippet?: string;
  subject?: string;
  body?: string;
  from?: string;
  to?: string;
  internalDate?: string;
  createdAt?: string;
};

export type SyncedEmail = {
  corsairMessageId: string;
  threadId: string | null;
  subject: string;
  from: string;
  to: string;
  snippet: string;
  body: string;
  receivedAt: Date | null;
};

function toReceivedDate(row: GmailRow): Date | null {
  if (row.internalDate) {
    const ms = Number(row.internalDate);
    if (!Number.isNaN(ms)) return new Date(ms);
  }
  if (row.createdAt) {
    const d = new Date(row.createdAt);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

function normalize(row: GmailRow): SyncedEmail | null {
  const id = row.id ?? row.entity_id;
  if (!id) return null;
  return {
    corsairMessageId: id,
    threadId: row.threadId ?? null,
    subject: row.subject ?? "",
    from: row.from ?? "",
    to: row.to ?? "",
    snippet: row.snippet ?? "",
    body: row.body ?? row.snippet ?? "",
    receivedAt: toReceivedDate(row),
  };
}

export async function fetchEmailsFromCorsair(
  tenantId: string,
  limit: number = LIMITS.INITIAL_EMAIL_LOAD
): Promise<SyncedEmail[]> {
  const rows = await readFromCache<GmailRow>(
    tenantId,
    "gmail.db.messages.search",
    {},
    limit,
    0
  );

  return rows.map(normalize).filter((e): e is SyncedEmail => e !== null);
}

export async function syncGmail(params: {
  userId: string;
  tenantId: string;
  limit?: number;
}): Promise<{ fetched: number; newIds: string[] }> {
  const { userId, tenantId } = params;
  const limit: number = params.limit ?? LIMITS.INITIAL_EMAIL_LOAD;

  const emails = await fetchEmailsFromCorsair(tenantId, limit);
  if (emails.length === 0) {
    await markSynced(userId, "gmail");
    return { fetched: 0, newIds: [] };
  }

  const ids = emails.map((e) => e.corsairMessageId);
  const existing = await db.emailAnalysis.findMany({
    where: { userId, corsairMessageId: { in: ids } },
    select: { corsairMessageId: true },
  });
  const existingIds = new Set(existing.map((e) => e.corsairMessageId));

  const newEmails = emails.filter(
    (e) => !existingIds.has(e.corsairMessageId)
  );

  for (const email of newEmails) {
    await db.emailAnalysis.upsert({
      where: {
        userId_corsairMessageId: {
          userId,
          corsairMessageId: email.corsairMessageId,
        },
      },
      update: { threadId: email.threadId, category: "primary" },
      create: {
        userId,
        corsairMessageId: email.corsairMessageId,
        threadId: email.threadId,
        category: "primary",
      },
    });
  }

  await markSynced(userId, "gmail");

  return {
    fetched: emails.length,
    newIds: newEmails.map((e) => e.corsairMessageId),
  };
}

async function markSynced(userId: string, pluginId: string): Promise<void> {
  await db.connectedAccount
    .updateMany({
      where: { userId, pluginId },
      data: { lastSyncedAt: new Date() },
    })
    .catch(() => null);
}