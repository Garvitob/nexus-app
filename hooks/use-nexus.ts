import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type NexusSession = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
};

export type NexusMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
};

async function fetchSessions(): Promise<NexusSession[]> {
  const res = await fetch("/api/nexus/sessions");
  if (!res.ok) throw new Error("Failed to fetch sessions");
  const data = await res.json();
  return data.sessions;
}

async function fetchSessionMessages(id: string): Promise<NexusMessage[]> {
  const res = await fetch(`/api/nexus/sessions/${id}`);
  if (!res.ok) throw new Error("Failed to fetch session");
  const data = await res.json();
  return data.session.messages;
}

export function useNexusSessions() {
  return useQuery({
    queryKey: ["nexus-sessions"],
    queryFn: fetchSessions,
    staleTime: 30 * 1000,
  });
}

export function useSessionMessages(sessionId: string | null) {
  return useQuery({
    queryKey: ["nexus-session", sessionId],
    queryFn: () => fetchSessionMessages(sessionId!),
    enabled: !!sessionId,
    staleTime: 0,
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/nexus/sessions", { method: "POST" });
      if (!res.ok) throw new Error("Failed to create session");
      const data = await res.json();
      return data.session as NexusSession;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nexus-sessions"] });
    },
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/nexus/sessions/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete session");
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nexus-sessions"] });
    },
  });
}

export function useRenameSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const res = await fetch(`/api/nexus/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("Failed to rename session");
      return { id, title };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["nexus-sessions"] });
    },
  });
}