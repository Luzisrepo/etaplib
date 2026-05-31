import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "blue" | "green" | "red" | "amber" | "purple";

const V: Record<BadgeVariant, string> = {
  default: "border-[var(--border)] bg-[var(--bg-3)] text-[var(--fg-2)]",
  blue:    "border-[var(--accent)]/30 bg-[var(--accent-bg)] text-[var(--accent)]",
  green:   "border-[var(--green)]/30 bg-[var(--green-bg)] text-[var(--green)]",
  red:     "border-[var(--red)]/30 bg-[var(--red-bg)] text-[var(--red)]",
  amber:   "border-[var(--amber)]/30 bg-[var(--amber-bg)] text-[var(--amber)]",
  purple:  "border-[var(--purple)]/30 bg-[var(--bg-4)] text-[var(--purple)]",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant };

export function Badge({ className, variant = "default", ...p }: BadgeProps) {
  return (
    <span className={cn("mono inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium leading-none tracking-wide uppercase", V[variant], className)} {...p} />
  );
}
