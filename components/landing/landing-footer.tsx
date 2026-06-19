"use client";

import React from "react";
import Link from "next/link";

interface ColLink {
  label: string;
  href: string;
}

interface Col {
  title: string;
  links: ColLink[];
}

interface Social {
  label: string;
  href: string;
  letter: string;
}

const COLS: Col[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "How it works", href: "#how-it-works" },
      { label: "Integrations", href: "#integrations" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Changelog", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
      { label: "Security", href: "#" },
    ],
  },
];

const SOCIALS: Social[] = [
  { label: "GitHub", href: "#", letter: "GH" },
  { label: "Twitter", href: "#", letter: "X" },
  { label: "LinkedIn", href: "#", letter: "in" },
];

function SocialButton({ social }: { social: Social }) {
  return (
    <a
      href={social.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={social.label}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "2rem",
        height: "2rem",
        borderRadius: "0.5rem",
        fontSize: "0.75rem",
        fontWeight: 700,
        textDecoration: "none",
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        color: "var(--text-muted)",
        fontFamily: "var(--font-mono)",
        transition: "all 0.15s ease",
      }}
    >
      {social.letter}
    </a>
  );
}

function FooterLink({ link }: { link: ColLink }) {
  return (
    <a
      href={link.href}
      style={{
        display: "block",
        fontSize: "0.875rem",
        textDecoration: "none",
        color: "var(--text-muted)",
        fontFamily: "var(--font-sans)",
        transition: "color 0.15s ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.color = "var(--text)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-muted)";
      }}
    >
      {link.label}
    </a>
  );
}

export default function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        background: "var(--bg)",
        borderTop: "1px solid var(--border)",
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">

          {/* Brand column */}
          <div className="col-span-2 md:col-span-1 space-y-5">
            <Link href="/" className="flex items-center gap-2.5 group w-fit">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                style={{
                  background: "linear-gradient(135deg, var(--signal) 0%, #1a4a57 100%)",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  <circle cx="8" cy="8" r="1.8" fill="white" />
                </svg>
              </div>
              <span
                className="font-bold text-lg tracking-tight"
                style={{ color: "var(--text)", fontFamily: "var(--font-sans)" }}
              >
                Nexus
              </span>
            </Link>

            <p
              className="text-sm leading-relaxed max-w-xs"
              style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}
            >
              Autonomous AI workspace that executes across Gmail, Calendar,
              GitHub, Jira, and Notion.
            </p>

            <div className="flex items-center gap-2">
              {SOCIALS.map((social) => (
                <SocialButton key={social.label} social={social} />
              ))}
            </div>
          </div>

          {/* Link columns */}
          {COLS.map((col) => (
            <div key={col.title}>
              <h4
                className="text-xs font-bold uppercase tracking-widest mb-4"
                style={{ color: "var(--text-faint)", fontFamily: "var(--font-sans)" }}
              >
                {col.title}
              </h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <FooterLink link={link} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <span
            className="text-sm"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-sans)" }}
          >
            &copy; {year} Nexus. All rights reserved.
          </span>
          <span
            className="text-sm"
            style={{ color: "var(--text-faint)", fontFamily: "var(--font-sans)" }}
          >
            Built with{" "}
            <span style={{ color: "var(--signal)", fontWeight: 600 }}>Corsair</span>
            {" "}&times;{" "}
            <span style={{ color: "var(--signal)", fontWeight: 600 }}>OpenAI</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
