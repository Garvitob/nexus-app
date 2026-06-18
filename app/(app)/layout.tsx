import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getOrCreateUser } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";
import { Providers } from "@/components/providers";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getOrCreateUser();

  if (!user) {
    redirect(ROUTES.SIGN_IN);
  }

  return (
    <Providers>
      <AppShell>{children}</AppShell>
    </Providers>
  );
}