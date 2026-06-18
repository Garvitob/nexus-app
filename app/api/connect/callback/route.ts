import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import type { PluginId } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  const pluginId = req.nextUrl.searchParams.get("plugin") as PluginId | null;

  try {
    const user = await db.user.findUnique({ where: { clerkId } });
    if (!user) {
      return NextResponse.redirect(new URL("/connect?error=no-user", req.url));
    }

    if (pluginId) {
      await db.connectedAccount.upsert({
        where: { userId_pluginId: { userId: user.id, pluginId } },
        update: {
          status: "connected",
          connectedAt: new Date(),
          errorMessage: null,
        },
        create: {
          userId: user.id,
          pluginId,
          status: "connected",
          connectedAt: new Date(),
        },
      });
    }

    return NextResponse.redirect(
      new URL(`/connect?connected=${pluginId ?? ""}`, req.url)
    );
  } catch (err) {
    console.error("[connect/callback]", err);
    return NextResponse.redirect(
      new URL("/connect?error=sync-failed", req.url)
    );
  }
}