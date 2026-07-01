import { clsx, type ClassValue } from "clsx";
import { loadSettings, resolveTimezone } from "@/lib/settings";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

/** Locale used for Intl formatting, derived from the language setting. */
function dateLocale(): string {
  return loadSettings().language === "en" ? "en-GB" : "pt-PT";
}

/**
 * Formats a date string honoring the user's Language & Region preferences
 * (day/month/year order, and timezone). Falls back to the dd/mmm/yyyy
 * Portuguese style used throughout the app when no preference is stored.
 */
export function formatDate(date: string) {
  const s = loadSettings();
  const d = new Date(date);
  const timeZone = resolveTimezone(s.timezone);

  if (s.dateFormat === "ymd") {
    return new Intl.DateTimeFormat("sv-SE", { year: "numeric", month: "2-digit", day: "2-digit", timeZone }).format(d);
  }
  if (s.dateFormat === "mdy") {
    return new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "short", year: "numeric", timeZone }).format(d);
  }
  return new Intl.DateTimeFormat(dateLocale(), { day: "2-digit", month: "short", year: "numeric", timeZone }).format(d);
}

/** Formats just the time portion, honoring the 12h/24h preference + timezone. */
export function formatTime(date: string) {
  const s = loadSettings();
  const timeZone = resolveTimezone(s.timezone);
  return new Intl.DateTimeFormat(dateLocale(), {
    hour: "2-digit",
    minute: "2-digit",
    hour12: s.timeFormat === "12h",
    timeZone,
  }).format(new Date(date));
}

/** Formats date + time together, e.g. for session/login-history timestamps. */
export function formatDateTime(date: string) {
  return `${formatDate(date)} · ${formatTime(date)}`;
}

export function formatRelativeDate(date: string) {
  const d = new Date(date);
  const now = Date.now();
  const diff = d.getTime() - now;
  const absDiff = Math.abs(diff);

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;

  const locale = dateLocale();
  const justNow = locale === "en-GB" ? "just now" : "agora mesmo";

  // For very recent items (within 2 min), just say "agora"
  if (absDiff < 2 * minute) return justNow;

  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (absDiff < hour) return formatter.format(Math.round(diff / minute), "minute");
  if (absDiff < day) return formatter.format(Math.round(diff / hour), "hour");
  if (absDiff < week) return formatter.format(Math.round(diff / day), "day");
  if (absDiff < month) return formatter.format(Math.round(diff / week), "week");
  return formatDate(date);
}

// ── Tag limits ────────────────────────────────────────────────────────────────
export const TAG_MAX_CHARS   = 30;   // max characters per individual tag
export const TAG_MAX_COUNT   = 20;   // max number of tags

// ── Portuguese swear / slur filter ───────────────────────────────────────────
// Normalise accented chars so bypass attempts (e.g. "f0da" → "foda") are caught.
function normaliseForFilter(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[0@]/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/[3]/g, "e")
    .replace(/[4]/g, "a")
    .replace(/[5]/g, "s")
    .toLowerCase();
}

const PT_BLOCKED_PATTERNS: RegExp[] = [
  // palavrões sexuais
  /\bfod[ae]?\b/, /\bfoder\b/, /\bfodass[e]?\b/,
  /\bpica\b/, /\bpicas\b/, /\bporra\b/, /\bcaralho\b/,
  /\bputa\b/, /\bputas\b/, /\bputo\b/,
  /\bcu\b/, /\bcus\b/, /\bculhao\b/, /\bculhoes\b/,
  /\bsexo\b/, /\bsex\b/,
  /\bviado\b/, /\bviadao\b/,
  /\bvagabunda\b/, /\bvagabundo\b/,
  /\bprostitu[it]a\b/,
  // insultos / slurs étnicos e sociais
  /\bpret[ao]\b/, /\bnigger\b/, /\bnig\b/, /\bnegrao\b/,
  /\bjudeu\b/,    // por vezes usado como insulto
  /\bciganice\b/, /\bcigano\b/,
  /\bfilhod[ae]puta\b/, /\bfdp\b/,
  /\bbosta\b/, /\bmerda\b/, /\bmijar\b/, /\bpiss\b/,
  /\bburro\b/, /\bburra\b/, /\bidiota\b/, /\bcretino\b/,
  /\bbabaca\b/, /\bimbecel\b/, /\bimbecil\b/,
  // inglês vulgar comum em PT
  /\bfuck\b/, /\bfucker\b/, /\bshit\b/, /\bbitch\b/,
  /\basshole\b/, /\bbastard\b/, /\bdick\b/, /\bcunt\b/,
  /\bnigga\b/, /\bkike\b/, /\bspic\b/, /\bfaggot\b/,
];

function containsBlockedWord(tag: string): boolean {
  const n = normaliseForFilter(tag);
  return PT_BLOCKED_PATTERNS.some((re) => re.test(n));
}

export function parseTags(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
        .filter((tag) => tag.length <= TAG_MAX_CHARS)
        .filter((tag) => !containsBlockedWord(tag))
    )
  ).slice(0, TAG_MAX_COUNT);
}

/** Returns the first blocked tag found in the raw comma-separated input, or null if clean. */
export function findBlockedTag(value: string): string | null {
  const candidates = value
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  return candidates.find(containsBlockedWord) ?? null;
}

/** Returns the first blocked word found in free-form text (e.g. descriptions), or null if clean. */
export function findBlockedWordInText(text: string): string | null {
  const words = text
    .split(/[\s,;.!?()\[\]{}"'\-\/\\]+/)
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean);
  return words.find(containsBlockedWord) ?? null;
}

export function tagsToInput(tags: string[]) {
  return tags.join(", ");
}

export function safeFileName(name: string) {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || "ficheiro";
}

export function getInitials(email: string, fullName?: string | null) {
  const source = fullName?.trim() || email.split("@")[0] || "ET";
  return source
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

// Simple debounce
export function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}
