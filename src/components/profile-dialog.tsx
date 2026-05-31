"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Camera, Check, Loader2, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { StatusCallout } from "@/components/ui/status-callout";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";
import { cn, getInitials, safeFileName } from "@/lib/utils";

type Props = { session: Session; open: boolean; onClose: () => void; onUpdated: (p: Partial<Profile>) => void; };

export function ProfileDialog({ session, open, onClose, onUpdated }: Props) {
  const [fullName, setFullName]     = useState("");
  const [avatarUrl, setAvatarUrl]   = useState<string | null>(null);
  const [preview, setPreview]       = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading]       = useState(false);
  const [saved, setSaved]           = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const email = session.user.email ?? "";
  const initials = getInitials(email, fullName || session.user.user_metadata?.full_name);

  // Load current profile on open
  useEffect(() => {
    if (!open) return;
    setError(null); setSaved(false); setAvatarFile(null); setPreview(null);
    const meta = session.user.user_metadata;
    setFullName(meta?.full_name ?? "");
    setAvatarUrl(meta?.avatar_url ?? null);
  }, [open, session]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !loading) onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, loading, onClose]);

  if (!open) return null;

  function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError("A imagem não pode exceder 2 MB."); return; }
    setAvatarFile(file);
    setPreview(URL.createObjectURL(file));
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    let newAvatarUrl = avatarUrl;

    // Upload new avatar if selected
    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop() ?? "jpg";
      const path = `${session.user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("documents")
        .upload(path, avatarFile, { cacheControl: "3600", upsert: true, contentType: avatarFile.type });
      if (upErr) { setError(upErr.message); setLoading(false); return; }
      const { data } = supabase.storage.from("documents").getPublicUrl(path);
      newAvatarUrl = data.publicUrl;
    }

    // Update auth metadata
    const { error: metaErr } = await supabase.auth.updateUser({
      data: { full_name: fullName.trim(), avatar_url: newAvatarUrl }
    });
    if (metaErr) { setError(metaErr.message); setLoading(false); return; }

    // Update profiles table
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), avatar_url: newAvatarUrl })
      .eq("id", session.user.id);
    if (profileErr) { setError(profileErr.message); setLoading(false); return; }

    setLoading(false);
    setSaved(true);
    setAvatarUrl(newAvatarUrl);
    onUpdated({ full_name: fullName.trim(), avatar_url: newAvatarUrl });
    setTimeout(() => { setSaved(false); onClose(); }, 900);
  }

  const displaySrc = preview ?? avatarUrl;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 backdrop-blur-sm"
      role="dialog" aria-modal="true"
      onClick={(ev) => { if (ev.target === ev.currentTarget && !loading) onClose(); }}
    >
      <div className="anim-scale-in w-full max-w-sm rounded-lg border border-[#30363d] bg-[#161b22] shadow-2xl">
        <div className="h-px w-full rounded-t-lg bg-gradient-to-r from-transparent via-[#2f81f7]/40 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#21262d] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-6 w-6 place-items-center rounded border border-[#30363d] bg-[#0d1117] text-[#2f81f7]">
              <User size={13} />
            </div>
            <h2 className="text-sm font-semibold text-[#e6edf3]">Editar perfil</h2>
          </div>
          <button disabled={loading} onClick={onClose} className="focus-ring grid h-6 w-6 place-items-center rounded text-[#484f58] hover:text-[#8b949e] transition-colors">
            <X size={14} />
          </button>
        </div>

        <form className="p-4 space-y-4" onSubmit={handleSubmit}>
          {/* Avatar picker */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className={cn(
                "h-20 w-20 rounded-full border-2 border-[#30363d] overflow-hidden bg-gradient-to-br from-[#2f81f7] to-[#1f6feb]",
                "flex items-center justify-center text-white font-bold text-xl"
              )}>
                {displaySrc
                  ? <img src={displaySrc} alt="avatar" className="h-full w-full object-cover" />
                  : <span className="mono">{initials}</span>
                }
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border border-[#30363d] bg-[#161b22] text-[#8b949e] shadow-md transition-all hover:border-[#444c56] hover:bg-[#1c2128] hover:text-[#e6edf3] active:scale-95"
              >
                <Camera size={13} />
              </button>
              <input
                ref={fileRef}
                type="file"
                className="sr-only"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleAvatarChange}
              />
            </div>
            <p className="mono text-[10px] text-[#484f58]">JPG, PNG, WEBP · máx 2 MB</p>
          </div>

          <Field label="Nome de exibição">
            <Input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder={email.split("@")[0]}
            />
          </Field>

          <Field label="Email institucional">
            <Input value={email} disabled className="opacity-50 cursor-not-allowed" />
          </Field>

          {error && <StatusCallout kind="error">{error}</StatusCallout>}

          <div className="flex items-center justify-end gap-2 border-t border-[#21262d] pt-3">
            <Button disabled={loading} onClick={onClose} variant="ghost" size="sm">Cancelar</Button>
            <Button disabled={loading || saved} type="submit" variant="primary" size="sm">
              {loading ? <Loader2 size={12} className="animate-spin" />
               : saved  ? <Check size={12} />
               : <User size={12} />}
              {loading ? "A guardar…" : saved ? "Guardado!" : "Guardar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
