"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { FileUp, Upload, X } from "lucide-react";
import { AdminPanel } from "@/components/admin-panel";
import { DocumentCard } from "@/components/document-card";
import { DocumentViewDialog } from "@/components/document-view-dialog";
import { EditDocumentDialog } from "@/components/edit-document-dialog";
import { GrantRoleDialog } from "@/components/grant-role-dialog";
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
import { useLanguage } from "@/lib/language-context";

export function Dashboard({ session }: { session: Session }) {
  const { t } = useLanguage();
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
  const [adminOpen, setAdminOpen]       = useState(false);
  const [grantOpen, setGrantOpen]       = useState(false);
  const [isWindowDragging, setIsWindowDragging] = useState(false);
  const [draggedFile, setDraggedFile] = useState<File | null>(null);
  const [maximizedDoc, setMaximizedDoc] = useState<LibraryDocument | null>(null);


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

  // Listen for global window drag-and-drop events
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer?.types.includes("Files")) {
        setIsWindowDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (
        e.clientX <= 0 ||
        e.clientY <= 0 ||
        e.clientX >= window.innerWidth ||
        e.clientY >= window.innerHeight
      ) {
        setIsWindowDragging(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsWindowDragging(false);

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        setDraggedFile(files[0]);
        setUploadOpen(true);
      }
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
    ? t("dashboardAllMaterialsHeader")
    : categories.find(c => c.id === activeCategory)?.name ?? t("dashboardDefaultHeader");

  return (
    <div className="relative z-10 min-h-screen text-[var(--fg)]">
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
                <X size={12} /> {t("dashboardClearFilters")}
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
                    onSelect={() => setMaximizedDoc(doc)}
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

      <UploadDialog
        categories={categories}
        onClose={() => { setUploadOpen(false); setDraggedFile(null); }}
        onUploaded={silentRefresh}
        open={uploadOpen}
        session={session}
        initialFile={draggedFile}
      />
      <EditDocumentDialog
        categories={categories}
        document={editing}
        onClose={() => setEditing(null)}
        onSaved={u => { handleUpdated(u); setEditing(null); }}
      />
      <DocumentViewDialog
        document={maximizedDoc}
        open={maximizedDoc !== null}
        onClose={() => setMaximizedDoc(null)}
        isOwner={maximizedDoc ? maximizedDoc.owner_id === session.user.id : false}
        onEdit={() => { if (maximizedDoc) { setEditing(maximizedDoc); setMaximizedDoc(null); } }}
        onDeleted={(id) => { handleDelete(id); setMaximizedDoc(null); }}
        onUpdated={(doc) => { handleUpdated(doc); setMaximizedDoc(doc); }}
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
            <p className="text-sm text-[var(--fg-2)] leading-relaxed">
              {t("dashboardDragOverlayDesc")}
            </p>
            <span className="mono text-[10px] uppercase tracking-wider text-[var(--fg-3)]">
              {t("dashboardDragOverlayLimit")}
            </span>
          </div>
        </div>
      )}
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
      <AdminPanel
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        session={session}
      />
      <GrantRoleDialog
        open={grantOpen}
        onClose={() => setGrantOpen(false)}
        onGranted={() => { setGrantOpen(false); silentRefresh(); }}
      />
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
