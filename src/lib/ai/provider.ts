/**
 * Shared AI provider abstraction.
 *
 * Centralises all DeepSeek / OpenAI fetch logic so the individual
 * API routes don't need to duplicate the same branching.
 */

/* ------------------------------------------------------------------ */
/*  Environment                                                        */
/* ------------------------------------------------------------------ */

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_URL =
  process.env.DEEPSEEK_API_URL ??
  "https://api.deepseek.com/v1/chat/completions";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ProviderOptions = {
  provider?: "deepseek" | "openai";
  model?: string;
  temperature?: number;
};

export type ProviderResult =
  | { ok: true; text: string }
  | { ok: false; error: string; status: number };

/* ------------------------------------------------------------------ */
/*  Core function                                                      */
/* ------------------------------------------------------------------ */

/**
 * Call the configured AI provider and return the assistant text.
 *
 * Works for both chat completions and simpler single-prompt calls
 * (pass a single-element `messages` array for the latter).
 */
export async function callProvider(
  messages: ChatMessage[] | string,
  opts: ProviderOptions = {},
): Promise<ProviderResult> {
  const { provider = "deepseek", model, temperature = 0.7 } = opts;

  // Normalise: if a plain string is passed, wrap it as a user message
  const msgArray: ChatMessage[] =
    typeof messages === "string"
      ? [{ role: "user", content: messages }]
      : messages;

  if (provider === "deepseek") {
    if (!DEEPSEEK_KEY) {
      return { ok: false, error: "DeepSeek API key missing", status: 500 };
    }

    const resp = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_KEY}`,
      },
      body: JSON.stringify({
        model: model ?? "deepseek-chat",
        messages: msgArray,
        temperature,
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error("DeepSeek error:", txt);
      return { ok: false, error: "DeepSeek request failed", status: 500 };
    }

    const payload = await resp.json();
    return { ok: true, text: payload.choices?.[0]?.message?.content ?? "" };
  }

  // OpenAI (Responses API)
  if (!OPENAI_KEY) {
    return { ok: false, error: "OpenAI API key missing", status: 500 };
  }

  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: model ?? "gpt-4.1-mini",
      input: msgArray,
      temperature,
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    console.error("OpenAI error:", txt);
    return { ok: false, error: "OpenAI request failed", status: 500 };
  }

  const payload = await resp.json();
  const text =
    payload.output?.[0]?.content?.[0]?.text ?? payload.output_text ?? "";
  return { ok: true, text };
}
