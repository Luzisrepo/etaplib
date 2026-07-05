"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { CheckCircle, FileUp, Loader2, Tag, Upload, X, Trash2, Calendar, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { StatusCallout } from "@/components/ui/status-callout";
import { supabase } from "@/lib/supabase";
import type { Category } from "@/lib/types";
import { cn, findBlockedTag, findBlockedWordInText, formatBytes, parseTags, safeFileName, TAG_MAX_CHARS, TAG_MAX_COUNT } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";

const MAX = 500 * 1024 * 1024;

type Props = {
  categories: Category[];
  onClose: () => void;
  onUploaded: () => void;
  open: boolean;
  session: Session;
  initialFile?: File | null;
};

export function UploadDialog({ categories, onClose, onUploaded, open, session, initialFile }: Props) {
  const { t } = useLanguage();
  const [files, setFiles]         = useState<File[]>([]);
  const [title, setTitle]         = useState("");
  const [description, setDesc]    = useState("");
  const [descError, setDescError] = useState<string | null>(null);
  const [categoryId, setCat]      = useState("");
  const [tagsInput, setTags]      = useState("");
  const [tagError, setTagError]   = useState<string | null>(null);
  const [expiryDate, setExpiry]   = useState("");
  
  // Duplicate detection state
  const [duplicateNames, setDuplicateNames] = useState<string[]>([]);
  const [bypassDuplicates, setBypass]       = useState(false);

  // Upload progress state
  const [loading, setLoading]     = useState(false);
  const [currentFileIndex, setIndex] = useState(0);
  const [progress, setProgress]   = useState(0);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [dragging, setDragging]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setError(null);
      setProgress(0);
      setDone(false);
      setFiles([]);
      setTitle("");
      setDesc("");
      setCat("");
      setTags("");
      setExpiry("");
      setTagError(null);
      setDescError(null);
      setDuplicateNames([]);
      setBypass(false);
      setIndex(0);
    }
  }, [open]);

  // Check database for duplicate file names & sizes
  async function checkForDuplicates(fileList: File[]) {
    if (fileList.length === 0) return;
    try {
      const names = fileList.map(f => f.name);
      const { data, error: dbErr } = await supabase
        .from("documents")
        .select("file_name, file_size")
        .in("file_name", names);

      if (dbErr) throw dbErr;

      const dupNames: string[] = [];
      for (const f of fileList) {
        const match = data?.find(
          dbFile => dbFile.file_name === f.name && Number(dbFile.file_size) === f.size
        );
        if (match) {
          dupNames.push(f.name);
        }
      }
      setDuplicateNames(dupNames);
    } catch (e) {
      console.error("Duplicate check failed:", e);
    }
  }

  // Handle initialFile automatic upload trigger
  useEffect(() => {
    if (open && initialFile) {
      setFiles([initialFile]);
      const cleanTitle = initialFile.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setTitle(cleanTitle);
      void checkForDuplicates([initialFile]);
    }
  }, [open, initialFile]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !loading) onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, loading, onClose]);

  if (!open) return null;

  async function handleFilesSelected(newFiles: FileList | null) {
    if (!newFiles) return;
    const list = Array.from(newFiles);
    
    // Check sizes
    const oversized = list.find(f => f.size > MAX);
    if (oversized) {
      setError(t("uploadDialogFileLimitError", { limit: formatBytes(MAX) }));
      return;
    }
    
    setError(null);
    const updated = [...files, ...list];
    setFiles(updated);
    
    // Auto title if single file
    if (updated.length === 1) {
      setTitle(updated[0].name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
    } else {
      setTitle(""); // Clear specific title if bulk uploading
    }

    void checkForDuplicates(updated);
  }

  function removeFile(index: number) {
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    if (updated.length === 1) {
      setTitle(updated[0].name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
    }
    void checkForDuplicates(updated);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (files.length === 0) { setError(t("uploadDialogSelectFileError")); return; }
    
    // Swear-filter check
    const blocked = findBlockedTag(tagsInput);
    if (blocked) { setTagError(t("uploadDialogTagSwearError", { blocked })); return; }
    const blockedDesc = findBlockedWordInText(description);
    if (blockedDesc) { setDescError(t("uploadDialogDescSwearError", { blockedDesc })); return; }

    // If duplicates found but not bypassed, do not submit yet
    if (duplicateNames.length > 0 && !bypassDuplicates) {
      setError(t("duplicateWarningTitle"));
      return;
    }

    setError(null);
    setLoading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        setIndex(i);
        setProgress(10);
        const f = files[i];

        const path = `${session.user.id}/${Date.now()}-${safeFileName(f.name)}`;
        const mime = f.type || "application/octet-stream";

        const { error: ue } = await supabase.storage.from("biblioteca").upload(path, f, {
          cacheControl: "3600", contentType: mime, upsert: false,
        });

        if (ue) throw ue;
        setProgress(60);

        // Derive title per file if multiple, or use custom title if single
        const fileTitle = files.length === 1 && title.trim() 
          ? title.trim() 
          : f.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

        const { error: ie } = await supabase.from("documents").insert({
          category_id: categoryId || null,
          description: description.trim() || null,
          file_name: f.name,
          file_path: path,
          file_size: f.size,
          mime_type: mime,
          owner_id: session.user.id,
          tags: parseTags(tagsInput),
          title: fileTitle,
          expiry_date: expiryDate ? new Date(expiryDate).toISOString() : null,
        });

        if (ie) {
          await supabase.storage.from("biblioteca").remove([path]);
          throw ie;
        }
        setProgress(100);
      }

      setDone(true);
      setTimeout(() => { onUploaded(); onClose(); }, 900);
    } catch (err: any) {
      setLoading(false);
      setProgress(0);
      setError(err.message || "Upload failed.");
    }
  }

  function handleDescChange(val: string) {
    setDesc(val);
    const blocked = findBlockedWordInText(val);
    setDescError(blocked ? t("uploadDialogDescSwearError", { blockedDesc: blocked }) : null);
  }

  function handleTagsChange(val: string) {
    setTags(val);
    setTagError(null);
    const blocked = findBlockedTag(val);
    if (blocked) {
      setTagError(t("uploadDialogTagLiveSwearError", { blocked }));
    } else {
      const tooLong = val.split(",").map(t => t.trim()).find(t => t.length > TAG_MAX_CHARS);
      if (tooLong) setTagError(t("uploadDialogTagTooLongError", { tooLong: tooLong.slice(0, 20) + "…", maxChars: TAG_MAX_CHARS }));
    }
  }

  const isBulk = files.length > 1;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-sm"
      role="dialog" aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
    >
      <div className="anim-scale-in w-full max-w-xl rounded-lg border border-[var(--border)] bg-[var(--bg-2)] shadow-2xl my-auto">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--accent)]">
              <FileUp size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--fg)]">{t("uploadDialogHeader")}</h2>
              <p className="mono text-xs text-[var(--fg-2)]">{t("uploadDialogLimitText")}</p>
            </div>
          </div>
          <button disabled={loading} onClick={onClose} className="focus-ring grid h-8 w-8 place-items-center rounded-md text-[var(--fg-3)] hover:bg-[var(--bg-3)] hover:text-[var(--fg)] transition-colors disabled:opacity-40">
            <X size={18} />
          </button>
        </div>

        <form className="space-y-5 p-6" onSubmit={handleSubmit}>

          {/* Drag & Drop Zone */}
          <div
            onClick={() => !loading && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); void handleFilesSelected(e.dataTransfer.files); }}
            className={cn(
              "relative flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-all duration-150",
              dragging ? "border-[var(--accent)] bg-[var(--accent-bg)]" : files.length > 0 ? "border-[var(--green)]/60 bg-[var(--green-bg)]/20" : "border-[var(--border)] bg-[var(--bg)] hover:border-[var(--border-2)] hover:bg-[var(--bg-3)]"
            )}
          >
            <input ref={inputRef} type="file" multiple className="sr-only" onChange={(e) => handleFilesSelected(e.target.files)} />
            <Upload size={28} className={dragging ? "text-[var(--accent)]" : "text-[var(--fg-3)]"} />
            <p className="text-sm font-medium text-[var(--fg-2)]">{t("uploadDialogDragOrChoose")}</p>
            <p className="mono text-xs text-[var(--fg-3)]">{t("uploadDialogSupportedFormats")}</p>
          </div>

          {/* Queue display */}
          {files.length > 0 && (
            <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3">
              <p className="mono text-[11px] font-bold text-[var(--fg-2)] uppercase tracking-wider">
                {t("bulkQueueTitle", { count: files.length })}
              </p>
              <div className="max-h-36 overflow-y-auto divide-y divide-[var(--border)] pr-1">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 text-xs">
                    <span className="truncate font-semibold text-[var(--fg)] max-w-[280px]" title={f.name}>{f.name}</span>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <span className="mono text-[10px] text-[var(--fg-3)]">{formatBytes(f.size)}</span>
                      {!loading && (
                        <button type="button" onClick={() => removeFile(i)} className="text-[var(--fg-3)] hover:text-[var(--red)] transition-colors">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Duplicate warning callout */}
          {duplicateNames.length > 0 && (
            <div className="rounded-lg border border-[var(--red)]/30 bg-[var(--red-bg)] p-3 space-y-2">
              <div className="flex items-center gap-2 text-[var(--red)] font-semibold text-xs">
                <AlertTriangle size={14} />
                <span>{t("duplicateWarningTitle")}</span>
              </div>
              <p className="text-[11px] text-[var(--fg-2)]">
                {t("duplicateWarningText")}
              </p>
              <div className="max-h-20 overflow-y-auto pl-4 list-disc text-[10px] mono text-[var(--fg-3)]">
                {duplicateNames.map(name => <div key={name}>• {name}</div>)}
              </div>
              <label className="flex items-center gap-2 pt-1 text-xs cursor-pointer select-none text-[var(--fg-2)]">
                <input
                  type="checkbox"
                  checked={bypassDuplicates}
                  onChange={(e) => setBypass(e.target.checked)}
                  className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                />
                <span>{t("duplicateWarningProceed")}</span>
              </label>
            </div>
          )}

          {/* Title and Category (only edit custom title if single file) */}
          <div className="grid gap-5 sm:grid-cols-2">
            {!isBulk ? (
              <Field label={t("uploadDialogFieldTitle")} required>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("uploadDialogFieldTitlePlaceholder")} required />
              </Field>
            ) : (
              <div className="flex flex-col justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-3)] px-4 py-2.5">
                <p className="text-xs font-semibold text-[var(--fg-2)]">Batch Upload Mode</p>
                <p className="text-[10px] text-[var(--fg-3)] mt-0.5">Title is automatically derived from filename</p>
              </div>
            )}
            <Field label={t("uploadDialogFieldCategory")}>
              <Select value={categoryId} onChange={(e) => setCat(e.target.value)}>
                <option value="">{t("uploadDialogFieldCategoryNone")}</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {/* Expiry Date */}
            <Field label={t("expiryDateLabel")} hint={t("expiryDateHelp")}>
              <div className="relative">
                <Calendar size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--fg-3)]" />
                <Input
                  type="date"
                  className="pl-10"
                  value={expiryDate}
                  onChange={(e) => setExpiry(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
            </Field>

            {/* Tags */}
            <Field label={t("uploadDialogFieldTags")} hint={t("uploadDialogFieldTagsHint")}>
              <div className="relative">
                <Tag size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--fg-3)]" />
                <Input
                  className={cn("pl-10", tagError && "border-[var(--red)] focus:border-[var(--red)]")}
                  value={tagsInput}
                  onChange={(e) => handleTagsChange(e.target.value)}
                  placeholder={t("uploadDialogFieldTagsPlaceholder")}
                />
              </div>
            </Field>
          </div>

          {/* Tag stats row */}
          <div className="flex items-start justify-between gap-2 mt-1">
            {tagError ? (
              <p className="mono text-[11px] font-medium text-[var(--red)]">{tagError}</p>
            ) : (
              <p className="mono text-[11px] text-[var(--fg-3)]">
                {t("uploadDialogTagsHintText", { maxChars: TAG_MAX_CHARS, maxCount: TAG_MAX_COUNT })}
              </p>
            )}
            <p className="mono text-[11px] text-[var(--fg-3)] shrink-0">
              {parseTags(tagsInput).length}/{TAG_MAX_COUNT}
            </p>
          </div>

          <Field label={t("uploadDialogFieldDescription")}>
            <Textarea
              value={description}
              onChange={(e) => handleDescChange(e.target.value)}
              placeholder={t("uploadDialogFieldDescriptionPlaceholder")}
              className={descError ? "border-[var(--red)] focus:border-[var(--red)]" : ""}
            />
            {descError && <p className="mono text-[11px] font-medium text-[var(--red)] mt-1">{descError}</p>}
          </Field>

          {/* Progress */}
          {loading && (
            <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--bg-3)] p-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-4)]">
                <div
                  className={cn("h-full rounded-full transition-all duration-300", done ? "bg-[var(--green)]" : "bg-[var(--accent)]")}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mono text-[11px] font-medium text-[var(--fg-2)]">
                {done 
                  ? t("uploadDialogDoneProgress") 
                  : isBulk 
                    ? t("bulkUploadProgress", { current: currentFileIndex + 1, total: files.length }) + ` (${progress}%)`
                    : t("uploadDialogUploadingProgress", { progress })
                }
              </p>
            </div>
          )}

          {error && error !== t("duplicateWarningTitle") && (
            <StatusCallout kind="error">{error}</StatusCallout>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-5">
            <Button disabled={loading} onClick={onClose} variant="ghost" size="md">{t("cancel")}</Button>
            <Button 
              disabled={loading || done || !!tagError || !!descError || (duplicateNames.length > 0 && !bypassDuplicates)} 
              type="submit" 
              variant="primary" 
              size="md"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />}
              {loading ? (done ? t("uploadDialogDoneBtnText") : t("uploadDialogUploadingBtnText")) : t("uploadDialogUploadBtnText")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
