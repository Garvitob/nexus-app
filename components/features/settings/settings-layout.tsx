"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useClerk } from "@clerk/nextjs";
import {
  Plug,
  Palette,
  UserRound,
  Sun,
  Moon,
  Monitor,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  LogOut,
  Loader2,
} from "lucide-react";

type TabId = "connections" | "appearance" | "account";

type ConnectionStatus = {
  id: string;
  label: string;
  connected: boolean;
};

interface SettingsLayoutProps {
  email: string;
  name: string | null;
  imageUrl: string | null;
}

const CORSAIR_DASHBOARD = "https://app.corsair.dev";

export function SettingsLayout({ email, name, imageUrl }: SettingsLayoutProps) {
  const [isDark, setIsDark] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("connections");
  const { signOut } = useClerk();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const check = () =>
      setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const bg = isDark ? "#0d0f12" : "#ffffff";
  const surface = isDark ? "#15171c" : "#f6f7f9";
  const surfaceAlt = isDark ? "#1a1d23" : "#ffffff";
  const border = isDark ? "#242830" : "#e9ebef";
  const tc = isDark ? "#e5e7eb" : "#111827";
  const tm = isDark ? "#5e636e" : "#98a0ac";
  const signal = "#2d7387";

  function applyTheme(mode: "light" | "dark" | "system") {
    const root = document.documentElement;
    if (mode === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", prefersDark);
      try {
        localStorage.setItem("nexus-theme", "system");
      } catch {}
    } else {
      root.classList.toggle("dark", mode === "dark");
      try {
        localStorage.setItem("nexus-theme", mode);
      } catch {}
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    await signOut({ redirectUrl: "/" });
  }

  const tabs: { id: TabId; label: string; icon: typeof Plug }[] = [
    { id: "connections", label: "Connections", icon: Plug },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "account", label: "Account", icon: UserRound },
  ];

  const activeNavBg = isDark ? "#15282e" : "#e4eff1";
  const rootStyle = { background: bg };
  const navColStyle = { borderColor: border };
  const titleStyle = { color: tc, fontSize: "17px" };
  const subtitleStyle = { color: tm, fontSize: "12px" };

  return (
    <div className="flex h-full overflow-hidden" style={rootStyle}>
      <div className="flex w-[220px] shrink-0 flex-col border-r" style={navColStyle}>
        <div className="px-5 py-5">
          <h1 className="font-bold" style={titleStyle}>Settings</h1>
          <p className="mt-0.5" style={subtitleStyle}>Manage your workspace</p>
        </div>
        <nav className="flex flex-col gap-0.5 px-3">
          {tabs.map((tab) => {
            const active = tab.id === activeTab;
            const Icon = tab.icon;
            const navStyle = {
              background: active ? activeNavBg : "transparent",
              color: active ? signal : tm,
              fontWeight: active ? 600 : 500,
              fontSize: "13px",
            };
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors"
                style={navStyle}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-8 py-8">
          {activeTab === "connections" ? (
            <ConnectionsPanel isDark={isDark} tc={tc} tm={tm} border={border} surface={surfaceAlt} signal={signal} />
          ) : null}
          {activeTab === "appearance" ? (
            <AppearancePanel isDark={isDark} tc={tc} tm={tm} border={border} surface={surfaceAlt} signal={signal} applyTheme={applyTheme} />
          ) : null}
          {activeTab === "account" ? (
            <AccountPanel isDark={isDark} tc={tc} tm={tm} border={border} surface={surfaceAlt} email={email} name={name} imageUrl={imageUrl} signingOut={signingOut} onSignOut={handleSignOut} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ConnectionsPanel(props: {
  isDark: boolean;
  tc: string;
  tm: string;
  border: string;
  surface: string;
  signal: string;
}) {
  const { isDark, tc, tm, border, surface, signal } = props;
  const { data, isLoading } = useQuery<ConnectionStatus[]>({
    queryKey: ["settings-connections"],
    queryFn: async () => {
      const res = await fetch("/api/settings/connections");
      if (!res.ok) throw new Error("failed");
      const json = await res.json();
      return json.connections;
    },
    staleTime: 30000,
  });

  const notConnectedColor = isDark ? "#a16207" : "#b45309";
  const connections = data ?? [];
  const cardStyle = { borderColor: border, background: surface };
  const loaderStyle = { color: signal };
  const labelStyle = { color: tc, fontSize: "13.5px" };
  const connectedStyle = { color: signal, fontSize: "12px" };
  const notConnectedStyle = { color: notConnectedColor, fontSize: "12px" };
  const linkStyle = { background: signal, fontSize: "13px" };
  const footStyle = { color: tm, fontSize: "11.5px" };

  return (
    <div>
      <SectionHeader title="Connections" subtitle="Your integrations are managed securely through Corsair. Connect or reconnect accounts from the Corsair dashboard." tc={tc} tm={tm} />
      <div className="overflow-hidden rounded-xl border" style={cardStyle}>
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin" style={loaderStyle} />
          </div>
        ) : (
          connections.map((conn, i) => {
            const rowStyle = { borderTop: i === 0 ? "none" : "1px solid " + border };
            return (
              <div key={conn.id} className="flex items-center justify-between px-4 py-3.5" style={rowStyle}>
                <span className="font-medium" style={labelStyle}>{conn.label}</span>
                {conn.connected ? (
                  <span className="flex items-center gap-1.5 font-medium" style={connectedStyle}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 font-medium" style={notConnectedStyle}>
                    <AlertCircle className="h-3.5 w-3.5" />
                    Not connected
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
      <a href={CORSAIR_DASHBOARD} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-semibold text-white" style={linkStyle}>
        <span>Manage in Corsair dashboard</span>
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
      <p className="mt-2.5" style={footStyle}>
        Status reflects whether Corsair currently holds valid credentials for each integration.
      </p>
    </div>
  );
}

function AppearancePanel(props: {
  isDark: boolean;
  tc: string;
  tm: string;
  border: string;
  surface: string;
  signal: string;
  applyTheme: (mode: "light" | "dark" | "system") => void;
}) {
  const { isDark, tc, tm, border, surface, signal, applyTheme } = props;
  const [savedMode, setSavedMode] = useState<string>("");

  useEffect(() => {
    try {
      setSavedMode(localStorage.getItem("nexus-theme") ?? "");
    } catch {
      setSavedMode("");
    }
  }, []);

  const options: { id: "light" | "dark" | "system"; label: string; icon: typeof Sun }[] = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "System", icon: Monitor },
  ];
  const current = isDark ? "dark" : "light";

  function isSelected(optId: string): boolean {
    if (savedMode === "system") return optId === "system";
    return optId === current;
  }

  function handlePick(optId: "light" | "dark" | "system") {
    applyTheme(optId);
    setSavedMode(optId);
  }

  return (
    <div>
      <SectionHeader title="Appearance" subtitle="Choose how Nexus looks. System matches your device settings." tc={tc} tm={tm} />
      <div className="grid grid-cols-3 gap-3">
        {options.map((opt) => {
          const Icon = opt.icon;
          const selected = isSelected(opt.id);
          const cardStyle = {
            borderColor: selected ? signal : border,
            background: surface,
            outline: selected ? "1px solid " + signal : "none",
          };
          const iconStyle = { color: selected ? signal : tm };
          const labelStyle = { color: selected ? signal : tc, fontSize: "12.5px" };
          return (
            <button key={opt.id} onClick={() => handlePick(opt.id)} className="flex flex-col items-center gap-2 rounded-xl border px-4 py-5 transition-all" style={cardStyle}>
              <Icon className="h-5 w-5" style={iconStyle} />
              <span className="font-medium" style={labelStyle}>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AccountPanel(props: {
  isDark: boolean;
  tc: string;
  tm: string;
  border: string;
  surface: string;
  email: string;
  name: string | null;
  imageUrl: string | null;
  signingOut: boolean;
  onSignOut: () => void;
}) {
  const { isDark, tc, tm, border, surface, email, name, imageUrl, signingOut, onSignOut } = props;
  const initials = (name ?? email ?? "?").split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
  const cardStyle = { borderColor: border, background: surface };
  const avatarStyle = { background: "#2d7387", fontSize: "15px" };
  const nameStyle = { color: tc, fontSize: "14px" };
  const emailStyle = { color: tm, fontSize: "12.5px" };
  const signOutStyle = {
    borderColor: isDark ? "#5b2326" : "#fecaca",
    background: isDark ? "rgba(220,38,38,0.08)" : "#fef2f2",
    color: isDark ? "#f87171" : "#dc2626",
    fontSize: "13px",
  };

  return (
    <div>
      <SectionHeader title="Account" subtitle="Your profile and session." tc={tc} tm={tm} />
      <div className="flex items-center gap-4 rounded-xl border px-5 py-4" style={cardStyle}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={name ?? email} className="h-12 w-12 rounded-full object-cover" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full font-semibold text-white" style={avatarStyle}>
            {initials}
          </div>
        )}
        <div className="min-w-0">
          {name ? <p className="truncate font-semibold" style={nameStyle}>{name}</p> : null}
          <p className="truncate" style={emailStyle}>{email}</p>
        </div>
      </div>
      <div className="mt-8">
        <button onClick={onSignOut} disabled={signingOut} className="flex items-center gap-2 rounded-lg border px-4 py-2.5 font-semibold transition-colors disabled:opacity-50" style={signOutStyle}>
          {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          {signingOut ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </div>
  );
}

function SectionHeader(props: { title: string; subtitle: string; tc: string; tm: string }) {
  const { title, subtitle, tc, tm } = props;
  const headingStyle = { color: tc, fontSize: "16px" };
  const subStyle = { color: tm, fontSize: "12.5px" };
  return (
    <div className="mb-5">
      <h2 className="font-bold" style={headingStyle}>{title}</h2>
      <p className="mt-1 leading-relaxed" style={subStyle}>{subtitle}</p>
    </div>
  );
}