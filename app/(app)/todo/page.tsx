import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { syncAll } from "@/services/sync/engine";
import { TodoLayout } from "@/components/features/todo/todo-layout";

export const metadata = {
  title: "Todo — Nexus",
};

export default async function TodoPage() {
  const user = await requireUser();

  syncAll(user.id).catch(() => null);

  return (
    <Suspense>
      <TodoLayout />
    </Suspense>
  );
}