import type { ReactNode } from "react";
import { AlertCircle, CheckCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type Kind = "error" | "success" | "info";

const cfg = {
  error:   { cls: "border-[var(--red)]/30 bg-[var(--red-bg)] text-[var(--red)]",     Icon: AlertCircle },
  success: { cls: "border-[var(--green)]/30 bg-[var(--green-bg)] text-[var(--green)]", Icon: CheckCircle },
  info:    { cls: "border-[var(--accent)]/30 bg-[var(--accent-bg)] text-[var(--accent)]", Icon: Info },
};

export function StatusCallout({ kind = "info", children }: { kind?: Kind; children: ReactNode }) {
  const { cls, Icon } = cfg[kind];
  return (
    <div className={cn("flex items-start gap-2.5 rounded-md border px-3.5 py-3 text-sm leading-relaxed", cls)}>
      <Icon size={16} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
