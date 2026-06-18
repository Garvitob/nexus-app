"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { URGENCY_COLOR } from "@/lib/constants";
import type { EmailRow } from "@/app/api/emails/list/route";

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function getInitial(from: string): string {
  if (!from) return "?";
  const name = from.match(/^"?([^"<]+)"?\s*</)?.[1]?.trim() ?? from.split("@")[0];
  return (name?.[0] ?? "?").toUpperCase();
}

function getSenderName(from: string): string {
  if (!from) return "(unknown)";
  const match = from.match(/^"?([^"<]+)"?\s*</);
  if (match) return match[1].trim();
  return from.split("@")[0] ?? from;
}

function getDomain(from: string): string | null {
  const emailMatch =
    from.match(/<([^>]+@[^>]+)>/) ??
    from.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/);
  const email = emailMatch?.[1] ?? from;
  const atIndex = email.lastIndexOf("@");
  if (atIndex === -1) return null;

  let domain = email
    .slice(atIndex + 1)
    .replace(/[>\s"]+/g, "")
    .trim()
    .toLowerCase();

  if (!domain) return null;

  // Strip mail/email/send subdomains to get root brand domain
  // e.g. mail.anthropic.com → anthropic.com
  domain = domain.replace(
    /^(mail|email|send|sending|notifications?|noreply|no-reply|bounce|smtp|mg|sg|em|e|info|support|help|hello|hi|team|news|newsletter|updates?|alert|alerts|auto|donotreply|do-not-reply)\./i,
    ""
  );

  return domain || null;
}

function getRootDomain(domain: string): string {
  const parts = domain.split(".");
  if (parts.length > 2) return parts.slice(-2).join(".");
  return domain;
}

function isPersonalDomain(domain: string): boolean {
  const personal = [
    "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
    "icloud.com", "live.com", "msn.com", "aol.com",
    "protonmail.com", "me.com", "mac.com", "ymail.com",
    "yahoo.in", "rediffmail.com",
  ];
  return personal.includes(domain) || personal.includes(getRootDomain(domain));
}

function stringToColor(str: string): string {
  const colors = [
    "#5C6BC0", "#42A5F5", "#26A69A", "#66BB6A",
    "#FFA726", "#EF5350", "#EC407A", "#AB47BC",
    "#7E57C2", "#26C6DA", "#FF7043", "#8D6E63",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getLogo(domain: string): string[] {
  const root = getRootDomain(domain);
  const seen = new Set<string>();
  const sources: string[] = [];

  const add = (url: string) => {
    if (!seen.has(url)) {
      seen.add(url);
      sources.push(url);
    }
  };

  // Clearbit gives best quality logos
  add(`https://logo.clearbit.com/${root}`);
  if (domain !== root) add(`https://logo.clearbit.com/${domain}`);

  // Google favicons as fallback
  add(`https://www.google.com/s2/favicons?domain=${root}&sz=64`);
  if (domain !== root) add(`https://www.google.com/s2/favicons?domain=${domain}&sz=64`);

  // icon.horse as last resort
  add(`https://icon.horse/icon/${root}`);

  return sources;
}

function SenderAvatar({ from }: { from: string }) {
  const initial = getInitial(from);
  const name = getSenderName(from);
  const bg = stringToColor(name);
  const domain = getDomain(from);
  const personal = domain ? isPersonalDomain(domain) : true;
  const sources = domain && !personal ? getLogo(domain) : [];

  const [logoUrl, setLogoUrl] = useState<string | null>(
    sources.length > 0 ? sources[0] : null
  );
  const [attemptIndex, setAttemptIndex] = useState(0);

  useEffect(() => {
    const newSources = domain && !personal ? getLogo(domain) : [];
    setAttemptIndex(0);
    setLogoUrl(newSources.length > 0 ? newSources[0] : null);
  }, [from]);

  function handleError() {
    const next = attemptIndex + 1;
    if (next < sources.length) {
      setAttemptIndex(next);
      setLogoUrl(sources[next]);
    } else {
      setLogoUrl(null);
    }
  }

  if (logoUrl) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-[var(--border)]">
        <img
          src={logoUrl}
          alt={name}
          className="h-6 w-6 object-contain"
          onError={handleError}
        />
      </div>
    );
  }

  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
      style={{ backgroundColor: bg }}
    >
      {initial}
    </div>
  );
}

function UrgencyDot({ urgency }: { urgency: string | null }) {
  if (!urgency) return null;
  const color = URGENCY_COLOR[urgency as keyof typeof URGENCY_COLOR];
  if (!color) return null;
  return (
    <div
      className="absolute right-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

function formatTime(receivedAt: string | null): string {
  if (!receivedAt) return "";
  const date = new Date(receivedAt);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }
  if (days === 1) return "Yesterday";
  if (days < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

interface EmailItemProps {
  email: EmailRow;
  isSelected: boolean;
  isFocused: boolean;
  onClick: () => void;
}

export function EmailItem({
  email,
  isSelected,
  isFocused,
  onClick,
}: EmailItemProps) {
  const senderName = getSenderName(email.from);
  const showDot = email.category === "primary" && !!email.urgency;
  const cleanSnippet = decodeHtmlEntities(
    email.summaryShort ?? email.snippet ?? ""
  );

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full border-b border-[var(--border)] px-3 py-3 text-left transition-colors duration-100",
        isSelected
          ? "bg-[var(--accent)]/10"
          : isFocused
          ? "bg-[var(--surface-2)]"
          : "bg-[var(--surface-0)] hover:bg-[var(--surface-1)]"
      )}
    >
      <div className="flex items-start gap-3">
        <SenderAvatar from={email.from} />

        <div className="min-w-0 flex-1 pr-6">
          <div className="flex items-baseline justify-between gap-2">
            <span
              className={cn(
                "truncate text-[13px]",
                !email.isRead
                  ? "font-semibold text-[var(--foreground)]"
                  : "font-medium text-[var(--foreground)]"
              )}
            >
              {senderName}
            </span>
            <span className="shrink-0 font-mono text-[11px] text-[var(--muted)]">
              {formatTime(email.receivedAt)}
            </span>
          </div>

          <div
            className={cn(
              "mt-0.5 truncate text-[12.5px]",
              !email.isRead
                ? "font-semibold text-[var(--foreground)]"
                : "font-medium text-[var(--foreground)]"
            )}
          >
            {email.subject}
          </div>

          <div className="mt-0.5 truncate text-[12px] text-[var(--muted)]">
            {cleanSnippet}
          </div>

          {email.isMeetingRequest && (
            <div className="mt-1 inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-500">
              Meeting request
            </div>
          )}
        </div>
      </div>

      {showDot && <UrgencyDot urgency={email.urgency} />}
    </button>
  );
}