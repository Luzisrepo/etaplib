// ── Settings-hub data layer ───────────────────────────────────────────────────
// Supabase-backed helpers for everything the new Settings page needs that
// isn't a pure local/browser preference (those live in lib/settings.ts and
// lib/history.ts instead). Keeping them here means the section components
// stay focused on layout/markup.

import { supabase } from "@/lib/supabase";
import type {
  DefaultFilters,
  LoginHistoryEntry,
  Profile,
  ProfileVisibility,
  ReadingList,
  SavedSearch,
  UserSession,
} from "@/lib/types";

const AVATAR_BUCKET = "biblioteca";
// Signed URLs are required because the bucket is private; every authenticated
// ETAP account is allowed to *read* any object in it (see storage policies),
// so a long-lived signed URL behaves like a stable avatar URL in practice.
const AVATAR_URL_TTL = 60 * 60 * 24 * 365 * 5; // ~5 years

// ── Profile basics (name, avatar, bio, student info) ───────────────────────

export interface ProfileBasicsInput {
  fullName: string;
  bio: string;
  course: string;
  academicYear: string;
  classGroup: string;
  avatarFile: File | null;
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/avatar-${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { cacheControl: "3600", contentType: file.type, upsert: true });
  if (uploadErr) throw uploadErr;

  const { data, error: signErr } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(path, AVATAR_URL_TTL);
  if (signErr || !data) throw signErr ?? new Error("Não foi possível gerar o URL do avatar.");

  return data.signedUrl;
}

export async function saveProfileBasics(profile: Profile, input: ProfileBasicsInput): Promise<Profile> {
  let avatarUrl = profile.avatar_url;
  if (input.avatarFile) {
    avatarUrl = await uploadAvatar(profile.id, input.avatarFile);
  }

  const updates = {
    full_name: input.fullName.trim() || profile.email.split("@")[0],
    avatar_url: avatarUrl,
    bio: input.bio.trim() || null,
    course: input.course.trim() || null,
    academic_year: input.academicYear.trim() || null,
    class_group: input.classGroup.trim() || null,
  };

  const { error } = await supabase.from("profiles").update(updates).eq("id", profile.id);
  if (error) throw error;

  // Keep auth metadata in sync so the sidebar/topbar reflect the new name instantly.
  await supabase.auth.updateUser({ data: { full_name: updates.full_name } });

  return { ...profile, ...updates, updated_at: new Date().toISOString() };
}

// ── Account: email / password / verification / deletion / export ──────────────

export async function changeEmail(newEmail: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ email: newEmail.trim().toLowerCase() });
  if (error) throw error;
}

export async function changePassword(
  currentEmail: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  // Re-authenticate first so a stolen, still-open session can't silently
  // change the password without knowing the current one.
  const { error: reauthErr } = await supabase.auth.signInWithPassword({
    email: currentEmail,
    password: currentPassword,
  });
  if (reauthErr) throw new Error("A palavra-passe atual está incorreta.");

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function resendVerificationEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error) throw error;
}

export async function requestAccountDeletion(userId: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ deletion_requested_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
}

export async function cancelAccountDeletion(userId: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ deletion_requested_at: null })
    .eq("id", userId);
  if (error) throw error;
}

export interface ExportedAccountData {
  exported_at: string;
  profile: Profile;
  documents: unknown[];
  saved_searches: SavedSearch[];
  reading_lists: ReadingList[];
}

export async function buildAccountExport(profile: Profile): Promise<ExportedAccountData> {
  const [docsRes, searchesRes, listsRes] = await Promise.all([
    supabase.from("documents").select("*").eq("owner_id", profile.id),
    supabase.from("saved_searches").select("*").eq("user_id", profile.id),
    supabase.from("reading_lists").select("*").eq("user_id", profile.id),
  ]);

  return {
    exported_at: new Date().toISOString(),
    profile,
    documents: docsRes.data ?? [],
    saved_searches: (searchesRes.data ?? []) as SavedSearch[],
    reading_lists: (listsRes.data ?? []) as ReadingList[],
  };
}

export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ── Privacy: profile fields ────────────────────────────────────────────────────

export async function updateProfileVisibility(userId: string, value: ProfileVisibility): Promise<void> {
  const { error } = await supabase.from("profiles").update({ profile_visibility: value }).eq("id", userId);
  if (error) throw error;
}

