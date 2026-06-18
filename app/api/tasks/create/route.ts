import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const user = await requireUser();

  let body: {
    title: string;
    description?: string;
    priority?: string;
    dueDate?: string;
    dueTime?: string;
    sourceType?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const task = await db.task.create({
    data: {
      userId: user.id,
      title: body.title.trim(),
      description: body.description ?? "",
      priority:
        (body.priority as "low" | "normal" | "high" | "urgent") ?? "normal",
      status: "pending",
      sourceType: body.sourceType ?? "manual",
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      dueTime: body.dueTime ?? undefined,
    },
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      action: "task_created",
      detail: { taskId: task.id, title: task.title, source: "manual" },
    },
  });

  return NextResponse.json({ task });
}