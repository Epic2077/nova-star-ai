import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Incoming = {
  chatId: string;
  content: string;
  role?: "user" | "assistant";
  provider?: "deepseek" | "openai"; // optional override
  model?: string; // optional model name to forward to provider
  systemPrompt?: string; // optional system instruction
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";
const OPENAI_KEY =
  process.env.OPENAI_API_KEY ?? process.env.NEXT_PUBLIC_OPENAI_KEY ?? "";
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY ?? "";
const DEEPSEEK_URL = process.env.DEEPSEEK_URL ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "Supabase configuration missing: check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "Chat API available" });
}

export async function POST(req: Request) {
  let body: Incoming;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const {
    chatId,
    content,
    role = "user",
    provider,
    model,
    systemPrompt,
  } = body;
  if (!chatId || !content) {
    return NextResponse.json(
      { ok: false, error: "Missing chatId or content" },
      { status: 400 },
    );
  }

  // insert the user message into Supabase
  const { data: userMessage, error: insertError } = await supabase
    .from("messages")
    .insert([
      {
        chat_id: chatId,
        content,
        role,
      },
    ])
    .select("id, chat_id, content, role, created_at")
    .single();

  if (insertError) {
    console.error("Supabase insert error (messages):", insertError);
    return NextResponse.json(
      {
        ok: false,
        error:
          insertError.message ||
          insertError.details ||
          JSON.stringify(insertError),
      },
      { status: 500 },
    );
  }

  // If caller requested Deepseek explicitly or Deepseek is configured and preferred, call Deepseek
  const shouldUseDeepseek =
    provider === "deepseek" ||
    (provider !== "openai" && DEEPSEEK_KEY && DEEPSEEK_URL);

  if (shouldUseDeepseek) {
    if (!DEEPSEEK_KEY || !DEEPSEEK_URL) {
      return NextResponse.json(
        { ok: false, error: "Deepseek not configured on server" },
        { status: 500 },
      );
    }

    try {
      // forward model/systemPrompt when provided
      const dsBody: Record<string, unknown> = { input: content };
      if (model) {
        dsBody.model = model;
      } else {
        dsBody.model = "deepseek-chat";
      }
      if (systemPrompt) {
        dsBody.system_prompt = systemPrompt;
      } else {
        dsBody.system_prompt = "You are a helpful assistant.";
      }

      const resp = await fetch(DEEPSEEK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DEEPSEEK_KEY}`,
        },
        body: JSON.stringify(dsBody),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        return NextResponse.json({ ok: false, error: txt }, { status: 502 });
      }

      const payload = await resp.json();
      // try common response shapes (allow provider to return 'output' or 'result' or nested array)
      const assistantText =
        payload.output ??
        payload.result ??
        payload.response ??
        payload[0]?.output ??
        payload[0]?.result ??
        "";

      const { data: assistantMessage, error: assistantInsertError } =
        await supabase
          .from("messages")
          .insert([
            {
              chat_id: chatId,
              content: assistantText,
              role: "assistant",
            },
          ])
          .select("id, chat_id, content, role, created_at")
          .single();

      if (assistantInsertError) {
        console.error(
          "Supabase insert error (assistant message):",
          assistantInsertError,
        );
        return NextResponse.json(
          {
            ok: false,
            error:
              assistantInsertError.message ||
              assistantInsertError.details ||
              JSON.stringify(assistantInsertError),
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        ok: true,
        provider: "deepseek",
        model: model ?? null,
        userMessage,
        assistantMessage,
      });
    } catch {
      return NextResponse.json(
        { ok: false, error: "Deepseek request failed" },
        { status: 500 },
      );
    }
  }

  // If we don't have an OpenAI key, return the stored message only
  if (!OPENAI_KEY) {
    return NextResponse.json({ ok: true, userMessage });
  }

  // call OpenAI ChatCompletion to get assistant reply
  try {
    const modelToUse = model ?? "gpt-3.5-turbo";
    const systemMsg = systemPrompt ?? "You are a helpful assistant.";

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: [
          { role: "system", content: systemMsg },
          { role: "user", content },
        ],
        max_tokens: 800,
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return NextResponse.json({ ok: false, error: txt }, { status: 502 });
    }

    const payload = await resp.json();
    const assistantText = payload?.choices?.[0]?.message?.content ?? "";

    // persist assistant reply
    const { data: assistantMessage, error: assistantInsertError } =
      await supabase
        .from("messages")
        .insert([
          {
            chat_id: chatId,
            content: assistantText,
            role: "assistant",
          },
        ])
        .select("id, chat_id, content, role, created_at")
        .single();

    if (assistantInsertError) {
      console.error(
        "Supabase insert error (assistant message):",
        assistantInsertError,
      );
      return NextResponse.json(
        {
          ok: false,
          error:
            assistantInsertError.message ||
            assistantInsertError.details ||
            JSON.stringify(assistantInsertError),
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      provider: "openai",
      model: modelToUse,
      userMessage,
      assistantMessage,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "AI request failed" },
      { status: 500 },
    );
  }
}
