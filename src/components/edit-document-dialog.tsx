"use client";

import { FormEvent, useEffect, useState } from "react";
import { Edit3, Loader2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { StatusCallout } from "@/components/ui/status-callout";
import { supabase } from "@/lib/supabase";
import type { Category, LibraryDocument } from "@/lib/types";
import { parseTags, tagsToInput } from "@/lib/utils";

type Props = { categories: Category[]; document: LibraryDocument | null; onClose: () => void; onSaved: (u: LibraryDocument) => void; };

export function EditDocumentDialog({ categories, document, onClose, onSaved }: Props) {
  const [title, setTitle]     = useState("");
  const [desc, setDesc]       = useState("");
  const [catId, setCatId]     = useState("");
  const [tags, setTags]       = useState("");
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
            <Textarea value={desc} onChange={e => setDesc(e.target.value)} />
          </Field>

          <Field label="Tags" hint="Separadas por vírgulas.">
            <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="redes, exercicios, revisao" />
          </Field>

          {error && <StatusCallout kind="error">{error}</StatusCallout>}

          <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-5">
            <Button disabled={loading} onClick={onClose} variant="ghost" size="md">Cancelar</Button>
            <Button disabled={loading} type="submit" variant="primary" size="md">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {loading ? "A guardar…" : "Guardar alterações"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
