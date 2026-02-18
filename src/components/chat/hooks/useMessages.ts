import React, { useMemo, useState } from "react";
import { Message, MessageRecord } from "@/types/chat";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { toast } from "sonner";

/**
 * Manages all message state for a chat:
 * - Fetches messages from Supabase on mount
 * - Subscribes to realtime INSERT events
 * - Handles optimistic messages (sessionStorage fallback for first render)
 * - Exposes `generateTitle` helper
 */
export function useMessages(chatId: string | undefined) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  // Read optimistic first message from sessionStorage at initialization
  // so the user bubble is visible on the VERY FIRST render (no flash).
  const initialOptimistic = useMemo(() => {
    if (typeof window === "undefined" || !chatId) return null;
    try {
      const stored = sessionStorage.getItem(`optimistic-msg-${chatId}`);
      if (stored) return JSON.parse(stored) as Message;
    } catch {
      /* ignore */
    }
    return null;
  }, [chatId]);

  const [messages, setMessages] = useState<Message[]>(
    initialOptimistic ? [initialOptimistic] : [],
  );
  const [isAwaitingResponse, setIsAwaitingResponse] = useState(
    () => !!initialOptimistic,
  );
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null,
  );

  // ── Realtime subscription & initial fetch ─────────────────────
  React.useEffect(() => {
    let channel: RealtimeChannel | null = null;

    const fetchMessages = async () => {
      if (!chatId) {
        setMessages([]);
        return;
      }

      let optimisticMsg: Message | null = null;
      try {
        const stored = sessionStorage.getItem(`optimistic-msg-${chatId}`);
        if (stored) {
          optimisticMsg = JSON.parse(stored) as Message;
        }
      } catch {
        // sessionStorage unavailable — fall through
      }

      const { data, error } = await supabase
        .from("messages")
        .select("id, content, role, chat_id, created_at, type, metadata")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (error) {
        toast.error(error.message);
        return;
      }

      const mapped = ((data ?? []) as MessageRecord[]).map((item) => ({
        id: item.id,
        content: item.content,
        role: item.role,
        type: item.type,
        metadata: item.metadata ?? undefined,
      }));

      if (mapped.length > 0) {
        try {
          sessionStorage.removeItem(`optimistic-msg-${chatId}`);
        } catch {
          /* ignore */
        }
        setMessages(mapped);
        const last = mapped[mapped.length - 1];
        setIsAwaitingResponse(last?.role === "user");
      } else if (optimisticMsg) {
        setMessages([optimisticMsg]);
        setIsAwaitingResponse(true);
      } else {
        setMessages([]);
        setIsAwaitingResponse(false);
      }

      // Subscribe to realtime message changes for this chat.
      try {
        channel = supabase
          .channel(`public:messages:chat_id=eq.${chatId}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "messages",
              filter: `chat_id=eq.${chatId}`,
            },
            (payload) => {
              const row = payload.new as MessageRecord;

              try {
                sessionStorage.removeItem(`optimistic-msg-${chatId}`);
              } catch {
                /* ignore */
              }

              setMessages((prev) => {
                // avoid duplicates
                if (prev.some((m) => m.id === row.id)) return prev;

                const cleaned = prev.filter((m) => {
                  if (typeof m.id === "string") {
                    // When the real user message arrives, remove the temp placeholder
                    if (m.id.startsWith("tmp-") && row.role === "user") {
                      return false;
                    }
                    // When the real assistant row arrives, remove any
                    // placeholder/streaming assistant message.
                    if (
                      (m.id.startsWith("failed-") ||
                        m.id.startsWith("asst-temp-") ||
                        m.id.startsWith("stream-")) &&
                      m.role === "assistant" &&
                      row.role === "assistant"
                    ) {
                      return false;
                    }
                  }
                  return true;
                });

                return [
                  ...cleaned,
                  {
                    id: row.id,
                    content: row.content,
                    role: row.role,
                    type: row.type,
                    metadata: row.metadata ?? undefined,
                  },
                ];
              });

              if (row.role === "assistant") setIsAwaitingResponse(false);
              if (row.role === "user") setIsAwaitingResponse(true);
            },
          )
          .subscribe();
      } catch {
        // ignore subscription errors
      }
    };

    void fetchMessages();

    return () => {
      try {
        channel?.unsubscribe();
      } catch {
        /* ignore */
      }
    };
  }, [chatId, supabase]);

  // ── Title generation helper ───────────────────────────────────
  const generateTitle = React.useCallback(
    (targetChatId: string, firstUserMessage: string) => {
      void fetch("/api/chat/title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: targetChatId, firstUserMessage }),
      })
        .then(async (titleResp) => {
          if (!titleResp.ok) return;
          const titleJson = await titleResp.json();
          if (!titleJson?.title) return;

          window.dispatchEvent(
            new CustomEvent("chatRenamed", {
              detail: { chatId: targetChatId, newTitle: titleJson.title },
            }),
          );
        })
        .catch(() => {
          /* ignore title errors */
        });
    },
    [],
  );

  return {
    messages,
    setMessages,
    isAwaitingResponse,
    setIsAwaitingResponse,
    streamingMessageId,
    setStreamingMessageId,
    generateTitle,
  };
}
