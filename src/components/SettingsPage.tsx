"use client";

import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  BookMarked,
  ChevronRight,
  Globe,
  Key,
  LayoutDashboard,
  Lock,
  Moon,
  Palette,
  Save,
  Search,
  Settings,
  Shield,
  Trash2,
  User,
  UserCheck,
  Bell,
  Download,
  Edit,
  Eye,
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  LogOut,
  Mail,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Image,
  Camera,
  X,
  ChevronDown,
  ChevronUp,
  Sun,
  Contrast,
  Move,
  Type,
  SlidersHorizontal,
  Languages,
  Clock,
  MapPin,
  HardDrive,
  Database,
  WifiOff,
  Activity,
  Zap,
  Grid,
  List,
  BookOpen,
  Star,
  Filter,
  History,
  ShieldCheck,
  UserPlus,
  FileText,
  Archive,
  ExternalLink,
  Copy,
  AlertTriangle,
  Info,
  RotateCcw,
  Hash,
  Tag,
  FolderOpen,
  Heart,
  Bookmark,
  Plus,
  Minus,
  ArrowUpDown,
  MoreHorizontal,
  Settings2,
  UserCog,
  Palette as PaletteIcon,
  LockKeyhole,
  EyeOff,
  SearchCheck,
  Layers,
  Globe2,
  MoonStar,
  SunMedium,
  Paintbrush,
  Droplet,
  Sparkles,
  Wand2,
  BadgePercent,
  Medal,
  Trophy,
  Award,
  Target,
  Flag,
  Map,
  Compass,
  Anchor,
  BellRing,
  BellOff,
  MessageSquare,
  MailCheck,
  MailX,
  ShieldAlert,
  KeyRound,
  Fingerprint,
  ScanEye,
  LockOpen,
  Unlock,
  RefreshCw,
  History as HistoryIcon,
  Clock1,
  Calendar,
  CalendarDays,
  CalendarRange,
  Sunrise,
  Sunset,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  Wind,
  Thermometer,
  Droplets,
  Umbrella,
  Sun as SunIcon,
  Moon as MoonIcon,
  Star as StarIcon,
  Zap as ZapIcon,
  Flame,
  Leaf,
  TreePine,
  Mountain,
  Waves,
  Droplet as DropletIcon,
  Cloud as CloudIcon,
  Rainbow,
  Sparkle,
  Gem,
  Diamond,
  Circle,
  Square,
  Triangle,
  Hexagon,
  Octagon,
  Pentagon,
  Heptagon,
  Nonagon,
  Decagon,
} from "lucide-react";

import {
  applySettings,
  AppSettings,
  DEFAULT_SETTINGS,
  FONT_SIZES,
  FONTS,
  LAYOUT_DENSITIES,
  ACCENT_COLOR_PRESETS,
  THEMES,
  loadSettings,
  saveSettings,
  type EffectSettings,
  type FontId,
  type FontSize,
  type LayoutDensity,
  type ThemeDef,
  type ThemeId,
  type AccentColorPreset,
  themeCategory,
} from "@/lib/settings";

import { supabase } from "@/lib/supabase";
import type {
  Profile,
  UserSettings,
  SavedSearch,
  ReadingList,
  UserSession,
  LoginHistory,
  AccountDeletionRequest,
  DataExportRequest,
  ThemeCategory,
} from "@/lib/types";

import { useLanguage } from "@/lib/language-context";
import { cn, getInitials, formatBytes, formatDate } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea, Select, SelectOption } from "@/components/ui/field";
import { Toggle } from "@/components/ui/toggle";
import { Slider } from "@/components/ui/slider";
import { StatusCallout } from "@/components/ui/status-callout";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Toast, useToast } from "@/components/toast";

import { ProfileSection } from "@/components/settings/ProfileSection";
import { AccountSection } from "@/components/settings/AccountSection";
import { AppearanceSection } from "@/components/settings/AppearanceSection";
import { PrivacySection } from "@/components/settings/PrivacySection";
import { LibraryPreferencesSection } from "@/components/settings/LibraryPreferencesSection";
import { SecuritySection } from "@/components/settings/SecuritySection";
import { LanguageRegionSection } from "@/components/settings/LanguageRegionSection";

type SettingsTab = 
  | "profile" 
  | "account" 
  | "appearance" 
  | "privacy" 
  | "library" 
  | "security" 
  | "language";

