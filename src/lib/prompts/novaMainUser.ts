/**
 * Main User Layer — Always Active
 *
 * Dynamically built from the `user_profiles` table in Supabase.
 *
 * Profile setup has two modes:
 * 1. Self-written  — the user writes their own profile description
 * 2. Personality quiz — the app asks a series of questions, then the
 *    AI generates the profile from the answers
 *
 * The profile can be updated at any time by the user OR by the AI
 * (the AI can refine tone, emotional patterns, etc. as it learns).
 *
 * When a partner shares their code and has an account, their Main
 * User profile doubles as the Reference (partner) profile for the
 * other person.
 */

import type { PersonalitySummary } from "@/types/userProfile";

export interface UserProfile {
  /** Display name (from user_profiles.name) */
  name: string;
  /** Preferred communication tone */
  tone?: string;
  /** List of interests */
  interests?: string[];
  /** How they handle emotions */
  emotionalPatterns?: string;
  /** Direct, gentle, humor-driven, etc. */
  communicationStyle?: string;
  /** Compressed structured personality profile the AI writes */
  memorySummary?: PersonalitySummary;
}

/**
 * Build the Main User system prompt from the user's profile.
 * This is always injected into the system prompt so Nova knows
 * who it's talking to.
 */
export function buildMainUserPrompt(profile: UserProfile): string {
  const {
    name,
    tone,
    interests,
    emotionalPatterns,
    communicationStyle,
    memorySummary,
  } = profile;

  let prompt = `
MAIN USER LAYER — Nova Star AI (Always Active)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CURRENT USER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The person you are talking to is: ${name}

Address them by first name (not full name) when it feels natural. Adapt your style to who they are.
All chats are private — nobody else can see them. They can speak freely and openly.

You gradually learn their emotional patterns, communication style, sensitivities,
humor, stress responses, values, boundaries, and sources of comfort through
natural, consensual conversation.`;

  // ── User-set personalization (from user_profiles table) ──
  const hasBasicInfo =
    tone || communicationStyle || emotionalPatterns || interests?.length;

  if (hasBasicInfo) {
    prompt += `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KNOWN ABOUT ${name.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    if (tone) {
      prompt += `\nPreferred tone: ${tone}`;
    }
    if (communicationStyle) {
      prompt += `\nCommunication style: ${communicationStyle}`;
    }
    if (emotionalPatterns) {
      prompt += `\nEmotional patterns: ${emotionalPatterns}`;
    }
    if (interests && interests.length > 0) {
      prompt += `\nInterests: ${interests.join(", ")}`;
    }
  }

  // ── AI-learned personality summary (from memory_summary JSONB) ──
  if (memorySummary && Object.keys(memorySummary).length > 0) {
    prompt += `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AI-LEARNED PERSONALITY PROFILE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    if (memorySummary.traits?.length) {
      prompt += `\nCore traits: ${memorySummary.traits.join(", ")}`;
    }
    if (memorySummary.emotionalTendencies?.length) {
      prompt += `\nEmotional tendencies: ${memorySummary.emotionalTendencies.join(", ")}`;
    }
    if (memorySummary.communicationPreferences?.length) {
      prompt += `\nCommunication preferences: ${memorySummary.communicationPreferences.join(", ")}`;
    }
    if (memorySummary.values?.length) {
      prompt += `\nValues: ${memorySummary.values.join(", ")}`;
    }
    if (memorySummary.stressResponses?.length) {
      prompt += `\nStress responses: ${memorySummary.stressResponses.join(", ")}`;
    }
    if (memorySummary.humor) {
      prompt += `\nHumor style: ${memorySummary.humor}`;
    }
    if (memorySummary.boundaries?.length) {
      prompt += `\nBoundaries: ${memorySummary.boundaries.join(", ")}`;
    }
    if (memorySummary.notes) {
      prompt += `\nAdditional observations:\n${memorySummary.notes}`;
    }
  }

  return prompt;
}
