"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";

export function BackToTop() {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handle = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", handle, { passive: true });
    return () => window.removeEventListener("scroll", handle);
  }, []);

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label={t("backToTop")}
      className={cn(
        "fixed bottom-5 left-1/2 -translate-x-1/2 z-[150] flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-2)] px-4 py-2 text-xs font-medium text-[var(--fg-2)] shadow-lg transition-all duration-300 hover:border-[var(--border-2)] hover:text-[var(--fg)] active:scale-95",
        visible ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"
      )}
    >
      <ArrowUp size={12} />
      {t("backToTop")}
    </button>
  );
}
