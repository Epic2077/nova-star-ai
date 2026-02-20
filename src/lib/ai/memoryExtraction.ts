/**
 * Memory extraction — runs after every AI response.
 *
 * Two-tier system:
 *   1. Every message: lightweight importance check (~fast, cheap)
 *   2. If important OR every 3 user messages: full extraction LLM call
 *
 * This ensures critical info (partner names, emotional needs, important
 * dates) is captured immediately while routine messages use the batched
 * cadence.
 *
 * Also handles:
 *   • Memory conflict detection (contradictions lower old confidence)
 *   • Deduplication via existing-memory injection into the prompt
 *
 * Writes into:
 *   • user_profiles   (personality summary JSONB)
 *   • partner_profiles (AI-built)
 *   • personal_memories
 *   • shared_memories
 *   • shared_insights
 */

import { callProvider, type ChatMessage } from "@/lib/ai/provider";
import {
  insertSharedMemory,
  fetchSharedMemories,
} from "@/lib/supabase/sharedMemory";
import { insertSharedInsight } from "@/lib/supabase/sharedInsight";
import {
  insertPersonalMemory,
  fetchPersonalMemories,
  updatePersonalMemory,
} from "@/lib/supabase/personalMemory";
import { updateSharedMemory } from "@/lib/supabase/sharedMemory";
import { upsertAIPartnerProfile } from "@/lib/supabase/partnerProfile";
import type { PartnershipRow } from "@/types/partnership";
import type { PersonalitySummary } from "@/types/userProfile";
import type { PersonalMemoryRow } from "@/types/personalMemory";
import type { SharedMemoryRow } from "@/types/sharedMemory";
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
    /** If this contradicts an existing memory, reference its content */
    contradicts?: string;
  }>;
  /** Shared memories — about the relationship, requires active partnership */
  memories?: Array<{
    category: string;
    content: string;
    aboutUser?: "current" | "partner" | "relationship";
    confidence?: number;
    /** If this contradicts an existing memory, reference its content */
    contradicts?: string;
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
/*  Importance detection — cheap regex check to decide if we need      */
/*  an immediate extraction even when the cadence hasn't hit.          */
/* ------------------------------------------------------------------ */

/**
 * Patterns that signal high-importance content worth extracting
 * immediately rather than waiting for the next cadence tick.
 */
const HIGH_IMPORTANCE_PATTERNS = [
  // Partner / relationship signals
  /\b(my\s+)?(partner|boyfriend|girlfriend|husband|wife|fiancé|fiancée|spouse|bae)\b/i,
  /\b(we\s+broke\s+up|got\s+engaged|got\s+married|anniversary|pregnant)\b/i,
  // Emotional signals
  /\b(i\s+love|i\s+hate|i\s+need|i\s+feel\s+(?:safe|unsafe|alone|scared|happy|sad|anxious|depressed))\b/i,
  /\b(i'?m\s+(?:worried|stressed|anxious|depressed|excited|overwhelmed|hurt))\b/i,
  // Important personal info
  /\b(my\s+name\s+is|i\s+(?:work|live|moved|born)|my\s+birthday|allergic|diagnosed)\b/i,
  /\b(i\s+(?:want|dream|plan|hope)\s+to)\b/i,
  // Preference signals
  /\b(my\s+favorite|i\s+(?:always|never|prefer|dislike))\b/i,
  // Explicit memory requests
  /\b(remember\s+(?:that|this)|don'?t\s+forget|keep\s+in\s+mind)\b/i,
  // Farsi equivalents
  /(?:عشقم|نامزدم|همسرم|شوهرم|دوست\s*دخترم|دوست\s*پسرم|احساس\s*می‌?کنم|یادت\s*باشه|فراموش\s*نکن)/u,
];

function isHighImportance(content: string): boolean {
  return HIGH_IMPORTANCE_PATTERNS.some((re) => re.test(content));
}

/* ------------------------------------------------------------------ */
/*  Extraction prompt                                                  */
/* ------------------------------------------------------------------ */

/**
 * Build the extraction prompt dynamically so we can inject existing
 * memories and avoid duplicates. Also includes conflict-detection
 * instructions.
 */
function buildExtractionPrompt(existingMemories: string): string {
  return `You are a memory extraction system for Nova Star AI, a relationship-focused AI companion.

Analyze the following conversation and extract ONLY genuinely new, meaningful information worth remembering long-term. Do NOT extract trivial greetings, small talk, or information already known.

${existingMemories ? `ALREADY STORED MEMORIES (do NOT re-extract these — only extract NEW information):\n${existingMemories}\n` : ""}
Return a JSON object with these optional fields (omit any that have nothing new):

1. "userProfile" — new personality traits, emotional patterns, values, communication preferences, stress responses, humor style, or boundaries you learned about the CURRENT USER speaking.

2. "partnerProfile" — if the user mentioned their partner by name or love name or shortened name, (also check for the name in other languages specially persian) and revealed new traits, relational tendencies, or important truths about them. Must include "name".

3. "personalMemories" — facts about the CURRENT USER that should be remembered across all conversations, even without a partner:
   - category: "preference" | "emotional_need" | "important_date" | "growth_moment" | "pattern" | "goal" | "general"
   - content: one clear sentence about the user
   - confidence: 0-1 how sure you are
   - contradicts: (optional) if this new fact CONTRADICTS an existing stored memory, copy the exact content string of the old memory here so we can lower its confidence. Example: user used to say "I hate coffee" but now says "I love coffee" — set contradicts to the old memory content.
   Use this for individual preferences, goals, personal milestones, habits, etc.

4. "memories" — shared/relationship memories (only when the user is talking about their RELATIONSHIP or PARTNER):
   - category: "preference" | "emotional_need" | "important_date" | "gift_idea" | "growth_moment" | "pattern" | "general"
   - content: one clear sentence
   - aboutUser: "current" | "partner" | "relationship"
   - confidence: 0-1 how sure you are
   - contradicts: (optional) same as above — if this new shared memory contradicts an existing stored memory, copy the exact old memory content here.

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
- SKIP anything that is already in the ALREADY STORED MEMORIES list above
- If a new fact contradicts an old stored memory, include the "contradicts" field with the EXACT text of the old memory
- If nothing new was learned, return an empty object: {}
- Return ONLY valid JSON, no markdown fences, no explanation
`;
}

/* ------------------------------------------------------------------ */
/*  Conflict resolution — lower confidence on old contradicted memory  */
/* ------------------------------------------------------------------ */

async function resolveConflict(
  supabase: SupabaseClient,
  contradictedContent: string,
  existingPersonal: PersonalMemoryRow[],
  existingShared: SharedMemoryRow[],
  partnershipId: string | null,
): Promise<void> {
  // Try to find the old memory by fuzzy content match
  const normalise = (s: string) => s.toLowerCase().trim();
  const target = normalise(contradictedContent);

  // Check personal memories
  for (const m of existingPersonal) {
    if (normalise(m.content) === target) {
      // Lower confidence of the old memory (but keep it active for history).
      // If confidence drops below 0.3, deactivate it.
      const newConfidence = Math.max(0, m.confidence - 0.4);
      await updatePersonalMemory(supabase, m.id, {
        confidence: newConfidence,
        isActive: newConfidence >= 0.3,
      });
      console.log(
        `[memory-conflict] Personal memory "${m.content}" confidence: ${m.confidence} → ${newConfidence}`,
      );
      return;
    }
  }

  // Check shared memories
  if (partnershipId) {
    for (const m of existingShared) {
      if (normalise(m.content) === target) {
        const newConfidence = Math.max(0, m.confidence - 0.4);
        await updateSharedMemory(supabase, m.id, {
          confidence: newConfidence,
          isActive: newConfidence >= 0.3,
        });
        console.log(
          `[memory-conflict] Shared memory "${m.content}" confidence: ${m.confidence} → ${newConfidence}`,
        );
        return;
      }
    }
  }
}

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
    // ── Decide whether to run extraction ──
    // Two-tier trigger:
    //   1. If the latest user message contains high-importance signals
    //      (partner mention, emotional need, preferences, etc.) → run NOW
    //   2. Otherwise, run on 1st message and every 3 user messages
    const { count: userCount } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("chat_id", chatId)
      .eq("role", "user");

    if (!userCount) return;

    // Get the latest user message to check importance
    const { data: latestUserMsg } = await supabase
      .from("messages")
      .select("content")
      .eq("chat_id", chatId)
      .eq("role", "user")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const latestContent = latestUserMsg?.content ?? "";
    const urgent = isHighImportance(latestContent);

    const cadenceHit = userCount === 1 || (userCount - 1) % 3 === 0;

    if (!urgent && !cadenceHit) return;

    // Get the last 15 messages for richer context
    const { data: recentMessages } = await supabase
      .from("messages")
      .select("role, content")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: false })
      .limit(15);

    if (!recentMessages || recentMessages.length === 0) return;

    // ── Load existing memories so the LLM can skip duplicates ──
    const hasActivePartnership = partnership?.status === "active";

    const [existingPersonal, existingShared] = await Promise.all([
      fetchPersonalMemories(supabase, userId),
      hasActivePartnership
        ? fetchSharedMemories(supabase, partnership!.id)
        : Promise.resolve([]),
    ]);

    const existingMemoryLines: string[] = [];
    for (const m of existingPersonal) {
      existingMemoryLines.push(`- [personal/${m.category}] ${m.content}`);
    }
    for (const m of existingShared) {
      existingMemoryLines.push(`- [shared/${m.category}] ${m.content}`);
    }
    const existingMemoryText = existingMemoryLines.join("\n");

    const conversationText = recentMessages
      .reverse()
      .map(
        (msg: { role: string; content: string }) =>
          `${msg.role.toUpperCase()}: ${msg.content}`,
      )
      .join("\n\n");

    const extractionMessages: ChatMessage[] = [
      { role: "system", content: buildExtractionPrompt(existingMemoryText) },
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

    // ── 3. Insert personal memories + conflict resolution ──
    if (extraction.personalMemories?.length) {
      for (const mem of extraction.personalMemories) {
        // Resolve conflict first (lower old memory confidence)
        if (mem.contradicts) {
          writes.push(
            resolveConflict(
              supabase,
              mem.contradicts,
              existingPersonal,
              existingShared,
              hasActivePartnership ? partnership!.id : null,
            ),
          );
        }

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

    // ── 4. Insert shared memories + conflict resolution ──
    if (extraction.memories?.length && partnership?.status === "active") {
      const partnerId =
        partnership.user_a === userId ? partnership.user_b : partnership.user_a;

      for (const mem of extraction.memories) {
        // Resolve conflict first
        if (mem.contradicts) {
          writes.push(
            resolveConflict(
              supabase,
              mem.contradicts,
              existingPersonal,
              existingShared,
              partnership.id,
            ),
          );
        }

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
      `Memory extraction completed for chat ${chatId}` +
        `${urgent ? " [URGENT]" : ""}: ` +
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
