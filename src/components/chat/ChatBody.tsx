"use client";

import React, { useMemo, useState } from "react";
import ChatInput from "./ChatInput";
import { Message, MessageRecord } from "@/types/chat";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { ChevronDown } from "lucide-react";
import MessageItem from "./message/Message";
import TypingBubble from "./message/TypingBubble";
import {
  shouldUseReferenceLayer,
  shouldUseInsightLayer,
} from "@/lib/promptLayerDetection";

const ChatBody = () => {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const params = useParams<{ dataId?: string }>();
  const chatId = params?.dataId;

  const [message, setMessage] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [animatedAssistantId, setAnimatedAssistantId] = useState<string | null>(
    null,
  );

  const messagesContainerRef = React.useRef<HTMLDivElement | null>(null);
  const lastMessageRef = React.useRef<HTMLDivElement | null>(null);
  const messageRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const hasAutoScrolledRef = React.useRef<string | null>(null);

  const [showScrollToBottom, setShowScrollToBottom] = React.useState(false);

  const scrollToBottom = React.useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      if (typeof window !== "undefined") {
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior,
        });
      }

      const container = messagesContainerRef.current;
      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior,
        });
      }
    },
    [],
  );

  React.useEffect(() => {
    let channel: RealtimeChannel | null = null;

    const fetchMessages = async () => {
      if (!chatId) {
        setMessage([]);
        return;
      }

      const { data, error } = await supabase
        .from("messages")
        .select("id, content, role, chat_id, created_at")
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
      }));

      setMessage(mapped);

      // If the latest message is from the user and there's no assistant reply yet,
      // show the typing indicator (covers initial-first-message case).
      const last = mapped[mapped.length - 1];
      if (last && last.role === "user") {
        setIsAwaitingResponse(true);
      } else {
        setIsAwaitingResponse(false);
      }

      // subscribe to realtime message changes for this chat
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

              setMessage((prev) => {
                // avoid duplicates
                if (prev.some((m) => m.id === row.id)) return prev;

                // remove optimistic temp user messages and any local "failed-" assistant placeholders
                const cleaned = prev.filter((m) => {
                  if (typeof m.id === "string") {
                    if (
                      m.id.startsWith("tmp-") &&
                      m.role === row.role &&
                      m.content === row.content
                    ) {
                      return false;
                    }

                    // when a real assistant row arrives, remove any prior failed/asst-temp placeholder
                    if (
                      (m.id.startsWith("failed-") ||
                        m.id.startsWith("asst-temp-")) &&
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
                  { id: row.id, content: row.content, role: row.role },
                ];
              });

              if (row.role === "assistant") {
                setIsAwaitingResponse(false);
                setAnimatedAssistantId(row.id);
              }

              if (row.role === "user") {
                // show typing indicator until assistant replies
                setIsAwaitingResponse(true);
              }
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

  // Listen for optimistic / failed message events from NewChatInput
  React.useEffect(() => {
    const handleOptimisticMessage = (event: Event) => {
      const custom = event as CustomEvent<{
        chatId?: string;
        message?: Message;
      }>;
      const detail = custom.detail || {};
      if (!detail.chatId || detail.chatId !== chatId || !detail.message) return;

      setMessage((prev) => {
        // avoid duplicates
        if (prev.some((m) => m.id === detail.message!.id)) return prev;
        return [...prev, detail.message!];
      });
      setIsAwaitingResponse(true);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => scrollToBottom("smooth")),
      );
    };

    const handleMessageFailed = (event: Event) => {
      const custom = event as CustomEvent<{ chatId?: string; tempId?: string }>;
      const failedChatId = custom.detail?.chatId;
      if (!failedChatId || failedChatId !== chatId) return;

      setIsAwaitingResponse(false);
      const failedMsg: Message = {
        id: `failed-${Date.now()}`,
        role: "assistant",
        content: "Failed to generate a response — please try again.",
      };
      setMessage((prev) => [...prev, failedMsg]);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => scrollToBottom("smooth")),
      );
    };

    const handleMessageSent = (event: Event) => {
      const custom = event as CustomEvent<{ chatId?: string; tempId?: string }>;
      const sentChatId = custom.detail?.chatId;
      const tempId = custom.detail?.tempId as string | undefined;
      if (!sentChatId || sentChatId !== chatId) return;

      // clear any failed/asst-temp placeholders and optimistic temp user message with tempId
      setMessage((prev) =>
        prev.filter(
          (m) =>
            !(
              typeof m.id === "string" &&
              (m.id === tempId ||
                m.id.startsWith("failed-") ||
                m.id.startsWith("asst-temp-"))
            ),
        ),
      );
      setIsAwaitingResponse(true); // still awaiting assistant reply until DB insert arrives
    };

    const handleAssistantReply = (event: Event) => {
      const custom = event as CustomEvent<{
        chatId?: string;
        content?: string;
      }>;
      const sentChatId = custom.detail?.chatId;
      const content = custom.detail?.content;
      if (!sentChatId || sentChatId !== chatId || !content) return;

      const placeholderId = `asst-temp-${Date.now()}`;
      const placeholder: Message = {
        id: placeholderId,
        role: "assistant",
        content,
      };

      setMessage((prev) => {
        // avoid duplicates by exact content
        if (prev.some((m) => m.role === "assistant" && m.content === content))
          return prev;
        return [...prev, placeholder];
      });

      setAnimatedAssistantId(placeholderId);
      setIsAwaitingResponse(false);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => scrollToBottom("smooth")),
      );
    };

    window.addEventListener(
      "optimisticMessage",
      handleOptimisticMessage as EventListener,
    );
    window.addEventListener(
      "messageFailed",
      handleMessageFailed as EventListener,
    );
    window.addEventListener("messageSent", handleMessageSent as EventListener);
    window.addEventListener(
      "assistantReply",
      handleAssistantReply as EventListener,
    );

    return () => {
      window.removeEventListener(
        "optimisticMessage",
        handleOptimisticMessage as EventListener,
      );
      window.removeEventListener(
        "messageFailed",
        handleMessageFailed as EventListener,
      );
      window.removeEventListener(
        "messageSent",
        handleMessageSent as EventListener,
      );
      window.removeEventListener(
        "assistantReply",
        handleAssistantReply as EventListener,
      );
    };
  }, [chatId, scrollToBottom]);

  const [isAwaitingResponse, setIsAwaitingResponse] = React.useState(false);

  const handleSubmit = async () => {
    const content = input.trim();

    if (!chatId || !content) return;

    const isFirstMessage = message.length === 0;

    // optimistic user message (temporary id)
    const tempId = `tmp-${Date.now()}`;
    setMessage((previous) => [
      ...previous,
      { id: tempId, content, role: "user" },
    ]);

    setInput("");
    // ensure the optimistic message is visible immediately — scroll the page
    requestAnimationFrame(() => {
      // double RAF to ensure DOM has updated and React refs are set
      requestAnimationFrame(() => {
        scrollToBottom("smooth");
      });
    });

    setIsAwaitingResponse(true);

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId,
          content,
          useReferenceLayer: shouldUseReferenceLayer(content),
          useInsightLayer: shouldUseInsightLayer(content),
        }),
      });

      const json = await resp.json();
      if (!resp.ok || json?.error) {
        throw new Error(json?.error || "AI request failed");
      }

      const userMessage: Message = json.userMessage
        ? {
            id: json.userMessage.id,
            content: json.userMessage.content,
            role: json.userMessage.role,
          }
        : { id: tempId, content, role: "user" };

      const assistantId = json.assistantMessage?.id ?? `asst-${Date.now()}`;
      const assistantMessage: Message | null = json.assistantMessage
        ? {
            id: json.assistantMessage.id,
            content: json.assistantMessage.content,
            role: json.assistantMessage.role,
          }
        : json.reply
          ? {
              id: assistantId,
              content: json.reply,
              role: "assistant",
            }
          : null;

      setMessage((previous) => {
        const withoutTemp = previous.filter((m) => m.id !== tempId);
        withoutTemp.push(userMessage);
        if (assistantMessage) {
          withoutTemp.push(assistantMessage);
        }
        return withoutTemp;
      });

      setAnimatedAssistantId(assistantMessage?.id ?? null);

      // If this was the very first user message in a new chat, generate a title
      if (isFirstMessage) {
        void fetch("/api/chat/title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId, firstUserMessage: content }),
        })
          .then(async (titleResp) => {
            if (!titleResp.ok) return;
            const titleJson = await titleResp.json();
            if (!titleJson?.title) return;

            window.dispatchEvent(
              new CustomEvent("chatRenamed", {
                detail: { chatId, newTitle: titleJson.title },
              }),
            );
          })
          .catch(() => {
            /* ignore title errors */
          });
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to get AI response",
      );

      // append a failed assistant message and remove the typing indicator
      const failedMsg: Message = {
        id: `failed-${Date.now()}`,
        role: "assistant",
        content: "Failed to generate a response — please try again.",
      };
      setMessage((prev) => [...prev, failedMsg]);
    } finally {
      setIsAwaitingResponse(false);
    }
  };

  // Scrolling behavior:
  // - when the user sends a message -> scroll to show the user's message (end)
  // - when the assistant replies -> scroll to the start of the user's preceding message
  React.useEffect(() => {
    // hide scroll-to-bottom when messages change (we'll auto-scroll)
    setShowScrollToBottom(false);

    if (!messagesContainerRef.current) return;
    const last = message[message.length - 1];
    if (!last) return;

    if (last.role === "user") {
      // scroll the page to the bottom so the ChatInput doesn't steal focus
      scrollToBottom("smooth");
      return;
    }

    if (last.role === "assistant") {
      const prev = message[message.length - 2];
      if (prev && messageRefs.current[prev.id]) {
        // scroll the PAGE so the user's prior message appears near the top of viewport
        const el = messageRefs.current[prev.id];
        if (el && typeof window !== "undefined") {
          const top = el.getBoundingClientRect().top + window.scrollY - 96; // small offset for header
          window.scrollTo({ top, behavior: "smooth" });
        } else {
          messageRefs.current[prev.id]?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      } else {
        // fallback -> scroll the page to the assistant message
        const el = lastMessageRef.current;
        if (el && typeof window !== "undefined") {
          const top = el.getBoundingClientRect().top + window.scrollY - 96;
          window.scrollTo({ top, behavior: "smooth" });
        } else {
          lastMessageRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      }
    }
  }, [message, scrollToBottom]);

  // auto-scroll to bottom on initial load / reload once messages are fetched
  React.useEffect(() => {
    if (!chatId || message.length === 0) return;
    if (hasAutoScrolledRef.current === chatId) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToBottom("auto");
      });
    });

    hasAutoScrolledRef.current = chatId;
  }, [chatId, message.length, scrollToBottom]);

  React.useEffect(() => {
    hasAutoScrolledRef.current = null;
  }, [chatId]);

  // detect user scroll activity (page + messages container) to show the "scroll to bottom" button
  React.useEffect(() => {
    const el = messagesContainerRef.current;

    const onScroll = () => {
      const containerScrollable = !!el && el.scrollHeight - el.clientHeight > 8;
      const pageScrollable =
        typeof window !== "undefined" &&
        document.documentElement.scrollHeight - window.innerHeight > 8;

      const containerNearBottom =
        !containerScrollable ||
        (el ? el.scrollTop + el.clientHeight >= el.scrollHeight - 120 : true);

      const pageNearBottom =
        !pageScrollable ||
        (typeof window !== "undefined"
          ? window.scrollY + window.innerHeight >=
            document.documentElement.scrollHeight - 120
          : true);

      setShowScrollToBottom(!(containerNearBottom && pageNearBottom));
    };

    // run once to set initial state
    onScroll();

    if (el) {
      el.addEventListener("scroll", onScroll, { passive: true });
    }

    if (typeof window !== "undefined") {
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
    }

    return () => {
      if (el) {
        el.removeEventListener("scroll", onScroll);
      }

      if (typeof window !== "undefined") {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
      }
    };
  }, [message.length]);

  return (
    <section className="pb-5 min-h-[calc(100vh-4rem)] flex flex-col">
      <div
        ref={messagesContainerRef}
        className="mx-auto w-full max-w-4xl px-4 pb-8 pt-4 space-y-4 flex-1 overflow-auto"
      >
        {message.map((item, idx) => (
          <div
            key={item.id}
            ref={(el) => {
              messageRefs.current[item.id] = el;
              if (idx === message.length - 1) lastMessageRef.current = el;
            }}
          >
            <MessageItem
              message={item}
              animate={
                item.role === "assistant" && item.id === animatedAssistantId
              }
            />
          </div>
        ))}
        {isAwaitingResponse ? (
          <div>
            {/* typing bubble shown while awaiting assistant response */}
            <TypingBubble />
          </div>
        ) : null}{" "}
      </div>

      {showScrollToBottom ? (
        <div className="fixed left-230 -translate-x-1/2 bottom-40 z-30">
          <Button
            variant="ghost"
            className="rounded-full w-10 h-10 shadow-lg bg-muted/70 hover:bg-muted"
            onClick={() => {
              scrollToBottom("smooth");
              setShowScrollToBottom(false);
            }}
            aria-label="Scroll to bottom"
          >
            <ChevronDown size={18} />
          </Button>
        </div>
      ) : null}

      <div className="mt-auto sticky bottom-5">
        <ChatInput input={input} setInput={setInput} onSubmit={handleSubmit} />
      </div>
    </section>
  );
};

export default ChatBody;
