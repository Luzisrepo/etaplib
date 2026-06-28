"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  FileStack, Loader2, Mail, ShieldCheck, Trash2, UserCog,
  UserPlus, Users, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusCallout } from "@/components/ui/status-callout";
import { GrantRoleDialog } from "@/components/grant-role-dialog";
import {
  fetchAllDocuments, fetchInvites, fetchUsers,
  ROLE_LABELS,
} from "@/lib/admin";
import type { Invite, LibraryDocument, Role, UserWithMeta } from "@/lib/types";
import { cn, formatBytes, formatRelativeDate, getInitials } from "@/lib/utils";

type Tab = "users" | "invites" | "documents";

type Props = {
  open: boolean;
  onClose: () => void;
  session: Session;
};

export function AdminPanel({ open, onClose, session }: Props) {
  const [tab, setTab]       = useState<Tab>("users");
  const [users, setUsers]   = useState<UserWithMeta[]>([]);
  const [invites, setInv]   = useState<Invite[]>([]);
  const [docs, setDocs]     = useState<LibraryDocument[]>([]);
  const [loading, setLoad]  = useState(false);
  const [error, setErr]     = useState<string | null>(null);
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

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape" && !loading) onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, loading, onClose]);

  if (!open) return null;

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: "users",     label: "Utilizadores", icon: <Users size={15} />,     count: users.length },
    { id: "invites",   label: "Convites",     icon: <Mail size={15} />,      count: invites.length },
    { id: "documents", label: "Documentos",   icon: <FileStack size={15} />, count: docs.length },
  ];

  function openGrantFor(email?: string, role?: Role) {
    setGrantTarget(email ? { email, role: role ?? "member" } : null);
    setGrantOpen(true);
  }

  function handleGranted(_email: string, _role: Role): void {
    setGrantTarget(null);
    void load();
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
                <h2 className="text-base font-semibold text-[var(--fg)]">Administração</h2>
                <p className="mono text-xs text-[var(--fg-2)]">gestão de utilizadores, acessos e materiais</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="primary" size="sm" onClick={() => openGrantFor()}>
                <UserPlus size={15} /> Conceder acesso
              </Button>
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
                <span className={cn(
                  "mono rounded-full border px-1.5 text-[10px]",
                  tab === t.id
                    ? "border-[var(--accent)]/40 text-[var(--accent)]"
                    : "border-[var(--border)] text-[var(--fg-3)]"
                )}>
                  {t.count}
                </span>
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
      {/* Header row */}
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
