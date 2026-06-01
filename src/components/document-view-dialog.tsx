"use client";

import React, { useEffect, useState } from "react";
import {
  Archive, Calendar, Download, Edit3, ExternalLink, File, FileText,
  Image as ImageIcon, Loader2, Presentation, Trash2, Video, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import type { LibraryDocument } from "@/lib/types";
import { cn, formatBytes, formatRelativeDate, getInitials } from "@/lib/utils";

// ── Discord-like formatting parser ───────────────────────────────────────────

function renderDiscordFormat(text: string): React.ReactNode {
  if (!text) return null;

  // Split by code blocks first
  const blocks = text.split(/(```[\s\S]*?```)/g);

  return blocks.map((block, i) => {
    if (block.startsWith("```") && block.endsWith("```")) {
      const content = block.slice(3, -3).trim();
      const firstLineBreak = content.indexOf("\n");
      let lang = "";
      let code = content;
      if (firstLineBreak !== -1) {
        const possibleLang = content.substring(0, firstLineBreak).trim();
        if (possibleLang.length < 15 && !possibleLang.includes(" ")) {
          lang = possibleLang;
          code = content.substring(firstLineBreak + 1);
        }
      }
      return (
        <pre key={i} className="my-3 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 font-mono text-xs leading-relaxed text-[var(--fg)]">
          {lang && <span className="block text-[10px] text-[var(--fg-3)] uppercase tracking-wider mb-1 font-bold">{lang}</span>}
          <code>{code}</code>
        </pre>
      );
    }

    // Split normal text by inline code block `
    const inlineParts = block.split(/(`[^`\n]+`)/g);

    const parsedInline = inlineParts.map((part, j) => {
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={j} className="rounded border border-[var(--border)] bg-[var(--bg-3)] px-1.5 py-0.5 font-mono text-xs text-[var(--accent)] font-semibold">
            {part.slice(1, -1)}
          </code>
        );
      }

      // Parse bullet points and normal formatting line by line
      const lines = part.split("\n");
      const processedLines = lines.map((line, k) => {
        let isBullet = false;
        let lineContent = line;

        if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
          isBullet = true;
          lineContent = line.trim().substring(2);
        }

        // Apply Bold (**), Italic (*), Underline (__), Strikethrough (~~)
        const formatInlineStyles = (txt: string): React.ReactNode[] => {
          const tokens = txt.split(/(\*\*.*?\*\*|\*.*?\*|__.*?__|~~.*?~~)/g);
          return tokens.map((token, idx) => {
            if (token.startsWith("**") && token.endsWith("**")) {
              return <strong key={idx} className="font-bold text-[var(--fg)]">{token.slice(2, -2)}</strong>;
            }
            if (token.startsWith("*") && token.endsWith("*")) {
              return <em key={idx} className="italic text-[var(--fg-2)]">{token.slice(1, -1)}</em>;
            }
            if (token.startsWith("__") && token.endsWith("__")) {
              return <u key={idx} className="underline">{token.slice(2, -2)}</u>;
            }
            if (token.startsWith("~~") && token.endsWith("~~")) {
              return <s key={idx} className="line-through text-[var(--fg-3)]">{token.slice(2, -2)}</s>;
            }
            return token;
          });
        };

        const formatted = formatInlineStyles(lineContent);

        if (isBullet) {
          return (
            <li key={k} className="ml-4 list-disc pl-1 text-sm text-[var(--fg-2)] leading-relaxed my-0.5">
              {formatted}
            </li>
          );
        }

        return (
          <span key={k} className="block text-sm text-[var(--fg-2)] leading-relaxed min-h-[1rem]">
            {formatted}
          </span>
        );
      });

      return <React.Fragment key={j}>{processedLines}</React.Fragment>;
    });

    return <React.Fragment key={i}>{parsedInline}</React.Fragment>;
  });
}

function fileIcon(mime: string, name: string) {
  const s = `${mime} ${name}`.toLowerCase();
  if (s.includes("pdf") || s.includes("text") || s.endsWith(".md")) return FileText;
  if (s.includes("video")) return Video;
  if (s.includes("presentation") || s.includes("powerpoint") || s.endsWith(".pptx")) return Presentation;
  if (s.includes("image")) return ImageIcon;
  if (s.includes("zip") || s.includes("compressed") || s.endsWith(".rar")) return Archive;
  return File;
}

// ── Props ────────────────────────────────────────────────────────────────────

type Props = {
  document: LibraryDocument | null;
  open: boolean;
  onClose: () => void;
  isOwner: boolean;
  onEdit: () => void;
  onDeleted: (id: string) => void;
  onUpdated: (doc: LibraryDocument) => void;
  onRefresh: () => void;
};

// ── Component ────────────────────────────────────────────────────────────────

export function DocumentViewDialog({
  document, open, onClose, isOwner, onEdit, onDeleted
}: Props) {
  const [busy, setBusy] = useState<"view" | "dl" | "del" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, busy, onClose]);

  if (!open || !document) return null;

  const Icon = fileIcon(document.mime_type, document.file_name);
  const ownerName = document.owner?.full_name || document.owner?.email?.split("@")[0] || "ETAP";
  const initials  = getInitials(document.owner?.email ?? "et@etap.pt", document.owner?.full_name);
  const avatarUrl = document.owner?.avatar_url;

  async function openUrl(mode: "view" | "dl") {
    if (!document) return;
    setBusy(mode);
    setError(null);
    const { data, error: e } = await supabase.storage
      .from("biblioteca")
      .createSignedUrl(document.file_path, 120, mode === "dl" ? { download: document.file_name } : undefined);
    setBusy(null);
    if (e || !data?.signedUrl) { setError(e?.message ?? "Erro ao criar link seguro."); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function doDelete() {
    if (!document) return;
    setBusy("del");
    setConfirmDel(false);
    setError(null);
    const { error: se } = await supabase.storage.from("biblioteca").remove([document.file_path]);
    if (se) { setBusy(null); setError(se.message); return; }
    const { error: de } = await supabase.from("documents").delete().eq("id", document.id);
    if (de) { setBusy(null); setError(de.message); return; }
    onDeleted(document.id);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/75 px-4 py-8 backdrop-blur-sm anim-fade-in"
      role="dialog" aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
    >
      <div className="anim-scale-in w-full max-w-2xl rounded-lg border border-[var(--border)] bg-[var(--bg-2)] shadow-2xl my-auto overflow-hidden">
        
        {/* Header decoration (colored top line if category exists) */}
        {document.category && (
          <div className="h-1.5 w-full" style={{ backgroundColor: document.category.color }} />
        )}

        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="mono text-xs font-semibold uppercase tracking-widest text-[var(--fg-3)]">Visualização de Recurso</span>
          </div>
          <button disabled={busy !== null} onClick={onClose} className="focus-ring grid h-8 w-8 place-items-center rounded-md text-[var(--fg-3)] hover:bg-[var(--bg-3)] hover:text-[var(--fg)] transition-colors disabled:opacity-40">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* Main Title & Type Section */}
          <div className="flex items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--accent)] shadow-sm">
              <Icon size={24} />
            </div>
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-[var(--fg)] leading-snug break-words">{document.title}</h2>
                {document.category && (
                  <Badge>
                    <span className="inline-block h-1.5 w-1.5 rounded-sm mr-1" style={{ backgroundColor: document.category.color }} />
                    {document.category.name}
                  </Badge>
                )}
                {isOwner && <Badge variant="blue">meu material</Badge>}
              </div>
              <p className="mono text-xs text-[var(--fg-3)] truncate" title={document.file_name}>
                Ficheiro: {document.file_name}
              </p>
            </div>
          </div>

          {/* Author & Stats Grid */}
          <div className="grid gap-4 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 sm:grid-cols-2">
            {/* Author */}
            <div className="flex items-center gap-3">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover avatar-ring" />
              ) : (
                <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] text-xs font-bold text-white avatar-ring">
                  {initials}
                </span>
              )}
              <div className="min-w-0">
                <p className="text-xs text-[var(--fg-3)] uppercase tracking-wider font-semibold">Enviado por</p>
                <p className="text-sm font-semibold text-[var(--fg)] truncate">{ownerName}</p>
                <p className="text-[11px] text-[var(--fg-2)] truncate">{document.owner?.email ?? ""}</p>
              </div>
            </div>

            {/* Ficheiro Stats */}
            <div className="grid grid-cols-2 gap-2 border-t border-[var(--border)] pt-3 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4">
              <div>
                <p className="text-xs text-[var(--fg-3)] uppercase tracking-wider font-semibold">Tamanho</p>
                <p className="text-sm font-medium text-[var(--fg-2)] mono mt-0.5">{formatBytes(document.file_size)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--fg-3)] uppercase tracking-wider font-semibold">Data</p>
                <p className="text-sm font-medium text-[var(--fg-2)] mt-0.5" title={new Date(document.created_at).toLocaleString("pt")}>
                  {formatRelativeDate(document.created_at)}
                </p>
              </div>
            </div>
          </div>

          {/* Formatted Description Panel */}
          {document.description ? (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-3)]">Descrição e Notas</h3>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 max-h-64 overflow-y-auto text-left shadow-inner">
                {renderDiscordFormat(document.description)}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg)]/40">
              <p className="text-xs italic text-[var(--fg-3)]">Este material não possui descrição adicional.</p>
            </div>
          )}

          {/* Tags */}
          {document.tags.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-3)]">Tags Associadas</h3>
              <div className="flex flex-wrap gap-1.5">
                {document.tags.map((tag) => (
                  <span key={tag} className="mono rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-0.5 text-xs text-[var(--fg-2)] cursor-default">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded border border-[var(--red)]/30 bg-[var(--red-bg)] p-3 text-xs text-[var(--red)] font-medium">
              {error}
            </div>
          )}

          {/* Large Action Buttons Layout */}
          <div className="grid gap-3 sm:grid-cols-2 pt-4 border-t border-[var(--border)]">
            <button
              onClick={() => openUrl("view")}
              disabled={busy !== null}
              className="focus-ring flex h-12 items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-3)] font-semibold text-[var(--fg)] hover:bg-[var(--bg-4)] hover:border-[var(--border-2)] transition-all disabled:opacity-40 active:scale-[0.99]"
            >
              {busy === "view" ? <Loader2 size={18} className="animate-spin text-[var(--accent)]" /> : <ExternalLink size={18} className="text-[var(--accent)]" />}
              {busy === "view" ? "A preparar visualização…" : "Abrir e Visualizar"}
            </button>

            <button
              onClick={() => openUrl("dl")}
              disabled={busy !== null}
              className="focus-ring flex h-12 items-center justify-center gap-2 rounded-lg border border-[#3fb950] bg-[#1a2d1a] font-semibold text-[#3fb950] hover:bg-[#1e3520] hover:border-[#56d364] transition-all disabled:opacity-40 active:scale-[0.99]"
            >
              {busy === "dl" ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              {busy === "dl" ? "A descarregar…" : "Descarregar Ficheiro"}
            </button>
          </div>

          {/* Owner specific edit/delete row */}
          {isOwner && (
            <div className="flex justify-between items-center bg-[var(--bg)]/40 p-3 rounded-lg border border-[var(--border)] pt-3 mt-4">
              <span className="text-xs text-[var(--fg-3)] font-medium mono">Gestão de Autor</span>
              
              {!confirmDel ? (
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={onEdit} disabled={busy !== null}>
                    <Edit3 size={14} />
                    Editar
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setConfirmDel(true)} disabled={busy !== null}>
                    <Trash2 size={14} />
                    Eliminar
                  </Button>
                </div>
              ) : (
                <div className="anim-scale-in flex items-center gap-3 rounded-md border border-[var(--red)]/30 bg-[var(--red-bg)] px-3 py-1.5">
                  <span className="mono text-xs font-semibold text-[var(--red)]">Tem a certeza?</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={doDelete}
                      className="mono rounded border border-[var(--red)]/50 bg-[var(--red)] px-2.5 py-1 text-[11px] font-bold text-white transition-all hover:opacity-80 active:scale-95"
                    >
                      Sim
                    </button>
                    <button
                      onClick={() => setConfirmDel(false)}
                      className="mono rounded px-2.5 py-1 text-[11px] font-medium text-[var(--fg-2)] transition-all hover:text-[var(--fg)] hover:bg-[var(--bg-3)] active:scale-95"
                    >
                      Não
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
