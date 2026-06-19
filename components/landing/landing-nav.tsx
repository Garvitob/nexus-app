"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Menu, X, Sun, Moon } from "lucide-react";

interface NavLink {
  label: string;
  href: string;
}

const NAV_LINKS: NavLink[] = [
  { label: "Features",     href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Integrations", href: "#integrations" },
];

function DesktopNavLink({ link }: { link: NavLink }) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const el = document.querySelector(link.href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <a
      href={link.href}
      onClick={handleClick}
      className="relative text-sm font-medium group"
      style={{
        color: "var(--text-muted)",
        textDecoration: "none",
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
      <span
        className="absolute -bottom-0.5 left-0 h-px w-0 group-hover:w-full"
        style={{
          background: "var(--signal)",
          transition: "width 0.25s cubic-bezier(0.22,1,0.36,1)",
        }}
      />
    </a>
  );
}

function MobileNavLink({ link, onClose }: { link: NavLink; onClose: () => void }) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onClose();
    const el = document.querySelector(link.href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <a
      href={link.href}
      onClick={handleClick}
      className="block px-4 py-2.5 text-sm font-medium rounded-lg mx-2"
      style={{
        color: "var(--text-muted)",
        textDecoration: "none",
        transition: "color 0.15s ease, background 0.15s ease",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.color = "var(--text)";
        el.style.background = "var(--surface-2)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLAnchorElement;
        el.style.color = "var(--text-muted)";
        el.style.background = "transparent";
      }}
    >
      {link.label}
    </a>
  );
}

export default function LandingNav() {
  const [scrolled,   setScrolled]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted,    setMounted]    = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isDark    = resolvedTheme === "dark";
  const navBlur   = scrolled ? "blur(14px) saturate(1.5)" : "none";
  const navBg     = scrolled ? "var(--surface)"            : "transparent";
  const navBorder = scrolled ? "var(--border)"             : "transparent";

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: navBg,
        backdropFilter: navBlur,
        WebkitBackdropFilter: navBlur,
        borderBottom: "1px solid " + navBorder,
        transition: "background 0.25s ease, border-color 0.25s ease",
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
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
              className="font-bold text-lg tracking-tight hidden sm:block"
              style={{ color: "var(--text)", fontFamily: "var(--font-sans)" }}
            >
              Nexus
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map((link) => (
              <DesktopNavLink key={link.href} link={link} />
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">

            {/* Theme toggle */}
            {mounted && (
              <button
                onClick={() => setTheme(isDark ? "light" : "dark")}
                title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.color = "var(--signal)";
                  el.style.borderColor = "var(--signal)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLButtonElement;
                  el.style.color = "var(--text-muted)";
                  el.style.borderColor = "var(--border)";
                }}
              >
                {isDark ? <Sun size={15} /> : <Moon size={15} />}
              </button>
            )}

            {/* Sign in */}
            <Link
              href="/sign-in"
              className="hidden md:inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg"
              style={{
                color: "var(--text-muted)",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.color = "var(--text)";
                el.style.background = "var(--surface-2)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.color = "var(--text-muted)";
                el.style.background = "transparent";
              }}
            >
              Sign in
            </Link>

            {/* Get started */}
            <Link
              href="/sign-up"
              className="hidden md:inline-flex items-center px-5 py-2 text-sm font-semibold text-white rounded-lg"
              style={{
                background: "linear-gradient(135deg, var(--signal) 0%, #1a4a57 100%)",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.boxShadow = "0 0 20px color-mix(in srgb, var(--signal) 45%, transparent)";
                el.style.transform = "scale(1.03)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.boxShadow = "none";
                el.style.transform = "scale(1)";
              }}
            >
              Get started
            </Link>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              {mobileOpen ? <X size={17} /> : <Menu size={17} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div
            style={{
              borderTop: "1px solid var(--border)",
              background: "var(--surface)",
              backdropFilter: "blur(14px)",
            }}
            className="md:hidden py-4 space-y-0.5"
          >
            {NAV_LINKS.map((link) => (
              <MobileNavLink
                key={link.href}
                link={link}
                onClose={() => setMobileOpen(false)}
              />
            ))}

            <div
              className="mx-2 pt-3 mt-1 flex flex-col gap-2"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <Link
                href="/sign-in"
                className="block px-4 py-2.5 text-sm font-medium text-center rounded-lg"
                style={{
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                }}
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="block px-4 py-2.5 text-sm font-semibold text-center text-white rounded-lg"
                style={{
                  background: "linear-gradient(135deg, var(--signal) 0%, #1a4a57 100%)",
                }}
              >
                Get started free
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
