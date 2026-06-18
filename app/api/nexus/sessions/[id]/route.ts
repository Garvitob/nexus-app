import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;

  const session = await db.chatSession
    .findFirst({
      where: { id, userId: user.id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            role: true,
            content: true,
            createdAt: true,
          },
        },
      },
    })
    .catch(() => null);

  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    session: {
      id: session.id,
      title: session.title ?? "New chat",
      messages: session.messages,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;

  let body: { title?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const existing = await db.chatSession
    .findFirst({ where: { id, userId: user.id } })
    .catch(() => null);

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db.chatSession.update({
    where: { id },
    data: { title: body.title?.slice(0, 100) ?? existing.title },
  });

  return NextResponse.json({ ok: true, title: updated.title });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;

  const existing = await db.chatSession
    .findFirst({ where: { id, userId: user.id } })
    .catch(() => null);

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.chatSession.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}