import { NextRequest, NextResponse } from "next/server";
import { callProvider } from "@/lib/ai/provider";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { recordTokenUsage, estimateTokens } from "@/lib/ai/tokenUsage";

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
     * Authenticate caller
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

    const result = await callProvider(titlePrompt, {
      provider,
      model,
      temperature: 0.0,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    // Fire-and-forget: record token usage for title generation
    const tokensUsed =
      result.tokenUsage?.totalTokens ??
      estimateTokens(titlePrompt + (result.text ?? ""));
    void recordTokenUsage(supabase, {
      userId: user.id,
      tokensUsed,
      provider,
      model:
        model ?? (provider === "deepseek" ? "deepseek-chat" : "gpt-4.1-mini"),
      endpoint: "title",
    });

    // sanitize and enforce 3-6 words (best-effort): remove quotes/punctuation and trim
    let title = String(result.text || "")
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
