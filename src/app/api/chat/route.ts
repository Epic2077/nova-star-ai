import { NextRequest, NextResponse } from "next/server";
import { NOVA_CORE_PROMPT } from "@/lib/prompts/novaCore";
import { NOVA_MEMORY_LAYER_PROMPT } from "@/lib/prompts/novaMemory";
import { NOVA_INSIGHT_LAYER_PROMPT } from "@/lib/prompts/novaInsight";
import {
  buildRelationshipPrompt,
  DEFAULT_RELATIONSHIP_CONFIG,
} from "@/lib/prompts/novaRelationship";
import {
  buildReferencePrompt,
  DEFAULT_PARTNER_PROFILE,
} from "@/lib/prompts/novaReference";
import { buildMainUserPrompt } from "@/lib/prompts/novaMainUser";
import {
  shouldUseRelationshipLayer,
  shouldUseInsightLayer,
} from "@/lib/promptLayerDetection";
import {
  callProvider,
  callProviderStream,
  type ChatMessage,
} from "@/lib/ai/provider";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  searchWeb,
  formatSearchResults,
  extractSearchQuery,
} from "@/lib/ai/webSearch";
import type { FileAttachment, ToolResult, MessageMetadata } from "@/types/chat";

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
      useWebSearch = false,
      useDeepThinking = false,
      attachments = [] as FileAttachment[],
    } = await req.json();

    if (!content || !chatId) {
      return NextResponse.json(
        { error: "Missing content or chatId" },
        { status: 400 },
      );
    }

    // Auto-detect which prompt layers to activate (server-side)
    // In the future, partnerNames will be loaded from a user_profiles table.
    const useRelationshipLayer = shouldUseRelationshipLayer(content);
    const useInsightLayer = shouldUseInsightLayer(content);

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
     * 2️⃣ Save user message (with optional file attachments)
     */
    const userMsgMetadata: MessageMetadata | undefined =
      attachments.length > 0 ? { attachments } : undefined;

    const userMsgType =
      attachments.length > 0
        ? attachments.some((a: FileAttachment) =>
            a.mimeType?.startsWith("image/"),
          )
          ? ("image" as const)
          : ("file" as const)
        : ("text" as const);

    const { data: insertedUserMsg, error: insertUserError } = await supabase
      .from("messages")
      .insert({
        chat_id: chatId,
        role: "user",
        content,
        type: userMsgType,
        metadata: userMsgMetadata ?? null,
      })
      .select("id, role, content, type, metadata")
      .single();

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
      buildMainUserPrompt({
        name:
          user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "there",
      }),
      useMemoryLayer ? NOVA_MEMORY_LAYER_PROMPT : null,
      useInsightLayer ? NOVA_INSIGHT_LAYER_PROMPT : null,
      useRelationshipLayer
        ? buildRelationshipPrompt(DEFAULT_RELATIONSHIP_CONFIG)
        : null,
      useRelationshipLayer
        ? buildReferencePrompt(DEFAULT_PARTNER_PROFILE)
        : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    /**
     * 3.5️⃣ Web Search (if enabled)
     */
    let webSearchContext = "";
    let toolResults: ToolResult[] = [];

    if (useWebSearch) {
      const query = extractSearchQuery(content);
      const results = await searchWeb(query);

      if (results.length > 0) {
        webSearchContext = `\n\n${formatSearchResults(results)}\n\nUse the above search results to inform your response. Cite sources when relevant using [number] notation.`;
        toolResults = [{ tool: "web_search", query, results }];
      }
    }

    /**
     * 3.6️⃣ File attachment context
     */
    let fileContext = "";
    if (attachments.length > 0) {
      const fileDescriptions = attachments
        .map(
          (a: FileAttachment) =>
            `- ${a.name} (${a.mimeType}, ${(a.size / 1024).toFixed(1)}KB): ${a.url}`,
        )
        .join("\n");
      fileContext = `\n\nATTACHED FILES:\n${fileDescriptions}\n\nThe user has attached the above files. Reference them in your response as appropriate.`;
    }

    const systemMsg =
      layeredSystemPrompt + memoryContext + webSearchContext + fileContext;

    const truncatedHistory = (history ?? []).slice(-MAX_HISTORY_MESSAGES);

    const messages: ChatMessage[] = [
      { role: "system", content: systemMsg },
      ...(truncatedHistory as ChatMessage[]),
      { role: "user", content },
    ];

    /**
     * 4️⃣ Call Provider — always stream via SSE
     */
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(
              `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
            ),
          );
        };

        let fullText = "";
        let fullThinking = "";

        try {
          for await (const chunk of callProviderStream(messages, {
            provider,
            model,
            deepThinking: useDeepThinking,
          })) {
            if (chunk.type === "thinking") {
              sendEvent("thinking", { text: chunk.text });
            } else if (chunk.type === "content") {
              sendEvent("content", { text: chunk.text });
            } else if (chunk.type === "done") {
              fullText = chunk.fullText;
              fullThinking = chunk.fullThinking;
            } else if (chunk.type === "error") {
              sendEvent("error", { error: chunk.error });
              controller.close();
              return;
            }
          }

          // Save the completed messages to DB
          const assistantMetadata: MessageMetadata = {};
          if (fullThinking) assistantMetadata.thinking = fullThinking;
          if (toolResults.length > 0)
            assistantMetadata.toolResults = toolResults;

          const hasMetadata =
            Object.keys(assistantMetadata).length > 0
              ? assistantMetadata
              : null;

          const assistantMsgType: "text" | "tool" =
            toolResults.length > 0 ? "tool" : "text";

          const { data: insertedAssistantMsg, error: insertAssistantError } =
            await supabase
              .from("messages")
              .insert({
                chat_id: chatId,
                role: "assistant",
                content: fullText,
                type: assistantMsgType,
                metadata: hasMetadata,
              })
              .select("id, role, content, type, metadata")
              .single();

          if (insertAssistantError) {
            console.error("Assistant insert error:", insertAssistantError);
          }

          // Send the final "complete" event with DB record
          sendEvent("complete", {
            reply: fullText,
            thinking: fullThinking || null,
            toolResults: toolResults.length > 0 ? toolResults : null,
            userMessage: insertedUserMsg ?? null,
            assistantMessage: insertedAssistantMsg ?? null,
          });

          // Fire-and-forget memory summarization
          void runMemorySummarization(
            supabase,
            chatId,
            chatData,
            provider,
            model,
          );
        } catch (err) {
          console.error("Streaming error:", err);
          sendEvent("error", { error: "Streaming failed" });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 },
    );
  }
}

/* ------------------------------------------------------------------ */
/*  Memory summarization helper                                        */
/* ------------------------------------------------------------------ */

async function runMemorySummarization(
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
