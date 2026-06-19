"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LandingPage from "@/components/landing/landing-page";

export default function HomePage() {
  const { isLoaded, userId } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && userId) {
      router.replace("/inbox");
    }
  }, [isLoaded, userId, router]);

  if (!isLoaded) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg)" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, var(--signal) 0%, #1a4a57 100%)",
            }}
          >
            <span className="text-white font-bold text-sm">N</span>
          </div>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Loading…
          </p>
        </div>
      </div>
    );
  }

  if (userId) return null;

  return <LandingPage />;
}