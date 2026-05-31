"use client";

import { useEffect, useRef, useState } from "react";
import { Check, FlaskConical, Monitor, Palette, Type, X, ZoomIn } from "lucide-react";
import {
  applySettings,
  AppSettings,
  DEFAULT_SETTINGS,
  FONT_SIZES,
  FONTS,
  loadSettings,
  saveSettings,
  THEMES,
  type FontId,
  type FontSize,
  type ThemeDef,
  type ThemeId,
} from "@/lib/settings";
import { cn } from "@/lib/utils";

type Tab = "theme" | "font" | "size";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function SettingsDialog({ open, onClose }: Props) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [tab, setTab] = useState<Tab>("theme");
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setSettings(loadSettings());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  function apply(next: AppSettings) {
    setSettings(next);
    applySettings(next);
    saveSettings(next);
  }

  function setTheme(theme: ThemeId) { apply({ ...settings, theme }); }
  function setFont(font: FontId)    { apply({ ...settings, font }); }
  function setSize(fontSize: FontSize) { apply({ ...settings, fontSize }); }

  const standardThemes    = THEMES.filter((t) => !t.experimental);
  const experimentalThemes = THEMES.filter((t) => t.experimental);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "theme", label: "Tema",    icon: <Palette size={15} /> },
    { id: "font",  label: "Fonte",   icon: <Type size={15} /> },
    { id: "size",  label: "Tamanho", icon: <ZoomIn size={15} /> },
  ];

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Definições"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        className="anim-scale-in w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--bg-2)] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--accent)]">
              <Monitor size={17} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--fg)]">Definições de Aparência</h2>
              <p className="mono text-[11px] text-[var(--fg-2)]">Personaliza a interface</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="focus-ring grid h-8 w-8 place-items-center rounded-md text-[var(--fg-3)] hover:bg-[var(--bg-3)] hover:text-[var(--fg)] transition-colors"
            aria-label="Fechar"
          >
            <X size={17} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-[var(--border)] px-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "mono flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 -mb-px",
                tab === t.id
                  ? "border-[var(--accent)] text-[var(--accent)]"
                  : "border-transparent text-[var(--fg-2)] hover:text-[var(--fg)]"
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {tab === "theme" && (
            <div className="space-y-6">
              {/* Standard themes */}
              <div>
                <p className="text-xs text-[var(--fg-2)] mb-3">
                  Escolhe a paleta de cores da interface.
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {standardThemes.map((theme) => (
                    <ThemeCard
                      key={theme.id}
                      theme={theme}
                      active={settings.theme === theme.id}
                      onSelect={() => setTheme(theme.id)}
                    />
                  ))}
                </div>
              </div>

              {/* Experimental section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1.5 rounded-md border border-[var(--purple)]/30 bg-[var(--bg-4)] px-2 py-1">
                    <FlaskConical size={11} className="text-[var(--purple)]" />
                    <span className="mono text-[10px] font-bold uppercase tracking-widest text-[var(--purple)]">
                      Experimental
                    </span>
                  </div>
                  <div className="h-px flex-1 bg-[var(--border)]" />
                </div>
                <p className="text-xs text-[var(--fg-3)] mb-3">
                  Temas com gradientes dinâmicos aplicados ao fundo da interface.
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {experimentalThemes.map((theme) => (
                    <ThemeCard
                      key={theme.id}
                      theme={theme}
                      active={settings.theme === theme.id}
                      onSelect={() => setTheme(theme.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "font" && (
            <div className="space-y-3">
              <p className="text-xs text-[var(--fg-2)] mb-4">
                Escolhe a tipografia base da interface.
              </p>
              <div className="flex flex-col gap-2">
                {FONTS.map((font) => {
                  const active = settings.font === font.id;
                  return (
                    <button
                      key={font.id}
                      onClick={() => setFont(font.id)}
                      className={cn(
                        "flex items-center gap-4 rounded-lg border p-3.5 text-left transition-all duration-100 active:scale-[0.99]",
                        active
                          ? "border-[var(--accent)] bg-[var(--accent-bg)]"
                          : "border-[var(--border)] bg-[var(--bg-3)] hover:border-[var(--border-2)] hover:bg-[var(--bg-4)]"
                      )}
                    >
                      <div
                        className="flex h-10 w-16 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg)] text-sm font-medium text-[var(--fg)]"
                        style={{ fontFamily: `'${font.cssFamily}', ${font.fallback}` }}
                      >
                        Aa
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-sm font-semibold leading-snug", active ? "text-[var(--accent)]" : "text-[var(--fg)]")}>
                          {font.label}
                        </p>
                        <p className="mono text-[11px] text-[var(--fg-2)]">{font.description}</p>
                      </div>
                      {active && <Check size={15} className="shrink-0 text-[var(--accent)]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "size" && (
            <div className="space-y-3">
              <p className="text-xs text-[var(--fg-2)] mb-4">
                Ajusta o tamanho base do texto em toda a interface.
              </p>
              <div className="flex flex-col gap-2">
                {FONT_SIZES.map((sz) => {
                  const active = settings.fontSize === sz.id;
                  return (
                    <button
                      key={sz.id}
                      onClick={() => setSize(sz.id)}
                      className={cn(
                        "flex items-center gap-4 rounded-lg border p-3.5 text-left transition-all duration-100 active:scale-[0.99]",
                        active
                          ? "border-[var(--accent)] bg-[var(--accent-bg)]"
                          : "border-[var(--border)] bg-[var(--bg-3)] hover:border-[var(--border-2)] hover:bg-[var(--bg-4)]"
                      )}
                    >
                      <div
                        className="flex h-10 w-16 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg)] font-medium text-[var(--fg)]"
                        style={{ fontSize: `${sz.px}px` }}
                      >
                        Aa
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-sm font-semibold leading-snug", active ? "text-[var(--accent)]" : "text-[var(--fg)]")}>
                          {sz.label}
                        </p>
                        <p className="mono text-[11px] text-[var(--fg-2)]">{sz.px}px base</p>
                      </div>
                      {active && <Check size={15} className="shrink-0 text-[var(--accent)]" />}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
                <p className="text-[var(--fg-2)] leading-relaxed">
                  <span className="font-semibold text-[var(--fg)]">Pré-visualização: </span>
                  Este texto mostra o tamanho atual da fonte em uso na biblioteca ETAP.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--bg-3)] px-6 py-3">
          <p className="mono text-[11px] text-[var(--fg-3)]">
            As definições são guardadas localmente
          </p>
          <button
            onClick={onClose}
            className="focus-ring rounded-md border border-[var(--accent)] bg-[var(--accent-bg)] px-4 py-1.5 text-xs font-semibold text-[var(--accent)] transition-all hover:opacity-80 active:scale-95"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Theme card ───────────────────────────────────────────────────────────────

function ThemeCard({
  theme,
  active,
  onSelect,
}: {
  theme: ThemeDef;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "group flex items-center gap-3 rounded-lg border p-3 text-left transition-all duration-100 active:scale-[0.98]",
        active
          ? "border-[var(--accent)] bg-[var(--accent-bg)]"
          : "border-[var(--border)] bg-[var(--bg-3)] hover:border-[var(--border-2)] hover:bg-[var(--bg-4)]"
      )}
    >
      {/* Swatch */}
      {theme.bodyGradient ? (
        // Gradient themes: show the actual gradient
        <span
          className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md border border-white/10 shadow-inner"
          style={{ background: theme.bodyGradient }}
        >
          {/* Shimmer overlay to hint at "live" quality */}
          <span className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
          {/* Accent dot */}
          <span
            className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full shadow-lg"
            style={{ backgroundColor: theme.swatch, boxShadow: `0 0 4px ${theme.swatch}` }}
          />
        </span>
      ) : (
        // Standard themes: two-tone bg + accent triangle
        <span
          className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md border border-black/10 shadow-inner"
          style={{ backgroundColor: theme.bgSwatch }}
        >
          <span
            className="absolute bottom-0 right-0 h-3.5 w-3.5"
            style={{
              backgroundColor: theme.swatch,
              clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
            }}
          />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className={cn("text-sm font-semibold leading-snug", active ? "text-[var(--accent)]" : "text-[var(--fg)]")}>
            {theme.label}
          </p>
        </div>
        <p className="mono text-[11px] text-[var(--fg-2)] truncate">{theme.description}</p>
      </div>
      {active && <Check size={15} className="shrink-0 text-[var(--accent)]" />}
    </button>
  );
}
