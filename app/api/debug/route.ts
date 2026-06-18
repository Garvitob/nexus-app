import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { corsairTenant } from "@/lib/corsair";

export async function GET() {
  const user = await requireUser();
  const tenantId = user.corsairTenantId ?? user.clerkId;
  const tenant = corsairTenant(tenantId);

  const results: Record<string, unknown> = {};

  try {
    results.test1 = await tenant.run("gmail.api.messages.list", {
      maxResults: 5,
      labelIds: ["INBOX", "CATEGORY_PERSONAL"],
    });
  } catch (err) {
    results.test1 = { error: err instanceof Error ? err.message : "failed" };
  }

  try {
    results.test2 = await tenant.run("gmail.api.messages.list", {
      maxResults: 5,
      labelIds: ["CATEGORY_PERSONAL"],
    });
  } catch (err) {
    results.test2 = { error: err instanceof Error ? err.message : "failed" };
  }

  try {
    results.test3 = await tenant.run("gmail.api.messages.list", {
      maxResults: 5,
      q: "in:primary",
    });
  } catch (err) {
    results.test3 = { error: err instanceof Error ? err.message : "failed" };
  }

  try {
    results.test4 = await tenant.run("gmail.api.messages.list", {
      maxResults: 5,
      labelIds: ["INBOX"],
    });
  } catch (err) {
    results.test4 = { error: err instanceof Error ? err.message : "failed" };
  }

  return NextResponse.json(results);
}