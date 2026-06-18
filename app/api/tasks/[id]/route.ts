import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await context.params;

  let body: {
    title?: string;
    description?: string;
    priority?: string;
    status?: string;
    dueDate?: string | null;
    dueTime?: string | null;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const existing = await db.task.findFirst({
    where: { id, userId: user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const task = await db.task.update({
    where: { id },
    data: {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.description !== undefined
        ? { description: body.description }
        : {}),
      ...(body.priority !== undefined ? { priority: body.priority } : {}),
      ...(body.status !== undefined
        ? {
            status: body.status,
            ...(body.status === "done"
              ? { completedAt: new Date() }
              : { completedAt: null }),
          }
        : {}),
      ...(body.dueDate !== undefined
        ? { dueDate: body.dueDate ? new Date(body.dueDate) : null }
        : {}),
      ...(body.dueTime !== undefined ? { dueTime: body.dueTime } : {}),
    },
  });

  return NextResponse.json({ task });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await context.params;

  const existing = await db.task.findFirst({
    where: { id, userId: user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  await db.task.delete({ where: { id } });

  await db.auditLog.create({
    data: {
      userId: user.id,
      action: "task_deleted",
      detail: { taskId: id, title: existing.title },
    },
  });

  return NextResponse.json({ ok: true });
}