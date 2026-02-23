import { NextRequest, NextResponse } from "next/server";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";

/**
 * PATCH /api/chat/messages — edit a user message's content
 *
 * Body: { messageId: string; content: string }
 */
export async function PATCH(req: NextRequest) {
  try {
    const serviceClient = createServiceClient();
    if (!serviceClient) {
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 },
      );
    }

    const authClient = createAuthClient(req);
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messageId, content } = await req.json();

    if (!messageId || !content?.trim()) {
      return NextResponse.json(
        { error: "Missing messageId or content" },
        { status: 400 },
      );
    }

    // Verify the message belongs to the user's chat
    const { data: msg, error: msgError } = await serviceClient
      .from("messages")
      .select("id, chat_id, role")
      .eq("id", messageId)
      .single();

    if (msgError || !msg) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (msg.role !== "user") {
      return NextResponse.json(
        { error: "Can only edit user messages" },
        { status: 403 },
      );
    }

    // Verify chat ownership
    const { data: chat, error: chatError } = await serviceClient
      .from("chats")
      .select("user_id")
      .eq("id", msg.chat_id)
      .single();

    if (chatError || !chat || chat.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update message content
    const { data: updated, error: updateError } = await serviceClient
      .from("messages")
      .update({ content: content.trim() })
      .eq("id", messageId)
      .select("id, role, content, type, metadata")
      .single();

    if (updateError) {
      console.error("Message update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update message" },
        { status: 500 },
      );
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Message edit error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/chat/messages — delete messages after a given message
 *
 * Body: { chatId: string; afterMessageId: string }
 *
 * Used during edit+regenerate: removes all messages after the edited one
 * so the conversation can be re-generated from that point.
 */
export async function DELETE(req: NextRequest) {
  try {
    const serviceClient = createServiceClient();
    if (!serviceClient) {
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 },
      );
    }

    const authClient = createAuthClient(req);
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chatId, afterMessageId } = await req.json();

    if (!chatId || !afterMessageId) {
      return NextResponse.json(
        { error: "Missing chatId or afterMessageId" },
        { status: 400 },
      );
    }

    // Verify chat ownership
    const { data: chat, error: chatError } = await serviceClient
      .from("chats")
      .select("user_id")
      .eq("id", chatId)
      .single();

    if (chatError || !chat || chat.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get the created_at of the reference message
    const { data: refMsg, error: refError } = await serviceClient
      .from("messages")
      .select("created_at")
      .eq("id", afterMessageId)
      .eq("chat_id", chatId)
      .single();

    if (refError || !refMsg) {
      return NextResponse.json(
        { error: "Reference message not found" },
        { status: 404 },
      );
    }

    // Delete all messages after the reference message
    const { error: deleteError } = await serviceClient
      .from("messages")
      .delete()
      .eq("chat_id", chatId)
      .gt("created_at", refMsg.created_at);

    if (deleteError) {
      console.error("Message delete error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete messages" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Message delete error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 },
    );
  }
}
