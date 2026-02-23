/**
 * Database row type for the `personal_memories` table.
 *
 * Per-user cross-chat memory — works independently of partnerships.
 * AI-only editable. Each user accumulates these regardless of
 * partnership status.
 */

export type PersonalMemoryCategory =
  | "preference"
  | "emotional_need"
  | "important_date"
  | "growth_moment"
  | "pattern"
  | "goal"
  | "general";

export interface PersonalMemoryRow {
  id: string;
  user_id: string;
  category: PersonalMemoryCategory;
  content: string;
  /** 0–1, how confident the AI is about this memory */
  confidence: number;
  is_active: boolean;
  source_message_id: string | null;
  created_at: string;
  updated_at: string;
}
