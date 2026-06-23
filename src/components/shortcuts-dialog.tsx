"use client";

import { useEffect } from "react";
import { Keyboard, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";

type Props = { open: boolean; onClose: () => void };

export function ShortcutsDialog({ open, onClose }: Props) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const shortcuts = [
    { keys: ["⌘", "K"],  desc: t("shortcutSearch") },
    { keys: ["U"],        desc: t("shortcutUpload") },
    { keys: ["R"],        desc: t("shortcutRefresh") },
    { keys: ["Esc"],      desc: t("topbarHintClose") },
  ];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm anim-fade-in" />

      {/* Panel */}
      <div
        className="relative z-10 w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--bg-2)] shadow-2xl shadow-black/40 anim-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Keyboard size={16} className="text-[var(--accent)]" />
            <h2 className="text-sm font-semibold text-[var(--fg)]">{t("shortcutsHeader")}</h2>
          </div>
          <button
            onClick={onClose}
            className="focus-ring grid h-7 w-7 place-items-center rounded-md text-[var(--fg-3)] hover:bg-[var(--bg-3)] hover:text-[var(--fg)] transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="p-4 space-y-2">
          {shortcuts.map(({ keys, desc }) => (
            <div key={desc} className="flex items-center justify-between gap-4 rounded-md px-3 py-2 hover:bg-[var(--bg-3)] transition-colors">
              <span className="text-sm text-[var(--fg-2)]">{desc}</span>
              <div className="flex items-center gap-1">
                {keys.map((k) => (
                  <kbd
                    key={k}
                    className={cn(
                      "mono grid min-w-[26px] place-items-center rounded border border-[var(--border)] bg-[var(--bg-3)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--fg)] shadow-[0_1px_0_0_var(--border)]"
                    )}
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-[var(--border)] px-5 py-3">
          <p className="mono text-[10px] text-[var(--fg-3)]">{t("topbarHintClose")} — Esc</p>
        </div>
      </div>
    </div>
  );
}
