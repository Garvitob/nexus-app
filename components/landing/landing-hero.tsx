"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Mail, CalendarDays, GitBranch, CheckSquare, FileText } from "lucide-react";

const COMMANDS = [
  { text: "Show my urgent emails and draft replies",  tools: ["Gmail", "AI"] },
  { text: "Schedule team sync tomorrow at 3 PM",     tools: ["Calendar"] },
  { text: "Find open PRs that need my review",       tools: ["GitHub"] },
  { text: "What meetings do I have this week?",      tools: ["Calendar"] },
  { text: "Create a Jira ticket for the login bug",  tools: ["Jira"] },
];

const TOOL_META: Record<string, { color: string; Icon: React.ElementType }> = {
  Gmail:    { color: "#EA4335", Icon: Mail },
  Calendar: { color: "#4285F4", Icon: CalendarDays },
  GitHub:   { color: "#8b949e", Icon: GitBranch },
  Jira:     { color: "#0052CC", Icon: CheckSquare },
  AI:       { color: "#5bb8cd", Icon: CheckCircle2 },
};

const INTEGRATIONS = [
  { name: "Gmail",    Icon: Mail,        color: "#EA4335" },
  { name: "Calendar", Icon: CalendarDays, color: "#4285F4" },
  { name: "GitHub",   Icon: GitBranch,   color: "#8b949e" },
  { name: "Jira",     Icon: CheckSquare, color: "#0052CC" },
  { name: "Notion",   Icon: FileText,    color: "#6366f1" },
];

type Phase = "typing" | "pause" | "executing" | "done" | "clearing";

