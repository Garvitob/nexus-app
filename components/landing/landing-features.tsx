"use client";

import React, { useState, useEffect, useRef } from "react";
import { Zap, Mail, CalendarDays, LayoutGrid, GitPullRequest, Command } from "lucide-react";

const FEATURES = [
  {
    id: 1, title: "Nexus AI",
    description: "Ask anything in plain English. Nexus discovers the right operation via Corsair MCP, executes it across your tools, and reports back — no syntax, no menus, real results.",
    icon: Zap, useSignal: true, accent: "",
    grid: "md:col-span-2 md:row-span-2",
  },
  {
    id: 2, title: "Smart Inbox",
    description: "AI-ranked emails with urgency scoring and one-click draft-reply generation.",
    icon: Mail, useSignal: false, accent: "#EA4335",
    grid: "md:col-span-1 md:row-span-1",
  },
  {
    id: 3, title: "Meeting Prep",
    description: "Auto-generated pre-meeting briefs pulled from your calendar context.",
    icon: CalendarDays, useSignal: false, accent: "#4285F4",
    grid: "md:col-span-1 md:row-span-1",
  },
  {
    id: 4, title: "Timeline Todo",
    description: "Drag-to-create tasks on a 24-hour timeline grid. AI suggests priorities.",
    icon: LayoutGrid, useSignal: false, accent: "#34A853",
    grid: "md:col-span-1 md:row-span-1",
  },
  {
    id: 5, title: "GitHub + Jira",
    description: "Track PRs and issues without leaving Nexus.",
    icon: GitPullRequest, useSignal: false, accent: "#6366f1",
    grid: "md:col-span-1 md:row-span-1",
  },
  {
    id: 6, title: "Keyboard First",
    description: "⌘K command palette. Every action reachable in under two keystrokes.",
    icon: Command, useSignal: false, accent: "#f59e0b",
    grid: "md:col-span-2 md:row-span-1",
  },
];

function Card({ f, visible, delay }: { f: typeof FEATURES[0]; visible: boolean; delay: number }) {
  const [hovered, setHovered] = useState(false);
  const Icon   = f.icon;
  const accent = f.useSignal ? "var(--signal)" : f.accent;

  return (
    <div
      className={"rounded-xl p-6 relative overflow-hidden cursor-default " + f.grid}
      style={{
        background: "var(--surface)",
        border: hovered
          ? "1px solid " + (f.useSignal ? "var(--signal)" : f.accent + "70")
          : "1px solid var(--border)",
        boxShadow: hovered ? "var(--shadow)" : "var(--shadow-sm)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(18px)",
        transition:
          "opacity 0.55s cubic-bezier(0.22,1,0.36,1) " + delay + "ms," +
          "transform 0.55s cubic-bezier(0.22,1,0.36,1) " + delay + "ms," +
          "border-color 0.2s ease, box-shadow 0.2s ease",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="absolute inset-0 rounded-xl pointer-events-none transition-opacity duration-200"
        style={{
          background: "radial-gradient(circle at 35% 40%, " +
            (f.useSignal ? "var(--signal)" : f.accent) + "14 0%, transparent 60%)",
          opacity: hovered ? 1 : 0,
        }} />

      <div className="relative z-10 flex flex-col h-full gap-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200"
          style={{
            background: f.useSignal ? "var(--signal-soft)" : f.accent + "18",
            color: accent,
            transform: hovered ? "scale(1.08)" : "scale(1)",
          }}>
          <Icon size={22} />
        </div>

        <div className="flex-1">
          <h3 className="font-bold text-[15px] mb-1.5" style={{ color: "var(--text)", fontFamily: "var(--font-sans)" }}>
            {f.title}
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
            {f.description}
          </p>
        </div>

        {f.id === 1 && (
          <div className="flex items-center gap-2 mt-auto pt-3" style={{ borderTop: "1px solid var(--border)" }}>
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: "var(--success)", display: "inline-block" }} />
            <span className="text-xs" style={{ color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}>
              Via Corsair MCP — real execution
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LandingFeatures() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section id="features" ref={ref} className="py-24 px-4 sm:px-6 lg:px-8"
      style={{ background: "var(--surface-2)" }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-14 space-y-4"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
            style={{
              background: "var(--signal-soft)",
              border: "1px solid color-mix(in srgb, var(--signal) 25%, transparent)",
              color: "var(--signal-text)",
            }}>
            Features
          </span>
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight"
            style={{ color: "var(--text)", fontFamily: "var(--font-sans)" }}>
            One interface.<br />All your tools.
          </h2>
          <p className="text-lg max-w-xl leading-relaxed"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
            Nexus doesn't just surface information — it takes action.
            No more switching between five apps to do one task.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-auto">
          {FEATURES.map((f, i) => (
            <Card key={f.id} f={f} visible={visible} delay={i * 65} />
          ))}
        </div>
      </div>
    </section>
  );
}