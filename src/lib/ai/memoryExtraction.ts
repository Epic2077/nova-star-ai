/**
 * Memory extraction — fire-and-forget secondary LLM call.
 *
 * Every 5 messages the system analyses recent conversation and writes
 * new observations into four tables:
 *   • user_profiles   (personality summary JSONB)
 *   • partner_profiles (AI-built)
 *   • shared_memories
 *   • shared_insights
 */

import { callProvider, type ChatMessage } from "@/lib/ai/provider";
import { insertSharedMemory } from "@/lib/supabase/sharedMemory";
import { insertSharedInsight } from "@/lib/supabase/sharedInsight";
import { insertPersonalMemory } from "@/lib/supabase/personalMemory";
import { upsertAIPartnerProfile } from "@/lib/supabase/partnerProfile";
import type { PartnershipRow } from "@/types/partnership";
import type { PersonalitySummary } from "@/types/userProfile";
import type { SupabaseClient } from "@supabase/supabase-js";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/**
 * JSON schema the extraction LLM must return.
 * Each field is optional — the LLM only populates what it found.
 */
interface ExtractionResult {
  userProfile?: {
    traits?: string[];
    emotionalTendencies?: string[];
    communicationPreferences?: string[];
    values?: string[];
    stressResponses?: string[];
    humor?: string;
    boundaries?: string[];
    notes?: string;
  };
  partnerProfile?: {
    name: string;
    traits?: string[];
    relationalTendencies?: string[];
    importantTruths?: string[];
    aiNotes?: string;
  };
  /** Personal memories — about this user only, no partnership required */
  personalMemories?: Array<{
    category: string;
    content: string;
    confidence?: number;
  }>;
  /** Shared memories — about the relationship, requires active partnership */
  memories?: Array<{
    category: string;
    content: string;
    aboutUser?: "current" | "partner" | "relationship";
    confidence?: number;
  }>;
  insights?: Array<{
    category: string;
    title: string;
    content: string;
    aboutUser?: "current" | "partner" | "relationship";
    confidence: number;
  }>;
}

/* ------------------------------------------------------------------ */
/*  Extraction prompt                                                  */
/* ------------------------------------------------------------------ */

const EXTRACTION_PROMPT = `You are a memory extraction system for Nova Star AI, a relationship-focused AI companion.

Analyze the following conversation and extract ONLY genuinely new, meaningful information worth remembering long-term. Do NOT extract trivial greetings, small talk, or information already known.

Return a JSON object with these optional fields (omit any that have nothing new):

1. "userProfile" — new personality traits, emotional patterns, values, communication preferences, stress responses, humor style, or boundaries you learned about the CURRENT USER speaking.

2. "partnerProfile" — if the user mentioned their partner by name and revealed new traits, relational tendencies, or important truths about them. Must include "name".

3. "personalMemories" — facts about the CURRENT USER that should be remembered across all conversations, even without a partner:
   - category: "preference" | "emotional_need" | "important_date" | "growth_moment" | "pattern" | "goal" | "general"
   - content: one clear sentence about the user
   - confidence: 0-1 how sure you are
   Use this for individual preferences, goals, personal milestones, habits, etc.

4. "memories" — shared/relationship memories (only when the user is talking about their RELATIONSHIP or PARTNER):
   - category: "preference" | "emotional_need" | "important_date" | "gift_idea" | "growth_moment" | "pattern" | "general"
   - content: one clear sentence
   - aboutUser: "current" | "partner" | "relationship"
   - confidence: 0-1 how sure you are

5. "insights" — high-level relationship observations (only when genuinely insightful):
   - category: "emotional_need" | "communication" | "appreciation" | "conflict_style" | "growth_area" | "strength" | "gift_relevant"
   - title: short label
   - content: the insight
   - aboutUser: "current" | "partner" | "relationship"
   - confidence: 0-1

Rules:
- Be selective — quality over quantity
- Only extract what is clearly stated or strongly implied
- Do NOT fabricate or assume
- Always populate "personalMemories" when you learn something about the user as an individual
- Only populate "memories" (shared) when content is about the relationship or partner
- If nothing new was learned, return an empty object: {}
- Return ONLY valid JSON, no markdown fences, no explanation
`;

/* ------------------------------------------------------------------ */
/*  Main extraction function                                           */
/* ------------------------------------------------------------------ */

