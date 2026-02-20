/**
 * Memory Maintenance — Periodic jobs for memory health.
 *
 * 1. Confidence Decay:
 *    Old memories slowly lose confidence unless reinforced by new
 *    conversations. This prevents stale assumptions and models
 *    realistic belief evolution.
 *
 * 2. Insight Regeneration:
 *    Re-evaluate active memories and regenerate insights, deactivating
 *    outdated ones and updating confidence scores.
 *
 * These are designed to be called from a cron API route (e.g. daily).
 */

import { callProvider, type ChatMessage } from "@/lib/ai/provider";
import {
  fetchPersonalMemories,
  updatePersonalMemory,
} from "@/lib/supabase/personalMemory";
import {
  fetchSharedMemories,
  updateSharedMemory,
} from "@/lib/supabase/sharedMemory";
import {
  fetchSharedInsights,
  insertSharedInsight,
} from "@/lib/supabase/sharedInsight";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PersonalMemoryRow } from "@/types/personalMemory";
import type { SharedMemoryRow } from "@/types/sharedMemory";

/* ------------------------------------------------------------------ */
/*  1. Confidence Decay                                                */
/* ------------------------------------------------------------------ */

/**
 * Decay rate per day of inactivity. Memories that haven't been
 * reinforced lose this much confidence per day since last update.
 *
 * A memory at confidence 1.0 that hasn't been touched in 30 days
 * would drop to 1.0 - (30 * 0.005) = 0.85 — gentle but meaningful.
 *
 * Memories below 0.3 confidence are deactivated (soft-deleted).
 */
const DECAY_RATE_PER_DAY = 0.005;
const MIN_CONFIDENCE_THRESHOLD = 0.3;

/**
 * How old a memory must be (in days) before decay starts.
 * Fresh memories get a grace period.
 */
const GRACE_PERIOD_DAYS = 7;

/**
 * Run confidence decay on all active memories for a specific user.
 * Call this from a cron job or after a batch of conversations.
 */
export async function runConfidenceDecay(
  supabase: SupabaseClient,
  userId: string,
  partnershipId?: string | null,
): Promise<{ decayed: number; deactivated: number }> {
  const now = Date.now();
  let decayed = 0;
  let deactivated = 0;

  // ── Personal memories ──
  const personalMemories = await fetchPersonalMemories(supabase, userId);
  for (const mem of personalMemories) {
    const result = await decayMemory(supabase, mem, now, "personal");
    if (result === "decayed") decayed++;
    if (result === "deactivated") deactivated++;
  }

  // ── Shared memories ──
  if (partnershipId) {
    const sharedMemories = await fetchSharedMemories(supabase, partnershipId);
    for (const mem of sharedMemories) {
      const result = await decayMemory(supabase, mem, now, "shared");
      if (result === "decayed") decayed++;
      if (result === "deactivated") deactivated++;
    }
  }

  console.log(
    `[memory-decay] User ${userId}: ${decayed} decayed, ${deactivated} deactivated`,
  );

  return { decayed, deactivated };
}

async function decayMemory(
  supabase: SupabaseClient,
  mem: PersonalMemoryRow | SharedMemoryRow,
  now: number,
  type: "personal" | "shared",
): Promise<"unchanged" | "decayed" | "deactivated"> {
  const updatedAt = new Date(mem.updated_at).getTime();
  const daysSinceUpdate = (now - updatedAt) / (1000 * 60 * 60 * 24);

  // Grace period — don't decay recently updated memories
  if (daysSinceUpdate < GRACE_PERIOD_DAYS) return "unchanged";

  const decayAmount =
    (daysSinceUpdate - GRACE_PERIOD_DAYS) * DECAY_RATE_PER_DAY;
  const newConfidence = Math.max(0, mem.confidence - decayAmount);

  // Only update if the confidence actually changed meaningfully
  if (Math.abs(newConfidence - mem.confidence) < 0.001) return "unchanged";

  const shouldDeactivate = newConfidence < MIN_CONFIDENCE_THRESHOLD;

  if (type === "personal") {
    await updatePersonalMemory(supabase, mem.id, {
      confidence: newConfidence,
      isActive: !shouldDeactivate,
    });
  } else {
    await updateSharedMemory(supabase, mem.id, {
      confidence: newConfidence,
      isActive: !shouldDeactivate,
    });
  }

  return shouldDeactivate ? "deactivated" : "decayed";
}

/* ------------------------------------------------------------------ */
/*  2. Insight Regeneration                                            */
/* ------------------------------------------------------------------ */

