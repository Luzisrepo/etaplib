"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  BookMarked, CheckCircle2, FileStack, FolderOpen,
  LockKeyhole, ShieldCheck, Upload, Users
} from "lucide-react";
import { AuthDialog, type AuthMode } from "@/components/auth-dialog";
import { StatusCallout } from "@/components/ui/status-callout";
import { cn } from "@/lib/utils";

const SplineViewer = dynamic(
  () => import("@/components/spline-viewer").then(m => ({ default: m.SplineViewer })),
  { ssr: false, loading: () => null }
);

export function AuthPanel() {
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [splineReady, setSplineReady] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const errorDescription = params.get("error_description") ?? hashParams.get("error_description");
    if (errorDescription) {
      setNotice(errorDescription.replace(/\+/g, " "));
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }
    if (params.get("verified") === "1") {
      setNotice("Email confirmado. Inicia sessão para abrir a biblioteca.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  return (
    <main
      className="relative min-h-screen overflow-hidden"
      style={{
        "--bg":        "#0d1117",
        "--bg-2":      "#161b22",
        "--bg-3":      "#1c2128",
        "--bg-4":      "#21262d",
        "--border":    "#30363d",
        "--border-2":  "#444c56",
        "--fg":        "#e6edf3",
        "--fg-2":      "#8b949e",
        "--fg-3":      "#484f58",
        "--accent":    "#2f81f7",
        "--accent-2":  "#1f6feb",
        "--accent-bg": "#1f2d45",
        "--green":     "#3fb950",
        "--green-bg":  "#1a2d1a",
        "--red":       "#f85149",
        "--red-bg":    "#2a1515",
        "--amber":     "#d29922",
        "--amber-bg":  "#2a2215",
        "--purple":    "#a371f7",
        background:    "#0d1117",
        color:         "#e6edf3",
        fontFamily:    "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        fontSize:      "15px",
      } as React.CSSProperties}
    >

      {/* ── LEFT HERO (Spline + content) ── */}
      <div className="relative hidden min-h-screen lg:flex lg:w-[calc(100%-420px)] xl:w-[calc(100%-480px)]" style={{ background: "#0d1117" }}>

        {/* Spline canvas — fills entire left panel */}
        <div className={cn(
          "absolute inset-0 transition-opacity duration-1000",
          splineReady ? "opacity-100" : "opacity-0"
        )} style={{ background: "#0d1117" }}>
          {mounted && (
            <SplineViewer
              scene="https://prod.spline.design/AhuBbeENuXlxWne3/scene.splinecode"
              onLoad={() => setSplineReady(true)}
            />
          )}
        </div>

        {/* Loading state while Spline boots */}
        {!splineReady && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-px w-24 overflow-hidden rounded-full bg-[var(--bg-4)]">
              <div className="h-full w-1/2 rounded-full bg-[var(--accent)] animate-[shimmer_1.2s_ease_infinite]" />
            </div>
          </div>
        )}

        {/* Gradient fade on right edge so it blends into auth panel */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-48 bg-gradient-to-l from-[#0d1117] to-transparent" />
        {/* Bottom fade */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0d1117] to-transparent" />

        {/* Content overlay — sits on top of Spline */}
        <div className="relative z-10 flex flex-col justify-between p-10 xl:p-14">

          {/* Top: Logo */}
          <div className="flex items-center gap-2.5">
            <div className="grid h-7 w-7 place-items-center rounded-md border border-[var(--border)]/60 bg-[var(--bg)]/80 backdrop-blur-sm">
              <BookMarked size={14} className="text-[var(--accent)]" />
            </div>
            <span className="mono text-xs font-semibold tracking-widest text-[var(--fg-2)]">ETAP / BIBLIOTECA</span>
          </div>

          {/* Bottom: Hero copy */}
          <div className={cn(
            "max-w-xl transition-all duration-700 delay-300",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}>
            {/* Trust badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--border)]/70 bg-[var(--bg)]/70 px-3 py-1.5 text-xs text-[var(--fg-2)] backdrop-blur-md">
              <ShieldCheck size={13} className="text-[var(--green)]" />
              <span>Domínio ETAP protegido por Supabase Auth</span>
            </div>

            <h1 className="text-4xl font-bold leading-[1.15] tracking-tight text-[var(--fg)] xl:text-5xl [text-shadow:0_2px_40px_rgba(0,0,0,0.8)]">
              Biblioteca digital{" "}
              <span className="bg-gradient-to-r from-[var(--accent)] to-[var(--purple)] bg-clip-text text-transparent">
                para partilha
              </span>
              {" "}de materiais.
            </h1>

            <p className="mt-4 max-w-md text-sm leading-7 text-[var(--fg-2)] [text-shadow:0_1px_20px_rgba(0,0,0,0.9)]">
              PDFs, vídeos, apresentações e recursos de estudo centralizados numa interface rápida, preparada para o dia a dia da escola.
            </p>

            {/* Stat pills */}
            <div className="mt-8 flex flex-wrap gap-2">
              {[
                { icon: <Upload size={12} />, label: "bucket biblioteca" },
                { icon: <ShieldCheck size={12} />, label: "@etap.pt" },
                { icon: <Users size={12} />, label: "owner-first RLS" },
                { icon: <FileStack size={12} />, label: "500 MB por ficheiro" },
              ].map(({ icon, label }) => (
                <div
                  key={label}
                  className="mono flex items-center gap-1.5 rounded-full border border-[var(--border)]/60 bg-[var(--bg)]/70 px-3 py-1 text-[10px] text-[var(--fg-2)] backdrop-blur-sm transition-all hover:border-[var(--border-2)] hover:text-[var(--fg)]"
                >
                  <span className="text-[var(--fg-3)]">{icon}</span>
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT AUTH PANEL ── */}
      <div
        className="fixed inset-y-0 right-0 flex w-full flex-col justify-center px-6 py-10 lg:w-[420px] xl:w-[480px]"
        style={{ background: "#0d1117", borderLeft: "1px solid #21262d" }}
      >
        {/* Subtle top gradient accent */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/40 to-transparent" />

        <div className="mx-auto w-full max-w-sm">

          {/* Mobile logo (only shows below lg) */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="grid h-8 w-8 place-items-center rounded-md border border-[var(--border)] bg-[var(--bg-2)]">
              <BookMarked size={15} className="text-[var(--accent)]" />
            </div>
            <div>
              <p className="mono text-[10px] uppercase tracking-widest text-[var(--fg-3)]">ETAP</p>
              <p className="text-sm font-semibold text-[var(--fg)]">Biblioteca</p>
            </div>
          </div>

          {/* Panel heading */}
          <div className="mb-6">
            <p className="mono text-[10px] font-semibold uppercase tracking-widest text-[var(--fg-3)]">acesso institucional</p>
            <h2 className="mt-1.5 text-xl font-bold text-[var(--fg)]">Bem-vindo de volta</h2>
            <p className="mt-1 text-sm text-[var(--fg-2)]">Usa o teu email <span className="mono text-[var(--accent)]">@etap.pt</span> para aceder.</p>
          </div>

          {notice && (
            <div className="mb-4">
              <StatusCallout kind="success">{notice}</StatusCallout>
            </div>
          )}

          {/* Auth buttons */}
          <div className="space-y-2.5">
            <AuthButton
              onClick={() => setAuthMode("login")}
              icon={<LockKeyhole size={15} />}
              label="Iniciar sessão"
              sublabel="Entra com a tua conta"
              primary
            />
            <AuthButton
              onClick={() => setAuthMode("register")}
              icon={<CheckCircle2 size={15} />}
              label="Criar conta"
              sublabel="Registo com email @etap.pt"
            />
          </div>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--bg-4)]" />
            <span className="mono text-[10px] text-[var(--fg-3)]">funcionalidades</span>
            <div className="h-px flex-1 bg-[var(--bg-4)]" />
          </div>

          {/* Feature list */}
          <div className="space-y-1">
            {[
              { icon: <Upload size={13} />, title: "Uploads até 500 MB", desc: "PDF, vídeo, PPTX, ZIP e mais." },
              { icon: <FolderOpen size={13} />, title: "Organização rápida", desc: "Categorias, tags e pesquisa global." },
              { icon: <ShieldCheck size={13} />, title: "Permissões por autor", desc: "Só o dono edita ou elimina." },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-[var(--bg-2)]">
                <div className="mt-px grid h-6 w-6 shrink-0 place-items-center rounded border border-[var(--bg-4)] bg-[var(--bg-2)] text-[var(--fg-3)]">
                  {icon}
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--fg)]">{title}</p>
                  <p className="text-[11px] text-[var(--fg-3)]">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <p className="mono mt-8 text-center text-[10px] text-[var(--fg-3)]">
            ETAP Biblioteca · {new Date().getFullYear()}
          </p>
        </div>
      </div>

      <AuthDialog mode={authMode} onClose={() => setAuthMode(null)} onModeChange={setAuthMode} />
    </main>
  );
}

function AuthButton({
  onClick, icon, label, sublabel, primary = false
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "focus-ring group flex w-full items-center gap-3 rounded-md border px-4 py-3 text-left transition-all duration-150 active:scale-[0.98]",
        primary
          ? "border-[#3fb950] bg-[#1a2d1a] hover:bg-[#1e3520] hover:border-[#56d364]"
          : "border-[var(--border)] bg-[var(--bg-2)] hover:border-[var(--border-2)] hover:bg-[var(--bg-3)]"
      )}
    >
      <div className={cn(
        "grid h-8 w-8 shrink-0 place-items-center rounded border transition-colors",
        primary ? "border-[#3fb950]/40 bg-[#0d1117] text-[#3fb950]" : "border-[var(--border)] bg-[var(--bg)] text-[var(--fg-2)] group-hover:border-[var(--border-2)] group-hover:text-[var(--fg)]"
      )}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-semibold", primary ? "text-[#3fb950]" : "text-[var(--fg)]")}>{label}</p>
        <p className={cn("text-[11px]", primary ? "text-[#8b949e]" : "text-[var(--fg-3)]")}>{sublabel}</p>
      </div>
      <svg className={cn("h-4 w-4 transition-transform group-hover:translate-x-0.5", primary ? "text-[#3fb950]/60" : "text-[var(--fg-3)]")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}
