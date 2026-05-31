"use client";

import type { Session } from "@supabase/supabase-js";
import type { ReactNode } from "react";
import { BookMarked, ChevronRight, Files, HardDrive, LogOut, X } from "lucide-react";
import type { Category, Profile } from "@/lib/types";
import { cn, getInitials } from "@/lib/utils";

type Props = {
  activeCategory: string;
  activeTag: string;
  categories: Category[];
  isOpen: boolean;
  onCategoryChange: (c: string) => void;
  onClose: () => void;
  onTagChange: (t: string) => void;
  onSignOut: () => void;
  onEditProfile: () => void;
  session: Session;
  profile: Profile | null;
  stats: { total: number; mine: number; totalSize: string; categories: number };
  tags: string[];
};

export function Sidebar({ activeCategory, activeTag, categories, isOpen, onCategoryChange, onClose, onTagChange, onSignOut, onEditProfile, session, profile, stats, tags }: Props) {
  const email = profile?.email || session.user.email || "user@etap.pt";
  const fullName = profile?.full_name || session.user.user_metadata?.full_name || "";
  const displayName = fullName || email.split("@")[0];
  const initials = getInitials(email, fullName);
  const avatarUrl = profile?.avatar_url;

  return (
    <>
      {isOpen && (
        <div className="backdrop fixed inset-0 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside className={cn(
        "gp-sidebar fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[var(--bg-2)] transition-transform duration-200 lg:translate-x-0 lg:z-30",
        "border-r border-[var(--border)]",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-[var(--border)] px-5">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-md border border-[var(--border)] bg-[var(--bg)]">
              <BookMarked size={16} className="text-[var(--accent)]" />
            </div>
            <div className="flex flex-col leading-none gap-0.5">
              <span className="mono text-[11px] font-bold uppercase tracking-widest text-[var(--fg-2)]">ETAP</span>
              <span className="text-sm font-semibold text-[var(--fg)]">biblioteca</span>
            </div>
          </div>
          <button onClick={onClose} className="focus-ring grid h-8 w-8 place-items-center rounded-md text-[var(--fg-3)] hover:bg-[var(--bg-3)] hover:text-[var(--fg)] lg:hidden transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* User block */}
        <div className="border-b border-[var(--border)] p-3">
          <button
            onClick={onEditProfile}
            className="focus-ring flex w-full items-center gap-3 rounded-md border border-transparent px-3 py-2.5 text-left transition-colors hover:border-[var(--border-2)] hover:bg-[var(--bg-3)] active:scale-[0.98]"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-10 w-10 shrink-0 rounded-full object-cover avatar-ring" />
            ) : (
              <div className="mono grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] text-sm font-bold text-white avatar-ring">
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--fg)] leading-snug">{displayName}</p>
              <p className="mono truncate text-[11px] text-[var(--fg-2)]">{email}</p>
            </div>
          </button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 border-b border-[var(--border)]">
          {[
            { label: "docs", value: stats.total },
            { label: "meus", value: stats.mine },
            { label: "cats", value: stats.categories },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center justify-center py-3 border-r last:border-r-0 border-[var(--border)]">
              <span className="mono text-base font-bold text-[var(--fg)] leading-none">{value}</span>
              <span className="mono text-[10px] uppercase tracking-widest text-[var(--fg-2)] mt-1">{label}</span>
            </div>
          ))}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4">
          <Section label="Conteúdo">
            <NavRow
              active={activeCategory === "all"}
              icon={<Files size={16} />}
              label="Todos os materiais"
              count={stats.total}
              onClick={() => onCategoryChange("all")}
            />
          </Section>

          {categories.length > 0 && (
            <Section label="Categorias">
              {categories.map((cat) => (
                <NavRow
                  key={cat.id}
                  active={activeCategory === cat.id}
                  icon={<span className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: cat.color }} />}
                  label={cat.name}
                  onClick={() => onCategoryChange(cat.id)}
                />
              ))}
            </Section>
          )}

          {tags.length > 0 && (
            <Section label="Tags">
              <div className="px-4 pb-2 flex flex-wrap gap-2">
                <TagChip active={activeTag === "all"} label="all" onClick={() => onTagChange("all")} />
                {tags.slice(0, 30).map((t) => (
                  <TagChip key={t} active={activeTag === t} label={t} onClick={() => onTagChange(t)} />
                ))}
              </div>
            </Section>
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-[var(--border)] p-3 space-y-2">
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--fg-2)]">
            <HardDrive size={14} />
            <span className="mono">{stats.totalSize} usados</span>
          </div>
          <button
            onClick={onSignOut}
            className="focus-ring flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium text-[var(--fg-2)] transition-colors hover:bg-[var(--bg-3)] hover:text-[var(--red)] active:scale-[0.98]"
          >
            <LogOut size={16} />
            Terminar sessão
          </button>
        </div>
      </aside>
    </>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mono px-5 py-2 text-[11px] font-bold uppercase tracking-widest text-[var(--fg-2)]">
        {label}
      </div>
      {children}
    </div>
  );
}

function NavRow({ active, count, icon, label, onClick }: { active: boolean; count?: number; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "focus-ring group flex h-10 w-full items-center gap-3 px-5 text-left text-sm transition-colors duration-100",
        active
          ? "border-r-2 border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent)] font-semibold"
          : "border-r-2 border-transparent text-[var(--fg-2)] hover:bg-[var(--bg-3)] hover:text-[var(--fg)]"
      )}
    >
      <span className={cn("shrink-0 transition-colors", active ? "text-[var(--accent)]" : "text-[var(--fg-3)] group-hover:text-[var(--fg-2)]")}>
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && (
        <span className={cn("mono text-xs tabular-nums", active ? "text-[var(--accent)]/70" : "text-[var(--fg-3)]")}>
          {count}
        </span>
      )}
      {active && <ChevronRight size={14} className="text-[var(--accent)]/50" />}
    </button>
  );
}

function TagChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "mono focus-ring rounded-md border px-2 py-1 text-[11px] font-medium transition-all duration-100 active:scale-95",
        active
          ? "border-[var(--accent)]/50 bg-[var(--accent-bg)] text-[var(--accent)]"
          : "border-[var(--border)] bg-[var(--bg)] text-[var(--fg-2)] hover:border-[var(--border-2)] hover:text-[var(--fg)]"
      )}
    >
      #{label}
    </button>
  );
}
