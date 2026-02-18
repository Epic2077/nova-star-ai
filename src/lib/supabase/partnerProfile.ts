/**
 * Server-side helpers for the `partner_profiles` table.
 *
 * AI-built partner profiles — used when the partner does NOT have an
 * account or hasn't linked via the partnership system.
 *
 * Only the service role can read/write this table.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PartnerProfileRow } from "@/types/partnerProfile";
import type { PartnerProfile } from "@/lib/prompts/novaReference";

/* ------------------------------------------------------------------ */
/*  Fetch AI-built partner profile                                     */
/* ------------------------------------------------------------------ */

/**
 * Load the AI-generated partner profile for a given user.
 * Only returns rows with `source = 'ai_generated'` — once the partner
 * links an account the row is archived and `user_profiles` is used.
 */
export async function fetchAIPartnerProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<PartnerProfile | null> {
  const { data, error } = await supabase
    .from("partner_profiles")
    .select("*")
    .eq("owner_user_id", userId)
    .eq("source", "ai_generated")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("fetchAIPartnerProfile error:", error);
    return null;
  }

  if (!data) return null;

  return partnerProfileRowToPartnerProfile(data as PartnerProfileRow);
}

/* ------------------------------------------------------------------ */
/*  Upsert AI-built partner profile                                    */
/* ------------------------------------------------------------------ */

/**
 * Create or update the AI-generated partner profile.
 * Called after the AI learns something new about the partner from
 * conversation.
 */
export async function upsertAIPartnerProfile(
  supabase: SupabaseClient,
  userId: string,
  profile: Partial<PartnerProfile> & { name: string },
): Promise<PartnerProfileRow | null> {
  // Check if a row already exists
  const { data: existing } = await supabase
    .from("partner_profiles")
    .select("id")
    .eq("owner_user_id", userId)
    .eq("source", "ai_generated")
    .maybeSingle();

  if (existing) {
    // Update existing row
    const { data, error } = await supabase
      .from("partner_profiles")
      .update({
        name: profile.name,
        traits: profile.traits ?? null,
        relational_tendencies: profile.relationalTendencies ?? null,
        important_truths: profile.importantTruths ?? null,
        ai_notes: profile.aiNotes ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) {
      console.error("updateAIPartnerProfile error:", error);
      return null;
    }
    return data as PartnerProfileRow;
  }

  // Insert new row
  const { data, error } = await supabase
    .from("partner_profiles")
    .insert({
      owner_user_id: userId,
      name: profile.name,
      traits: profile.traits ?? null,
      relational_tendencies: profile.relationalTendencies ?? null,
      important_truths: profile.importantTruths ?? null,
      ai_notes: profile.aiNotes ?? null,
      source: "ai_generated",
    })
    .select("*")
    .single();

  if (error) {
    console.error("insertAIPartnerProfile error:", error);
    return null;
  }
  return data as PartnerProfileRow;
}

/* ------------------------------------------------------------------ */
/*  Archive AI profile (when partner links account)                    */
/* ------------------------------------------------------------------ */

/**
 * Mark the AI-generated profile as archived by flipping its source
 * to 'partner_account' and linking the partnership ID.
 * Called when a partnership becomes active.
 */
export async function archiveAIPartnerProfile(
  supabase: SupabaseClient,
  userId: string,
  partnershipId: string,
): Promise<void> {
  const { error } = await supabase
    .from("partner_profiles")
    .update({
      source: "partner_account",
      partnership_id: partnershipId,
      updated_at: new Date().toISOString(),
    })
    .eq("owner_user_id", userId)
    .eq("source", "ai_generated");

  if (error) {
    console.error("archiveAIPartnerProfile error:", error);
  }
}

/* ------------------------------------------------------------------ */
/*  Row → PartnerProfile conversion                                    */
/* ------------------------------------------------------------------ */

function partnerProfileRowToPartnerProfile(
  row: PartnerProfileRow,
): PartnerProfile {
  return {
    name: row.name,
    traits: row.traits ?? undefined,
    relationalTendencies: row.relational_tendencies ?? undefined,
    importantTruths: row.important_truths ?? undefined,
    aiNotes: row.ai_notes ?? undefined,
  };
}
