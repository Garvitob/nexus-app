"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Sparkles,
  Mail,
  CalendarDays,
  Users,
  Settings,
  ChevronDown,
  Hexagon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME, ROUTES, EMAIL_CATEGORIES } from "@/lib/constants";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  // Optional sub-navigation (used by Smart Inbox)
  children?: { label: string; href: string; count?: number }[];
};

const NAV: NavItem[] = [
  { label: "Nexus AI", href: ROUTES.NEXUS, icon: Sparkles },
  {
    label: "Smart Inbox",
    href: ROUTES.INBOX,
    icon: Mail,
    children: [
      {
        label: "Primary",
        href: `${ROUTES.INBOX}?c=${EMAIL_CATEGORIES.PRIMARY}`,
      },
      {
        label: "Promotions",
        href: `${ROUTES.INBOX}?c=${EMAIL_CATEGORIES.PROMOTIONS}`,
      },
      { label: "Spam", href: `${ROUTES.INBOX}?c=${EMAIL_CATEGORIES.SPAM}` },
      { label: "All mail", href: `${ROUTES.INBOX}?c=${EMAIL_CATEGORIES.ALL}` },
    ],
  },
  { label: "Todo", href: ROUTES.TODO, icon: CalendarDays },
  { label: "Meetings", href: ROUTES.MEETINGS, icon: Users },
  { label: "Settings", href: ROUTES.SETTINGS, icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [inboxOpen, setInboxOpen] = useState(pathname.startsWith(ROUTES.INBOX));

  return (
    <aside className="flex h-full w-[232px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)]">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-[var(--radius)] bg-[var(--signal)]">
          <Hexagon className="h-4 w-4 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-[var(--text)]">
          {APP_NAME}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 px-2.5 py-2">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === ROUTES.NEXUS
              ? pathname === item.href
              : pathname.startsWith(item.href);

          // Smart Inbox with collapsible children
          if (item.children) {
            return (
              <div key={item.href}>
                <button
                  onClick={() => setInboxOpen((v) => !v)}
                  className={cn(
                    "group flex w-full items-center gap-2.5 rounded-[var(--radius)] px-2.5 py-2 text-[13px] font-medium transition-colors",
                    active
                      ? "bg-[var(--signal-soft)] text-[var(--signal-text)]"
                      : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 transition-transform",
                      inboxOpen ? "rotate-0" : "-rotate-90"
                    )}
                    strokeWidth={2.5}
                  />
                </button>

                {inboxOpen && (
                  <div className="mt-0.5 flex flex-col gap-0.5 pb-1 pl-[34px]">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="flex items-center justify-between rounded-[var(--radius-sm)] px-2.5 py-1.5 text-[12.5px] text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
                      >
                        <span>{child.label}</span>
                        {typeof child.count === "number" && (
                          <span className="tabular text-[11px] text-[var(--text-faint)]">
                            {child.count}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          // Standard nav item
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-[var(--radius)] px-2.5 py-2 text-[13px] font-medium transition-colors",
                active
                  ? "bg-[var(--signal-soft)] text-[var(--signal-text)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}