import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { runForTenant } from "@/lib/corsair";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const tenantId = user.corsairTenantId ?? user.clerkId;

  let body: {
    threadId?: string;
    to?: string;
    subject?: string;
    message?: string;
    inReplyTo?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.to || !body.message) {
    return NextResponse.json(
      { error: "Missing required fields: to, message" },
      { status: 400 }
    );
  }

  const result = await runForTenant(tenantId, "gmail.api.messages.send", {
    to: body.to,
    subject: body.subject ?? "",
    body: body.message,
    threadId: body.threadId ?? undefined,
    inReplyTo: body.inReplyTo ?? undefined,
  });

  if (!result.success) {
    return NextResponse.json(
      { error: "Failed to send reply" },
      { status: 500 }
    );
  }

  await db.auditLog.create({
    data: {
      userId: user.id,
      action: "email_sent",
      detail: {
        to: body.to,
        subject: body.subject,
        threadId: body.threadId,
      },
    },
  });

  return NextResponse.json({ ok: true });
}