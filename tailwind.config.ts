import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#0d1117",
        surface: "#161b22",
        "surface-muted": "#21262d",
        border: "#30363d",
        "border-muted": "#21262d",
        foreground: "#f0f6fc",
        muted: "#8b949e",
        "github-blue": "#2f81f7",
        "github-blue-soft": "#1f6feb",
        success: "#3fb950",
        danger: "#f85149",
        attention: "#d29922"
      },
      boxShadow: {
        "github-sm": "0 1px 0 rgba(27,31,36,0.04)",
        "github-md": "0 12px 32px rgba(1,4,9,0.32)"
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif"
        ],
        mono: ["SFMono-Regular", "Consolas", "Liberation Mono", "Menlo", "monospace"]
      }
    }
  },
  plugins: []
};

export default config;
