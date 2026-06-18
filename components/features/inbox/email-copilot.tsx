"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, Sparkles, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EmailRow } from "@/hooks/use-emails";
import type { CopilotMessage } from "./inbox-layout";

type Action = {
  type: string;
  payload: Record<string, unknown>;
  confirmationMessage: string;
  preview?: string;
};

type CopilotMode = "inbox" | "email";

function getInboxChips(emails: EmailRow[]): string[] {
  const hasUrgent = emails.some((e) => e.urgency === "urgent");
  const hasReply = emails.some((e) => e.needsReply);
  const hasMeeting = emails.some((e) => e.isMeetingRequest);
  const chips: string[] = [];
  if (hasUrgent) chips.push("What needs my attention right now?");
  if (hasReply) chips.push("Which emails need a reply?");
  if (hasMeeting) chips.push("Any meeting requests?");
  chips.push("Prepare me for today");
  chips.push("Summarize my inbox");
  return chips.slice(0, 4);
}

function getEmailChips(email: {
  urgency?: string | null;
  isMeetingRequest?: boolean;
  needsReply?: boolean;
}): string[] {
  if (email.isMeetingRequest) {
    return [
      "Create calendar invite",
      "Check my availability",
      "Draft acceptance reply",
      "Decline and suggest alternative",
    ];
  }
  if (email.urgency === "urgent") {
    return [
      "Draft an urgent reply",
      "Create a task from this",
      "Who else should know?",
      "Summarize key points",
    ];
  }
  if (email.needsReply) {
    return [
      "Draft a reply",
      "Summarize this email",
      "Create a task from this",
      "Is this related to any Jira issue?",
    ];
  }
  return [
    "Analyze this email",
    "Summarize key points",
    "Draft a reply",
    "Create a task from this",
  ];
}

function formatMessage(content: string): React.ReactNode {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    if (line.trim() === "") {
      elements.push(<div key={key++} className="h-1.5" />);
      continue;
    }
    if (line.startsWith("# ")) {
      elements.push(
        <p key={key++} className="font-bold text-[13px] mt-2 mb-0.5">
          {line.slice(2)}
        </p>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <p key={key++} className="font-semibold text-[12.5px] mt-1.5 mb-0.5">
          {line.slice(3)}
        </p>
      );
      continue;
    }
    if (
      line.startsWith("**") &&
      line.endsWith("**") &&
      line.length > 4 &&
      !line.slice(2, -2).includes("**")
    ) {
      elements.push(
        <p key={key++} className="font-semibold mt-1">
          {line.slice(2, -2)}
        </p>
      );
      continue;
    }
    if (line.startsWith("- ") || line.startsWith("• ")) {
      elements.push(
        <div key={key++} className="flex gap-2 mt-0.5 pl-1">
          <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#2d7387]" />
          <span className="flex-1">{renderInline(line.slice(2))}</span>
        </div>
      );
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\./)?.[1];
      const text = line.replace(/^\d+\.\s/, "");
      elements.push(
        <div key={key++} className="flex gap-2 mt-0.5 pl-1">
          <span className="shrink-0 font-mono text-[#2d7387] text-[11px] mt-[2px] w-4">
            {num}.
          </span>
          <span className="flex-1">{renderInline(text)}</span>
        </div>
      );
      continue;
    }
    elements.push(
      <p key={key++} className="mt-0.5 leading-relaxed">
        {renderInline(line)}
      </p>
    );
  }

  return (
    <div className="space-y-0 text-[12.5px] leading-relaxed">{elements}</div>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        ) : (
          part
        )
      )}
    </>
  );
}

