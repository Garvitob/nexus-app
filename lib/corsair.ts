import { createClient } from "@corsair-dev/app";

/**
 * Single shared Corsair client for the whole app.
 * Uses the developer key scoped to our nexus-app instance.
 */
export const corsair = createClient({
  apiKey: process.env.CORSAIR_DEV_KEY!,
});

/**
 * The nexus-app instance. All plugins (Gmail, Calendar, GitHub, Jira, Notion)
 * are installed on this instance.
 */
export function corsairInstance() {
  return corsair.instance(process.env.CORSAIR_INSTANCE_ID!);
}

/**
 * Get a tenant-scoped Corsair client.
 * Each app user maps to exactly one Corsair tenant (tenantId = our user id).
 * This is how we keep every user's connected accounts fully isolated.
 *
 * @param tenantId - our internal user id (from Clerk)
 */
export function corsairTenant(tenantId: string) {
  return corsairInstance().tenant(tenantId);
}

/**
 * Ensure a tenant exists for this user.
 * Called when a user signs up or first connects an app.
 * Safe to call repeatedly - returns existing tenant if already created.
 *
 * @param tenantId - our internal user id (from Clerk)
 */
export async function ensureCorsairTenant(tenantId: string) {
  const inst = corsairInstance();

  // Try to create; if it already exists, that's fine — fetch it.
  try {
    return await inst.tenants.create(tenantId);
  } catch {
    
    const { tenants } = await inst.tenants.list();
    const found = tenants.find((t: { id: string }) => t.id === tenantId);
    if (found) return found;
  
    throw new Error(`Could not ensure Corsair tenant: ${tenantId}`);
  }
}