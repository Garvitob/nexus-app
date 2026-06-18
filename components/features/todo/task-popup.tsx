"use client";

import { useState, useEffect, useRef } from "react";
import { X, Trash2, CheckCircle2, Circle, Loader2 } from "lucide-react";
import type { TaskItem } from "@/hooks/use-tasks";
import { useUpdateTask, useDeleteTask } from "@/hooks/use-tasks";

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", color: "#3b82f6" },
  { value: "normal", label: "Normal", color: "#2d7387" },
  { value: "high", label: "High", color: "#eab308" },
  { value: "urgent", label: "Urgent", color: "#ef4444" },
];

const SOURCE_LABELS: Record<string, string> = {
  manual: "Manual",
  email: "Gmail",
  gmail: "Gmail",
  jira: "Jira",
  github: "GitHub",
  notion: "Notion",
  calendar: "Calendar",
  ai: "AI",
};

interface TaskPopupProps {
  task: TaskItem;
  onClose: () => void;
  isDark: boolean;
}

export function TaskPopup({ task, onClose, isDark }: TaskPopupProps) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState(task.priority);
  const [status, setStatus] = useState(task.status);
  const [dueDate, setDueDate] = useState(
    task.dueDate ? task.dueDate.slice(0, 10) : ""
  );
  const [dueTime, setDueTime] = useState(task.dueTime ?? "");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  const canEdit = task.isDbTask && !task.isLocked;

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        handleSave();
        return;
      }
      if (e.key === "d" && !["INPUT", "TEXTAREA"].includes(tag)) {
        handleToggleDone();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  async function handleSave() {
    if (!canEdit) return;
    setIsSaving(true);
    try {
      await updateTask.mutateAsync({
        id: task.id,
        title,
        description,
        priority,
        status,
        dueDate: dueDate || null,
        dueTime: dueTime || null,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleDone() {
    if (!task.isDbTask) return;
    const newStatus = status === "done" ? "pending" : "done";
    setStatus(newStatus);
    await updateTask.mutateAsync({ id: task.id, status: newStatus });
  }

  async function handleDelete() {
    if (!task.isDbTask) return;
    await deleteTask.mutateAsync(task.id);
    onClose();
  }

  const bg = isDark ? "#1a1d24" : "#ffffff";
  const borderColor = isDark ? "#2d3748" : "#e5e7eb";
  const labelColor = isDark ? "#9ca3af" : "#6b7280";
  const textColor = isDark ? "#e5e7eb" : "#111827";
  const inputBg = isDark ? "#111318" : "#f9fafb";
  const inputBorder = isDark ? "#2d3748" : "#e5e7eb";

  return (
    <div>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        style={{ background: "rgba(0,0,0,0.3)" }}
      />
      <div
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl p-5 shadow-2xl"
        style={{ background: bg, border: `1px solid ${borderColor}` }}
      >
        {/* Header row */}
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {task.isDbTask && (
              <button
                onClick={handleToggleDone}
                className="shrink-0 transition-opacity hover:opacity-70"
              >
                {status === "done" ? (
                  <CheckCircle2
                    className="h-5 w-5"
                    style={{ color: "#2d7387" }}
                  />
                ) : (
                  <Circle
                    className="h-5 w-5"
                    style={{ color: isDark ? "#4b5563" : "#d1d5db" }}
                  />
                )}
              </button>
            )}
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
              style={{
                background: isDark ? "#1f2937" : "#f3f4f6",
                color: labelColor,
              }}
            >
              {SOURCE_LABELS[task.sourceType] ?? task.sourceType}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 transition-colors hover:opacity-70"
            style={{ color: labelColor }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Title */}
        <input
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={!canEdit}
          className="mb-3 w-full rounded-lg px-3 py-2 text-[14px] font-semibold outline-none"
          style={{
            background: canEdit ? inputBg : "transparent",
            border: canEdit ? `1px solid ${inputBorder}` : "none",
            color: textColor,
          }}
          placeholder="Task title"
        />

        {/* Description */}
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={!canEdit}
          rows={3}
          className="mb-4 w-full resize-none rounded-lg px-3 py-2 text-[12.5px] outline-none"
          style={{
            background: canEdit ? inputBg : "transparent",
            border: canEdit ? `1px solid ${inputBorder}` : "none",
            color: isDark ? "#9ca3af" : "#6b7280",
          }}
          placeholder="Add description..."
        />

        {/* Priority */}
        <div className="mb-3">
          <p
            className="mb-1.5 text-[11px] font-medium"
            style={{ color: labelColor }}
          >
            Priority
          </p>
          <div className="flex gap-1.5">
            {PRIORITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => canEdit && setPriority(opt.value)}
                disabled={!canEdit}
                className="rounded-full px-2.5 py-1 text-[11px] font-medium transition-all"
                style={{
                  background:
                    priority === opt.value
                      ? opt.color
                      : isDark
                      ? "#1f2937"
                      : "#f3f4f6",
                  color:
                    priority === opt.value
                      ? "#ffffff"
                      : isDark
                      ? "#9ca3af"
                      : "#6b7280",
                  opacity: !canEdit && priority !== opt.value ? 0.4 : 1,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Due date and time */}
        <div className="mb-4 flex gap-2">
          <div className="flex-1">
            <p
              className="mb-1.5 text-[11px] font-medium"
              style={{ color: labelColor }}
            >
              Due date
            </p>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={!canEdit}
              className="w-full rounded-lg px-3 py-1.5 text-[12px] outline-none"
              style={{
                background: inputBg,
                border: `1px solid ${inputBorder}`,
                color: textColor,
              }}
            />
          </div>
          <div className="flex-1">
            <p
              className="mb-1.5 text-[11px] font-medium"
              style={{ color: labelColor }}
            >
              Time
            </p>
            <input
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              disabled={!canEdit}
              className="w-full rounded-lg px-3 py-1.5 text-[12px] outline-none"
              style={{
                background: inputBg,
                border: `1px solid ${inputBorder}`,
                color: textColor,
              }}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {canEdit && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: "#2d7387" }}
              >
                {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
                Save
              </button>
            )}
            {task.isDbTask && (
              <button
                onClick={handleToggleDone}
                className="rounded-lg px-3 py-1.5 text-[12px] font-medium"
                style={{
                  background: isDark ? "#1f2937" : "#f3f4f6",
                  color: textColor,
                }}
              >
                {status === "done" ? "Mark pending" : "Mark done"}
              </button>
            )}
          </div>

          {task.isDbTask && (
            <div>
              {showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-[11px]" style={{ color: "#ef4444" }}>
                    Delete?
                  </span>
                  <button
                    onClick={handleDelete}
                    className="text-[11px] font-medium"
                    style={{ color: "#ef4444" }}
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="text-[11px]"
                    style={{ color: labelColor }}
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="rounded-lg p-1.5 hover:opacity-70"
                  style={{ color: "#ef4444" }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Keyboard hint */}
        <p
          className="mt-3 text-[10px]"
          style={{ color: isDark ? "#4b5563" : "#d1d5db" }}
        >
          {canEdit ? "⌘↵ save · D done · Esc close" : "Esc close"}
        </p>
      </div>
    </div>
  );
}