"use client";

import { FormEvent, useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, LockKeyhole, Mail, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { StatusCallout } from "@/components/ui/status-callout";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";

export type AuthMode = "login" | "register";

function isEtapEmail(email: string) {
  return email.trim().toLowerCase().endsWith("@etap.pt");
}

function authErrorMessage(message: string, t: ReturnType<typeof useLanguage>["t"]) {
  if (message === "Database error saving new user")
    return t("authDialogTriggerError");
  if (message.toLowerCase().includes("email not confirmed"))
    return t("authDialogConfirmEmailNotice");
  if (message.toLowerCase().includes("invalid login credentials"))
    return t("authDialogInvalidCredentials");
  return message;
}

export function AuthDialog({ mode, onClose, onModeChange }: { mode: AuthMode | null; onClose: () => void; onModeChange: (m: AuthMode) => void }) {
  const { t } = useLanguage();
  const [email, setEmail]           = useState("");
  const [fullName, setFullName]     = useState("");
  const [password, setPassword]     = useState("");
  const [showPw, setShowPw]         = useState(false);
  const [loading, setLoading]       = useState(false);
  const [message, setMessage]       = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    if (!mode) return;
    setError(null); setMessage(null); setPassword(""); setShowPw(false);
  }, [mode]);

  useEffect(() => {
    if (!mode) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !loading) onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [mode, loading, onClose]);

  if (!mode) return null;
  const isReg = mode === "register";

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null); setMessage(null);
    const norm = email.trim().toLowerCase();
    if (!isEtapEmail(norm)) { setError(t("authDialogEmailError")); return; }
    if (password.length < 8) { setError(t("authDialogPasswordError")); return; }
    setLoading(true);

    if (isReg) {
      const { error: signUpErr } = await supabase.auth.signUp({
        email: norm, password,
        options: { data: { full_name: fullName.trim() || norm.split("@")[0] }, emailRedirectTo: `${window.location.origin}/auth/callback` }
      });
      setLoading(false);
      if (signUpErr) { setError(authErrorMessage(signUpErr.message, t)); return; }
      setMessage(t("authDialogAccountCreatedSuccess"));
      setPassword("");
      return;
    }

    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: norm, password });
    setLoading(false);
    if (signInErr) { setError(authErrorMessage(signInErr.message, t)); return; }
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 backdrop-blur-sm"
      role="dialog" aria-modal="true"
      onClick={(ev) => { if (ev.target === ev.currentTarget && !loading) onClose(); }}
    >
      <div className="anim-scale-in w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--bg-2)] shadow-2xl">

        {/* Top accent line */}
        <div className="h-px w-full rounded-t-lg bg-gradient-to-r from-transparent via-[var(--accent)]/50 to-transparent" />

        {/* Header */}
        <div className="flex items-start justify-between border-b border-[var(--bg-4)] px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 grid h-8 w-8 place-items-center rounded border border-[var(--border)] bg-[var(--bg)] text-[var(--accent)]">
              <LockKeyhole size={15} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--fg)]">
                {isReg ? t("authDialogCreateAccount") : t("authPanelLoginBtn")}
              </h2>
              <p className="mt-0.5 text-xs text-[var(--fg-2)]">
                {isReg ? t("authDialogRegisterDesc") : t("authDialogLoginDesc")}
              </p>
            </div>
          </div>
          <button disabled={loading} onClick={onClose} className="focus-ring grid h-6 w-6 place-items-center rounded text-[var(--fg-3)] hover:text-[var(--fg-2)] transition-colors disabled:opacity-40">
            <X size={14} />
          </button>
        </div>

        <form className="space-y-3 p-5" onSubmit={handleSubmit}>
          {isReg && (
            <Field label={t("authDialogFieldName")}>
              <div className="relative">
                <UserRound size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-3)]" />
                <Input className="pl-8" autoComplete="name" placeholder={t("authDialogFieldNamePlaceholder")} value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>
            </Field>
          )}

          <Field label={t("authDialogFieldEmail")}>
            <div className="relative">
              <Mail size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-3)]" />
              <Input className="pl-8" autoComplete="email" inputMode="email" type="email" placeholder="nome@etap.pt" required value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </Field>

          <Field label={t("authDialogFieldPassword")} hint={t("authDialogFieldPasswordHint")}>
            <div className="relative">
              <LockKeyhole size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-3)]" />
              <Input
                className="pl-8 pr-9"
                autoComplete={isReg ? "new-password" : "current-password"}
                placeholder="••••••••"
                required
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="focus-ring absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-[var(--fg-3)] hover:text-[var(--fg-2)] transition-colors"
                aria-label={showPw ? t("authDialogHide") : t("authDialogShow")}
              >
                {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </Field>

          {error && <StatusCallout kind="error">{error}</StatusCallout>}
          {message && <StatusCallout kind="success">{message}</StatusCallout>}

          <Button disabled={loading} type="submit" variant="primary" size="md" className="w-full">
            {loading && <Loader2 size={13} className="animate-spin" />}
            {loading ? (isReg ? t("authDialogCreatingAccountText") : t("authDialogSigningInText")) : (isReg ? t("authPanelRegisterBtn") : t("authPanelLoginBtn"))}
          </Button>
        </form>

        <div className="border-t border-[var(--bg-4)] px-5 py-3 text-center">
          <span className="text-xs text-[var(--fg-3)]">{isReg ? t("authDialogAlreadyHaveAccount") : t("authDialogDontHaveAccount")} </span>
          <button
            onClick={() => onModeChange(isReg ? "login" : "register")}
            className="focus-ring mono rounded text-xs text-[var(--accent)] hover:underline"
          >
            {isReg ? t("authPanelLoginBtn") : t("authPanelRegisterBtn")}
          </button>
        </div>
      </div>
    </div>
  );
}
