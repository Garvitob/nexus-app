"use client";

import { cn } from "@/lib/utils";
import type { TaskItem } from "@/hooks/use-tasks";

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444",
  high: "#eab308",
  normal: "#2d7387",
  low: "#3b82f6",
};

const SOURCE_ICONS: Record<string, string> = {
  email: "✉",
  gmail: "✉",
  jira: "J",
  github: "G",
  notion: "N",
  calendar: "📅",
  manual: "·",
  ai: "✦",
};

interface TaskChipProps {
  task: TaskItem;
  onClick: (task: TaskItem) => void;
  isDark: boolean;
}

export function TaskChip({ task, onClick, isDark }: TaskChipProps) {
  const priorityColor = PRIORITY_COLORS[task.priority] ?? "#2d7387";
  const sourceIcon = SOURCE_ICONS[task.sourceType] ?? "·";
  const isDone = task.status === "done";
  const accentColor = task.isLocked ? "#2d7387" : priorityColor;

  return (
    <button
      onClick={() => onClick(task)}
      className={cn(
        "group flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left transition-all hover:opacity-80",
        isDone && "opacity-50"
      )}
      style={{
        backgroundColor: isDark
          ? "rgba(255,255,255,0.04)"
          : "rgba(0,0,0,0.03)",
        borderTop: `1px solid ${isDark ? "#242830" : "#e9ebef"}`,
        borderRight: `1px solid ${isDark ? "#242830" : "#e9ebef"}`,
        borderBottom: `1px solid ${isDark ? "#242830" : "#e9ebef"}`,
        borderLeft: `3px solid ${accentColor}`,
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
        className={cn(
          "flex-1 truncate text-[11px] font-medium leading-tight",
          isDone && "line-through"
        )}
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
    </button>
  );
}