import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await requireUser();

  const sessions = await db.chatSession
    .findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    })
    .catch(() => []);

  return NextResponse.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      title: s.title ?? "New chat",
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      messageCount: s._count.messages,
    })),
  });
}

export async function POST() {
  const user = await requireUser();

  const session = await db.chatSession.create({
    data: {
      userId: user.id,
      title: "New chat",
    },
  });

  return NextResponse.json({
    session: {
      id: session.id,
      title: session.title ?? "New chat",
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      messageCount: 0,
    },
  });
}