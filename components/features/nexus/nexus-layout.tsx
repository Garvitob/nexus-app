"use client";

import { useState, useEffect } from "react";
import { NexusSessions } from "./nexus-sessions";
import { NexusChat } from "./nexus-chat";

export function NexusLayout() {
  const [isDark, setIsDark] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

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

  function handleSelectSession(id: string) {
    setActiveSessionId(id);
  }

  function handleNewSession() {
    setActiveSessionId(null);
  }

  function handleSessionCreated(id: string) {
    setActiveSessionId(id);
  }

  return (
    <div className="flex h-full overflow-hidden">
      <NexusSessions
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        isDark={isDark}
      />
      <NexusChat
        sessionId={activeSessionId}
        onSessionCreated={handleSessionCreated}
        isDark={isDark}
      />
    </div>
  );
}