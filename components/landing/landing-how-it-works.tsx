"use client";

import React, { useState, useEffect, useRef } from "react";
import { Link2, MessageSquare, Rocket } from "lucide-react";

const STEPS = [
  {
    n: 1, title: "Connect your tools",
    body: "Link Gmail, Calendar, GitHub, Jira, and Notion with one OAuth click each. Corsair handles auth, per-user credential isolation, and token refresh automatically.",
    icon: Link2, accent: "var(--signal)",
    tags: ["OAuth 2.0", "Per-user isolation", "Auto token refresh"],
  },
  {
    n: 2, title: "Ask in plain English",
    body: 'Type what you need in the Nexus command bar or page copilot. No special syntax — "show urgent emails", "schedule team sync tomorrow 3 PM", "find open PRs".',
    icon: MessageSquare, accent: "#4285F4",
    tags: ["Natural language", "Cross-tool context", "No syntax required"],
  },
  {
    n: 3, title: "Nexus executes",
    body: "Nexus AI uses Corsair MCP to discover the right operation, inspect its schema, and execute it in real time. You get a confirmation — not just a response.",
    icon: Rocket, accent: "#34A853",
    tags: ["Real execution", "Corsair MCP", "Audit logged"],
  },
];

export default function LandingHowItWorks() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.08 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const isSignal = (accent: string) => accent === "var(--signal)";

  return (
    <section id="how-it-works" ref={ref} className="py-24 px-4 sm:px-6 lg:px-8"
      style={{ background: "var(--bg)" }}>
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-start">

          {/* Left sticky */}
          <div className="md:sticky md:top-24"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(16px)",
              transition: "opacity 0.6s ease, transform 0.6s ease",
            }}>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-5"
              style={{
                background: "var(--signal-soft)",
                border: "1px solid color-mix(in srgb, var(--signal) 25%, transparent)",
                color: "var(--signal-text)",
              }}>
              How it works
            </span>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-5"
              style={{ color: "var(--text)", fontFamily: "var(--font-sans)" }}>
              From command<br />to execution<br />
              <span style={{ color: "var(--signal)" }}>in seconds.</span>
            </h2>
            <p className="text-base leading-relaxed mb-10"
              style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
              Three steps. No code. No configuration. Nexus does the work — you direct it.
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[{ n: "5", label: "Tools unified" }, { n: "<2s", label: "Avg execution" }, { n: "100%", label: "Actions logged" }].map(({ n, label }) => (
                <div key={label} className="rounded-xl p-4 text-center"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div className="text-2xl font-extrabold tabular"
                    style={{ color: "var(--signal)", fontFamily: "var(--font-mono)" }}>{n}</div>
                  <div className="text-xs mt-0.5"
                    style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right steps */}
          <div className="space-y-0">
            {STEPS.map((step, idx) => {
              const Icon  = step.icon;
              const delay = 200 + idx * 130;
              const sig   = isSignal(step.accent);

              return (
                <div key={step.n} className="flex gap-6"
                  style={{
                    opacity: visible ? 1 : 0,
                    transform: visible ? "translateX(0)" : "translateX(-20px)",
                    transition:
                      "opacity 0.6s cubic-bezier(0.22,1,0.36,1) " + delay + "ms," +
                      "transform 0.6s cubic-bezier(0.22,1,0.36,1) " + delay + "ms",
                  }}>
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-base flex-shrink-0"
                      style={{
                        background: sig ? "var(--signal-soft)" : step.accent + "18",
                        border: "1.5px solid " + (sig ? "color-mix(in srgb, var(--signal) 40%, transparent)" : step.accent + "55"),
                        color: step.accent,
                        fontFamily: "var(--font-mono)",
                      }}>
                      {step.n}
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div className="w-px mt-4 flex-1"
                        style={{
                          minHeight: 40,
                          background: "linear-gradient(to bottom, " + (sig ? "var(--signal)" : step.accent) + "60, transparent)",
                        }} />
                    )}
                  </div>

                  <div className="pb-12 pt-0.5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: sig ? "var(--signal-soft)" : step.accent + "18", color: step.accent }}>
                        <Icon size={16} />
                      </div>
                      <h3 className="text-lg font-bold"
                        style={{ color: "var(--text)", fontFamily: "var(--font-sans)" }}>
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-sm leading-relaxed mb-4 max-w-sm"
                      style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
                      {step.body}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {step.tags.map(tag => (
                        <span key={tag} className="px-2.5 py-1 rounded-md text-xs font-semibold"
                          style={{
                            background: sig ? "var(--signal-soft)" : step.accent + "12",
                            border: "1px solid " + (sig ? "color-mix(in srgb, var(--signal) 25%, transparent)" : step.accent + "30"),
                            color: step.accent,
                            fontFamily: "var(--font-sans)",
                          }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}