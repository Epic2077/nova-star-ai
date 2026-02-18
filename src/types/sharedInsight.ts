/**
 * Database row type for the `shared_insights` table.
 *
 * AI-generated relationship insights visible to both partners.
 * Future dashboard will surface these.
 */

export type SharedInsightCategory =
  | "emotional_need"
  | "communication"
  | "appreciation"
  | "conflict_style"
  | "growth_area"
  | "strength"
  | "gift_relevant";

export interface SharedInsightRow {
  id: string;
  partnership_id: string;
  category: SharedInsightCategory;
  /** Which user is this about? null = about the relationship itself */
  about_user: string | null;
  /** Short label for dashboard display */
  title: string;
  /** The insight content */
  content: string;
  /** 0–1, how confident the AI is */
  confidence: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
