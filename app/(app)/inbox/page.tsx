import { Suspense } from "react";
import { InboxLayout } from "@/components/features/inbox/inbox-layout";
import { requireUser } from "@/lib/auth";
import { syncAll } from "@/services/sync/engine";

export const metadata = {
  title: "Smart Inbox — Nexus",
};

export default async function InboxPage() {
  const user = await requireUser();
  
  syncAll(user.id).catch(() => null);

  return (
    <Suspense>
      <InboxLayout />
    </Suspense>
  );
}