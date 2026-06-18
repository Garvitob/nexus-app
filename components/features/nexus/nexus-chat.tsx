"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useSessionMessages } from "@/hooks/use-nexus";

type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const STARTER_PROMPTS = [
  "What needs my attention across all my tools today?",
  "Send an email to summarize this week's progress",
  "Create a calendar event for a team sync tomorrow at 3 PM",
  "Find my open GitHub PRs that need review",
];

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
  const els: React.ReactNode[] = [];
  let key = 0;
  for (const line of lines) {
    if (line.trim() === "") {
      els.push(<div key={key++} className="h-2" />);
      continue;
    }
    if (line.startsWith("- ") || line.startsWith("• ")) {
      els.push(
        <div key={key++} className="flex gap-2 mt-0.5 pl-1">
          <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#2d7387]" />
          <span className="flex-1">{renderInline(line.slice(2))}</span>
        </div>
      );
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\./)?.[1];
      const text = line.replace(/^\d+\.\s/, "");
      els.push(
        <div key={key++} className="flex gap-2 mt-0.5 pl-1">
          <span className="shrink-0 font-mono text-[#2d7387] text-[12px] mt-[2px] w-5">
            {num}.
          </span>
          <span className="flex-1">{renderInline(text)}</span>
        </div>
      );
      continue;
    }
    els.push(
      <p key={key++} className="mt-0.5 leading-relaxed">
        {renderInline(line)}
      </p>
    );
  }
  return <div className="space-y-0 text-[13.5px] leading-relaxed">{els}</div>;
}

interface NexusChatProps {
  sessionId: string | null;
  onSessionCreated: (id: string) => void;
  isDark: boolean;
}

export function NexusChat({
  sessionId,
  onSessionCreated,
  isDark,
}: NexusChatProps) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const qc = useQueryClient();

  const isStreamingRef = useRef(false);
  const lastLoadedSessionRef = useRef<string | null>(null);

  const { data: loadedMessages } = useSessionMessages(sessionId);

  useEffect(() => {
    if (isStreamingRef.current) return;
    if (
      sessionId &&
      sessionId !== lastLoadedSessionRef.current &&
      loadedMessages
    ) {
      setMessages(
        loadedMessages.map((m) => ({
          id: m.id,
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        }))
      );
      lastLoadedSessionRef.current = sessionId;
    } else if (!sessionId) {
      setMessages([]);
      lastLoadedSessionRef.current = null;
    }
  }, [loadedMessages, sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMsg: ChatMsg = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
      };
      const assistantId = crypto.randomUUID();

      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: assistantId, role: "assistant", content: "" },
      ]);
      setInput("");
      setIsLoading(true);
      isStreamingRef.current = true;

      try {
        const res = await fetch("/api/nexus/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, sessionId }),
        });

        if (!res.ok || !res.body) throw new Error("Request failed");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";

          for (const frame of frames) {
            const dataLine = frame
              .split("\n")
              .find((l) => l.startsWith("data: "));
            if (!dataLine) continue;
            const raw = dataLine.slice(6).trim();
            if (!raw) continue;

            let parsed: {
              type: string;
              text?: string;
              reply?: string;
              sessionId?: string;
              message?: string;
            };
            try {
              parsed = JSON.parse(raw);
            } catch {
              continue;
            }

            if (parsed.type === "session" && parsed.sessionId) {
              if (!sessionId) {
                lastLoadedSessionRef.current = parsed.sessionId;
                onSessionCreated(parsed.sessionId);
              }
            }
            if (parsed.type === "chunk" && typeof parsed.text === "string") {
              const t = parsed.text;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: t } : m
                )
              );
            }
            if (parsed.type === "done") {
              const r = parsed.reply ?? "";
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: r || m.content } : m
                )
              );
              qc.invalidateQueries({ queryKey: ["nexus-sessions"] });
              qc.invalidateQueries({ queryKey: ["tasks"] });
              qc.invalidateQueries({ queryKey: ["meetings"] });
            }
            if (parsed.type === "error") {
              throw new Error(parsed.message ?? "Agent failed");
            }
          }
        }
      } catch (err) {
        const errText =
          err instanceof Error ? err.message : "Something went wrong.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: "⚠️ " + errText } : m
          )
        );
      } finally {
        setIsLoading(false);
        isStreamingRef.current = false;
      }
    },
    [isLoading, sessionId, onSessionCreated, qc]
  );

  const bg = isDark ? "#0d0f12" : "#ffffff";
  const tc = isDark ? "#e5e7eb" : "#111827";
  const tm = isDark ? "#5e636e" : "#98a0ac";
  const userBg = "#2d7387";
  const assistantBg = isDark ? "#15171c" : "#f6f7f9";
  const assistantBorder = isDark ? "#242830" : "#e9ebef";
  const inputBg = isDark ? "#15171c" : "#f8fafc";
  const inputBorder = isDark ? "#242830" : "#e2e8f0";

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full flex-1 flex-col" style={{ background: bg }}>
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center px-6">
            <div
              className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: "rgba(45,115,135,0.12)" }}
            >
              <Sparkles className="h-7 w-7" style={{ color: "#2d7387" }} />
            </div>
            <h2 className="text-[20px] font-bold mb-1" style={{ color: tc }}>
              Nexus AI
            </h2>
            <p
              className="text-[13px] mb-8 text-center max-w-md"
              style={{ color: tm }}
            >
              Your autonomous workspace agent. Ask me to do anything across
              Gmail, Calendar, GitHub, Jira, and Notion — I take real actions.
            </p>
            <div className="grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="rounded-xl border px-4 py-3 text-left text-[12.5px] transition-all hover:scale-[1.01]"
                  style={{
                    background: assistantBg,
                    borderColor: assistantBorder,
                    color: tc,
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl px-4 py-6 space-y-5">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === "user" ? (
                  <div
                    className="max-w-[80%] rounded-2xl rounded-tr-sm px-4 py-2.5 text-[13.5px] font-medium"
                    style={{ background: userBg, color: "#ffffff" }}
                  >
                    {msg.content}
                  </div>
                ) : (
                  <div
                    className="w-full rounded-2xl rounded-tl-sm px-4 py-3"
                    style={{
                      background: assistantBg,
                      color: tc,
                      border: "1px solid " + assistantBorder,
                    }}
                  >
                    {msg.content === "" ? (
                      <div className="flex items-center gap-2 py-1">
                        <Loader2
                          className="h-4 w-4 animate-spin"
                          style={{ color: "#2d7387" }}
                        />
                        <span className="text-[12px]" style={{ color: tm }}>
                          Working across your tools...
                        </span>
                      </div>
                    ) : (
                      formatMessage(msg.content)
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="shrink-0 px-4 pb-4">
        <div className="mx-auto max-w-3xl">
          <div
            className="flex items-end gap-2 rounded-2xl px-3 py-2"
            style={{
              background: inputBg,
              border: "1px solid " + inputBorder,
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              rows={1}
              placeholder="Ask Nexus to do anything..."
              className="flex-1 resize-none bg-transparent py-1.5 text-[13.5px] outline-none max-h-32"
              style={{ color: tc }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              className="shrink-0 rounded-xl p-2 transition-all disabled:opacity-40"
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
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="mt-2 text-center text-[10px]" style={{ color: tm }}>
            Nexus takes real actions through Corsair. Review important sends.
          </p>
        </div>
      </div>
    </div>
  );
}