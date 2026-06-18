import { readFromCache } from "@/lib/corsair";
import { db } from "@/lib/db";

type NotionRow = {
  id?: string;
  entity_id?: string;
  title?: string;
  url?: string;
  parent?: { type?: string; databaseId?: string; pageId?: string };
  properties?: Record<string, unknown>;
  createdTime?: string;
  created_time?: string;
  lastEditedTime?: string;
  last_edited_time?: string;
  archived?: boolean;
};

export type SyncedNotionPage = {
  corsairPageId: string;
  title: string;
  url: string | null;
  archived: boolean;
  lastEditedAt: Date | null;
};

function extractTitle(row: NotionRow): string {
  if (row.title && typeof row.title === "string") return row.title;

  const props = row.properties;
  if (props && typeof props === "object") {
    for (const value of Object.values(props)) {
      if (
        value &&
        typeof value === "object" &&
        "title" in value &&
        Array.isArray((value as { title?: unknown[] }).title)
      ) {
        const titleArr = (value as { title: Array<{ plainText?: string; plain_text?: string }> })
          .title;
        const text = titleArr
          .map((t) => t.plainText ?? t.plain_text ?? "")
          .join("");
        if (text) return text;
      }
    }
  }
  return "(untitled)";
}

function normalize(row: NotionRow): SyncedNotionPage | null {
  const id = row.id ?? row.entity_id;
  if (!id) return null;

  const editedRaw = row.lastEditedTime ?? row.last_edited_time;
  const edited = editedRaw ? new Date(editedRaw) : null;

  return {
    corsairPageId: id,
    title: extractTitle(row),
    url: row.url ?? null,
    archived: row.archived === true,
    lastEditedAt: edited && !Number.isNaN(edited.getTime()) ? edited : null,
  };
}

export async function fetchNotionPagesFromCorsair(
  tenantId: string,
  limit = 50
): Promise<SyncedNotionPage[]> {
  const rows = await readFromCache<NotionRow>(
    tenantId,
    "notion.db.pages.search",
    {},
    limit,
    0
  );
  return rows
    .map(normalize)
    .filter((x): x is SyncedNotionPage => x !== null);
}

export async function syncNotion(params: {
  userId: string;
  tenantId: string;
  limit?: number;
}): Promise<{ fetched: number; newIds: string[] }> {
  const { userId, tenantId } = params;
  const limit = params.limit ?? 50;

  const pages = await fetchNotionPagesFromCorsair(tenantId, limit);
  if (pages.length === 0) {
    await markSynced(userId, "notion");
    return { fetched: 0, newIds: [] };
  }

  const ids = pages.map((p) => p.corsairPageId);
  const existing = await db.notionAnalysis.findMany({
    where: { userId, corsairPageId: { in: ids } },
    select: { corsairPageId: true },
  });
  const existingIds = new Set(existing.map((e) => e.corsairPageId));

  const newPages = pages.filter((p) => !existingIds.has(p.corsairPageId));

  for (const page of newPages) {
    await db.notionAnalysis.upsert({
      where: {
        userId_corsairPageId: {
          userId,
          corsairPageId: page.corsairPageId,
        },
      },
      update: {},
      create: {
        userId,
        corsairPageId: page.corsairPageId,
      },
    });
  }

  await markSynced(userId, "notion");

  return {
    fetched: pages.length,
    newIds: newPages.map((p) => p.corsairPageId),
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