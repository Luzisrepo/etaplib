export type Role = "member" | "teacher" | "admin";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: Role;
  created_at: string;
  updated_at: string;
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
