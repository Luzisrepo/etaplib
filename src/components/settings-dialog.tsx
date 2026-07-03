"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  AtSign, BookOpen, Check, ChevronLeft, Download, Eye, EyeOff,
  FlaskConical, Gauge, Globe, Key, Laptop, Layout, Lock, LogIn, Monitor, Palette,
  Pencil, Plus, RotateCcw, Save, Shield, Sparkles, Star, Trash2,
  User, X, Smartphone,
} from "lucide-react";
import {
  ACCENT_PRESETS, DEFAULT_ACCESSIBILITY, applySettings, type AppSettings,
  DEFAULT_SETTINGS, FONT_SIZES, FONTS, loadSettings, saveSettings,
  THEMES, themeCategory, TIMEZONES, type AccessibilitySettings,
  type EffectSettings, type FontId, type FontSize, type DateFormat,
  type LayoutDensity, type ParticleDensity, type ThemeDef, type ThemeId,
  type TimeFormat,
} from "@/lib/settings";
import {
  buildAccountExport, cancelAccountDeletion, changeEmail, changePassword,
  createReadingList, createSavedSearch, deleteReadingList, deleteSavedSearch,
  describeUserAgent, downloadJson, getDeviceId, listLoginHistory,
  listReadingLists, listSavedSearches, listSessions, removeSession,
  requestAccountDeletion, resendVerificationEmail, saveProfileBasics,
  updateFavoriteCategories, updateProfileVisibility, updateShowReadingHistory,
} from "@/lib/account";
import { clearReadingHistory, clearSearchHistory } from "@/lib/history";
import { cn, formatDateTime } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import type { TranslationKey } from "@/lib/translations";
import type {
  Category, LoginHistoryEntry, Profile, ReadingList, SavedSearch, UserSession,
} from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SettingsSection =
  | "profile" | "account" | "appearance" | "privacy"
  | "library" | "security" | "language";

type Props = {
  open: boolean;
  onClose: () => void;
  profile: Profile | null;
  session: Session | null;
  categories: Category[];
  initialSection?: SettingsSection;
  onProfileSaved: (p: Profile) => void;
};

const MAX_AVATAR = 2 * 1024 * 1024;

// ── Main dialog ───────────────────────────────────────────────────────────────

export function SettingsDialog({
  open, onClose, profile, session, categories, initialSection, onProfileSaved,
}: Props) {
  const { t, setLanguage } = useLanguage();
  const [section, setSection]   = useState<SettingsSection>(initialSection ?? "profile");
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  // Local profile copy — updated optimistically when a section saves
  const [localProfile, setLocalProfile] = useState<Profile | null>(profile);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setSettings(loadSettings());
      setLocalProfile(profile);
      if (initialSection) setSection(initialSection);
    }
  }, [open, profile, initialSection]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  function applyAndSave(next: AppSettings) {
    setSettings(next);
    applySettings(next);
    saveSettings(next);
    window.dispatchEvent(new Event("etap-settings-changed"));
  }

  function handleSectionChange(s: SettingsSection) {
    setSection(s);
    contentRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }

  function handleProfileSaved(p: Profile) {
    setLocalProfile(p);
    onProfileSaved(p);
  }

  const NAV: { id: SettingsSection; label: string; icon: React.ReactNode }[] = [
    { id: "profile",    label: t("settingsNavProfile"),    icon: <User size={16} /> },
    { id: "account",    label: t("settingsNavAccount"),    icon: <AtSign size={16} /> },
    { id: "appearance", label: t("settingsNavAppearance"), icon: <Palette size={16} /> },
    { id: "privacy",    label: t("settingsNavPrivacy"),    icon: <Eye size={16} /> },
    { id: "library",    label: t("settingsNavLibrary"),    icon: <BookOpen size={16} /> },
    { id: "security",   label: t("settingsNavSecurity"),   icon: <Shield size={16} /> },
    { id: "language",   label: t("settingsNavLanguage"),   icon: <Globe size={16} /> },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm"
      role="dialog" aria-modal="true" aria-label={t("settingsTitle")}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="anim-scale-in flex h-[88vh] w-full max-w-[900px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-2)] shadow-2xl">

        {/* ── Left sidebar ── */}
        <aside className="flex w-56 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg)]">
          {/* Sidebar header */}
          <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-4">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[var(--border)] bg-[var(--bg-2)] text-[var(--accent)]">
              <Monitor size={14} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--fg)] mono truncate">
                {t("settingsTitle")}
              </p>
              <p className="text-[10px] text-[var(--fg-3)] mono truncate">{t("settingsSubtitle")}</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto space-y-0.5 p-2">
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSectionChange(item.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors focus-ring",
                  section === item.id
                    ? "bg-[var(--accent-bg)] text-[var(--accent)]"
                    : "text-[var(--fg-2)] hover:bg-[var(--bg-2)] hover:text-[var(--fg)]"
                )}
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Close */}
          <div className="border-t border-[var(--border)] p-3">
            <button
              onClick={onClose}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-[var(--fg-2)] transition-colors hover:bg-[var(--bg-2)] hover:text-[var(--fg)] focus-ring"
            >
              <ChevronLeft size={15} />
              {t("close")}
            </button>
          </div>
        </aside>

        {/* ── Right content ── */}
        <main ref={contentRef} className="flex-1 overflow-y-auto" tabIndex={-1}>
          {localProfile && section === "profile" && (
            <ProfileSection profile={localProfile} onSaved={handleProfileSaved} t={t} />
          )}
          {localProfile && session && section === "account" && (
            <AccountSection profile={localProfile} session={session} onUpdated={handleProfileSaved} t={t} />
          )}
          {section === "appearance" && (
            <AppearanceSection settings={settings} onApply={applyAndSave} t={t} />
          )}
          {localProfile && section === "privacy" && (
            <PrivacySection profile={localProfile} onUpdated={handleProfileSaved} t={t} />
          )}
          {localProfile && section === "library" && (
            <LibrarySection profile={localProfile} categories={categories} onUpdated={handleProfileSaved} t={t} />
          )}
          {localProfile && section === "security" && (
            <SecuritySection profile={localProfile} t={t} />
          )}
          {section === "language" && (
            <LanguageSection
              settings={settings}
              onApply={(next) => { applyAndSave(next); setLanguage(next.language); }}
              t={t}
            />
          )}
        </main>
      </div>
    </div>
  );
}

// ── Shared layout primitives ──────────────────────────────────────────────────

function SectionHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-8 border-b border-[var(--border)] pb-6">
      <h2 className="text-xl font-bold text-[var(--fg)]">{title}</h2>
      <p className="mt-1 text-sm text-[var(--fg-2)]">{desc}</p>
    </div>
  );
}

function DividerLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <span className="mono text-[10px] font-bold uppercase tracking-widest text-[var(--fg-3)]">{label}</span>
      <div className="h-px flex-1 bg-[var(--border)]" />
    </div>
  );
}

function SaveBanner({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[var(--green)]/40 bg-[var(--green-bg)] px-4 py-2.5 text-sm font-medium text-[var(--green)]">
      <Check size={14} /> {msg}
    </div>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div className="rounded-lg border border-[var(--red)]/40 bg-[var(--red-bg)] px-4 py-2.5 text-sm text-[var(--red)]">
      {msg}
    </div>
  );
}

function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="mb-1.5">
      <label className="block text-sm font-semibold text-[var(--fg)]">{label}</label>
      {hint && <p className="mono text-[11px] text-[var(--fg-2)]">{hint}</p>}
    </div>
  );
}