const TABS: { id: SettingsTab; label: string; icon: React.ReactNode; description: string }[] = [
  { 
    id: "profile", 
    label: "settingsTabProfile", 
    icon: <User size={18} />, 
    description: "settingsTabProfileDesc" 
  },
  { 
    id: "account", 
    label: "settingsTabAccount", 
    icon: <Settings2 size={18} />, 
    description: "settingsTabAccountDesc" 
  },
  { 
    id: "appearance", 
    label: "settingsTabAppearance", 
    icon: <PaletteIcon size={18} />, 
    description: "settingsTabAppearanceDesc" 
  },
  { 
    id: "privacy", 
    label: "settingsTabPrivacy", 
    icon: <ShieldAlert size={18} />, 
    description: "settingsTabPrivacyDesc" 
  },
  { 
    id: "library", 
    label: "settingsTabLibrary", 
    icon: <BookOpen size={18} />, 
    description: "settingsTabLibraryDesc" 
  },
  { 
    id: "security", 
    label: "settingsTabSecurity", 
    icon: <LockKeyhole size={18} />, 
    description: "settingsTabSecurityDesc" 
  },
  { 
    id: "language", 
    label: "settingsTabLanguage", 
    icon: <Globe2 size={18} />, 
    description: "settingsTabLanguageDesc" 
  },
];

interface SettingsPageProps {
  session: Session;
  profile: Profile | null;
  onClose?: () => void;
}

