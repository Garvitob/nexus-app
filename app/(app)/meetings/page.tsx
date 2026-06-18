import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { syncAll } from "@/services/sync/engine";
import { MeetingsLayout } from "@/components/features/meetings/meetings-layout";

export const metadata = {
  title: "Meetings — Nexus",
};

export default async function MeetingsPage() {
  const user = await requireUser();
  syncAll(user.id).catch(() => null);

  return (
    <Suspense>
      <MeetingsLayout />
    </Suspense>
  );
}