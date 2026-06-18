import { getConnectionStatuses } from "./actions";
import { ConnectGrid } from "@/components/features/connect/connect-grid";
import { APP_NAME } from "@/lib/constants";

export default async function ConnectPage() {
  const statuses = await getConnectionStatuses();

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col px-6 py-12">
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold tracking-tight text-[var(--text)]">
          Connect your tools
        </h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--text-muted)]">
          {APP_NAME} works by connecting to the tools you already use. Connect
          at least one to get started — you can add the rest anytime.
        </p>
      </div>

      <ConnectGrid initialStatuses={statuses} />
    </div>
  );
}