"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, Sparkles, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import type { Meeting } from "@/hooks/use-meetings";

export type MeetingCopilotMessage = {
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

function getMeetingListChips(): string[] {
  return [
    "What meetings do I have today?",
    "Prepare me for my next meeting",
    "Any scheduling conflicts?",
    "Draft a meeting agenda",
  ];
}

function getMeetingChips(meeting: Meeting): string[] {
  return [
    `Prepare me for "${meeting.title}"`,
    "Who's attending?",
    "Draft an agenda",
    "Create follow-up tasks",
  ];
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

function formatMessage(content: string): React.ReactNode {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    if (line.trim() === "") {
      elements.push(<div key={key++} className="h-1.5" />);
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

function ActionCard({
  action,
  onConfirm,
  onCancel,
  isExecuting,
  isDark,
}: {
  action: NonNullable<MeetingCopilotMessage["action"]>;
  onConfirm: () => void;
  onCancel: () => void;
  isExecuting: boolean;
  isDark: boolean;
}) {
  const typeLabels: Record<string, string> = {
    create_task: "✅ Create Task",
    create_calendar_event: "📅 Create Calendar Event",
    send_email: "📧 Send Email",
    draft_reply: "✍️ Draft Reply",
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
      <p className="mt-1 text-[12px]" style={{ color: isDark ? "#e5e7eb" : "#111827" }}>
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
          {isExecuting ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
          {isExecuting ? "Working..." : "Confirm"}
        </button>
        <button
          onClick={onCancel}
          disabled={isExecuting}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] disabled:opacity-50"
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

interface MeetingCopilotProps {
  selectedMeeting: Meeting | null;
  meetings: Meeting[];
  chatHistory: MeetingCopilotMessage[];
  onChatHistoryChange: (
    msgs: MeetingCopilotMessage[] | ((prev: MeetingCopilotMessage[]) => MeetingCopilotMessage[])
  ) => void;
}

export function MeetingCopilot({
  selectedMeeting,
  meetings,
  chatHistory,
  onChatHistoryChange,
}: MeetingCopilotProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const [currentChips, setCurrentChips] = useState<string[]>(getMeetingListChips());
  const [isDark, setIsDark] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setCurrentChips(
      selectedMeeting ? getMeetingChips(selectedMeeting) : getMeetingListChips()
    );
  }, [selectedMeeting?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isLoading]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMsg: MeetingCopilotMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
      };

      const newHistory = [...chatHistory, userMsg];
      const assistantId = crypto.randomUUID();

      onChatHistoryChange([
        ...newHistory,
        { id: assistantId, role: "assistant", content: "" },
      ]);
      setInput("");
      setIsLoading(true);
      setCurrentChips([]);

      try {
        const res = await fetch("/api/chat/copilot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            mode: selectedMeeting ? "meetings" : "meetings",
            selectedMeeting: selectedMeeting ?? null,
            meetings: meetings.slice(0, 10).map((m) => ({
              id: m.id,
              title: m.title,
              startTime: m.startTime,
              endTime: m.endTime,
              attendees: m.attendees,
              meetLink: m.meetLink,
            })),
            history: newHistory.slice(-14).map((m) => ({
              role: m.role,
              content: m.content,
            })),
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
                onChatHistoryChange((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: parsed.text } : m
                  )
                );
              }
              if (parsed.type === "done") {
                onChatHistoryChange((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: parsed.reply, chips: parsed.chips, action: parsed.action }
                      : m
                  )
                );
                setCurrentChips(
                  parsed.chips ??
                    (selectedMeeting ? getMeetingChips(selectedMeeting) : getMeetingListChips())
                );
              }
              if (parsed.type === "error") throw new Error(parsed.message);
            } catch {
              // skip malformed
            }
          }
        }
      } catch {
        onChatHistoryChange((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: "Something went wrong. Please try again.",
                  chips: selectedMeeting ? getMeetingChips(selectedMeeting) : getMeetingListChips(),
                }
              : m
          )
        );
        setCurrentChips(
          selectedMeeting ? getMeetingChips(selectedMeeting) : getMeetingListChips()
        );
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, chatHistory, selectedMeeting, meetings, onChatHistoryChange]
  );

  async function handleActionConfirm(
    msgId: string,
    action: NonNullable<MeetingCopilotMessage["action"]>
  ) {
    setExecutingAction(msgId);
    try {
      const res = await fetch("/api/chat/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error(`Action failed: ${res.status}`);
      const result = await res.json();

      if (action.type === "create_task" || action.type === "create_calendar_event") {
        await qc.invalidateQueries({ queryKey: ["tasks"] });
        await qc.invalidateQueries({ queryKey: ["meetings"] });
      }

      const confirmMsg: MeetingCopilotMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.message ?? "Done!",
        chips: selectedMeeting ? getMeetingChips(selectedMeeting) : getMeetingListChips(),
      };
      onChatHistoryChange((prev) => [
        ...prev.map((m) => (m.id === msgId ? { ...m, action: null } : m)),
        confirmMsg,
      ]);
      setCurrentChips(confirmMsg.chips ?? []);
    } catch {
      const errMsg: MeetingCopilotMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Action failed. Please try again.",
        chips: [],
      };
      onChatHistoryChange((prev) => [
        ...prev.map((m) => (m.id === msgId ? { ...m, action: null } : m)),
        errMsg,
      ]);
    } finally {
      setExecutingAction(null);
    }
  }

  function handleActionCancel(msgId: string) {
    const cancelMsg: MeetingCopilotMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "Cancelled. What else can I help you with?",
      chips: selectedMeeting ? getMeetingChips(selectedMeeting) : getMeetingListChips(),
    };
    onChatHistoryChange((prev) => [
      ...prev.map((m) => (m.id === msgId ? { ...m, action: null } : m)),
      cancelMsg,
    ]);
    setCurrentChips(cancelMsg.chips ?? []);
  }

  const lastAssistantMsg = [...chatHistory].reverse().find((m) => m.role === "assistant");
  const lastChips =
    currentChips.length > 0
      ? currentChips
      : lastAssistantMsg?.chips?.length
      ? lastAssistantMsg.chips
      : selectedMeeting
      ? getMeetingChips(selectedMeeting)
      : getMeetingListChips();

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
        style={{ borderBottom: `1px solid ${isDark ? "#1f2937" : "#e5e7eb"}` }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5" style={{ color: "#2d7387" }} />
          <span className="text-[13px] font-semibold" style={{ color: isDark ? "#f9fafb" : "#111827" }}>
            {selectedMeeting ? "Meeting Copilot" : "Meetings Copilot"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {selectedMeeting && (
            <span
              className="max-w-[100px] truncate text-[11px]"
              style={{ color: isDark ? "#6b7280" : "#9ca3af" }}
            >
              {selectedMeeting.title}
            </span>
          )}
          {chatHistory.length > 0 && (
            <button
              onClick={() => {
                onChatHistoryChange([]);
                setCurrentChips(
                  selectedMeeting ? getMeetingChips(selectedMeeting) : getMeetingListChips()
                );
              }}
              className="text-[11px]"
              style={{ color: isDark ? "#6b7280" : "#9ca3af" }}
            >
              Clear
            </button>
          )}
        </div>
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
            <p className="text-[13px] font-semibold" style={{ color: isDark ? "#f9fafb" : "#111827" }}>
              Meetings Copilot
            </p>
            <p className="mt-1 text-[11px]" style={{ color: isDark ? "#6b7280" : "#9ca3af" }}>
              {selectedMeeting
                ? `Ask anything about "${selectedMeeting.title}"`
                : "Ask about your schedule, prepare for meetings"}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {chatHistory.map((msg) => (
            <div
              key={msg.id}
              className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
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
                  className="w-full rounded-2xl rounded-tl-sm px-3.5 py-3"
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
                          style={{ background: "#2d7387", animationDelay: `${delay}ms` }}
                        />
                      ))}
                    </div>
                  ) : (
                    formatMessage(msg.content)
                  )}
                  {msg.action && (
                    <ActionCard
                      action={msg.action}
                      onConfirm={() => handleActionConfirm(msg.id, msg.action!)}
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
          style={{ borderTop: `1px solid ${isDark ? "#1f2937" : "#e5e7eb"}` }}
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
                  (e.target as HTMLElement).style.borderColor = isDark ? "#2d3748" : "#e2e8f0";
                  (e.target as HTMLElement).style.color = isDark ? "#d1d5db" : "#374151";
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
        style={{ borderTop: `1px solid ${isDark ? "#1f2937" : "#e5e7eb"}` }}
      >
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2"
          style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
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
            placeholder="Ask about your meetings..."
            className="flex-1 bg-transparent text-[12.5px] outline-none"
            style={{ color: inputText }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="rounded-lg p-1.5 transition-all disabled:opacity-40"
            style={{
              background: input.trim() && !isLoading ? "#2d7387" : "transparent",
              color: input.trim() && !isLoading ? "#ffffff" : isDark ? "#4b5563" : "#9ca3af",
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