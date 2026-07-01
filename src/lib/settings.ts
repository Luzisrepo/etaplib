// ── Settings types & persistence ───────────────────────────────────────────

export type ThemeId =
  | "etap-default"
  | "night"
  | "midnight"
  | "ocean"
  | "ruby"
  | "emerald"
  | "white"
  // ── New standard themes
  | "slate"
  | "amber"
  | "rose-quartz"
  | "obsidian"
  // ── Experimental gradient themes
  | "aurora"
  | "dusk"
  | "synthwave"
  | "prism"
  // ── New gradient themes
  | "nebula"
  | "inferno"
  | "arctic"
  | "venom"
  // ── Effect themes (animated canvas backgrounds)
  | "constellation"
  | "starfield"
  | "matrix"
  | "aurora-flow"
  | "plasma"
  // ── New effects
  | "lightning"
  | "sand-drift"
  | "neon-grid"
  | "fire-embers";

export type FontId =
  | "inter"
  | "ibm-plex-mono"
  | "geist"
  | "jetbrains-mono"
  | "source-sans";

export type FontSize = "sm" | "md" | "lg" | "xl";

export type LanguageId = "pt" | "en";

export type LayoutDensity = "comfortable" | "compact";

export type DateFormat = "dmy" | "mdy" | "ymd";

export type TimeFormat = "24h" | "12h";

export interface AccessibilitySettings {
  /** Heavier borders + flatter surfaces for higher contrast. */
  highContrast: boolean;
  /** Thicker, more visible focus outlines for keyboard navigation. */
  boldFocus: boolean;
  /** Bumps the minimum tap/click target size of buttons & links. */
  largeTargets: boolean;
}

export const DEFAULT_ACCESSIBILITY: AccessibilitySettings = {
  highContrast: false,
  boldFocus: false,
  largeTargets: false,
};

/** Curated accent-color presets, independent of the active theme. */
export interface AccentPreset {
  id: string;
  label: string;
  hex: string;
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { id: "blue",   label: "Azul",    hex: "#2f81f7" },
  { id: "cyan",   label: "Ciano",   hex: "#22d3ee" },
  { id: "green",  label: "Verde",   hex: "#3fb950" },
  { id: "teal",   label: "Verde-água", hex: "#2dd4bf" },
  { id: "amber",  label: "Âmbar",   hex: "#d29922" },
  { id: "orange", label: "Laranja", hex: "#f97316" },
  { id: "red",    label: "Vermelho", hex: "#f85149" },
  { id: "pink",   label: "Rosa",    hex: "#ec4899" },
  { id: "purple", label: "Roxo",    hex: "#a371f7" },
  { id: "indigo", label: "Índigo",  hex: "#6366f1" },
];

// ── Effect theme engine ──────────────────────────────────────────────────────

/** Identifies which canvas renderer runs for an effect theme. */
export type EffectType =
  | "constellation"
  | "starfield"
  | "matrix"
  | "aurora-flow"
  | "plasma"
  // ── New effects
  | "lightning"
  | "sand-drift"
  | "neon-grid"
  | "fire-embers";

/** Tunable parameters supplied to the renderer from the active theme. */
export interface EffectConfig {
  type: EffectType;
  /** Palette of CSS colors the renderer draws with (hex or rgba). */
  colors: string[];
  /** Base density multiplier before the user's particleDensity is applied. */
  baseDensity?: number;
}

// ── QOL / accessibility options ──────────────────────────────────────────────

export type ParticleDensity = "low" | "med" | "high";

export interface EffectSettings {
  /** Disables every CSS + canvas animation. Honored app-wide. */
  reduceMotion: boolean;
  /** Multiplier applied to rAF dt and CSS animation-duration. 0.5–2. */
  animationSpeed: number;
  /** Scales canvas particle counts; helps weak GPUs. */
  particleDensity: ParticleDensity;
  /** backdrop-filter blur applied to gp-* panels (px). 0–24. */
  panelBlur: number;
  /** Opacity of the readability overlay above the background (0–0.8). */
  backgroundDim: number;
  /** Render the background effect behind the landing/auth page too. */
  showOnLanding: boolean;
}

export const DEFAULT_EFFECTS: EffectSettings = {
  reduceMotion: false,
  animationSpeed: 1,
  particleDensity: "med",
  panelBlur: 16,
  backgroundDim: 0.35,
  showOnLanding: false,
};

export interface AppSettings {
  theme: ThemeId;
  font: FontId;
  fontSize: FontSize;
  language: LanguageId;
  effects: EffectSettings;
  /** Hex override applied on top of the active theme's accent. Null = use theme default. */
  accentOverride: string | null;
  layoutDensity: LayoutDensity;
  accessibility: AccessibilitySettings;
  /** Whether the app records documents you open in a local reading history. */
  trackReadingHistory: boolean;
  /** Whether the app records terms you search for in a local search history. */
  trackSearchHistory: boolean;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  /** IANA timezone name, or "auto" to follow the browser/device timezone. */
  timezone: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "etap-default",
  font: "inter",
  fontSize: "md",
  language: "pt",
  effects: DEFAULT_EFFECTS,
  accentOverride: null,
  layoutDensity: "comfortable",
  accessibility: DEFAULT_ACCESSIBILITY,
  trackReadingHistory: true,
  trackSearchHistory: true,
  dateFormat: "dmy",
  timeFormat: "24h",
  timezone: "auto",
};

