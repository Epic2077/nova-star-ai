import { NextRequest, NextResponse } from "next/server";
import { NOVA_CORE_PROMPT } from "@/lib/prompts/novaCore";
import { NOVA_MEMORY_LAYER_PROMPT } from "@/lib/prompts/novaMemory";
import { NOVA_INSIGHT_LAYER_PROMPT } from "@/lib/prompts/novaInsight";
import { buildRelationshipPrompt } from "@/lib/prompts/novaRelationship";
import { buildReferencePrompt } from "@/lib/prompts/novaReference";
import {
  fetchPartnerProfile,
  fetchActivePartnership,
} from "@/lib/supabase/partnership";
import {
  fetchSharedMemories,
  formatSharedMemories,
} from "@/lib/supabase/sharedMemory";
import {
  fetchSharedInsights,
  formatSharedInsights,
} from "@/lib/supabase/sharedInsight";
import {
  fetchPersonalMemories,
  formatPersonalMemories,
} from "@/lib/supabase/personalMemory";
import { buildMainUserPrompt } from "@/lib/prompts/novaMainUser";
import {
  shouldUseRelationshipLayer,
  shouldUseInsightLayer,
} from "@/lib/promptLayerDetection";
import { callProviderStream, type ChatMessage } from "@/lib/ai/provider";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { ensureUserProfile, toUserProfile } from "@/lib/supabase/userProfile";
import {
  searchWeb,
  formatSearchResults,
  extractSearchQuery,
} from "@/lib/ai/webSearch";
import { runMemorySummarization } from "@/lib/ai/memorySummarization";
import { runMemoryExtraction } from "@/lib/ai/memoryExtraction";
import { getCachedPrompt } from "@/lib/ai/promptCache";
import {
  checkRateLimit,
  recordTokenUsage,
  estimateTokens,
} from "@/lib/ai/tokenUsage";
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

    /**
     * 0.1️⃣ Rate-limit check (24h rolling window)
     *     Admin and creator roles are exempt.
     */
    const { data: callerProfile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const rateLimit = await checkRateLimit(
      supabase,
      user.id,
      callerProfile?.role,
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Daily token limit reached. Please try again tomorrow.",
          tokensUsedToday: rateLimit.tokensUsedToday,
          limit: rateLimit.limit,
        },
        { status: 429 },
      );
    }

    const {
      content,
      chatId,
      provider = "deepseek", // default to deepseek for now
      model,
      useMemoryLayer = true, // always on for user continuity
      useWebSearch = false,
      useDeepThinking = false,
      attachments = [] as FileAttachment[],
      skipSaveUser = false, // true during regeneration
    } = await req.json();

    if (!content || !chatId) {
      return NextResponse.json(
        { error: "Missing content or chatId" },
        { status: 400 },
      );
    }

    // Auto-detect which prompt layers to activate (server-side)
    // (relationship detection moved after partner profile load)
    const useInsightLayer = shouldUseInsightLayer(content);

    /**
     * 0.5️⃣ Verify chatId belongs to authenticated user & load user profile
     */
    const fallbackName =
      user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "there";

    const [
      { data: chatOwner, error: ownerError },
      userProfileRow,
      partnerProfile,
      activePartnership,
    ] = await Promise.all([
      supabase.from("chats").select("user_id").eq("id", chatId).single(),
      ensureUserProfile(supabase, user.id, fallbackName),
      fetchPartnerProfile(supabase, user.id),
      fetchActivePartnership(supabase, user.id),
    ]);

    if (ownerError || !chatOwner) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    if (chatOwner.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Detect relationship layer using partner name from DB
    const useRelationshipLayer = shouldUseRelationshipLayer(content, {
      partnerNames: partnerProfile ? [partnerProfile.name] : [],
    });

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
     *    Skipped during regeneration (skipSaveUser = true).
     */
    let insertedUserMsg: Record<string, unknown> | null = null;

    if (!skipSaveUser) {
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

      const { data: savedUserMsg, error: insertUserError } = await supabase
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

      insertedUserMsg = savedUserMsg;
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

    // Load cross-chat shared memories and insights if partnership exists
    const hasActivePartnership = activePartnership?.status === "active";

    const [personalMemories, sharedMemories, sharedInsights] =
      await Promise.all([
        useMemoryLayer ? fetchPersonalMemories(supabase, user.id) : [],
        hasActivePartnership && useMemoryLayer
          ? fetchSharedMemories(supabase, activePartnership.id)
          : [],
        hasActivePartnership && useInsightLayer
          ? fetchSharedInsights(supabase, activePartnership.id)
          : [],
      ]);

    const personalMemoryContext = formatPersonalMemories(personalMemories);
    const sharedMemoryContext = formatSharedMemories(sharedMemories);
    const sharedInsightContext = formatSharedInsights(sharedInsights);

    const userProfile = toUserProfile(userProfileRow);

    /**
     * Build the layered system prompt — cached by content-hash so
     * identical prompts across consecutive requests are not rebuilt.
     */
    const cacheKeyParts = [
      user.id,
      useMemoryLayer,
      useInsightLayer,
      useRelationshipLayer,
      partnerProfile?.name ?? null,
      userProfile.name,
      userProfile.tone,
      userProfile.communicationStyle,
      userProfile.emotionalPatterns,
      userProfile.interests,
      JSON.stringify(userProfile.memorySummary ?? null),
      chatData?.memory_summary ?? "",
      personalMemoryContext,
      sharedMemoryContext,
      sharedInsightContext,
    ];

    const { prompt: layeredSystemPrompt, cacheHit: promptCacheHit } =
      getCachedPrompt(cacheKeyParts, () =>
        [
          NOVA_CORE_PROMPT,
          buildMainUserPrompt(userProfile),
          useMemoryLayer ? NOVA_MEMORY_LAYER_PROMPT : null,
          useInsightLayer ? NOVA_INSIGHT_LAYER_PROMPT : null,
          useRelationshipLayer && partnerProfile
            ? buildRelationshipPrompt({
                creatorName: userProfile.name,
                partnerName: partnerProfile.name,
              })
            : null,
          useRelationshipLayer && partnerProfile
            ? buildReferencePrompt(partnerProfile)
            : null,
        ]
          .filter(Boolean)
          .join("\n\n"),
      );

    if (promptCacheHit) {
      console.log("[prompt-cache] HIT for user", user.id);
    }

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
      layeredSystemPrompt +
      memoryContext +
      personalMemoryContext +
      sharedMemoryContext +
      sharedInsightContext +
      webSearchContext +
      fileContext;

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

    // Abort controller for cancelling upstream provider calls when the
    // client disconnects (e.g. user clicks Stop).
    const providerAbort = new AbortController();

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
        let streamTokenUsage:
          | {
              promptTokens: number;
              completionTokens: number;
              totalTokens: number;
            }
          | undefined;

        try {
          for await (const chunk of callProviderStream(messages, {
            provider,
            model,
            deepThinking: useDeepThinking,
            signal: providerAbort.signal,
          })) {
            // If the client disconnected, stop iterating.
            if (providerAbort.signal.aborted) break;

            if (chunk.type === "thinking") {
              sendEvent("thinking", { text: chunk.text });
            } else if (chunk.type === "content") {
              sendEvent("content", { text: chunk.text });
            } else if (chunk.type === "done") {
              fullText = chunk.fullText;
              fullThinking = chunk.fullThinking;
              streamTokenUsage = chunk.tokenUsage;
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

          // Background work: token usage, summarization, memory extraction.
          // We await all of them before closing the stream so serverless
          // runtimes don't kill the function before they finish.
          const resolvedModel =
            model ??
            (provider === "deepseek" ? "deepseek-chat" : "gpt-4.1-mini");
          const tokensUsed =
            streamTokenUsage?.totalTokens ??
            estimateTokens(systemMsg + content + fullText);

          await Promise.allSettled([
            recordTokenUsage(supabase, {
              userId: user.id,
              tokensUsed,
              provider,
              model: resolvedModel,
              endpoint: "chat",
            }),
            runMemorySummarization(supabase, chatId, chatData, provider, model),
            runMemoryExtraction(
              supabase,
              chatId,
              user.id,
              activePartnership,
              provider,
              model,
            ),
          ]);
        } catch (err) {
          console.error("Streaming error:", err);
          sendEvent("error", { error: "Streaming failed" });
        } finally {
          controller.close();
        }
      },
      cancel() {
        // Client disconnected — abort the upstream provider request.
        providerAbort.abort();
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
