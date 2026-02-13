import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
    const systemMsg =
      systemPrompt ??
      "You are a kind, warm, thoughtful, emotionally intelligent assistant. also try to use emoji to feel more human. When writing math: don't use [] or ()";

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
     * 6️⃣ Return response
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
