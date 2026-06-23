"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

type ToastKind = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (kind: ToastKind, message: string, duration?: number) => void;
}

// ── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const toast = useCallback((kind: ToastKind, message: string, duration = 3500) => {
    const id = String(++idRef.current);
    setToasts((prev) => [...prev, { id, kind, message, duration }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container — bottom-right, stacks upward */}
      <div className="fixed bottom-5 right-5 z-[200] flex flex-col-reverse gap-2 pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ── Single Toast ─────────────────────────────────────────────────────────────

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const inTimer = requestAnimationFrame(() => setVisible(true));

    // Animate out before dismissing
    const outTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, toast.duration ?? 3500);

    return () => {
      cancelAnimationFrame(inTimer);
      clearTimeout(outTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const icons: Record<string, React.ReactNode> = {
    success: <CheckCircle2 size={15} />,
    error:   <XCircle size={15} />,
    warning: <AlertCircle size={15} />,
    info:    <Info size={15} />,
  };

  const colors: Record<string, string> = {
    success: "text-[var(--green)]  border-[var(--green)]/30  bg-[var(--green-bg)]",
    error:   "text-[var(--red)]    border-[var(--red)]/30    bg-[var(--red-bg)]",
    warning: "text-[var(--amber)]  border-[var(--amber)]/30  bg-[var(--amber-bg)]",
    info:    "text-[var(--accent)] border-[var(--accent)]/30 bg-[var(--accent-bg)]",
  };

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-center gap-3 rounded-lg border px-4 py-3 shadow-xl shadow-black/30 transition-all duration-300 min-w-[240px] max-w-[360px]",
        colors[toast.kind],
        visible ? "translate-y-0 opacity-100 scale-100" : "translate-y-2 opacity-0 scale-95"
      )}
    >
      <span className="shrink-0">{icons[toast.kind]}</span>
      <p className="flex-1 text-sm font-medium leading-snug text-[var(--fg)]">{toast.message}</p>
      <button
        onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }}
        className="shrink-0 grid h-5 w-5 place-items-center rounded-md opacity-60 hover:opacity-100 transition-opacity"
      >
        <X size={12} />
      </button>
    </div>
  );
}
