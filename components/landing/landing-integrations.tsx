"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mail, CalendarDays, GitBranch, LayoutList, FileText } from "lucide-react";

const W = 480, H = 340, CX = 240, CY = 170;

const NODES = [
  { name: "Gmail",    Icon: Mail,        color: "#EA4335", x: CX,    y: 38    },
  { name: "Calendar", Icon: CalendarDays, color: "#4285F4", x: 58,   y: CY    },
  { name: "GitHub",   Icon: GitBranch,   color: "#8b949e", x: W-58,  y: CY    },
  { name: "Jira",     Icon: LayoutList,  color: "#0052CC", x: 88,    y: H-38  },
  { name: "Notion",   Icon: FileText,    color: "#6366f1", x: W-88,  y: H-38  },
];

const NODE_R = 24;

const DESC: Record<string, string> = {
  Gmail:    "Read, send, search, and triage emails",
  Calendar: "Create events, view schedule, prep meeting briefs",
  GitHub:   "Browse PRs, issues, and repositories",
  Jira:     "Create and track issues across projects",
  Notion:   "Read and update pages and databases",
};

export default function LandingIntegrations() {
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section id="integrations" ref={ref} className="py-24 px-4 sm:px-6 lg:px-8"
      style={{ background: "var(--surface-2)" }}>
      <div className="max-w-6xl mx-auto">

        <div className="text-center mb-16 space-y-4"
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
            Integrations
          </span>
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight"
            style={{ color: "var(--text)", fontFamily: "var(--font-sans)" }}>
            All your tools. One hub.
          </h2>
          <p className="text-lg max-w-xl mx-auto"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
            Nexus connects to the five tools most teams live in.
            More integrations ship continuously via Corsair.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center">

          {/* SVG hub */}
          <div className="w-full rounded-2xl overflow-hidden flex items-center justify-center py-6"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow)",
              opacity: visible ? 1 : 0,
              transform: visible ? "scale(1)" : "scale(0.97)",
              transition: "opacity 0.7s ease 100ms, transform 0.7s ease 100ms",
            }}>
            <svg viewBox={"0 0 " + W + " " + H} width="100%"
              style={{ maxWidth: 420, display: "block" }}>
              <defs>
                <radialGradient id="nx-cg" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="var(--signal)" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#1a4a57" />
                </radialGradient>
              </defs>

              {NODES.map((node, i) => {
                const len = Math.hypot(node.x - CX, node.y - CY);
                const isHov = hovered === node.name;
                return (
                  <line key={node.name + "-l"}
                    x1={node.x} y1={node.y} x2={CX} y2={CY}
                    stroke={isHov ? node.color : "var(--border-strong)"}
                    strokeWidth={isHov ? 2 : 1.5}
                    strokeDasharray={len}
                    strokeDashoffset={visible ? 0 : len}
                    style={{
                      transition:
                        "stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1) " + (i * 110 + 80) + "ms," +
                        "stroke 0.2s ease, stroke-width 0.2s ease",
                      filter: isHov ? "drop-shadow(0 0 5px " + node.color + "80)" : "none",
                    }} />
                );
              })}

              {visible && NODES.map((node, i) => (
                <circle key={node.name + "-p"} r={2.5} fill={node.color} opacity={0.7}>
                  <animateMotion dur={(1.6 + i * 0.28) + "s"} repeatCount="indefinite"
                    path={"M " + node.x + " " + node.y + " L " + CX + " " + CY} />
                </circle>
              ))}

              {NODES.map((node, i) => {
                const { Icon } = node;
                const isHov = hovered === node.name;
                const d = i * 90 + 200;
                return (
                  <g key={node.name} style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHovered(node.name)}
                    onMouseLeave={() => setHovered(null)}>
                    <circle cx={node.x} cy={node.y} r={NODE_R + 9} fill={node.color}
                      opacity={isHov ? 0.14 : 0} style={{ transition: "opacity 0.2s ease" }} />
                    <circle cx={node.x} cy={node.y} r={NODE_R}
                      fill="var(--surface-2)"
                      stroke={isHov ? node.color : "var(--border)"}
                      strokeWidth={isHov ? 2 : 1.5}
                      style={{
                        opacity: visible ? 1 : 0,
                        transform: visible ? "scale(1)" : "scale(0.4)",
                        transformOrigin: node.x + "px " + node.y + "px",
                        transition:
                          "opacity 0.5s ease " + d + "ms," +
                          "transform 0.5s cubic-bezier(0.22,1,0.36,1) " + d + "ms," +
                          "stroke 0.2s ease",
                      }} />
                    <foreignObject x={node.x - 10} y={node.y - 10} width={20} height={20}
                      style={{
                        overflow: "visible", pointerEvents: "none",
                        opacity: visible ? 1 : 0,
                        transition: "opacity 0.4s ease " + (d + 150) + "ms",
                      }}>
                      <div style={{ width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", color: node.color }}>
                        <Icon size={13} />
                      </div>
                    </foreignObject>
                    <text x={node.x} y={node.y + NODE_R + 14} textAnchor="middle"
                      fontSize={10.5} fontWeight={600}
                      fill={isHov ? node.color : "var(--text-muted)"}
                      style={{ fontFamily: "var(--font-sans)", opacity: visible ? 1 : 0, transition: "opacity 0.4s ease " + (d + 200) + "ms, fill 0.2s ease" }}>
                      {node.name}
                    </text>
                  </g>
                );
              })}

              <circle cx={CX} cy={CY} r={36} fill="none" stroke="var(--signal)"
                strokeWidth={1} strokeDasharray="5 5"
                opacity={visible ? 0.4 : 0} style={{ transition: "opacity 0.5s ease 500ms" }}>
                <animateTransform attributeName="transform" type="rotate"
                  from={"0 " + CX + " " + CY} to={"360 " + CX + " " + CY}
                  dur="18s" repeatCount="indefinite" />
              </circle>
              <circle cx={CX} cy={CY} r={30} fill="url(#nx-cg)"
                opacity={visible ? 1 : 0} style={{ transition: "opacity 0.5s ease 450ms" }} />
              <text x={CX} y={CY + 6} textAnchor="middle" fontSize={17} fontWeight={800} fill="white"
                style={{ fontFamily: "var(--font-sans)", opacity: visible ? 1 : 0, transition: "opacity 0.4s ease 550ms" }}>
                N
              </text>
            </svg>
          </div>

          {/* List */}
          <div className="space-y-3">
            {NODES.map((node, i) => {
              const { Icon } = node;
              const isHov = hovered === node.name;
              return (
                <div key={node.name}
                  className="flex items-center gap-4 p-4 rounded-xl cursor-default"
                  style={{
                    background: isHov ? node.color + "0c" : "var(--surface)",
                    border: "1px solid " + (isHov ? node.color + "55" : "var(--border)"),
                    opacity: visible ? 1 : 0,
                    transform: visible ? "translateX(0)" : "translateX(18px)",
                    transition:
                      "opacity 0.55s cubic-bezier(0.22,1,0.36,1) " + (i * 75 + 180) + "ms," +
                      "transform 0.55s cubic-bezier(0.22,1,0.36,1) " + (i * 75 + 180) + "ms," +
                      "background 0.2s ease, border-color 0.2s ease",
                  }}
                  onMouseEnter={() => setHovered(node.name)}
                  onMouseLeave={() => setHovered(null)}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: node.color + "18", color: node.color }}>
                    <Icon size={19} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm" style={{ color: "var(--text)", fontFamily: "var(--font-sans)" }}>
                      {node.name}
                    </p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}>
                      {DESC[node.name]}
                    </p>
                  </div>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" title="Connected"
                    style={{ background: "var(--success)" }} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}