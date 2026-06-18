"use client";

import { useState } from "react";
import { Video, ExternalLink, Clock, MapPin, Sparkles, ChevronRight, Loader2, Circle, Users } from "lucide-react";
import type { Meeting, MeetingBrief } from "@/hooks/use-meetings";
import { useMeetingBrief } from "@/hooks/use-meetings";

function formatFullTime(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatDuration(s: string | null, e: string | null): string {
  if (!s || !e) return "";
  const mins = Math.round((new Date(e).getTime() - new Date(s).getTime()) / 60000);
  if (mins < 60) return mins + " min";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? h + "h " + m + "m" : h + "h";
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  accepted: { label: "Accepted", color: "#2d7387" },
  declined: { label: "Declined", color: "#ef4444" },
  tentative: { label: "Tentative", color: "#eab308" },
  needsAction: { label: "Pending", color: "#6b7280" },
};

function ResponseBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP["needsAction"];
  return (
    <span className="rounded-full px-1.5 py-0.5 text-[9px] font-medium" style={{ background: s.color + "20", color: s.color }}>
      {s.label}
    </span>
  );
}

function Section({ title, items, tc, mc }: { title: string; items: string[]; tc: string; mc: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-4">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: mc }}>{title}</p>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <ChevronRight className="mt-0.5 h-3 w-3 shrink-0" style={{ color: "#2d7387" }} />
            <span className="text-[12px] leading-relaxed" style={{ color: tc }}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface Props {
  meeting: Meeting;
  isDark: boolean;
  onCreateTask: (title: string) => void;
}

export function MeetingDetail({ meeting, isDark, onCreateTask }: Props) {
  const [showAll, setShowAll] = useState(false);
  const { data, isLoading } = useMeetingBrief(meeting);
  const brief = data as MeetingBrief | undefined;

  const border    = isDark ? "#242830" : "#e9ebef";
  const tm        = isDark ? "#5e636e" : "#98a0ac";
  const tc        = isDark ? "#e5e7eb" : "#111827";
  const tb        = isDark ? "#d1d5db" : "#374151";
  const surfBg    = isDark ? "#1a1d23" : "#f6f7f9";
  const briefBg   = isDark ? "#15282e" : "#e4eff1";
  const briefBd   = isDark ? "#1c3a42" : "#c5dde2";
  const briefTc   = isDark ? "#a3dde9" : "#1c4e5b";
  const fupBg     = isDark ? "rgba(45,115,135,0.12)" : "rgba(45,115,135,0.08)";
  const fupBd     = isDark ? "rgba(45,115,135,0.3)"  : "rgba(45,115,135,0.2)";

  const shown = showAll ? meeting.attendees : meeting.attendees.slice(0, 5);
  const hidden = meeting.attendees.length - 5;
  const dur = formatDuration(meeting.startTime, meeting.endTime);

  const meetHref = meeting.meetLink ?? "";
  const calHref  = meeting.htmlLink ?? "";

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* ── Header ── */}
      <div className="shrink-0 border-b px-5 py-4" style={{ borderColor: border }}>
        <h2 className="text-[16px] font-bold leading-tight mb-1" style={{ color: tc }}>
          {meeting.title}
        </h2>

        <div className="flex items-center gap-4 mt-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" style={{ color: tm }} />
            <span className="text-[12px]" style={{ color: tm }}>{formatFullTime(meeting.startTime)}</span>
          </div>
          {dur && <span className="text-[12px]" style={{ color: tm }}>{dur}</span>}
          {meeting.location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" style={{ color: tm }} />
              <span className="text-[12px]" style={{ color: tm }}>{meeting.location}</span>
            </div>
          )}
        </div>

        <div className="mt-3 flex gap-2 flex-wrap">
          {meetHref && (
            <a href={meetHref} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white hover:opacity-90"
              style={{ background: "#2d7387" }}>
              <Video className="h-3.5 w-3.5" />
              Join Meet
            </a>
          )}
          {calHref && (
            <a href={calHref} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium hover:opacity-80"
              style={{ background: surfBg, border: "1px solid " + border, color: tc }}>
              <ExternalLink className="h-3.5 w-3.5" />
              Open in Calendar
            </a>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto px-5 py-4">

        {meeting.description ? (
          <div className="mb-5">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: tm }}>Description</p>
            <p className="text-[12px] leading-relaxed whitespace-pre-wrap" style={{ color: tb }}>{meeting.description}</p>
          </div>
        ) : null}

        {meeting.attendees.length > 0 ? (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-3.5 w-3.5" style={{ color: tm }} />
              <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: tm }}>
                {"Attendees (" + meeting.attendees.length + ")"}
              </p>
            </div>
            <div className="space-y-2">
              {shown.map((a) => (
                <div key={a.email} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white" style={{ background: "#2d7387" }}>
                      {getInitials(a.displayName || a.email)}
                    </div>
                    <div>
                      <p className="text-[12px] font-medium leading-none" style={{ color: tc }}>{a.displayName || a.email}</p>
                      {a.displayName ? <p className="text-[10px] mt-0.5" style={{ color: tm }}>{a.email}</p> : null}
                    </div>
                  </div>
                  <ResponseBadge status={a.responseStatus} />
                </div>
              ))}
              {meeting.attendees.length > 5 ? (
                <button onClick={() => setShowAll(!showAll)} className="text-[11px] font-medium hover:opacity-70" style={{ color: "#2d7387" }}>
                  {showAll ? "Show less" : "Show " + hidden + " more"}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* ── AI Brief ── */}
        <div className="rounded-xl p-4 mb-4" style={{ background: briefBg, border: "1px solid " + briefBd }}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4" style={{ color: "#2d7387" }} />
            <p className="text-[13px] font-semibold" style={{ color: briefTc }}>AI Meeting Brief</p>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#2d7387" }} />
              <span className="text-[12px]" style={{ color: tm }}>Generating brief...</span>
            </div>
          ) : brief ? (
            <div>
              {brief.summary ? (
                <p className="text-[12px] leading-relaxed mb-4" style={{ color: tb }}>{brief.summary}</p>
              ) : null}
              <Section title="Agenda"       items={brief.agenda ?? []}              tc={tb} mc={tm} />
              <Section title="Key Context"  items={brief.keyPoints ?? []}           tc={tb} mc={tm} />
              <Section title="Open Items"   items={brief.openItems ?? []}           tc={tb} mc={tm} />
              <Section title="How to Prepare" items={brief.preparationNotes ?? []} tc={tb} mc={tm} />

              {brief.suggestedFollowUps && brief.suggestedFollowUps.length > 0 ? (
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: tm }}>Suggested Follow-ups</p>
                  <div className="space-y-1.5">
                    {brief.suggestedFollowUps.map((item, i) => (
                      <button key={i} onClick={() => onCreateTask(item)}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] hover:opacity-80"
                        style={{ background: fupBg, border: "1px solid " + fupBd, color: briefTc }}>
                        <Circle className="h-3 w-3 shrink-0" style={{ color: "#2d7387" }} />
                        <span className="flex-1">{item}</span>
                        <span className="ml-auto text-[10px] shrink-0" style={{ color: "#2d7387" }}>+ Task</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-[12px]" style={{ color: tm }}>Brief unavailable. Try refreshing.</p>
          )}
        </div>
      </div>
    </div>
  );
}