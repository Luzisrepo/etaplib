"use client";

import { useRef, useState } from "react";
import {
  Archive, Download, Edit3, ExternalLink, File,
  FileText, Image as ImageIcon, Loader2, Presentation, Trash2, Video
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import type { LibraryDocument } from "@/lib/types";
import { cn, formatBytes, formatRelativeDate, getInitials } from "@/lib/utils";

type Props = {
  document: LibraryDocument;
  isOwner: boolean;
  onDeleted: (id: string) => void;
  onUpdated: (doc: LibraryDocument) => void;
  onEdit: () => void;
  onRefresh: () => void;
  onSelect?: () => void;
};

export function DocumentCard({ document, isOwner, onDeleted, onEdit, onSelect }: Props) {
  const [busy, setBusy] = useState<"view" | "dl" | "del" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [exiting, setExiting] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const Icon = fileIcon(document.mime_type, document.file_name);

  async function openUrl(mode: "view" | "dl") {
    setBusy(mode);
    setError(null);
    const { data, error: e } = await supabase.storage
      .from("biblioteca")
      .createSignedUrl(document.file_path, 120, mode === "dl" ? { download: document.file_name } : undefined);
    setBusy(null);
    if (e || !data?.signedUrl) { setError(e?.message ?? "Erro ao criar link."); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function doDelete() {
    setBusy("del");
    setConfirmDel(false);
    setError(null);
    const { error: se } = await supabase.storage.from("biblioteca").remove([document.file_path]);
    if (se) { setBusy(null); setError(se.message); return; }
    const { error: de } = await supabase.from("documents").delete().eq("id", document.id);
    if (de) { setBusy(null); setError(de.message); return; }
    setExiting(true);
    setTimeout(() => onDeleted(document.id), 250);
  }

  const ownerName = document.owner?.full_name || document.owner?.email?.split("@")[0] || "ETAP";
  const initials  = getInitials(document.owner?.email ?? "et@etap.pt", document.owner?.full_name);
  const avatarUrl = document.owner?.avatar_url;

  return (
    <article
      ref={cardRef}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest("button") || target.closest(".cursor-default")) return;
        onSelect?.();
      }}
      className={cn(
        "group relative overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-2)] transition-all duration-150 cursor-pointer",
        "hover:border-[var(--border-2)] hover:bg-[var(--bg-3)] hover:shadow-md",
        exiting && "opacity-0 scale-[0.98] pointer-events-none",
        busy === "del" && "opacity-40 pointer-events-none",
      )}
      style={{ transition: exiting ? "opacity 200ms ease, transform 200ms ease" : undefined }}
    >
      {document.category && (
        <div
          className="absolute inset-y-0 left-0 w-1 opacity-80 group-hover:opacity-100 transition-opacity"
          style={{ backgroundColor: document.category.color }}
        />
      )}

      <div className="flex items-start gap-4 p-4 pl-5">
        <div className={cn(
          "mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-md border transition-all duration-150",
          "border-[var(--border)] bg-[var(--bg)] text-[var(--fg-2)]",
          "group-hover:border-[var(--border-2)] group-hover:text-[var(--fg)]"
        )}>
          {busy === "del" ? <Loader2 size={18} className="animate-spin" /> : <Icon size={18} />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-base font-semibold text-[var(--fg)] leading-snug">{document.title}</span>
            {document.category && (
              <Badge>
                <span className="inline-block h-1.5 w-1.5 rounded-sm" style={{ backgroundColor: document.category.color }} />
                {document.category.name}
              </Badge>
            )}
            {isOwner && <Badge variant="blue">meu</Badge>}
          </div>

          {document.description && (
            <p className="text-sm text-[var(--fg-2)] line-clamp-2 max-w-2xl mb-1.5">{document.description}</p>
          )}

          <div className="mono flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--fg-2)]">
            <span>{formatBytes(document.file_size)}</span>
            <span className="text-[var(--border)]">•</span>
            <span>{formatRelativeDate(document.created_at)}</span>
            <span className="text-[var(--border)]">•</span>
            <span className="flex items-center gap-2">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-5 w-5 rounded-full object-cover avatar-ring" />
              ) : (
                <span className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] text-[9px] font-bold text-white avatar-ring">
                  {initials}
                </span>
              )}
              <span className="text-[var(--fg)] font-medium">{ownerName}</span>
            </span>
            {document.file_name !== document.title && (
              <>
                <span className="text-[var(--border)]">•</span>
                <span className="truncate max-w-[220px] text-[var(--fg-3)]">{document.file_name}</span>
              </>
            )}
          </div>

          {document.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {document.tags.map((tag) => (
                <span key={tag} className="mono rounded border border-[var(--border)] bg-[var(--bg)] px-1.5 py-0.5 text-[11px] text-[var(--fg-2)] hover:border-[var(--border-2)] hover:text-[var(--fg)] transition-colors cursor-default">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {error && (
            <p className="mt-2 text-xs text-[var(--red)]">{error}</p>
          )}
        </div>

        <div className={cn(
          "flex flex-col sm:flex-row shrink-0 items-center gap-1.5 transition-all duration-150",
          confirmDel ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}>
          {!confirmDel ? (
            <>
              <ActionBtn
                label={busy === "view" ? "…" : "Ver"}
                icon={busy === "view" ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                disabled={busy !== null}
                onClick={() => openUrl("view")}
              />
              <ActionBtn
                label="DL"
                icon={busy === "dl" ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                disabled={busy !== null}
                onClick={() => openUrl("dl")}
              />
              {isOwner && (
                <>
                  <ActionBtn label="Edit" icon={<Edit3 size={14} />} disabled={busy !== null} onClick={onEdit} />
                  <ActionBtn
                    label="Del"
                    icon={<Trash2 size={14} />}
                    disabled={busy !== null}
                    onClick={() => setConfirmDel(true)}
                    danger
                  />
                </>
              )}
            </>
          ) : (
            <div className="anim-scale-in flex flex-col items-center gap-2 rounded-md border border-[var(--red)]/30 bg-[var(--red-bg)] p-2">
              <span className="mono text-xs font-semibold text-[var(--red)]">eliminar?</span>
              <div className="flex gap-2">
                <button
                  onClick={doDelete}
                  className="mono rounded border border-[var(--red)]/50 bg-[var(--red)] px-3 py-1 text-[11px] font-bold text-white transition-all hover:opacity-80 active:scale-95"
                >
                  sim
                </button>
                <button
                  onClick={() => setConfirmDel(false)}
                  className="mono rounded px-3 py-1 text-[11px] font-medium text-[var(--fg-2)] transition-all hover:text-[var(--fg)] hover:bg-[var(--bg-3)] active:scale-95"
                >
                  não
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function ActionBtn({
  icon, label, onClick, disabled, danger = false
}: {
  icon: React.ReactNode; label: string; onClick: () => void; disabled: boolean; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={cn(
        "mono focus-ring flex h-8 items-center justify-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-all duration-100 active:scale-95 disabled:opacity-40",
        danger
          ? "border-[var(--border)] bg-transparent text-[var(--fg-2)] hover:border-[var(--red)]/40 hover:bg-[var(--red-bg)] hover:text-[var(--red)]"
          : "border-[var(--border)] bg-transparent text-[var(--fg-2)] hover:border-[var(--border-2)] hover:bg-[var(--bg-3)] hover:text-[var(--fg)]"
      )}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
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
