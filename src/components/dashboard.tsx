"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { FileUp, Upload, X } from "lucide-react";
import { AdminPanel } from "@/components/admin-panel";
import { BackToTop } from "@/components/back-to-top";
import { DocumentCard } from "@/components/document-card";
import { DocumentViewDialog } from "@/components/document-view-dialog";
import { EditDocumentDialog } from "@/components/edit-document-dialog";
import { GrantRoleDialog } from "@/components/grant-role-dialog";
import { ShortcutsDialog } from "@/components/shortcuts-dialog";
import { Sidebar } from "@/components/sidebar";
import { SortViewBar, type SortField, type SortDir, type ViewMode } from "@/components/sort-view-bar";
import { Topbar } from "@/components/topbar";
import { UploadDialog } from "@/components/upload-dialog";
import { SettingsDialog } from "@/components/settings-dialog";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusCallout } from "@/components/ui/status-callout";
import { useToast } from "@/components/toast";
import { supabase } from "@/lib/supabase";
import type { Category, LibraryDocument, Profile } from "@/lib/types";
import { formatBytes } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";

export function Dashboard({ session }: { session: Session }) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [documents, setDocuments]           = useState<LibraryDocument[]>([]);
  const [categories, setCategories]         = useState<Category[]>([]);
  const [profile, setProfile]               = useState<Profile | null>(null);
  const [query, setQuery]                   = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeTag, setActiveTag]           = useState("all");
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState<string | null>(null);
  const [uploadOpen, setUploadOpen]         = useState(false);
  const [editing, setEditing]               = useState<LibraryDocument | null>(null);
  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [settingsOpen, setSettingsOpen]     = useState(false);
  const [adminOpen, setAdminOpen]           = useState(false);
  const [grantOpen, setGrantOpen]           = useState(false);
  const [shortcutsOpen, setShortcutsOpen]   = useState(false);
  const [isWindowDragging, setIsWindowDragging] = useState(false);
  const [draggedFile, setDraggedFile]       = useState<File | null>(null);
  const [maximizedDoc, setMaximizedDoc]     = useState<LibraryDocument | null>(null);

  // Sort & view
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir]     = useState<SortDir>("desc");
  const [viewMode, setViewMode]   = useState<ViewMode>("list");

  // ── Data loading ────────────────────────────────────────────────────────

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

  // ── Global drag-and-drop ────────────────────────────────────────────────

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault(); e.stopPropagation();
      if (e.dataTransfer?.types.includes("Files")) setIsWindowDragging(true);
    };
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault(); e.stopPropagation();
      if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight)
        setIsWindowDragging(false);
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault(); e.stopPropagation();
      setIsWindowDragging(false);
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) { setDraggedFile(files[0]); setUploadOpen(true); }
    };
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);
    return () => {
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, []);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Skip when typing in an input
      if ((e.target as HTMLElement)?.closest("input, textarea, [contenteditable]")) return;
      if (e.key === "u" || e.key === "U") { e.preventDefault(); setUploadOpen(true); }
      if (e.key === "r" || e.key === "R") { e.preventDefault(); handleRefresh(); }
      if (e.key === "?") { e.preventDefault(); setShortcutsOpen(true); }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────

  const silentRefresh = useCallback(() => loadData(true), [loadData]);

  const handleRefresh = useCallback(() => {
    loadData(true);
    toast("info", t("toastRefreshed"));
  }, [loadData, toast, t]);

  const handleDelete = useCallback((id: string) => {
    setDocuments(p => p.filter(d => d.id !== id));
    toast("success", t("toastDeleteSuccess"));
  }, [toast, t]);

  const handleUpdated = useCallback((u: LibraryDocument) => {
    setDocuments(p => p.map(d => d.id === u.id ? u : d));
  }, []);

  const handleUploaded = useCallback(() => {
    silentRefresh();
    toast("success", t("toastUploadSuccess"));
  }, [silentRefresh, toast, t]);

  // ── Derived data ─────────────────────────────────────────────────────────

  const tags = useMemo(() => {
    const s = new Set<string>();
    documents.forEach(d => d.tags.forEach(tag => s.add(tag)));
    return [...s].sort((a, b) => a.localeCompare(b, "pt"));
  }, [documents]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = documents.filter(d => {
      const hay = [d.title, d.description ?? "", d.file_name, d.category?.name ?? "", d.owner?.full_name ?? "", d.owner?.email ?? "", ...d.tags].join(" ").toLowerCase();
      return (!q || hay.includes(q))
        && (activeCategory === "all" || d.category_id === activeCategory)
        && (activeTag === "all" || d.tags.includes(activeTag));
    });

    // Sort
    return [...base].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "date":  cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); break;
        case "title": cmp = a.title.localeCompare(b.title, "pt"); break;
        case "size":  cmp = a.file_size - b.file_size; break;
        case "type":  cmp = a.mime_type.localeCompare(b.mime_type); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [documents, query, activeCategory, activeTag, sortField, sortDir]);

  const stats = useMemo(() => ({
    total: documents.length,
    mine: documents.filter(d => d.owner_id === session.user.id).length,
    totalSize: formatBytes(documents.reduce((s, d) => s + d.file_size, 0)),
    categories: categories.length,
  }), [documents, categories, session.user.id]);

  const hasFilters = !!(query || activeCategory !== "all" || activeTag !== "all");

  const currentCatName = activeCategory === "all"
    ? t("dashboardAllMaterialsHeader")
    : categories.find(c => c.id === activeCategory)?.name ?? t("dashboardDefaultHeader");

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="relative z-10 min-h-screen text-[var(--fg)]">
      <Sidebar
        activeCategory={activeCategory}
        activeTag={activeTag}
        categories={categories}
        isOpen={sidebarOpen}
        onCategoryChange={c => { setActiveCategory(c); setSidebarOpen(false); }}
        onClose={() => setSidebarOpen(false)}
        onTagChange={tag => { setActiveTag(tag); setSidebarOpen(false); }}
        onSignOut={() => supabase.auth.signOut()}
        onEditProfile={() => { setSettingsOpen(true); }}
        onAdmin={() => setAdminOpen(true)}
        onGrantRole={() => setGrantOpen(true)}
        session={session}
        profile={profile}
        stats={stats}
        tags={tags}
      />

      <div className="lg:pl-72">
        <Topbar
          onMenuOpen={() => setSidebarOpen(true)}
          onRefresh={handleRefresh}
          onSettings={() => setSettingsOpen(true)}
          onUpload={() => setUploadOpen(true)}
          query={query}
          setQuery={setQuery}
          documents={documents}
          categories={categories}
          tags={tags}
          onCategoryChange={c => setActiveCategory(c)}
          onTagChange={tag => setActiveTag(tag)}
        />

        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">

          {/* Page header */}
          <div className="mb-4 flex items-center justify-between">
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
                <X size={12} /> {t("dashboardClearFilters")}
              </button>
            )}
          </div>

          {/* Sort & View bar — only show when there's something to sort */}
          {!loading && filtered.length > 0 && (
            <SortViewBar
              sortField={sortField}
              sortDir={sortDir}
              viewMode={viewMode}
              onSortField={setSortField}
              onSortDir={setSortDir}
              onViewMode={setViewMode}
              onShortcuts={() => setShortcutsOpen(true)}
            />
          )}

          {/* Error */}
          {error && <div className="mb-6"><StatusCallout kind="error">{error}</StatusCallout></div>}

          {/* Content */}
          {loading ? (
            <Skeleton />
          ) : filtered.length > 0 ? (
            <div className={viewMode === "compact" ? "space-y-1" : "space-y-3"}>
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
                    onEdit={() => setEditing(doc)}
                    onSelect={() => setMaximizedDoc(doc)}
                    compact={viewMode === "compact"}
                  />
                </div>
              ))}

              {/* Row count footer */}
              <p className="mono pt-6 text-center text-xs text-[var(--fg-2)]">
                {filtered.length} {filtered.length === 1 ? t("dashboardFilteredCountSingle") : t("dashboardFilteredCount")}
                {hasFilters && ` ${t("dashboardOfText")} ${documents.length}`}
              </p>
            </div>
          ) : (
            <EmptyState
              title={t("dashboardEmptyTitle")}
              description={hasFilters ? t("dashboardEmptyDescFilters") : t("dashboardEmptyDescNoMaterials")}
              action={
                hasFilters
                  ? <Button onClick={() => { setQuery(""); setActiveCategory("all"); setActiveTag("all"); }}>{t("dashboardEmptyBtnClear")}</Button>
                  : <Button variant="primary" onClick={() => setUploadOpen(true)}><FileUp size={16} />{t("dashboardEmptyBtnUpload")}</Button>
              }
            />
          )}
        </main>
      </div>

      {/* Dialogs */}
      <UploadDialog
        categories={categories}
        onClose={() => { setUploadOpen(false); setDraggedFile(null); }}
        onUploaded={handleUploaded}
        open={uploadOpen}
        session={session}
        initialFile={draggedFile}
      />
      <EditDocumentDialog
        categories={categories}
        document={editing}
        onClose={() => setEditing(null)}
        onSaved={u => {
          handleUpdated(u);
          setEditing(null);
          toast("success", t("toastEditSuccess"));
        }}
      />
      <DocumentViewDialog
        document={maximizedDoc}
        open={maximizedDoc !== null}
        onClose={() => setMaximizedDoc(null)}
        isOwner={maximizedDoc ? maximizedDoc.owner_id === session.user.id : false}
        onEdit={() => { if (maximizedDoc) { setEditing(maximizedDoc); setMaximizedDoc(null); } }}
        onDeleted={id => { handleDelete(id); setMaximizedDoc(null); }}
        onUpdated={doc => { handleUpdated(doc); setMaximizedDoc(doc); }}
        onRefresh={silentRefresh}
      />

      {/* Global Drag and Drop Overlay */}
      {isWindowDragging && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 p-6 text-center backdrop-blur-md anim-fade-in pointer-events-none">
          <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-[var(--accent)] bg-[var(--bg-2)]/80 px-8 py-12 shadow-2xl dot-grid">
            <div className="grid h-16 w-16 place-items-center rounded-2xl border border-[var(--accent)] bg-[var(--bg)] text-[var(--accent)] shadow-lg animate-bounce">
              <Upload size={32} />
            </div>
            <h2 className="text-xl font-bold text-[var(--fg)]">{t("dashboardDragOverlayTitle")}</h2>
            <p className="text-sm text-[var(--fg-2)] leading-relaxed">{t("dashboardDragOverlayDesc")}</p>
            <span className="mono text-[10px] uppercase tracking-wider text-[var(--fg-3)]">{t("dashboardDragOverlayLimit")}</span>
          </div>
        </div>
      )}

      {profile && (
        <SettingsDialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          profile={profile}
          session={session}
          categories={categories}
          onProfileSaved={(updatedProfile) => {
            setProfile(updatedProfile);
            silentRefresh();
            toast("success", t("toastProfileSaved"));
          }}
        />
      )}
      {!profile && settingsOpen && (
        /* Fallback while profile loads: render headless so onClose still works */
        <SettingsDialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          profile={null}
          session={session}
          categories={categories}
          onProfileSaved={() => {}}
        />
      )}
      <AdminPanel open={adminOpen} onClose={() => setAdminOpen(false)} session={session} />
      <GrantRoleDialog
        open={grantOpen}
        onClose={() => setGrantOpen(false)}
        onGranted={() => { setGrantOpen(false); silentRefresh(); }}
      />
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      {/* Global QOL */}
      <BackToTop />
    </div>
  );
}

function Skeleton() {
  const { t } = useLanguage();
  return (
    <div className="space-y-3" aria-busy="true" aria-label={t("dashboardLoadingText")}>
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
