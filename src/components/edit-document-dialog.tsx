"use client";

import { FormEvent, useEffect, useState } from "react";
import { Edit3, Loader2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { StatusCallout } from "@/components/ui/status-callout";
import { supabase } from "@/lib/supabase";
import type { Category, LibraryDocument } from "@/lib/types";
import { findBlockedTag, findBlockedWordInText, parseTags, tagsToInput, TAG_MAX_CHARS, TAG_MAX_COUNT } from "@/lib/utils";

type Props = { categories: Category[]; document: LibraryDocument | null; onClose: () => void; onSaved: (u: LibraryDocument) => void; };

export function EditDocumentDialog({ categories, document, onClose, onSaved }: Props) {
  const [title, setTitle]     = useState("");
  const [desc, setDesc]         = useState("");
  const [descError, setDescError] = useState<string | null>(null);
  const [catId, setCatId]     = useState("");
  const [tags, setTags]       = useState("");
  const [tagError, setTagError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!document) return;
    setTitle(document.title);
    setDesc(document.description ?? "");
    setCatId(document.category_id ?? "");
    setTags(tagsToInput(document.tags));
    setError(null);
  }, [document]);

  useEffect(() => {
    if (!document) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !loading) onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [document, loading, onClose]);

  if (!document) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!document || !title.trim()) { setError("O título é obrigatório."); return; }
    const blocked = findBlockedTag(tags);
    if (blocked) { setTagError(`A tag "${blocked}" contém linguagem inapropriada e não pode ser usada.`); return; }
    const blockedDesc = findBlockedWordInText(desc);
    if (blockedDesc) { setDescError(`A descrição contém linguagem inapropriada: "${blockedDesc}".`); return; }
    setError(null);
    setLoading(true);

    const parsed = parseTags(tags);
    const cat = catId || null;
    const { error: err } = await supabase.from("documents")
      .update({ title: title.trim(), description: desc.trim() || null, category_id: cat, tags: parsed })
      .eq("id", document.id);

    setLoading(false);
    if (err) { setError(err.message); return; }

    const updatedCat = cat ? (categories.find(c => c.id === cat) ?? null) : null;
    onSaved({ ...document, title: title.trim(), description: desc.trim() || null, category_id: cat, category: updatedCat, tags: parsed, updated_at: new Date().toISOString() });
  }

  function handleDescChange(val: string) {
    setDesc(val);
    const blocked = findBlockedWordInText(val);
    setDescError(blocked ? `Linguagem inapropriada detectada: "${blocked}".` : null);
  }

  function handleTagsChange(val: string) {
    setTags(val);
    setTagError(null);
    const blocked = findBlockedTag(val);
    if (blocked) {
      setTagError(`A tag "${blocked}" contém linguagem inapropriada.`);
    } else {
      const tooLong = val.split(",").map(t => t.trim()).find(t => t.length > TAG_MAX_CHARS);
      if (tooLong) setTagError(`A tag "${tooLong.slice(0, 20)}…" excede o limite de ${TAG_MAX_CHARS} caracteres.`);
    }
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
              <Edit3 size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--fg)]">Editar metadados</h2>
              <p className="mono truncate max-w-sm text-xs text-[var(--fg-2)]">{document.file_name}</p>
            </div>
          </div>
          <button disabled={loading} onClick={onClose} className="focus-ring grid h-8 w-8 place-items-center rounded-md text-[var(--fg-3)] hover:bg-[var(--bg-3)] hover:text-[var(--fg)] transition-colors disabled:opacity-40">
            <X size={18} />
          </button>
        </div>

        <form className="space-y-5 p-6" onSubmit={handleSubmit}>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Título" required>
              <Input value={title} onChange={e => setTitle(e.target.value)} required />
            </Field>
            <Field label="Categoria">
              <Select value={catId} onChange={e => setCatId(e.target.value)}>
                <option value="">Sem categoria</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
          </div>

          <Field label="Descrição">
            <Textarea
              value={desc}
              onChange={e => handleDescChange(e.target.value)}
              className={descError ? "border-[var(--red)] focus:border-[var(--red)]" : ""}
            />
            {descError && <p className="mono text-[11px] font-medium text-[var(--red)] mt-1">{descError}</p>}
          </Field>

          <Field label="Tags" hint="Separadas por vírgulas.">
            <Input
              value={tags}
              onChange={e => handleTagsChange(e.target.value)}
              placeholder="redes, exercicios, revisao"
              className={tagError ? "border-[var(--red)] focus:border-[var(--red)]" : ""}
            />
            <div className="flex items-start justify-between gap-2 mt-1">
              {tagError ? (
                <p className="mono text-[11px] font-medium text-[var(--red)]">{tagError}</p>
              ) : (
                <p className="mono text-[11px] text-[var(--fg-3)]">
                  Cada tag: máx. {TAG_MAX_CHARS} chars · máx. {TAG_MAX_COUNT} tags
                </p>
              )}
              <p className="mono text-[11px] text-[var(--fg-3)] shrink-0">
                {parseTags(tags).length}/{TAG_MAX_COUNT}
              </p>
            </div>
          </Field>

          {error && <StatusCallout kind="error">{error}</StatusCallout>}

          <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-5">
            <Button disabled={loading} onClick={onClose} variant="ghost" size="md">Cancelar</Button>
            <Button disabled={loading || !!tagError || !!descError} type="submit" variant="primary" size="md">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {loading ? "A guardar…" : "Guardar alterações"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