const LS_KEY = "etap-settings-v1";

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    // Deep-merge nested objects so partially-stored (or older) settings still
    // resolve to the full set of defaults.
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      effects: { ...DEFAULT_EFFECTS, ...(parsed?.effects ?? {}) },
      accessibility: { ...DEFAULT_ACCESSIBILITY, ...(parsed?.accessibility ?? {}) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: AppSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

// ── Timezones ─────────────────────────────────────────────────────────────────

export interface TimezoneDef {
  id: string; // "auto" or IANA name
  label: string;
}

export const TIMEZONES: TimezoneDef[] = [
  { id: "auto", label: "Detetar automaticamente" },
  { id: "Europe/Lisbon", label: "Europe/Lisbon — Hora de Portugal" },
  { id: "Atlantic/Madeira", label: "Atlantic/Madeira" },
  { id: "Atlantic/Azores", label: "Atlantic/Azores" },
  { id: "Europe/London", label: "Europe/London" },
  { id: "Europe/Madrid", label: "Europe/Madrid" },
  { id: "Europe/Paris", label: "Europe/Paris" },
  { id: "Atlantic/Canary", label: "Atlantic/Canary" },
  { id: "America/Sao_Paulo", label: "America/São Paulo" },
  { id: "America/New_York", label: "America/New York" },
  { id: "UTC", label: "UTC" },
];

/** Resolves "auto" to the browser/device IANA timezone. */
export function resolveTimezone(tz: string): string {
  if (tz && tz !== "auto") return tz;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

// ── Theme definitions ───────────────────────────────────────────────────────

/** Coarse grouping used by the settings dialog to organize theme cards. */
export type ThemeCategory = "standard" | "gradient" | "effect";

export interface ThemeDef {
  id: ThemeId;
  label: string;
  description: string;
  swatch: string;        // accent preview color
  bgSwatch: string;      // background preview color
  /** Coarse category — derived from experimental/bodyGradient/effect if omitted. */
  category?: ThemeCategory;
  experimental?: boolean; // shows in experimental section
  bodyGradient?: string;  // if set, applied to body background (gradient themes)
  /** If set, this theme renders an animated canvas background. */
  effect?: EffectConfig;
  vars: Record<string, string>;
}

/** Resolve a theme's category from its flags (falls back to "standard"). */
export function themeCategory(t: ThemeDef): ThemeCategory {
  if (t.category) return t.category;
  if (t.effect) return "effect";
  if (t.bodyGradient || t.experimental) return "gradient";
  return "standard";
}

export const THEMES: ThemeDef[] = [
  {
    id: "etap-default",
    label: "Etap Default",
    description: "GitHub-brutalist dark palette",
    swatch: "#2f81f7",
    bgSwatch: "#0d1117",
    vars: {
      "--bg":       "#0d1117",
      "--bg-2":     "#161b22",
      "--bg-3":     "#1c2128",
      "--bg-4":     "#21262d",
      "--border":   "#30363d",
      "--border-2": "#444c56",
      "--fg":       "#e6edf3",
      "--fg-2":     "#8b949e",
      "--fg-3":     "#484f58",
      "--accent":   "#2f81f7",
      "--accent-2": "#1f6feb",
      "--accent-bg":"#1f2d45",
      "--green":    "#3fb950",
      "--green-bg": "#1a2d1a",
      "--red":      "#f85149",
      "--red-bg":   "#2a1515",
      "--amber":    "#d29922",
      "--amber-bg": "#2a2215",
      "--purple":   "#a371f7",
    },
  },
  {
    id: "night",
    label: "Night",
    description: "Dark grayish, softer contrast",
    swatch: "#58a6ff",
    bgSwatch: "#13161b",
    vars: {
      "--bg":       "#13161b",
      "--bg-2":     "#1a1e25",
      "--bg-3":     "#20252e",
      "--bg-4":     "#262c36",
      "--border":   "#2d3340",
      "--border-2": "#404858",
      "--fg":       "#d0d7e0",
      "--fg-2":     "#7a8694",
      "--fg-3":     "#434b58",
      "--accent":   "#58a6ff",
      "--accent-2": "#388bfd",
      "--accent-bg":"#1b2b3f",
      "--green":    "#56d364",
      "--green-bg": "#19271a",
      "--red":      "#ff7b72",
      "--red-bg":   "#2c1718",
      "--amber":    "#e3b341",
      "--amber-bg": "#2c2113",
      "--purple":   "#bc8cff",
    },
  },
  {
    id: "midnight",
    label: "Midnight",
    description: "Full black, maximum contrast",
    swatch: "#4d9eff",
    bgSwatch: "#000000",
    vars: {
      "--bg":       "#000000",
      "--bg-2":     "#0a0a0a",
      "--bg-3":     "#111111",
      "--bg-4":     "#1a1a1a",
      "--border":   "#222222",
      "--border-2": "#333333",
      "--fg":       "#f0f6fc",
      "--fg-2":     "#8b949e",
      "--fg-3":     "#444444",
      "--accent":   "#4d9eff",
      "--accent-2": "#2871d6",
      "--accent-bg":"#0d1a2e",
      "--green":    "#3fb950",
      "--green-bg": "#0d1a0d",
      "--red":      "#f85149",
      "--red-bg":   "#1a0808",
      "--amber":    "#d29922",
      "--amber-bg": "#1a1500",
      "--purple":   "#a371f7",
    },
  },
  {
    id: "ocean",
    label: "Ocean",
    description: "Deep blue palette",
    swatch: "#38bdf8",
    bgSwatch: "#050f1c",
    vars: {
      "--bg":       "#050f1c",
      "--bg-2":     "#0a1929",
      "--bg-3":     "#0d2137",
      "--bg-4":     "#102840",
      "--border":   "#1a3a55",
      "--border-2": "#245070",
      "--fg":       "#e2f0ff",
      "--fg-2":     "#7aadcc",
      "--fg-3":     "#3a6480",
      "--accent":   "#38bdf8",
      "--accent-2": "#0ea5e9",
      "--accent-bg":"#083451",
      "--green":    "#34d399",
      "--green-bg": "#032a1e",
      "--red":      "#f87171",
      "--red-bg":   "#2a0f0f",
      "--amber":    "#fbbf24",
      "--amber-bg": "#2a1e08",
      "--purple":   "#a78bfa",
    },
  },
  {
    id: "ruby",
    label: "Ruby",
    description: "Deep red accent theme",
    swatch: "#f43f5e",
    bgSwatch: "#0f0a0b",
    vars: {
      "--bg":       "#0f0a0b",
      "--bg-2":     "#1a1014",
      "--bg-3":     "#20141a",
      "--bg-4":     "#28181f",
      "--border":   "#3d1f2a",
      "--border-2": "#552a38",
      "--fg":       "#fde8ec",
      "--fg-2":     "#c48494",
      "--fg-3":     "#6b3a46",
      "--accent":   "#f43f5e",
      "--accent-2": "#e11d48",
      "--accent-bg":"#3d0f1c",
      "--green":    "#4ade80",
      "--green-bg": "#0f2a16",
      "--red":      "#fb7185",
      "--red-bg":   "#2a0f14",
      "--amber":    "#fbbf24",
      "--amber-bg": "#2a1e08",
      "--purple":   "#c084fc",
    },
  },
  {
    id: "emerald",
    label: "Emerald",
    description: "Forest green dark theme",
    swatch: "#10b981",
    bgSwatch: "#080f0c",
    vars: {
      "--bg":       "#080f0c",
      "--bg-2":     "#0d1912",
      "--bg-3":     "#112018",
      "--bg-4":     "#15271d",
      "--border":   "#1e3d2a",
      "--border-2": "#295239",
      "--fg":       "#e2ffe9",
      "--fg-2":     "#7abf94",
      "--fg-3":     "#3a6a4a",
      "--accent":   "#10b981",
      "--accent-2": "#059669",
      "--accent-bg":"#062f1d",
      "--green":    "#34d399",
      "--green-bg": "#062f1d",
      "--red":      "#f87171",
      "--red-bg":   "#2a0f0f",
      "--amber":    "#fbbf24",
      "--amber-bg": "#2a1e08",
      "--purple":   "#a78bfa",
    },
  },
  {
    id: "white",
    label: "White",
    description: "Clean light theme",
    swatch: "#0f172a",
    bgSwatch: "#ffffff",
    vars: {
      "--bg":       "#ffffff",
      "--bg-2":     "#f8fafc",
      "--bg-3":     "#f1f5f9",
      "--bg-4":     "#e2e8f0",
      "--border":   "#e2e8f0",
      "--border-2": "#cbd5e1",
      "--fg":       "#0f172a",
      "--fg-2":     "#475569",
      "--fg-3":     "#94a3b8",
      "--accent":   "#0f172a",
      "--accent-2": "#1e293b",
      "--accent-bg":"#f1f5f9",
      "--green":    "#16a34a",
      "--green-bg": "#f0fdf4",
      "--red":      "#dc2626",
      "--red-bg":   "#fef2f2",
      "--amber":    "#d97706",
      "--amber-bg": "#fffbeb",
      "--purple":   "#7c3aed",
    },
  },
  // ── Experimental gradient themes ────────────────────────────────────────────
  {
    id: "aurora",
    label: "Aurora",
    description: "Northern lights gradient",
    swatch: "#7dd3fc",
    bgSwatch: "#0d1a2e",
    experimental: true,
    bodyGradient: "linear-gradient(135deg, #0d0f14 0%, #0a1628 30%, #081a18 65%, #110d1f 100%)",
    vars: {
      "--bg":        "#0d0f14",
      "--bg-2":      "#111520",
      "--bg-3":      "#161c28",
      "--bg-4":      "#1c2432",
      "--border":    "#1e2d40",
      "--border-2":  "#2a3f55",
      "--fg":        "#e0f2fe",
      "--fg-2":      "#7dd3fc",
      "--fg-3":      "#3b6a8a",
      "--accent":    "#38bdf8",
      "--accent-2":  "#0ea5e9",
      "--accent-bg": "#082030",
      "--green":     "#2dd4bf",
      "--green-bg":  "#041e1c",
      "--red":       "#f87171",
      "--red-bg":    "#2a0f0f",
      "--amber":     "#fbbf24",
      "--amber-bg":  "#2a1e08",
      "--purple":    "#c084fc",
    },
  },
  {
    id: "dusk",
    label: "Dusk",
    description: "Warm sunset gradient",
    swatch: "#fb923c",
    bgSwatch: "#1a0d10",
    experimental: true,
    bodyGradient: "linear-gradient(160deg, #0d090f 0%, #1a0d18 25%, #220e0a 60%, #150e06 100%)",
    vars: {
      "--bg":        "#0d090f",
      "--bg-2":      "#16101a",
      "--bg-3":      "#1e1520",
      "--bg-4":      "#261a28",
      "--border":    "#3d2030",
      "--border-2":  "#522a40",
      "--fg":        "#fef3e2",
      "--fg-2":      "#d4a088",
      "--fg-3":      "#7a4a3a",
      "--accent":    "#fb923c",
      "--accent-2":  "#ea580c",
      "--accent-bg": "#2a1208",
      "--green":     "#4ade80",
      "--green-bg":  "#0f2a16",
      "--red":       "#f87171",
      "--red-bg":    "#2a0f0f",
      "--amber":     "#fbbf24",
      "--amber-bg":  "#2a1e08",
      "--purple":    "#e879f9",
    },
  },
  {
    id: "synthwave",
    label: "Synthwave",
    description: "Retro neon gradient",
    swatch: "#e879f9",
    bgSwatch: "#0a0012",
    experimental: true,
    bodyGradient: "linear-gradient(180deg, #08000f 0%, #0f0020 40%, #08000a 100%)",
    vars: {
      "--bg":        "#08000f",
      "--bg-2":      "#0f0820",
      "--bg-3":      "#150f28",
      "--bg-4":      "#1c1530",
      "--border":    "#2d1845",
      "--border-2":  "#40205e",
      "--fg":        "#fae8ff",
      "--fg-2":      "#d8b4fe",
      "--fg-3":      "#7e3fa8",
      "--accent":    "#e879f9",
      "--accent-2":  "#d946ef",
      "--accent-bg": "#22083a",
      "--green":     "#34d399",
      "--green-bg":  "#022a1e",
      "--red":       "#f87171",
      "--red-bg":    "#2a0808",
      "--amber":     "#fbbf24",
      "--amber-bg":  "#2a1a00",
      "--purple":    "#a78bfa",
    },
  },
  {
    id: "prism",
    label: "Prism",
    description: "Iridescent deep violet",
    swatch: "#818cf8",
    bgSwatch: "#0a0f28",
    experimental: true,
    bodyGradient: "linear-gradient(135deg, #080e24 0%, #100828 40%, #200828 75%, #080e24 100%)",
    vars: {
      "--bg":        "#080e24",
      "--bg-2":      "#0d1230",
      "--bg-3":      "#121838",
      "--bg-4":      "#181e42",
      "--border":    "#222a55",
      "--border-2":  "#2e3870",
      "--fg":        "#eef2ff",
      "--fg-2":      "#a5b4fc",
      "--fg-3":      "#4e5a9a",
      "--accent":    "#818cf8",
      "--accent-2":  "#6366f1",
      "--accent-bg": "#10143a",
      "--green":     "#34d399",
      "--green-bg":  "#041e18",
      "--red":       "#f87171",
      "--red-bg":    "#280a0a",
      "--amber":     "#fbbf24",
      "--amber-bg":  "#281c04",
      "--purple":    "#c084fc",
    },
  },

  // ── New standard themes ──────────────────────────────────────────────────────
  {
    id: "slate",
    label: "Slate",
    description: "Cool blue-grey professional",
    swatch: "#94a3b8",
    bgSwatch: "#0b0e14",
    vars: {
      "--bg":       "#0b0e14",
      "--bg-2":     "#111520",
      "--bg-3":     "#171c29",
      "--bg-4":     "#1d2333",
      "--border":   "#252d3f",
      "--border-2": "#313d55",
      "--fg":       "#e2e8f0",
      "--fg-2":     "#94a3b8",
      "--fg-3":     "#475569",
      "--accent":   "#7c8ef7",
      "--accent-2": "#5a6de0",
      "--accent-bg":"#131726",
      "--green":    "#22d3a5",
      "--green-bg": "#071a14",
      "--red":      "#f87171",
      "--red-bg":   "#200a0a",
      "--amber":    "#fbbf24",
      "--amber-bg": "#201800",
      "--purple":   "#c084fc",
    },
  },
  {
    id: "amber",
    label: "Amber",
    description: "Warm gold on charcoal",
    swatch: "#f59e0b",
    bgSwatch: "#0f0d07",
    vars: {
      "--bg":       "#0f0d07",
      "--bg-2":     "#1a170a",
      "--bg-3":     "#221f0e",
      "--bg-4":     "#2a2712",
      "--border":   "#3d3515",
      "--border-2": "#54491e",
      "--fg":       "#fef9e7",
      "--fg-2":     "#c8a840",
      "--fg-3":     "#6b5820",
      "--accent":   "#f59e0b",
      "--accent-2": "#d97706",
      "--accent-bg":"#2a1e04",
      "--green":    "#4ade80",
      "--green-bg": "#0f2a16",
      "--red":      "#f87171",
      "--red-bg":   "#2a0f0f",
      "--amber":    "#f59e0b",
      "--amber-bg": "#2a1e04",
      "--purple":   "#c084fc",
    },
  },
  {
    id: "rose-quartz",
    label: "Rose Quartz",
    description: "Dusty pink, soft contrast",
    swatch: "#fb7185",
    bgSwatch: "#110810",
    vars: {
      "--bg":       "#110810",
      "--bg-2":     "#1c101a",
      "--bg-3":     "#251521",
      "--bg-4":     "#2e1a28",
      "--border":   "#44203a",
      "--border-2": "#5c2a4e",
      "--fg":       "#fce7f3",
      "--fg-2":     "#f9a8d4",
      "--fg-3":     "#8b4a6e",
      "--accent":   "#fb7185",
      "--accent-2": "#f43f5e",
      "--accent-bg":"#35091e",
      "--green":    "#86efac",
      "--green-bg": "#0f2a1a",
      "--red":      "#fca5a5",
      "--red-bg":   "#2a0f14",
      "--amber":    "#fcd34d",
      "--amber-bg": "#2a1e08",
      "--purple":   "#d8b4fe",
    },
  },
  {
    id: "obsidian",
    label: "Obsidian",
    description: "Pure black, copper accents",
    swatch: "#e07b39",
    bgSwatch: "#050505",
    vars: {
      "--bg":       "#050505",
      "--bg-2":     "#0c0c0c",
      "--bg-3":     "#141414",
      "--bg-4":     "#1c1c1c",
      "--border":   "#282520",
      "--border-2": "#3a3530",
      "--fg":       "#f5f0eb",
      "--fg-2":     "#c8a882",
      "--fg-3":     "#5a4a38",
      "--accent":   "#e07b39",
      "--accent-2": "#c4622a",
      "--accent-bg":"#241508",
      "--green":    "#6ee7b7",
      "--green-bg": "#0d1e18",
      "--red":      "#fca5a5",
      "--red-bg":   "#1e0808",
      "--amber":    "#fde68a",
      "--amber-bg": "#1e1808",
      "--purple":   "#c4b5fd",
    },
  },
  // ── New experimental gradient themes ─────────────────────────────────────────
  {
    id: "nebula",
    label: "Nebula",
    description: "Deep space: violet, teal, magenta",
    swatch: "#e879f9",
    bgSwatch: "#04010f",
    experimental: true,
    bodyGradient: "radial-gradient(ellipse at 20% 30%, #1a0535 0%, transparent 55%), radial-gradient(ellipse at 80% 70%, #03203a 0%, transparent 55%), radial-gradient(ellipse at 50% 90%, #200830 0%, transparent 50%), #04010f",
    vars: {
      "--bg":        "#04010f",
      "--bg-2":      "#0b0520",
      "--bg-3":      "#110a2a",
      "--bg-4":      "#170f34",
      "--border":    "#28155a",
      "--border-2":  "#3a1f7a",
      "--fg":        "#f0e8ff",
      "--fg-2":      "#c084fc",
      "--fg-3":      "#6633aa",
      "--accent":    "#e879f9",
      "--accent-2":  "#a855f7",
      "--accent-bg": "#1e063a",
      "--green":     "#2dd4bf",
      "--green-bg":  "#031e1c",
      "--red":       "#f87171",
      "--red-bg":    "#280808",
      "--amber":     "#fbbf24",
      "--amber-bg":  "#281c04",
      "--purple":    "#f0abfc",
    },
  },
  {
    id: "inferno",
    label: "Inferno",
    description: "Volcanic fire: ember, lava, ash",
    swatch: "#ff4500",
    bgSwatch: "#080200",
    experimental: true,
    bodyGradient: "radial-gradient(ellipse at 0% 100%, #2a0800 0%, transparent 60%), radial-gradient(ellipse at 100% 0%, #1a0400 0%, transparent 60%), radial-gradient(ellipse at 50% 50%, #120100 0%, transparent 70%), #080200",
    vars: {
      "--bg":        "#080200",
      "--bg-2":      "#130500",
      "--bg-3":      "#1e0900",
      "--bg-4":      "#280d00",
      "--border":    "#4a1500",
      "--border-2":  "#6b2000",
      "--fg":        "#fff1e6",
      "--fg-2":      "#ff9966",
      "--fg-3":      "#8b3500",
      "--accent":    "#ff4500",
      "--accent-2":  "#e63200",
      "--accent-bg": "#2a0a00",
      "--green":     "#22c55e",
      "--green-bg":  "#0a1e08",
      "--red":       "#ff6b6b",
      "--red-bg":    "#2a0a0a",
      "--amber":     "#ffa500",
      "--amber-bg":  "#2a1500",
      "--purple":    "#d97706",
    },
  },
  {
    id: "arctic",
    label: "Arctic",
    description: "Glacial blue-white: ice, snow, aurora",
    swatch: "#67e8f9",
    bgSwatch: "#010a12",
    experimental: true,
    bodyGradient: "radial-gradient(ellipse at 30% 20%, #002a4a 0%, transparent 55%), radial-gradient(ellipse at 70% 80%, #001e36 0%, transparent 55%), radial-gradient(ellipse at 50% 50%, #000d1a 0%, transparent 60%), #010a12",
    vars: {
      "--bg":        "#010a12",
      "--bg-2":      "#041520",
      "--bg-3":      "#07202e",
      "--bg-4":      "#0a2a3c",
      "--border":    "#0e3a52",
      "--border-2":  "#155070",
      "--fg":        "#e8f8ff",
      "--fg-2":      "#67e8f9",
      "--fg-3":      "#2a7a99",
      "--accent":    "#22d3ee",
      "--accent-2":  "#06b6d4",
      "--accent-bg": "#021e2a",
      "--green":     "#a7f3d0",
      "--green-bg":  "#041e14",
      "--red":       "#fca5a5",
      "--red-bg":    "#200a0a",
      "--amber":     "#fde68a",
      "--amber-bg":  "#201a04",
      "--purple":    "#c7d2fe",
    },
  },
  {
    id: "venom",
    label: "Venom",
    description: "Toxic green on pitch black",
    swatch: "#39ff14",
    bgSwatch: "#010501",
    experimental: true,
    bodyGradient: "radial-gradient(ellipse at 10% 90%, #001a00 0%, transparent 55%), radial-gradient(ellipse at 90% 10%, #001500 0%, transparent 55%), radial-gradient(ellipse at 50% 50%, #020a02 0%, transparent 65%), #010501",
    vars: {
      "--bg":        "#010501",
      "--bg-2":      "#040d04",
      "--bg-3":      "#071507",
      "--bg-4":      "#0a1e0a",
      "--border":    "#0f3010",
      "--border-2":  "#154518",
      "--fg":        "#e8ffe8",
      "--fg-2":      "#39ff14",
      "--fg-3":      "#1a6618",
      "--accent":    "#39ff14",
      "--accent-2":  "#22cc00",
      "--accent-bg": "#061506",
      "--green":     "#39ff14",
      "--green-bg":  "#041404",
      "--red":       "#ff4444",
      "--red-bg":    "#200808",
      "--amber":     "#ccff00",
      "--amber-bg":  "#1a1e04",
      "--purple":    "#00ff88",
    },
  },
  // ── Effect themes (animated canvas backgrounds) ──────────────────────────────
  // Panels keep using the CSS-var palette below; the BackgroundCanvas component
  // reads `effect` to pick its renderer and `effect.colors` for its palette.
  {
    id: "constellation",
    label: "Constellation",
    description: "Linked particle network reacting to cursor",
    swatch: "#7dd3fc",
    bgSwatch: "#070b18",
    category: "effect",
    effect: {
      type: "constellation",
      colors: ["#7dd3fc", "#38bdf8", "#a78bfa", "#e0e7ff"],
      baseDensity: 1,
    },
    vars: {
      "--bg":        "#070b18",
      "--bg-2":      "#0c1326",
      "--bg-3":      "#111a32",
      "--bg-4":      "#16203f",
      "--border":    "#1f2d4d",
      "--border-2":  "#2c3f6a",
      "--fg":        "#e6f0ff",
      "--fg-2":      "#93b4d8",
      "--fg-3":      "#3e5a82",
      "--accent":    "#7dd3fc",
      "--accent-2":  "#38bdf8",
      "--accent-bg": "#0c2236",
      "--green":     "#34d399",
      "--green-bg":  "#04241c",
      "--red":       "#f87171",
      "--red-bg":    "#280c0c",
      "--amber":     "#fbbf24",
      "--amber-bg":  "#281c04",
      "--purple":    "#a78bfa",
    },
  },
  {
    id: "starfield",
    label: "Starfield",
    description: "Hyperspace warp through drifting stars",
    swatch: "#f5f5ff",
    bgSwatch: "#02030a",
    category: "effect",
    effect: {
      type: "starfield",
      colors: ["#ffffff", "#c7d2fe", "#a5b4fc", "#7dd3fc"],
      baseDensity: 1.4,
    },
    vars: {
      "--bg":        "#02030a",
      "--bg-2":      "#070a18",
      "--bg-3":      "#0c1126",
      "--bg-4":      "#121834",
      "--border":    "#1a2143",
      "--border-2":  "#262f63",
      "--fg":        "#eef2ff",
      "--fg-2":      "#9aa6cc",
      "--fg-3":      "#3a4773",
      "--accent":    "#a5b4fc",
      "--accent-2":  "#818cf8",
      "--accent-bg": "#0e1438",
      "--green":     "#34d399",
      "--green-bg":  "#04241c",
      "--red":       "#f87171",
      "--red-bg":    "#280c0c",
      "--amber":     "#fbbf24",
      "--amber-bg":  "#281c04",
      "--purple":    "#c4b5fd",
    },
  },
  {
    id: "matrix",
    label: "Matrix Rain",
    description: "Cascading digital glyph columns",
    swatch: "#39ff14",
    bgSwatch: "#020602",
    category: "effect",
    effect: {
      type: "matrix",
      colors: ["#39ff14", "#00cc44", "#aaffaa", "#1a3a1a"],
      baseDensity: 1,
    },
    vars: {
      "--bg":        "#020602",
      "--bg-2":      "#040d04",
      "--bg-3":      "#071607",
      "--bg-4":      "#0a200a",
      "--border":    "#0f3010",
      "--border-2":  "#154518",
      "--fg":        "#d8ffd8",
      "--fg-2":      "#7ad98a",
      "--fg-3":      "#2f6a3a",
      "--accent":    "#39ff14",
      "--accent-2":  "#22cc00",
      "--accent-bg": "#061506",
      "--green":     "#39ff14",
      "--green-bg":  "#041404",
      "--red":       "#ff6b6b",
      "--red-bg":    "#200808",
      "--amber":     "#ccff00",
      "--amber-bg":  "#1a1e04",
      "--purple":    "#00ff88",
    },
  },
  {
    id: "aurora-flow",
    label: "Aurora Flow",
    description: "Flowing multi-band aurora ribbons",
    swatch: "#2dd4bf",
    bgSwatch: "#04101c",
    category: "effect",
    effect: {
      type: "aurora-flow",
      colors: ["#2dd4bf", "#38bdf8", "#a78bfa", "#34d399", "#22d3ee"],
      baseDensity: 1,
    },
    vars: {
      "--bg":        "#04101c",
      "--bg-2":      "#08182b",
      "--bg-3":      "#0c2038",
      "--bg-4":      "#102a47",
      "--border":    "#143352",
      "--border-2":  "#1e4773",
      "--fg":        "#e0f7ff",
      "--fg-2":      "#7fc8d8",
      "--fg-3":      "#3a6a78",
      "--accent":    "#2dd4bf",
      "--accent-2":  "#14b8a6",
      "--accent-bg": "#062a26",
      "--green":     "#34d399",
      "--green-bg":  "#04241c",
      "--red":       "#f87171",
      "--red-bg":    "#280c0c",
      "--amber":     "#fbbf24",
      "--amber-bg":  "#281c04",
      "--purple":    "#c084fc",
    },
  },
  {
    id: "plasma",
    label: "Plasma",
    description: "Soft flowing plasma colour blobs",
    swatch: "#e879f9",
    bgSwatch: "#0a0518",
    category: "effect",
    effect: {
      type: "plasma",
      colors: ["#e879f9", "#818cf8", "#38bdf8", "#f472b6", "#a78bfa"],
      baseDensity: 1,
    },
    vars: {
      "--bg":        "#0a0518",
      "--bg-2":      "#120a28",
      "--bg-3":      "#1a1038",
      "--bg-4":      "#221648",
      "--border":    "#2c1f5c",
      "--border-2":  "#3e2d7e",
      "--fg":        "#f3e8ff",
      "--fg-2":      "#c4b0e0",
      "--fg-3":      "#6a548e",
      "--accent":    "#e879f9",
      "--accent-2":  "#d946ef",
      "--accent-bg": "#260a3a",
      "--green":     "#34d399",
      "--green-bg":  "#04241c",
      "--red":       "#f87171",
      "--red-bg":    "#280c0c",
      "--amber":     "#fbbf24",
      "--amber-bg":  "#281c04",
      "--purple":    "#c4b5fd",
    },
  },
  {
    id: "lightning",
    label: "Lightning Storm",
    description: "Electric branching bolts raking the sky",
    swatch: "#a78bfa",
    bgSwatch: "#04020f",
    category: "effect",
    effect: {
      type: "lightning",
      colors: ["#a78bfa", "#c084fc", "#e0c3ff", "#7c3aed"],
      baseDensity: 1,
    },
    vars: {
      "--bg":        "#04020f",
      "--bg-2":      "#09051e",
      "--bg-3":      "#100a2c",
      "--bg-4":      "#160f38",
      "--border":    "#251842",
      "--border-2":  "#352660",
      "--fg":        "#ede9fe",
      "--fg-2":      "#a78bfa",
      "--fg-3":      "#5b3faa",
      "--accent":    "#a78bfa",
      "--accent-2":  "#7c3aed",
      "--accent-bg": "#1a0840",
      "--green":     "#34d399",
      "--green-bg":  "#04241c",
      "--red":       "#f87171",
      "--red-bg":    "#280c0c",
      "--amber":     "#fbbf24",
      "--amber-bg":  "#281c04",
      "--purple":    "#f0abfc",
    },
  },
  {
    id: "sand-drift",
    label: "Sand Drift",
    description: "Warm particles swept by invisible desert winds",
    swatch: "#f59e0b",
    bgSwatch: "#0c0700",
    category: "effect",
    effect: {
      type: "sand-drift",
      colors: ["#f59e0b", "#fbbf24", "#d97706", "#fde68a", "#92400e"],
      baseDensity: 1,
    },
    vars: {
      "--bg":        "#0c0700",
      "--bg-2":      "#171004",
      "--bg-3":      "#201708",
      "--bg-4":      "#2a1f0c",
      "--border":    "#3d2e10",
      "--border-2":  "#55401a",
      "--fg":        "#fef3c7",
      "--fg-2":      "#d4a044",
      "--fg-3":      "#7a5518",
      "--accent":    "#f59e0b",
      "--accent-2":  "#d97706",
      "--accent-bg": "#2a1804",
      "--green":     "#86efac",
      "--green-bg":  "#0c1e10",
      "--red":       "#fca5a5",
      "--red-bg":    "#200808",
      "--amber":     "#fbbf24",
      "--amber-bg":  "#281c04",
      "--purple":    "#c4b5fd",
    },
  },
  {
    id: "neon-grid",
    label: "Grid Run",
    description: "Raymarched corridor of glowing boxes rushing toward you",
    swatch: "#c8a87a",
    bgSwatch: "#050301",
    category: "effect",
    effect: {
      type: "neon-grid",
      colors: ["#c8a87a", "#ff9944", "#ffe0b0", "#ffd080"],
      baseDensity: 1,
    },
    vars: {
      "--bg":        "#050301",
      "--bg-2":      "#0d0902",
      "--bg-3":      "#160e03",
      "--bg-4":      "#1e1404",
      "--border":    "#2e1e06",
      "--border-2":  "#46300a",
      "--fg":        "#fff4e0",
      "--fg-2":      "#c8a87a",
      "--fg-3":      "#6b4f22",
      "--accent":    "#c8a87a",
      "--accent-2":  "#a07840",
      "--accent-bg": "#1e1206",
      "--green":     "#86efac",
      "--green-bg":  "#0a1c10",
      "--red":       "#fca5a5",
      "--red-bg":    "#1e0606",
      "--amber":     "#fbbf24",
      "--amber-bg":  "#1e1604",
      "--purple":    "#d8b4fe",
    },
  },
  {
    id: "fire-embers",
    label: "Fire Embers",
    description: "Glowing embers rising from an unseen inferno",
    swatch: "#ff6b00",
    bgSwatch: "#060100",
    category: "effect",
    effect: {
      type: "fire-embers",
      colors: ["#ff6b00", "#ff3d00", "#ffaa00", "#ff8800", "#ff2200"],
      baseDensity: 1,
    },
    vars: {
      "--bg":        "#060100",
      "--bg-2":      "#0f0400",
      "--bg-3":      "#180700",
      "--bg-4":      "#220a00",
      "--border":    "#3d1200",
      "--border-2":  "#5c1e00",
      "--fg":        "#fff1e0",
      "--fg-2":      "#ff9944",
      "--fg-3":      "#883300",
      "--accent":    "#ff6b00",
      "--accent-2":  "#ff3d00",
      "--accent-bg": "#2a0c00",
      "--green":     "#6ee7b7",
      "--green-bg":  "#0a1e14",
      "--red":       "#ff4444",
      "--red-bg":    "#200404",
      "--amber":     "#ffaa00",
      "--amber-bg":  "#201400",
      "--purple":    "#ff44aa",
    },
  },

];

// ── Font definitions ─────────────────────────────────────────────────────────

export interface FontDef {
  id: FontId;
  label: string;
  description: string;
  googleUrl?: string;
  cssFamily: string;
  fallback: string;
}

export const FONTS: FontDef[] = [
  {
    id: "inter",
    label: "Inter",
    description: "Clean, modern sans-serif",
    googleUrl: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap",
    cssFamily: "Inter",
    fallback: "-apple-system, BlinkMacSystemFont, sans-serif",
  },
  {
    id: "ibm-plex-mono",
    label: "IBM Plex Mono",
    description: "Monospace, technical feel",
    googleUrl: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap",
    cssFamily: "IBM Plex Mono",
    fallback: "'SF Mono', 'Fira Code', monospace",
  },
  {
    id: "geist",
    label: "Geist",
    description: "Vercel's minimal sans-serif",
    googleUrl: "https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap",
    cssFamily: "Geist",
    fallback: "sans-serif",
  },
  {
    id: "jetbrains-mono",
    label: "JetBrains Mono",
    description: "Developer monospace font",
    googleUrl: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap",
    cssFamily: "JetBrains Mono",
    fallback: "'Fira Code', 'Cascadia Code', monospace",
  },
  {
    id: "source-sans",
    label: "Source Sans 3",
    description: "Adobe's readable humanist sans",
    googleUrl: "https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600;700&display=swap",
    cssFamily: "Source Sans 3",
    fallback: "Helvetica, Arial, sans-serif",
  },
];

// ── Font size definitions ─────────────────────────────────────────────────────

export interface FontSizeDef {
  id: FontSize;
  label: string;
  px: number;
}

export const FONT_SIZES: FontSizeDef[] = [
  { id: "sm",  label: "Small",   px: 13 },
  { id: "md",  label: "Medium",  px: 15 },
  { id: "lg",  label: "Large",   px: 17 },
  { id: "xl",  label: "X-Large", px: 19 },
];

// ── Color helpers (for the accent-color override) ───────────────────────────

function clamp255(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/** Darkens (negative) or lightens (positive) a hex color by `percent` (-100..100). */
function shade(hex: string, percent: number): string {
  try {
    const [r, g, b] = hexToRgb(hex);
    const p = percent / 100;
    const f = (c: number) => clamp255(p < 0 ? c * (1 + p) : c + (255 - c) * p);
    const toHex = (c: number) => f(c).toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  } catch {
    return hex;
  }
}

function hexToRgba(hex: string, alpha: number): string {
  try {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch {
    return hex;
  }
}

// ── Apply settings to DOM ─────────────────────────────────────────────────────

export function applySettings(s: AppSettings): void {
  if (typeof document === "undefined") return;

  const theme = THEMES.find((t) => t.id === s.theme) ?? THEMES[0];
  const font  = FONTS.find((f) => f.id === s.font) ?? FONTS[0];
  const size  = FONT_SIZES.find((f) => f.id === s.fontSize) ?? FONT_SIZES[1];

  const root = document.documentElement;

  // Apply theme CSS vars
  for (const [k, v] of Object.entries(theme.vars)) {
    root.style.setProperty(k, v);
  }

  // Explicitly set body background + text color to match the theme so it
  // takes effect immediately without waiting for a CSS var cascade repaint.
  // Gradient themes supply a bodyGradient that overrides the solid --bg on the body.
  const isGradient = !!theme.bodyGradient;
  const isEffect   = !!theme.effect;
  // Effect themes paint their own canvas; body just needs the base bg color.
  document.body.style.background = theme.bodyGradient ?? theme.vars["--bg"];
  document.body.style.backgroundAttachment = isGradient ? "fixed" : "";
  document.body.style.color = theme.vars["--fg"];

  // Toggle background-active class & CSS flag so components can use
  // semi-transparent backgrounds that let the gradient/effect bleed through.
  const hasAnimatedBg = isGradient || isEffect;
  document.body.classList.toggle("gradient-active", isGradient);
  document.body.classList.toggle("effect-active", isEffect);
  document.body.classList.toggle("bg-animated", hasAnimatedBg);
  root.style.setProperty("--is-gradient", isGradient ? "1" : "0");
  root.style.setProperty("--is-effect",   isEffect   ? "1" : "0");

  // Apply per-theme class so CSS can target specific animations.
  // Remove any previous theme-* classes first.
  document.body.className = document.body.className
    .split(" ")
    .filter((c) => !c.startsWith("theme-"))
    .join(" ");
  document.body.classList.add(`theme-${theme.id}`);

  // ── Effects / QOL options ──
  const fx = { ...DEFAULT_EFFECTS, ...s.effects };
  root.style.setProperty("--anim-speed", String(fx.animationSpeed));
  root.style.setProperty("--panel-blur", `${fx.panelBlur}px`);
  root.style.setProperty("--bg-dim", String(fx.backgroundDim));
  document.body.classList.toggle("reduce-motion", fx.reduceMotion);

  // ── Accent color override (independent of the active theme) ──
  if (s.accentOverride) {
    root.style.setProperty("--accent", s.accentOverride);
    root.style.setProperty("--accent-2", shade(s.accentOverride, -18));
    root.style.setProperty("--accent-bg", hexToRgba(s.accentOverride, 0.16));
  }

  // ── Layout density ──
  document.body.classList.toggle("density-compact", s.layoutDensity === "compact");

  // ── Accessibility ──
  const a11y = { ...DEFAULT_ACCESSIBILITY, ...s.accessibility };
  document.body.classList.toggle("a11y-high-contrast", a11y.highContrast);
  document.body.classList.toggle("a11y-strong-focus", a11y.boldFocus);
  document.body.classList.toggle("a11y-large-targets", a11y.largeTargets);

  // Apply font
  root.style.setProperty("--font-body", `'${font.cssFamily}', ${font.fallback}`);
  document.body.style.fontFamily = `'${font.cssFamily}', ${font.fallback}`;

  // Apply font size
  root.style.fontSize = `${size.px}px`;

  // Load Google Font if needed
  if (font.googleUrl) {
    const existingId = `gf-${font.id}`;
    if (!document.getElementById(existingId)) {
      const link = document.createElement("link");
      link.id = existingId;
      link.rel = "stylesheet";
      link.href = font.googleUrl;
      document.head.appendChild(link);
    }
  }
}
