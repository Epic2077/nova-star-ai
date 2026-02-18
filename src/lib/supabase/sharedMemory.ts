/**
 * Server-side helpers for the `shared_memories` table.
 *
 * Cross-chat memory visible to both partners. AI-only editable.
 * Only the service role can INSERT/UPDATE/DELETE.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  SharedMemoryRow,
  SharedMemoryCategory,
} from "@/types/sharedMemory";

/* ------------------------------------------------------------------ */
/*  Fetch active memories for a partnership                            */
/* ------------------------------------------------------------------ */

/**
 * Load all active shared memories for a given partnership.
 * Returns them ordered by category then recency.
 */
export async function fetchSharedMemories(
  supabase: SupabaseClient,
  partnershipId: string,
): Promise<SharedMemoryRow[]> {
  const { data, error } = await supabase
    .from("shared_memories")
    .select("*")
    .eq("partnership_id", partnershipId)
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchSharedMemories error:", error);
    return [];
  }

  return (data ?? []) as SharedMemoryRow[];
}

/* ------------------------------------------------------------------ */
/*  Format memories into a prompt-injectable string                    */
/* ------------------------------------------------------------------ */

/** Category labels for the prompt. */
const CATEGORY_LABELS: Record<SharedMemoryCategory, string> = {
  preference: "Preferences",
  emotional_need: "Emotional Needs",
  important_date: "Important Dates",
  gift_idea: "Gift Ideas",
  growth_moment: "Growth Moments",
  pattern: "Patterns",
  general: "General",
};

/**
 * Format shared memories into a readable string for the system prompt.
 * Groups by category and marks low-confidence items.
 */
export function formatSharedMemories(memories: SharedMemoryRow[]): string {
  if (memories.length === 0) return "";

  const grouped = new Map<SharedMemoryCategory, SharedMemoryRow[]>();

  for (const m of memories) {
    const list = grouped.get(m.category) ?? [];
    list.push(m);
    grouped.set(m.category, list);
  }

  let result = `\n\nSHARED MEMORIES (cross-chat, AI-maintained):\n`;

  for (const [category, items] of grouped) {
    result += `\n${CATEGORY_LABELS[category]}:\n`;
    for (const item of items) {
      const tag = item.confidence < 0.7 ? " (uncertain)" : "";
      result += `- ${item.content}${tag}\n`;
    }
  }

  return result;
}

/* ------------------------------------------------------------------ */
/*  Insert a new memory                                                */
/* ------------------------------------------------------------------ */

export async function insertSharedMemory(
  supabase: SupabaseClient,
  memory: {
    partnershipId: string;
    category: SharedMemoryCategory;
    aboutUser?: string | null;
    content: string;
    confidence?: number;
    sourceMessageId?: string | null;
  },
): Promise<SharedMemoryRow | null> {
  const { data, error } = await supabase
    .from("shared_memories")
    .insert({
      partnership_id: memory.partnershipId,
      category: memory.category,
      about_user: memory.aboutUser ?? null,
      content: memory.content,
      confidence: memory.confidence ?? 1.0,
      source_message_id: memory.sourceMessageId ?? null,
    })
    .select("*")
    .single();

  if (error) {
    console.error("insertSharedMemory error:", error);
    return null;
  }

  return data as SharedMemoryRow;
}

/* ------------------------------------------------------------------ */
/*  Update an existing memory                                          */
/* ------------------------------------------------------------------ */

export async function updateSharedMemory(
  supabase: SupabaseClient,
  memoryId: string,
  updates: {
    content?: string;
    confidence?: number;
    isActive?: boolean;
    category?: SharedMemoryCategory;
  },
): Promise<void> {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.content !== undefined) payload.content = updates.content;
  if (updates.confidence !== undefined) payload.confidence = updates.confidence;
  if (updates.isActive !== undefined) payload.is_active = updates.isActive;
  if (updates.category !== undefined) payload.category = updates.category;

  const { error } = await supabase
    .from("shared_memories")
    .update(payload)
    .eq("id", memoryId);

  if (error) {
    console.error("updateSharedMemory error:", error);
  }
}

/* ------------------------------------------------------------------ */
/*  Soft-delete (deactivate) a memory                                  */
/* ------------------------------------------------------------------ */

export async function deactivateSharedMemory(
  supabase: SupabaseClient,
  memoryId: string,
): Promise<void> {
  await updateSharedMemory(supabase, memoryId, { isActive: false });
}
