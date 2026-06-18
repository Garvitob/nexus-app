"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { EmailList } from "./email-list";
import { EmailOverlay } from "./email-overlay";
import { EmailCopilot } from "./email-copilot";
import { useEmails } from "@/hooks/use-emails";
import type { EmailCategory } from "@/lib/constants";

export type CopilotMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  chips?: string[];
  action?: {
    type: string;
    payload: Record<string, unknown>;
    confirmationMessage: string;
    preview?: string;
  } | null;
};

export function InboxLayout() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const category = (searchParams.get("c") ?? "primary") as EmailCategory;
  const emailIdFromUrl = searchParams.get("id");

  const [selectedId, setSelectedId] = useState<string | null>(emailIdFromUrl);
  const [filterQuery, setFilterQuery] = useState("");
  const [chatHistory, setChatHistory] = useState<CopilotMessage[]>([]);

  const { emails } = useEmails(category);

  const selectedEmail = selectedId
    ? emails.find((e) => e.id === selectedId) ?? null
    : null;

  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      setFilterQuery("");
      router.push(`/inbox?c=${category}&id=${id}`, { scroll: false });
    },
    [category, router]
  );

  const handleClose = useCallback(() => {
    setSelectedId(null);
    router.push(`/inbox?c=${category}`, { scroll: false });
  }, [category, router]);

  const handleFilterEmails = useCallback((query: string) => {
    setSelectedId(null);
    setFilterQuery(query);
  }, []);

  const handleReply = useCallback(() => {}, []);
  const handleCreateTask = useCallback(() => {}, []);
  const handleCreateCalendarInvite = useCallback(() => {}, []);

  const handleChatHistoryChange = useCallback(
    (
      msgs:
        | CopilotMessage[]
        | ((prev: CopilotMessage[]) => CopilotMessage[])
    ) => {
      setChatHistory(msgs as CopilotMessage[] | ((prev: CopilotMessage[]) => CopilotMessage[]));
    },
    []
  );

  return (
    <div className="flex h-full overflow-hidden">
      <div className="relative min-w-0 flex-1 overflow-hidden border-r border-[var(--border)]">
        <div
          className={
            selectedId
              ? "invisible absolute inset-0"
              : "visible absolute inset-0"
          }
        >
          <EmailList
            selectedId={selectedId}
            onSelect={handleSelect}
            category={category}
            filterQuery={filterQuery}
          />
        </div>

        {selectedId && (
          <div className="absolute inset-0 bg-[var(--surface-0)]">
            <EmailOverlay
              emailId={selectedId}
              onClose={handleClose}
              onReply={handleReply}
              onCreateTask={handleCreateTask}
              onCreateCalendarInvite={handleCreateCalendarInvite}
            />
          </div>
        )}
      </div>

      <div className="w-[300px] shrink-0">
        <EmailCopilot
          mode={selectedId ? "email" : "inbox"}
          emails={emails}
          selectedEmail={
            selectedEmail
              ? {
                  id: selectedEmail.id,
                  subject: selectedEmail.subject,
                  from: selectedEmail.from,
                  body: selectedEmail.body,
                  snippet: selectedEmail.snippet,
                  urgency: selectedEmail.urgency,
                  isMeetingRequest: selectedEmail.isMeetingRequest,
                  needsReply: selectedEmail.needsReply,
                }
              : null
          }
          onFilterEmails={handleFilterEmails}
          chatHistory={chatHistory}
          onChatHistoryChange={handleChatHistoryChange}
        />
      </div>
    </div>
  );
}