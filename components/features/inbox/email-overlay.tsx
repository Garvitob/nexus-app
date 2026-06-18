"use client";

import { useEffect, useRef } from "react";
import {
  ArrowLeft,
  Reply,
  Forward,
  Archive,
  Trash2,
  Clock,
  User,
  AlertCircle,
  Calendar,
  CheckSquare,
} from "lucide-react";
import { URGENCY_COLOR } from "@/lib/constants";
import { useEmail } from "@/hooks/use-emails";

function UrgencyBadge({ urgency }: { urgency: string | null }) {
  if (!urgency) return null;
  const color = URGENCY_COLOR[urgency as keyof typeof URGENCY_COLOR];
  const labels: Record<string, string> = {
    urgent: "Urgent",
    reply: "Needs reply",
    info: "Informational",
    low: "Low priority",
  };
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium text-white"
      style={{ backgroundColor: color }}
    >
      {labels[urgency] ?? urgency}
    </span>
  );
}

function formatFullDate(receivedAt: string | null): string {
  if (!receivedAt) return "";
  return new Date(receivedAt).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function buildEmailHtml(body: string, isDark: boolean): string {
  const bg = isDark ? "#0b0c0f" : "#ffffff";
  const text = isDark ? "#e5e7eb" : "#111827";
  const link = isDark ? "#5bb8cd" : "#2d7387";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html {
    background: ${bg};
    color-scheme: ${isDark ? "dark" : "light"};
  }
  body {
    margin: 0;
    padding: 16px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: ${text};
    background: ${bg};
    word-break: break-word;
    -webkit-text-size-adjust: 100%;
  }
  img { max-width: 100% !important; height: auto !important; }
  a { color: ${link}; }
  table { max-width: 100% !important; }
  td, th { word-break: break-word; }
  pre { overflow-x: auto; white-space: pre-wrap; }
  p { margin: 0 0 8px; }
</style>
</head>
<body>${body}</body>
</html>`;
}

function EmailBody({ body }: { body: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const blobUrlRef = useRef<string | null>(null);

  const isHtml =
    body.trim().startsWith("<") &&
    (body.includes("<html") ||
      body.includes("<div") ||
      body.includes("<table") ||
      body.includes("<p") ||
      body.includes("<br"));

  function renderIframe() {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const isDark = document.documentElement.classList.contains("dark");
    const html = buildEmailHtml(body, isDark);

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
    }

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    blobUrlRef.current = url;

    iframe.src = url;
    iframe.onload = () => {
      try {
        const doc = iframe.contentDocument;
        if (doc?.body) {
          const h = Math.max(
            doc.body.scrollHeight,
            doc.documentElement.scrollHeight
          );
          iframe.style.height = h + 32 + "px";
        }
      } catch {
        // cross-origin guard
      }
    };
  }

  useEffect(() => {
    if (!isHtml) return;

    renderIframe();

    const observer = new MutationObserver(renderIframe);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [body, isHtml]);

  if (!isHtml) {
    return (
      <div className="whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--foreground)]">
        {body}
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      className="w-full border-0"
      style={{ minHeight: "300px" }}
      title="Email content"
    />
  );
}

interface EmailOverlayProps {
  emailId: string;
  onClose: () => void;
  onReply: () => void;
  onCreateTask: () => void;
  onCreateCalendarInvite: () => void;
}

export function EmailOverlay({
  emailId,
  onClose,
  onReply,
  onCreateTask,
  onCreateCalendarInvite,
}: EmailOverlayProps) {
  const { data: emailData, isLoading, isError } = useEmail(emailId);
  const email = emailData;

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "Escape") onClose();
      if (e.key === "r" || e.key === "R") onReply();
      if (e.key === "t" || e.key === "T") onCreateTask();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, onReply, onCreateTask]);

  if (isLoading) {
    return (
      <div className="flex h-full flex-col bg-[var(--surface-0)]">
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
          <button onClick={onClose}>
            <ArrowLeft className="h-4 w-4 text-[var(--muted)]" />
          </button>
          <div className="h-4 w-48 animate-pulse rounded bg-[var(--surface-2)]" />
        </div>
        <div className="flex-1 space-y-4 p-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-4 animate-pulse rounded bg-[var(--surface-2)]"
              style={{ width: `${55 + (i * 11) % 40}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !email) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-[var(--surface-0)]">
        <AlertCircle className="h-6 w-6 text-red-500" />
        <p className="text-[13px] text-[var(--foreground)]">
          Failed to load email
        </p>
        <button
          onClick={onClose}
          className="text-[12px] text-[var(--accent)] hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--surface-0)]">
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] px-4 py-3">
        <button
          onClick={onClose}
          className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
          title="Back (Escape)"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="flex flex-1 items-center gap-2 overflow-hidden">
          <h2 className="truncate text-[14px] font-semibold text-[var(--foreground)]">
            {email.subject}
          </h2>
          <UrgencyBadge urgency={email.urgency} />
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={onReply}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-2)]"
            title="Reply (R)"
          >
            <Reply className="h-3.5 w-3.5" />
            Reply
          </button>
          <button
            className="rounded p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)]"
            title="Forward"
          >
            <Forward className="h-3.5 w-3.5" />
          </button>
          <button
            className="rounded p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)]"
            title="Archive (E)"
          >
            <Archive className="h-3.5 w-3.5" />
          </button>
          <button
            className="rounded p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)]"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="border-b border-[var(--border)] px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
                <span className="text-[13px] font-medium text-[var(--foreground)]">
                  {email.from}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-[var(--muted)]">To:</span>
                <span className="text-[12px] text-[var(--foreground)]">
                  {email.to}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3 text-[var(--muted)]" />
                <span className="font-mono text-[11px] text-[var(--muted)]">
                  {formatFullDate(email.receivedAt)}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-1.5">
              {email.isMeetingRequest && (
                <button
                  onClick={onCreateCalendarInvite}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-3 py-1.5 text-[11px] font-medium text-blue-500 hover:bg-blue-500/20"
                >
                  <Calendar className="h-3 w-3" />
                  Add to Calendar
                </button>
              )}
              <button
                onClick={onCreateTask}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--surface-2)] px-3 py-1.5 text-[11px] font-medium text-[var(--foreground)] hover:bg-[var(--surface-1)]"
                title="Create task (T)"
              >
                <CheckSquare className="h-3 w-3" />
                Create Task
              </button>
            </div>
          </div>

          {email.urgencyReason && (
            <div className="mt-3 rounded-lg bg-[var(--surface-1)] px-3 py-2 text-[12px] text-[var(--muted)]">
              {email.urgencyReason}
            </div>
          )}

          {Array.isArray(email.suggestedActions) &&
            email.suggestedActions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {(email.suggestedActions as string[]).map(
                  (action: string, i: number) => (
                    <span
                      key={i}
                      className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] text-[var(--muted)]"
                    >
                      {action}
                    </span>
                  )
                )}
              </div>
            )}
        </div>

        <div className="px-4 py-4">
          <EmailBody body={email.body} />
        </div>
      </div>
    </div>
  );
}