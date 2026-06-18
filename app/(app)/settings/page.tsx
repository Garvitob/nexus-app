import { requireUser } from "@/lib/auth";
import { SettingsLayout } from "@/components/features/settings/settings-layout";

export const metadata = {
  title: "Settings — Nexus",
};

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <SettingsLayout
      email={user.email}
      name={user.name}
      imageUrl={user.imageUrl}
    />
  );
}