"use client";

import { useEffect, useRef, useState } from "react";
import { Check, FlaskConical, Gauge, Globe, Monitor, Palette, Sparkles, Type, X, ZoomIn } from "lucide-react";
import {
  applySettings,
  AppSettings,
  DEFAULT_SETTINGS,
  FONT_SIZES,
  FONTS,
  loadSettings,
  saveSettings,
  THEMES,
  themeCategory,
  type EffectSettings,
  type FontId,
  type FontSize,
  type ParticleDensity,
  type ThemeDef,
  type ThemeId,
} from "@/lib/settings";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";

type Tab = "theme" | "effects" | "font" | "size" | "language";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function SettingsDialog({ open, onClose }: Props) {
  const { setLanguage, t } = useLanguage();
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
    // Notify other components (e.g. BackgroundCanvas in library-app) that
    // settings changed — StorageEvent only fires cross-tab.
    window.dispatchEvent(new Event("etap-settings-changed"));
  }

  function setTheme(theme: ThemeId) { apply({ ...settings, theme }); }
  function setFont(font: FontId)    { apply({ ...settings, font }); }
  function setSize(fontSize: FontSize) { apply({ ...settings, fontSize }); }
  function setEffects(patch: Partial<EffectSettings>) {
    apply({ ...settings, effects: { ...settings.effects, ...patch } });
  }
  function handleLanguageChange(lang: "pt" | "en") {
    setLanguage(lang);
    apply({ ...settings, language: lang });
  }

  // Group themes by category. "standard" + "gradient" render in the Theme tab;
  // "effect" themes get their own grid in the Effects tab.
  const standardThemes   = THEMES.filter((t) => themeCategory(t) === "standard");
  const gradientThemes   = THEMES.filter((t) => themeCategory(t) === "gradient");
  const effectThemes     = THEMES.filter((t) => themeCategory(t) === "effect");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "theme",     label: t("settingsDialogTabTheme"),     icon: <Palette size={15} /> },
    { id: "effects",   label: t("settingsDialogTabEffects"),   icon: <Sparkles size={15} /> },
    { id: "font",      label: t("settingsDialogTabFont"),      icon: <Type size={15} /> },
    { id: "size",      label: t("settingsDialogTabSize"),      icon: <ZoomIn size={15} /> },
    { id: "language",  label: t("settingsDialogTabLanguage"),  icon: <Globe size={15} /> },
  ];

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t("settingsDialogHeader")}
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
              <h2 className="text-sm font-semibold text-[var(--fg)]">{t("settingsDialogHeader")}</h2>
              <p className="mono text-[11px] text-[var(--fg-2)]">{t("settingsDialogHeaderSub")}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="focus-ring grid h-8 w-8 place-items-center rounded-md text-[var(--fg-3)] hover:bg-[var(--bg-3)] hover:text-[var(--fg)] transition-colors"
            aria-label={t("close")}
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
                  {t("settingsDialogTabThemeDesc")}
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

              {/* Gradient section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1.5 rounded-md border border-[var(--purple)]/30 bg-[var(--bg-4)] px-2 py-1">
                    <FlaskConical size={11} className="text-[var(--purple)]" />
                    <span className="mono text-[10px] font-bold uppercase tracking-widest text-[var(--purple)]">
                      Gradient
                    </span>
                  </div>
                  <div className="h-px flex-1 bg-[var(--border)]" />
                </div>
                <p className="text-xs text-[var(--fg-3)] mb-3">
                  {t("settingsDialogTabThemeExpHeader")}
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {gradientThemes.map((theme) => (
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

          {tab === "effects" && (
            <EffectsTab
              themes={effectThemes}
              activeTheme={settings.theme}
              effects={settings.effects}
              onSelectTheme={setTheme}
              onEffects={setEffects}
            />
          )}

          {tab === "font" && (
            <div className="space-y-3">
              <p className="text-xs text-[var(--fg-2)] mb-4">
                {t("settingsDialogTabFontDesc")}
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
                {t("settingsDialogTabSizeDesc")}
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
                  <span className="font-semibold text-[var(--fg)]">{t("settingsDialogTabSizePreviewLabel")}</span>
                  {t("settingsDialogTabSizePreviewText")}
                </p>
              </div>
            </div>
          )}

          {tab === "language" && (
            <div className="space-y-3">
              <p className="text-xs text-[var(--fg-2)] mb-4">
                {t("settingsDialogTabLanguageDesc")}
              </p>
              <div className="flex flex-col gap-2">
                {[
                  { id: "pt", label: t("settingsDialogLanguagePt"), desc: t("settingsDialogLanguagePtDesc"), flag: "🇵🇹" },
                  { id: "en", label: t("settingsDialogLanguageEn"), desc: t("settingsDialogLanguageEnDesc"), flag: "🇬🇧" }
                ].map((langOpt) => {
                  const active = settings.language === langOpt.id;
                  return (
                    <button
                      key={langOpt.id}
                      onClick={() => handleLanguageChange(langOpt.id as "pt" | "en")}
                      className={cn(
                        "flex items-center gap-4 rounded-lg border p-3.5 text-left transition-all duration-100 active:scale-[0.99]",
                        active
                          ? "border-[var(--accent)] bg-[var(--accent-bg)]"
                          : "border-[var(--border)] bg-[var(--bg-3)] hover:border-[var(--border-2)] hover:bg-[var(--bg-4)]"
                      )}
                    >
                      <div
                        className="flex h-10 w-16 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg)] text-xl font-medium"
                      >
                        {langOpt.flag}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-sm font-semibold leading-snug", active ? "text-[var(--accent)]" : "text-[var(--fg)]")}>
                          {langOpt.label}
                        </p>
                        <p className="mono text-[11px] text-[var(--fg-2)]">{langOpt.desc}</p>
                      </div>
                      {active && <Check size={15} className="shrink-0 text-[var(--accent)]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--bg-3)] px-6 py-3">
          <p className="mono text-[11px] text-[var(--fg-3)]">
            {t("settingsDialogSavedNotice")}
          </p>
          <button
            onClick={onClose}
            className="focus-ring rounded-md border border-[var(--accent)] bg-[var(--accent-bg)] px-4 py-1.5 text-xs font-semibold text-[var(--accent)] transition-all hover:opacity-80 active:scale-95"
          >
            {t("done")}
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

// ── Effects tab ──────────────────────────────────────────────────────────────

function EffectsTab({
  themes,
  activeTheme,
  effects,
  onSelectTheme,
  onEffects,
}: {
  themes: ThemeDef[];
  activeTheme: ThemeId;
  effects: EffectSettings;
  onSelectTheme: (id: ThemeId) => void;
  onEffects: (patch: Partial<EffectSettings>) => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="space-y-6">
      {/* Effect theme picker */}
      <div>
        <p className="text-xs text-[var(--fg-2)] mb-3">{t("settingsDialogTabEffectsDesc")}</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {themes.map((theme) => (
            <EffectCard
              key={theme.id}
              theme={theme}
              active={activeTheme === theme.id}
              onSelect={() => onSelectTheme(theme.id)}
            />
          ))}
        </div>
      </div>

      {/* QOL / accessibility controls */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1.5 rounded-md border border-[var(--accent)]/30 bg-[var(--bg-4)] px-2 py-1">
            <Gauge size={11} className="text-[var(--accent)]" />
            <span className="mono text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">
              {t("settingsDialogEffectsOptionsHeader")}
            </span>
          </div>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>

        <div className="flex flex-col gap-4 rounded-lg border border-[var(--border)] bg-[var(--bg-3)] p-4">
          {/* Reduce motion */}
          <ToggleRow
            label={t("settingsDialogEffectsReduceMotion")}
            desc={t("settingsDialogEffectsReduceMotionDesc")}
            checked={effects.reduceMotion}
            onChange={(v) => onEffects({ reduceMotion: v })}
          />

          <hr className="border-[var(--border)]" />

          {/* Animation speed */}
          <SliderRow
            label={t("settingsDialogEffectsSpeed")}
            desc={t("settingsDialogEffectsSpeedDesc")}
            min={0.5}
            max={2}
            step={0.1}
            value={effects.animationSpeed}
            format={(v) => `${v.toFixed(1)}×`}
            disabled={effects.reduceMotion}
            onChange={(v) => onEffects({ animationSpeed: v })}
          />

          {/* Particle density */}
          <div>
            <p className="text-sm font-semibold text-[var(--fg)]">{t("settingsDialogEffectsDensity")}</p>
            <p className="mono text-[11px] text-[var(--fg-2)] mb-2">{t("settingsDialogEffectsDensityDesc")}</p>
            <div className="grid grid-cols-3 gap-1.5">
              {(["low", "med", "high"] as ParticleDensity[]).map((d) => (
                <button
                  key={d}
                  onClick={() => onEffects({ particleDensity: d })}
                  className={cn(
                    "mono rounded-md border px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-all active:scale-95",
                    effects.particleDensity === d
                      ? "border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent)]"
                      : "border-[var(--border)] bg-[var(--bg)] text-[var(--fg-2)] hover:text-[var(--fg)]"
                  )}
                >
                  {t(`settingsDialogEffectsDensity_${d}` as const)}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-[var(--border)]" />

          {/* Panel blur */}
          <SliderRow
            label={t("settingsDialogEffectsBlur")}
            desc={t("settingsDialogEffectsBlurDesc")}
            min={0}
            max={24}
            step={1}
            value={effects.panelBlur}
            format={(v) => (v === 0 ? t("settingsDialogEffectsOff") : `${v}px`)}
            onChange={(v) => onEffects({ panelBlur: v })}
          />

          {/* Background dim */}
          <SliderRow
            label={t("settingsDialogEffectsDim")}
            desc={t("settingsDialogEffectsDimDesc")}
            min={0}
            max={0.8}
            step={0.05}
            value={effects.backgroundDim}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => onEffects({ backgroundDim: v })}
          />

          <hr className="border-[var(--border)]" />

          {/* Show on landing */}
          <ToggleRow
            label={t("settingsDialogEffectsOnLanding")}
            desc={t("settingsDialogEffectsOnLandingDesc")}
            checked={effects.showOnLanding}
            onChange={(v) => onEffects({ showOnLanding: v })}
          />
        </div>
      </div>
    </div>
  );
}

// ── Effect theme card (animated mini-preview via CSS) ────────────────────────

function EffectCard({
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
      {/* Animated swatch: a soft conic gradient built from the effect palette,
          slowly rotating to hint at the "live" canvas nature. */}
      <span
        className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md border border-white/10 shadow-inner effect-swatch"
        style={{
          background: `conic-gradient(from 0deg, ${theme.effect?.colors.join(", ")}, ${theme.effect?.colors[0]})`,
        }}
      >
        <span className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent" />
        <span
          className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: theme.swatch, boxShadow: `0 0 4px ${theme.swatch}` }}
        />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Sparkles size={11} className={active ? "text-[var(--accent)]" : "text-[var(--fg-3)]"} />
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

// ── Reusable toggle row ──────────────────────────────────────────────────────

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--fg)]">{label}</p>
        <p className="mono text-[11px] text-[var(--fg-2)]">{desc}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors",
          checked
            ? "border-[var(--accent)] bg-[var(--accent-bg)]"
            : "border-[var(--border)] bg-[var(--bg)]"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full transition-all",
            checked
              ? "left-[22px] bg-[var(--accent)]"
              : "left-0.5 bg-[var(--fg-3)]"
          )}
        />
      </button>
    </div>
  );
}

// ── Reusable slider row ──────────────────────────────────────────────────────

function SliderRow({
  label,
  desc,
  min,
  max,
  step,
  value,
  format,
  disabled,
  onChange,
}: {
  label: string;
  desc: string;
  min: number;
  max: number;
  step: number;
  value: number;
  format: (v: number) => string;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div className={cn(disabled && "opacity-50")}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-[var(--fg)]">{label}</p>
        <span className="mono text-[11px] font-semibold text-[var(--accent)]">{format(value)}</span>
      </div>
      <p className="mono text-[11px] text-[var(--fg-2)] mb-2">{desc}</p>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[var(--bg)] accent-[var(--accent)] disabled:cursor-not-allowed"
        style={{ accentColor: "var(--accent)" }}
      />
    </div>
  );
}
