// ── Local search & reading history ───────────────────────────────────────────
// Lightweight, per-account, browser-local history used by the Privacy section
// of Settings and by the Topbar's "recent searches" suggestions. Nothing here
// ever leaves the browser — it's why these are separate from the Supabase-
// backed helpers in `lib/account.ts`.

import { loadSettings } from "@/lib/settings";

export interface ReadingHistoryEntry {
  documentId: string;
  title: string;
  viewedAt: string; // ISO timestamp
}

export interface SearchHistoryEntry {
  query: string;
  searchedAt: string; // ISO timestamp
}

const MAX_ENTRIES = 25;

function keyFor(kind: "reading" | "search", userId: string): string {
  return `etap-history-${kind}-${userId}`;
}

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, value: T[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value.slice(0, MAX_ENTRIES)));
  } catch {
    // ignore (e.g. storage full / disabled)
  }
}

// ── Reading history ───────────────────────────────────────────────────────────

export function getReadingHistory(userId: string): ReadingHistoryEntry[] {
  return read<ReadingHistoryEntry>(keyFor("reading", userId));
}

export function recordDocumentView(userId: string, documentId: string, title: string): void {
  if (!loadSettings().trackReadingHistory) return;
  const existing = getReadingHistory(userId).filter((e) => e.documentId !== documentId);
  existing.unshift({ documentId, title, viewedAt: new Date().toISOString() });
  write(keyFor("reading", userId), existing);
}

export function clearReadingHistory(userId: string): void {
  write(keyFor("reading", userId), []);
}

// ── Search history ────────────────────────────────────────────────────────────

export function getSearchHistory(userId: string): SearchHistoryEntry[] {
  return read<SearchHistoryEntry>(keyFor("search", userId));
}

export function recordSearch(userId: string, query: string): void {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return;
  if (!loadSettings().trackSearchHistory) return;
  const existing = getSearchHistory(userId).filter(
    (e) => e.query.toLowerCase() !== trimmed.toLowerCase()
  );
  existing.unshift({ query: trimmed, searchedAt: new Date().toISOString() });
  write(keyFor("search", userId), existing);
}

export function clearSearchHistory(userId: string): void {
  write(keyFor("search", userId), []);
}
