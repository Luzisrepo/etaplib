// ── Settings types & persistence ───────────────────────────────────────────

export type ThemeId =
  | "etap-default"
  | "night"
  | "midnight"
  | "ocean"
  | "ruby"
  | "emerald"
  | "white"
  // ── Experimental gradient themes
  | "aurora"
  | "dusk"
  | "synthwave"
  | "prism";

export type FontId =
  | "inter"
  | "ibm-plex-mono"
  | "geist"
  | "jetbrains-mono"
  | "source-sans";

export type FontSize = "sm" | "md" | "lg" | "xl";

export interface AppSettings {
  theme: ThemeId;
  font: FontId;
  fontSize: FontSize;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "etap-default",
  font: "inter",
  fontSize: "md",
};

const LS_KEY = "etap-settings-v1";

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
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

// ── Theme definitions ───────────────────────────────────────────────────────

export interface ThemeDef {
  id: ThemeId;
  label: string;
  description: string;
  swatch: string;        // accent preview color
  bgSwatch: string;      // background preview color
  experimental?: boolean; // shows in experimental section
  bodyGradient?: string;  // if set, applied to body background (gradient themes)
  vars: Record<string, string>;
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
  document.body.style.background = theme.bodyGradient ?? theme.vars["--bg"];
  document.body.style.backgroundAttachment = isGradient ? "fixed" : "";
  document.body.style.color = theme.vars["--fg"];

  // Toggle gradient-active class & CSS flag so components can use
  // semi-transparent backgrounds that let the gradient bleed through.
  document.body.classList.toggle("gradient-active", isGradient);
  root.style.setProperty("--is-gradient", isGradient ? "1" : "0");

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
