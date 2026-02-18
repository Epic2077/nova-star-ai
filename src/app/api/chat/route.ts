import { NextRequest, NextResponse } from "next/server";
import { NOVA_CORE_PROMPT } from "@/lib/prompts/novaCore";
import { NOVA_MEMORY_LAYER_PROMPT } from "@/lib/prompts/novaMemory";
import { NOVA_INSIGHT_LAYER_PROMPT } from "@/lib/prompts/novaInsight";
import { NOVA_REFERENCE_PROMPT } from "@/lib/prompts/novaReference";
import { callProvider, type ChatMessage } from "@/lib/ai/provider";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/chat
 */
export async function POST(req: NextRequest) {
  try {
    const serviceClient = createServiceClient();
    if (!serviceClient) {
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 },
      );
    }

    /**
     * 0️⃣ Authenticate caller
     */
    const authClient = createAuthClient(req);

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = serviceClient;

    const {
      content,
      chatId,
      provider = "deepseek", // default to deepseek for now
      model,
      useMemoryLayer = true, // always on for user continuity
      useInsightLayer = false,
      useReferenceLayer = false,
    } = await req.json();

    if (!content || !chatId) {
      return NextResponse.json(
        { error: "Missing content or chatId" },
        { status: 400 },
      );
    }

    /**
     * 0.5️⃣ Verify chatId belongs to authenticated user
     */
    const { data: chatOwner, error: ownerError } = await supabase
      .from("chats")
      .select("user_id")
      .eq("id", chatId)
      .single();

    if (ownerError || !chatOwner) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    if (chatOwner.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    /**
     * 1️⃣ Get conversation history
     */
    const { data: history, error: historyError } = await supabase
      .from("messages")
      .select("role, content")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (historyError) {
      console.error("History fetch error:", historyError);
      return NextResponse.json(
        { error: "Failed to fetch chat history" },
        { status: 500 },
      );
    }

    /**
     * 1.5️⃣ Fetch chat record (for memory summary)
     */
    const { data: chatData, error: chatError } = await supabase
      .from("chats")
      .select("memory_summary")
      .eq("id", chatId)
      .single();

    if (chatError) {
      console.error("Chat fetch error:", chatError);
    }

    /**
     * 2️⃣ Save user message
     */
    const { error: insertUserError } = await supabase.from("messages").insert({
      chat_id: chatId,
      role: "user",
      content,
    });

    if (insertUserError) {
      console.error("User insert error:", insertUserError);
      return NextResponse.json(
        { error: "Failed to save user message" },
        { status: 500 },
      );
    }

    /**
     * 3️⃣ Build message array (with history truncation)
     *
     * To avoid hitting token limits on long conversations, we send at most
     * the last MAX_HISTORY_MESSAGES messages. The memory summary (generated
     * every 20 messages) captures older context so nothing is truly lost.
     */
    const MAX_HISTORY_MESSAGES = 50;

    const memoryContext =
      useMemoryLayer && chatData?.memory_summary
        ? `\n\nPREVIOUS CONVERSATION MEMORY:\n${chatData.memory_summary}`
        : "";

    const layeredSystemPrompt = [
      NOVA_CORE_PROMPT,
      useMemoryLayer ? NOVA_MEMORY_LAYER_PROMPT : null,
      useInsightLayer ? NOVA_INSIGHT_LAYER_PROMPT : null,
      useReferenceLayer ? NOVA_REFERENCE_PROMPT : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const systemMsg = layeredSystemPrompt + memoryContext;

    const truncatedHistory = (history ?? []).slice(-MAX_HISTORY_MESSAGES);

    const messages: ChatMessage[] = [
      { role: "system", content: systemMsg },
      ...(truncatedHistory as ChatMessage[]),
      { role: "user", content },
    ];

    /**
     * 4️⃣ Call Provider
     */
    const result = await callProvider(messages, { provider, model });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    const assistantText = result.text;

    /**
     * 5️⃣ Save assistant reply
     */
    const { error: insertAssistantError } = await supabase
      .from("messages")
      .insert({
        chat_id: chatId,
        role: "assistant",
        content: assistantText,
      });

    if (insertAssistantError) {
      console.error("Assistant insert error:", insertAssistantError);
      return NextResponse.json(
        { error: "Failed to save assistant message" },
        { status: 500 },
      );
    }

    /**
     * 6️⃣ Memory System - Summarize every 20 messages (non-blocking)
     *
     * Fire-and-forget: the response is returned immediately while
     * memory summarization runs in the background.
     */
    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("chat_id", chatId);

    // Generate summary every 20 messages (20, 40, 60, etc.)
    if (count && count % 20 === 0) {
      // Run summarization in background — do NOT await
      void (async () => {
        try {
          const { data: last20Messages } = await supabase
            .from("messages")
            .select("role, content, created_at")
            .eq("chat_id", chatId)
            .order("created_at", { ascending: true })
            .range(count - 20, count - 1);

          if (!last20Messages || last20Messages.length === 0) return;

          const conversationText = last20Messages
            .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
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
            provider,
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
      })();
    }

    /**
     * 7️⃣ Return response
     */
    return NextResponse.json({ reply: assistantText });
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 },
    );
  }
}
