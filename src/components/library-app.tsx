"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { BookMarked } from "lucide-react";
import { AuthPanel } from "@/components/auth-panel";
import { Dashboard } from "@/components/dashboard";
import { supabase } from "@/lib/supabase";
import { applySettings, DEFAULT_SETTINGS, loadSettings } from "@/lib/settings";

export function LibraryApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  // Apply theme only when authenticated — the landing page has a bespoke
  // Spline scene and specific colour palette that must stay as designed.
  // When the user logs in, switch to their saved preferences.
  // When they log out, revert to Etap Default.
  useEffect(() => {
    if (session) {
      applySettings(loadSettings());
    } else {
      // Revert to Etap Default for the landing page.
      // Also force body.background directly so no theme bleed survives.
      applySettings(DEFAULT_SETTINGS);
      document.body.style.background = "#0d1117";
      document.documentElement.style.setProperty("--bg", "#0d1117");
      document.body.classList.remove("gradient-active");
      document.documentElement.style.setProperty("--is-gradient", "0");
    }
  }, [session]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center" style={{ background: "#0d1117" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="grid h-10 w-10 place-items-center rounded-md" style={{ border: "1px solid #30363d", background: "#161b22" }}>
            <BookMarked size={18} style={{ color: "#2f81f7" }} className="animate-pulse" />
          </div>
          <div className="h-px w-20 overflow-hidden rounded-full" style={{ background: "#21262d" }}>
            <div className="h-full w-1/2 animate-[shimmer_1s_ease_infinite] rounded-full" style={{ background: "#2f81f7" }} />
          </div>
          <p className="mono text-[10px] uppercase tracking-widest" style={{ color: "#484f58" }}>a preparar…</p>
        </div>
      </div>
    );
  }

  if (!session) return <AuthPanel />;
  return <Dashboard session={session} />;
}
