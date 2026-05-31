"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Command, FileText, Folder, Hash, Menu, Plus,
  RotateCcw, Search, Settings, X,
} from "lucide-react";
import type { Category, LibraryDocument } from "@/lib/types";
import { cn } from "@/lib/utils";

// ── Suggestion types ────────────────────────────────────────────────────────

type SuggestionKind = "document" | "category" | "tag";

interface Suggestion {
  kind: SuggestionKind;
  id: string;
  label: string;
  /** Secondary text shown dimmer, e.g. category name or file type */
  detail?: string;
  /** Color swatch for categories */
  color?: string;
}

// ── Props ───────────────────────────────────────────────────────────────────

type Props = {
  onMenuOpen: () => void;
  onRefresh: () => void;
  onSettings: () => void;
  onUpload: () => void;
  query: string;
  setQuery: (q: string) => void;
  /** Data for suggestions */
  documents: LibraryDocument[];
  categories: Category[];
  tags: string[];
  /** Quick-filters from the sidebar */
  onCategoryChange?: (id: string) => void;
  onTagChange?: (tag: string) => void;
};

const MAX_DOC_SUGGESTIONS = 5;
const MAX_CAT_SUGGESTIONS = 3;
const MAX_TAG_SUGGESTIONS = 5;

// ── Component ───────────────────────────────────────────────────────────────

