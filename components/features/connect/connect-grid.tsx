"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  CalendarDays,
  GitBranch,
  SquareKanban,
  FileText,
  Check,
  ArrowRight,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PLUGINS,
  PLUGIN_META,
  ALL_PLUGIN_IDS,
  ROUTES,
  type PluginId,
} from "@/lib/constants";
import {
  createConnectLink,
  markOnboarded,
  type ConnectionStatus,
} from "@/app/(app)/connect/actions";

const ICONS: Record<PluginId, LucideIcon> = {
  [PLUGINS.GMAIL]: Mail,
  [PLUGINS.CALENDAR]: CalendarDays,
  [PLUGINS.GITHUB]: GitBranch,
  [PLUGINS.JIRA]: SquareKanban,
  [PLUGINS.NOTION]: FileText,
};

export function ConnectGrid({
  initialStatuses,
}: {
  initialStatuses: ConnectionStatus[];
}) {
  const router = useRouter();
  const [statuses] = useState(initialStatuses);
  const [connecting, setConnecting] = useState<PluginId | null>(null);
  const [pending, startTransition] = useTransition();

  const connectedCount = statuses.filter((s) => s.connected).length;

  async function handleConnect(pluginId: PluginId) {
    setConnecting(pluginId);
    try {
      const url = await createConnectLink(pluginId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setConnecting(null);
    }
  }

  function handleContinue() {
    startTransition(async () => {
      await markOnboarded();
      router.push(ROUTES.NEXUS);
    });
  }

  return (
    <div className="flex flex-col gap-2.5">
      {ALL_PLUGIN_IDS.map((pluginId) => {
        const meta = PLUGIN_META[pluginId];
        const Icon = ICONS[pluginId];
        const status = statuses.find((s) => s.pluginId === pluginId);
        const isConnected = status?.connected ?? false;
        const isConnecting = connecting === pluginId;

        return (
          <div
            key={pluginId}
            className="flex items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius)] bg-[var(--surface-2)]">
              <Icon
                className="h-[19px] w-[19px] text-[var(--text)]"
                strokeWidth={2}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-medium text-[var(--text)]">
                {meta.label}
              </div>
              <div className="truncate text-[12.5px] text-[var(--text-muted)]">
                {meta.description}
              </div>
            </div>

            {isConnected ? (
              <div className="flex items-center gap-1.5 rounded-[var(--radius)] bg-[var(--signal-soft)] px-2.5 py-1.5 text-[12.5px] font-medium text-[var(--signal-text)]">
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                Connected
              </div>
            ) : (
              <button
                onClick={() => handleConnect(pluginId)}
                disabled={isConnecting}
                className={cn(
                  "flex items-center gap-1.5 rounded-[var(--radius)] border border-[var(--border-strong)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--text)] transition-colors hover:bg-[var(--surface-2)]",
                  isConnecting && "opacity-60"
                )}
              >
                {isConnecting ? (
                  <>
                    <Loader2
                      className="h-3.5 w-3.5 animate-spin"
                      strokeWidth={2}
                    />
                    Opening…
                  </>
                ) : (
                  "Connect"
                )}
              </button>
            )}
          </div>
        );
      })}

      <button
        onClick={handleContinue}
        disabled={connectedCount === 0 || pending}
        className={cn(
          "mt-4 flex items-center justify-center gap-2 rounded-[var(--radius)] bg-[var(--signal)] px-4 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[var(--signal-hover)]",
          (connectedCount === 0 || pending) && "cursor-not-allowed opacity-50"
        )}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
        ) : (
          <>
            Continue
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </>
        )}
      </button>

      {connectedCount === 0 && (
        <p className="text-center text-[12px] text-[var(--text-faint)]">
          Connect at least one tool to continue
        </p>
      )}
    </div>
  );
}