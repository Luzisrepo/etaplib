"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { BookMarked } from "lucide-react";
import { AuthPanel } from "@/components/auth-panel";
import { Dashboard } from "@/components/dashboard";
import { BackgroundCanvas } from "@/components/background-canvas";
import { supabase } from "@/lib/supabase";
import { applySettings, DEFAULT_SETTINGS, loadSettings, THEMES, type AppSettings } from "@/lib/settings";

import { LanguageProvider, useLanguage } from "@/lib/language-context";
import { ToastProvider } from "@/components/toast";

function LibraryAppInner() {
  const { t } = useLanguage();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // Mirror saved settings in state so the BackgroundCanvas re-renders when
  // the user changes theme/effects in the settings dialog.
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

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
      const s = loadSettings();
      setSettings(s);
      applySettings(s);
    } else {
      // Revert to Etap Default for the landing page.
      // Also force body.background directly so no theme bleed survives.
      setSettings(DEFAULT_SETTINGS);
      applySettings(DEFAULT_SETTINGS);
      document.body.style.background = "#0d1117";
      document.documentElement.style.setProperty("--bg", "#0d1117");
      document.body.classList.remove("gradient-active", "effect-active", "bg-animated", "reduce-motion");
      document.documentElement.style.setProperty("--is-gradient", "0");
      document.documentElement.style.setProperty("--is-effect", "0");
    }
  }, [session]);

  // Stay in sync when the settings dialog updates localStorage (same-tab).
  useEffect(() => {
    function onChange() { setSettings(loadSettings()); }
    window.addEventListener("etap-settings-changed", onChange);
    // Also listen for cross-tab changes.
    function onStorage(e: StorageEvent) {
      if (e.key === "etap-settings-v1") onChange();
    }
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("etap-settings-changed", onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const activeTheme = THEMES.find((t) => t.id === settings.theme);
  const isEffectTheme = !!activeTheme?.effect;
  // Effects always render inside the authenticated app. On the landing/auth
  // page they only render when the user opts in — otherwise the bespoke Spline
  // 3D scene stays as designed.
  const canvasActive = isEffectTheme && (session ? true : settings.effects.showOnLanding);

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
          <p className="mono text-[10px] uppercase tracking-widest" style={{ color: "#484f58" }}>{t("loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <BackgroundCanvas
        themeId={settings.theme}
        effects={settings.effects}
        active={canvasActive}
      />
      <div className="bg-dim-overlay" aria-hidden="true" />
      {!session ? <AuthPanel /> : <Dashboard session={session} />}
    </>
  );
}

export function LibraryApp() {
  return (
    <LanguageProvider>
      <ToastProvider>
        <LibraryAppInner />
      </ToastProvider>
    </LanguageProvider>
  );
}
