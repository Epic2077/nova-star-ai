/**
 * POST /api/quiz/partner — process partner perception quiz answers with AI
 *
 * Receives an array of { section, question, answer } pairs, sends them to the
 * AI to generate a structured partner profile, then writes the result to the
 * partner_profiles table and creates shared memories.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { callProvider, type ChatMessage } from "@/lib/ai/provider";

interface QuizAnswer {
  section: string;
  question: string;
  answer: string;
}

const PARTNER_QUIZ_PROMPT = `You are a relationship analyst for Nova Star AI, a relationship-focused AI companion.

The user just completed a quiz about how they see their partner. Based on their answers, generate TWO things:

1. A structured partner profile (how the user perceives their partner)
2. A list of shared memories to store (factual statements extracted from the answers)

Return ONLY valid JSON with this exact structure:
{
  "name": "partner's name if mentioned, otherwise 'Partner'",
  "traits": ["trait1", "trait2", ...],
  "relationalTendencies": ["tendency1", "tendency2", ...],
  "importantTruths": ["truth1", "truth2", ...],
  "aiNotes": "A 2-3 sentence summary of how the user sees their partner and the relationship dynamics.",
  "sharedMemories": [
    {
      "content": "factual statement about the partner or relationship",
      "category": "preference|emotional_need|important_date|gift_idea|growth_moment|pattern|general",
      "about": "partner|relationship"
    }
  ]
}

Rules:
- Extract 5-10 shared memories from the answers — concrete facts Nova should remember
- Each trait/tendency should be concise (3-8 words)
- Be insightful but not presumptuous — stay close to what was actually written
- Be warm and empathetic in ai_notes
- Return ONLY JSON, no markdown fences, no explanation
`;

export async function POST(req: NextRequest) {
  const authClient = createAuthClient(req);
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceClient();
  if (!serviceClient) {
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 },
    );
  }

  const body = await req.json();
  const answers: QuizAnswer[] = body.answers;

  if (!answers?.length) {
    return NextResponse.json({ error: "No answers provided" }, { status: 400 });
  }

  // Format answers for the AI
  const answersText = answers
    .map((a, i) => `[${a.section}] Q${i + 1}: ${a.question}\nA: ${a.answer}`)
    .join("\n\n");

  const messages: ChatMessage[] = [
    { role: "system", content: PARTNER_QUIZ_PROMPT },
    {
      role: "user",
      content: `Here are the user's quiz answers about their partner:\n\n${answersText}\n\nGenerate the partner profile and shared memories as JSON:`,
    },
  ];

  const result = await callProvider(messages, {
    provider: "deepseek",
    temperature: 0.4,
  });

  if (!result.ok) {
    console.error("Partner quiz AI error:", result.error);
    return NextResponse.json(
      { error: "AI processing failed" },
      { status: 500 },
    );
  }

  // Parse the AI response
  let jsonText = result.text.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  let profile: Record<string, unknown>;
  try {
    profile = JSON.parse(jsonText);
  } catch {
    console.error("Partner quiz: invalid JSON from AI:", jsonText);
    return NextResponse.json(
      { error: "Failed to parse AI response" },
      { status: 500 },
    );
  }

  // Look up partnership
  const { data: partnership } = await serviceClient
    .from("partnerships")
    .select("*")
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    .eq("status", "active")
    .maybeSingle();

  const partnerId = partnership
    ? partnership.user_a === user.id
      ? partnership.user_b
      : partnership.user_a
    : null;

  // Upsert partner profile
  const { data: existingProfile } = await serviceClient
    .from("partner_profiles")
    .select("id")
    .eq("owner_user_id", user.id)
    .maybeSingle();

  const profilePayload = {
    owner_user_id: user.id,
    partnership_id: partnership?.id ?? null,
    about_user_id: partnerId ?? null,
    name: (profile.name as string) ?? "Partner",
    traits: (profile.traits as string[]) ?? [],
    relational_tendencies: (profile.relationalTendencies as string[]) ?? [],
    important_truths: (profile.importantTruths as string[]) ?? [],
    ai_notes: (profile.aiNotes as string) ?? null,
    quiz_answers: answers,
    source: "quiz_generated" as const,
    updated_at: new Date().toISOString(),
  };

  if (existingProfile) {
    const { error } = await serviceClient
      .from("partner_profiles")
      .update(profilePayload)
      .eq("id", existingProfile.id);

    if (error) {
      console.error("Partner quiz profile update error:", error);
      return NextResponse.json(
        { error: "Failed to save profile" },
        { status: 500 },
      );
    }
  } else {
    const { error } = await serviceClient
      .from("partner_profiles")
      .insert(profilePayload);

    if (error) {
      console.error("Partner quiz profile insert error:", error);
      return NextResponse.json(
        { error: "Failed to save profile" },
        { status: 500 },
      );
    }
  }

  // Create shared memories from the AI-extracted facts (only if partnership exists)
  if (partnership) {
    const memories =
      (profile.sharedMemories as Array<{
        content: string;
        category: string;
        about: string;
      }>) ?? [];

    const validCategories = new Set([
      "preference",
      "emotional_need",
      "important_date",
      "gift_idea",
      "growth_moment",
      "pattern",
      "general",
    ]);

    const inserts = memories
      .filter((m) => m.content && validCategories.has(m.category))
      .map((m) => ({
        partnership_id: partnership.id,
        category: m.category,
        about_user: m.about === "partner" ? partnerId : null,
        content: m.content,
        confidence: 0.9, // High confidence — directly from user input
        source_message_id: null,
      }));

    if (inserts.length > 0) {
      const { error: memError } = await serviceClient
        .from("shared_memories")
        .insert(inserts);

      if (memError) {
        console.error("Partner quiz shared_memories insert error:", memError);
        // Non-fatal — profile was saved, memories failed
      }
    }
  }

  return NextResponse.json({ ok: true });
}
