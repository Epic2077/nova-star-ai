import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_URL =
  process.env.DEEPSEEK_API_URL ??
  "https://api.deepseek.com/v1/chat/completions";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(req: NextRequest) {
  try {
    const {
      chatId,
      firstUserMessage,
      provider = "deepseek",
      model,
    } = await req.json();

    if (!chatId || !firstUserMessage) {
      return NextResponse.json(
        { error: "Missing chatId or message" },
        { status: 400 },
      );
    }

    const titlePrompt = `Generate a short, concise title (3-6 words max) for this conversation.\nDo not use quotes.\nDo not add punctuation.\nConversation:\n${firstUserMessage}`;

    let titleText = "";

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
          messages: [{ role: "user", content: titlePrompt }],
          temperature: 0.0,
        }),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        console.error("DeepSeek title error:", txt);
        return NextResponse.json(
          { error: "Title generation failed" },
          { status: 500 },
        );
      }

      const payload = await resp.json();
      titleText = payload.choices?.[0]?.message?.content ?? "";
    } else {
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
          input: titlePrompt,
          temperature: 0.0,
        }),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        console.error("OpenAI title error:", txt);
        return NextResponse.json(
          { error: "Title generation failed" },
          { status: 500 },
        );
      }

      const payload = await resp.json();
      titleText =
        payload.output?.[0]?.content?.[0]?.text ?? payload.output_text ?? "";
    }

    // sanitize and enforce 3-6 words (best-effort): remove quotes/punctuation and trim
    let title = String(titleText || "")
      .split("\n")[0]
      .trim();
    // remove surrounding quotes and punctuation
    title = title.replace(/^"|"$/g, "");
    title = title.replace(/[\p{P}\p{S}]+/gu, "");
    // collapse whitespace
    title = title.replace(/\s+/g, " ").trim();

    // enforce 3-6 words: if title has >6 words, keep first 6; if <3 leave as-is
    const words = title.split(" ").filter(Boolean);
    if (words.length > 6) title = words.slice(0, 6).join(" ");

    if (!title) {
      return NextResponse.json(
        { error: "Empty title generated" },
        { status: 500 },
      );
    }

    const { error: updateError } = await supabase
      .from("chats")
      .update({ title })
      .eq("id", chatId);
    if (updateError) {
      console.error("Failed to update chat title:", updateError);
      return NextResponse.json(
        { error: "Failed to update chat title" },
        { status: 500 },
      );
    }

    return NextResponse.json({ title });
  } catch (err) {
    console.error("Title API error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 },
    );
  }
}