function ActionCard({
  action,
  onConfirm,
  onCancel,
  isExecuting,
  isDark,
}: {
  action: Action;
  onConfirm: () => void;
  onCancel: () => void;
  isExecuting: boolean;
  isDark: boolean;
}) {
  const typeLabels: Record<string, string> = {
    send_email: "📧 Send Email",
    draft_reply: "✍️ Send Reply",
    create_calendar_event: "📅 Create Calendar Event",
    create_task: "✅ Create Task",
    create_jira_issue: "🎯 Create Jira Issue",
  };

  return (
    <div
      className="mt-3 rounded-xl p-3"
      style={{
        border: "1px solid rgba(45,115,135,0.4)",
        background: isDark ? "rgba(45,115,135,0.12)" : "rgba(45,115,135,0.06)",
      }}
    >
      <p className="text-[11px] font-semibold" style={{ color: "#2d7387" }}>
        {typeLabels[action.type] ?? "⚡ Action Ready"}
      </p>
      <p
        className="mt-1 text-[12px]"
        style={{ color: isDark ? "#e5e7eb" : "#111827" }}
      >
        {action.confirmationMessage}
      </p>
      {action.preview && (
        <div
          className="mt-2 rounded-lg px-3 py-2 max-h-36 overflow-y-auto"
          style={{
            background: isDark ? "#111318" : "#f9fafb",
            border: isDark ? "1px solid #2d3748" : "1px solid #e5e7eb",
          }}
        >
          <p
            className="text-[10px] mb-1 font-medium uppercase tracking-wide"
            style={{ color: isDark ? "#6b7280" : "#9ca3af" }}
          >
            Preview
          </p>
          <p
            className="whitespace-pre-wrap text-[11px]"
            style={{ color: isDark ? "#e5e7eb" : "#111827" }}
          >
            {action.preview}
          </p>
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <button
          onClick={onConfirm}
          disabled={isExecuting}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          style={{ background: "#2d7387" }}
        >
          {isExecuting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <CheckCircle className="h-3 w-3" />
          )}
          {isExecuting ? "Executing..." : "Confirm"}
        </button>
        <button
          onClick={onCancel}
          disabled={isExecuting}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] disabled:opacity-50 transition-colors"
          style={{
            borderColor: isDark ? "#2d3748" : "#e5e7eb",
            color: isDark ? "#9ca3af" : "#6b7280",
          }}
        >
          <XCircle className="h-3 w-3" />
          Cancel
        </button>
      </div>
    </div>
  );
}

interface EmailCopilotProps {
  mode: CopilotMode;
  emails?: EmailRow[];
  selectedEmail?: {
    id: string;
    subject: string;
    from: string;
    body: string;
    snippet: string;
    urgency: string | null;
    isMeetingRequest: boolean;
    needsReply: boolean;
  } | null;
  onFilterEmails?: (query: string) => void;
  chatHistory: CopilotMessage[];
  onChatHistoryChange: (
    msgs:
      | CopilotMessage[]
      | ((prev: CopilotMessage[]) => CopilotMessage[])
  ) => void;
}

