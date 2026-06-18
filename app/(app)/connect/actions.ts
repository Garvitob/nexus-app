"use server";

import { requireUser } from "@/lib/auth";
import { corsairTenant } from "@/lib/corsair";
import { db } from "@/lib/db";
import { ALL_PLUGIN_IDS, type PluginId } from "@/lib/constants";

export type ConnectionStatus = {
  pluginId: PluginId;
  connected: boolean;
};

export async function getConnectionStatuses(): Promise<ConnectionStatus[]> {
  const user = await requireUser();

  const accounts = await db.connectedAccount.findMany({
    where: { userId: user.id, status: "connected" },
    select: { pluginId: true },
  });

  const connected = new Set(accounts.map((a) => a.pluginId));

  return ALL_PLUGIN_IDS.map((pluginId) => ({
    pluginId,
    connected: connected.has(pluginId),
  }));
}

export async function createConnectLink(pluginId: PluginId): Promise<string> {
  const user = await requireUser();
  if (!user.corsairTenantId) {
    throw new Error("No Corsair tenant for this user");
  }

  const tenant = corsairTenant(user.corsairTenantId);
  const { url } = await tenant.connectLink.create({ plugins: [pluginId] });

  await db.connectedAccount.upsert({
    where: { userId_pluginId: { userId: user.id, pluginId } },
    update: { status: "connecting" },
    create: { userId: user.id, pluginId, status: "connecting" },
  });

  return url;
}

export async function markOnboarded(): Promise<void> {
  const user = await requireUser();
  await db.user.update({
    where: { id: user.id },
    data: { onboarded: true },
  });
}