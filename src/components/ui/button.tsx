import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size    = "xs" | "sm" | "md" | "icon-xs" | "icon-sm" | "icon";

const V: Record<Variant, string> = {
  primary:
    "bg-[var(--green-bg)] border-[var(--green)] text-[var(--green)] hover:opacity-80 active:opacity-70 shadow-sm",
  secondary:
    "bg-[var(--bg-3)] border-[var(--border)] text-[var(--fg-2)] hover:bg-[var(--bg-4)] hover:border-[var(--border-2)] hover:text-[var(--fg)] active:bg-[var(--bg-2)]",
  ghost:
    "bg-transparent border-transparent text-[var(--fg-2)] hover:bg-[var(--bg-2)] hover:text-[var(--fg)] active:bg-[var(--bg)]",
  danger:
    "bg-transparent border-[var(--border)] text-[var(--red)] hover:bg-[var(--red-bg)] hover:border-[var(--red)]/40 active:opacity-70",
  success:
    "bg-transparent border-[var(--border)] text-[var(--green)] hover:bg-[var(--green-bg)] hover:border-[var(--green)]/40",
};

const S: Record<Size, string> = {
  xs:        "h-7 px-2.5 text-xs gap-1.5 rounded-md",
  sm:        "h-8 px-3 text-sm gap-2 rounded-md",
  md:        "h-10 px-4 text-base gap-2 rounded-md",
  "icon-xs": "h-7 w-7 rounded-md",
  "icon-sm": "h-8 w-8 rounded-md",
  icon:      "h-10 w-10 rounded-md",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({ className, variant = "secondary", size = "md", type = "button", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "focus-ring press-sm inline-flex items-center justify-center border font-medium transition-all duration-100 disabled:cursor-not-allowed disabled:opacity-50 select-none",
        V[variant], S[size], className
      )}
      type={type}
      {...props}
    />
  );
}
