import { readFromCache } from "@/lib/corsair";
import { db } from "@/lib/db";

type JiraRow = {
  id?: string | number;
  entity_id?: string;
  key?: string;
  summary?: string;
  description?: string;
  status?: string | { name?: string };
  priority?: string | { name?: string };
  issuetype?: string | { name?: string };
  assignee?: string | { displayName?: string; emailAddress?: string };
  reporter?: string | { displayName?: string; emailAddress?: string };
  projectKey?: string;
  project?: { key?: string; name?: string };
  fields?: {
    summary?: string;
    description?: string;
    status?: { name?: string };
    priority?: { name?: string };
    issuetype?: { name?: string };
    assignee?: { displayName?: string; emailAddress?: string };
  };
  createdAt?: string;
  updatedAt?: string;
  updated?: string;
};

export type SyncedJiraIssue = {
  corsairIssueId: string;
  key: string | null;
  summary: string;
  description: string;
  status: string;
  priority: string;
  issueType: string;
  assignee: string | null;
  projectKey: string | null;
  updatedAt: Date | null;
};

function strOrName(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "name" in v) {
    const n = (v as { name?: string }).name;
    if (typeof n === "string") return n;
  }
  return "";
}

function normalize(row: JiraRow): SyncedJiraIssue | null {
  const id =
    row.entity_id ??
    (row.id != null ? String(row.id) : undefined) ??
    row.key;
  if (!id) return null;

  const f = row.fields ?? {};

  const summary = row.summary ?? f.summary ?? "";
  const description = row.description ?? f.description ?? "";
  const status = strOrName(row.status ?? f.status);
  const priority = strOrName(row.priority ?? f.priority);
  const issueType = strOrName(row.issuetype ?? f.issuetype);

  let assignee: string | null = null;
  const a = row.assignee ?? f.assignee;
  if (typeof a === "string") assignee = a;
  else if (a && typeof a === "object")
    assignee = a.displayName ?? a.emailAddress ?? null;

  const updatedRaw = row.updatedAt ?? row.updated;
  const updated = updatedRaw ? new Date(updatedRaw) : null;

  return {
    corsairIssueId: id,
    key: row.key ?? null,
    summary,
    description,
    status: status || "unknown",
    priority: priority || "none",
    issueType: issueType || "task",
    assignee,
    projectKey: row.projectKey ?? row.project?.key ?? null,
    updatedAt: updated && !Number.isNaN(updated.getTime()) ? updated : null,
  };
}

export async function fetchJiraIssuesFromCorsair(
  tenantId: string,
  limit = 50
): Promise<SyncedJiraIssue[]> {
  const rows = await readFromCache<JiraRow>(
    tenantId,
    "jira.db.issues.search",
    {},
    limit,
    0
  );
  return rows
    .map(normalize)
    .filter((x): x is SyncedJiraIssue => x !== null);
}

export async function syncJira(params: {
  userId: string;
  tenantId: string;
  limit?: number;
}): Promise<{ fetched: number; newIds: string[] }> {
  const { userId, tenantId } = params;
  const limit = params.limit ?? 50;

  const issues = await fetchJiraIssuesFromCorsair(tenantId, limit);
  if (issues.length === 0) {
    await markSynced(userId, "jira");
    return { fetched: 0, newIds: [] };
  }

  const ids = issues.map((i) => i.corsairIssueId);
  const existing = await db.jiraAnalysis.findMany({
    where: { userId, corsairIssueId: { in: ids } },
    select: { corsairIssueId: true },
  });
  const existingIds = new Set(existing.map((e) => e.corsairIssueId));

  const newIssues = issues.filter(
    (i) => !existingIds.has(i.corsairIssueId)
  );

  for (const issue of newIssues) {
    await db.jiraAnalysis.upsert({
      where: {
        userId_corsairIssueId: {
          userId,
          corsairIssueId: issue.corsairIssueId,
        },
      },
      update: {},
      create: {
        userId,
        corsairIssueId: issue.corsairIssueId,
      },
    });
  }

  await markSynced(userId, "jira");

  return {
    fetched: issues.length,
    newIds: newIssues.map((i) => i.corsairIssueId),
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