/**
 * Server-side helpers for the `user_profiles` table.
 *
 * Used in API routes (service role) to fetch or create user profiles
 * that feed into `buildMainUserPrompt()`.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserProfileRow, PersonalitySummary } from "@/types/userProfile";
import type { UserProfile } from "@/lib/prompts/novaMainUser";

/* ------------------------------------------------------------------ */
/*  Fetch                                                              */
/* ------------------------------------------------------------------ */

/**
 * Fetch a user's profile row. Returns `null` if it doesn't exist yet.
 */
export async function fetchUserProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserProfileRow | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("fetchUserProfile error:", error);
    return null;
  }

  return data as UserProfileRow | null;
}

/* ------------------------------------------------------------------ */
/*  Upsert (create-if-missing)                                         */
/* ------------------------------------------------------------------ */

/**
 * Ensure a `user_profiles` row exists for the given user.
 * Creates one with defaults if missing. Returns the row.
 */
export async function ensureUserProfile(
  supabase: SupabaseClient,
  userId: string,
  fallbackName: string,
): Promise<UserProfileRow> {
  // Try to fetch first (fast path)
  const existing = await fetchUserProfile(supabase, userId);
  if (existing) return existing;

  // Create a new row with defaults
  const { data, error } = await supabase
    .from("user_profiles")
    .insert({
      id: userId,
      name: fallbackName,
      setup_mode: "pending",
    })
    .select("*")
    .single();

  if (error) {
    // Race condition — another request created it first
    if (error.code === "23505") {
      const retry = await fetchUserProfile(supabase, userId);
      if (retry) return retry;
    }
    console.error("ensureUserProfile insert error:", error);
    // Return a minimal fallback so the prompt still works
    return {
      id: userId,
      name: fallbackName,
      tone: null,
      interests: null,
      emotional_patterns: null,
      communication_style: null,
      memory_summary: null,
      setup_mode: "pending",
      version: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  return data as UserProfileRow;
}

/* ------------------------------------------------------------------ */
/*  Convert DB row → prompt-layer UserProfile                          */
/* ------------------------------------------------------------------ */

/**
 * Convert a `UserProfileRow` (DB shape) into the `UserProfile`
 * interface that `buildMainUserPrompt()` expects.
 */
export function toUserProfile(row: UserProfileRow): UserProfile {
  const summary = row.memory_summary as PersonalitySummary | null;

  return {
    name: row.name,
    tone: row.tone ?? undefined,
    interests: row.interests ?? undefined,
    emotionalPatterns: row.emotional_patterns ?? undefined,
    communicationStyle: row.communication_style ?? undefined,
    memorySummary: summary ?? undefined,
  };
}
