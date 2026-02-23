/**
 * Server-side helpers for the `shared_insights` table.
 *
 * AI-generated relationship insights visible to both partners.
 * Only the service role can INSERT/UPDATE.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  SharedInsightRow,
  SharedInsightCategory,
} from "@/types/sharedInsight";

/* ------------------------------------------------------------------ */
/*  Fetch active insights for a partnership                            */
/* ------------------------------------------------------------------ */

/**
 * Load all active insights for a given partnership.
 * Ordered by category then recency.
 */
export async function fetchSharedInsights(
  supabase: SupabaseClient,
  partnershipId: string,
): Promise<SharedInsightRow[]> {
  const { data, error } = await supabase
    .from("shared_insights")
    .select("*")
    .eq("partnership_id", partnershipId)
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchSharedInsights error:", error);
    return [];
  }

  return (data ?? []) as SharedInsightRow[];
}

/* ------------------------------------------------------------------ */
/*  Format insights into a prompt-injectable string                    */
/* ------------------------------------------------------------------ */

const CATEGORY_LABELS: Record<SharedInsightCategory, string> = {
  emotional_need: "Emotional Needs",
  communication: "Communication",
  appreciation: "Appreciation",
  conflict_style: "Conflict Style",
  growth_area: "Growth Areas",
  strength: "Strengths",
  gift_relevant: "Gift-Relevant",
};

/**
 * Format shared insights into a readable string for the system prompt.
 * Groups by category, includes title and confidence markers.
 */
export function formatSharedInsights(insights: SharedInsightRow[]): string {
  if (insights.length === 0) return "";

  const grouped = new Map<SharedInsightCategory, SharedInsightRow[]>();

  for (const i of insights) {
    const list = grouped.get(i.category) ?? [];
    list.push(i);
    grouped.set(i.category, list);
  }

  let result = `\n\nSHARED INSIGHTS (AI-generated, cross-chat):\n`;

  for (const [category, items] of grouped) {
    result += `\n${CATEGORY_LABELS[category]}:\n`;
    for (const item of items) {
      const tag = item.confidence < 0.7 ? " (uncertain)" : "";
      result += `- ${item.title}: ${item.content}${tag}\n`;
    }
  }

  return result;
}

/* ------------------------------------------------------------------ */
/*  Insert a new insight                                               */
/* ------------------------------------------------------------------ */

export async function insertSharedInsight(
  supabase: SupabaseClient,
  insight: {
    partnershipId: string;
    category: SharedInsightCategory;
    aboutUser?: string | null;
    title: string;
    content: string;
    confidence: number;
  },
): Promise<SharedInsightRow | null> {
  const { data, error } = await supabase
    .from("shared_insights")
    .insert({
      partnership_id: insight.partnershipId,
      category: insight.category,
      about_user: insight.aboutUser ?? null,
      title: insight.title,
      content: insight.content,
      confidence: insight.confidence,
    })
    .select("*")
    .single();

  if (error) {
    console.error("insertSharedInsight error:", error);
    return null;
  }

  return data as SharedInsightRow;
}

/* ------------------------------------------------------------------ */
/*  Update an existing insight                                         */
/* ------------------------------------------------------------------ */

export async function updateSharedInsight(
  supabase: SupabaseClient,
  insightId: string,
  updates: {
    title?: string;
    content?: string;
    confidence?: number;
    isActive?: boolean;
    category?: SharedInsightCategory;
  },
): Promise<void> {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.content !== undefined) payload.content = updates.content;
  if (updates.confidence !== undefined) payload.confidence = updates.confidence;
  if (updates.isActive !== undefined) payload.is_active = updates.isActive;
  if (updates.category !== undefined) payload.category = updates.category;

  const { error } = await supabase
    .from("shared_insights")
    .update(payload)
    .eq("id", insightId);

  if (error) {
    console.error("updateSharedInsight error:", error);
  }
}

/* ------------------------------------------------------------------ */
/*  Soft-delete (deactivate) an insight                                */
/* ------------------------------------------------------------------ */

export async function deactivateSharedInsight(
  supabase: SupabaseClient,
  insightId: string,
): Promise<void> {
  await updateSharedInsight(supabase, insightId, { isActive: false });
}
