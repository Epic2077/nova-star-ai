/**
 * Server-side helpers for the `partnerships` table.
 *
 * Used in API routes (service role) to look up the current user's
 * partner and load the partner's profile for the Reference layer.
 *
 * Fallback chain for partner profile:
 * 1. Active partnership → load partner's `user_profiles` row
 * 2. No active partnership → load AI-built `partner_profiles` row
 * 3. Neither exists → return null (route.ts applies Shadi defaults or skips)
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PartnershipRow } from "@/types/partnership";
import type { PartnerProfile } from "@/lib/prompts/novaReference";
import type { UserProfileRow } from "@/types/userProfile";
import { fetchAIPartnerProfile } from "@/lib/supabase/partnerProfile";

/* ------------------------------------------------------------------ */
/*  Fetch active partnership                                           */
/* ------------------------------------------------------------------ */

/**
 * Find the user's active (or pending) partnership.
 * Returns `null` if they have none.
 */
export async function fetchActivePartnership(
  supabase: SupabaseClient,
  userId: string,
): Promise<PartnershipRow | null> {
  const { data, error } = await supabase
    .from("partnerships")
    .select("*")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .in("status", ["pending", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("fetchActivePartnership error:", error);
    return null;
  }

  return data as PartnershipRow | null;
}

/* ------------------------------------------------------------------ */
/*  Derive partner's user ID                                           */
/* ------------------------------------------------------------------ */

/**
 * Given a partnership row and the current user, return the partner's
 * user ID.  Returns `null` if the partnership is still pending
 * (user_b hasn't joined yet).
 */
export function getPartnerId(
  partnership: PartnershipRow,
  currentUserId: string,
): string | null {
  if (partnership.status !== "active") return null;
  return partnership.user_a === currentUserId
    ? partnership.user_b
    : partnership.user_a;
}

/* ------------------------------------------------------------------ */
/*  Load partner profile for Reference layer                           */
/* ------------------------------------------------------------------ */

/**
 * Load the partner's profile for the Reference layer.
 *
 * Fallback chain:
 * 1. Active partnership → partner's `user_profiles` row
 * 2. No active partnership → AI-built `partner_profiles` row
 * 3. Neither → `null` (route.ts handles Shadi defaults or skip)
 */
export async function fetchPartnerProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<PartnerProfile | null> {
  const partnership = await fetchActivePartnership(supabase, userId);

  // 1️⃣ Active partnership → load partner's user_profiles row
  if (partnership) {
    const partnerId = getPartnerId(partnership, userId);
    if (partnerId) {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", partnerId)
        .maybeSingle();

      if (!error && data) {
        return userProfileToPartnerProfile(data as UserProfileRow);
      }
    }
  }

  // 2️⃣ No linked partner → try AI-built partner profile
  return fetchAIPartnerProfile(supabase, userId);
}

/**
 * Convert a `UserProfileRow` into a `PartnerProfile` for the
 * Reference layer. This is how "Main User profile doubles as
 * Reference for the partner" works.
 */
function userProfileToPartnerProfile(row: UserProfileRow): PartnerProfile {
  const summary = row.memory_summary;

  return {
    name: row.name,
    traits: summary?.traits ?? undefined,
    relationalTendencies: summary?.emotionalTendencies ?? undefined,
    importantTruths: summary?.values ?? undefined,
    aiNotes: summary?.notes ?? undefined,
  };
}
