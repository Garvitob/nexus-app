"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { TaskPopup } from "./task-popup";
import type { TaskItem } from "@/hooks/use-tasks";
import { useCreateTask } from "@/hooks/use-tasks";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Target,
} from "lucide-react";

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatHour(h: number) {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

function formatDayLabel(date: Date) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatDayDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getNext7Days(): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    return d;
  });
}

// ─── source styling ───────────────────────────────────────────────────────────

const SOURCE_TINT: Record<string, { light: string; dark: string }> = {
  email:    { light: "rgba(239,68,68,0.06)",   dark: "rgba(239,68,68,0.1)" },
  gmail:    { light: "rgba(239,68,68,0.06)",   dark: "rgba(239,68,68,0.1)" },
  jira:     { light: "rgba(59,130,246,0.06)",  dark: "rgba(59,130,246,0.1)" },
  github:   { light: "rgba(139,92,246,0.06)",  dark: "rgba(139,92,246,0.1)" },
  notion:   { light: "rgba(156,163,175,0.06)", dark: "rgba(156,163,175,0.1)" },
  calendar: { light: "rgba(45,115,135,0.08)",  dark: "rgba(45,115,135,0.12)" },
  manual:   { light: "transparent",            dark: "transparent" },
  ai:       { light: "rgba(245,158,11,0.06)",  dark: "rgba(245,158,11,0.1)" },
};

const SOURCE_ICON: Record<string, string> = {
  email: "✉", gmail: "✉", jira: "J", github: "G",
  notion: "N", calendar: "📅", manual: "·", ai: "✦",
};

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "#ef4444", high: "#eab308", normal: "#2d7387", low: "#3b82f6",
};

// ─── col group logic ──────────────────────────────────────────────────────────

type ColGroup =
  | { type: "occupied"; hour: number }
  | { type: "collapsed"; startHour: number; endHour: number; count: number };

function buildColGroups(tasks: TaskItem[], currentHour: number): ColGroup[] {
  const occupiedHours = new Set<number>();
  for (const t of tasks) {
    if (t.dueTime) occupiedHours.add(parseInt(t.dueTime.split(":")[0]));
  }
  occupiedHours.add(currentHour);

  const groups: ColGroup[] = [];
  let i = 0;
  while (i < 24) {
    if (occupiedHours.has(i)) {
      groups.push({ type: "occupied", hour: i });
      i++;
    } else {
      let j = i;
      while (j < 24 && !occupiedHours.has(j)) j++;
      const count = j - i;
      if (count >= 3) {
        groups.push({ type: "collapsed", startHour: i, endHour: j - 1, count });
        i = j;
      } else {
        for (let k = i; k < j; k++) groups.push({ type: "occupied", hour: k });
        i = j;
      }
    }
  }
  return groups;
}

// ─── types ────────────────────────────────────────────────────────────────────

type QuickAdd = { dayDate: Date; hour: number; endHour?: number } | null;
type DragState = { dayDate: Date; startHour: number; currentHour: number } | null;

interface TodoGridProps {
  tasks: TaskItem[];
  isLoading?: boolean;
  filters: { view: string; priority: string; source: string; status: string };
  onFiltersChange: (f: Partial<{ view: string; priority: string; source: string; status: string }>) => void;
  onTaskSelect: (task: TaskItem | null) => void;
  isDark: boolean;
}

// ─── tooltip ─────────────────────────────────────────────────────────────────

function TaskTooltip({ task, isDark }: { task: TaskItem; isDark: boolean }) {
  const bg = isDark ? "#1a1d24" : "#ffffff";
  const borderC = isDark ? "#2d3748" : "#e5e7eb";
  const text = isDark ? "#e5e7eb" : "#111827";
  const muted = isDark ? "#9ca3af" : "#6b7280";

  return (
    <div
      className="absolute bottom-full left-0 z-50 mb-2 w-52 rounded-xl p-3 shadow-xl pointer-events-none"
      style={{ background: bg, border: `1px solid ${borderC}` }}
    >
      <p className="text-[12px] font-semibold leading-tight" style={{ color: text }}>
        {task.title}
      </p>
      {task.description && (
        <p className="mt-1 text-[11px] line-clamp-2 leading-relaxed" style={{ color: muted }}>
          {task.description}
        </p>
      )}
      <div className="mt-2 flex items-center gap-1.5">
        <span
          className="rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide"
          style={{
            background: (PRIORITY_COLOR[task.priority] ?? "#2d7387") + "20",
            color: PRIORITY_COLOR[task.priority] ?? "#2d7387",
          }}
        >
          {task.priority}
        </span>
        <span className="text-[9px] uppercase tracking-wide" style={{ color: muted }}>
          {SOURCE_ICON[task.sourceType] ?? "·"} {task.sourceType}
        </span>
      </div>
    </div>
  );
}

