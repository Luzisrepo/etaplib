import type { ReactNode } from "react";

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="dot-grid relative flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border)] px-8 py-20 text-center">
      <div className="relative mb-4 grid h-12 w-12 place-items-center rounded-md border border-[var(--border)] bg-[var(--bg-2)]">
        <svg className="h-6 w-6 text-[var(--fg-2)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
      </div>
      <p className="text-base font-semibold text-[var(--fg)]">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm text-[var(--fg-2)]">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
