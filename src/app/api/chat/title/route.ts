import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseCookieMethods } from "@/types/supabase";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "SUPABASE_SERVICE_ROLE_KEY is not set — refusing to fall back to anon key.",
  );
}

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_URL =
  process.env.DEEPSEEK_API_URL ??
  "https://api.deepseek.com/v1/chat/completions";

export async function POST(req: NextRequest) {
  try {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 },
      );
    }

    /**
     * Authenticate caller
     */
    const authClient = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll() {
          // no-op for API route
        },
      } as SupabaseCookieMethods,
    });

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

    /**
     * Verify chatId belongs to authenticated user
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