export default function LandingHero() {
  const [cmdIdx,   setCmdIdx]   = useState(0);
  const [typed,    setTyped]    = useState("");
  const [phase,    setPhase]    = useState<Phase>("typing");
  const [execStep, setExecStep] = useState(0);
  const [visible,  setVisible]  = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const cmd = COMMANDS[cmdIdx];
    let t: ReturnType<typeof setTimeout>;

    switch (phase) {
      case "typing":
        if (typed.length < cmd.text.length) {
          const ch = cmd.text[typed.length];
          const delay = /[ ,.]/.test(ch) ? 55 : 22 + Math.random() * 22;
          t = setTimeout(() => setTyped(cmd.text.slice(0, typed.length + 1)), delay);
        } else {
          t = setTimeout(() => setPhase("pause"), 420);
        }
        break;
      case "pause":
        t = setTimeout(() => setPhase("executing"), 200);
        break;
      case "executing":
        if (execStep < cmd.tools.length) {
          t = setTimeout(() => setExecStep(s => s + 1), 480);
        } else {
          t = setTimeout(() => setPhase("done"), 500);
        }
        break;
      case "done":
        t = setTimeout(() => setPhase("clearing"), 2200);
        break;
      case "clearing":
        if (typed.length > 0) {
          t = setTimeout(() => setTyped(p => p.slice(0, -2)), 14);
        } else {
          setExecStep(0);
          setCmdIdx(i => (i + 1) % COMMANDS.length);
          setPhase("typing");
        }
        break;
    }
    return () => clearTimeout(t);
  }, [phase, typed, execStep, cmdIdx]);

  const cmd        = COMMANDS[cmdIdx];
  const showExec   = phase === "executing" || phase === "done";
  const showCursor = phase === "typing" || phase === "pause";

  return (
    <section
      className="relative min-h-screen flex flex-col justify-center pt-20 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden"
      style={{ background: "var(--bg)" }}
    >
      {/* Ambient orbs */}
      <div className="nx-orb absolute" style={{
        width: 560, height: 560, top: "-12%", left: "-8%",
        background: "radial-gradient(circle, var(--signal) 0%, transparent 68%)",
        opacity: 0.07,
      }} />
      <div className="nx-orb absolute" style={{
        width: 480, height: 480, bottom: "-8%", right: "-6%",
        background: "radial-gradient(circle, var(--signal) 0%, transparent 68%)",
        opacity: 0.05, animationDelay: "2.5s",
      }} />

      <div
        className="max-w-5xl mx-auto w-full relative z-10"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(22px)",
          transition: "opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8"
          style={{
            background: "var(--signal-soft)",
            border: "1px solid color-mix(in srgb, var(--signal) 30%, transparent)",
            color: "var(--signal-text)",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: "var(--signal)", display: "inline-block" }} />
          Autonomous AI workspace — powered by Corsair MCP
        </div>

        {/* Headline */}
        <h1
          className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.04] mb-6"
          style={{ color: "var(--text)", fontFamily: "var(--font-sans)" }}
        >
          Your entire workspace.
          <br />
          <span style={{
            background: "linear-gradient(90deg, var(--signal) 0%, color-mix(in srgb, var(--signal) 60%, white) 50%, var(--signal) 100%)",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            animation: "nx-shimmer 4s linear infinite",
          }}>
            One command.
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg sm:text-xl mb-10 max-w-2xl leading-relaxed"
          style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
          Nexus unifies Gmail, Calendar, GitHub, Jira, and Notion into a single AI
          command center. Ask in plain English —{" "}
          <span style={{ color: "var(--text)", fontWeight: 600 }}>Nexus executes</span>{" "}
          across all your real tools.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap gap-3 mb-14">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold text-white rounded-xl group transition-all duration-150"
            style={{ background: "linear-gradient(135deg, var(--signal) 0%, #1a4a57 100%)" }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = "0 0 28px color-mix(in srgb, var(--signal) 55%, transparent)";
              (e.currentTarget as HTMLElement).style.transform = "scale(1.03)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = "none";
              (e.currentTarget as HTMLElement).style.transform = "scale(1)";
            }}
          >
            Get started free
            <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform duration-150" />
          </Link>

          <button
            className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold rounded-xl transition-all duration-150"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--signal)";
              (e.currentTarget as HTMLElement).style.color = "var(--signal)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
              (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
            }}
          >
            Watch demo
          </button>
        </div>

        {/* Terminal mockup */}
        <div className="rounded-xl overflow-hidden mb-8" style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-lg)",
        }}>
          {/* Browser chrome */}
          <div className="flex items-center gap-2 px-4 py-3"
            style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
            <span className="w-3 h-3 rounded-full" style={{ background: "#ff5f57" }} />
            <span className="w-3 h-3 rounded-full" style={{ background: "#febc2e" }} />
            <span className="w-3 h-3 rounded-full" style={{ background: "#28c840" }} />
            <div className="ml-3 px-3 py-1 rounded-md text-xs flex-1 max-w-xs"
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
                color: "var(--text-faint)",
                fontFamily: "var(--font-mono)",
              }}>
              nexus.app
            </div>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 space-y-4">
            {/* User prompt */}
            <div className="flex items-start gap-3">
              <div
                className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white mt-0.5"
                style={{ background: "linear-gradient(135deg, var(--signal), #1a4a57)" }}
              >
                G
              </div>
              <p className="text-sm flex-1 pt-0.5"
                style={{ color: "var(--text)", fontFamily: "var(--font-mono)", letterSpacing: "0.01em" }}>
                {typed}
                {showCursor && <span className="nx-cursor" />}
              </p>
            </div>

            {/* Execution output */}
            {showExec && (
              <div className="ml-10 pl-4 space-y-2.5 pt-0.5"
                style={{ borderLeft: "2px solid var(--border)" }}>
                <p className="text-xs font-semibold mb-2"
                  style={{ color: "var(--signal)", fontFamily: "var(--font-sans)" }}>
                  ✦ Nexus
                </p>

                {cmd.tools.map((toolName, i) => {
                  const meta = TOOL_META[toolName];
                  if (!meta) return null;
                  const { color, Icon } = meta;
                  const done   = execStep > i;
                  const active = execStep === i;

                  return (
                    <div key={toolName + i} className="flex items-center gap-2 text-xs"
                      style={{
                        opacity: done || active ? 1 : 0,
                        transform: done || active ? "translateX(0)" : "translateX(-6px)",
                        transition: "opacity 0.3s ease, transform 0.3s ease",
                        fontFamily: "var(--font-mono)",
                      }}>
                      <div className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center"
                        style={{ background: color + "22", border: "1px solid " + color + "55", color }}>
                        {done ? <CheckCircle2 size={11} /> : <Icon size={11} />}
                      </div>
                      <span style={{ color: "var(--text-muted)" }}>{toolName}:&nbsp;</span>
                      <span style={{ color: done ? "var(--success)" : color, fontWeight: 500 }}>
                        {done ? "done" : "working…"}
                      </span>
                    </div>
                  );
                })}

                {phase === "done" && (
                  <div className="flex items-center gap-2 text-xs pt-0.5"
                    style={{ color: "var(--success)", fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                    <CheckCircle2 size={13} />
                    Complete — {cmd.tools.length} action{cmd.tools.length > 1 ? "s" : ""} executed
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Integration pills */}
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-medium" style={{ color: "var(--text-faint)" }}>
            Works with
          </span>
          {INTEGRATIONS.map(({ name, Icon, color }) => (
            <div key={name}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 cursor-default"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = color + "80";
                (e.currentTarget as HTMLElement).style.color = color;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
              }}
            >
              <Icon size={12} style={{ color, flexShrink: 0 }} />
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}