/**
 * Re-evaluate active memories for a partnership and regenerate insights.
 * Deactivates outdated insights and creates new ones based on current
 * active memory state.
 *
 * Should be called periodically (e.g. every 10 conversations or daily).
 */
export async function runInsightRegeneration(
  supabase: SupabaseClient,
  userId: string,
  partnershipId: string,
  partnerId: string,
  provider: string = "deepseek",
  model?: string,
): Promise<{ deactivated: number; created: number }> {
  // Load current active data
  const [personalMemories, sharedMemories, existingInsights] =
    await Promise.all([
      fetchPersonalMemories(supabase, userId),
      fetchSharedMemories(supabase, partnershipId),
      fetchSharedInsights(supabase, partnershipId),
    ]);

  if (personalMemories.length === 0 && sharedMemories.length === 0) {
    return { deactivated: 0, created: 0 };
  }

  // Format memories for the LLM
  const memoryLines = [
    ...personalMemories.map(
      (m) =>
        `- [personal/${m.category}] ${m.content} (confidence: ${m.confidence.toFixed(2)})`,
    ),
    ...sharedMemories.map(
      (m) =>
        `- [shared/${m.category}] ${m.content} (confidence: ${m.confidence.toFixed(2)})`,
    ),
  ].join("\n");

  const existingInsightLines = existingInsights
    .map(
      (i) =>
        `- [${i.category}] "${i.title}": ${i.content} (confidence: ${i.confidence.toFixed(2)})`,
    )
    .join("\n");

  const prompt = `You are an insight evaluation system for Nova Star AI.

Given the current active memories and existing insights, determine:
1. Which existing insights are now OUTDATED (contradicted by newer memories or no longer supported)
2. What NEW insights can be derived from the current memories

CURRENT ACTIVE MEMORIES:
${memoryLines}

EXISTING INSIGHTS:
${existingInsightLines || "(none)"}

Return a JSON object:
{
  "outdatedInsights": ["exact title of outdated insight", ...],
  "newInsights": [
    {
      "category": "emotional_need" | "communication" | "appreciation" | "conflict_style" | "growth_area" | "strength" | "gift_relevant",
      "title": "short label",
      "content": "the insight",
      "aboutUser": "current" | "partner" | "relationship",
      "confidence": 0-1
    }
  ]
}

Rules:
- Only mark insights outdated if memories clearly contradict them
- Only create insights that are genuinely new (not already existing)
- Be conservative — quality over quantity
- Return ONLY valid JSON, no markdown fences
`;

  const messages: ChatMessage[] = [
    { role: "system", content: "You are an insight evaluation system." },
    { role: "user", content: prompt },
  ];

  const result = await callProvider(messages, {
    provider: provider as "deepseek" | "openai",
    model,
    temperature: 0.3,
  });

  if (!result.ok || !result.text.trim()) {
    return { deactivated: 0, created: 0 };
  }

  let jsonText = result.text.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  let evaluation: {
    outdatedInsights?: string[];
    newInsights?: Array<{
      category: string;
      title: string;
      content: string;
      aboutUser?: "current" | "partner" | "relationship";
      confidence: number;
    }>;
  };

  try {
    evaluation = JSON.parse(jsonText);
  } catch {
    console.warn("[insight-regen] Invalid JSON response");
    return { deactivated: 0, created: 0 };
  }

  let deactivatedCount = 0;
  let createdCount = 0;

  // Deactivate outdated insights
  if (evaluation.outdatedInsights?.length) {
    for (const title of evaluation.outdatedInsights) {
      const match = existingInsights.find(
        (i) => i.title.toLowerCase() === title.toLowerCase(),
      );
      if (match) {
        await deactivateInsight(supabase, match.id);
        deactivatedCount++;
      }
    }
  }

  // Create new insights
  if (evaluation.newInsights?.length) {
    for (const ins of evaluation.newInsights) {
      const aboutUser =
        ins.aboutUser === "current"
          ? userId
          : ins.aboutUser === "partner"
            ? partnerId
            : null;

      await insertSharedInsight(supabase, {
        partnershipId,
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
      });
      createdCount++;
    }
  }

  console.log(
    `[insight-regen] Partnership ${partnershipId}: ` +
      `${deactivatedCount} deactivated, ${createdCount} created`,
  );

  return { deactivated: deactivatedCount, created: createdCount };
}

/* ------------------------------------------------------------------ */
/*  Helper — deactivate a shared insight                               */
/* ------------------------------------------------------------------ */

async function deactivateInsight(
  supabase: SupabaseClient,
  insightId: string,
): Promise<void> {
  const { error } = await supabase
    .from("shared_insights")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", insightId);

  if (error) {
    console.error("deactivateInsight error:", error);
  }
}
