"use client";

import { useCallback, useEffect, useState, FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  FileStack, Loader2, Mail, ShieldCheck, Trash2, UserCog,
  UserPlus, Users, X, BarChart3, BookOpen, Plus, Calendar, AlertTriangle, CheckSquare, Square
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusCallout } from "@/components/ui/status-callout";
import { GrantRoleDialog } from "@/components/grant-role-dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import {
  fetchAllDocuments, fetchInvites, fetchUsers,
  ROLE_LABELS,
} from "@/lib/admin";
import type { Invite, LibraryDocument, Role, UserWithMeta, Category, ReadingListWithDocs } from "@/lib/types";
import { cn, formatBytes, formatRelativeDate, getInitials } from "@/lib/utils";
import { fetchDownloadAnalytics, AnalyticsResult } from "@/lib/analytics";
import {
  fetchReadingLists,
  createReadingList,
  updateReadingList,
  deleteReadingList,
  syncReadingListDocuments,
  fetchReadingListDetails
} from "@/lib/reading-lists";

type Tab = "users" | "invites" | "documents" | "analytics" | "reading_lists";

type Props = {
  open: boolean;
  onClose: () => void;
  session: Session;
  categories: Category[];
};

export function AdminPanel({ open, onClose, session, categories }: Props) {
  const [tab, setTab]       = useState<Tab>("users");
  const [users, setUsers]   = useState<UserWithMeta[]>([]);
  const [invites, setInv]   = useState<Invite[]>([]);
  const [docs, setDocs]     = useState<LibraryDocument[]>([]);
  const [loading, setLoad]  = useState(false);
  const [error, setErr]     = useState<string | null>(null);
  
  // Analytics State
  const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [analytics, setAnalytics] = useState<AnalyticsResult | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Reading Lists State
  const [readingLists, setReadingLists] = useState<ReadingListWithDocs[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [editList, setEditList] = useState<ReadingListWithDocs | null>(null);
  const [listDialogOpen, setListDialogOpen] = useState(false);

  // Roles Dialog Target
  const [grantOpen, setGrantOpen] = useState(false);
  const [grantTarget, setGrantTarget] = useState<{ email: string; role: Role } | null>(null);

  const load = useCallback(async () => {
    setLoad(true);
    setErr(null);
    try {
      const [u, i, d] = await Promise.all([fetchUsers(), fetchInvites(), fetchAllDocuments()]);
      setUsers(u);
      setInv(i);
      setDocs(d);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao carregar dados.");
    } finally {
      setLoad(false);
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    try {
      const res = await fetchDownloadAnalytics(period);
      setAnalytics(res);
    } catch (e) {
      console.error("Erro ao carregar estatísticas:", e);
    } finally {
      setLoadingAnalytics(false);
    }
  }, [period]);

  const loadLists = useCallback(async () => {
    setLoadingLists(true);
    try {
      const res = await fetchReadingLists();
      setReadingLists(res);
    } catch (e) {
      console.error("Erro ao carregar listas de leitura:", e);
    } finally {
      setLoadingLists(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  useEffect(() => {
    if (open && tab === "analytics") void loadAnalytics();
  }, [open, tab, loadAnalytics]);

  useEffect(() => {
    if (open && tab === "reading_lists") void loadLists();
  }, [open, tab, loadLists]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !loading && !listDialogOpen) onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, loading, listDialogOpen, onClose]);

  if (!open) return null;

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "users",         label: "Utilizadores", icon: <Users size={15} />,     count: users.length },
    { id: "invites",       label: "Convites",     icon: <Mail size={15} />,      count: invites.length },
    { id: "documents",     label: "Documentos",   icon: <FileStack size={15} />, count: docs.length },
    { id: "reading_lists", label: "Listas Leitura", icon: <BookOpen size={15} />, count: readingLists.length },
    { id: "analytics",     label: "Estatísticas", icon: <BarChart3 size={15} /> },
  ];

  function openGrantFor(email?: string, role?: Role) {
    setGrantTarget(email ? { email, role: role ?? "member" } : null);
    setGrantOpen(true);
  }

  function handleGranted(_email: string, _role: Role): void {
    setGrantTarget(null);
    void load();
  }

  async function handleOpenListEdit(list?: ReadingListWithDocs) {
    if (list) {
      setLoadingLists(true);
      try {
        const fullList = await fetchReadingListDetails(list.id);
        setEditList(fullList);
        setListDialogOpen(true);
      } catch (e) {
        console.error("Erro ao carregar detalhes da lista:", e);
      } finally {
        setLoadingLists(false);
      }
    } else {
      setEditList(null);
      setListDialogOpen(true);
    }
  }

  async function handleDeleteList(listId: string) {
    if (!window.confirm("Deseja eliminar esta lista de leitura?")) return;
    try {
      await deleteReadingList(listId);
      void loadLists();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[60] grid place-items-center bg-black/75 px-4 py-8 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-label="Administração"
        onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
      >
        <div className="anim-scale-in flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-2)] shadow-2xl">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--purple)]">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--fg)]">Painel de Gestão</h2>
                <p className="mono text-xs text-[var(--fg-2)]">gestão de utilizadores, acessos, materiais e estatísticas</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {tab === "reading_lists" ? (
                <Button variant="primary" size="sm" onClick={() => handleOpenListEdit()}>
                  <Plus size={15} /> Nova Lista
                </Button>
              ) : (
                <Button variant="primary" size="sm" onClick={() => openGrantFor()}>
                  <UserPlus size={15} /> Conceder acesso
                </Button>
              )}
              <button
                disabled={loading}
                onClick={onClose}
                className="focus-ring grid h-8 w-8 place-items-center rounded-md text-[var(--fg-3)] hover:bg-[var(--bg-3)] hover:text-[var(--fg)] transition-colors disabled:opacity-40"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-0 overflow-x-auto border-b border-[var(--border)] px-6">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "mono flex items-center gap-2 whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 -mb-px",
                  tab === t.id
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-transparent text-[var(--fg-2)] hover:text-[var(--fg)]"
                )}
              >
                {t.icon}
                {t.label}
                {t.count !== undefined && (
                  <span className={cn(
                    "mono rounded-full border px-1.5 text-[10px]",
                    tab === t.id
                      ? "border-[var(--accent)]/40 text-[var(--accent)]"
                      : "border-[var(--border)] text-[var(--fg-3)]"
                  )}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            {loading && (
              <div className="grid place-items-center py-20">
                <Loader2 size={24} className="animate-spin text-[var(--fg-3)]" />
              </div>
            )}

            {!loading && error && (
              <div className="mb-2"><StatusCallout kind="error">{error}</StatusCallout></div>
            )}

            {!loading && !error && tab === "users" && (
              <UsersTab users={users} currentEmail={session.user.email ?? ""} onGrant={openGrantFor} />
            )}
            {!loading && !error && tab === "invites" && (
              <InvitesTab invites={invites} onChanged={load} />
            )}
            {!loading && !error && tab === "documents" && (
              <DocumentsTab documents={docs} />
            )}
            {!loading && !error && tab === "analytics" && (
              <AnalyticsTab
                period={period}
                setPeriod={setPeriod}
                analytics={analytics}
                loading={loadingAnalytics}
              />
            )}
            {!loading && !error && tab === "reading_lists" && (
              <ReadingListsTab
                readingLists={readingLists}
                loading={loadingLists}
                onEdit={handleOpenListEdit}
                onDelete={handleDeleteList}
              />
            )}
          </div>
        </div>
      </div>

      <GrantRoleDialog
        open={grantOpen}
        onClose={() => { setGrantOpen(false); setGrantTarget(null); }}
        onGranted={handleGranted}
        initialEmail={grantTarget?.email}
        initialRole={grantTarget?.role}
      />

      <ReadingListEditDialog
        open={listDialogOpen}
        onClose={() => { setListDialogOpen(false); setEditList(null); }}
        categories={categories}
        documents={docs}
        list={editList}
        userId={session.user.id}
        onSaved={loadLists}
      />
    </>
  );
}

// ── Role badge ────────────────────────────────────────────────────────────────

function roleBadgeClass(role: Role) {
  switch (role) {
    case "admin":   return "border-[var(--red)]/30 bg-[var(--red-bg)] text-[var(--red)]";
    case "teacher": return "border-[var(--purple)]/30 bg-[var(--bg-4)] text-[var(--purple)]";
    default:        return "border-[var(--border)] bg-[var(--bg-3)] text-[var(--fg-2)]";
  }
}

function RoleBadge({ role }: { role: Role }) {
  return (
    <span className={cn(
      "mono inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold leading-none tracking-wide uppercase",
      roleBadgeClass(role),
    )}>
      {ROLE_LABELS[role]}
    </span>
  );
}

// ── Users tab ─────────────────────────────────────────────────────────────────

function UsersTab({
  users, currentEmail, onGrant,
}: {
  users: UserWithMeta[];
  currentEmail: string;
  onGrant: (email?: string, role?: Role) => void;
}) {
  if (users.length === 0) {
    return <EmptyState title="Sem utilizadores" description="Ainda não há utilizadores registados." />;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)]">
      <div className="hidden grid-cols-[1fr_auto_auto] gap-4 border-b border-[var(--border)] bg-[var(--bg-3)] px-4 py-2.5 sm:grid">
        <span className="mono text-[10px] font-bold uppercase tracking-widest text-[var(--fg-3)]">Utilizador</span>
        <span className="mono text-[10px] font-bold uppercase tracking-widest text-[var(--fg-3)] w-20 text-center">Docs</span>
        <span className="mono text-[10px] font-bold uppercase tracking-widest text-[var(--fg-3)] w-28 text-right">Ações</span>
      </div>

      <ul className="divide-y divide-[var(--border)]">
        {users.map((u) => {
          const isSelf = u.email.toLowerCase() === currentEmail.toLowerCase();
          const initials = getInitials(u.email, u.full_name);
          return (
            <li key={u.id} className="grid grid-cols-1 gap-3 px-4 py-3 transition-colors hover:bg-[var(--bg-3)]/50 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-4">
              <div className="flex min-w-0 items-center gap-3">
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover avatar-ring" />
                ) : (
                  <span className="mono grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] text-[11px] font-bold text-white">
                    {initials}
                  </span>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-[var(--fg)]">
                      {u.full_name || u.email.split("@")[0]}
                    </p>
                    <RoleBadge role={u.role} />
                    {isSelf && <Badge variant="blue">eu</Badge>}
                  </div>
                  <p className="mono truncate text-[11px] text-[var(--fg-2)]">{u.email}</p>
                </div>
              </div>

              <div className="flex items-center sm:justify-center sm:w-20">
                <span className="mono rounded-full border border-[var(--border)] bg-[var(--bg)] px-2.5 py-0.5 text-xs text-[var(--fg-2)] sm:mx-auto">
                  {u.doc_count}
                </span>
              </div>

              <div className="flex sm:justify-end sm:w-28">
                <Button variant="secondary" size="xs" onClick={() => onGrant(u.email, u.role)}>
                  <UserCog size={13} /> Papel
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Invites tab ───────────────────────────────────────────────────────────────

function InvitesTab({
  invites, onChanged,
}: {
  invites: Invite[];
  onChanged: () => void;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setErr] = useState<string | null>(null);

  async function doRevoke(email: string) {
    setBusy(email);
    setErr(null);
    try {
      const { revokeInvite } = await import("@/lib/admin");
      await revokeInvite(email);
      setConfirming(null);
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao revogar convite.");
    } finally {
      setBusy(null);
    }
  }

  if (invites.length === 0) {
    return <EmptyState title="Sem convites" description="Concede um acesso para adicionar um email externo." />;
  }

  return (
    <div className="space-y-2">
      {error && <StatusCallout kind="error">{error}</StatusCallout>}
      <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)]">
        {invites.map((inv) => {
          const grantorName = inv.granted_by_profile?.full_name
            || inv.granted_by_profile?.email?.split("@")[0]
            || "—";
          return (
            <li key={inv.email} className="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--bg-3)]/50">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--bg)] text-[var(--fg-3)]">
                <Mail size={15} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-[var(--fg)]">{inv.email}</p>
                  <RoleBadge role={inv.role} />
                </div>
                <p className="mono text-[11px] text-[var(--fg-3)]">
                  por {grantorName} · {formatRelativeDate(inv.granted_at)}
                </p>
              </div>

              {confirming === inv.email ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => doRevoke(inv.email)}
                    disabled={busy === inv.email}
                    className="mono rounded border border-[var(--red)]/50 bg-[var(--red)] px-2.5 py-1 text-[11px] font-bold text-white transition-all hover:opacity-80 active:scale-95 disabled:opacity-50"
                  >
                    {busy === inv.email ? <Loader2 size={12} className="animate-spin" /> : "remover"}
                  </button>
                  <button
                    onClick={() => setConfirming(null)}
                    disabled={busy === inv.email}
                    className="mono rounded px-2.5 py-1 text-[11px] font-medium text-[var(--fg-2)] hover:bg-[var(--bg-3)] hover:text-[var(--fg)]"
                  >
                    não
                  </button>
                </div>
              ) : (
                <Button variant="danger" size="xs" onClick={() => setConfirming(inv.email)}>
                  <Trash2 size={13} /> Revogar
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mono px-1 pt-1 text-[10px] text-[var(--fg-3)]">
        Revogar remove o convite pendente. Utilizadores já registados mantêm o acesso até o papel ser alterado.
      </p>
    </div>
  );
}

// ── Documents tab ─────────────────────────────────────────────────────────────

function DocumentsTab({ documents }: { documents: LibraryDocument[] }) {
  if (documents.length === 0) {
    return <EmptyState title="Sem documentos" description="Ainda não foram partilhados materiais." />;
  }

  return (
    <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)]">
      {documents.map((d) => {
        const ownerName = d.owner?.full_name || d.owner?.email?.split("@")[0] || "—";
        const initials = getInitials(d.owner?.email ?? "et@etap.pt", d.owner?.full_name);
        return (
          <li key={d.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--bg-3)]/50">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold text-[var(--fg)]">{d.title}</p>
                {d.category && (
                  <Badge>
                    <span className="inline-block h-1.5 w-1.5 rounded-sm" style={{ backgroundColor: d.category.color }} />
                    {d.category.name}
                  </Badge>
                )}
                {d.expiry_date && (
                  <span className="mono flex items-center gap-1 text-[9px] text-[var(--amber)] border border-[var(--amber)]/35 bg-[var(--amber-bg)] px-1 rounded">
                    <Calendar size={8} />
                    <span>Expira: {new Date(d.expiry_date).toLocaleDateString()}</span>
                  </span>
                )}
              </div>
              <div className="mono mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-[var(--fg-2)]">
                <span>{formatBytes(d.file_size)}</span>
                <span className="text-[var(--border)]">•</span>
                <span>{formatRelativeDate(d.created_at)}</span>
                <span className="text-[var(--border)]">•</span>
                <span className="flex items-center gap-1.5">
                  {d.owner?.avatar_url ? (
                    <img src={d.owner.avatar_url} alt="" className="h-4 w-4 rounded-full object-cover" />
                  ) : (
                    <span className="mono grid h-4 w-4 place-items-center rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] text-[7px] font-bold text-white">
                      {initials}
                    </span>
                  )}
                  {ownerName}
                  {d.owner?.role && d.owner.role !== "member" && (
                    <span className="text-[var(--fg-3)]">({ROLE_LABELS[d.owner.role]})</span>
                  )}
                </span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ── Analytics tab ─────────────────────────────────────────────────────────────

type AnalyticsTabProps = {
  period: "7d" | "30d" | "90d" | "all";
  setPeriod: (p: "7d" | "30d" | "90d" | "all") => void;
  analytics: AnalyticsResult | null;
  loading: boolean;
};

function AnalyticsTab({ period, setPeriod, analytics, loading }: AnalyticsTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4 flex-wrap gap-4">
        <div>
          <h3 className="text-sm font-bold text-[var(--fg)]">Painel de Estatísticas</h3>
          <p className="mono text-[11px] text-[var(--fg-3)]">métricas de utilização e materiais mais procurados</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="mono text-xs text-[var(--fg-3)]">Período:</span>
          <Select 
            value={period} 
            onChange={(e) => setPeriod(e.target.value as any)}
            className="w-36 text-xs h-8 py-0"
          >
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
            <option value="all">Sempre</option>
          </Select>
        </div>
      </div>

      {loading && (
        <div className="grid place-items-center py-20">
          <Loader2 className="animate-spin text-[var(--accent)]" size={24} />
        </div>
      )}

      {!loading && analytics && (
        <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
          {/* Left panel: General stats + category share */}
          <div className="space-y-6">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 text-center">
              <span className="mono text-3xl font-extrabold text-[var(--accent)]">
                {analytics.totalDownloads}
              </span>
              <p className="mono mt-1 text-[10px] font-bold uppercase tracking-widest text-[var(--fg-3)]">
                Total de Downloads
              </p>
            </div>

            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 space-y-3">
              <h4 className="mono text-[10px] font-bold uppercase tracking-widest text-[var(--fg-2)] border-b border-[var(--border)] pb-2">
                Downloads por Categoria
              </h4>
              {analytics.topCategories.length === 0 ? (
                <p className="text-xs text-[var(--fg-3)] text-center py-4">Sem dados</p>
              ) : (
                <div className="space-y-3">
                  {analytics.topCategories.map((c) => {
                    const pct = analytics.totalDownloads > 0 
                      ? Math.round((c.count / analytics.totalDownloads) * 100) 
                      : 0;
                    return (
                      <div key={c.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="flex items-center gap-1.5 truncate">
                            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: c.color }} />
                            {c.name}
                          </span>
                          <span className="mono text-[10px] text-[var(--fg-3)]">
                            {c.count} ({pct}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-[var(--bg-3)] rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500" 
                            style={{ backgroundColor: c.color, width: `${pct}%` }} 
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Top documents list */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 space-y-4">
            <h4 className="mono text-[10px] font-bold uppercase tracking-widest text-[var(--fg-2)] border-b border-[var(--border)] pb-2">
              Documentos Mais Procurados (Top 10)
            </h4>
            {analytics.topDocuments.length === 0 ? (
              <p className="text-xs text-[var(--fg-3)] text-center py-20">Nenhum download registado neste período.</p>
            ) : (
              <div className="space-y-4">
                {analytics.topDocuments.map((doc, idx) => {
                  const maxCount = analytics.topDocuments[0]?.count || 1;
                  const pct = Math.round((doc.count / maxCount) * 100);
                  return (
                    <div key={doc.id} className="space-y-1.5">
                      <div className="flex items-start justify-between gap-4 text-xs">
                        <span className="font-semibold text-[var(--fg)] truncate max-w-[340px]" title={doc.title}>
                          {idx + 1}. {doc.title}
                        </span>
                        <span className="mono font-bold text-[var(--accent)] shrink-0">
                          {doc.count} dls
                        </span>
                      </div>
                      <div className="h-2 w-full bg-[var(--bg-3)] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[var(--accent)] rounded-full transition-all duration-500" 
                          style={{ width: `${pct}%` }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reading lists tab ─────────────────────────────────────────────────────────

type ReadingListsTabProps = {
  readingLists: ReadingListWithDocs[];
  loading: boolean;
  onEdit: (list: ReadingListWithDocs) => void;
  onDelete: (id: string) => void;
};

function ReadingListsTab({ readingLists, loading, onEdit, onDelete }: ReadingListsTabProps) {
  if (loading && readingLists.length === 0) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="animate-spin text-[var(--accent)]" size={24} />
      </div>
    );
  }

  if (readingLists.length === 0) {
    return <EmptyState title="Sem listas de leitura" description="Cria a tua primeira lista de leitura para associar recursos pedagógicos." />;
  }

  return (
    <div className="space-y-4">
      <div className="border-b border-[var(--border)] pb-3">
        <h3 className="text-sm font-bold text-[var(--fg)]">Listas de Leitura Ativas</h3>
        <p className="mono text-[11px] text-[var(--fg-3)]">listas criadas para disciplinas ou turmas</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {readingLists.map((list) => {
          const docCount = list.documents?.length || 0;
          return (
            <div key={list.id} className="relative rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 flex flex-col justify-between group hover:border-[var(--border-2)] transition-colors">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-sm text-[var(--fg)] break-words max-w-[200px]" title={list.name}>
                    {list.name}
                  </h4>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {list.is_required ? (
                      <span className="mono text-[9px] font-bold bg-[var(--red-bg)] text-[var(--red)] border border-[var(--red)]/30 rounded px-1.5 py-0.5 uppercase">
                        Obrigatório
                      </span>
                    ) : (
                      <span className="mono text-[9px] font-bold bg-[var(--bg-3)] text-[var(--fg-3)] border border-[var(--border)] rounded px-1.5 py-0.5 uppercase">
                        Recomendado
                      </span>
                    )}
                  </div>
                </div>

                {list.description && (
                  <p className="text-xs text-[var(--fg-2)] mt-1.5 line-clamp-2">{list.description}</p>
                )}

                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {list.category && (
                    <span className="mono inline-flex items-center gap-1 text-[10px] text-[var(--fg-3)]">
                      <span className="h-1.5 w-1.5 rounded-sm" style={{ backgroundColor: list.category.color }} />
                      {list.category.name}
                    </span>
                  )}
                  <span className="mono text-[10px] text-[var(--fg-3)]">
                    {docCount} {docCount === 1 ? "documento" : "documentos"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] mt-4 pt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="secondary" size="xs" onClick={() => onEdit(list)}>
                  Editar
                </Button>
                <Button variant="danger" size="xs" onClick={() => onDelete(list.id)}>
                  Eliminar
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Reading List Edit Dialog ──────────────────────────────────────────────────

type EditListProps = {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  documents: LibraryDocument[];
  list: ReadingListWithDocs | null;
  userId: string;
  onSaved: () => void;
};

function ReadingListEditDialog({ open, onClose, categories, documents, list, userId, onSaved }: EditListProps) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [catId, setCatId] = useState("");
  const [required, setRequired] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (list) {
        setName(list.name);
        setDesc(list.description || "");
        setCatId(list.category_id || "");
        setRequired(list.is_required);
        setSelectedDocs(list.documents?.map(d => d.id) || []);
      } else {
        setName("");
        setDesc("");
        setCatId("");
        setRequired(false);
        setSelectedDocs([]);
      }
      setErr(null);
    }
  }, [open, list]);

  if (!open) return null;

  function toggleDocSelection(id: string) {
    setSelectedDocs(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setErr(null);
    try {
      if (list) {
        // Edit List
        await updateReadingList(list.id, name, desc, catId, required);
        await syncReadingListDocuments(list.id, selectedDocs);
      } else {
        // Create List
        const newList = await createReadingList(name, desc, catId, required, userId);
        await syncReadingListDocuments(newList.id, selectedDocs);
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setErr(e.message || "Erro ao gravar lista.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/80 backdrop-blur-sm px-4 py-8">
      <div className="anim-scale-in flex flex-col w-full max-w-xl max-h-[85vh] rounded-lg border border-[var(--border)] bg-[var(--bg-2)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3.5">
          <h3 className="text-sm font-bold text-[var(--fg)]">
            {list ? "Editar Lista de Leitura" : "Nova Lista de Leitura"}
          </h3>
          <button onClick={onClose} disabled={loading} className="text-[var(--fg-3)] hover:text-[var(--fg)]">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
          {err && <StatusCallout kind="error">{err}</StatusCallout>}

          <Field label="Nome da lista" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: PAP - Guiões e Modelos" required />
          </Field>

          <Field label="Descrição">
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex: Materiais de leitura obrigatórios para o desenvolvimento da PAP..." />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2 items-center">
            <Field label="Curso / Categoria">
              <Select value={catId} onChange={(e) => setCatId(e.target.value)}>
                <option value="">Sem Categoria</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>

            <label className="flex items-center gap-2 mt-5 text-xs font-semibold cursor-pointer select-none text-[var(--fg)]">
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
                className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
              />
              <span>Leitura Obrigatória para a disciplina</span>
            </label>
          </div>

          {/* Mapped documents checklist */}
          <div className="space-y-2">
            <label className="mono text-[10px] font-bold uppercase tracking-wider text-[var(--fg-2)]">
              Documentos associados
            </label>
            <div className="max-h-48 overflow-y-auto border border-[var(--border)] bg-[var(--bg)] rounded-lg divide-y divide-[var(--border)] p-2 space-y-0.5">
              {documents.length === 0 ? (
                <p className="text-xs text-[var(--fg-3)] text-center py-8">Sem documentos na biblioteca</p>
              ) : (
                documents.map((d) => {
                  const isChecked = selectedDocs.includes(d.id);
                  return (
                    <div 
                      key={d.id} 
                      onClick={() => toggleDocSelection(d.id)}
                      className="flex items-center gap-2.5 p-2 rounded hover:bg-[var(--bg-3)] cursor-pointer text-xs select-none"
                    >
                      {isChecked ? (
                        <CheckSquare size={15} className="text-[var(--accent)] shrink-0" />
                      ) : (
                        <Square size={15} className="text-[var(--fg-3)] shrink-0" />
                      )}
                      <span className="truncate text-[var(--fg)]" title={d.title}>{d.title}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] pt-4 mt-6">
            <Button variant="ghost" size="sm" onClick={onClose} type="button" disabled={loading}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={loading || !name.trim()}>
              {loading && <Loader2 size={13} className="animate-spin mr-1" />}
              Gravar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
