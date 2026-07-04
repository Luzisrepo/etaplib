"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, AlertTriangle, Code2 } from "lucide-react";
import hljs from "highlight.js";
import { marked } from "marked";
import { useLanguage } from "@/lib/language-context";
import { formatBytes } from "@/lib/utils";

// ── Extension → highlight.js language mapping ────────────────────────────────

const EXT_TO_LANG: Record<string, string> = {
  // JavaScript / TypeScript
  js: "javascript", jsx: "javascript", mjs: "javascript", cjs: "javascript",
  ts: "typescript", tsx: "typescript",
  // Python
  py: "python", pyw: "python", pyi: "python",
  // JVM
  java: "java", kt: "kotlin", kts: "kotlin", scala: "scala", groovy: "groovy",
  // C family
  c: "c", h: "c", cpp: "cpp", cxx: "cpp", cc: "cpp", hpp: "cpp",
  cs: "csharp",
  // Systems
  go: "go", rs: "rust", zig: "zig",
  // Web
  html: "xml", htm: "xml", xml: "xml", svg: "xml", xsl: "xml",
  css: "css", scss: "scss", less: "less", sass: "scss",
  // Data / Config
  json: "json", yaml: "yaml", yml: "yaml", toml: "ini", ini: "ini",
  env: "bash", conf: "nginx",
  // Scripting
  sh: "bash", bash: "bash", zsh: "bash", fish: "bash",
  ps1: "powershell", psm1: "powershell",
  rb: "ruby", php: "php", pl: "perl", pm: "perl",
  lua: "lua", r: "r",
  // Mobile
  swift: "swift", dart: "dart",
  // SQL
  sql: "sql",
  // Markdown
  md: "markdown", mdx: "markdown",
  // Other
  dockerfile: "dockerfile", makefile: "makefile",
  tex: "latex", bib: "latex",
  graphql: "graphql", gql: "graphql",
  proto: "protobuf",
  tf: "hcl", hcl: "hcl",
  asm: "x86asm", s: "x86asm",
  vue: "xml", svelte: "xml",
  ex: "elixir", exs: "elixir",
  erl: "erlang", hrl: "erlang",
  hs: "haskell",
  clj: "clojure", cljs: "clojure",
  lisp: "lisp", el: "lisp",
  ml: "ocaml", mli: "ocaml",
  fs: "fsharp", fsx: "fsharp",
  v: "verilog", sv: "verilog",
  vhdl: "vhdl", vhd: "vhdl",
  cmake: "cmake",
  diff: "diff", patch: "diff",
  txt: "plaintext", log: "plaintext", csv: "plaintext",
};

/** Set of extensions that the code preview supports (used externally). */
export const CODE_EXTENSIONS = new Set(Object.keys(EXT_TO_LANG));

/** Returns the highlight.js language for a filename, or null. */
function detectLanguage(fileName: string): string | null {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  // Handle extensionless names like "Dockerfile", "Makefile"
  const baseName = fileName.split("/").pop()?.toLowerCase() ?? "";
  if (baseName === "dockerfile") return "dockerfile";
  if (baseName === "makefile" || baseName === "gnumakefile") return "makefile";
  if (baseName === "cmakelists.txt") return "cmake";
  return EXT_TO_LANG[ext] ?? null;
}

/** Human-friendly language label */
function languageLabel(lang: string): string {
  const labels: Record<string, string> = {
    javascript: "JavaScript", typescript: "TypeScript", python: "Python",
    java: "Java", kotlin: "Kotlin", scala: "Scala", groovy: "Groovy",
    c: "C", cpp: "C++", csharp: "C#",
    go: "Go", rust: "Rust", zig: "Zig",
    xml: "HTML/XML", css: "CSS", scss: "SCSS", less: "Less",
    json: "JSON", yaml: "YAML", ini: "TOML/INI",
    bash: "Shell", powershell: "PowerShell",
    ruby: "Ruby", php: "PHP", perl: "Perl", lua: "Lua", r: "R",
    swift: "Swift", dart: "Dart",
    sql: "SQL", markdown: "Markdown",
    dockerfile: "Dockerfile", makefile: "Makefile",
    latex: "LaTeX", graphql: "GraphQL", protobuf: "Protobuf",
    hcl: "HCL/Terraform", x86asm: "Assembly",
    elixir: "Elixir", erlang: "Erlang", haskell: "Haskell",
    clojure: "Clojure", lisp: "Lisp",
    ocaml: "OCaml", fsharp: "F#",
    verilog: "Verilog", vhdl: "VHDL",
    cmake: "CMake", diff: "Diff", nginx: "Config",
    plaintext: "Plain Text",
  };
  return labels[lang] ?? lang.charAt(0).toUpperCase() + lang.slice(1);
}

// ── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_MAX_BYTES = 512 * 1024; // 512 KB

// ── Props ────────────────────────────────────────────────────────────────────

type CodePreviewProps = {
  content: string;
  fileName: string;
  fileSize: number;
  maxBytes?: number;
};

// ── Component ────────────────────────────────────────────────────────────────

export function CodePreview({
  content,
  fileName,
  fileSize,
  maxBytes = DEFAULT_MAX_BYTES,
}: CodePreviewProps) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [mdMode, setMdMode] = useState<"source" | "rendered">("rendered");
  const codeRef = useRef<HTMLElement>(null);
  const mdRef = useRef<HTMLDivElement>(null);

  const lang = detectLanguage(fileName);
  const isMarkdown = lang === "markdown";
  const isTruncated = new TextEncoder().encode(content).length > maxBytes;
  const displayContent = isTruncated
    ? content.slice(0, maxBytes)
    : content;

  // Syntax-highlighted HTML with line wrapping
  const highlightedHtml = useMemo(() => {
    let html: string;
    if (lang && lang !== "plaintext") {
      try {
        html = hljs.highlight(displayContent, { language: lang }).value;
      } catch {
        html = hljs.highlightAuto(displayContent).value;
      }
    } else {
      html = hljs.highlightAuto(displayContent).value;
    }

    // Wrap each line in a span for line numbers via CSS counters
    const lines = html.split("\n");
    return lines
      .map((line) => `<span class="code-preview-line">${line || " "}</span>`)
      .join("\n");
  }, [displayContent, lang]);

  // Rendered Markdown HTML
  const renderedMarkdown = useMemo(() => {
    if (!isMarkdown) return "";
    const renderer = new marked.Renderer();
    renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
      let highlighted: string;
      const language = lang || "";
      if (language && hljs.getLanguage(language)) {
        try {
          highlighted = hljs.highlight(text, { language }).value;
        } catch {
          highlighted = hljs.highlightAuto(text).value;
        }
      } else {
        highlighted = hljs.highlightAuto(text).value;
      }
      return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
    };

    return marked.parse(displayContent, {
      gfm: true,
      breaks: true,
      renderer,
    }) as string;
  }, [displayContent, isMarkdown]);

  // Set highlighted HTML
  useEffect(() => {
    if (codeRef.current && (!isMarkdown || mdMode === "source")) {
      codeRef.current.innerHTML = highlightedHtml;
    }
  }, [highlightedHtml, isMarkdown, mdMode]);

  // Set rendered Markdown HTML
  useEffect(() => {
    if (mdRef.current && isMarkdown && mdMode === "rendered") {
      mdRef.current.innerHTML = renderedMarkdown;
    }
  }, [renderedMarkdown, isMarkdown, mdMode]);

  const lineCount = displayContent.split("\n").length;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = content;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="code-preview anim-scale-in">
      {/* Header bar */}
      <div className="code-preview-header">
        <div className="code-preview-header-left">
          <Code2 size={14} className="text-[var(--accent)] shrink-0" />
          {lang && (
            <span className="code-preview-lang-badge">
              {languageLabel(lang)}
            </span>
          )}
          <span className="code-preview-meta">
            {formatBytes(fileSize)} · {t("codePreviewLines", { count: lineCount })}
          </span>
        </div>
        <div className="code-preview-header-right">
          {/* Markdown source/rendered toggle */}
          {isMarkdown && (
            <div className="code-preview-toggle">
              <button
                type="button"
                className={mdMode === "source" ? "active" : ""}
                onClick={() => setMdMode("source")}
              >
                {t("codePreviewRawSource")}
              </button>
              <button
                type="button"
                className={mdMode === "rendered" ? "active" : ""}
                onClick={() => setMdMode("rendered")}
              >
                {t("codePreviewRendered")}
              </button>
            </div>
          )}
          <button
            type="button"
            className={`code-preview-copy-btn ${copied ? "copied" : ""}`}
            onClick={handleCopy}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? t("codePreviewCopied") : t("codePreviewCopy")}
          </button>
        </div>
      </div>

      {/* Code body */}
      {(!isMarkdown || mdMode === "source") && (
        <div className="code-preview-body preview-scroll">
          <pre>
            <code ref={codeRef} className={lang ? `hljs language-${lang}` : "hljs"} />
          </pre>
        </div>
      )}

      {/* Markdown rendered view */}
      {isMarkdown && mdMode === "rendered" && (
        <div ref={mdRef} className="md-rendered preview-scroll" />
      )}

      {/* Truncation notice */}
      {isTruncated && (
        <div className="code-preview-truncated">
          <AlertTriangle size={14} />
          {t("codePreviewTruncated", { size: formatBytes(maxBytes) })}
        </div>
      )}
    </div>
  );
}
