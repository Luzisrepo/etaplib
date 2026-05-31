"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Camera, Loader2, Save, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { StatusCallout } from "@/components/ui/status-callout";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";
import { getInitials } from "@/lib/utils";

const MAX_AVATAR = 2 * 1024 * 1024; // 2 MB
const ACCEPTED = "image/png,image/jpeg,image/gif,image/webp";

type Props = {
  open: boolean;
  onClose: () => void;
  profile: Profile;
  onSaved: (p: Profile) => void;
};

export function ProfileEditorDialog({ open, onClose, profile, onSaved }: Props) {
  const [fullName, setFullName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setFullName(profile.full_name ?? "");
    setAvatarFile(null);
    setAvatarPreview(null);
    setError(null);
    setSuccess(false);
  }, [open, profile]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !loading) onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, loading, onClose]);

  if (!open) return null;

  function handleFileChange(f: File | null) {
    if (!f) return;
    if (f.size > MAX_AVATAR) {
      setError("A imagem não pode exceder 2 MB.");
      return;
    }
    if (!f.type.startsWith("image/")) {
      setError("Ficheiro inválido. Usa PNG, JPEG, GIF ou WebP.");
      return;
    }
    setError(null);
    setAvatarFile(f);
    const url = URL.createObjectURL(f);
    setAvatarPreview(url);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    let newAvatarUrl = profile.avatar_url;

    // Upload avatar if changed
    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${profile.id}/avatar-${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("documents")
        .upload(path, avatarFile, {
          cacheControl: "3600",
          contentType: avatarFile.type,
          upsert: true,
        });

      if (uploadErr) {
        setLoading(false);
        setError(uploadErr.message);
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("documents")
        .getPublicUrl(path);

      newAvatarUrl = urlData.publicUrl;
    }

    // Update profile
    const updates: { full_name: string; avatar_url?: string | null } = {
      full_name: fullName.trim() || profile.email.split("@")[0],
    };
    if (newAvatarUrl !== profile.avatar_url) {
      updates.avatar_url = newAvatarUrl;
    }

    const { error: updateErr } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", profile.id);

    if (updateErr) {
      setLoading(false);
      setError(updateErr.message);
      return;
    }

    // Also update auth metadata so sidebar shows new name immediately
    await supabase.auth.updateUser({
      data: { full_name: updates.full_name },
    });

    setLoading(false);
    setSuccess(true);

    const updatedProfile: Profile = {
      ...profile,
      full_name: updates.full_name,
      avatar_url: newAvatarUrl,
      updated_at: new Date().toISOString(),
    };

    setTimeout(() => {
      onSaved(updatedProfile);
      onClose();
    }, 600);
  }

  const initials = getInitials(profile.email, profile.full_name);
  const displayAvatar = avatarPreview || profile.avatar_url;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
    >
      <div className="anim-scale-in w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--bg-2)] shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--accent)]">
              <User size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--fg)]">Editar perfil</h2>
              <p className="mono text-xs text-[var(--fg-2)]">{profile.email}</p>
            </div>
          </div>
          <button
            disabled={loading}
            onClick={onClose}
            className="focus-ring grid h-8 w-8 place-items-center rounded-md text-[var(--fg-3)] hover:bg-[var(--bg-3)] hover:text-[var(--fg)] transition-colors disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        <form className="space-y-6 p-6" onSubmit={handleSubmit}>

          {/* Avatar section */}
          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={loading}
              className="group relative focus-ring rounded-full"
            >
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt="Avatar"
                  className="h-28 w-28 rounded-full object-cover border-4 border-[var(--border)] transition-all group-hover:border-[var(--border-2)]"
                />
              ) : (
                <div className="grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] border-4 border-[var(--border)]">
                  <span className="mono text-3xl font-bold text-white">{initials}</span>
                </div>
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 grid place-items-center rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={24} className="text-white" />
              </div>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED}
              className="sr-only"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={loading}
              className="mono text-xs font-medium text-[var(--accent)] hover:underline transition-colors disabled:opacity-40"
            >
              {displayAvatar ? "trocar imagem" : "adicionar imagem"}
            </button>
          </div>

          {/* Display name */}
          <Field label="Nome de exibição">
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="O teu nome"
              disabled={loading}
            />
          </Field>

          {/* Role badge (read-only) */}
          <div className="flex items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--bg)] px-4 py-3">
            <span className="mono text-xs text-[var(--fg-2)]">Cargo:</span>
            <span className="mono text-xs font-bold text-[var(--fg)] uppercase">{profile.role}</span>
          </div>

          {error && <StatusCallout kind="error">{error}</StatusCallout>}
          {success && <StatusCallout kind="success">Perfil atualizado!</StatusCallout>}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-6">
            <Button disabled={loading} onClick={onClose} variant="ghost" size="md">Cancelar</Button>
            <Button disabled={loading || success} type="submit" variant="primary" size="md">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {loading ? "A guardar…" : "Guardar alterações"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
