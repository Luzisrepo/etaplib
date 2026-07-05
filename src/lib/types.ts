export type Role = "member" | "teacher" | "admin";

export type ProfileVisibility = "school" | "staff" | "private";

export type DefaultFilters = {
  categoryId: string | null;
  sortField: "created_at" | "title" | "file_size";
  sortDir: "asc" | "desc";
  viewMode: "comfortable" | "compact" | "grid";
};

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: Role;
  created_at: string;
  updated_at: string;
  bio: string | null;
  course: string | null;
  academic_year: string | null;
  class_group: string | null;
  profile_visibility: ProfileVisibility;
  show_reading_history: boolean;
  favorite_category_ids: string[];
  default_filters: DefaultFilters | null;
  deletion_requested_at: string | null;
};

export type SavedSearch = {
  id: string;
  user_id: string;
  label: string;
  query: string;
  category_id: string | null;
  tag: string | null;
  created_at: string;
};

export type ReadingList = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  is_required: boolean;
  created_at: string;
};

export type ReadingListWithDocs = ReadingList & {
  category?: Category | null;
  documents?: LibraryDocument[];
  owner?: { email: string; full_name: string | null } | null;
};

export type UserSession = {
  id: string;
  user_id: string;
  device_id: string;
  device_label: string | null;
  user_agent: string | null;
  created_at: string;
  last_seen_at: string;
};

export type LoginHistoryEntry = {
  id: string;
  user_id: string;
  occurred_at: string;
  device_label: string | null;
  user_agent: string | null;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  created_at: string;
};

export type DocumentRow = {
  id: string;
  owner_id: string;
  category_id: string | null;
  title: string;
  description: string | null;
  file_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  tags: string[];
  expiry_date: string | null;
  created_at: string;
  updated_at: string;
};

export type LibraryDocument = DocumentRow & {
  category: Category | null;
  owner: Pick<Profile, "id" | "email" | "full_name" | "avatar_url" | "role"> | null;
};

export type Invite = {
  email: string;
  role: Role;
  granted_by: string;
  granted_at: string;
  granted_by_profile: { email: string; full_name: string } | null;
};

export type UploadPayload = {
  file: File;
  title: string;
  description: string;
  categoryId: string | null;
  tags: string[];
};

/** Profile with a document count, as returned by `fetchUsers`. */
export type UserWithMeta = Profile & { doc_count: number };
