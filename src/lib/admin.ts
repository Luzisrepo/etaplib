"use client";

import { supabase } from "@/lib/supabase";
import type { Invite, LibraryDocument, Profile, Role, UserWithMeta } from "@/lib/types";

// ── Admin gate ────────────────────────────────────────────────────────────────

/** The single email address that may open the full Admin section. */
export const ADMIN_EMAIL = "devtest@etap.pt";

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && email.trim().toLowerCase() === ADMIN_EMAIL;
}

// ── Role helpers ───────────────────────────────────────────────────────────────

/** Staff = teacher or admin (can manage others' content + grant roles). */
export function isStaff(role: Role | null | undefined): boolean {
  return role === "teacher" || role === "admin";
}

/** Anyone who may grant roles (currently the same set as staff). */
export function canGrant(role: Role | null | undefined): boolean {
  return isStaff(role);
}

export const ROLE_LABELS: Record<Role, string> = {
  member: "Membro",
  teacher: "Professor",
  admin: "Administrador",
};

/**
 * Whether the current user may manage a given document.
 * Mirrors the SQL `can_manage_document(owner_uuid)`:
 *   owner, OR admin, OR (teacher AND owner is member).
 */
export function canManageDocument(
  myRole: Role | null | undefined,
  myId: string | undefined,
  ownerId: string,
  ownerRole: Role | undefined,
): boolean {
  if (myId && ownerId === myId) return true;
  if (myRole === "admin") return true;
  if (myRole === "teacher" && ownerRole === "member") return true;
  return false;
}

// ── RPC wrappers ──────────────────────────────────────────────────────────────

export async function grantRole(email: string, role: Role): Promise<Invite> {
  const { data, error } = await supabase
    .rpc("grant_role", { p_email: email, p_role: role })
    .single();
  if (error) throw error;
  return data as Invite;
}

export async function revokeInvite(email: string): Promise<void> {
  const { error } = await supabase.rpc("revoke_invite", { p_email: email });
  if (error) throw error;
}

// ── Data fetchers (admin panel) ───────────────────────────────────────────────

/** All profiles with a document count. RLS limits this to members. */
export async function fetchUsers(): Promise<UserWithMeta[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*, doc_count:documents(count)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  // `documents(count)` returns [{ count: number }], flatten it.
  return ((data ?? []) as unknown as Array<Profile & { doc_count: { count: number }[] }>).map(
    (u) => ({
      ...u,
      doc_count: u.doc_count?.[0]?.count ?? 0,
    }),
  );
}

/** All pending invites, joined with the grantor profile when available. */
export async function fetchInvites(): Promise<Invite[]> {
  const { data, error } = await supabase
    .from("invites")
    .select("email, role, granted_by, granted_at, granted_by_profile:profiles!invites_granted_by_fkey(email, full_name)")
    .order("granted_at", { ascending: false });
  if (error) throw error;
  // The join returns `granted_by_profile` as an array; flatten to the first row.
  return ((data ?? []) as Array<{
    email: string;
    role: Role;
    granted_by: string;
    granted_at: string;
    granted_by_profile: { email: string; full_name: string | null }[] | null;
  }>).map((inv) => ({
    email: inv.email,
    role: inv.role,
    granted_by: inv.granted_by,
    granted_at: inv.granted_at,
    granted_by_profile: inv.granted_by_profile?.[0]
      ? { email: inv.granted_by_profile[0].email, full_name: inv.granted_by_profile[0].full_name ?? "" }
      : null,
  }));
}

/** Every document with its owner + category (admin oversight view). */
export async function fetchAllDocuments(): Promise<LibraryDocument[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("*, category:categories(*), owner:profiles(id,email,full_name,avatar_url,role)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as LibraryDocument[];
}
