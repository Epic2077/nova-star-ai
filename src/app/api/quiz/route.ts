/**
 * POST /api/quiz — process personality quiz answers with AI
 *
 * Receives an array of { question, answer } pairs, sends them to the
 * AI to generate a structured personality profile, then writes the
 * result to the user_profiles table.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { callProvider, type ChatMessage } from "@/lib/ai/provider";
import type { PersonalitySummary } from "@/types/userProfile";

interface QuizAnswer {
  question: string;
  answer: string;
}

const QUIZ_PROMPT = `You are a personality analyst for Nova Star AI, a relationship-focused AI companion.

The user just completed a personality quiz. Based on their answers, generate a structured personality profile in JSON format.

Return ONLY valid JSON with this exact structure (fill in based on the answers):
{
  "traits": ["trait1", "trait2", ...],
  "emotionalTendencies": ["tendency1", "tendency2", ...],
  "communicationPreferences": ["preference1", "preference2", ...],
  "values": ["value1", "value2", ...],
  "stressResponses": ["response1", "response2", ...],
  "humor": "description of their humor style",
  "boundaries": ["boundary1", "boundary2", ...],
  "notes": "A 2-3 sentence summary of this person's personality.",
  "tone": "their preferred communication tone in 2-3 words",
  "interests": ["interest1", "interest2", ...],
  "emotionalPatterns": "A sentence describing how they process emotions",
  "communicationStyle": "Their communication style in 2-3 words"
}

Rules:
- Be insightful but not presumptuous
- Each array should have 3-6 items
- Base everything on what they actually wrote
- Be warm and positive in tone
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
    .map((a, i) => `Q${i + 1}: ${a.question}\nA: ${a.answer}`)
    .join("\n\n");

  const messages: ChatMessage[] = [
    { role: "system", content: QUIZ_PROMPT },
    {
      role: "user",
      content: `Here are the user's quiz answers:\n\n${answersText}\n\nGenerate their personality profile as JSON:`,
    },
  ];

  const result = await callProvider(messages, {
    provider: "deepseek",
    temperature: 0.4,
  });

  if (!result.ok) {
    console.error("Quiz AI error:", result.error);
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
    console.error("Quiz: invalid JSON from AI:", jsonText);
    return NextResponse.json(
      { error: "Failed to parse AI response" },
      { status: 500 },
    );
  }

  // Build the personality summary
  const memorySummary: PersonalitySummary = {
    traits: (profile.traits as string[]) ?? [],
    emotionalTendencies: (profile.emotionalTendencies as string[]) ?? [],
    communicationPreferences:
      (profile.communicationPreferences as string[]) ?? [],
    values: (profile.values as string[]) ?? [],
    stressResponses: (profile.stressResponses as string[]) ?? [],
    humor: (profile.humor as string) ?? undefined,
    boundaries: (profile.boundaries as string[]) ?? [],
    notes: (profile.notes as string) ?? undefined,
  };

  // Update user_profiles with the quiz results
  const { error: updateError } = await serviceClient
    .from("user_profiles")
    .update({
      tone: (profile.tone as string) ?? null,
      interests: (profile.interests as string[]) ?? null,
      emotional_patterns: (profile.emotionalPatterns as string) ?? null,
      communication_style: (profile.communicationStyle as string) ?? null,
      memory_summary: memorySummary,
      setup_mode: "quiz_generated",
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError) {
    console.error("Quiz profile update error:", updateError);
    return NextResponse.json(
      { error: "Failed to save profile" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, profile: memorySummary });
}
