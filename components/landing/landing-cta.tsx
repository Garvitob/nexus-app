"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Shield, Zap, Lock } from "lucide-react";

interface TrustItem {
  Icon: React.ElementType;
  label: string;
  sub: string;
}

const TRUST: TrustItem[] = [
  { Icon: Zap,    label: "5 tools unified",      sub: "one command center"    },
  { Icon: Lock,   label: "Corsair-secured auth", sub: "per-user OAuth tokens" },
  { Icon: Shield, label: "Every action logged",  sub: "full audit trail"      },
];

function TrustCard({ item }: { item: TrustItem }) {
  const Icon = item.Icon;
  return (
    <div className="flex items-center gap-2.5 text-left">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: "var(--signal-soft)", color: "var(--signal)" }}
      >
        <Icon size={15} />
      </div>
      <div>
        <p
          className="text-sm font-semibold"
          style={{ color: "var(--text)", fontFamily: "var(--font-sans)" }}
        >
          {item.label}
        </p>
        <p
          className="text-xs"
          style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}
        >
          {item.sub}
        </p>
      </div>
    </div>
  );
}

export default function LandingCTA() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.18 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
      style={{ background: "var(--bg)" }}
    >
      {/* Ambient orb */}
      <div
        className="nx-orb absolute rounded-full pointer-events-none"
        style={{
          width: 600,
          height: 600,
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          background: "radial-gradient(circle, var(--signal) 0%, transparent 65%)",
          opacity: 0.06,
        }}
      />

      <div className="max-w-3xl mx-auto relative z-10">
        <div
          className="rounded-2xl p-10 sm:p-14 text-center"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8"
            style={{
              background: "var(--signal-soft)",
              border: "1px solid color-mix(in srgb, var(--signal) 25%, transparent)",
              color: "var(--signal-text)",
              opacity: visible ? 1 : 0,
              transition: "opacity 0.5s ease",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "0.375rem",
                height: "0.375rem",
                borderRadius: "9999px",
                background: "var(--signal)",
                flexShrink: 0,
              }}
            />
            Free to start. No credit card required.
          </div>

          {/* Headline */}
          <h2
            className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-5"
            style={{
              color: "var(--text)",
              fontFamily: "var(--font-sans)",
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(18px)",
              transition: "opacity 0.65s ease 80ms, transform 0.65s cubic-bezier(0.22,1,0.36,1) 80ms",
            }}
          >
            Ready to command
            <br />
            <span style={{ color: "var(--signal)" }}>your workspace?</span>
          </h2>

          {/* Subtext */}
          <p
            className="text-base sm:text-lg mb-10 max-w-lg mx-auto leading-relaxed"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-sans)",
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(14px)",
              transition: "opacity 0.65s ease 160ms, transform 0.65s cubic-bezier(0.22,1,0.36,1) 160ms",
            }}
          >
            Connect your tools, type a command, and let Nexus execute.
            Setup takes under three minutes.
          </p>

          {/* CTA buttons */}
          <div
            className="flex flex-col sm:flex-row gap-3 justify-center mb-12"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(10px)",
              transition: "opacity 0.65s ease 240ms, transform 0.65s cubic-bezier(0.22,1,0.36,1) 240ms",
            }}
          >
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-semibold text-white rounded-xl group"
              style={{
                background: "linear-gradient(135deg, var(--signal) 0%, #1a4a57 100%)",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.boxShadow = "0 0 30px color-mix(in srgb, var(--signal) 50%, transparent)";
                el.style.transform = "scale(1.03)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.boxShadow = "none";
                el.style.transform = "scale(1)";
              }}
            >
              Start free — no card needed
              <ArrowRight size={15} />
            </Link>

            <button
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-semibold rounded-xl"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.borderColor = "var(--signal)";
                el.style.color = "var(--signal)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.borderColor = "var(--border)";
                el.style.color = "var(--text-muted)";
              }}
            >
              Schedule a demo
            </button>
          </div>

          {/* Trust indicators */}
          <div
            className="pt-8 flex flex-wrap items-start justify-center gap-6 sm:gap-10"
            style={{
              borderTop: "1px solid var(--border)",
              opacity: visible ? 1 : 0,
              transition: "opacity 0.65s ease 320ms",
            }}
          >
            {TRUST.map((item) => (
              <TrustCard key={item.label} item={item} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
