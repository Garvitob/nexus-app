"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  useQuery,
} from "@tanstack/react-query";
import { useState, useCallback } from "react";
import type { EmailRow } from "@/app/api/emails/list/route";

export type { EmailRow };

async function fetchEmailPage(
  category: string,
  pageToken?: string
): Promise<{ emails: EmailRow[]; nextPageToken: string | null }> {
  const params = new URLSearchParams({ category });
  if (pageToken) params.set("pageToken", pageToken);
  const res = await fetch(`/api/emails/list?${params}`);
  if (!res.ok) throw new Error("Failed to fetch emails");
  return res.json();
}

async function fetchEmail(id: string) {
  const res = await fetch(`/api/emails/${id}`);
  if (!res.ok) throw new Error("Failed to fetch email");
  const data = await res.json();
  return data.email;
}

async function sendReply(params: {
  threadId?: string;
  to: string;
  subject: string;
  message: string;
  inReplyTo?: string;
}) {
  const res = await fetch("/api/emails/reply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error("Failed to send reply");
  return res.json();
}

export function useEmails(category: string) {
  const query = useInfiniteQuery({
    queryKey: ["emails", category],
    queryFn: ({ pageParam }) =>
      fetchEmailPage(category, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextPageToken ?? undefined,
    refetchInterval: 5000,
    staleTime: 4000,
    refetchIntervalInBackground: true,
  });

  const emails = query.data?.pages.flatMap((p) => p.emails) ?? [];

  return {
    emails,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}

export function useEmail(id: string | null) {
  return useQuery({
    queryKey: ["email", id],
    queryFn: () => fetchEmail(id!),
    enabled: !!id,
    staleTime: 10000,
  });
}

export function useSendReply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendReply,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] });
    },
  });
}

export function useEmailNavigation(emails: EmailRow[]) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const selectEmail = useCallback(
    (id: string) => {
      setSelectedId(id);
      const idx = emails.findIndex((e) => e.id === id);
      if (idx !== -1) setFocusedIndex(idx);
    },
    [emails]
  );

  const closeEmail = useCallback(() => setSelectedId(null), []);

  const navigateUp = useCallback(() => {
    const next = Math.max(0, focusedIndex - 1);
    setFocusedIndex(next);
    if (emails[next]) setSelectedId(emails[next].id);
  }, [focusedIndex, emails]);

  const navigateDown = useCallback(() => {
    const next = Math.min(emails.length - 1, focusedIndex + 1);
    setFocusedIndex(next);
    if (emails[next]) setSelectedId(emails[next].id);
  }, [focusedIndex, emails]);

  return {
    selectedId,
    focusedIndex,
    selectEmail,
    closeEmail,
    navigateUp,
    navigateDown,
  };
}

export function useEmailSearch() {
  const [query, setQuery] = useState("");

  const searchQuery = useQuery({
    queryKey: ["emails", "search", query],
    queryFn: async () => {
      if (!query.trim()) return [];
      const res = await fetch(
        `/api/emails/list?category=all&search=${encodeURIComponent(query)}`
      );
      if (!res.ok) return [];
      const data = await res.json();
      return data.emails as EmailRow[];
    },
    enabled: query.trim().length > 0,
    staleTime: 30000,
  });

  return {
    query,
    setQuery,
    results: searchQuery.data ?? [],
    isSearching: searchQuery.isFetching,
  };
}