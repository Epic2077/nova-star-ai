/**
 * Database row type for the `shared_memories` table.
 *
 * Cross-chat memory visible to both partners. AI-only editable.
 * Memories are atomic — one fact/preference/insight per row.
 */

export type SharedMemoryCategory =
  | "preference"
  | "emotional_need"
  | "important_date"
  | "gift_idea"
  | "growth_moment"
  | "pattern"
  | "general";

export interface SharedMemoryRow {
  id: string;
  partnership_id: string;
  category: SharedMemoryCategory;
  /** Which user is this about? null = about the relationship itself */
  about_user: string | null;
  content: string;
  /** 0–1, how confident the AI is about this memory */
  confidence: number;
  is_active: boolean;
  source_message_id: string | null;
  created_at: string;
  updated_at: string;
}
