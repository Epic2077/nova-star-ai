/**
 * Server-side helpers for the `personal_memories` table.
 *
 * Per-user cross-chat memory — works independently of partnerships.
 * Only the service role can INSERT/UPDATE/DELETE.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PersonalMemoryRow,
  PersonalMemoryCategory,
} from "@/types/personalMemory";

/* ------------------------------------------------------------------ */
/*  Fetch active personal memories for a user                          */
/* ------------------------------------------------------------------ */

/**
 * Load all active personal memories for a given user.
 * Returns them ordered by category then recency.
 */
export async function fetchPersonalMemories(
  supabase: SupabaseClient,
  userId: string,
): Promise<PersonalMemoryRow[]> {
  const { data, error } = await supabase
    .from("personal_memories")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchPersonalMemories error:", error);
    return [];
  }

  return (data ?? []) as PersonalMemoryRow[];
}

/* ------------------------------------------------------------------ */
/*  Format memories into a prompt-injectable string                    */
/* ------------------------------------------------------------------ */

/** Category labels for the prompt. */
const CATEGORY_LABELS: Record<PersonalMemoryCategory, string> = {
  preference: "Preferences",
  emotional_need: "Emotional Needs",
  important_date: "Important Dates",
  growth_moment: "Growth Moments",
  pattern: "Patterns",
  goal: "Goals",
  general: "General",
};

/**
 * Format personal memories into a readable string for the system prompt.
 * Groups by category and marks low-confidence items.
 */
export function formatPersonalMemories(memories: PersonalMemoryRow[]): string {
  if (memories.length === 0) return "";

  const grouped = new Map<PersonalMemoryCategory, PersonalMemoryRow[]>();

  for (const m of memories) {
    const list = grouped.get(m.category) ?? [];
    list.push(m);
    grouped.set(m.category, list);
  }

  let result = `\n\nPERSONAL MEMORIES (cross-chat, AI-maintained, about this user):\n`;

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
/*  Insert a new personal memory                                       */
/* ------------------------------------------------------------------ */

export async function insertPersonalMemory(
  supabase: SupabaseClient,
  memory: {
    userId: string;
    category: PersonalMemoryCategory;
    content: string;
    confidence?: number;
    sourceMessageId?: string | null;
  },
): Promise<PersonalMemoryRow | null> {
  const { data, error } = await supabase
    .from("personal_memories")
    .insert({
      user_id: memory.userId,
      category: memory.category,
      content: memory.content,
      confidence: memory.confidence ?? 1.0,
      source_message_id: memory.sourceMessageId ?? null,
    })
    .select("*")
    .single();

  if (error) {
    console.error("insertPersonalMemory error:", error);
    return null;
  }

  return data as PersonalMemoryRow;
}

/* ------------------------------------------------------------------ */
/*  Update an existing personal memory                                 */
/* ------------------------------------------------------------------ */

export async function updatePersonalMemory(
  supabase: SupabaseClient,
  memoryId: string,
  updates: {
    content?: string;
    confidence?: number;
    isActive?: boolean;
    category?: PersonalMemoryCategory;
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
    .from("personal_memories")
    .update(payload)
    .eq("id", memoryId);

  if (error) {
    console.error("updatePersonalMemory error:", error);
  }
}

/* ------------------------------------------------------------------ */
/*  Soft-delete (deactivate) a personal memory                         */
/* ------------------------------------------------------------------ */

export async function deactivatePersonalMemory(
  supabase: SupabaseClient,
  memoryId: string,
): Promise<void> {
  await updatePersonalMemory(supabase, memoryId, { isActive: false });
}
