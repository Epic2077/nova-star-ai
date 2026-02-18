import { NextRequest, NextResponse } from "next/server";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import type { MessageRecord } from "@/types/chat";

/**
 * POST /api/chat/export — export chat as Markdown or PDF
 *
 * Body: { chatId: string; format: "markdown" | "pdf" }
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

    const authClient = createAuthClient(req);
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chatId, format = "markdown" } = await req.json();

    if (!chatId) {
      return NextResponse.json({ error: "Missing chatId" }, { status: 400 });
    }

    // Verify chat ownership
    const { data: chat, error: chatError } = await serviceClient
      .from("chats")
      .select("user_id, title, created_at")
      .eq("id", chatId)
      .single();

    if (chatError || !chat || chat.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch all messages
    const { data: messages, error: msgError } = await serviceClient
      .from("messages")
      .select("id, role, content, type, metadata, created_at")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (msgError) {
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 },
      );
    }

    const title = chat.title || "Chat";
    const records = (messages ?? []) as MessageRecord[];

    if (format === "pdf") {
      const pdfContent = generatePdfMarkup(title, records, chat.created_at);
      return new Response(pdfContent, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `inline; filename="${sanitizeFilename(title)}.html"`,
        },
      });
    }

    // Default: Markdown
    const md = generateMarkdown(title, records, chat.created_at);
    return new Response(md, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${sanitizeFilename(title)}.md"`,
      },
    });
  } catch (err) {
    console.error("Export error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 },
    );
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\- ]/g, "").slice(0, 80) || "chat";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function generateMarkdown(
  title: string,
  messages: MessageRecord[],
  chatDate: string,
): string {
  const lines: string[] = [
    `# ${title}`,
    "",
    `*Exported on ${formatDate(new Date().toISOString())} • Chat started ${formatDate(chatDate)}*`,
    "",
    "---",
    "",
  ];

  for (const msg of messages) {
    const sender = msg.role === "user" ? "**You**" : "**Nova**";
    const timestamp = formatDate(msg.created_at);
    lines.push(`### ${sender} — *${timestamp}*`);
    lines.push("");

    if (msg.metadata?.thinking) {
      lines.push("> 💭 *Deep Thinking*");
      lines.push(">");
      for (const thinkLine of msg.metadata.thinking.split("\n")) {
        lines.push(`> ${thinkLine}`);
      }
      lines.push("");
    }

    lines.push(msg.content);
    lines.push("");

    if (msg.metadata?.attachments?.length) {
      lines.push("**Attachments:**");
      for (const att of msg.metadata.attachments) {
        if (att.mimeType?.startsWith("image/")) {
          lines.push(`![${att.name}](${att.url})`);
        } else {
          lines.push(`- [${att.name}](${att.url})`);
        }
      }
      lines.push("");
    }

    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

function generatePdfMarkup(
  title: string,
  messages: MessageRecord[],
  chatDate: string,
): string {
  const msgBlocks = messages
    .map((msg) => {
      const sender = msg.role === "user" ? "You" : "Nova";
      const bubbleClass = msg.role === "user" ? "user-msg" : "nova-msg";
      const timestamp = formatDate(msg.created_at);
      const escapedContent = escapeHtml(msg.content).replace(/\n/g, "<br/>");

      let thinkingBlock = "";
      if (msg.metadata?.thinking) {
        const escaped = escapeHtml(msg.metadata.thinking).replace(
          /\n/g,
          "<br/>",
        );
        thinkingBlock = `<div class="thinking">💭 <em>Deep Thinking</em><br/>${escaped}</div>`;
      }

      return `
        <div class="message ${bubbleClass}">
          <div class="sender">${sender} <span class="time">${timestamp}</span></div>
          ${thinkingBlock}
          <div class="content">${escapedContent}</div>
        </div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 32px 16px; background: #fff; color: #1a1a1a; }
    h1 { font-size: 1.5rem; margin-bottom: 4px; }
    .meta { color: #888; font-size: 0.85rem; margin-bottom: 24px; }
    .message { margin-bottom: 16px; padding: 12px 16px; border-radius: 12px; }
    .user-msg { background: #f0f0f0; margin-left: 40px; }
    .nova-msg { background: #f8f4ff; margin-right: 40px; }
    .sender { font-weight: 600; font-size: 0.9rem; margin-bottom: 6px; }
    .time { font-weight: 400; color: #888; font-size: 0.8rem; }
    .content { line-height: 1.6; white-space: pre-wrap; }
    .thinking { background: #f3e8ff; padding: 8px 12px; border-radius: 8px; margin-bottom: 8px; font-size: 0.85rem; color: #6b21a8; line-height: 1.5; }
    @media print { body { padding: 0; } .message { break-inside: avoid; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="meta">Chat started ${formatDate(chatDate)} • Exported ${formatDate(new Date().toISOString())}</p>
  ${msgBlocks}
  <script>window.onload = () => window.print();</script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
