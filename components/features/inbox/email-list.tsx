"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X, RefreshCw, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EmailCategory } from "@/lib/constants";
import {
  useEmails,
  useEmailNavigation,
  useEmailSearch,
  type EmailRow,
} from "@/hooks/use-emails";
import { EmailItem } from "./email-item";

interface EmailListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  category: EmailCategory;
  filterQuery?: string;
}

function EmailSkeleton() {
  return (
    <div className="border-b border-[var(--border)] px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--surface-2)]" />
        <div className="flex-1 space-y-2">
          <div className="flex justify-between">
            <div className="h-3 w-24 animate-pulse rounded bg-[var(--surface-2)]" />
            <div className="h-3 w-10 animate-pulse rounded bg-[var(--surface-2)]" />
          </div>
          <div className="h-3 w-40 animate-pulse rounded bg-[var(--surface-2)]" />
          <div className="h-3 w-56 animate-pulse rounded bg-[var(--surface-2)]" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ category }: { category: string }) {
  const messages: Record<string, { title: string; sub: string }> = {
    primary: {
      title: "Your primary inbox is empty",
      sub: "Important emails from people you know will appear here.",
    },
    promotions: {
      title: "No promotions",
      sub: "Deals, offers, and marketing emails will appear here.",
    },
    spam: {
      title: "No spam",
      sub: "Suspicious emails will be filtered here automatically.",
    },
    all: {
      title: "No emails yet",
      sub: "All your emails will appear here once synced.",
    },
  };

  const msg = messages[category] ?? messages.all;

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-[14px] font-medium text-[var(--foreground)]">
        {msg.title}
      </p>
      <p className="mt-1 text-[12px] text-[var(--muted)]">{msg.sub}</p>
    </div>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  primary: "Primary",
  promotions: "Promotions",
  spam: "Spam",
  all: "All Mail",
};

export function EmailList({
  selectedId,
  onSelect,
  category,
  filterQuery,
}: EmailListProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const {
    emails,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useEmails(category);

  const { focusedIndex, navigateUp, navigateDown } =
    useEmailNavigation(emails);
  const { query, setQuery, results: searchResults } = useEmailSearch();

  const displayEmails: EmailRow[] =
    searchOpen && query
      ? searchResults
      : filterQuery
      ? emails.filter(
          (e) =>
            e.from.toLowerCase().includes(filterQuery.toLowerCase()) ||
            e.subject.toLowerCase().includes(filterQuery.toLowerCase()) ||
            e.snippet.toLowerCase().includes(filterQuery.toLowerCase())
        )
      : emails;

  // Infinite scroll — trigger next page when bottom sentinel is visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const el = bottomRef.current;
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "j" || e.key === "J") {
        e.preventDefault();
        navigateDown();
        if (displayEmails[focusedIndex + 1])
          onSelect(displayEmails[focusedIndex + 1].id);
      }
      if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        navigateUp();
        if (displayEmails[focusedIndex - 1])
          onSelect(displayEmails[focusedIndex - 1].id);
      }
      if (e.key === "/") {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchRef.current?.focus(), 50);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setQuery("");
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [
    focusedIndex,
    displayEmails,
    navigateUp,
    navigateDown,
    onSelect,
    setQuery,
  ]);

  return (
    <div className="flex h-full flex-col bg-[var(--surface-0)]">
      {/* Header */}
      <div className="border-b border-[var(--border)] px-4 py-3">
        {searchOpen ? (
          <div className="flex items-center gap-2 rounded-lg border border-[var(--accent)] bg-[var(--surface-1)] px-3 py-1.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search emails..."
              className="flex-1 bg-transparent text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none"
              autoFocus
            />
            <button
              onClick={() => {
                setSearchOpen(false);
                setQuery("");
              }}
            >
              <X className="h-3.5 w-3.5 text-[var(--muted)]" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-[var(--foreground)]">
              {CATEGORY_LABELS[category] ?? "Inbox"}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setSearchOpen(true);
                  setTimeout(() => searchRef.current?.focus(), 50);
                }}
                className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                title="Search (/)"
              >
                <Search className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => refetch()}
                className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                title="Refresh"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Email list */}
      <div className="flex-1 overflow-y-auto">
        {isError ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="mb-2 h-5 w-5 text-red-500" />
            <p className="text-[13px] text-[var(--foreground)]">
              Failed to load emails
            </p>
            <button
              onClick={() => refetch()}
              className="mt-2 text-[12px] text-[var(--accent)] hover:underline"
            >
              Try again
            </button>
          </div>
        ) : isLoading ? (
          Array.from({ length: 8 }).map((_, i) => <EmailSkeleton key={i} />)
        ) : displayEmails.length === 0 ? (
          <EmptyState category={category} />
        ) : (
          <>
            {displayEmails.map((email, idx) => (
              <EmailItem
                key={email.id}
                email={email}
                isSelected={selectedId === email.id}
                isFocused={focusedIndex === idx && !selectedId}
                onClick={() => onSelect(email.id)}
              />
            ))}

            {/* Infinite scroll sentinel */}
            <div ref={bottomRef} className="py-2">
              {isFetchingNextPage && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--muted)]" />
                </div>
              )}
              {!hasNextPage && displayEmails.length > 0 && (
                <p className="py-3 text-center font-mono text-[11px] text-[var(--muted)]">
                  {displayEmails.length} emails · updates every 5s
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}