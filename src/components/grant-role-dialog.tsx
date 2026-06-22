"use client";

import { FormEvent, useEffect, useState } from "react";
import { Loader2, Mail, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { StatusCallout } from "@/components/ui/status-callout";
import { grantRole, ROLE_LABELS } from "@/lib/admin";
import type { Role } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called after a successful grant (parent should refetch). */
  onGranted: (email: string, role: Role) => void;
  /** Pre-fill the email field, e.g. when granting from a specific user row. */
  initialEmail?: string;
  initialRole?: Role;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function GrantRoleDialog({ open, onClose, onGranted, initialEmail, initialRole }: Props) {
  const [email, setEmail]   = useState("");
  const [role, setRole]     = useState<Role>("teacher");
  const [emailError, setErr] = useState<string | null>(null);
  const [loading, setLoad]  = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [success, setOk]    = useState(false);

  // Reset / pre-fill on open
  useEffect(() => {
    if (!open) return;
    setEmail((initialEmail ?? "").trim().toLowerCase());
    setRole(initialRole ?? "teacher");
    setErr(null);
    setError(null);
    setOk(false);
  }, [open, initialEmail, initialRole]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !loading) onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, loading, onClose]);

  if (!open) return null;

  function validate(value: string): string | null {
    if (!value.trim()) return "Indica um email.";
    if (!EMAIL_RE.test(value.trim())) return "Email inválido.";
    return null;
  }

  function handleEmailChange(value: string) {
    const v = value.trim().toLowerCase();
    setEmail(v);
    setErr(v ? validate(v) : null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const v = email.trim().toLowerCase();
    const err = validate(v);
    if (err) { setErr(err); return; }
    setError(null);
    setLoad(true);
    try {
      await grantRole(v, role);
      setOk(true);
      setTimeout(() => {
        onGranted(v, role);
        onClose();
      }, 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao conceder acesso.");
    } finally {
      setLoad(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/70 px-4 py-8 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
    >
      <div className="anim-scale-in w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--bg-2)] shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--accent)]">
              <UserPlus size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--fg)]">Conceder acesso</h2>
              <p className="mono text-xs text-[var(--fg-2)]">atribuir papel a um email</p>
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

          {/* Email */}
          <Field label="Email" required hint="@gmail.com ou @etap.pt. O acesso fica disponível após registo.">
            <div className="relative">
              <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--fg-3)]" />
              <Input
                className={`pl-10 ${emailError ? "border-[var(--red)] focus:border-[var(--red)]" : ""}`}
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="colega@gmail.com"
                autoFocus
                disabled={loading || !!initialEmail}
              />
            </div>
            {emailError && <p className="mono text-[11px] font-medium text-[var(--red)]">{emailError}</p>}
          </Field>

          {/* Role */}
          <Field label="Papel" required>
            <Select value={role} onChange={(e) => setRole(e.target.value as Role)} disabled={loading}>
              {(["member", "teacher", "admin"] as Role[]).map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </Select>
            <p className="text-xs text-[var(--fg-2)]">{roleDescription(role)}</p>
          </Field>

          {/* Permissions preview */}
          <div className="rounded-md border border-[var(--border)] bg-[var(--bg)] px-4 py-3">
            <p className="mono text-[10px] font-semibold uppercase tracking-widest text-[var(--fg-3)] mb-2">este papel permite</p>
            <ul className="space-y-1.5">
              {permissionList(role).map((p) => (
                <li key={p} className="flex items-center gap-2 text-xs text-[var(--fg-2)]">
                  <span className="h-1 w-1 rounded-full bg-[var(--green)]" />
                  {p}
                </li>
              ))}
            </ul>
          </div>

          {error && <StatusCallout kind="error">{error}</StatusCallout>}
          {success && <StatusCallout kind="success">Acesso concedido a {email}!</StatusCallout>}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] pt-6">
            <Button disabled={loading} onClick={onClose} variant="ghost" size="md">Cancelar</Button>
            <Button disabled={loading || success || !!emailError || !email.trim()} type="submit" variant="primary" size="md">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
              {loading ? "A conceder…" : "Conceder acesso"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function roleDescription(role: Role): string {
  switch (role) {
    case "member":  return "Pode enviar e gerir os seus próprios materiais.";
    case "teacher": return "Pode gerir materiais de qualquer membro e conceder acessos.";
    case "admin":   return "Acesso total: gere todos os materiais e utilizadores.";
  }
}

function permissionList(role: Role): string[] {
  const base = ["Consultar todos os materiais", "Enviar e gerir os próprios ficheiros"];
  if (role === "member") return base;
  const staff = [...base, "Gerir materiais de outros membros", "Conceder acessos (membro/professor/admin)"];
  if (role === "teacher") return staff;
  return [...staff, "Gerir materiais de professores e admins", "Painel de administração completo"];
}
