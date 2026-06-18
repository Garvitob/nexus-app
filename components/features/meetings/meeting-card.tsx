"use client";

import { Video, Clock, Users, Sparkles, MapPin } from "lucide-react";
import type { Meeting } from "@/hooks/use-meetings";

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(start: string | null, end: string | null): string {
  if (!start || !end) return "";
  const mins = Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / 60000
  );
  if (mins < 60) return mins + " min";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? h + "h " + m + "m" : h + "h";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function isHappeningNow(start: string | null, end: string | null): boolean {
  if (!start || !end) return false;
  const now = Date.now();
  return new Date(start).getTime() <= now && new Date(end).getTime() >= now;
}

function isUpcomingSoon(start: string | null): boolean {
  if (!start) return false;
  const diff = new Date(start).getTime() - Date.now();
  return diff > 0 && diff <= 30 * 60 * 1000;
}

function timeFromNow(start: string | null): string {
  if (!start) return "";
  const diff = new Date(start).getTime() - Date.now();
  if (diff < 0) return "Started";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return "In " + mins + " min";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h < 24) return m > 0 ? "In " + h + "h " + m + "m" : "In " + h + "h";
  const d = Math.floor(h / 24);
  return d === 1 ? "Tomorrow" : "In " + d + " days";
}

interface MeetingCardProps {
  meeting: Meeting;
  onClick: (meeting: Meeting) => void;
  isDark: boolean;
}

export function MeetingCard({ meeting, onClick, isDark }: MeetingCardProps) {
  const now = isHappeningNow(meeting.startTime, meeting.endTime);
  const soon = isUpcomingSoon(meeting.startTime);
  const fromNow = timeFromNow(meeting.startTime);
  const dur = formatDuration(meeting.startTime, meeting.endTime);

  const border = isDark ? "#242830" : "#e9ebef";
  const tc = isDark ? "#e5e7eb" : "#111827";
  const tm = isDark ? "#5e636e" : "#98a0ac";
  const bg = isDark ? "#131519" : "#ffffff";
  const hoverBg = isDark ? "#1a1d23" : "#f6f7f9";
  const accentColor = now ? "#ef4444" : soon ? "#eab308" : "#2d7387";
  const shadow = isDark
    ? "0 2px 12px rgba(0,0,0,0.3)"
    : "0 2px 12px rgba(16,24,40,0.06)";

  return (
    <button
      onClick={() => onClick(meeting)}
      className="w-full text-left rounded-2xl p-5 transition-all hover:scale-[1.01] hover:shadow-lg"
      style={{
        background: bg,
        border: "1px solid " + border,
        borderLeft: "3px solid " + accentColor,
        boxShadow: shadow,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = hoverBg;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = bg;
      }}
    >
      {/* Top row — badges + time from now */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {now && (
            <span
              className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
              style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}
            >
              Live now
            </span>
          )}
          {soon && !now && (
            <span
              className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
              style={{ background: "rgba(234,179,8,0.12)", color: "#eab308" }}
            >
              Starting soon
            </span>
          )}
          {meeting.hasBrief && (
            <span
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{
                background: "rgba(45,115,135,0.12)",
                color: "#2d7387",
              }}
            >
              <Sparkles className="h-2.5 w-2.5" />
              Brief ready
            </span>
          )}
        </div>
        <span
          className="text-[11px] font-medium shrink-0 ml-2"
          style={{ color: accentColor }}
        >
          {fromNow}
        </span>
      </div>

      {/* Title */}
      <h3
        className="text-[15px] font-semibold leading-snug mb-2"
        style={{ color: tc }}
      >
        {meeting.title}
      </h3>

      {/* Time + duration + meet link */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" style={{ color: tm }} />
          <span className="text-[12px]" style={{ color: tm }}>
            {formatDateTime(meeting.startTime)}
          </span>
        </div>
        {dur && (
          <span className="text-[12px]" style={{ color: tm }}>
            {dur}
          </span>
        )}
        {meeting.meetLink && (
          <div className="flex items-center gap-1">
            <Video className="h-3.5 w-3.5" style={{ color: "#2d7387" }} />
            <span className="text-[12px]" style={{ color: "#2d7387" }}>
              Google Meet
            </span>
          </div>
        )}
        {meeting.location && !meeting.meetLink && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" style={{ color: tm }} />
            <span className="text-[12px]" style={{ color: tm }}>
              {meeting.location}
            </span>
          </div>
        )}
      </div>

      {/* Description snippet */}
      {meeting.description ? (
        <p
          className="text-[12px] leading-relaxed mb-3 line-clamp-2"
          style={{ color: tm }}
        >
          {meeting.description}
        </p>
      ) : null}

      {/* Attendees */}
      {meeting.attendees.length > 0 ? (
        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5 shrink-0" style={{ color: tm }} />
          <div className="flex items-center gap-0.5">
            {meeting.attendees.slice(0, 5).map((a) => (
              <div
                key={a.email}
                className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-semibold text-white"
                style={{
                  background: "#2d7387",
                  outline: "2px solid " + (isDark ? "#131519" : "#ffffff"),
                }}
                title={a.displayName || a.email}
              >
                {getInitials(a.displayName || a.email)}
              </div>
            ))}
            {meeting.attendees.length > 5 && (
              <span className="text-[11px] ml-1" style={{ color: tm }}>
                {"+" + (meeting.attendees.length - 5)}
              </span>
            )}
          </div>
          <span className="text-[11px]" style={{ color: tm }}>
            {meeting.attendees.length === 1
              ? "1 attendee"
              : meeting.attendees.length + " attendees"}
          </span>
        </div>
      ) : null}
    </button>
  );
}