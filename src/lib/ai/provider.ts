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
  /** Enable deep-thinking / reasoning mode */
  deepThinking?: boolean;
  /** AbortSignal to cancel in-flight requests */
  signal?: AbortSignal;
};

export type ProviderResult =
  | { ok: true; text: string; thinking?: string }
  | { ok: false; error: string; status: number };

/* ------------------------------------------------------------------ */
/*  Core function                                                      */
/* ------------------------------------------------------------------ */

/**
 * Call the configured AI provider and return the assistant text.
 *
 * Works for both chat completions and simpler single-prompt calls
 * (pass a single-element `messages` array for the latter).
 *
 * When `deepThinking` is enabled, reasoning models are used and
 * the chain-of-thought is returned in the `thinking` field.
 */
export async function callProvider(
  messages: ChatMessage[] | string,
  opts: ProviderOptions = {},
): Promise<ProviderResult> {
  const {
    provider = "deepseek",
    model,
    temperature = 0.7,
    deepThinking = false,
  } = opts;

  // Normalise: if a plain string is passed, wrap it as a user message
  const msgArray: ChatMessage[] =
    typeof messages === "string"
      ? [{ role: "user", content: messages }]
      : messages;

  if (provider === "deepseek") {
    if (!DEEPSEEK_KEY) {
      return { ok: false, error: "DeepSeek API key missing", status: 500 };
    }

    const resolvedModel = deepThinking
      ? "deepseek-reasoner"
      : (model ?? "deepseek-chat");

    // deepseek-reasoner doesn't accept temperature or system messages
    // in the same way — the system message must become a user message prefix
    let finalMessages = msgArray;
    const bodyExtras: Record<string, unknown> = {};

    if (deepThinking) {
      // Move system message content into a leading user message
      const systemMsgs = msgArray.filter((m) => m.role === "system");
      const nonSystemMsgs = msgArray.filter((m) => m.role !== "system");
      if (systemMsgs.length > 0) {
        const systemContent = systemMsgs.map((m) => m.content).join("\n\n");
        finalMessages = [
          { role: "user", content: `[System Instructions]\n${systemContent}` },
          {
            role: "assistant",
            content: "Understood. I will follow these instructions.",
          },
          ...nonSystemMsgs,
        ];
      }
    } else {
      bodyExtras.temperature = temperature;
    }

    const resp = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_KEY}`,
      },
      body: JSON.stringify({
        model: resolvedModel,
        messages: finalMessages,
        ...bodyExtras,
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error("DeepSeek error:", txt);
      return { ok: false, error: "DeepSeek request failed", status: 500 };
    }

    const payload = await resp.json();
    const choice = payload.choices?.[0];
    const text = choice?.message?.content ?? "";
    const thinking = choice?.message?.reasoning_content ?? undefined;

    return { ok: true, text, thinking };
  }

  // OpenAI (Responses API)
  if (!OPENAI_KEY) {
    return { ok: false, error: "OpenAI API key missing", status: 500 };
  }

  const resolvedModel = deepThinking
    ? (model ?? "o4-mini")
    : (model ?? "gpt-4.1-mini");

  const body: Record<string, unknown> = {
    model: resolvedModel,
    input: msgArray,
  };

  if (deepThinking) {
    // Enable reasoning for OpenAI reasoning models
    body.reasoning = { effort: "high" };
  } else {
    body.temperature = temperature;
  }

  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    console.error("OpenAI error:", txt);
    return { ok: false, error: "OpenAI request failed", status: 500 };
  }

  const payload = await resp.json();

  // Extract thinking (reasoning) from OpenAI response
  let thinking: string | undefined;
  const reasoningItems = (payload.output ?? []).filter(
    (item: { type?: string }) => item.type === "reasoning",
  );
  if (reasoningItems.length > 0) {
    thinking = reasoningItems
      .flatMap((item: { summary?: Array<{ text?: string }> }) =>
        (item.summary ?? []).map((s) => s.text ?? ""),
      )
      .filter(Boolean)
      .join("\n");
  }

  const text =
    payload.output?.[0]?.content?.[0]?.text ?? payload.output_text ?? "";
  return { ok: true, text, thinking: thinking || undefined };
}

/* ------------------------------------------------------------------ */
/*  Streaming variant                                                  */
/* ------------------------------------------------------------------ */

export type StreamChunk =
  | { type: "thinking"; text: string }
  | { type: "content"; text: string }
  | { type: "done"; fullText: string; fullThinking: string }
  | { type: "error"; error: string };

/**
 * Stream the AI provider response, yielding chunks for thinking and
 * content separately.  Used for real-time deep-thinking display.
 *
 * DeepSeek:  `stream: true` → delta.reasoning_content + delta.content
 * OpenAI:    `stream: true` → reasoning summary deltas + content deltas
 */
export async function* callProviderStream(
  messages: ChatMessage[],
  opts: ProviderOptions = {},
): AsyncGenerator<StreamChunk> {
  const {
    provider = "deepseek",
    model,
    temperature = 0.7,
    deepThinking = false,
    signal,
  } = opts;

  const msgArray = messages;

  /* ---- DeepSeek streaming ---- */
  if (provider === "deepseek") {
    if (!DEEPSEEK_KEY) {
      yield { type: "error", error: "DeepSeek API key missing" };
      return;
    }

    const resolvedModel = deepThinking
      ? "deepseek-reasoner"
      : (model ?? "deepseek-chat");

    let finalMessages = msgArray;
    const bodyExtras: Record<string, unknown> = {};

    if (deepThinking) {
      const systemMsgs = msgArray.filter((m) => m.role === "system");
      const nonSystemMsgs = msgArray.filter((m) => m.role !== "system");
      if (systemMsgs.length > 0) {
        const systemContent = systemMsgs.map((m) => m.content).join("\n\n");
        finalMessages = [
          { role: "user", content: `[System Instructions]\n${systemContent}` },
          {
            role: "assistant",
            content: "Understood. I will follow these instructions.",
          },
          ...nonSystemMsgs,
        ];
      }
    } else {
      bodyExtras.temperature = temperature;
    }

    const resp = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_KEY}`,
      },
      body: JSON.stringify({
        model: resolvedModel,
        messages: finalMessages,
        stream: true,
        ...bodyExtras,
      }),
      signal,
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error("DeepSeek stream error:", txt);
      yield { type: "error", error: "DeepSeek request failed" };
      return;
    }

    yield* parseSSEStream(resp, "deepseek");
    return;
  }

  /* ---- OpenAI streaming ---- */
  if (!OPENAI_KEY) {
    yield { type: "error", error: "OpenAI API key missing" };
    return;
  }

  const resolvedModel = deepThinking
    ? (model ?? "o4-mini")
    : (model ?? "gpt-4.1-mini");

  const body: Record<string, unknown> = {
    model: resolvedModel,
    input: msgArray,
    stream: true,
  };

  if (deepThinking) {
    body.reasoning = { effort: "high" };
  } else {
    body.temperature = temperature;
  }

  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!resp.ok) {
    const txt = await resp.text();
    console.error("OpenAI stream error:", txt);
    yield { type: "error", error: "OpenAI request failed" };
    return;
  }

  yield* parseSSEStream(resp, "openai");
}

