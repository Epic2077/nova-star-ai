/**
 * Database row type for the `partner_profiles` table.
 *
 * Used when the partner does NOT have an account (or hasn't linked).
 * The AI builds and maintains this profile from conversations.
 *
 * When an active partnership exists, `user_profiles` is used instead
 * and this row is archived (source → 'partner_account').
 */

export type PartnerProfileSource =
  | "ai_generated"
  | "partner_account"
  | "quiz_generated";

export interface PartnerQuizAnswer {
  section: string;
  question: string;
  answer: string;
}

export interface PartnerProfileRow {
  id: string;
  owner_user_id: string;
  partnership_id: string | null;
  about_user_id: string | null;
  name: string;
  traits: string[] | null;
  relational_tendencies: string[] | null;
  important_truths: string[] | null;
  ai_notes: string | null;
  quiz_answers: PartnerQuizAnswer[] | null;
  source: PartnerProfileSource;
  created_at: string;
  updated_at: string;
}
