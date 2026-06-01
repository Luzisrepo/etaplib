"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { CheckCircle, FileUp, Loader2, Tag, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { StatusCallout } from "@/components/ui/status-callout";
import { supabase } from "@/lib/supabase";
import type { Category } from "@/lib/types";
import { cn, formatBytes, parseTags, safeFileName } from "@/lib/utils";

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
  const [file, setFile]           = useState<File | null>(null);
  const [title, setTitle]         = useState("");
  const [description, setDesc]    = useState("");
  const [categoryId, setCat]      = useState("");
  const [tagsInput, setTags]      = useState("");
  const [loading, setLoading]     = useState(false);
  const [progress, setProgress]   = useState(0);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [dragging, setDragging]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) { setError(null); setProgress(0); setDone(false); setFile(null); setTitle(""); setDesc(""); setCat(""); setTags(""); }
  }, [open]);

  // Handle initialFile automatic upload trigger
  useEffect(() => {
    if (open && initialFile) {
      setFile(initialFile);
      const cleanTitle = initialFile.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setTitle(cleanTitle);
      
      // Delay slightly to ensure state is set, then start upload
      const t = setTimeout(() => {
        void doUpload(initialFile, cleanTitle);
      }, 100);
      return () => clearTimeout(t);
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

  function pick(f: File | null) {
    if (!f) return;
    setFile(f);
    if (!title.trim()) setTitle(f.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
  }

  async function doUpload(targetFile: File, customTitle: string) {
    if (targetFile.size > MAX) { setError(`Ficheiro excede ${formatBytes(MAX)}.`); return; }
    setError(null);
    setLoading(true);
    setProgress(5);

    const path = `${session.user.id}/${Date.now()}-${safeFileName(targetFile.name)}`;
    const mime = targetFile.type || "application/octet-stream";

    const { error: ue } = await supabase.storage.from("biblioteca").upload(path, targetFile, {
      cacheControl: "3600", contentType: mime, upsert: false,
    });
    setProgress(70);
    if (ue) { setLoading(false); setProgress(0); setError(ue.message); return; }

    const { error: ie } = await supabase.from("documents").insert({
      category_id: categoryId || null,
      description: description.trim() || null,
      file_name: targetFile.name, file_path: path, file_size: targetFile.size, mime_type: mime,
      owner_id: session.user.id,
      tags: parseTags(tagsInput),
      title: customTitle.trim() || targetFile.name,
    });
    setProgress(100);
    if (ie) { await supabase.storage.from("biblioteca").remove([path]); setLoading(false); setProgress(0); setError(ie.message); return; }

    setDone(true);
    setTimeout(() => { onUploaded(); onClose(); }, 900);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) { setError("Seleciona um ficheiro."); return; }
    await doUpload(file, title || file.name);
  }

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
              <h2 className="text-base font-semibold text-[var(--fg)]">Novo material</h2>
              <p className="mono text-xs text-[var(--fg-2)]">máx. 500 MB</p>
            </div>
          </div>
          <button disabled={loading} onClick={onClose} className="focus-ring grid h-8 w-8 place-items-center rounded-md text-[var(--fg-3)] hover:bg-[var(--bg-3)] hover:text-[var(--fg)] transition-colors disabled:opacity-40">
            <X size={18} />
          </button>
        </div>

        <form className="space-y-5 p-6" onSubmit={handleSubmit}>

          {/* Drop zone */}
          <div
            onClick={() => !loading && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0] ?? null); }}
            className={cn(
              "relative flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-all duration-150",
              dragging ? "border-[var(--accent)] bg-[var(--accent-bg)]" : file ? "border-[var(--green)]/60 bg-[var(--green-bg)]" : "border-[var(--border)] bg-[var(--bg)] hover:border-[var(--border-2)] hover:bg-[var(--bg-3)]"
            )}
          >
            <input ref={inputRef} type="file" className="sr-only" onChange={(e) => pick(e.target.files?.[0] ?? null)} />

            {file ? (
              <>
                <CheckCircle size={32} className="text-[var(--green)]" />
                <div>
                  <p className="text-sm font-bold text-[var(--fg)]">{file.name}</p>
                  <p className="mono text-[11px] text-[var(--fg-2)] mt-1">{formatBytes(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); setTitle(""); }}
                  className="mono text-xs font-medium text-[var(--fg-2)] hover:text-[var(--red)] transition-colors mt-2"
                >
                  trocar ficheiro
                </button>
              </>
            ) : (
              <>
                <Upload size={28} className={dragging ? "text-[var(--accent)]" : "text-[var(--fg-3)]"} />
                <p className="text-sm font-medium text-[var(--fg-2)]">Arrastar ou <span className="text-[var(--accent)]">escolher ficheiro</span></p>
                <p className="mono text-xs text-[var(--fg-3)]">PDF · vídeo · apresentação · imagem · zip</p>
              </>
            )}
          </div>

          {/* Fields */}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Título" required>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Redes — Aula 04" required />
            </Field>
            <Field label="Categoria">
              <Select value={categoryId} onChange={(e) => setCat(e.target.value)}>
                <option value="">Sem categoria</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
          </div>

          <Field label="Descrição">
            <Textarea value={description} onChange={(e) => setDesc(e.target.value)} placeholder="Resumo para ajudar colegas a encontrar o ficheiro…" />
          </Field>

          <Field label="Tags" hint="Separadas por vírgulas.">
            <div className="relative">
              <Tag size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--fg-3)]" />
              <Input className="pl-10" value={tagsInput} onChange={(e) => setTags(e.target.value)} placeholder="redes, modulo-3, exame" />
            </div>
          </Field>

          {/* Progress */}
          {loading && (
            <div className="space-y-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-4)]">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", done ? "bg-[var(--green)]" : "bg-[var(--accent)]")}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mono text-[11px] font-medium text-[var(--fg-2)]">{done ? "concluído!" : `a enviar… ${progress}%`}</p>
            </div>
          )}

          {error && <StatusCallout kind="error">{error}</StatusCallout>}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-5">
            <Button disabled={loading} onClick={onClose} variant="ghost" size="md">Cancelar</Button>
            <Button disabled={loading || done} type="submit" variant="primary" size="md">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />}
              {loading ? (done ? "Concluído" : "A enviar…") : "Enviar material"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
