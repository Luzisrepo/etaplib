import { clsx, type ClassValue } from "clsx";

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

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(date));
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

  // For very recent items (within 2 min), just say "agora"
  if (absDiff < 2 * minute) return "agora mesmo";

  const formatter = new Intl.RelativeTimeFormat("pt-PT", { numeric: "auto" });

  if (absDiff < hour) return formatter.format(Math.round(diff / minute), "minute");
  if (absDiff < day) return formatter.format(Math.round(diff / hour), "hour");
  if (absDiff < week) return formatter.format(Math.round(diff / day), "day");
  if (absDiff < month) return formatter.format(Math.round(diff / week), "week");
  return formatDate(date);
}

export function parseTags(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
    )
  ).slice(0, 20);
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