export function Topbar({
  onMenuOpen, onRefresh, onSettings, onUpload,
  query, setQuery,
  documents, categories, tags,
  onCategoryChange, onTagChange,
}: Props) {
  const [focused, setFocused] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // ── Compute suggestions ─────────────────────────────────────────────────

  const suggestions = useMemo<Suggestion[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 1) return [];

    const results: Suggestion[] = [];

    // 1) Document matches — search title, description, file name
    const docMatches: Suggestion[] = [];
    for (const doc of documents) {
      const hay = [doc.title, doc.description ?? "", doc.file_name].join(" ").toLowerCase();
      if (hay.includes(q)) {
        docMatches.push({
          kind: "document",
          id: doc.id,
          label: doc.title,
          detail: doc.category?.name ?? doc.file_name,
          color: doc.category?.color,
        });
      }
      if (docMatches.length >= MAX_DOC_SUGGESTIONS) break;
    }
    results.push(...docMatches);

    // 2) Category matches
    const catMatches: Suggestion[] = [];
    for (const cat of categories) {
      if (cat.name.toLowerCase().includes(q)) {
        catMatches.push({
          kind: "category",
          id: cat.id,
          label: cat.name,
          color: cat.color,
        });
      }
      if (catMatches.length >= MAX_CAT_SUGGESTIONS) break;
    }
    results.push(...catMatches);

    // 3) Tag matches
    const tagMatches: Suggestion[] = [];
    for (const tag of tags) {
      if (tag.toLowerCase().includes(q)) {
        tagMatches.push({
          kind: "tag",
          id: tag,
          label: tag,
        });
      }
      if (tagMatches.length >= MAX_TAG_SUGGESTIONS) break;
    }
    results.push(...tagMatches);

    return results;
  }, [query, documents, categories, tags]);

  const showDropdown = focused && suggestions.length > 0;

  // Reset active index when suggestions change
  useEffect(() => setActiveIdx(-1), [suggestions]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIdx < 0 || !dropdownRef.current) return;
    const item = dropdownRef.current.querySelector(`[data-idx="${activeIdx}"]`);
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  // ── Handle suggestion selection ─────────────────────────────────────────

  const selectSuggestion = useCallback((s: Suggestion) => {
    switch (s.kind) {
      case "document":
        // Set query to the document title so the filter highlights it
        setQuery(s.label);
        break;
      case "category":
        onCategoryChange?.(s.id);
        setQuery("");
        break;
      case "tag":
        onTagChange?.(s.id);
        setQuery("");
        break;
    }
    inputRef.current?.blur();
  }, [setQuery, onCategoryChange, onTagChange]);

  // ── Keyboard navigation ─────────────────────────────────────────────────

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIdx((i) => (i + 1) % suggestions.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIdx((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIdx >= 0 && activeIdx < suggestions.length) {
          selectSuggestion(suggestions[activeIdx]);
        }
        break;
      case "Escape":
        e.preventDefault();
        inputRef.current?.blur();
        break;
    }
  }

  // ── Close dropdown on outside click ─────────────────────────────────────

  useEffect(() => {
    if (!focused) return;
    function handler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [focused]);

  // ── ⌘K shortcut ─────────────────────────────────────────────────────────

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function handleRefresh() {
    setSpinning(true);
    onRefresh();
    setTimeout(() => setSpinning(false), 800);
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <header className="gp-topbar sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-[var(--border)] bg-[var(--bg)]/95 px-5 backdrop-blur-md sm:px-6">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuOpen}
        className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-md border border-[var(--border)] text-[var(--fg-2)] transition-all hover:border-[var(--border-2)] hover:bg-[var(--bg-2)] hover:text-[var(--fg)] active:scale-95 lg:hidden"
        aria-label="Menu"
      >
        <Menu size={18} />
      </button>

      {/* Search with suggestions */}
      <div ref={wrapperRef} className="relative flex-1">
        <div className={cn(
          "relative flex items-center rounded-md border transition-all duration-150",
          focused
            ? "border-[var(--accent)] bg-[var(--bg)] shadow-[0_0_0_3px_rgba(47,129,247,0.12)]"
            : "border-[var(--border)] bg-[var(--bg-2)] hover:border-[var(--border-2)]",
          showDropdown && "rounded-b-none border-b-transparent"
        )}>
          <Search size={16} className="pointer-events-none absolute left-3.5 text-[var(--fg-3)]" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onKeyDown={handleKeyDown}
            placeholder="Pesquisar materiais…"
            aria-label="Pesquisar materiais"
            aria-expanded={showDropdown}
            aria-haspopup="listbox"
            aria-autocomplete="list"
            aria-activedescendant={activeIdx >= 0 ? `suggestion-${activeIdx}` : undefined}
            role="combobox"
            autoComplete="off"
            className="h-10 flex-1 bg-transparent pl-10 pr-16 text-sm text-[var(--fg)] placeholder:text-[var(--fg-3)] [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query ? (
            <button
              onClick={() => { setQuery(""); inputRef.current?.focus(); }}
              className="absolute right-3 grid h-6 w-6 place-items-center rounded-md text-[var(--fg-3)] hover:bg-[var(--bg-3)] hover:text-[var(--fg)] transition-colors"
            >
              <X size={14} />
            </button>
          ) : (
            <div className="mono absolute right-3 flex items-center gap-1 text-[11px] text-[var(--fg-3)]">
              <Command size={12} /><span>K</span>
            </div>
          )}
        </div>

        {/* ── Suggestions dropdown ─────────────────────────────────────── */}
        {showDropdown && (
          <div
            ref={dropdownRef}
            role="listbox"
            className="absolute left-0 right-0 top-full z-50 max-h-[360px] overflow-y-auto rounded-b-lg border border-t-0 border-[var(--accent)] bg-[var(--bg)] shadow-xl shadow-black/20 anim-slide-down"
          >
            <SuggestionGroup
              kind="document"
              label="Documentos"
              icon={<FileText size={12} />}
              suggestions={suggestions}
              activeIdx={activeIdx}
              query={query}
              onSelect={selectSuggestion}
              onHover={setActiveIdx}
            />
            <SuggestionGroup
              kind="category"
              label="Categorias"
              icon={<Folder size={12} />}
              suggestions={suggestions}
              activeIdx={activeIdx}
              query={query}
              onSelect={selectSuggestion}
              onHover={setActiveIdx}
            />
            <SuggestionGroup
              kind="tag"
              label="Tags"
              icon={<Hash size={12} />}
              suggestions={suggestions}
              activeIdx={activeIdx}
              query={query}
              onSelect={selectSuggestion}
              onHover={setActiveIdx}
            />

            {/* Hint bar */}
            <div className="flex items-center gap-3 border-t border-[var(--border)] px-3 py-2">
              <span className="mono text-[10px] text-[var(--fg-3)]">
                <kbd className="mr-0.5 rounded border border-[var(--border)] bg-[var(--bg-2)] px-1 py-px text-[9px]">↑↓</kbd>
                navegar
              </span>
              <span className="mono text-[10px] text-[var(--fg-3)]">
                <kbd className="mr-0.5 rounded border border-[var(--border)] bg-[var(--bg-2)] px-1 py-px text-[9px]">↵</kbd>
                selecionar
              </span>
              <span className="mono text-[10px] text-[var(--fg-3)]">
                <kbd className="mr-0.5 rounded border border-[var(--border)] bg-[var(--bg-2)] px-1 py-px text-[9px]">esc</kbd>
                fechar
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleRefresh}
          className={cn(
            "focus-ring grid h-10 w-10 place-items-center rounded-md border border-[var(--border)] text-[var(--fg-2)] transition-all hover:border-[var(--border-2)] hover:bg-[var(--bg-2)] hover:text-[var(--fg)] active:scale-95",
            spinning && "[&>svg]:animate-spin"
          )}
          aria-label="Atualizar"
        >
          <RotateCcw size={16} />
        </button>

        <button
          onClick={onSettings}
          className="focus-ring grid h-10 w-10 place-items-center rounded-md border border-[var(--border)] text-[var(--fg-2)] transition-all hover:border-[var(--border-2)] hover:bg-[var(--bg-2)] hover:text-[var(--fg)] active:scale-95"
          aria-label="Definições"
        >
          <Settings size={16} />
        </button>

        <button
          onClick={onUpload}
          className="focus-ring flex h-10 items-center gap-2 rounded-md border border-[var(--green)] bg-[var(--green-bg)] px-4 text-sm font-semibold text-[var(--green)] shadow-sm transition-all hover:opacity-80 active:scale-95"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Upload</span>
        </button>
      </div>
    </header>
  );
}