/* ------------------------------------------------------------------ */
/*  SSE parser                                                         */
/* ------------------------------------------------------------------ */

async function* parseSSEStream(
  resp: Response,
  provider: "deepseek" | "openai",
): AsyncGenerator<StreamChunk> {
  const reader = resp.body?.getReader();
  if (!reader) {
    yield { type: "error", error: "No response body" };
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
  let fullThinking = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      // Keep the last potentially incomplete line in the buffer
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;
        if (!trimmed.startsWith("data: ")) continue;

        const jsonStr = trimmed.slice(6);
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(jsonStr);
        } catch {
          continue;
        }

        if (provider === "deepseek") {
          // DeepSeek Chat Completions streaming format
          const choices = parsed.choices as
            | Array<{
                delta?: { reasoning_content?: string; content?: string };
              }>
            | undefined;
          const delta = choices?.[0]?.delta;
          if (!delta) continue;

          if (delta.reasoning_content) {
            fullThinking += delta.reasoning_content;
            yield { type: "thinking", text: delta.reasoning_content };
          }
          if (delta.content) {
            fullText += delta.content;
            yield { type: "content", text: delta.content };
          }
        } else {
          // OpenAI Responses API streaming format
          const eventType = parsed.type as string | undefined;

          if (eventType === "response.reasoning_summary_text.delta") {
            const delta = (parsed.delta as string) ?? "";
            if (delta) {
              fullThinking += delta;
              yield { type: "thinking", text: delta };
            }
          } else if (eventType === "response.output_text.delta") {
            const delta = (parsed.delta as string) ?? "";
            if (delta) {
              fullText += delta;
              yield { type: "content", text: delta };
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  yield { type: "done", fullText, fullThinking };
}