export function EmailCopilot({
  mode,
  emails = [],
  selectedEmail,
  onFilterEmails,
  chatHistory,
  onChatHistoryChange,
}: EmailCopilotProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const [currentChips, setCurrentChips] = useState<string[]>([]);
  const [isDark, setIsDark] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (chatHistory.length === 0) {
      if (mode === "inbox") {
        setCurrentChips(getInboxChips(emails));
      } else if (selectedEmail) {
        setCurrentChips(getEmailChips(selectedEmail));
      }
    }
  }, [mode, selectedEmail?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isLoading]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMsg: CopilotMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
      };

      const newHistory = [...chatHistory, userMsg];
      const assistantId = crypto.randomUUID();
      const streamingMsg: CopilotMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
      };

      onChatHistoryChange([...newHistory, streamingMsg]);
      setInput("");
      setIsLoading(true);
      setCurrentChips([]);

      try {
        const inboxSummary =
          mode === "inbox"
            ? `${emails.length} emails. Urgent: ${emails.filter((e) => e.urgency === "urgent").length}. Needs reply: ${emails.filter((e) => e.needsReply).length}. Meeting requests: ${emails.filter((e) => e.isMeetingRequest).length}.`
            : undefined;

        const res = await fetch("/api/chat/copilot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            mode,
            emailId: selectedEmail?.id ?? null,
            emailContext: selectedEmail
              ? {
                  subject: selectedEmail.subject,
                  from: selectedEmail.from,
                  body: selectedEmail.body,
                  urgency: selectedEmail.urgency,
                  isMeetingRequest: selectedEmail.isMeetingRequest,
                }
              : null,
            history: newHistory.slice(-14).map((m) => ({
              role: m.role,
              content: m.content,
            })),
            inboxSummary,
          }),
        });

        if (!res.ok || !res.body) throw new Error("Copilot failed");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;

            try {
              const parsed = JSON.parse(raw);

              if (parsed.type === "chunk" && parsed.text) {
                onChatHistoryChange((prev: CopilotMessage[]) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: parsed.text }
                      : m
                  )
                );
              }

              if (parsed.type === "done") {
                if (
                  parsed.filterQuery &&
                  onFilterEmails &&
                  mode === "inbox"
                ) {
                  onFilterEmails(parsed.filterQuery);
                }
                onChatHistoryChange((prev: CopilotMessage[]) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          content: parsed.reply,
                          chips: parsed.chips,
                          action: parsed.action,
                        }
                      : m
                  )
                );
                setCurrentChips(parsed.chips ?? []);
              }

              if (parsed.type === "error") {
                throw new Error(parsed.message ?? "Copilot error");
              }
            } catch {
              // skip malformed SSE lines
            }
          }
        }
      } catch {
        onChatHistoryChange((prev: CopilotMessage[]) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: "Something went wrong. Please try again.",
                  chips:
                    mode === "inbox"
                      ? getInboxChips(emails)
                      : getEmailChips(selectedEmail ?? {}),
                }
              : m
          )
        );
        setCurrentChips(
          mode === "inbox"
            ? getInboxChips(emails)
            : getEmailChips(selectedEmail ?? {})
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      isLoading,
      chatHistory,
      mode,
      emails,
      selectedEmail,
      onFilterEmails,
      onChatHistoryChange,
    ]
  );

  async function handleActionConfirm(msgId: string, action: Action) {
    setExecutingAction(msgId);
    try {
      const res = await fetch("/api/chat/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await res.json();
      const confirmMsg: CopilotMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.message ?? "Done!",
        chips:
          mode === "inbox"
            ? getInboxChips(emails)
            : getEmailChips(selectedEmail ?? {}),
      };
      onChatHistoryChange((prev: CopilotMessage[]) => [
        ...prev.map((m) => (m.id === msgId ? { ...m, action: null } : m)),
        confirmMsg,
      ]);
      setCurrentChips(confirmMsg.chips ?? []);
    } catch {
      const errMsg: CopilotMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Action failed. Please try again.",
        chips: [],
      };
      onChatHistoryChange((prev: CopilotMessage[]) => [
        ...prev.map((m) => (m.id === msgId ? { ...m, action: null } : m)),
        errMsg,
      ]);
    } finally {
      setExecutingAction(null);
    }
  }

  function handleActionCancel(msgId: string) {
    const cancelMsg: CopilotMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "Cancelled. What else can I help you with?",
      chips:
        mode === "inbox"
          ? getInboxChips(emails)
          : getEmailChips(selectedEmail ?? {}),
    };
    onChatHistoryChange((prev: CopilotMessage[]) => [
      ...prev.map((m) => (m.id === msgId ? { ...m, action: null } : m)),
      cancelMsg,
    ]);
    setCurrentChips(cancelMsg.chips ?? []);
  }

  const lastAssistantMsg = [...chatHistory]
    .reverse()
    .find((m) => m.role === "assistant");

  const lastChips =
    currentChips.length > 0
      ? currentChips
      : lastAssistantMsg?.chips && lastAssistantMsg.chips.length > 0
      ? lastAssistantMsg.chips
      : mode === "inbox"
      ? getInboxChips(emails)
      : getEmailChips(selectedEmail ?? {});

  const assistantBg = isDark ? "#1a1d24" : "#f1f5f9";
  const assistantText = isDark ? "#e5e7eb" : "#111827";
  const assistantBorder = isDark ? "#2d3748" : "#e2e8f0";
  const inputBg = isDark ? "#1a1d24" : "#f8fafc";
  const inputBorder = isDark ? "#2d3748" : "#e2e8f0";
  const inputText = isDark ? "#e5e7eb" : "#111827";

  return (
    <div
      className="flex h-full flex-col border-l"
      style={{
        borderColor: isDark ? "#1f2937" : "#e5e7eb",
        background: isDark ? "#111318" : "#ffffff",
      }}
    >
      {/* Header */}
      <div
        className="flex shrink-0 items-center justify-between px-4 py-3"
        style={{
          borderBottom: `1px solid ${isDark ? "#1f2937" : "#e5e7eb"}`,
        }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5" style={{ color: "#2d7387" }} />
          <span
            className="text-[13px] font-semibold"
            style={{ color: isDark ? "#f9fafb" : "#111827" }}
          >
            Nexus Copilot
          </span>
        </div>
        {chatHistory.length > 0 && (
          <button
            onClick={() => {
              onChatHistoryChange([]);
              setCurrentChips(
                mode === "inbox"
                  ? getInboxChips(emails)
                  : getEmailChips(selectedEmail ?? {})
              );
            }}
            className="text-[11px] transition-colors"
            style={{ color: isDark ? "#6b7280" : "#9ca3af" }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {chatHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div
              className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ background: "rgba(45,115,135,0.1)" }}
            >
              <Sparkles className="h-6 w-6" style={{ color: "#2d7387" }} />
            </div>
            <p
              className="text-[13px] font-semibold"
              style={{ color: isDark ? "#f9fafb" : "#111827" }}
            >
              Nexus Copilot
            </p>
            <p
              className="mt-1 text-[11px]"
              style={{ color: isDark ? "#6b7280" : "#9ca3af" }}
            >
              Ask anything about your work
            </p>
            <p
              className="mt-0.5 text-[11px]"
              style={{ color: isDark ? "#6b7280" : "#9ca3af" }}
            >
              Draft replies · Create events · Analyze emails
            </p>
          </div>
        )}

        <div className="space-y-3">
          {chatHistory.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {msg.role === "user" ? (
                <div
                  className="max-w-[82%] rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-[12.5px] font-medium"
                  style={{ background: "#2d7387", color: "#ffffff" }}
                >
                  {msg.content}
                </div>
              ) : (
                <div
                  className="w-full rounded-2xl rounded-tl-sm px-3.5 py-3 text-[12.5px]"
                  style={{
                    background: assistantBg,
                    color: assistantText,
                    border: `1px solid ${assistantBorder}`,
                  }}
                >
                  {msg.content === "" ? (
                    <div className="flex gap-1.5 py-1">
                      {[0, 150, 300].map((delay) => (
                        <span
                          key={delay}
                          className="h-2 w-2 rounded-full animate-bounce"
                          style={{
                            background: "#2d7387",
                            animationDelay: `${delay}ms`,
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    formatMessage(msg.content)
                  )}
                  {msg.action && (
                    <ActionCard
                      action={msg.action}
                      onConfirm={() =>
                        handleActionConfirm(msg.id, msg.action!)
                      }
                      onCancel={() => handleActionCancel(msg.id)}
                      isExecuting={executingAction === msg.id}
                      isDark={isDark}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div ref={bottomRef} />
      </div>

      {/* Chips */}
      {lastChips.length > 0 && !isLoading && (
        <div
          className="shrink-0 px-3 py-2"
          style={{
            borderTop: `1px solid ${isDark ? "#1f2937" : "#e5e7eb"}`,
          }}
        >
          <div className="flex flex-wrap gap-1.5">
            {lastChips.map((chip) => (
              <button
                key={chip}
                onClick={() => sendMessage(chip)}
                className="rounded-full px-2.5 py-1 text-[11px] transition-colors"
                style={{
                  border: `1px solid ${isDark ? "#2d3748" : "#e2e8f0"}`,
                  background: isDark ? "#1a1d24" : "#f8fafc",
                  color: isDark ? "#d1d5db" : "#374151",
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.borderColor = "#2d7387";
                  (e.target as HTMLElement).style.color = "#2d7387";
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.borderColor = isDark
                    ? "#2d3748"
                    : "#e2e8f0";
                  (e.target as HTMLElement).style.color = isDark
                    ? "#d1d5db"
                    : "#374151";
                }}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div
        className="shrink-0 px-3 py-3"
        style={{
          borderTop: `1px solid ${isDark ? "#1f2937" : "#e5e7eb"}`,
        }}
      >
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2"
          style={{
            background: inputBg,
            border: `1px solid ${inputBorder}`,
          }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder="Ask anything..."
            className="flex-1 bg-transparent text-[12.5px] outline-none"
            style={{ color: inputText }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="rounded-lg p-1.5 transition-all disabled:opacity-40"
            style={{
              background:
                input.trim() && !isLoading ? "#2d7387" : "transparent",
              color:
                input.trim() && !isLoading
                  ? "#ffffff"
                  : isDark
                  ? "#4b5563"
                  : "#9ca3af",
            }}
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}