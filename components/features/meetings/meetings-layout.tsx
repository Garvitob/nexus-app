"use client";

import { useState, useEffect } from "react";
import { useMeetings } from "@/hooks/use-meetings";
import type { Meeting } from "@/hooks/use-meetings";
import { MeetingDetail } from "./meeting-detail";
import { MeetingCopilot } from "./meeting-copilot";
import type { MeetingCopilotMessage } from "./meeting-copilot";
import { useCreateTask } from "@/hooks/use-tasks";
import { Loader2, CalendarDays, ArrowLeft, Video, Clock, Users, Sparkles, MapPin } from "lucide-react";

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

function MeetingCard({ meeting, onClick, isDark }: MeetingCardProps) {
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
  const avatarOutline = isDark ? "#131519" : "#ffffff";

  return (
    <button
      onClick={() => onClick(meeting)}
      className="w-full text-left rounded-2xl p-5 transition-all hover:scale-[1.01] hover:shadow-lg"
      style={{
        background: bg,
        border: "1px solid " + border,
        borderLeft: "3px solid " + accentColor,
        boxShadow: isDark
          ? "0 2px 12px rgba(0,0,0,0.3)"
          : "0 2px 12px rgba(16,24,40,0.06)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = hoverBg;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = bg;
      }}
    >
      {/* Top row — status badges + time from now */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
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
              style={{ background: "rgba(45,115,135,0.12)", color: "#2d7387" }}
            >
              <Sparkles className="h-2.5 w-2.5" />
              Brief ready
            </span>
          )}
        </div>
        <span
          className="text-[11px] font-medium"
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

      {/* Time + duration + location */}
      <div className="flex items-center gap-4 mb-3 flex-wrap">
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
          <div className="flex items-center gap-1">
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
                  outline: "2px solid " + avatarOutline,
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

export function MeetingsLayout() {
  const [isDark, setIsDark] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [chatHistory, setChatHistory] = useState<MeetingCopilotMessage[]>([]);
  const { data: meetings = [], isLoading } = useMeetings();
  const createTask = useCreateTask();

  useEffect(() => {
    const check = () =>
      setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && selectedMeeting) {
        setSelectedMeeting(null);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [selectedMeeting]);

  function handleMeetingSelect(meeting: Meeting) {
    if (meeting.id !== selectedMeeting?.id) {
      setChatHistory([]);
    }
    setSelectedMeeting(meeting);
  }

  function handleBack() {
    setSelectedMeeting(null);
  }

  async function handleCreateTask(title: string) {
    if (!title.trim()) return;
    await createTask.mutateAsync({ title: title.trim() });
  }

  const border = isDark ? "#242830" : "#e9ebef";
  const tc = isDark ? "#e5e7eb" : "#111827";
  const tm = isDark ? "#5e636e" : "#98a0ac";

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {selectedMeeting ? (
          /* Detail view */
          <div className="flex h-full flex-col overflow-hidden">
            <div
              className="flex shrink-0 items-center gap-3 border-b px-5 py-3"
              style={{ borderColor: border }}
            >
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-opacity hover:opacity-70"
                style={{
                  background: isDark ? "#1a1d23" : "#f6f7f9",
                  border: "1px solid " + border,
                  color: tc,
                }}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                All meetings
              </button>
              <span
                className="text-[13px] font-semibold truncate"
                style={{ color: tc }}
              >
                {selectedMeeting.title}
              </span>
              <span
                className="text-[11px] shrink-0"
                style={{ color: tm }}
              >
                · Esc to go back
              </span>
            </div>

            <div className="flex-1 overflow-hidden">
              <MeetingDetail
                meeting={selectedMeeting}
                isDark={isDark}
                onCreateTask={handleCreateTask}
              />
            </div>
          </div>
        ) : (
          /* Cards grid */
          <div className="flex h-full flex-col overflow-hidden">
            <div
              className="flex shrink-0 items-center gap-3 border-b px-6 py-4"
              style={{ borderColor: border }}
            >
              <CalendarDays
                className="h-5 w-5"
                style={{ color: "#2d7387" }}
              />
              <div>
                <h1
                  className="text-[15px] font-bold"
                  style={{ color: tc }}
                >
                  Upcoming Meetings
                </h1>
                {meetings.length > 0 && (
                  <p className="text-[11px]" style={{ color: tm }}>
                    {meetings.length +
                      " meeting" +
                      (meetings.length !== 1 ? "s" : "") +
                      " in the next 2 weeks"}
                  </p>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {isLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2
                    className="h-6 w-6 animate-spin"
                    style={{ color: "#2d7387" }}
                  />
                </div>
              ) : meetings.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-2xl"
                    style={{ background: "rgba(45,115,135,0.1)" }}
                  >
                    <CalendarDays
                      className="h-8 w-8"
                      style={{ color: "#2d7387" }}
                    />
                  </div>
                  <div>
                    <p
                      className="text-[14px] font-semibold"
                      style={{ color: tc }}
                    >
                      No upcoming meetings
                    </p>
                    <p
                      className="mt-1 text-[12px]"
                      style={{ color: tm }}
                    >
                      Your next 2 weeks are clear
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 pb-6 lg:grid-cols-2 xl:grid-cols-3">
                  {meetings.map((meeting) => (
                    <MeetingCard
                      key={meeting.id}
                      meeting={meeting}
                      onClick={handleMeetingSelect}
                      isDark={isDark}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Copilot */}
      <div
        className="w-[280px] shrink-0 border-l"
        style={{ borderColor: border }}
      >
        <MeetingCopilot
          selectedMeeting={selectedMeeting}
          meetings={meetings}
          chatHistory={chatHistory}
          onChatHistoryChange={setChatHistory}
        />
      </div>
    </div>
  );
}