export async function runMemoryExtraction(
  supabase: SupabaseClient,
  chatId: string,
  userId: string,
  partnership: PartnershipRow | null,
  provider: string,
  model: string | undefined,
) {
  try {
    // Only run every 5 messages to avoid excessive LLM calls
    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("chat_id", chatId);

    if (!count || count % 5 !== 0) return;

    // Get the last 10 messages for context
    const { data: recentMessages } = await supabase
      .from("messages")
      .select("role, content")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!recentMessages || recentMessages.length === 0) return;

    const conversationText = recentMessages
      .reverse()
      .map(
        (msg: { role: string; content: string }) =>
          `${msg.role.toUpperCase()}: ${msg.content}`,
      )
      .join("\n\n");

    const extractionMessages: ChatMessage[] = [
      { role: "system", content: EXTRACTION_PROMPT },
      {
        role: "user",
        content: `CONVERSATION:\n${conversationText}\n\nExtract new information as JSON:`,
      },
    ];

    const result = await callProvider(extractionMessages, {
      provider: provider as "deepseek" | "openai",
      model,
      temperature: 0.3,
    });

    if (!result.ok || !result.text.trim()) return;

    // Parse JSON — strip markdown fences if present
    let jsonText = result.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText
        .replace(/^```(?:json)?\n?/, "")
        .replace(/\n?```$/, "");
    }

    let extraction: ExtractionResult;
    try {
      extraction = JSON.parse(jsonText);
    } catch {
      console.warn("Memory extraction: invalid JSON response");
      return;
    }

    // Skip if nothing extracted
    if (
      !extraction.userProfile &&
      !extraction.partnerProfile &&
      !extraction.personalMemories?.length &&
      !extraction.memories?.length &&
      !extraction.insights?.length
    ) {
      return;
    }

    const writes: Promise<unknown>[] = [];

    // ── 1. Update user personality summary ──
    if (extraction.userProfile) {
      writes.push(
        mergeUserPersonality(supabase, userId, extraction.userProfile),
      );
    }

    // ── 2. Upsert AI-built partner profile ──
    if (
      extraction.partnerProfile?.name &&
      (!partnership || partnership.status !== "active")
    ) {
      writes.push(
        upsertAIPartnerProfile(supabase, userId, extraction.partnerProfile),
      );
    }

    // ── 3. Insert personal memories (always — no partnership required) ──
    if (extraction.personalMemories?.length) {
      for (const mem of extraction.personalMemories) {
        writes.push(
          insertPersonalMemory(supabase, {
            userId,
            category: mem.category as
              | "preference"
              | "emotional_need"
              | "important_date"
              | "growth_moment"
              | "pattern"
              | "goal"
              | "general",
            content: mem.content,
            confidence: mem.confidence ?? 1.0,
          }),
        );
      }
    }

    // ── 4. Insert shared memories (only with active partnership) ──
    if (extraction.memories?.length && partnership?.status === "active") {
      const partnerId =
        partnership.user_a === userId ? partnership.user_b : partnership.user_a;

      for (const mem of extraction.memories) {
        const aboutUser =
          mem.aboutUser === "current"
            ? userId
            : mem.aboutUser === "partner"
              ? partnerId
              : null;

        writes.push(
          insertSharedMemory(supabase, {
            partnershipId: partnership.id,
            category: mem.category as
              | "preference"
              | "emotional_need"
              | "important_date"
              | "gift_idea"
              | "growth_moment"
              | "pattern"
              | "general",
            aboutUser,
            content: mem.content,
            confidence: mem.confidence ?? 1.0,
          }),
        );
      }
    }

    // ── 5. Insert shared insights ──
    if (extraction.insights?.length && partnership?.status === "active") {
      const partnerId =
        partnership.user_a === userId ? partnership.user_b : partnership.user_a;

      for (const ins of extraction.insights) {
        const aboutUser =
          ins.aboutUser === "current"
            ? userId
            : ins.aboutUser === "partner"
              ? partnerId
              : null;

        writes.push(
          insertSharedInsight(supabase, {
            partnershipId: partnership.id,
            category: ins.category as
              | "emotional_need"
              | "communication"
              | "appreciation"
              | "conflict_style"
              | "growth_area"
              | "strength"
              | "gift_relevant",
            aboutUser,
            title: ins.title,
            content: ins.content,
            confidence: ins.confidence,
          }),
        );
      }
    }

    await Promise.all(writes);

    console.log(
      `Memory extraction completed for chat ${chatId}: ` +
        `${extraction.userProfile ? "profile " : ""}` +
        `${extraction.partnerProfile ? "partner " : ""}` +
        `${extraction.personalMemories?.length ?? 0} personal, ` +
        `${extraction.memories?.length ?? 0} shared, ` +
        `${extraction.insights?.length ?? 0} insights`,
    );
  } catch (err) {
    console.error("Memory extraction error:", err);
  }
}

/* ------------------------------------------------------------------ */
/*  Merge new personality observations into existing summary           */
/* ------------------------------------------------------------------ */

async function mergeUserPersonality(
  supabase: SupabaseClient,
  userId: string,
  newData: NonNullable<ExtractionResult["userProfile"]>,
) {
  // Load existing summary
  const { data: row } = await supabase
    .from("user_profiles")
    .select("memory_summary")
    .eq("id", userId)
    .single();

  const existing: PersonalitySummary =
    (row?.memory_summary as PersonalitySummary) ?? {};

  // Merge arrays (deduplicate) and strings (append)
  const mergeArrays = (a?: string[], b?: string[]): string[] | undefined => {
    if (!b?.length) return a;
    const set = new Set([...(a ?? []), ...b]);
    return [...set];
  };

  const merged: PersonalitySummary = {
    traits: mergeArrays(existing.traits, newData.traits),
    emotionalTendencies: mergeArrays(
      existing.emotionalTendencies,
      newData.emotionalTendencies,
    ),
    communicationPreferences: mergeArrays(
      existing.communicationPreferences,
      newData.communicationPreferences,
    ),
    values: mergeArrays(existing.values, newData.values),
    stressResponses: mergeArrays(
      existing.stressResponses,
      newData.stressResponses,
    ),
    humor: newData.humor ?? existing.humor,
    boundaries: mergeArrays(existing.boundaries, newData.boundaries),
    notes: newData.notes
      ? existing.notes
        ? `${existing.notes}\n${newData.notes}`
        : newData.notes
      : existing.notes,
  };

  await supabase
    .from("user_profiles")
    .update({
      memory_summary: merged,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
}
