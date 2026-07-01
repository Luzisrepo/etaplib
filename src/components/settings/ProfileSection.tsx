"use client";

import { useRef, useState } from "react";
import type { Profile, Session } from "@/lib/types";
import { Camera, Check, Loader2, User, X, Image as ImageIcon, Edit2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { StatusCallout } from "@/components/ui/status-callout";
import { cn, getInitials } from "@/lib/utils";

interface ProfileSectionProps {
  profile: Profile | null;
  session: Session;
  avatar: string | null;
  initials: string;
  displayName: string;
  onAvatarChange: (file: File | null) => void;
  onProfileUpdate: (updates: Partial<Profile>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  t: (key: string) => string;
}

export function ProfileSection({
  profile,
  session,
  avatar,
  initials,
  displayName,
  onAvatarChange,
  onProfileUpdate,
  fileInputRef,
  t,
}: ProfileSectionProps) {
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [studentId, setStudentId] = useState(profile?.student_id || "");
  const [course, setCourse] = useState(profile?.course || "");
  const [year, setYear] = useState(profile?.year?.toString() || "");
  const [faculty, setFaculty] = useState(profile?.faculty || "");
  const [enrollmentYear, setEnrollmentYear] = useState(profile?.enrollment_year?.toString() || "");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError(t("avatarSizeError"));
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError(t("avatarFormatError"));
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setError(null);
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    setLoading(true);
    setError(null);
    try {
      await onAvatarChange(avatarFile);
      setAvatarFile(null);
      setAvatarPreview(null);
      fileInputRef.current!.value = "";
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError(t("avatarUploadError"));
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSave = async () => {
    setLoading(true);
    setError(null);
    try {
      await onProfileUpdate({
        full_name: fullName.trim() || session.user.email?.split("@")[0],
        bio: bio.trim() || null,
        student_id: studentId.trim() || null,
        course: course.trim() || null,
        year: year ? parseInt(year) : null,
        faculty: faculty.trim() || null,
        enrollment_year: enrollmentYear ? parseInt(enrollmentYear) : null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError(t("profileUpdateError"));
    } finally {
      setLoading(false);
    }
  };

  const displayAvatar = avatarPreview || avatar;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Profile Header Card */}
      <Card className="overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center sm:items-start gap-4 w-full sm:w-auto">
              <div className="relative">
                <div className={cn(
                  "h-24 w-24 sm:h-32 sm:w-32 rounded-full border-4 border-[var(--border)] overflow-hidden bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] flex items-center justify-center text-white font-bold",
                  "text-3xl sm:text-4xl"
                )}>
                  {displayAvatar ? (
                    <img src={displayAvatar} alt={t("avatarAlt")} className="h-full w-full object-cover" />
                  ) : (
                    <span className="mono">{initials}</span>
                  )}
                </div>
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="absolute bottom-0 right-0 grid h-10 w-10 place-items-center rounded-full border border-[var(--border)] bg-[var(--bg-2)] text-[var(--accent)] shadow-lg transition-all hover:bg-[var(--bg-3)] hover:scale-105 focus-ring disabled:opacity-50"
                  aria-label={t("changeAvatar")}
                >
                  <Camera size={20} />
                </button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  className="sr-only"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleAvatarSelect}
                />
              </div>

              <div className="flex flex-col items-center sm:items-start gap-2 text-center sm:text-left">
                <p className="mono text-xs text-[var(--fg-2)]">{t("avatarFormats")}</p>
                {avatarFile && (
                  <Button size="sm" variant="secondary" onClick={handleAvatarUpload} disabled={loading}>
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {loading ? t("uploading") : t("saveAvatar")}
                  </Button>
                )}
              </div>
            </div>

            {/* Profile Info Form */}
            <div className="flex-1 space-y-4 w-full">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("displayName")}>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t("displayNamePlaceholder")}
                    disabled={loading}
                  />
                </Field>

                <Field label={t("email")}>
                  <Input value={session.user.email || ""} disabled />
                </Field>
              </div>

              <Field label={t("bio")}>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder={t("bioPlaceholder")}
                  rows={3}
                  disabled={loading}
                  maxLength={500}
                />
                <p className="mono text-xs text-[var(--fg-3)] text-right">{bio.length}/500</p>
              </Field>

              {/* Student Information */}
              <div className="pt-4 border-t border-[var(--border)]">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--fg)] mb-4">
                  <User size={16} className="text-[var(--accent)]" />
                  {t("studentInfo")}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t("studentId")}>
                    <Input
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      placeholder={t("studentIdPlaceholder")}
                      disabled={loading}
                    />
                  </Field>
                  <Field label={t("course")}>
                    <Input
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                      placeholder={t("coursePlaceholder")}
                      disabled={loading}
                    />
                  </Field>
                  <Field label={t("year")}>
                    <Input
                      type="number"
                      min={1}
                      max={6}
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      placeholder={t("yearPlaceholder")}
                      disabled={loading}
                    />
                  </Field>
                  <Field label={t("faculty")}>
                    <Input
                      value={faculty}
                      onChange={(e) => setFaculty(e.target.value)}
                      placeholder={t("facultyPlaceholder")}
                      disabled={loading}
                    />
                  </Field>
                  <Field label={t("enrollmentYear")} className="sm:col-span-2">
                    <Input
                      type="number"
                      min={2000}
                      max={new Date().getFullYear()}
                      value={enrollmentYear}
                      onChange={(e) => setEnrollmentYear(e.target.value)}
                      placeholder={t("enrollmentYearPlaceholder")}
                      disabled={loading}
                    />
                  </Field>
                </div>
              </div>

              {/* Profile Visibility Preview */}
              <div className="pt-4 border-t border-[var(--border)]">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile?.is_profile_public ?? true}
                    onChange={(e) => onProfileUpdate({ is_profile_public: e.target.checked })}
                    disabled={loading}
                    className="h-4 w-4 rounded border-[var(--border)] bg-[var(--bg)] text-[var(--accent)] focus:ring-[var(--accent)]"
                  />
                  <span className="text-sm font-medium text-[var(--fg)]">{t("publicProfile")}</span>
                </label>
                <p className="mono text-xs text-[var(--fg-2)] ml-7 mt-1">{t("publicProfileDesc")}</p>
              </div>

              {error && <StatusCallout kind="error">{error}</StatusCallout>}
              {saved && <StatusCallout kind="success">{t("profileSaved")}</StatusCallout>}

              <div className="flex justify-end pt-4 border-t border-[var(--border)]">
                <Button onClick={handleProfileSave} disabled={loading} size="lg">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {loading ? t("saving") : t("saveChanges")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Profile Preview Card */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--fg)]">{t("profilePreview")}</h2>
            <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)}>
              {showPreview ? <X size={16} /> : <Eye size={16} />}
              {showPreview ? t("hidePreview") : t("showPreview")}
            </Button>
          </div>

          {showPreview && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-2)] p-6">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "h-16 w-16 rounded-full border-2 border-[var(--border)] overflow-hidden bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] flex items-center justify-center text-white font-bold text-xl"
                )}>
                  {displayAvatar ? (
                    <img src={displayAvatar} alt={t("avatarAlt")} className="h-full w-full object-cover" />
                  ) : (
                    <span className="mono">{initials}</span>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--fg)]">{fullName || displayName}</h3>
                  <p className="mono text-sm text-[var(--fg-2)]">{session.user.email}</p>
                  {profile?.role && profile.role !== "member" && (
                    <span className="mono text-xs font-bold uppercase tracking-wide mt-1 inline-block px-2 py-0.5 rounded bg-[var(--accent-bg)] text-[var(--accent)]">
                      {profile.role}
                    </span>
                  )}
                </div>
              </div>

              {bio && (
                <div className="mt-4 pt-4 border-t border-[var(--border)]">
                  <p className="text-sm text-[var(--fg-2)]">{t("bioLabel")}</p>
                  <p className="text-[var(--fg)] whitespace-pre-wrap mt-1">{bio}</p>
                </div>
              )}

              {(studentId || course || year || faculty) && (
                <div className="mt-4 pt-4 border-t border-[var(--border)] grid gap-2 sm:grid-cols-2">
                  {studentId && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[var(--fg-2)]">{t("studentId")}:</span>
                      <span className="font-medium text-[var(--fg)]">{studentId}</span>
                    </div>
                  )}
                  {course && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[var(--fg-2)]">{t("course")}:</span>
                      <span className="font-medium text-[var(--fg)]">{course}</span>
                    </div>
                  )}
                  {year && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[var(--fg-2)]">{t("year")}:</span>
                      <span className="font-medium text-[var(--fg)]">{year}º {t("yearSuffix")}</span>
                    </div>
                  )}
                  {faculty && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-[var(--fg-2)]">{t("faculty")}:</span>
                      <span className="font-medium text-[var(--fg)]">{faculty}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}