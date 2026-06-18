import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { syncOne, syncAll } from "@/services/sync/engine";

export async function POST(req: NextRequest) {
  let body: { userId?: string; pluginId?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  let userId = body.userId ?? null;

  if (!userId) {
    const { userId: clerkId } = await auth();
    if (clerkId) {
      const user = await db.user.findUnique({
        where: { clerkId },
        select: { id: true },
      });
      userId = user?.id ?? null;
    }
  }

  if (!userId) {
    return NextResponse.json({ error: "No user" }, { status: 401 });
  }

  try {
    if (body.pluginId) {
      const result = await syncOne(userId, body.pluginId);
      void queueAnalysis(userId, [result]);
      return NextResponse.json({ ok: true, results: [result] });
    }

    const results = await syncAll(userId);
    void queueAnalysis(userId, results);
    return NextResponse.json({ ok: true, results });
  } catch (err) {
    console.error("[sync/initial]", err);
    return NextResponse.json(
      { error: "sync failed" },
      { status: 500 }
    );
  }
}

async function queueAnalysis(
  userId: string,
  results: { pluginId: string; newIds: string[] }[]
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (!appUrl) return;

  const hasNew = results.some((r) => r.newIds.length > 0);
  if (!hasNew) return;

  fetch(`${appUrl}/api/ai/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, mode: "batch" }),
  }).catch(() => null);
}