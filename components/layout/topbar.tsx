"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor, Search } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

const THEMES = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Monitor, label: "System" },
] as const;

export function Topbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — theme is only known on the client
  useEffect(() => setMounted(true), []);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--surface)] px-4">
      {/* Search trigger (command palette comes later) */}
      <button className="group flex h-9 w-full max-w-sm items-center gap-2.5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] px-3 text-left transition-colors hover:border-[var(--border-strong)]">
        <Search className="h-4 w-4 text-[var(--text-faint)]" strokeWidth={2} />
        <span className="flex-1 text-[13px] text-[var(--text-faint)]">
          Search or ask anything…
        </span>
        <kbd className="tabular rounded border border-[var(--border)] px-1.5 py-0.5 text-[11px] text-[var(--text-faint)]">
          ⌘K
        </kbd>
      </button>

      <div className="flex items-center gap-2">
        {/* Theme toggle segmented control */}
        <div className="flex items-center gap-0.5 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] p-0.5">
          {THEMES.map(({ value, icon: Icon, label }) => {
            const active = mounted && theme === value;
            return (
              <button
                key={value}
                onClick={() => setTheme(value)}
                aria-label={`${label} theme`}
                title={`${label} theme`}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] transition-colors",
                  active
                    ? "bg-[var(--surface)] text-[var(--text)] shadow-[var(--shadow-sm)]"
                    : "text-[var(--text-faint)] hover:text-[var(--text-muted)]"
                )}
              >
                <Icon className="h-[15px] w-[15px]" strokeWidth={2} />
              </button>
            );
          })}
        </div>

        {/* User menu */}
        <UserButton
          appearance={{
            elements: {
              avatarBox: "h-8 w-8",
            },
          }}
        />
      </div>
    </header>
  );
}