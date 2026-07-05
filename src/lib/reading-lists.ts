"use client";

import { supabase } from "./supabase";
import type { ReadingListWithDocs, LibraryDocument } from "./types";

/**
 * Fetches all reading lists with category info and owner details.
 */
export async function fetchReadingLists(): Promise<ReadingListWithDocs[]> {
  const { data, error } = await supabase
    .from("reading_lists")
    .select(`
      *,
      category:categories(*),
      owner:profiles(email, full_name)
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Fetch document links for all lists to populate document counts/details
  const lists = data as unknown as ReadingListWithDocs[];
  for (const list of lists) {
    const { data: links } = await supabase
      .from("reading_list_documents")
      .select("document_id")
      .eq("reading_list_id", list.id);
    list.documents = (links || []).map(l => ({ id: l.document_id }) as LibraryDocument);
  }

  return lists;
}

/**
 * Fetches full details of a reading list, including its mapped documents.
 */
export async function fetchReadingListDetails(listId: string): Promise<ReadingListWithDocs> {
  const { data: list, error: listErr } = await supabase
    .from("reading_lists")
    .select(`
      *,
      category:categories(*),
      owner:profiles(email, full_name)
    `)
    .eq("id", listId)
    .single();

  if (listErr) throw listErr;

  const { data: links, error: linkErr } = await supabase
    .from("reading_list_documents")
    .select(`
      document:documents(
        *,
        category:categories(*),
        owner:profiles(id, email, full_name, avatar_url, role)
      )
    `)
    .eq("reading_list_id", listId);

  if (linkErr) throw linkErr;

  const documents = (links || [])
    .map((l: any) => l.document)
    .filter(Boolean) as LibraryDocument[];

  return {
    ...(list as unknown as ReadingListWithDocs),
    documents,
  };
}

/**
 * Creates a new reading list.
 */
export async function createReadingList(
  name: string,
  description: string | null,
  categoryId: string | null,
  isRequired: boolean,
  userId: string
): Promise<ReadingListWithDocs> {
  const { data, error } = await supabase
    .from("reading_lists")
    .insert({
      name,
      description: description || null,
      category_id: categoryId || null,
      is_required: isRequired,
      user_id: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data as unknown as ReadingListWithDocs;
}

/**
 * Updates an existing reading list.
 */
export async function updateReadingList(
  listId: string,
  name: string,
  description: string | null,
  categoryId: string | null,
  isRequired: boolean
): Promise<void> {
  const { error } = await supabase
    .from("reading_lists")
    .update({
      name,
      description: description || null,
      category_id: categoryId || null,
      is_required: isRequired,
    })
    .eq("id", listId);

  if (error) throw error;
}

/**
 * Deletes a reading list.
 */
export async function deleteReadingList(listId: string): Promise<void> {
  const { error } = await supabase
    .from("reading_lists")
    .delete()
    .eq("id", listId);

  if (error) throw error;
}

/**
 * Syncs the documents in a reading list (adds missing, removes extra).
 */
export async function syncReadingListDocuments(
  listId: string,
  documentIds: string[]
): Promise<void> {
  // Fetch existing links
  const { data: existing, error: fetchErr } = await supabase
    .from("reading_list_documents")
    .select("document_id")
    .eq("reading_list_id", listId);

  if (fetchErr) throw fetchErr;

  const currentIds = (existing || []).map(e => e.document_id);

  const toAdd = documentIds.filter(id => !currentIds.includes(id));
  const toDelete = currentIds.filter(id => !documentIds.includes(id));

  // Deletions
  if (toDelete.length > 0) {
    const { error: delErr } = await supabase
      .from("reading_list_documents")
      .delete()
      .eq("reading_list_id", listId)
      .in("document_id", toDelete);
    if (delErr) throw delErr;
  }

  // Additions
  if (toAdd.length > 0) {
    const rows = toAdd.map(docId => ({
      reading_list_id: listId,
      document_id: docId,
    }));
    const { error: insErr } = await supabase
      .from("reading_list_documents")
      .insert(rows);
    if (insErr) throw insErr;
  }
}