function StyledInput({
  value, onChange, placeholder, type = "text", disabled, maxLength,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; disabled?: boolean; maxLength?: number;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
      className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--fg)] placeholder:text-[var(--fg-3)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-50 transition-colors"
    />
  );
}

function StyledTextarea({
  value, onChange, placeholder, maxLength, rows = 3,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  maxLength?: number; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      rows={rows}
      className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--fg)] placeholder:text-[var(--fg-3)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-colors"
    />
  );
}

function PrimaryBtn({
  children, onClick, loading, disabled, danger = false,
}: {
  children: React.ReactNode; onClick?: () => void;
  loading?: boolean; disabled?: boolean; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all active:scale-95 focus-ring disabled:opacity-50 disabled:cursor-not-allowed",
        danger
          ? "border border-[var(--red)]/40 bg-[var(--red-bg)] text-[var(--red)] hover:bg-[var(--red)]/20"
          : "border border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent)] hover:opacity-80"
      )}
    >
      {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}

function GhostBtn({
  children, onClick, disabled,
}: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-sm font-medium text-[var(--fg-2)] transition-all hover:border-[var(--border-2)] hover:text-[var(--fg)] active:scale-95 focus-ring disabled:opacity-50"
    >
      {children}
    </button>
  );
}

// ── Profile section ───────────────────────────────────────────────────────────

