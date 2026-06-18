import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { NexusLayout } from "@/components/features/nexus/nexus-layout";

export const metadata = {
  title: "Nexus AI — Nexus",
};

export default async function NexusPage() {
  await requireUser();

  return (
    <Suspense>
      <NexusLayout />
    </Suspense>
  );
}