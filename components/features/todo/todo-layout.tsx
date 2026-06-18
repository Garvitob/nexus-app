"use client";

import { useState, useEffect, useMemo } from "react";
import { useTasks } from "@/hooks/use-tasks";
import type { TaskItem } from "@/hooks/use-tasks";
import { TodoGrid } from "./todo-grid";
import { TodoCopilot } from "./todo-copilot";
import type { TodoCopilotMessage } from "./todo-copilot";

type Filters = {
  view: string;
  priority: string;
  source: string;
  status: string;
};

export function TodoLayout() {
  const [isDark, setIsDark] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [chatHistory, setChatHistory] = useState<TodoCopilotMessage[]>([]);
  const [filters, setFilters] = useState<Filters>({
    view: "7days",
    priority: "all",
    source: "all",
    status: "pending",
  });

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

  const queryFilters = useMemo(
    () => ({
      ...(filters.status !== "all" ? { status: filters.status } : {}),
      ...(filters.priority !== "all" ? { priority: filters.priority } : {}),
      ...(filters.source !== "all" ? { source: filters.source } : {}),
    }),
    [filters]
  );

  const { data: tasks = [], isLoading } = useTasks(queryFilters);

  function handleFiltersChange(partial: Partial<Filters>) {
    setFilters((prev) => ({ ...prev, ...partial }));
  }

  function handleTaskSelect(task: TaskItem | null) {
    if (task?.id !== selectedTask?.id) {
      setChatHistory([]);
    }
    setSelectedTask(task);
  }

  const border = isDark ? "#242830" : "#e9ebef";

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main grid */}
      <div className="flex-1 overflow-hidden">
        <TodoGrid
          tasks={tasks}
          isLoading={isLoading}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onTaskSelect={handleTaskSelect}
          isDark={isDark}
        />
      </div>

      {/* Copilot panel */}
      <div
        className="w-[280px] shrink-0 border-l"
        style={{ borderColor: border }}
      >
        <TodoCopilot
          selectedTask={selectedTask}
          tasks={tasks}
          chatHistory={chatHistory}
          onChatHistoryChange={setChatHistory}
        />
      </div>
    </div>
  );
}