export function SettingsPage({ session, profile, onClose }: SettingsPageProps) {
  const { t, setLanguage } = useLanguage();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<SettingsTab | null>(null);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [readingLists, setReadingLists] = useState<ReadingList[]>([]);
  const [deletionRequest, setDeletionRequest] = useState<AccountDeletionRequest | null>(null);
  const [exportRequest, setExportRequest] = useState<DataExportRequest | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load all data on mount
  useEffect(() => {
    loadAllData();
  }, [session]);

  // Load settings from localStorage on tab change to appearance
  useEffect(() => {
    if (activeTab === "appearance") {
      setSettings(loadSettings());
    }
  }, [activeTab]);

  async function loadAllData() {
    setLoading(true);
    try {
      // Load user settings from database
      const { data: usData } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (usData) {
        setUserSettings(usData as UserSettings);
        // Apply synced settings to local state
        setSettings(prev => ({
          ...prev,
          theme: usData.theme_id as ThemeId,
          font: usData.font_id as FontId,
          fontSize: usData.font_size as FontSize,
          language: usData.language as "pt" | "en",
          effects: {
            ...prev.effects,
            reduceMotion: usData.reduce_motion,
            animationSpeed: usData.animation_speed,
            particleDensity: usData.particle_density as EffectSettings["particleDensity"],
            panelBlur: usData.panel_blur,
            backgroundDim: usData.background_dim,
            showOnLanding: usData.show_effects_on_landing,
          },
        }));
      }

      // Load sessions
      const { data: sessionsData } = await supabase
        .from("user_sessions")
        .select("*")
        .eq("user_id", session.user.id)
        .order("last_active_at", { ascending: false });
      if (sessionsData) setSessions(sessionsData as UserSession[]);

      // Load login history
      const { data: historyData } = await supabase
        .from("login_history")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (historyData) setLoginHistory(historyData as LoginHistory[]);

      // Load saved searches
      const { data: searchesData } = await supabase
        .from("saved_searches")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      if (searchesData) setSavedSearches(searchesData as SavedSearch[]);

      // Load reading lists
      const { data: listsData } = await supabase
        .from("reading_lists")
        .select("*")
        .eq("user_id", session.user.id)
        .order("sort_order", { ascending: true });
      if (listsData) setReadingLists(listsData as ReadingList[]);

      // Check for pending deletion request
      const { data: delData } = await supabase
        .from("account_deletion_requests")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("status", "pending")
        .single();
      if (delData) setDeletionRequest(delData as AccountDeletionRequest);

      // Check for pending export request
      const { data: expData } = await supabase
        .from("data_export_requests")
        .select("*")
        .eq("user_id", session.user.id)
        .in("status", ["pending", "processing"])
        .order("created_at", { ascending: false })
        .limit(1);
      if (expData && expData.length > 0) setExportRequest(expData[0] as DataExportRequest);

    } catch (error) {
      console.error("Error loading settings data:", error);
      toast("error", t("settingsLoadError"));
    } finally {
      setLoading(false);
    }
  }

  async function saveUserSettings(category: SettingsTab, updates: Partial<UserSettings>) {
    setSaving(category);
    try {
      const { error } = await supabase
        .from("user_settings")
        .upsert({
          user_id: session.user.id,
          ...updates,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setUserSettings(prev => prev ? { ...prev, ...updates } : null);
      toast("success", t("settingsSaved"));
    } catch (error) {
      console.error("Error saving settings:", error);
      toast("error", t("settingsSaveError"));
    } finally {
      setSaving(null);
    }
  }

  async function handleAvatarChange(file: File | null) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast("error", t("avatarSizeError"));
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast("error", t("avatarFormatError"));
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${session.user.id}/avatar-${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("documents")
        .upload(path, file, { cacheControl: "3600", upsert: true, contentType: file.type });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);
      const newAvatarUrl = urlData.publicUrl;

      // Update auth metadata
      const { error: metaErr } = await supabase.auth.updateUser({
        data: { avatar_url: newAvatarUrl },
      });
      if (metaErr) throw metaErr;

      // Update profiles table
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ avatar_url: newAvatarUrl })
        .eq("id", session.user.id);
      if (profileErr) throw profileErr;

      toast("success", t("avatarUpdated"));
    } catch (error) {
      console.error("Avatar upload error:", error);
      toast("error", t("avatarUploadError"));
    }
  }

  async function handleProfileUpdate(updates: Partial<Profile>) {
    try {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", session.user.id);
      if (error) throw error;

      // Update auth metadata for name
      if (updates.full_name) {
        await supabase.auth.updateUser({ data: { full_name: updates.full_name } });
      }

      toast("success", t("profileUpdated"));
      // Reload profile would be handled by parent
    } catch (error) {
      console.error("Profile update error:", error);
      toast("error", t("profileUpdateError"));
    }
  }

  async function revokeSession(sessionId: string, token: string) {
    try {
      const { error } = await supabase
        .from("user_sessions")
        .update({ revoked_at: new Date().toISOString(), is_current: false })
        .eq("id", sessionId);
      if (error) throw error;

      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, revoked_at: new Date().toISOString(), is_current: false } : s
      ));
      toast("success", t("sessionRevoked"));
    } catch (error) {
      toast("error", t("sessionRevokeError"));
    }
  }

  async function revokeAllOtherSessions(currentToken: string) {
    try {
      const { error } = await supabase.rpc("revoke_other_sessions", {
        p_user_id: session.user.id,
        p_current_token: currentToken,
      });
      if (error) throw error;

      await loadAllData();
      toast("success", t("allSessionsRevoked"));
    } catch (error) {
      toast("error", t("sessionRevokeError"));
    }
  }

  async function requestAccountDeletion() {
    if (deleteConfirmText !== "ELIMINAR") {
      toast("error", t("deleteConfirmMismatch"));
      return;
    }

    try {
      const { error } = await supabase
        .from("account_deletion_requests")
        .insert({
          user_id: session.user.id,
          reason: "User requested account deletion",
          confirmation_token: crypto.randomUUID(),
          confirmation_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });
      if (error) throw error;

      setShowDeleteConfirm(false);
      setDeleteConfirmText("");
      toast("success", t("deletionRequested"));
      loadAllData();
    } catch (error) {
      toast("error", t("deletionRequestError"));
    }
  }

  async function cancelDeletionRequest() {
    if (!deletionRequest) return;
    try {
      const { error } = await supabase
        .from("account_deletion_requests")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("id", deletionRequest.id);
      if (error) throw error;

      setDeletionRequest(null);
      toast("success", t("deletionCancelled"));
    } catch (error) {
      toast("error", t("deletionCancelError"));
    }
  }

  async function requestDataExport() {
    try {
      const { error } = await supabase
        .from("data_export_requests")
        .insert({
          user_id: session.user.id,
          requested_data: ["profile", "documents", "settings", "sessions", "login_history", "saved_searches", "reading_lists"],
        });
      if (error) throw error;

      toast("success", t("exportRequested"));
      loadAllData();
    } catch (error) {
      toast("error", t("exportRequestError"));
    }
  }

  async function handleAppearanceChange(key: keyof AppSettings, value: any) {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    applySettings(newSettings);
    saveSettings(newSettings);
    
    // Also sync to database
    const dbUpdates: Partial<UserSettings> = {};
    if (key === "theme") dbUpdates.theme_id = value;
    else if (key === "font") dbUpdates.font_id = value;
    else if (key === "fontSize") dbUpdates.font_size = value;
    else if (key === "language") dbUpdates.language = value;
    
    if (Object.keys(dbUpdates).length > 0) {
      await saveUserSettings("appearance", dbUpdates);
    }
    
    window.dispatchEvent(new Event("etap-settings-changed"));
  }

  async function handleEffectsChange(patch: Partial<EffectSettings>) {
    const newEffects = { ...settings.effects, ...patch };
    const newSettings = { ...settings, effects: newEffects };
    setSettings(newSettings);
    applySettings(newSettings);
    saveSettings(newSettings);
    
    // Sync to database
    const dbUpdates: Partial<UserSettings> = {};
    if (patch.reduceMotion !== undefined) dbUpdates.reduce_motion = patch.reduceMotion;
    if (patch.animationSpeed !== undefined) dbUpdates.animation_speed = patch.animationSpeed;
    if (patch.particleDensity !== undefined) dbUpdates.particle_density = patch.particleDensity;
    if (patch.panelBlur !== undefined) dbUpdates.panel_blur = patch.panelBlur;
    if (patch.backgroundDim !== undefined) dbUpdates.background_dim = patch.backgroundDim;
    if (patch.showOnLanding !== undefined) dbUpdates.show_effects_on_landing = patch.showOnLanding;
    
    if (Object.keys(dbUpdates).length > 0) {
      await saveUserSettings("appearance", dbUpdates);
    }
    
    window.dispatchEvent(new Event("etap-settings-changed"));
  }

  const currentAvatar = avatarPreview || profile?.avatar_url;
  const initials = getInitials(session.user.email || "", profile?.full_name || "");
  const displayName = profile?.full_name || session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Utilizador";

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-lg border border-[var(--border)] bg-[var(--bg-2)]">
            <Settings size={24} className="text-[var(--accent)] animate-spin" />
          </div>
          <p className="mono text-xs text-[var(--fg-2] uppercase tracking-widest">{t("loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--bg-2)] sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onClose}
                className="lg:hidden focus-ring grid h-10 w-10 place-items-center rounded-md text-[var(--fg-3)] hover:bg-[var(--bg-3)] hover:text-[var(--fg)]"
                aria-label={t("close")}
              >
                <X size={20} />
              </button>
              <div>
                <h1 className="text-xl font-bold text-[var(--fg)]">{t("settingsTitle")}</h1>
                <p className="mono text-xs text-[var(--fg-2)] uppercase tracking-wider">{t("settingsSubtitle")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="mono text-xs">
                {t("settingsVersion")} 2.0
              </Badge>
            </div>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="border-t border-[var(--border)]">
          <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label={t("settingsTabsLabel")}>
            <div className="flex overflow-x-auto gap-1 pb-4" role="tablist">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`panel-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 px-4 py-3 rounded-lg border transition-all duration-150 whitespace-nowrap focus-ring",
                    activeTab === tab.id
                      ? "border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent)]"
                      : "border-transparent text-[var(--fg-2)] hover:bg-[var(--bg-3)] hover:text-[var(--fg)]"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {tab.icon}
                    <span className="font-medium text-sm">{t(tab.label)}</span>
                  </div>
                  <span className="mono text-[10px] text-[var(--fg-3)] hidden sm:block">{t(tab.description)}</span>
                </button>
              ))}
            </div>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
          {activeTab === "profile" && (
            <ProfileSection
              profile={profile}
              session={session}
              avatar={currentAvatar}
              initials={initials}
              displayName={displayName}
              onAvatarChange={handleAvatarChange}
              onProfileUpdate={handleProfileUpdate}
              fileInputRef={fileInputRef}
              t={t}
            />
          )}

          {activeTab === "account" && (
            <AccountSection
              session={session}
              profile={profile}
              userSettings={userSettings}
              deletionRequest={deletionRequest}
              exportRequest={exportRequest}
              showDeleteConfirm={showDeleteConfirm}
              setShowDeleteConfirm={setShowDeleteConfirm}
              deleteConfirmText={deleteConfirmText}
              setDeleteConfirmText={setDeleteConfirmText}
              onRequestDeletion={requestAccountDeletion}
              onCancelDeletion={cancelDeletionRequest}
              onRequestExport={requestDataExport}
              onSave={saveUserSettings}
              t={t}
            />
          )}

          {activeTab === "appearance" && (
            <AppearanceSection
              settings={settings}
              themes={THEMES}
              fonts={FONTS}
              fontSizes={FONT_SIZES}
              layoutDensities={LAYOUT_DENSITIES}
              accentPresets={ACCENT_COLOR_PRESETS}
              onChange={handleAppearanceChange}
              onEffectsChange={handleEffectsChange}
              t={t}
            />
          )}

          {activeTab === "privacy" && (
            <PrivacySection
              profile={profile}
              userSettings={userSettings}
              sessions={sessions}
              loginHistory={loginHistory}
              onRevokeSession={revokeSession}
              onRevokeAllOthers={revokeAllOtherSessions}
              onSave={saveUserSettings}
              t={t}
            />
          )}

          {activeTab === "library" && (
            <LibraryPreferencesSection
              userSettings={userSettings}
              savedSearches={savedSearches}
              readingLists={readingLists}
              onSave={saveUserSettings}
              t={t}
            />
          )}

          {activeTab === "security" && (
            <SecuritySection
              session={session}
              profile={profile}
              userSettings={userSettings}
              sessions={sessions}
              loginHistory={loginHistory}
              onRevokeSession={revokeSession}
              onRevokeAllOthers={revokeAllOtherSessions}
              onSave={saveUserSettings}
              t={t}
            />
          )}

          {activeTab === "language" && (
            <LanguageRegionSection
              userSettings={userSettings}
              profile={profile}
              onSave={saveUserSettings}
              onLanguageChange={setLanguage}
              t={t}
            />
          )}
        </div>
      </main>
    </div>
  );
}