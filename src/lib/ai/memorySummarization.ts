/**
 * Per-chat memory summarization.
 *
 * Every 20 messages a secondary (non-streaming) LLM call generates a
 * concise summary of the latest segment and appends it to the chat's
 * `memory_summary` column so Nova can reference it in future turns.
 */

import { callProvider, type ChatMessage } from "@/lib/ai/provider";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function runMemorySummarization(
  supabase: SupabaseClient,
  chatId: string,
  chatData: { memory_summary?: string | null } | null,
  provider: string,
  model: string | undefined,
) {
  try {
    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("chat_id", chatId);

    if (!count || count % 20 !== 0) return;

    const { data: last20Messages } = await supabase
      .from("messages")
      .select("role, content, created_at")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })
      .range(count - 20, count - 1);

    if (!last20Messages || last20Messages.length === 0) return;

    const conversationText = last20Messages
      .map(
        (msg: { role: string; content: string }) =>
          `${msg.role.toUpperCase()}: ${msg.content}`,
      )
      .join("\n\n");

    const summaryPrompt = `You are a memory summarization system for Nova Star AI. Generate a concise but comprehensive summary of the following 20-message conversation segment. Focus on:
- Key topics discussed
- Emotional patterns
- Important information shared (preferences, dates, names, etc.)
- Relationship dynamics
- Any ongoing concerns or themes

Do not include every detail, but capture what matters for future continuity.

CONVERSATION:
${conversationText}

SUMMARY:`;

    const summaryMessages: ChatMessage[] = [
      {
        role: "system",
        content: "You are a memory system for Nova Star AI.",
      },
      { role: "user", content: summaryPrompt },
    ];

    const summaryResult = await callProvider(summaryMessages, {
      provider: provider as "deepseek" | "openai",
      model,
      temperature: 0.5,
    });

    const summaryText = summaryResult.ok ? summaryResult.text : "";

    if (summaryText) {
      const existingSummary = chatData?.memory_summary || "";
      const updatedSummary = existingSummary
        ? `${existingSummary}\n\n---\n\nSegment ${count / 20}:\n${summaryText}`
        : `Segment 1:\n${summaryText}`;

      await supabase
        .from("chats")
        .update({
          memory_summary: updatedSummary,
          memory_updated_at: new Date().toISOString(),
        })
        .eq("id", chatId);

      console.log(
        `Generated memory summary for chat ${chatId} at message ${count}`,
      );
    }
  } catch (summaryError) {
    console.error("Memory summarization error:", summaryError);
  }
}
