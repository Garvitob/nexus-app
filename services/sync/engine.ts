import { db } from "@/lib/db";
import { syncGmail } from "./gmail.sync";
import { syncCalendar } from "./calendar.sync";
import { syncGitHub } from "./github.sync";
import { syncJira } from "./jira.sync";
import { syncNotion } from "./notion.sync";

export type SyncResult = {
  pluginId: string;
  fetched: number;
  newIds: string[];
  error?: string;
};

type SyncFn = (params: {
  userId: string;
  tenantId: string;
}) => Promise<{ fetched: number; newIds: string[] }>;

const SYNC_MAP: Record<string, SyncFn> = {
  gmail: syncGmail,
  googlecalendar: syncCalendar,
  github: syncGitHub,
  jira: syncJira,
  notion: syncNotion,
};

async function resolveTenantId(userId: string): Promise<string | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { corsairTenantId: true, clerkId: true },
  });
  if (!user) return null;
  return user.corsairTenantId ?? user.clerkId ?? null;
}

export async function syncOne(
  userId: string,
  pluginId: string
): Promise<SyncResult> {
  const fn = SYNC_MAP[pluginId];
  if (!fn) {
    return { pluginId, fetched: 0, newIds: [], error: "unknown plugin" };
  }

  const tenantId = await resolveTenantId(userId);
  if (!tenantId) {
    return { pluginId, fetched: 0, newIds: [], error: "no tenant" };
  }

  try {
    const result = await fn({ userId, tenantId });
    return { pluginId, fetched: result.fetched, newIds: result.newIds };
  } catch (err) {
    await db.connectedAccount
      .updateMany({
        where: { userId, pluginId },
        data: {
          status: "error",
          errorMessage:
            err instanceof Error ? err.message : "sync failed",
        },
      })
      .catch(() => null);

    return {
      pluginId,
      fetched: 0,
      newIds: [],
      error: err instanceof Error ? err.message : "sync failed",
    };
  }
}

export async function syncAll(userId: string): Promise<SyncResult[]> {
  const connected = await db.connectedAccount.findMany({
    where: { userId, status: "connected" },
    select: { pluginId: true },
  });

  if (connected.length === 0) return [];

  const results = await Promise.all(
    connected.map((acc) => syncOne(userId, acc.pluginId))
  );

  return results;
}