// ── Suggestion group ────────────────────────────────────────────────────────

function SuggestionGroup({
  kind, label, icon, suggestions, activeIdx, query, onSelect, onHover,
}: {
  kind: SuggestionKind;
  label: string;
  icon: React.ReactNode;
  suggestions: Suggestion[];
  activeIdx: number;
  query: string;
  onSelect: (s: Suggestion) => void;
  onHover: (i: number) => void;
}) {
  const items = suggestions.filter((s) => s.kind === kind);
  if (items.length === 0) return null;

  return (
    <div className="py-1">
      <div className="flex items-center gap-2 px-3 py-1.5">
        <span className="text-[var(--fg-3)]">{icon}</span>
        <span className="mono text-[10px] font-bold uppercase tracking-widest text-[var(--fg-3)]">
          {label}
        </span>
        <span className="mono text-[10px] text-[var(--fg-3)]">{items.length}</span>
      </div>
      {items.map((s) => {
        const globalIdx = suggestions.indexOf(s);
        const isActive = globalIdx === activeIdx;
        return (
          <button
            key={`${s.kind}-${s.id}`}
            id={`suggestion-${globalIdx}`}
            data-idx={globalIdx}
            role="option"
            aria-selected={isActive}
            onMouseDown={(e) => { e.preventDefault(); onSelect(s); }}
            onMouseEnter={() => onHover(globalIdx)}
            className={cn(
              "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors duration-75",
              isActive
                ? "bg-[var(--accent-bg)] text-[var(--accent)]"
                : "text-[var(--fg)] hover:bg-[var(--bg-2)]"
            )}
          >
            <SuggestionIcon kind={s.kind} color={s.color} />
            <span className="min-w-0 flex-1 truncate">
              <HighlightMatch text={s.label} query={query} />
            </span>
            {s.detail && (
              <span className="mono shrink-0 truncate max-w-[140px] text-[11px] text-[var(--fg-3)]">
                {s.detail}
              </span>
            )}
            {s.kind === "category" && (
              <span className="mono shrink-0 text-[10px] text-[var(--fg-3)]">filtrar</span>
            )}
            {s.kind === "tag" && (
              <span className="mono shrink-0 text-[10px] text-[var(--fg-3)]">filtrar</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Suggestion icon ─────────────────────────────────────────────────────────

function SuggestionIcon({ kind, color }: { kind: SuggestionKind; color?: string }) {
  switch (kind) {
    case "document":
      return (
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-[var(--border)] bg-[var(--bg-2)] text-[var(--fg-3)]">
          <FileText size={13} />
        </div>
      );
    case "category":
      return (
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-[var(--border)] bg-[var(--bg-2)]">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
        </div>
      );
    case "tag":
      return (
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-[var(--border)] bg-[var(--bg-2)] text-[var(--fg-3)]">
          <Hash size={13} />
        </div>
      );
  }
}

// ── Highlight match ─────────────────────────────────────────────────────────

function HighlightMatch({ text, query }: { text: string; query: string }) {
  const q = query.trim().toLowerCase();
  if (!q) return <>{text}</>;

  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-[var(--accent)]/20 text-[var(--accent)] rounded-sm px-px">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}
