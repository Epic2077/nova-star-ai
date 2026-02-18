/**
 * Database row type for the `user_profiles` table.
 *
 * Maps 1:1 to the Supabase schema. Use `toUserProfile()` from
 * `lib/supabase/userProfile.ts` to convert to the prompt-layer
 * `UserProfile` interface.
 */

export type SetupMode = "pending" | "self_written" | "quiz_generated";

/**
 * Structured personality summary the AI writes over time.
 * Stored as JSONB in the `memory_summary` column.
 */
export type PersonalitySummary = {
  /** Core personality traits the AI has observed */
  traits?: string[];
  /** Emotional tendencies and patterns */
  emotionalTendencies?: string[];
  /** Communication preferences */
  communicationPreferences?: string[];
  /** Values and priorities */
  values?: string[];
  /** Stress responses and coping */
  stressResponses?: string[];
  /** Humor style */
  humor?: string;
  /** Boundaries the user has expressed */
  boundaries?: string[];
  /** Free-form AI observations */
  notes?: string;
};

/**
 * Row shape returned from `supabase.from("user_profiles").select("*")`.
 */
export type UserProfileRow = {
  id: string;
  name: string;
  tone: string | null;
  interests: string[] | null;
  emotional_patterns: string | null;
  communication_style: string | null;
  memory_summary: PersonalitySummary | null;
  setup_mode: SetupMode;
  version: number | null;
  created_at: string;
  updated_at: string;
};
