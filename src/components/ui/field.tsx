import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="mono text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-2)]">
        {label}{required && <span className="ml-1 text-[var(--red)]">*</span>}
      </span>
      {children}
      {hint && <span className="text-xs text-[var(--fg-2)]">{hint}</span>}
    </label>
  );
}

const base = cn(
  "focus-ring w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3.5 text-[15px] text-[var(--fg)]",
  "placeholder:text-[var(--fg-3)] transition-all duration-100",
  "hover:border-[var(--border-2)] focus:border-[var(--accent)] focus:bg-[var(--bg)]"
);

export function Input({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(base, "h-10", className)} {...p} />;
}

export function Textarea({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(base, "min-h-[100px] resize-y py-2.5", className)} {...p} />;
}

export function Select({ className, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(base, "h-10 cursor-pointer appearance-none bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%238b949e' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")] bg-no-repeat bg-[right_10px_center] pr-8", className)} {...p} />
  );
}
