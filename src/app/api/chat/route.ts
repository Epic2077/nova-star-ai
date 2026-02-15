import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { NOVA_CORE_PROMPT } from "@/lib/prompts/novaCore";
import { NOVA_MEMORY_LAYER_PROMPT } from "@/lib/prompts/novaMemory";
import { NOVA_INSIGHT_LAYER_PROMPT } from "@/lib/prompts/novaInsight";
import { NOVA_REFERENCE_PROMPT } from "@/lib/prompts/novaReference";

/**
 * ENV
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const OPENAI_KEY = process.env.OPENAI_API_KEY;

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_URL =
  process.env.DEEPSEEK_API_URL ??
  "https://api.deepseek.com/v1/chat/completions";

/**
 * Supabase Admin Client (server only)
 */
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * POST /api/chat
 */
export async function POST(req: NextRequest) {
  try {
    const {
      content,
      chatId,
      provider = "deepseek", // default to deepseek for now
      model,
      systemPrompt,
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
     * 3️⃣ Build message array
     */
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

    const systemMsg = systemPrompt ?? layeredSystemPrompt + memoryContext;

    const messages = [
      { role: "system", content: systemMsg },
      ...(history ?? []),
      { role: "user", content },
    ];

    /**
     * 4️⃣ Call Provider
     */
    let assistantText = "";

    if (provider === "deepseek") {
      if (!DEEPSEEK_KEY) {
        return NextResponse.json(
          { error: "DeepSeek API key missing" },
          { status: 500 },
        );
      }

      const resp = await fetch(DEEPSEEK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DEEPSEEK_KEY}`,
        },
        body: JSON.stringify({
          model: model ?? "deepseek-chat",
          messages,
          temperature: 0.7,
        }),
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        console.error("DeepSeek error:", errorText);
        return NextResponse.json(
          { error: "DeepSeek request failed" },
          { status: 500 },
        );
      }

      const payload = await resp.json();
      assistantText = payload.choices?.[0]?.message?.content ?? "";
    } else {
      /**
       * OPENAI (modern Responses API)
       * Safe for when you switch later
       */
      if (!OPENAI_KEY) {
        return NextResponse.json(
          { error: "OpenAI API key missing" },
          { status: 500 },
        );
      }

      const resp = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_KEY}`,
        },
        body: JSON.stringify({
          model: model ?? "gpt-4.1-mini",
          input: messages,
          temperature: 0.7,
        }),
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        console.error("OpenAI error:", errorText);
        return NextResponse.json(
          { error: "OpenAI request failed" },
          { status: 500 },
        );
      }

      const payload = await resp.json();
      assistantText =
        payload.output?.[0]?.content?.[0]?.text ?? payload.output_text ?? "";
    }

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
     * 6️⃣ Memory System - Summarize every 20 messages
     */
    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("chat_id", chatId);

    // Generate summary every 20 messages (20, 40, 60, etc.)
    if (count && count % 20 === 0) {
      try {
        // Fetch the last 20 messages
        const { data: last20Messages } = await supabase
          .from("messages")
          .select("role, content, created_at")
          .eq("chat_id", chatId)
          .order("created_at", { ascending: true })
          .range(count - 20, count - 1);

        if (last20Messages && last20Messages.length > 0) {
          // Build summary prompt
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

          // Call AI to generate summary
          const summaryMessages = [
            {
              role: "system",
              content: "You are a memory system for Nova Star AI.",
            },
            { role: "user", content: summaryPrompt },
          ];

          let summaryText = "";

          if (provider === "deepseek" && DEEPSEEK_KEY) {
            const summaryResp = await fetch(DEEPSEEK_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${DEEPSEEK_KEY}`,
              },
              body: JSON.stringify({
                model: model ?? "deepseek-chat",
                messages: summaryMessages,
                temperature: 0.5,
              }),
            });

            if (summaryResp.ok) {
              const summaryPayload = await summaryResp.json();
              summaryText = summaryPayload.choices?.[0]?.message?.content ?? "";
            }
          } else if (OPENAI_KEY) {
            const summaryResp = await fetch(
              "https://api.openai.com/v1/responses",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${OPENAI_KEY}`,
                },
                body: JSON.stringify({
                  model: model ?? "gpt-4.1-mini",
                  input: summaryMessages,
                  temperature: 0.5,
                }),
              },
            );

            if (summaryResp.ok) {
              const summaryPayload = await summaryResp.json();
              summaryText =
                summaryPayload.output?.[0]?.content?.[0]?.text ??
                summaryPayload.output_text ??
                "";
            }
          }

          // Store summary in chats table
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
        }
      } catch (summaryError) {
        console.error("Memory summarization error:", summaryError);
        // Don't fail the request if summarization fails
      }
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
