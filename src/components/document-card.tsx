"use client";

import { useRef, useState } from "react";
import {
  Archive, Check, Copy, Download, Edit3, ExternalLink, File,
  FileText, Image as ImageIcon, Loader2, Presentation, Trash2, Video, Calendar
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import type { LibraryDocument } from "@/lib/types";
import { cn, formatBytes, formatRelativeDate, getInitials } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import { recordDownload } from "@/lib/analytics";

type Props = {
  document: LibraryDocument;
  isOwner: boolean;
  onDeleted: (id: string) => void;
  onEdit: () => void;
  onSelect?: () => void;
  compact?: boolean;
};

export function DocumentCard({ document, isOwner, onDeleted, onEdit, onSelect, compact = false }: Props) {
  const { t } = useLanguage();
  const [busy, setBusy] = useState<"view" | "dl" | "del" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const Icon = fileIcon(document.mime_type, document.file_name);

  const isExpired = document.expiry_date ? new Date(document.expiry_date) < new Date() : false;
  const expiryDateFormatted = document.expiry_date 
    ? new Date(document.expiry_date).toLocaleDateString()
    : null;

  async function openUrl(mode: "view" | "dl") {
    setBusy(mode);
    setError(null);
    const { data, error: e } = await supabase.storage
      .from("biblioteca")
      .createSignedUrl(document.file_path, 120, mode === "dl" ? { download: document.file_name } : undefined);
    setBusy(null);
    if (e || !data?.signedUrl) { setError(e?.message ?? t("docCardLinkError")); return; }
    
    // Log download analytics
    void recordDownload(document.id, document.owner_id);

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function copyLink() {
    try {
      const { data, error: e } = await supabase.storage
        .from("biblioteca")
        .createSignedUrl(document.file_path, 300);
      if (e || !data?.signedUrl) { setError(t("docCardLinkCopyError")); return; }
      await navigator.clipboard.writeText(data.signedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      // Log download analytics (counting copy link as sharing/viewing)
      void recordDownload(document.id, document.owner_id);
    } catch {
      setError(t("docCardLinkCopyError"));
    }
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

  // ── Compact (dense list) mode ──────────────────────────────────────────

  if (compact) {
    return (
      <article
        ref={cardRef}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("button")) return;
          onSelect?.();
        }}
        className={cn(
          "group relative flex items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--bg-2)] px-3 py-2 cursor-pointer transition-all duration-100",
          "hover:border-[var(--border-2)] hover:bg-[var(--bg-3)]",
          exiting && "opacity-0 scale-[0.98] pointer-events-none",
          busy === "del" && "opacity-40 pointer-events-none",
        )}
        style={{ transition: exiting ? "opacity 200ms, transform 200ms" : undefined }}
      >
        {document.category && (
          <div className="absolute inset-y-0 left-0 w-0.5 rounded-l-md" style={{ backgroundColor: document.category.color }} />
        )}

        <div className="grid h-7 w-7 shrink-0 place-items-center rounded border border-[var(--border)] bg-[var(--bg)] text-[var(--fg-3)]">
          {busy === "del" ? <Loader2 size={13} className="animate-spin" /> : <Icon size={13} />}
        </div>

        <span className="flex-1 truncate text-sm font-medium text-[var(--fg)]">{document.title}</span>

        {isExpired && (
          <span className="mono text-[9px] font-bold uppercase text-[var(--red)] border border-[var(--red)]/35 bg-[var(--red-bg)] px-1.5 py-0.5 rounded mr-2">
            {t("expiredBadge")}
          </span>
        )}

        {document.category && (
          <span className="mono hidden sm:flex items-center gap-1 text-[10px] text-[var(--fg-3)]">
            <span className="h-1.5 w-1.5 rounded-sm" style={{ backgroundColor: document.category.color }} />
            {document.category.name}
          </span>
        )}

        <span className="mono hidden md:inline text-[11px] text-[var(--fg-3)]">{formatBytes(document.file_size)}</span>
        <span className="mono hidden lg:inline text-[11px] text-[var(--fg-3)]">{formatRelativeDate(document.created_at)}</span>

        <div className={cn(
          "flex items-center gap-1 transition-all duration-100",
          confirmDel ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}>
          {!confirmDel ? (
            <>
              <ActionBtn label={t("docCardActionView")} icon={busy === "view" ? <Loader2 size={12} className="animate-spin" /> : <ExternalLink size={12} />} disabled={busy !== null} onClick={() => openUrl("view")} />
              <ActionBtn label={t("docCardActionDownload")} icon={<Download size={12} />} disabled={busy !== null} onClick={() => openUrl("dl")} />
              {isOwner && (
                <>
                  <ActionBtn label={t("docCardActionEdit")} icon={<Edit3 size={12} />} disabled={busy !== null} onClick={onEdit} />
                  <ActionBtn label={t("docCardActionDelete")} icon={<Trash2 size={12} />} disabled={busy !== null} onClick={() => setConfirmDel(true)} danger />
                </>
              )}
            </>
          ) : (
            <div className="flex items-center gap-1.5 rounded border border-[var(--red)]/30 bg-[var(--red-bg)] px-2 py-1">
              <span className="mono text-[10px] text-[var(--red)]">{t("docCardDeleteConfirm")}</span>
              <button onClick={doDelete} className="mono rounded bg-[var(--red)] px-2 py-0.5 text-[10px] font-bold text-white hover:opacity-80">{t("docCardDeleteConfirmYes")}</button>
              <button onClick={() => setConfirmDel(false)} className="mono text-[10px] text-[var(--fg-2)] hover:text-[var(--fg)]">{t("docCardDeleteConfirmNo")}</button>
            </div>
          )}
        </div>
      </article>
    );
  }

  // ── Full card (list) mode ─────────────────────────────────────────────

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
        {/* File icon */}
        <div className={cn(
          "mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-md border transition-all duration-150",
          "border-[var(--border)] bg-[var(--bg)] text-[var(--fg-2)]",
          "group-hover:border-[var(--border-2)] group-hover:text-[var(--fg)]"
        )}>
          {busy === "del" ? <Loader2 size={18} className="animate-spin" /> : <Icon size={18} />}
        </div>

        {/* Body */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-base font-semibold text-[var(--fg)] leading-snug">{document.title}</span>
            {document.category && (
              <Badge>
                <span className="inline-block h-1.5 w-1.5 rounded-sm" style={{ backgroundColor: document.category.color }} />
                {document.category.name}
              </Badge>
            )}
            {isOwner && <Badge variant="blue">{t("docCardOwnerBadge")}</Badge>}
            
            {isExpired && (
              <span className="mono text-[9px] font-bold uppercase text-[var(--red)] border border-[var(--red)]/35 bg-[var(--red-bg)] px-1.5 py-0.5 rounded">
                {t("expiredBadge")}
              </span>
            )}

            {!isExpired && expiryDateFormatted && (
              <span className="mono flex items-center gap-1 text-[10px] text-[var(--amber)] border border-[var(--amber)]/35 bg-[var(--amber-bg)] px-1.5 py-0.5 rounded" title={t("expiryDateHelp")}>
                <Calendar size={10} />
                <span>{t("expiryBadge", { date: expiryDateFormatted })}</span>
              </span>
            )}
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

          {error && <p className="mt-2 text-xs text-[var(--red)]">{error}</p>}
        </div>

        {/* Actions */}
        <div className={cn(
          "flex flex-col sm:flex-row shrink-0 items-center gap-1.5 transition-all duration-150",
          confirmDel ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}>
          {!confirmDel ? (
            <>
              <ActionBtn
                label={busy === "view" ? "…" : t("docCardActionView")}
                icon={busy === "view" ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                disabled={busy !== null}
                onClick={() => openUrl("view")}
              />
              <ActionBtn
                label={t("docCardActionDownload")}
                icon={busy === "dl" ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                disabled={busy !== null}
                onClick={() => openUrl("dl")}
              />
              {/* Copy link button */}
              <ActionBtn
                label={copied ? t("docCardLinkCopied") : t("docCardCopyLink")}
                icon={copied ? <Check size={14} className="text-[var(--green)]" /> : <Copy size={14} />}
                disabled={busy !== null}
                onClick={copyLink}
              />
              {isOwner && (
                <>
                  <ActionBtn label={t("docCardActionEdit")} icon={<Edit3 size={14} />} disabled={busy !== null} onClick={onEdit} />
                  <ActionBtn
                    label={t("docCardActionDelete")}
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
              <span className="mono text-xs font-semibold text-[var(--red)]">{t("docCardDeleteConfirm")}</span>
              <div className="flex gap-2">
                <button onClick={doDelete} className="mono rounded border border-[var(--red)]/50 bg-[var(--red)] px-3 py-1 text-[11px] font-bold text-white transition-all hover:opacity-80 active:scale-95">
                  {t("docCardDeleteConfirmYes")}
                </button>
                <button onClick={() => setConfirmDel(false)} className="mono rounded px-3 py-1 text-[11px] font-medium text-[var(--fg-2)] transition-all hover:text-[var(--fg)] hover:bg-[var(--bg-3)] active:scale-95">
                  {t("docCardDeleteConfirmNo")}
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
