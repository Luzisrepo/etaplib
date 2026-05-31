"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { FileUp, X } from "lucide-react";
import { DocumentCard } from "@/components/document-card";
import { EditDocumentDialog } from "@/components/edit-document-dialog";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { UploadDialog } from "@/components/upload-dialog";
import { ProfileEditorDialog } from "@/components/profile-editor-dialog";
import { SettingsDialog } from "@/components/settings-dialog";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusCallout } from "@/components/ui/status-callout";
import { supabase } from "@/lib/supabase";
import type { Category, LibraryDocument, Profile } from "@/lib/types";
import { formatBytes } from "@/lib/utils";

export function Dashboard({ session }: { session: Session }) {
  const [documents, setDocuments]       = useState<LibraryDocument[]>([]);
  const [categories, setCategories]     = useState<Category[]>([]);
  const [profile, setProfile]           = useState<Profile | null>(null);
  const [query, setQuery]               = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeTag, setActiveTag]       = useState("all");
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [uploadOpen, setUploadOpen]     = useState(false);
  const [editing, setEditing]           = useState<LibraryDocument | null>(null);
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [profileOpen, setProfileOpen]   = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);


  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    const [cats, docs, prof] = await Promise.all([
      supabase.from("categories").select("*").order("name"),
      supabase.from("documents")
        .select("*, category:categories(*), owner:profiles(id,email,full_name,avatar_url)")
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").eq("id", session.user.id).single()
    ]);
    if (cats.error)  { setError(cats.error.message);  setLoading(false); return; }
    if (docs.error)  { setError(docs.error.message);  setLoading(false); return; }
    
    setCategories((cats.data ?? []) as Category[]);
    setDocuments((docs.data ?? []) as LibraryDocument[]);
    if (prof.data) setProfile(prof.data as Profile);

    setLoading(false);
  }, [session.user.id]);

  useEffect(() => { void loadData(); }, [loadData]);

  const silentRefresh = useCallback(() => loadData(true), [loadData]);
  const handleDelete  = useCallback((id: string) => setDocuments(p => p.filter(d => d.id !== id)), []);
  const handleUpdated = useCallback((u: LibraryDocument) => setDocuments(p => p.map(d => d.id === u.id ? u : d)), []);

  const tags = useMemo(() => {
    const s = new Set<string>();
    documents.forEach(d => d.tags.forEach(t => s.add(t)));
    return [...s].sort((a, b) => a.localeCompare(b, "pt"));
  }, [documents]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents.filter(d => {
      const hay = [d.title, d.description ?? "", d.file_name, d.category?.name ?? "", d.owner?.full_name ?? "", d.owner?.email ?? "", ...d.tags].join(" ").toLowerCase();
      return (!q || hay.includes(q))
        && (activeCategory === "all" || d.category_id === activeCategory)
        && (activeTag === "all" || d.tags.includes(activeTag));
    });
  }, [documents, query, activeCategory, activeTag]);

  const stats = useMemo(() => ({
    total: documents.length,
    mine: documents.filter(d => d.owner_id === session.user.id).length,
    totalSize: formatBytes(documents.reduce((s, d) => s + d.file_size, 0)),
    categories: categories.length,
  }), [documents, categories, session.user.id]);

  const hasFilters = !!(query || activeCategory !== "all" || activeTag !== "all");

  const currentCatName = activeCategory === "all"
    ? "Todos os materiais"
    : categories.find(c => c.id === activeCategory)?.name ?? "Materiais";

  return (
    <div className="min-h-screen text-[var(--fg)]">
      <Sidebar
        activeCategory={activeCategory}
        activeTag={activeTag}
        categories={categories}
        isOpen={sidebarOpen}
        onCategoryChange={c => { setActiveCategory(c); setSidebarOpen(false); }}
        onClose={() => setSidebarOpen(false)}
        onTagChange={t => { setActiveTag(t); setSidebarOpen(false); }}
        onSignOut={() => supabase.auth.signOut()}
        onEditProfile={() => setProfileOpen(true)}
        session={session}
        profile={profile}
        stats={stats}
        tags={tags}
      />

      <div className="lg:pl-72">
        <Topbar
          onMenuOpen={() => setSidebarOpen(true)}
          onRefresh={silentRefresh}
          onSettings={() => setSettingsOpen(true)}
          onUpload={() => setUploadOpen(true)}
          query={query}
          setQuery={setQuery}
          documents={documents}
          categories={categories}
          tags={tags}
          onCategoryChange={(c) => setActiveCategory(c)}
          onTagChange={(t) => setActiveTag(t)}
        />

        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">

          {/* Page header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-[var(--fg)]">{currentCatName}</h1>
              {!loading && (
                <span className="mono rounded-full border border-[var(--border)] bg-[var(--bg-2)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--fg-2)]">
                  {filtered.length}
                </span>
              )}
            </div>
            {hasFilters && (
              <button
                onClick={() => { setQuery(""); setActiveCategory("all"); setActiveTag("all"); }}
                className="mono flex items-center gap-1.5 rounded-md border border-[var(--border)] px-2.5 py-1.5 text-[11px] text-[var(--fg-2)] transition-all hover:border-[var(--border-2)] hover:text-[var(--fg)] active:scale-95 anim-fade-in"
              >
                <X size={12} /> limpar
              </button>
            )}
          </div>

          {/* Error */}
          {error && <div className="mb-6"><StatusCallout kind="error">{error}</StatusCallout></div>}

          {/* Content */}
          {loading ? (
            <Skeleton />
          ) : filtered.length > 0 ? (
            <div className="space-y-3">
              {filtered.map((doc, i) => (
                <div
                  key={doc.id}
                  className="anim-fade-up"
                  style={{ animationDelay: `${Math.min(i * 25, 180)}ms` }}
                >
                  <DocumentCard
                    document={doc}
                    isOwner={doc.owner_id === session.user.id}
                    onDeleted={handleDelete}
                    onUpdated={handleUpdated}
                    onEdit={() => setEditing(doc)}
                    onRefresh={silentRefresh}
                  />
                </div>
              ))}

              {/* Row count footer */}
              <p className="mono pt-6 text-center text-xs text-[var(--fg-2)]">
                {filtered.length} {filtered.length === 1 ? "documento" : "documentos"}
                {hasFilters && ` de ${documents.length}`}
              </p>
            </div>
          ) : (
            <EmptyState
              title="Nenhum documento"
              description={hasFilters ? "Nenhum resultado para os filtros." : "Sê o primeiro a partilhar."}
              action={
                hasFilters
                  ? <Button onClick={() => { setQuery(""); setActiveCategory("all"); setActiveTag("all"); }}>Limpar filtros</Button>
                  : <Button variant="primary" onClick={() => setUploadOpen(true)}><FileUp size={16} />Enviar material</Button>
              }
            />
          )}
        </main>
      </div>

      <UploadDialog
        categories={categories}
        onClose={() => setUploadOpen(false)}
        onUploaded={silentRefresh}
        open={uploadOpen}
        session={session}
      />
      <EditDocumentDialog
        categories={categories}
        document={editing}
        onClose={() => setEditing(null)}
        onSaved={u => { handleUpdated(u); setEditing(null); }}
      />
      {profile && (
        <ProfileEditorDialog
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
          profile={profile}
          onSaved={(updatedProfile) => {
            setProfile(updatedProfile);
            silentRefresh();
          }}
        />
      )}
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="A carregar">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="skeleton h-24 rounded-lg"
          style={{ animationDelay: `${i * 60}ms`, opacity: 1 - i * 0.12 }}
        />
      ))}
    </div>
  );
}
