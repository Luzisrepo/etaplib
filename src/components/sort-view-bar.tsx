"use client";

import { ArrowDownAZ, ArrowUpAZ, Calendar, FileType, HardDrive, Keyboard, LayoutList, Rows3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";

export type SortField = "date" | "title" | "size" | "type";
export type SortDir   = "asc" | "desc";
export type ViewMode  = "list" | "compact";

type Props = {
  sortField:   SortField;
  sortDir:     SortDir;
  viewMode:    ViewMode;
  onSortField: (f: SortField) => void;
  onSortDir:   (d: SortDir) => void;
  onViewMode:  (m: ViewMode) => void;
  onShortcuts: () => void;
};

export function SortViewBar({ sortField, sortDir, viewMode, onSortField, onSortDir, onViewMode, onShortcuts }: Props) {
  const { t } = useLanguage();

  const fields: { key: SortField; icon: React.ReactNode; label: string }[] = [
    { key: "date",  icon: <Calendar size={12} />, label: t("sortByDate")  },
    { key: "title", icon: <ArrowDownAZ size={12} />, label: t("sortByTitle") },
    { key: "size",  icon: <HardDrive size={12} />, label: t("sortBySize")  },
    { key: "type",  icon: <FileType size={12} />, label: t("sortByType")  },
  ];

  return (
    <div className="mb-5 flex items-center gap-2 flex-wrap">
      {/* Sort label */}
      <span className="mono text-[11px] uppercase tracking-widest text-[var(--fg-3)] mr-1">
        {t("sortLabel")}
      </span>

      {/* Sort field pills */}
      <div className="flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--bg-2)] p-0.5">
        {fields.map(({ key, icon, label }) => (
          <button
            key={key}
            onClick={() => {
              if (sortField === key) {
                onSortDir(sortDir === "asc" ? "desc" : "asc");
              } else {
                onSortField(key);
              }
            }}
            className={cn(
              "mono flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-medium transition-all duration-100 active:scale-95",
              sortField === key
                ? "bg-[var(--accent-bg)] text-[var(--accent)] border border-[var(--accent)]/30"
                : "text-[var(--fg-2)] hover:text-[var(--fg)] hover:bg-[var(--bg-3)]"
            )}
            title={label}
          >
            {icon}
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Asc/Desc toggle */}
      <button
        onClick={() => onSortDir(sortDir === "asc" ? "desc" : "asc")}
        title={sortDir === "asc" ? t("sortAsc") : t("sortDesc")}
        className="focus-ring grid h-8 w-8 place-items-center rounded-md border border-[var(--border)] bg-[var(--bg-2)] text-[var(--fg-2)] transition-all hover:border-[var(--border-2)] hover:text-[var(--fg)] active:scale-95"
      >
        {sortDir === "asc" ? <ArrowDownAZ size={14} /> : <ArrowUpAZ size={14} />}
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* View mode toggle */}
      <div className="flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--bg-2)] p-0.5">
        {(["list", "compact"] as ViewMode[]).map((mode) => {
          const Icon = mode === "list" ? LayoutList : Rows3;
          const label = mode === "list" ? t("viewList") : t("viewCompact");
          return (
            <button
              key={mode}
              onClick={() => onViewMode(mode)}
              title={label}
              className={cn(
                "grid h-7 w-8 place-items-center rounded transition-all duration-100 active:scale-95",
                viewMode === mode
                  ? "bg-[var(--accent-bg)] text-[var(--accent)]"
                  : "text-[var(--fg-3)] hover:text-[var(--fg)] hover:bg-[var(--bg-3)]"
              )}
            >
              <Icon size={13} />
            </button>
          );
        })}
      </div>

      {/* Keyboard shortcuts hint */}
      <button
        onClick={onShortcuts}
        title={t("shortcutsTooltip")}
        className="focus-ring grid h-8 w-8 place-items-center rounded-md border border-[var(--border)] bg-[var(--bg-2)] text-[var(--fg-3)] transition-all hover:border-[var(--border-2)] hover:text-[var(--fg)] active:scale-95"
      >
        <Keyboard size={14} />
      </button>
    </div>
  );
}