export async function updateShowReadingHistory(userId: string, value: boolean): Promise<void> {
  const { error } = await supabase.from("profiles").update({ show_reading_history: value }).eq("id", userId);
  if (error) throw error;
}

// ── Library preferences ─────────────────────────────────────────────────────────

export async function updateFavoriteCategories(userId: string, ids: string[]): Promise<void> {
  const { error } = await supabase.from("profiles").update({ favorite_category_ids: ids }).eq("id", userId);
  if (error) throw error;
}

export async function updateDefaultFilters(userId: string, filters: DefaultFilters): Promise<void> {
  const { error } = await supabase.from("profiles").update({ default_filters: filters }).eq("id", userId);
  if (error) throw error;
}

export async function listSavedSearches(userId: string): Promise<SavedSearch[]> {
  const { data, error } = await supabase
    .from("saved_searches")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SavedSearch[];
}

export async function createSavedSearch(
  userId: string,
  input: { label: string; query: string; categoryId: string | null; tag: string | null }
): Promise<SavedSearch> {
  const { data, error } = await supabase
    .from("saved_searches")
    .insert({
      user_id: userId,
      label: input.label.trim(),
      query: input.query.trim(),
      category_id: input.categoryId,
      tag: input.tag?.trim() || null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as SavedSearch;
}

export async function deleteSavedSearch(id: string): Promise<void> {
  const { error } = await supabase.from("saved_searches").delete().eq("id", id);
  if (error) throw error;
}

export async function listReadingLists(userId: string): Promise<ReadingList[]> {
  const { data, error } = await supabase
    .from("reading_lists")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ReadingList[];
}

export async function createReadingList(
  userId: string,
  input: { name: string; description: string }
): Promise<ReadingList> {
  const { data, error } = await supabase
    .from("reading_lists")
    .insert({ user_id: userId, name: input.name.trim(), description: input.description.trim() || null })
    .select("*")
    .single();
  if (error) throw error;
  return data as ReadingList;
}

export async function deleteReadingList(id: string): Promise<void> {
  const { error } = await supabase.from("reading_lists").delete().eq("id", id);
  if (error) throw error;
}

// ── Security: sessions & login history ───────────────────────────────────────

const DEVICE_ID_KEY = "etap-device-id";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "server";
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return "unknown-device";
  }
}

/** Best-effort, dependency-free user-agent → human label parser. */
export function describeUserAgent(ua: string | null | undefined): string {
  if (!ua) return "Dispositivo desconhecido";
  const browser = /Edg\//.test(ua) ? "Edge"
    : /OPR\//.test(ua) ? "Opera"
    : /Chrome\//.test(ua) ? "Chrome"
    : /Firefox\//.test(ua) ? "Firefox"
    : /Safari\//.test(ua) ? "Safari"
    : "Navegador";
  const os = /Windows/.test(ua) ? "Windows"
    : /Mac OS X/.test(ua) ? "macOS"
    : /Android/.test(ua) ? "Android"
    : /iPhone|iPad|iOS/.test(ua) ? "iOS"
    : /Linux/.test(ua) ? "Linux"
    : "";
  return os ? `${browser} · ${os}` : browser;
}

/** Records this browser as an active session for the user (insert or refresh). */
export async function touchSession(userId: string): Promise<void> {
  const deviceId = getDeviceId();
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : null;
  const { error } = await supabase.from("user_sessions").upsert(
    {
      user_id: userId,
      device_id: deviceId,
      device_label: describeUserAgent(ua),
      user_agent: ua,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "user_id,device_id" }
  );
  if (error) throw error;
}

export async function listSessions(userId: string): Promise<UserSession[]> {
  const { data, error } = await supabase
    .from("user_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("last_seen_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as UserSession[];
}

export async function removeSession(id: string): Promise<void> {
  const { error } = await supabase.from("user_sessions").delete().eq("id", id);
  if (error) throw error;
}

/** Records a sign-in event. Call once per actual SIGNED_IN auth event, not on every render. */
export async function recordLogin(userId: string): Promise<void> {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : null;
  const { error } = await supabase.from("login_history").insert({
    user_id: userId,
    device_label: describeUserAgent(ua),
    user_agent: ua,
  });
  if (error) throw error;
}

export async function listLoginHistory(userId: string, limit = 20): Promise<LoginHistoryEntry[]> {
  const { data, error } = await supabase
    .from("login_history")
    .select("*")
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as LoginHistoryEntry[];
}