// ─── enhanced task chip ───────────────────────────────────────────────────────

function EnhancedTaskChip({
  task,
  onClick,
  isDark,
}: {
  task: TaskItem;
  onClick: (task: TaskItem) => void;
  isDark: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const priorityColor = PRIORITY_COLOR[task.priority] ?? "#2d7387";
  const sourceIcon = SOURCE_ICON[task.sourceType] ?? "·";
  const tint = SOURCE_TINT[task.sourceType] ?? SOURCE_TINT.manual;
  const isDone = task.status === "done";
  const isUrgent = task.priority === "urgent" && !isDone;

  return (
    <div className="relative">
      <button
        onClick={() => onClick(task)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`group flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left transition-all hover:opacity-90 ${
          isUrgent ? "animate-pulse-subtle" : ""
        } ${isDone ? "opacity-50" : ""}`}
        style={{
          backgroundColor: tint[isDark ? "dark" : "light"],
          borderTop: `1px solid ${isDark ? "#242830" : "#e9ebef"}`,
          borderRight: `1px solid ${isDark ? "#242830" : "#e9ebef"}`,
          borderBottom: `1px solid ${isDark ? "#242830" : "#e9ebef"}`,
          borderLeft: `3px solid ${task.isLocked ? "#2d7387" : priorityColor}`,
          borderRadius: 6,
        }}
      >
        <span
          className="shrink-0 text-[10px] font-mono"
          style={{ color: isDark ? "#6b7280" : "#9ca3af" }}
        >
          {sourceIcon}
        </span>
        <span
          className={`flex-1 truncate text-[11px] font-medium leading-tight ${
            isDone ? "line-through" : ""
          }`}
          style={{ color: isDark ? "#e5e7eb" : "#111827" }}
        >
          {task.title}
        </span>
        {task.isLocked && (
          <span
            className="shrink-0 text-[9px] font-medium uppercase tracking-wide"
            style={{ color: "#2d7387" }}
          >
            cal
          </span>
        )}
        {isDone && (
          <span className="shrink-0 text-[10px]" style={{ color: "#2d7387" }}>
            ✓
          </span>
        )}
      </button>
      {hovered && (task.description || task.priority !== "normal") && (
        <TaskTooltip task={task} isDark={isDark} />
      )}
    </div>
  );
}

// ─── skeleton ────────────────────────────────────────────────────────────────

function GridSkeleton({ isDark }: { isDark: boolean }) {
  const shimmer = isDark ? "#242830" : "#e9ebef";
  const bg = isDark ? "#1a1d23" : "#f6f7f9";
  return (
    <div className="flex-1 overflow-hidden p-4 space-y-3">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div
            className="h-10 w-24 shrink-0 rounded-lg animate-pulse"
            style={{ background: shimmer }}
          />
          {[0, 1, 2, 3, 4].map((j) => (
            <div
              key={j}
              className="h-10 flex-1 rounded-lg animate-pulse"
              style={{
                background: bg,
                animationDelay: `${j * 80}ms`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export function TodoGrid({
  tasks,
  isLoading = false,
  filters,
  onFiltersChange,
  onTaskSelect,
  isDark,
}: TodoGridProps) {
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [quickAdd, setQuickAdd] = useState<QuickAdd>(null);
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [expandedCollapsed, setExpandedCollapsed] = useState<Set<string>>(
    new Set()
  );
  const [dragState, setDragState] = useState<DragState>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const scrollRef = useRef<HTMLDivElement>(null);
  const currentHourRef = useRef<HTMLTableCellElement>(null);
  const createTask = useCreateTask();
  const days = useMemo(() => getNext7Days(), []);

  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Live clock — updates every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Scroll to current hour on load
  useEffect(() => {
    const timer = setTimeout(() => {
      currentHourRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      const inInput = ["INPUT", "TEXTAREA"].includes(tag);

      if (e.key === "Escape") {
        setQuickAdd(null);
        setSelectedTask(null);
        onTaskSelect(null);
        return;
      }
      if (inInput) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        const now = new Date();
        setQuickAdd({ dayDate: now, hour: now.getHours() });
        setQuickAddTitle("");
        return;
      }
      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        currentHourRef.current?.scrollIntoView({
          behavior: "smooth",
          inline: "center",
        });
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        scrollRef.current?.scrollBy({ left: 160, behavior: "smooth" });
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        scrollRef.current?.scrollBy({ left: -160, behavior: "smooth" });
        return;
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onTaskSelect]);

  const visibleDays = useMemo(
    () => (filters.view === "today" ? days.slice(0, 1) : days),
    [days, filters.view]
  );

  const colGroups = useMemo(
    () => buildColGroups(tasks, currentHour),
    [tasks, currentHour]
  );

  function getTasksForDayHour(dayDate: Date, hour: number): TaskItem[] {
    return tasks.filter((t) => {
      if (!t.dueDate || !t.dueTime) return false;
      const d = new Date(t.dueDate);
      return (
        d.toDateString() === dayDate.toDateString() &&
        parseInt(t.dueTime.split(":")[0]) === hour
      );
    });
  }

  function getAllDayTasks(dayDate: Date): TaskItem[] {
    return tasks.filter((t) => {
      if (!t.dueDate) return false;
      return (
        new Date(t.dueDate).toDateString() === dayDate.toDateString() &&
        !t.dueTime
      );
    });
  }

  function getDayTaskCount(dayDate: Date): number {
    return tasks.filter((t) => {
      if (!t.dueDate) return false;
      return new Date(t.dueDate).toDateString() === dayDate.toDateString();
    }).length;
  }

  function getDayUrgentCount(dayDate: Date): number {
    return tasks.filter((t) => {
      if (!t.dueDate) return false;
      return (
        new Date(t.dueDate).toDateString() === dayDate.toDateString() &&
        t.priority === "urgent" &&
        t.status !== "done"
      );
    }).length;
  }

  function handleTaskClick(task: TaskItem) {
    setSelectedTask(task);
    onTaskSelect(task);
  }

  function handlePopupClose() {
    setSelectedTask(null);
    onTaskSelect(null);
  }

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!quickAddTitle.trim() || !quickAdd) return;
    const dueDate = new Date(quickAdd.dayDate);
    dueDate.setHours(quickAdd.hour, 0, 0, 0);
    await createTask.mutateAsync({
      title: quickAddTitle.trim(),
      dueDate: dueDate.toISOString(),
      dueTime: `${String(quickAdd.hour).padStart(2, "0")}:00`,
    });
    setQuickAdd(null);
    setQuickAddTitle("");
  }

  function toggleExpanded(key: string) {
    setExpandedCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleCellMouseDown(
    dayDate: Date,
    hour: number,
    hasTasks: boolean
  ) {
    if (hasTasks) return;
    setDragState({ dayDate, startHour: hour, currentHour: hour });
  }

  function handleCellMouseEnter(dayDate: Date, hour: number) {
    if (!dragState) return;
    if (dragState.dayDate.toDateString() !== dayDate.toDateString()) return;
    setDragState((prev) =>
      prev ? { ...prev, currentHour: hour } : null
    );
  }

  function handleCellMouseUp(dayDate: Date, hour: number) {
    if (!dragState) return;
    const startH = Math.min(dragState.startHour, hour);
    const endH = Math.max(dragState.startHour, hour);
    setDragState(null);
    setQuickAdd({ dayDate, hour: startH, endHour: endH });
    setQuickAddTitle("");
  }

  const border = isDark ? "#242830" : "#e9ebef";
  const textMuted = isDark ? "#5e636e" : "#98a0ac";
  const DAY_COL_WIDTH = 120;
  const HOUR_COL_WIDTH = 148;
  const COLLAPSED_COL_WIDTH = 52;
  const HEADER_HEIGHT = 44;

  const timeLinePct = (currentMinute / 60) * 100;

  const totalTasks = tasks.filter((t) => t.status !== "done").length;
  const urgentTasks = tasks.filter(
    (t) => t.priority === "urgent" && t.status !== "done"
  ).length;

  // ─── slot cell renderer ────────────────────────────────────────────────────

  function renderSlotCell(dayDate: Date, hour: number) {
    const dayStr = dayDate.toDateString();
    const isToday = dayStr === today.toDateString();
    const slotTasks = getTasksForDayHour(dayDate, hour);
    const isCurrentHour = hour === currentHour && isToday;
    const isQA =
      quickAdd?.dayDate.toDateString() === dayStr &&
      quickAdd.hour === hour;
    const isDragging =
      dragState?.dayDate.toDateString() === dayStr &&
      hour >= Math.min(dragState.startHour, dragState.currentHour) &&
      hour <= Math.max(dragState.startHour, dragState.currentHour);

    return (
      <td
        key={`${dayStr}_${hour}`}
        className="border-r border-b align-top relative"
        style={{
          width: HOUR_COL_WIDTH,
          minWidth: HOUR_COL_WIDTH,
          borderColor: border,
          background: isDragging
            ? isDark
              ? "rgba(45,115,135,0.2)"
              : "rgba(45,115,135,0.08)"
            : isCurrentHour
            ? isDark
              ? "rgba(21,40,46,0.4)"
              : "rgba(228,239,241,0.55)"
            : isToday
            ? isDark
              ? "rgba(21,40,46,0.08)"
              : "rgba(228,239,241,0.12)"
            : "transparent",
          cursor: slotTasks.length === 0 ? "pointer" : "default",
          userSelect: "none",
          padding: "4px 6px",
        }}
        onMouseDown={() =>
          handleCellMouseDown(dayDate, hour, slotTasks.length > 0)
        }
        onMouseEnter={() => handleCellMouseEnter(dayDate, hour)}
        onMouseUp={() => handleCellMouseUp(dayDate, hour)}
        onClick={() => {
          if (slotTasks.length === 0 && !isQA && !dragState) {
            setQuickAdd({ dayDate, hour });
            setQuickAddTitle("");
          }
        }}
      >
        {/* Live time indicator line */}
        {isCurrentHour && (
          <div
            className="absolute left-0 right-0 z-10 pointer-events-none"
            style={{
              top: `${timeLinePct}%`,
              height: 2,
              background: "#2d7387",
              opacity: 0.85,
            }}
          >
            <div
              className="absolute -top-[3px] -left-[3px] h-2 w-2 rounded-full"
              style={{ background: "#2d7387" }}
            />
          </div>
        )}

        {isQA ? (
          <form
            onSubmit={handleQuickAdd}
            className="flex flex-col gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              value={quickAddTitle}
              onChange={(e) => setQuickAddTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setQuickAdd(null)}
              placeholder={
                quickAdd?.endHour && quickAdd.endHour !== quickAdd.hour
                  ? `${formatHour(quickAdd.hour)} – ${formatHour(
                      (quickAdd.endHour ?? quickAdd.hour) + 1
                    )}`
                  : "Task name..."
              }
              className="w-full rounded-md px-2 py-1 text-[11px] outline-none"
              style={{
                border: `1.5px solid #2d7387`,
                background: isDark
                  ? "rgba(45,115,135,0.12)"
                  : "rgba(45,115,135,0.06)",
                color: isDark ? "#e5e7eb" : "#111827",
              }}
            />
            <div className="flex gap-1.5 items-center">
              <button
                type="submit"
                className="rounded px-2 py-0.5 text-[10px] font-semibold text-white"
                style={{ background: "#2d7387" }}
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setQuickAdd(null)}
                className="text-[10px]"
                style={{ color: textMuted }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-0.5">
            {slotTasks.slice(0, 3).map((t) => (
              <EnhancedTaskChip
                key={t.id}
                task={t}
                onClick={handleTaskClick}
                isDark={isDark}
              />
            ))}
            {slotTasks.length > 3 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleTaskClick(slotTasks[3]);
                }}
                className="rounded px-1.5 py-0.5 text-[10px] font-medium text-left hover:opacity-80 transition-opacity"
                style={{ color: "#2d7387" }}
              >
                +{slotTasks.length - 3} more
              </button>
            )}
          </div>
        )}
      </td>
    );
  }

  // ─── render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex h-full flex-col overflow-hidden"
      onMouseUp={() => setDragState(null)}
      onMouseLeave={() => setDragState(null)}
    >
      {/* ── Filter bar ── */}
      <div
        className="flex shrink-0 items-center gap-2 border-b px-4 py-2 flex-wrap"
        style={{ borderColor: border }}
      >
        {/* View toggle */}
        <div
          className="flex items-center gap-0.5 rounded-lg p-0.5"
          style={{ background: isDark ? "#1a1d23" : "#f6f7f9" }}
        >
          {["7days", "today"].map((v) => (
            <button
              key={v}
              onClick={() => onFiltersChange({ view: v })}
              className="rounded-md px-2.5 py-1 text-[11px] font-medium transition-all"
              style={{
                background:
                  filters.view === v
                    ? isDark
                      ? "#242830"
                      : "#ffffff"
                    : "transparent",
                color:
                  filters.view === v
                    ? isDark
                      ? "#e5e7eb"
                      : "#111827"
                    : textMuted,
                boxShadow:
                  filters.view === v
                    ? "0 1px 3px rgba(0,0,0,0.1)"
                    : "none",
              }}
            >
              {v === "7days" ? "7 Days" : "Today"}
            </button>
          ))}
        </div>

        {/* Jump to now */}
        <button
          onClick={() =>
            currentHourRef.current?.scrollIntoView({
              behavior: "smooth",
              inline: "center",
            })
          }
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium hover:opacity-80 transition-opacity"
          style={{
            background: isDark ? "#1a1d23" : "#f6f7f9",
            color: "#2d7387",
            border: `1px solid ${border}`,
          }}
        >
          <Target className="h-3 w-3" />
          Now
        </button>

        {/* Priority */}
        <select
          value={filters.priority}
          onChange={(e) => onFiltersChange({ priority: e.target.value })}
          className="rounded-lg px-2 py-1 text-[11px] outline-none"
          style={{
            background: isDark ? "#1a1d23" : "#f6f7f9",
            color: isDark ? "#e5e7eb" : "#111827",
            border: `1px solid ${border}`,
          }}
        >
          {["all", "urgent", "high", "normal", "low"].map((p) => (
            <option key={p} value={p}>
              {p === "all"
                ? "All priorities"
                : p.charAt(0).toUpperCase() + p.slice(1)}
            </option>
          ))}
        </select>

        {/* Source */}
        <select
          value={filters.source}
          onChange={(e) => onFiltersChange({ source: e.target.value })}
          className="rounded-lg px-2 py-1 text-[11px] outline-none"
          style={{
            background: isDark ? "#1a1d23" : "#f6f7f9",
            color: isDark ? "#e5e7eb" : "#111827",
            border: `1px solid ${border}`,
          }}
        >
          {[
            "all",
            "manual",
            "email",
            "jira",
            "github",
            "notion",
            "calendar",
          ].map((s) => (
            <option key={s} value={s}>
              {s === "all"
                ? "All sources"
                : s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>

        {/* Status */}
        <button
          onClick={() =>
            onFiltersChange({
              status:
                filters.status === "pending" ? "all" : "pending",
            })
          }
          className="rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors"
          style={{
            background:
              filters.status === "all"
                ? "#2d7387"
                : isDark
                ? "#1a1d23"
                : "#f6f7f9",
            color: filters.status === "all" ? "#ffffff" : textMuted,
            border: `1px solid ${border}`,
          }}
        >
          {filters.status === "all" ? "All tasks" : "Pending only"}
        </button>

        {/* Stats */}
        <div className="flex items-center gap-2 ml-1">
          {totalTasks > 0 && (
            <span className="text-[11px]" style={{ color: textMuted }}>
              {totalTasks} pending
            </span>
          )}
          {urgentTasks > 0 && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{
                background: "rgba(239,68,68,0.12)",
                color: "#ef4444",
              }}
            >
              {urgentTasks} urgent
            </span>
          )}
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() =>
              scrollRef.current?.scrollBy({
                left: -HOUR_COL_WIDTH * 2,
                behavior: "smooth",
              })
            }
            className="rounded-lg p-1.5 hover:opacity-70 transition-opacity"
            style={{
              background: isDark ? "#1a1d23" : "#f6f7f9",
              border: `1px solid ${border}`,
            }}
            title="Scroll left (←)"
          >
            <ChevronLeft
              className="h-3.5 w-3.5"
              style={{ color: textMuted }}
            />
          </button>
          <button
            onClick={() =>
              scrollRef.current?.scrollBy({
                left: HOUR_COL_WIDTH * 2,
                behavior: "smooth",
              })
            }
            className="rounded-lg p-1.5 hover:opacity-70 transition-opacity"
            style={{
              background: isDark ? "#1a1d23" : "#f6f7f9",
              border: `1px solid ${border}`,
            }}
            title="Scroll right (→)"
          >
            <ChevronRight
              className="h-3.5 w-3.5"
              style={{ color: textMuted }}
            />
          </button>
          <button
            onClick={() => {
              const now = new Date();
              setQuickAdd({ dayDate: now, hour: now.getHours() });
              setQuickAddTitle("");
            }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ background: "#2d7387" }}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            Add task
          </button>
        </div>
      </div>

      {/* ── Loading skeleton ── */}
      {isLoading && <GridSkeleton isDark={isDark} />}

      {/* ── Empty state ── */}
      {!isLoading && tasks.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center px-6">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ background: "rgba(45,115,135,0.1)" }}
          >
            <Calendar className="h-8 w-8" style={{ color: "#2d7387" }} />
          </div>
          <div>
            <p
              className="text-[14px] font-semibold"
              style={{ color: isDark ? "#e5e7eb" : "#111827" }}
            >
              No tasks yet
            </p>
            <p
              className="mt-1 text-[12px]"
              style={{ color: textMuted }}
            >
              Click any cell or press{" "}
              <kbd
                className="rounded px-1.5 py-0.5 text-[10px]"
                style={{
                  background: isDark ? "#1a1d23" : "#f6f7f9",
                  border: `1px solid ${border}`,
                  color: textMuted,
                  fontFamily: "monospace",
                }}
              >
                N
              </kbd>{" "}
              to add your first task
            </p>
          </div>
        </div>
      )}

      {/* ── Grid ── */}
      {!isLoading && (
        <div
          ref={scrollRef}
          className="flex-1 overflow-auto todo-scroll"
        >
          <table
            className="border-collapse"
            style={{ tableLayout: "fixed" }}
          >
            {/* Time header row — X axis */}
            <thead>
              <tr style={{ height: HEADER_HEIGHT }}>
                {/* Top-left corner cell */}
                <th
                  className="sticky left-0 top-0 z-30 border-r border-b"
                  style={{
                    width: DAY_COL_WIDTH,
                    minWidth: DAY_COL_WIDTH,
                    background: isDark ? "#131519" : "#f6f7f9",
                    borderColor: border,
                  }}
                >
                  <span
                    className="block px-3 text-[9px] font-medium"
                    style={{ color: textMuted }}
                  >
                    days ↓ · time →
                  </span>
                </th>

                {colGroups.map((group) => {
                  if (group.type === "collapsed") {
                    const key = `collapsed_${group.startHour}`;
                    const isExpanded = expandedCollapsed.has(key);
                    const isNight =
                      group.startHour === 0 && group.count >= 6;

                    if (isExpanded) {
                      return Array.from(
                        { length: group.endHour - group.startHour + 1 },
                        (_, idx) => {
                          const h = group.startHour + idx;
                          const isCurrent = h === currentHour;
                          return (
                            <th
                              key={`exp_${h}`}
                              ref={isCurrent ? currentHourRef : undefined}
                              className="sticky top-0 z-20 border-r border-b px-3 text-left"
                              style={{
                                width: HOUR_COL_WIDTH,
                                minWidth: HOUR_COL_WIDTH,
                                background: isCurrent
                                  ? isDark
                                    ? "#15282e"
                                    : "#e4eff1"
                                  : isDark
                                  ? "#131519"
                                  : "#f6f7f9",
                                borderColor: border,
                              }}
                            >
                              <div className="flex items-center gap-1">
                                <span
                                  className="text-[11px] font-medium"
                                  style={{
                                    color: isCurrent
                                      ? "#2d7387"
                                      : textMuted,
                                  }}
                                >
                                  {formatHour(h)}
                                </span>
                                {/* Collapse button on first expanded hour */}
                                {idx === 0 && (
                                  <button
                                    onClick={() => toggleExpanded(key)}
                                    className="ml-auto text-[9px] hover:opacity-70 transition-opacity"
                                    style={{ color: textMuted }}
                                    title="Collapse"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            </th>
                          );
                        }
                      );
                    }

                    return (
                      <th
                        key={key}
                        className="sticky top-0 z-20 border-r border-b text-center cursor-pointer hover:opacity-80 transition-opacity"
                        style={{
                          width: COLLAPSED_COL_WIDTH,
                          minWidth: COLLAPSED_COL_WIDTH,
                          background: isDark ? "#0f1114" : "#fafafa",
                          borderColor: border,
                          borderBottomStyle: "dashed",
                        }}
                        onClick={() => toggleExpanded(key)}
                        title={`${group.count} hrs free — click to expand`}
                      >
                        <div className="flex flex-col items-center justify-center gap-0.5 py-1.5">
                          <ChevronRight
                            className="h-3 w-3"
                            style={{ color: textMuted }}
                          />
                          <span
                            className="text-[8px] leading-none"
                            style={{ color: textMuted }}
                          >
                            {isNight ? "night" : `${group.count}h`}
                          </span>
                          <span
                            className="text-[8px] leading-none"
                            style={{ color: textMuted }}
                          >
                            free
                          </span>
                        </div>
                      </th>
                    );
                  }

                  const h = group.hour;
                  const isCurrent = h === currentHour;
                  return (
                    <th
                      key={`hour_${h}`}
                      ref={isCurrent ? currentHourRef : undefined}
                      className="sticky top-0 z-20 border-r border-b px-3 text-left"
                      style={{
                        width: HOUR_COL_WIDTH,
                        minWidth: HOUR_COL_WIDTH,
                        background: isCurrent
                          ? isDark
                            ? "#15282e"
                            : "#e4eff1"
                          : isDark
                          ? "#131519"
                          : "#f6f7f9",
                        borderColor: border,
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <span
                          className="text-[11px] font-semibold"
                          style={{
                            color: isCurrent
                              ? "#2d7387"
                              : isDark
                              ? "#e5e7eb"
                              : "#111827",
                          }}
                        >
                          {formatHour(h)}
                        </span>
                        {isCurrent && (
                          <span
                            className="inline-block h-1.5 w-1.5 rounded-full"
                            style={{ background: "#2d7387" }}
                          />
                        )}
                      </div>
                      {isCurrent && (
                        <span
                          className="text-[9px] tabular"
                          style={{ color: "#2d7387" }}
                        >
                          {currentTime.toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Day rows — Y axis */}
            <tbody>
              {visibleDays.map((dayDate) => {
                const dayStr = dayDate.toDateString();
                const isToday = dayStr === today.toDateString();
                const allDayTasks = getAllDayTasks(dayDate);
                const dayCount = getDayTaskCount(dayDate);
                const urgentCount = getDayUrgentCount(dayDate);

                return (
                  <React.Fragment key={dayStr}>
                    {/* All-day task row */}
                    {allDayTasks.length > 0 && (
                      <tr style={{ height: 28 }}>
                        <td
                          className="sticky left-0 z-10 border-r border-b px-3 align-middle text-[10px]"
                          style={{
                            width: DAY_COL_WIDTH,
                            minWidth: DAY_COL_WIDTH,
                            background: isToday
                              ? isDark
                                ? "#15282e"
                                : "#e4eff1"
                              : isDark
                              ? "#131519"
                              : "#f6f7f9",
                            borderColor: border,
                            color: textMuted,
                          }}
                        >
                          all day
                        </td>
                        {colGroups.map((group) => {
                          if (group.type === "collapsed") {
                            const isExpanded = expandedCollapsed.has(
                              `collapsed_${group.startHour}`
                            );
                            if (isExpanded) {
                              return Array.from(
                                {
                                  length:
                                    group.endHour - group.startHour + 1,
                                },
                                (_, idx) => (
                                  <td
                                    key={`allday_${dayStr}_exp_${
                                      group.startHour + idx
                                    }`}
                                    className="border-r border-b"
                                    style={{
                                      borderColor: border,
                                      width: HOUR_COL_WIDTH,
                                    }}
                                  />
                                )
                              );
                            }
                            return (
                              <td
                                key={`allday_${dayStr}_col_${group.startHour}`}
                                className="border-r border-b"
                                style={{
                                  borderColor: border,
                                  width: COLLAPSED_COL_WIDTH,
                                  background: isDark
                                    ? "#0f1114"
                                    : "#fafafa",
                                }}
                              />
                            );
                          }

                          return (
                            <td
                              key={`allday_${dayStr}_${group.hour}`}
                              className="border-r border-b px-1 py-0.5"
                              style={{
                                borderColor: border,
                                width: HOUR_COL_WIDTH,
                              }}
                            >
                              <div className="flex flex-wrap gap-1">
                                {allDayTasks.map((t) => (
                                  <button
                                    key={t.id}
                                    onClick={() => handleTaskClick(t)}
                                    className="rounded-full px-2 py-0.5 text-[10px] font-medium hover:opacity-80 transition-opacity"
                                    style={{
                                      background: isDark
                                        ? "#1f2937"
                                        : "#f3f4f6",
                                      color: isDark
                                        ? "#e5e7eb"
                                        : "#111827",
                                      border: `1px solid ${border}`,
                                    }}
                                  >
                                    {t.title}
                                  </button>
                                ))}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    )}

                    {/* Main day row */}
                    <tr>
                      {/* Day label — sticky left */}
                      <td
                        className="sticky left-0 z-10 border-r border-b px-3 align-top pt-2"
                        style={{
                          width: DAY_COL_WIDTH,
                          minWidth: DAY_COL_WIDTH,
                          background: isToday
                            ? isDark
                              ? "#15282e"
                              : "#e4eff1"
                            : isDark
                            ? "#131519"
                            : "#f6f7f9",
                          borderColor: border,
                          minHeight: 72,
                        }}
                      >
                        <span
                          className="block text-[12px] font-semibold"
                          style={{
                            color: isToday
                              ? "#2d7387"
                              : isDark
                              ? "#e5e7eb"
                              : "#111827",
                          }}
                        >
                          {formatDayLabel(dayDate)}
                        </span>
                        <span
                          className="block text-[10px]"
                          style={{ color: textMuted }}
                        >
                          {formatDayDate(dayDate)}
                        </span>
                        {dayCount > 0 && (
                          <div className="mt-1.5 flex flex-col gap-0.5">
                            <span
                              className="rounded-full px-1.5 py-0.5 text-[9px] font-medium w-fit"
                              style={{
                                background: isDark
                                  ? "#1f2937"
                                  : "#f3f4f6",
                                color: textMuted,
                              }}
                            >
                              {dayCount} task
                              {dayCount !== 1 ? "s" : ""}
                            </span>
                            {urgentCount > 0 && (
                              <span
                                className="rounded-full px-1.5 py-0.5 text-[9px] font-medium w-fit"
                                style={{
                                  background: "rgba(239,68,68,0.12)",
                                  color: "#ef4444",
                                }}
                              >
                                {urgentCount} urgent
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Time slot cells */}
                      {colGroups.map((group) => {
                        if (group.type === "collapsed") {
                          const key = `collapsed_${group.startHour}`;
                          const isExpanded = expandedCollapsed.has(key);

                          if (isExpanded) {
                            return Array.from(
                              {
                                length:
                                  group.endHour - group.startHour + 1,
                              },
                              (_, idx) =>
                                renderSlotCell(
                                  dayDate,
                                  group.startHour + idx
                                )
                            );
                          }

                          return (
                            <td
                              key={`${dayStr}_${key}`}
                              className="border-r border-b align-middle text-center cursor-pointer hover:opacity-80 transition-opacity"
                              style={{
                                width: COLLAPSED_COL_WIDTH,
                                minWidth: COLLAPSED_COL_WIDTH,
                                borderColor: border,
                                borderRightStyle: "dashed",
                                background: isDark
                                  ? "#0f1114"
                                  : "#fafafa",
                              }}
                              onClick={() => toggleExpanded(key)}
                            />
                          );
                        }

                        return renderSlotCell(dayDate, group.hour);
                      })}
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Keyboard hint bar ── */}
      <div
        className="shrink-0 flex items-center gap-4 border-t px-4 py-1.5"
        style={{ borderColor: border }}
      >
        {[
          ["N", "new task"],
          ["T", "jump to now"],
          ["← →", "scroll"],
          ["Drag", "multi-hour"],
          ["Esc", "close"],
        ].map(([key, label]) => (
          <div key={key} className="flex items-center gap-1">
            <kbd
              className="rounded px-1.5 py-0.5 text-[9px]"
              style={{
                background: isDark ? "#1a1d23" : "#f6f7f9",
                border: `1px solid ${border}`,
                color: textMuted,
                fontFamily: "monospace",
              }}
            >
              {key}
            </kbd>
            <span className="text-[10px]" style={{ color: textMuted }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* ── Task popup ── */}
      {selectedTask && (
        <TaskPopup
          task={selectedTask}
          onClose={handlePopupClose}
          isDark={isDark}
        />
      )}
    </div>
  );
}