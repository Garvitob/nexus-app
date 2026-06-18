"use client";

import { Plus, MessageSquare, Trash2, Loader2 } from "lucide-react";
import {
  useNexusSessions,
  useCreateSession,
  useDeleteSession,
} from "@/hooks/use-nexus";
import type { NexusSession } from "@/hooks/use-nexus";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return mins + "m";
  const h = Math.floor(mins / 60);
  if (h < 24) return h + "h";
  const d = Math.floor(h / 24);
  return d + "d";
}

interface NexusSessionsProps {
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  isDark: boolean;
}

export function NexusSessions({
  activeSessionId,
  onSelectSession,
  onNewSession,
  isDark,
}: NexusSessionsProps) {
  const { data: sessions = [], isLoading } = useNexusSessions();
  const createSession = useCreateSession();
  const deleteSession = useDeleteSession();

  const border = isDark ? "#242830" : "#e9ebef";
  const tc = isDark ? "#e5e7eb" : "#111827";
  const tm = isDark ? "#5e636e" : "#98a0ac";
  const activeBg = isDark ? "#15282e" : "#e4eff1";
  const hoverBg = isDark ? "#1a1d23" : "#f6f7f9";

  async function handleNew() {
    const session = await createSession.mutateAsync();
    onSelectSession(session.id);
    onNewSession();
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    await deleteSession.mutateAsync(id);
    if (id === activeSessionId) onNewSession();
  }

  return (
    <div
      className="flex h-full w-[240px] shrink-0 flex-col border-r"
      style={{ borderColor: border }}
    >
      {/* Header */}
      <div className="shrink-0 p-3">
        <button
          onClick={handleNew}
          disabled={createSession.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: "#2d7387" }}
        >
          {createSession.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          New chat
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2
              className="h-4 w-4 animate-spin"
              style={{ color: "#2d7387" }}
            />
          </div>
        ) : sessions.length === 0 ? (
          <p
            className="px-2 py-6 text-center text-[12px]"
            style={{ color: tm }}
          >
            No conversations yet
          </p>
        ) : (
          <div className="space-y-1">
            {sessions.map((s: NexusSession) => {
              const isActive = s.id === activeSessionId;
              return (
                <div
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectSession(s.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectSession(s.id);
                    }
                  }}
                  className="group flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors"
                  style={{ background: isActive ? activeBg : "transparent" }}
                  onMouseEnter={(e) => {
                    if (!isActive)
                      (e.currentTarget as HTMLElement).style.background =
                        hoverBg;
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive)
                      (e.currentTarget as HTMLElement).style.background =
                        "transparent";
                  }}
                >
                  <MessageSquare
                    className="h-3.5 w-3.5 shrink-0"
                    style={{ color: isActive ? "#2d7387" : tm }}
                  />
                  <span
                    className="flex-1 truncate text-[12.5px]"
                    style={{ color: isActive ? tc : tm }}
                  >
                    {s.title}
                  </span>
                  <span
                    className="shrink-0 text-[10px] opacity-0 group-hover:opacity-100"
                    style={{ color: tm }}
                  >
                    {timeAgo(s.updatedAt)}
                  </span>
                  <button
                    onClick={(e) => handleDelete(e, s.id)}
                    className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" style={{ color: tm }} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}