"use client";

import { supabase } from "./supabase";

export type DownloadStatRaw = {
  id: string;
  downloaded_at: string;
  document: {
    id: string;
    title: string;
    file_size: number;
    category_id: string | null;
    category: {
      id: string;
      name: string;
      color: string;
    } | null;
  } | null;
};

export type DocumentAggregate = {
  id: string;
  title: string;
  count: number;
};

export type CategoryAggregate = {
  id: string;
  name: string;
  color: string;
  count: number;
};

export type AnalyticsResult = {
  totalDownloads: number;
  topDocuments: DocumentAggregate[];
  topCategories: CategoryAggregate[];
};

/**
 * Records a download event in the analytics table.
 */
export async function recordDownload(documentId: string, userId?: string): Promise<void> {
  try {
    const { error } = await supabase.from("document_downloads").insert({
      document_id: documentId,
      user_id: userId || null,
    });
    if (error) console.error("Error logging download:", error.message);
  } catch (err) {
    console.error("Failed to record download analytics:", err);
  }
}

/**
 * Fetches and aggregates download analytics for a specific time period.
 */
export async function fetchDownloadAnalytics(
  period: "7d" | "30d" | "90d" | "all"
): Promise<AnalyticsResult> {
  let query = supabase.from("document_downloads").select(`
    id,
    downloaded_at,
    document:documents(
      id,
      title,
      file_size,
      category_id,
      category:categories(id, name, color)
    )
  `);

  if (period !== "all") {
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - days);
    query = query.gte("downloaded_at", limitDate.toISOString());
  }

  const { data, error } = await query;
  if (error) throw error;

  const rawStats = (data || []) as unknown as DownloadStatRaw[];

  const docMap: Record<string, { title: string; count: number }> = {};
  const catMap: Record<string, { name: string; color: string; count: number }> = {};
  let totalDownloads = 0;

  for (const stat of rawStats) {
    if (!stat.document) continue;
    totalDownloads++;

    // Document Aggregation
    const docId = stat.document.id;
    if (!docMap[docId]) {
      docMap[docId] = { title: stat.document.title, count: 0 };
    }
    docMap[docId].count++;

    // Category Aggregation
    const cat = stat.document.category;
    if (cat) {
      if (!catMap[cat.id]) {
        catMap[cat.id] = { name: cat.name, color: cat.color, count: 0 };
      }
      catMap[cat.id].count++;
    } else {
      const noneId = "none";
      if (!catMap[noneId]) {
        catMap[noneId] = { name: "Sem Categoria", color: "#6e7681", count: 0 };
      }
      catMap[noneId].count++;
    }
  }

  const topDocuments: DocumentAggregate[] = Object.entries(docMap)
    .map(([id, val]) => ({ id, title: val.title, count: val.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topCategories: CategoryAggregate[] = Object.entries(catMap)
    .map(([id, val]) => ({ id, name: val.name, color: val.color, count: val.count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalDownloads,
    topDocuments,
    topCategories,
  };
}
