import { createClient } from "@corsair-dev/app";

export const corsair = createClient({
  apiKey: process.env.CORSAIR_DEV_KEY!,
});

export function corsairInstance() {
  return corsair.instance(process.env.CORSAIR_INSTANCE_ID!);
}

export function corsairTenant(tenantId: string) {
  return corsairInstance().tenant(tenantId);
}

export async function ensureCorsairTenant(tenantId: string) {
  const inst = corsairInstance();

  try {
    return await inst.tenants.create(tenantId);
  } catch {
    const { tenants } = await inst.tenants.list();
    const found = tenants.find((t: { id: string }) => t.id === tenantId);
    if (found) return found;

    throw new Error(`Could not ensure Corsair tenant: ${tenantId}`);
  }
}

export type CorsairRunResult<T> = {
  success: boolean;
  data?: T;
  signInLink?: string;
  error?: string;
};

export async function runForTenant<T = unknown>(
  tenantId: string,
  operation: string,
  input?: Record<string, unknown>
): Promise<CorsairRunResult<T>> {
  try {
    const tenant = corsairTenant(tenantId);
    const result = (await tenant.run(operation, input)) as CorsairRunResult<T>;

    if (!result || typeof result.success !== "boolean") {
      return { success: true, data: result as unknown as T };
    }

    return result;
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Corsair run failed",
    };
  }
}

export async function readFromCache<T = unknown>(
  tenantId: string,
  operation: string,
  filters?: Record<string, unknown>,
  limit = 50,
  offset = 0
): Promise<T[]> {
  const result = await runForTenant<unknown>(tenantId, operation, {
    data: filters ?? {},
    limit,
    offset,
  });

  if (!result.success || !result.data) return [];

  const d = result.data as unknown;

  let rows: unknown[] = [];

  if (Array.isArray(d)) {
    rows = d;
  } else if (typeof d === "object" && d !== null) {
    const obj = d as Record<string, unknown>;
    const arr =
      obj.rows ??
      obj.results ??
      obj.messages ??
      obj.events ??
      obj.data ??
      [];
    rows = Array.isArray(arr) ? arr : [];
  }

  return rows.map((row) => {
    if (
      row &&
      typeof row === "object" &&
      "data" in (row as object) &&
      typeof (row as Record<string, unknown>).data === "object"
    ) {
      const r = row as Record<string, unknown>;
      return {
        ...(r.data as object),
        entity_id:
          r.entity_id ??
          (r.data as Record<string, unknown>)?.id,
      } as T;
    }
    return row as T;
  });
}