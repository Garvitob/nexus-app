import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type TaskItem = {
  id: string;
  title: string;
  description: string;
  sourceType: string;
  sourceId: string | null;
  sourceLink: string | null;
  priority: string;
  status: string;
  dueDate: string | null;
  dueTime: string | null;
  endDate: string | null;
  isLocked: boolean;
  isDbTask: boolean;
  attendees: string[];
  completedAt: string | null;
  createdAt: string;
};

export type TaskFilters = {
  status?: string;
  priority?: string;
  source?: string;
  from?: string;
  to?: string;
};

async function fetchTasks(filters: TaskFilters): Promise<TaskItem[]> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.source) params.set("source", filters.source);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);

  const res = await fetch(`/api/tasks/list?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch tasks");
  const data = await res.json();
  return data.tasks;
}

export function useTasks(filters: TaskFilters = {}) {
  return useQuery({
    queryKey: ["tasks", filters],
    queryFn: () => fetchTasks(filters),
    staleTime: 30_000,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      priority?: string;
      dueDate?: string;
      dueTime?: string;
    }) => {
      const res = await fetch("/api/tasks/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create task");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      title?: string;
      description?: string;
      priority?: string;
      status?: string;
      dueDate?: string | null;
      dueTime?: string | null;
    }) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update task");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete task");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}