import { readFromCache } from "@/lib/corsair";
import { db } from "@/lib/db";

type GitHubRow = {
  id?: string | number;
  entity_id?: string;
  number?: number;
  title?: string;
  body?: string;
  state?: string;
  url?: string;
  htmlUrl?: string;
  html_url?: string;
  user?: { login?: string };
  author?: { login?: string };
  repository?: { fullName?: string; full_name?: string; name?: string };
  repo?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
};

export type SyncedGitHubItem = {
  corsairItemId: string;
  itemType: "pull_request" | "issue";
  number: number | null;
  title: string;
  body: string;
  state: string;
  url: string | null;
  author: string | null;
  repo: string | null;
  updatedAt: Date | null;
};

function normalize(
  row: GitHubRow,
  itemType: "pull_request" | "issue"
): SyncedGitHubItem | null {
  const id = row.entity_id ?? (row.id != null ? String(row.id) : undefined);
  if (!id) return null;

  const updatedRaw = row.updatedAt ?? row.updated_at;
  const updated = updatedRaw ? new Date(updatedRaw) : null;

  return {
    corsairItemId: id,
    itemType,
    number: row.number ?? null,
    title: row.title ?? "",
    body: row.body ?? "",
    state: row.state ?? "open",
    url: row.htmlUrl ?? row.html_url ?? row.url ?? null,
    author: row.user?.login ?? row.author?.login ?? null,
    repo:
      row.repository?.fullName ??
      row.repository?.full_name ??
      row.repository?.name ??
      row.repo ??
      null,
    updatedAt: updated && !Number.isNaN(updated.getTime()) ? updated : null,
  };
}

export async function fetchPullRequestsFromCorsair(
  tenantId: string,
  limit = 50
): Promise<SyncedGitHubItem[]> {
  const rows = await readFromCache<GitHubRow>(
    tenantId,
    "github.db.pullRequests.search",
    {},
    limit,
    0
  );
  return rows
    .map((r) => normalize(r, "pull_request"))
    .filter((x): x is SyncedGitHubItem => x !== null);
}

export async function fetchIssuesFromCorsair(
  tenantId: string,
  limit = 50
): Promise<SyncedGitHubItem[]> {
  const rows = await readFromCache<GitHubRow>(
    tenantId,
    "github.db.issues.search",
    {},
    limit,
    0
  );
  return rows
    .map((r) => normalize(r, "issue"))
    .filter((x): x is SyncedGitHubItem => x !== null);
}

export async function syncGitHub(params: {
  userId: string;
  tenantId: string;
  limit?: number;
}): Promise<{ fetched: number; newIds: string[] }> {
  const { userId, tenantId } = params;
  const limit = params.limit ?? 50;

  const [prs, issues] = await Promise.all([
    fetchPullRequestsFromCorsair(tenantId, limit),
    fetchIssuesFromCorsair(tenantId, limit),
  ]);

  const items = [...prs, ...issues];
  if (items.length === 0) {
    await markSynced(userId, "github");
    return { fetched: 0, newIds: [] };
  }

  const ids = items.map((i) => i.corsairItemId);
  const existing = await db.gitHubAnalysis.findMany({
    where: { userId, corsairItemId: { in: ids } },
    select: { corsairItemId: true },
  });
  const existingIds = new Set(existing.map((e) => e.corsairItemId));

  const newItems = items.filter((i) => !existingIds.has(i.corsairItemId));

  for (const item of newItems) {
    await db.gitHubAnalysis.upsert({
      where: {
        userId_corsairItemId: {
          userId,
          corsairItemId: item.corsairItemId,
        },
      },
      update: { itemType: item.itemType },
      create: {
        userId,
        corsairItemId: item.corsairItemId,
        itemType: item.itemType,
      },
    });
  }

  await markSynced(userId, "github");

  return {
    fetched: items.length,
    newIds: newItems.map((i) => i.corsairItemId),
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