function ProfileSection({
  profile, onSaved, t,
}: {
  profile: Profile;
  onSaved: (p: Profile) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}) {
  const [fullName,      setFullName]      = useState(profile.full_name ?? "");
  const [bio,           setBio]           = useState(profile.bio ?? "");
  const [course,        setCourse]        = useState(profile.course ?? "");
  const [academicYear,  setAcademicYear]  = useState(profile.academic_year ?? "");
  const [classGroup,    setClassGroup]    = useState(profile.class_group ?? "");
  const [avatarFile,    setAvatarFile]    = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [saved,         setSaved]         = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(f: File | null) {
    if (!f) return;
    if (f.size > MAX_AVATAR) { setError("Imagem demasiado grande (máx. 2 MB)."); return; }
    if (!f.type.startsWith("image/")) { setError("Formato inválido. Usa PNG, JPG ou WEBP."); return; }
    setError(null);
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError(null); setSaved(false); setLoading(true);
    try {
      const updated = await saveProfileBasics(profile, {
        fullName, bio, course, academicYear, classGroup, avatarFile,
      });
      setSaved(true);
      onSaved(updated);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao guardar.");
    } finally {
      setLoading(false);
    }
  }

  const displayAvatar = avatarPreview || profile.avatar_url;
  const initials = (fullName || profile.email).trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  const roleColor = profile.role === "admin" ? "var(--red)" : profile.role === "teacher" ? "var(--purple)" : "var(--accent)";

  return (
    <div className="p-8">
      <SectionHeader title={t("settingsProfileTitle")} desc={t("settingsProfileDesc")} />

      {error  && <div className="mb-4"><ErrorBanner msg={error} /></div>}
      {saved  && <div className="mb-4"><SaveBanner  msg={t("settingsProfileSaved")} /></div>}

      <div className="grid gap-8 lg:grid-cols-[1fr_220px]">
        {/* Left: form */}
        <form id="profile-form" onSubmit={handleSave} className="space-y-5">
          {/* Display name */}
          <div>
            <FieldLabel label={t("settingsProfileDisplayName")} />
            <StyledInput
              value={fullName}
              onChange={setFullName}
              placeholder={t("settingsProfileDisplayNamePlaceholder")}
              maxLength={80}
            />
          </div>

          {/* Bio */}
          <div>
            <FieldLabel
              label={t("settingsProfileBio")}
              hint={`${bio.length}/280`}
            />
            <StyledTextarea
              value={bio}
              onChange={setBio}
              placeholder={t("settingsProfileBioPlaceholder")}
              maxLength={280}
              rows={3}
            />
          </div>

          <DividerLabel label={t("settingsProfileStudentInfo")} />

          {/* Course */}
          <div>
            <FieldLabel label={t("settingsProfileCourse")} />
            <StyledInput
              value={course}
              onChange={setCourse}
              placeholder={t("settingsProfileCoursePlaceholder")}
              maxLength={120}
            />
          </div>

          {/* Year + Class */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel label={t("settingsProfileYear")} />
              <StyledInput
                value={academicYear}
                onChange={setAcademicYear}
                placeholder={t("settingsProfileYearPlaceholder")}
                maxLength={40}
              />
            </div>
            <div>
              <FieldLabel label={t("settingsProfileClass")} />
              <StyledInput
                value={classGroup}
                onChange={setClassGroup}
                placeholder={t("settingsProfileClassPlaceholder")}
                maxLength={40}
              />
            </div>
          </div>

          {/* Save button */}
          <div className="pt-2">
            <PrimaryBtn loading={loading}>
              <Save size={14} /> {t("settingsProfileSave")}
            </PrimaryBtn>
          </div>
        </form>

        {/* Right: avatar + preview */}
        <div className="space-y-6">
          {/* Avatar upload */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-2)] mono">
              {t("settingsProfileAvatar")}
            </p>
            <div className="flex flex-col items-center gap-3">
              {/* Avatar circle */}
              <div className="relative h-20 w-20">
                {displayAvatar ? (
                  <img
                    src={displayAvatar}
                    alt={fullName || "Avatar"}
                    className="h-20 w-20 rounded-full object-cover border-2 border-[var(--border)]"
                  />
                ) : (
                  <div
                    className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[var(--border)] text-xl font-bold"
                    style={{ background: "var(--accent-bg)", color: "var(--accent)" }}
                  >
                    {initials}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 hover:opacity-100 transition-opacity"
                >
                  <Pencil size={18} className="text-white" />
                </button>
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              />

              <div className="flex gap-2">
                <GhostBtn onClick={() => fileRef.current?.click()}>
                  <Pencil size={13} /> {t("settingsProfileAvatarChange")}
                </GhostBtn>
              </div>
              <p className="mono text-[10px] text-center text-[var(--fg-3)]">
                {t("settingsProfileAvatarHint")}
              </p>
            </div>
          </div>

          {/* Profile preview */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--fg-2)] mono">
              {t("settingsProfilePreviewTitle")}
            </p>
            <div className="flex items-start gap-3">
              {displayAvatar ? (
                <img src={displayAvatar} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover border border-[var(--border)]" />
              ) : (
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                  style={{ background: "var(--accent-bg)", color: "var(--accent)" }}
                >
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-[var(--fg)] truncate">
                    {fullName || profile.email.split("@")[0]}
                  </p>
                  <span
                    className="mono shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    style={{ color: roleColor, background: `${roleColor}25` }}
                  >
                    {profile.role}
                  </span>
                </div>
                {bio && <p className="mt-0.5 text-[11px] text-[var(--fg-2)] leading-snug line-clamp-2">{bio}</p>}
                {course && (
                  <p className="mt-1 mono text-[10px] text-[var(--fg-3)] truncate">
                    {[course, classGroup, academicYear].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Account section ───────────────────────────────────────────────────────────

function AccountSection({
  profile, session, onUpdated, t,
}: {
  profile: Profile; session: Session; onUpdated: (p: Profile) => void; t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}) {
  const isVerified = session.user.email_confirmed_at != null;

  // Email change
  const [newEmail,        setNewEmail]        = useState("");
  const [emailLoading,    setEmailLoading]    = useState(false);
  const [emailMsg,        setEmailMsg]        = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Password change
  const [currentPw,       setCurrentPw]       = useState("");
  const [newPw,           setNewPw]           = useState("");
  const [confirmPw,       setConfirmPw]       = useState("");
  const [showPw,          setShowPw]          = useState(false);
  const [pwLoading,       setPwLoading]       = useState(false);
  const [pwMsg,           setPwMsg]           = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Verification
  const [verifSent,       setVerifSent]       = useState(false);
  const [verifLoading,    setVerifLoading]    = useState(false);

  // Export
  const [exportLoading,   setExportLoading]   = useState(false);

  // Deletion
  const [deletePhase,     setDeletePhase]     = useState<"idle" | "confirm">("idle");
  const [deleteLoading,   setDeleteLoading]   = useState(false);
  const [deleteMsg,       setDeleteMsg]       = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function handleEmailChange(e: FormEvent) {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setEmailLoading(true); setEmailMsg(null);
    try {
      await changeEmail(newEmail);
      setEmailMsg({ kind: "ok", text: t("settingsAccountEmailChanged") });
      setNewEmail("");
    } catch (err) {
      setEmailMsg({ kind: "err", text: err instanceof Error ? err.message : t("error") });
    } finally { setEmailLoading(false); }
  }

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) { setPwMsg({ kind: "err", text: t("settingsAccountPasswordMismatch") }); return; }
    if (newPw.length < 8) { setPwMsg({ kind: "err", text: t("settingsAccountPasswordTooShort") }); return; }
    setPwLoading(true); setPwMsg(null);
    try {
      await changePassword(profile.email, currentPw, newPw);
      setPwMsg({ kind: "ok", text: t("settingsAccountPasswordChanged") });
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err) {
      setPwMsg({ kind: "err", text: err instanceof Error ? err.message : t("error") });
    } finally { setPwLoading(false); }
  }

  async function handleResendVerif() {
    setVerifLoading(true);
    try { await resendVerificationEmail(profile.email); setVerifSent(true); }
    catch { /* ignore */ } finally { setVerifLoading(false); }
  }

  async function handleExport() {
    setExportLoading(true);
    try {
      const data = await buildAccountExport(profile);
      downloadJson(data, `etap-export-${new Date().toISOString().slice(0, 10)}.json`);
    } catch { /* ignore */ } finally { setExportLoading(false); }
  }

  async function handleDeleteRequest() {
    setDeleteLoading(true); setDeleteMsg(null);
    try {
      await requestAccountDeletion(profile.id);
      setDeleteMsg({ kind: "ok", text: t("settingsAccountDeleteRequested") });
      onUpdated({ ...profile, deletion_requested_at: new Date().toISOString() });
      setDeletePhase("idle");
    } catch (err) {
      setDeleteMsg({ kind: "err", text: err instanceof Error ? err.message : t("error") });
    } finally { setDeleteLoading(false); }
  }

  async function handleCancelDeletion() {
    setDeleteLoading(true); setDeleteMsg(null);
    try {
      await cancelAccountDeletion(profile.id);
      setDeleteMsg({ kind: "ok", text: t("settingsAccountDeleteCancelled") });
      onUpdated({ ...profile, deletion_requested_at: null });
    } catch (err) {
      setDeleteMsg({ kind: "err", text: err instanceof Error ? err.message : t("error") });
    } finally { setDeleteLoading(false); }
  }

  return (
    <div className="p-8 space-y-8 max-w-xl">
      <SectionHeader title={t("settingsAccountTitle")} desc={t("settingsAccountDesc")} />

      {/* Email */}
      <div>
        <DividerLabel label={t("settingsAccountEmail")} />
        <p className="mb-3 mono text-[11px] text-[var(--fg-2)]">
          {t("settingsAccountEmailCurrent")}: <span className="text-[var(--fg)]">{profile.email}</span>
        </p>
        <form onSubmit={handleEmailChange} className="space-y-3">
          <div>
            <FieldLabel label={t("settingsAccountEmailNew")} />
            <StyledInput
              value={newEmail} onChange={setNewEmail} type="email"
              placeholder={t("settingsAccountEmailNewPlaceholder")}
            />
          </div>
          {emailMsg && (emailMsg.kind === "ok"
            ? <SaveBanner msg={emailMsg.text} />
            : <ErrorBanner msg={emailMsg.text} />
          )}
          <PrimaryBtn loading={emailLoading} disabled={!newEmail.trim()}>
            <AtSign size={13} /> {t("settingsAccountEmailChange")}
          </PrimaryBtn>
        </form>
      </div>

      {/* Password */}
      <div>
        <DividerLabel label={t("settingsAccountPassword")} />
        <form onSubmit={handlePasswordChange} className="space-y-3">
          <div>
            <FieldLabel label={t("settingsAccountPasswordCurrent")} />
            <div className="relative">
              <StyledInput value={currentPw} onChange={setCurrentPw} type={showPw ? "text" : "password"} />
              <button type="button" onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--fg-3)] hover:text-[var(--fg)]">
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <FieldLabel label={t("settingsAccountPasswordNew")} />
            <StyledInput value={newPw} onChange={setNewPw} type={showPw ? "text" : "password"} />
          </div>
          <div>
            <FieldLabel label={t("settingsAccountPasswordConfirm")} />
            <StyledInput value={confirmPw} onChange={setConfirmPw} type={showPw ? "text" : "password"} />
          </div>
          {pwMsg && (pwMsg.kind === "ok"
            ? <SaveBanner msg={pwMsg.text} />
            : <ErrorBanner msg={pwMsg.text} />
          )}
          <PrimaryBtn loading={pwLoading} disabled={!currentPw || !newPw || !confirmPw}>
            <Key size={13} /> {t("settingsAccountPasswordChange")}
          </PrimaryBtn>
        </form>
      </div>

      {/* Verification */}
      <div>
        <DividerLabel label={t("settingsAccountVerification")} />
        <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{ background: isVerified ? "var(--green-bg)" : "var(--amber-bg)" }}
          >
            <Check size={14} style={{ color: isVerified ? "var(--green)" : "var(--amber)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--fg)]">
              {isVerified ? t("settingsAccountVerified") : t("settingsAccountUnverified")}
            </p>
            <p className="mono text-[11px] text-[var(--fg-2)]">{profile.email}</p>
          </div>
          {!isVerified && !verifSent && (
            <GhostBtn onClick={handleResendVerif} disabled={verifLoading}>
              {t("settingsAccountResendVerification")}
            </GhostBtn>
          )}
          {verifSent && <span className="text-sm text-[var(--green)]">{t("settingsAccountVerificationSent")}</span>}
        </div>
      </div>

      {/* Export */}
      <div>
        <DividerLabel label={t("settingsAccountExport")} />
        <p className="mb-3 text-sm text-[var(--fg-2)]">{t("settingsAccountExportDesc")}</p>
        <GhostBtn onClick={handleExport} disabled={exportLoading}>
          {exportLoading
            ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> {t("settingsAccountExporting")}</>
            : <><Download size={14} /> {t("settingsAccountExportBtn")}</>
          }
        </GhostBtn>
      </div>

      {/* Danger zone */}
      <div>
        <DividerLabel label={t("settingsAccountDangerZone")} />
        <div className="rounded-xl border border-[var(--red)]/30 bg-[var(--red-bg)] p-5 space-y-3">
          <p className="text-sm font-semibold text-[var(--red)]">{t("settingsAccountDelete")}</p>
          <p className="text-sm text-[var(--fg-2)]">{t("settingsAccountDeleteDesc")}</p>
          {deleteMsg && (deleteMsg.kind === "ok"
            ? <SaveBanner msg={deleteMsg.text} />
            : <ErrorBanner msg={deleteMsg.text} />
          )}
          {profile.deletion_requested_at ? (
            <GhostBtn onClick={handleCancelDeletion} disabled={deleteLoading}>
              <RotateCcw size={13} /> {t("settingsAccountDeleteCancel")}
            </GhostBtn>
          ) : deletePhase === "idle" ? (
            <PrimaryBtn danger onClick={() => setDeletePhase("confirm")}>
              <Trash2 size={13} /> {t("settingsAccountDeleteBtn")}
            </PrimaryBtn>
          ) : (
            <div className="flex items-center gap-3">
              <PrimaryBtn danger loading={deleteLoading} onClick={handleDeleteRequest}>
                <Trash2 size={13} /> {t("confirm")}
              </PrimaryBtn>
              <GhostBtn onClick={() => setDeletePhase("idle")}>{t("cancel")}</GhostBtn>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Appearance section ────────────────────────────────────────────────────────

function AppearanceSection({
  settings, onApply, t,
}: {
  settings: AppSettings; onApply: (s: AppSettings) => void; t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}) {
  const standardThemes = THEMES.filter((th) => themeCategory(th) === "standard");
  const gradientThemes = THEMES.filter((th) => themeCategory(th) === "gradient");
  const effectThemes   = THEMES.filter((th) => themeCategory(th) === "effect");

  function setTheme(theme: ThemeId)      { onApply({ ...settings, theme }); }
  function setFont(font: FontId)          { onApply({ ...settings, font }); }
  function setSize(fontSize: FontSize)    { onApply({ ...settings, fontSize }); }
  function setEffects(patch: Partial<EffectSettings>) {
    onApply({ ...settings, effects: { ...settings.effects, ...patch } });
  }
  function setAccent(hex: string | null)  { onApply({ ...settings, accentOverride: hex }); }
  function setDensity(layoutDensity: LayoutDensity) { onApply({ ...settings, layoutDensity }); }
  function setA11y(patch: Partial<AccessibilitySettings>) {
    onApply({ ...settings, accessibility: { ...DEFAULT_ACCESSIBILITY, ...settings.accessibility, ...patch } });
  }

  const a11y = { ...DEFAULT_ACCESSIBILITY, ...settings.accessibility };

  return (
    <div className="p-8">
      <SectionHeader title={t("settingsAppearanceTitle")} desc={t("settingsAppearanceDesc")} />

      {/* Standard themes */}
      <div>
        <p className="mb-3 text-xs text-[var(--fg-2)]">{t("settingsDialogTabThemeDesc")}</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {standardThemes.map((th) => (
            <ThemeCard key={th.id} theme={th} active={settings.theme === th.id} onSelect={() => setTheme(th.id)} />
          ))}
        </div>
      </div>

      {/* Gradient themes */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1.5 rounded-md border border-[var(--purple)]/30 bg-[var(--bg-4)] px-2 py-1">
            <FlaskConical size={10} className="text-[var(--purple)]" />
            <span className="mono text-[10px] font-bold uppercase tracking-widest text-[var(--purple)]">Gradient</span>
          </div>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {gradientThemes.map((th) => (
            <ThemeCard key={th.id} theme={th} active={settings.theme === th.id} onSelect={() => setTheme(th.id)} />
          ))}
        </div>
      </div>

      {/* Effect themes + controls */}
      <DividerLabel label={t("settingsDialogTabEffects")} />
      <EffectsTab
        themes={effectThemes}
        activeTheme={settings.theme}
        effects={settings.effects}
        onSelectTheme={setTheme}
        onEffects={setEffects}
      />

      {/* Accent color */}
      <DividerLabel label={t("settingsAppearanceAccent")} />
      <p className="mb-3 text-sm text-[var(--fg-2)]">{t("settingsAppearanceAccentDesc")}</p>
      <div className="flex flex-wrap gap-2 items-center">
        {ACCENT_PRESETS.map((preset) => {
          const active = settings.accentOverride === preset.hex;
          return (
            <button
              key={preset.id}
              onClick={() => setAccent(active ? null : preset.hex)}
              title={preset.label}
              className={cn(
                "h-8 w-8 rounded-full border-2 transition-all hover:scale-110 active:scale-95 focus-ring",
                active ? "border-[var(--fg)]" : "border-transparent"
              )}
              style={{ backgroundColor: preset.hex }}
            >
              {active && <Check size={12} className="mx-auto text-white drop-shadow" />}
            </button>
          );
        })}
        {settings.accentOverride && (
          <GhostBtn onClick={() => setAccent(null)}>
            <RotateCcw size={13} /> {t("settingsAppearanceAccentReset")}
          </GhostBtn>
        )}
      </div>

      {/* Density */}
      <DividerLabel label={t("settingsAppearanceDensity")} />
      <p className="mb-3 text-sm text-[var(--fg-2)]">{t("settingsAppearanceDensityDesc")}</p>
      <div className="flex gap-3">
        {(["comfortable", "compact"] as LayoutDensity[]).map((d) => (
          <button
            key={d}
            onClick={() => setDensity(d)}
            className={cn(
              "flex-1 rounded-lg border p-4 text-left transition-all active:scale-[0.98] focus-ring",
              settings.layoutDensity === d
                ? "border-[var(--accent)] bg-[var(--accent-bg)]"
                : "border-[var(--border)] bg-[var(--bg-3)] hover:border-[var(--border-2)] hover:bg-[var(--bg-4)]"
            )}
          >
            <div className="mb-2 flex items-center gap-2">
              <Layout size={14} className={settings.layoutDensity === d ? "text-[var(--accent)]" : "text-[var(--fg-3)]"} />
              <span className={cn("text-sm font-semibold", settings.layoutDensity === d ? "text-[var(--accent)]" : "text-[var(--fg)]")}>
                {d === "comfortable" ? t("settingsAppearanceDensityComfortable") : t("settingsAppearanceDensityCompact")}
              </span>
            </div>
            <div className={cn("space-y-1", d === "compact" ? "space-y-0.5" : "space-y-2")}>
              {[60, 45, 75].map((w, i) => (
                <div key={i} className="h-1.5 rounded-full bg-[var(--border)]" style={{ width: `${w}%` }} />
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* Font */}
      <DividerLabel label={t("settingsDialogTabFont")} />
      <p className="mb-3 text-sm text-[var(--fg-2)]">{t("settingsDialogTabFontDesc")}</p>
      <div className="flex flex-col gap-2">
        {FONTS.map((font) => {
          const active = settings.font === font.id;
          return (
            <button
              key={font.id}
              onClick={() => setFont(font.id)}
              className={cn(
                "flex items-center gap-4 rounded-lg border p-3.5 text-left transition-all duration-100 active:scale-[0.99] focus-ring",
                active
                  ? "border-[var(--accent)] bg-[var(--accent-bg)]"
                  : "border-[var(--border)] bg-[var(--bg-3)] hover:border-[var(--border-2)] hover:bg-[var(--bg-4)]"
              )}
            >
              <div
                className="flex h-10 w-16 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg)] text-sm font-medium text-[var(--fg)]"
                style={{ fontFamily: `'${font.cssFamily}', ${font.fallback}` }}
              >Aa</div>
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-semibold leading-snug", active ? "text-[var(--accent)]" : "text-[var(--fg)]")}>{font.label}</p>
                <p className="mono text-[11px] text-[var(--fg-2)]">{font.description}</p>
              </div>
              {active && <Check size={15} className="shrink-0 text-[var(--accent)]" />}
            </button>
          );
        })}
      </div>

      {/* Font size */}
      <DividerLabel label={t("settingsDialogTabSize")} />
      <p className="mb-3 text-sm text-[var(--fg-2)]">{t("settingsDialogTabSizeDesc")}</p>
      <div className="flex flex-col gap-2">
        {FONT_SIZES.map((sz) => {
          const active = settings.fontSize === sz.id;
          return (
            <button
              key={sz.id}
              onClick={() => setSize(sz.id)}
              className={cn(
                "flex items-center gap-4 rounded-lg border p-3.5 text-left transition-all duration-100 active:scale-[0.99] focus-ring",
                active
                  ? "border-[var(--accent)] bg-[var(--accent-bg)]"
                  : "border-[var(--border)] bg-[var(--bg-3)] hover:border-[var(--border-2)] hover:bg-[var(--bg-4)]"
              )}
            >
              <div
                className="flex h-10 w-16 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg)] font-medium text-[var(--fg)]"
                style={{ fontSize: `${sz.px}px` }}
              >Aa</div>
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-semibold leading-snug", active ? "text-[var(--accent)]" : "text-[var(--fg)]")}>{sz.label}</p>
                <p className="mono text-[11px] text-[var(--fg-2)]">{sz.px}px base</p>
              </div>
              {active && <Check size={15} className="shrink-0 text-[var(--accent)]" />}
            </button>
          );
        })}
      </div>

      {/* Accessibility */}
      <DividerLabel label={t("settingsAppearanceA11y")} />
      <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
        <ToggleRow
          label={t("settingsAppearanceA11yHighContrast")}
          desc={t("settingsAppearanceA11yHighContrastDesc")}
          checked={a11y.highContrast}
          onChange={(v) => setA11y({ highContrast: v })}
        />
        <hr className="border-[var(--border)]" />
        <ToggleRow
          label={t("settingsAppearanceA11yBoldFocus")}
          desc={t("settingsAppearanceA11yBoldFocusDesc")}
          checked={a11y.boldFocus}
          onChange={(v) => setA11y({ boldFocus: v })}
        />
        <hr className="border-[var(--border)]" />
        <ToggleRow
          label={t("settingsAppearanceA11yLargeTargets")}
          desc={t("settingsAppearanceA11yLargeTargetsDesc")}
          checked={a11y.largeTargets}
          onChange={(v) => setA11y({ largeTargets: v })}
        />
      </div>
    </div>
  );
}

// ── Privacy section ───────────────────────────────────────────────────────────

function PrivacySection({
  profile, onUpdated, t,
}: {
  profile: Profile; onUpdated: (p: Profile) => void; t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}) {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [sessLoading, setSessLoading] = useState(true);
  const [histCleared, setHistCleared] = useState<"reading" | "search" | null>(null);
  const deviceId = typeof window !== "undefined" ? getDeviceId() : "";

  useEffect(() => {
    listSessions(profile.id).then(setSessions).catch(() => {}).finally(() => setSessLoading(false));
  }, [profile.id]);

  async function handleVisibility(value: "school" | "staff" | "private") {
    await updateProfileVisibility(profile.id, value);
    onUpdated({ ...profile, profile_visibility: value });
  }

  async function handleShowReading(value: boolean) {
    await updateShowReadingHistory(profile.id, value);
    onUpdated({ ...profile, show_reading_history: value });
  }

  function handleClearReading() {
    clearReadingHistory(profile.id);
    setHistCleared("reading");
    setTimeout(() => setHistCleared(null), 2500);
  }

  function handleClearSearch() {
    clearSearchHistory(profile.id);
    setHistCleared("search");
    setTimeout(() => setHistCleared(null), 2500);
  }

  async function handleRevokeSession(id: string) {
    await removeSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  const VISIBILITY_OPTIONS: { value: "school" | "staff" | "private"; label: string }[] = [
    { value: "school",  label: t("settingsPrivacyVisibilitySchool") },
    { value: "staff",   label: t("settingsPrivacyVisibilityStaff") },
    { value: "private", label: t("settingsPrivacyVisibilityPrivate") },
  ];

  return (
    <div className="p-8 max-w-xl">
      <SectionHeader title={t("settingsPrivacyTitle")} desc={t("settingsPrivacyDesc")} />

      {/* Profile visibility */}
      <div>
        <DividerLabel label={t("settingsPrivacyProfileVisibility")} />
        <div className="flex flex-col gap-2">
          {VISIBILITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleVisibility(opt.value)}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-all focus-ring",
                profile.profile_visibility === opt.value
                  ? "border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--bg)] text-[var(--fg)] hover:border-[var(--border-2)]"
              )}
            >
              {profile.profile_visibility === opt.value
                ? <Check size={14} className="shrink-0" />
                : <span className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-[var(--border)]" />
              }
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reading history */}
      <div>
        <DividerLabel label={t("settingsPrivacyReadingHistory")} />
        <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
          <ToggleRow
            label={t("settingsPrivacyShowReadingHistory")}
            desc={t("settingsPrivacyShowReadingHistoryDesc")}
            checked={profile.show_reading_history}
            onChange={handleShowReading}
          />
          <hr className="border-[var(--border)]" />
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[var(--fg)]">{t("settingsPrivacyClearReadingHistory")}</p>
              <p className="mono text-[11px] text-[var(--fg-2)]">{t("settingsPrivacyReadingHistoryDesc")}</p>
            </div>
            <GhostBtn onClick={handleClearReading}>
              <Trash2 size={13} />
            </GhostBtn>
          </div>
          {histCleared === "reading" && <SaveBanner msg={t("settingsPrivacyHistoryCleared")} />}
        </div>
      </div>

      {/* Search history */}
      <div>
        <DividerLabel label={t("settingsPrivacySearchHistory")} />
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[var(--fg)]">{t("settingsPrivacyClearSearchHistory")}</p>
              <p className="mono text-[11px] text-[var(--fg-2)]">{t("settingsPrivacySearchHistoryDesc")}</p>
            </div>
            <GhostBtn onClick={handleClearSearch}>
              <Trash2 size={13} />
            </GhostBtn>
          </div>
          {histCleared === "search" && <SaveBanner msg={t("settingsPrivacyHistoryCleared")} />}
        </div>
      </div>

      {/* Sessions */}
      <div>
        <DividerLabel label={t("settingsPrivacySessions")} />
        <p className="mb-3 text-sm text-[var(--fg-2)]">{t("settingsPrivacySessionsDesc")}</p>
        <div className="space-y-2">
          {sessLoading && (
            <div className="h-16 animate-pulse rounded-lg border border-[var(--border)] bg-[var(--bg)]" />
          )}
          {!sessLoading && sessions.map((sess) => {
            const isCurrent = sess.device_id === deviceId;
            return (
              <div key={sess.id} className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-3">
                <Laptop size={16} className="shrink-0 text-[var(--fg-3)]" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[var(--fg)] truncate">
                      {sess.device_label || describeUserAgent(sess.user_agent)}
                    </p>
                    {isCurrent && (
                      <span className="mono shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--green)] bg-[var(--green-bg)]">
                        {t("settingsPrivacyCurrentDevice")}
                      </span>
                    )}
                  </div>
                  <p className="mono text-[11px] text-[var(--fg-3)]">
                    {formatDateTime(sess.last_seen_at)}
                  </p>
                </div>
                {!isCurrent && (
                  <GhostBtn onClick={() => handleRevokeSession(sess.id)}>
                    <X size={13} />
                  </GhostBtn>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Library preferences section ───────────────────────────────────────────────

function LibrarySection({
  profile, categories, onUpdated, t,
}: {
  profile: Profile; categories: Category[]; onUpdated: (p: Profile) => void; t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}) {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [readingLists,  setReadingLists]  = useState<ReadingList[]>([]);
  const [loading,       setLoading]       = useState(true);

  // New saved search form
  const [newLabel,     setNewLabel]     = useState("");
  const [newQuery,     setNewQuery]     = useState("");
  const [showNewSearch, setShowNewSearch] = useState(false);
  const [searchSaving, setSearchSaving] = useState(false);

  // New reading list form
  const [newListName, setNewListName] = useState("");
  const [newListDesc, setNewListDesc] = useState("");
  const [showNewList, setShowNewList] = useState(false);
  const [listSaving,  setListSaving]  = useState(false);

  const favIds = profile.favorite_category_ids ?? [];

  useEffect(() => {
    Promise.all([listSavedSearches(profile.id), listReadingLists(profile.id)])
      .then(([searches, lists]) => { setSavedSearches(searches); setReadingLists(lists); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [profile.id]);

  async function toggleFavCategory(id: string) {
    const next = favIds.includes(id) ? favIds.filter((x) => x !== id) : [...favIds, id];
    await updateFavoriteCategories(profile.id, next);
    onUpdated({ ...profile, favorite_category_ids: next });
  }

  async function handleAddSearch(e: FormEvent) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    setSearchSaving(true);
    try {
      const s = await createSavedSearch(profile.id, { label: newLabel, query: newQuery, categoryId: null, tag: null });
      setSavedSearches((prev) => [s, ...prev]);
      setNewLabel(""); setNewQuery(""); setShowNewSearch(false);
    } catch { /* ignore */ } finally { setSearchSaving(false); }
  }

  async function handleDeleteSearch(id: string) {
    await deleteSavedSearch(id);
    setSavedSearches((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleAddList(e: FormEvent) {
    e.preventDefault();
    if (!newListName.trim()) return;
    setListSaving(true);
    try {
      const l = await createReadingList(profile.id, { name: newListName, description: newListDesc });
      setReadingLists((prev) => [l, ...prev]);
      setNewListName(""); setNewListDesc(""); setShowNewList(false);
    } catch { /* ignore */ } finally { setListSaving(false); }
  }

  async function handleDeleteList(id: string) {
    await deleteReadingList(id);
    setReadingLists((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <div className="p-8">
      <SectionHeader title={t("settingsLibraryTitle")} desc={t("settingsLibraryDesc")} />

      {/* Favourite categories */}
      <div>
        <DividerLabel label={t("settingsLibraryFavCategories")} />
        <p className="mb-3 text-sm text-[var(--fg-2)]">{t("settingsLibraryFavCategoriesDesc")}</p>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const active = favIds.includes(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => toggleFavCategory(cat.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all focus-ring active:scale-95",
                  active
                    ? "border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent)]"
                    : "border-[var(--border)] bg-[var(--bg)] text-[var(--fg-2)] hover:text-[var(--fg)]"
                )}
              >
                {active && <Star size={11} />}
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Saved searches */}
      <div>
        <DividerLabel label={t("settingsLibrarySavedSearches")} />
        <p className="mb-3 text-sm text-[var(--fg-2)]">{t("settingsLibrarySavedSearchesDesc")}</p>
        <div className="space-y-2 mb-3">
          {loading && <div className="h-10 animate-pulse rounded-lg border border-[var(--border)] bg-[var(--bg)]" />}
          {!loading && savedSearches.length === 0 && (
            <p className="mono text-sm text-[var(--fg-3)]">{t("settingsLibrarySavedSearchEmpty")}</p>
          )}
          {savedSearches.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--fg)] truncate">{s.label}</p>
                {s.query && <p className="mono text-[11px] text-[var(--fg-3)] truncate">"{s.query}"</p>}
              </div>
              <GhostBtn onClick={() => handleDeleteSearch(s.id)}>
                <Trash2 size={13} />
              </GhostBtn>
            </div>
          ))}
        </div>

        {showNewSearch ? (
          <form onSubmit={handleAddSearch} className="rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-bg)] p-4 space-y-3">
            <div>
              <FieldLabel label={t("settingsLibrarySavedSearchLabel")} />
              <StyledInput value={newLabel} onChange={setNewLabel} placeholder={t("settingsLibrarySavedSearchLabelPlaceholder")} />
            </div>
            <div>
              <FieldLabel label={t("settingsLibrarySavedSearchQuery")} />
              <StyledInput value={newQuery} onChange={setNewQuery} placeholder={t("settingsLibrarySavedSearchQueryPlaceholder")} />
            </div>
            <div className="flex gap-2">
              <PrimaryBtn loading={searchSaving} disabled={!newLabel.trim()}>
                <Save size={13} /> {t("settingsLibrarySavedSearchSave")}
              </PrimaryBtn>
              <GhostBtn onClick={() => setShowNewSearch(false)}>{t("cancel")}</GhostBtn>
            </div>
          </form>
        ) : (
          <GhostBtn onClick={() => setShowNewSearch(true)}>
            <Plus size={14} /> {t("settingsLibrarySavedSearchAdd")}
          </GhostBtn>
        )}
      </div>

      {/* Reading lists */}
      <div>
        <DividerLabel label={t("settingsLibraryReadingLists")} />
        <p className="mb-3 text-sm text-[var(--fg-2)]">{t("settingsLibraryReadingListsDesc")}</p>
        <div className="space-y-2 mb-3">
          {loading && <div className="h-10 animate-pulse rounded-lg border border-[var(--border)] bg-[var(--bg)]" />}
          {!loading && readingLists.length === 0 && (
            <p className="mono text-sm text-[var(--fg-3)]">{t("settingsLibraryReadingListEmpty")}</p>
          )}
          {readingLists.map((l) => (
            <div key={l.id} className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5">
              <BookOpen size={14} className="shrink-0 text-[var(--fg-3)]" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--fg)] truncate">{l.name}</p>
                {l.description && <p className="mono text-[11px] text-[var(--fg-3)] truncate">{l.description}</p>}
              </div>
              <GhostBtn onClick={() => handleDeleteList(l.id)}>
                <Trash2 size={13} />
              </GhostBtn>
            </div>
          ))}
        </div>

        {showNewList ? (
          <form onSubmit={handleAddList} className="rounded-xl border border-[var(--accent)]/40 bg-[var(--accent-bg)] p-4 space-y-3">
            <div>
              <FieldLabel label={t("settingsLibraryReadingListName")} />
              <StyledInput value={newListName} onChange={setNewListName} placeholder={t("settingsLibraryReadingListNamePlaceholder")} />
            </div>
            <div>
              <FieldLabel label={t("settingsLibraryReadingListDescription")} />
              <StyledTextarea value={newListDesc} onChange={setNewListDesc} placeholder={t("settingsLibraryReadingListDescPlaceholder")} rows={2} />
            </div>
            <div className="flex gap-2">
              <PrimaryBtn loading={listSaving} disabled={!newListName.trim()}>
                <Save size={13} /> {t("settingsLibraryReadingListCreate")}
              </PrimaryBtn>
              <GhostBtn onClick={() => setShowNewList(false)}>{t("cancel")}</GhostBtn>
            </div>
          </form>
        ) : (
          <GhostBtn onClick={() => setShowNewList(true)}>
            <Plus size={14} /> {t("settingsLibraryReadingListAdd")}
          </GhostBtn>
        )}
      </div>
    </div>
  );
}

// ── Security section ──────────────────────────────────────────────────────────

function SecuritySection({
  profile, t,
}: {
  profile: Profile; t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}) {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [history,  setHistory]  = useState<LoginHistoryEntry[]>([]);
  const [loading,  setLoading]  = useState(true);
  const deviceId = typeof window !== "undefined" ? getDeviceId() : "";

  useEffect(() => {
    Promise.all([listSessions(profile.id), listLoginHistory(profile.id)])
      .then(([sess, hist]) => { setSessions(sess); setHistory(hist); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [profile.id]);

  async function handleRevoke(id: string) {
    await removeSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleRevokeAll() {
    const others = sessions.filter((s) => s.device_id !== deviceId);
    await Promise.all(others.map((s) => removeSession(s.id)));
    setSessions((prev) => prev.filter((s) => s.device_id === deviceId));
  }

  return (
    <div className="p-8 max-w-xl">
      <SectionHeader title={t("settingsSecurityTitle")} desc={t("settingsSecurityDesc")} />

      {/* Active sessions */}
      <div>
        <DividerLabel label={t("settingsSecurityActiveSessions")} />
        <p className="mb-3 text-sm text-[var(--fg-2)]">{t("settingsSecuritySessionsDesc")}</p>

        {loading && (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg border border-[var(--border)] bg-[var(--bg)]" />
            ))}
          </div>
        )}

        {!loading && (
          <div className="space-y-2">
            {sessions.map((sess) => {
              const isCurrent = sess.device_id === deviceId;
              return (
                <div key={sess.id} className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-2)] text-[var(--fg-2)]">
                    <Smartphone size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[var(--fg)] truncate">
                        {sess.device_label || describeUserAgent(sess.user_agent)}
                      </p>
                      {isCurrent && (
                        <span className="mono shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--green)] bg-[var(--green-bg)]">
                          {t("settingsPrivacyCurrentDevice")}
                        </span>
                      )}
                    </div>
                    <p className="mono text-[11px] text-[var(--fg-3)]">
                      {t("settingsSecurityLoginHistory")} · {formatDateTime(sess.last_seen_at)}
                    </p>
                  </div>
                  {!isCurrent && (
                    <GhostBtn onClick={() => handleRevoke(sess.id)}>
                      <X size={13} />
                    </GhostBtn>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loading && sessions.filter((s) => s.device_id !== deviceId).length > 0 && (
          <div className="mt-3">
            <GhostBtn onClick={handleRevokeAll}>
              <Lock size={13} /> {t("settingsSecurityRevokeAll")}
            </GhostBtn>
          </div>
        )}
      </div>

      {/* Login history */}
      <div>
        <DividerLabel label={t("settingsSecurityLoginHistory")} />
        <p className="mb-3 text-sm text-[var(--fg-2)]">{t("settingsSecurityLoginHistoryDesc")}</p>

        {loading && (
          <div className="space-y-1.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded border border-[var(--border)] bg-[var(--bg)]" />
            ))}
          </div>
        )}

        {!loading && history.length === 0 && (
          <p className="mono text-sm text-[var(--fg-3)]">{t("settingsSecurityNoHistory")}</p>
        )}

        {!loading && history.length > 0 && (
          <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] overflow-hidden">
            {history.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 bg-[var(--bg)] px-4 py-2.5">
                <LogIn size={14} className="shrink-0 text-[var(--fg-3)]" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--fg)] truncate">
                    {entry.device_label || describeUserAgent(entry.user_agent)}
                  </p>
                </div>
                <p className="mono shrink-0 text-[11px] text-[var(--fg-3)]">
                  {formatDateTime(entry.occurred_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Language & Region section ─────────────────────────────────────────────────

function LanguageSection({
  settings, onApply, t,
}: {
  settings: AppSettings; onApply: (s: AppSettings) => void; t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}) {
  const [saved, setSaved] = useState(false);

  function handleApply(patch: Partial<AppSettings>) {
    const next = { ...settings, ...patch };
    onApply(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const LANG_OPTIONS = [
    { id: "pt" as const, label: "Português", flag: "🇵🇹", desc: t("settingsDialogLanguagePtDesc") },
    { id: "en" as const, label: "English",   flag: "🇬🇧", desc: t("settingsDialogLanguageEnDesc") },
  ];

  const DATE_OPTIONS: { id: DateFormat; label: string }[] = [
    { id: "dmy", label: t("settingsLangDateDMY") },
    { id: "mdy", label: t("settingsLangDateMDY") },
    { id: "ymd", label: t("settingsLangDateYMD") },
  ];

  const TIME_OPTIONS: { id: TimeFormat; label: string }[] = [
    { id: "24h", label: t("settingsLangTime24h") },
    { id: "12h", label: t("settingsLangTime12h") },
  ];

  return (
    <div className="p-8 max-w-xl">
      <SectionHeader title={t("settingsLangTitle")} desc={t("settingsLangDesc")} />

      {saved && <div className="mb-6"><SaveBanner msg={t("settingsLangSaved")} /></div>}

      {/* Language */}
      <div>
        <DividerLabel label={t("settingsLangLanguage")} />
        <div className="flex flex-col gap-2">
          {LANG_OPTIONS.map((opt) => {
            const active = settings.language === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => handleApply({ language: opt.id })}
                className={cn(
                  "flex items-center gap-4 rounded-lg border p-3.5 text-left transition-all focus-ring active:scale-[0.99]",
                  active
                    ? "border-[var(--accent)] bg-[var(--accent-bg)]"
                    : "border-[var(--border)] bg-[var(--bg-3)] hover:border-[var(--border-2)] hover:bg-[var(--bg-4)]"
                )}
              >
                <span className="text-xl">{opt.flag}</span>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-semibold", active ? "text-[var(--accent)]" : "text-[var(--fg)]")}>{opt.label}</p>
                  <p className="mono text-[11px] text-[var(--fg-2)]">{opt.desc}</p>
                </div>
                {active && <Check size={15} className="shrink-0 text-[var(--accent)]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Date format */}
      <div>
        <DividerLabel label={t("settingsLangDateFormat")} />
        <div className="flex flex-col gap-2">
          {DATE_OPTIONS.map((opt) => {
            const active = settings.dateFormat === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => handleApply({ dateFormat: opt.id })}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-all focus-ring",
                  active
                    ? "border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent)]"
                    : "border-[var(--border)] bg-[var(--bg)] text-[var(--fg)] hover:border-[var(--border-2)]"
                )}
              >
                {active ? <Check size={14} className="shrink-0" /> : <span className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-[var(--border)]" />}
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time format */}
      <div>
        <DividerLabel label={t("settingsLangTimeFormat")} />
        <div className="flex gap-3">
          {TIME_OPTIONS.map((opt) => {
            const active = settings.timeFormat === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => handleApply({ timeFormat: opt.id })}
                className={cn(
                  "flex-1 rounded-lg border px-4 py-3 text-sm font-semibold transition-all focus-ring active:scale-95",
                  active
                    ? "border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent)]"
                    : "border-[var(--border)] bg-[var(--bg)] text-[var(--fg)] hover:border-[var(--border-2)]"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Timezone */}
      <div>
        <DividerLabel label={t("settingsLangTimezone")} />
        {/* Native <select> has implicit combobox role; browser handles aria automatically */}
        {/* eslint-disable-next-line jsx-a11y/role-has-required-aria-props */}
        <select
          id="tz-select"
          aria-label={t("settingsLangTimezone")}
          value={settings.timezone}
          onChange={(e) => handleApply({ timezone: e.target.value })}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--fg)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-colors"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz.id} value={tz.id}>{tz.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ── Theme card ───────────────────────────────────────────────────────────────

function ThemeCard({
  theme, active, onSelect,
}: {
  theme: ThemeDef; active: boolean; onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "group flex items-center gap-3 rounded-lg border p-3 text-left transition-all duration-100 active:scale-[0.98] focus-ring",
        active
          ? "border-[var(--accent)] bg-[var(--accent-bg)]"
          : "border-[var(--border)] bg-[var(--bg-3)] hover:border-[var(--border-2)] hover:bg-[var(--bg-4)]"
      )}
    >
      {theme.bodyGradient ? (
        <span
          className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md border border-white/10 shadow-inner"
          style={{ background: theme.bodyGradient }}
        >
          <span className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
          <span
            className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full shadow-lg"
            style={{ backgroundColor: theme.swatch, boxShadow: `0 0 4px ${theme.swatch}` }}
          />
        </span>
      ) : (
        <span
          className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md border border-black/10 shadow-inner"
          style={{ backgroundColor: theme.bgSwatch }}
        >
          <span
            className="absolute bottom-0 right-0 h-3.5 w-3.5"
            style={{ backgroundColor: theme.swatch, clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }}
          />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-semibold leading-snug", active ? "text-[var(--accent)]" : "text-[var(--fg)]")}>
          {theme.label}
        </p>
        <p className="mono text-[11px] text-[var(--fg-2)] truncate">{theme.description}</p>
      </div>
      {active && <Check size={15} className="shrink-0 text-[var(--accent)]" />}
    </button>
  );
}

// ── Effects tab ──────────────────────────────────────────────────────────────

function EffectsTab({
  themes, activeTheme, effects, onSelectTheme, onEffects,
}: {
  themes: ThemeDef[]; activeTheme: ThemeId; effects: EffectSettings;
  onSelectTheme: (id: ThemeId) => void; onEffects: (patch: Partial<EffectSettings>) => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-[var(--fg-2)] mb-3">{t("settingsDialogTabEffectsDesc")}</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {themes.map((theme) => (
            <EffectCard
              key={theme.id} theme={theme}
              active={activeTheme === theme.id}
              onSelect={() => onSelectTheme(theme.id)}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1.5 rounded-md border border-[var(--accent)]/30 bg-[var(--bg-4)] px-2 py-1">
            <Gauge size={11} className="text-[var(--accent)]" />
            <span className="mono text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">
              {t("settingsDialogEffectsOptionsHeader")}
            </span>
          </div>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>

        <div className="flex flex-col gap-4 rounded-lg border border-[var(--border)] bg-[var(--bg-3)] p-4">
          <ToggleRow
            label={t("settingsDialogEffectsReduceMotion")}
            desc={t("settingsDialogEffectsReduceMotionDesc")}
            checked={effects.reduceMotion}
            onChange={(v) => onEffects({ reduceMotion: v })}
          />
          <hr className="border-[var(--border)]" />
          <SliderRow
            label={t("settingsDialogEffectsSpeed")} desc={t("settingsDialogEffectsSpeedDesc")}
            min={0.5} max={2} step={0.1} value={effects.animationSpeed}
            format={(v) => `${v.toFixed(1)}×`} disabled={effects.reduceMotion}
            onChange={(v) => onEffects({ animationSpeed: v })}
          />
          <div>
            <p className="text-sm font-semibold text-[var(--fg)]">{t("settingsDialogEffectsDensity")}</p>
            <p className="mono text-[11px] text-[var(--fg-2)] mb-2">{t("settingsDialogEffectsDensityDesc")}</p>
            <div className="grid grid-cols-3 gap-1.5">
              {(["low", "med", "high"] as ParticleDensity[]).map((d) => (
                <button
                  key={d}
                  onClick={() => onEffects({ particleDensity: d })}
                  className={cn(
                    "mono rounded-md border px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-all active:scale-95 focus-ring",
                    effects.particleDensity === d
                      ? "border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent)]"
                      : "border-[var(--border)] bg-[var(--bg)] text-[var(--fg-2)] hover:text-[var(--fg)]"
                  )}
                >
                  {t(`settingsDialogEffectsDensity_${d}` as Parameters<typeof t>[0])}
                </button>
              ))}
            </div>
          </div>
          <hr className="border-[var(--border)]" />
          <SliderRow
            label={t("settingsDialogEffectsBlur")} desc={t("settingsDialogEffectsBlurDesc")}
            min={0} max={24} step={1} value={effects.panelBlur}
            format={(v) => (v === 0 ? t("settingsDialogEffectsOff") : `${v}px`)}
            onChange={(v) => onEffects({ panelBlur: v })}
          />
          <SliderRow
            label={t("settingsDialogEffectsDim")} desc={t("settingsDialogEffectsDimDesc")}
            min={0} max={0.8} step={0.05} value={effects.backgroundDim}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(v) => onEffects({ backgroundDim: v })}
          />
          <hr className="border-[var(--border)]" />
          <ToggleRow
            label={t("settingsDialogEffectsOnLanding")}
            desc={t("settingsDialogEffectsOnLandingDesc")}
            checked={effects.showOnLanding}
            onChange={(v) => onEffects({ showOnLanding: v })}
          />
        </div>
      </div>
    </div>
  );
}

// ── Effect card ──────────────────────────────────────────────────────────────

function EffectCard({
  theme, active, onSelect,
}: {
  theme: ThemeDef; active: boolean; onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "group flex items-center gap-3 rounded-lg border p-3 text-left transition-all duration-100 active:scale-[0.98] focus-ring",
        active
          ? "border-[var(--accent)] bg-[var(--accent-bg)]"
          : "border-[var(--border)] bg-[var(--bg-3)] hover:border-[var(--border-2)] hover:bg-[var(--bg-4)]"
      )}
    >
      <span
        className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md border border-white/10 shadow-inner effect-swatch"
        style={{ background: `conic-gradient(from 0deg, ${theme.effect?.colors.join(", ")}, ${theme.effect?.colors[0]})` }}
      >
        <span className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent" />
        <span
          className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: theme.swatch, boxShadow: `0 0 4px ${theme.swatch}` }}
        />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Sparkles size={11} className={active ? "text-[var(--accent)]" : "text-[var(--fg-3)]"} />
          <p className={cn("text-sm font-semibold leading-snug", active ? "text-[var(--accent)]" : "text-[var(--fg)]")}>
            {theme.label}
          </p>
        </div>
        <p className="mono text-[11px] text-[var(--fg-2)] truncate">{theme.description}</p>
      </div>
      {active && <Check size={15} className="shrink-0 text-[var(--accent)]" />}
    </button>
  );
}

// ── Toggle row ───────────────────────────────────────────────────────────────

function ToggleRow({
  label, desc, checked, onChange,
}: {
  label: string; desc: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--fg)]">{label}</p>
        <p className="mono text-[11px] text-[var(--fg-2)]">{desc}</p>
      </div>
      <button
        role="switch" aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors focus-ring",
          checked ? "border-[var(--accent)] bg-[var(--accent-bg)]" : "border-[var(--border)] bg-[var(--bg)]"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full transition-all",
            checked ? "left-[22px] bg-[var(--accent)]" : "left-0.5 bg-[var(--fg-3)]"
          )}
        />
      </button>
    </div>
  );
}

// ── Slider row ───────────────────────────────────────────────────────────────

function SliderRow({
  label, desc, min, max, step, value, format, disabled, onChange,
}: {
  label: string; desc: string; min: number; max: number; step: number;
  value: number; format: (v: number) => string; disabled?: boolean; onChange: (v: number) => void;
}) {
  return (
    <div className={cn(disabled && "opacity-50")}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-[var(--fg)]">{label}</p>
        <span className="mono text-[11px] font-semibold text-[var(--accent)]">{format(value)}</span>
      </div>
      <p className="mono text-[11px] text-[var(--fg-2)] mb-2">{desc}</p>
      <input
        type="range" min={min} max={max} step={step} value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[var(--bg)] disabled:cursor-not-allowed"
        style={{ accentColor: "var(--accent)" }}
      />
    </div>
  );
}
