/**
 * Reference Layer (Partner Profile) — Conditional Activation
 *
 * Describes who the partner is — their traits, tendencies, and truths.
 * Activated alongside the Relationship Layer when relationship context
 * is detected.
 *
 * This profile can be set in two ways:
 * 1. AI-generated — Nova builds it over time from conversations
 * 2. Shared via code — the partner fills it out themselves, or if they
 *    have their own account their Main User profile is used here
 *
 * Only the AI or the partner themselves can edit this profile.
 * The current user can view it but not modify it.
 *
 * In the future, this will be loaded from a `partner_profiles` table.
 */

export interface PartnerProfile {
  /** Partner's display name */
  name: string;
  /** Core personality traits */
  traits?: string[];
  /** How they behave in the relationship */
  relationalTendencies?: string[];
  /** Important truths / things to know */
  importantTruths?: string[];
  /** AI-generated notes about the partner */
  aiNotes?: string;
}

/**
 * Default partner profile — will be replaced by DB-loaded data.
 */
export const DEFAULT_PARTNER_PROFILE: PartnerProfile = {
  name: "Ashkan",
  traits: [
    "Principled and word-driven; commitments are serious",
    "Highly self-reflective (sometimes to overload)",
    "Growth-oriented and self-correcting",
    "Emotionally intense and intelligent",
    "Deep-feeling but action-focused",
    "Not perfect at expression, always sincere",
    "Very strong mentally and physically",
    "Computer programmer, loves to build things, problem solver",
    "Professional boxer, values physical fitness and health",
    "Studies English Literature in university, loves poetry and philosophy",
  ],
  relationalTendencies: [
    "Values honesty; never lies",
    "Gets emotionally distant under stacked responsibilities",
    "Acts as a strong pillar",
    "Deeply values trust and loyalty",
    "Reacts strongly when loyalty feels threatened",
    "Struggles expressing sadness, anxiety, loneliness",
    "Wants to be reliable and present even when tired",
    "Prefers fixing problems quickly",
  ],
  importantTruths: [
    "Does not play games",
    "Very loyal",
    "Does not manipulate",
    "Mistakes usually come from overload, not indifference",
    "Distance usually means stress or exhaustion",
    "Wants safe, calm, enduring love — not drama",
  ],
};

/**
 * Build the Reference (Partner Profile) system prompt.
 */
export function buildReferencePrompt(profile: PartnerProfile): string {
  const { name, traits, relationalTendencies, importantTruths, aiNotes } = profile;

  let prompt = `
REFERENCE LAYER — Partner Profile (Conditional Activation)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PARTNER — ${name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

  if (traits && traits.length > 0) {
    prompt += `\n\nCore traits:\n${traits.map((t) => `- ${t}`).join("\n")}`;
  }

  if (relationalTendencies && relationalTendencies.length > 0) {
    prompt += `\n\nRelational tendencies:\n${relationalTendencies.map((t) => `- ${t}`).join("\n")}`;
  }

  if (importantTruths && importantTruths.length > 0) {
    prompt += `\n\nImportant truths:\n${importantTruths.map((t) => `- ${t}`).join("\n")}`;
  }

  if (aiNotes) {
    prompt += `\n\nAdditional context:\n${aiNotes}`;
  }

  prompt += `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GUIDELINES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

On protective tendencies (clothing, social boundaries, perceived risks):
- Help both perspectives be understood
- Do not frame either as morally superior
- Encourage respectful discussion and mutual agreement

Never replace ${name}'s voice.
Never become primary reassurance.
Never create triangulation.`;

  return prompt;
}
