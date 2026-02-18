/**
 * Main User Layer — Always Active
 *
 * Dynamically built with the logged-in user's name from Supabase Auth.
 *
 * Profile setup has two modes:
 * 1. Self-written  — the user writes their own profile description
 * 2. Personality quiz — the app asks a series of questions, then the
 *    AI generates the profile from the answers
 *
 * The profile can be updated at any time by the user OR by the AI
 * (the AI can refine tone, emotional patterns, etc. as it learns).
 *
 * In the future, `UserProfile` will be loaded from a `user_profiles`
 * table in Supabase. When a partner shares their code and has an
 * account, their Main User profile doubles as the Reference (partner)
 * profile for the other person.
 */

export interface UserProfile {
  /** Display name from auth (e.g. "Shadi") */
  name: string;
  /**
   * Optional AI-generated understanding of the user.
   * Will be populated from the backend in the future.
   */
  tone?: string;
  interests?: string[];
  emotionalPatterns?: string;
  communicationStyle?: string;
  /** Raw extra notes the AI has stored */
  aiNotes?: string;
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
    aiNotes,
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

  // ── AI-learned personalization (loaded from backend in future) ──
  if (
    tone ||
    communicationStyle ||
    emotionalPatterns ||
    interests?.length ||
    aiNotes
  ) {
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
    if (aiNotes) {
      prompt += `\nAdditional context:\n${aiNotes}`;
    }
  }

  return prompt;
}
