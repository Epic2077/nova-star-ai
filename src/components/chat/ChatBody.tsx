"use client";

import React, { useState } from "react";
import ChatInput from "./ChatInput";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { ChevronDown } from "lucide-react";
import MessageItem from "./message/Message";
import TypingBubble from "./message/TypingBubble";
import { useAutoScroll } from "./hooks/useAutoScroll";
import { useMessages } from "./hooks/useMessages";
import { useChatSubmit } from "./hooks/useChatSubmit";

const ChatBody = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams<{ dataId?: string }>();
  const chatId = params?.dataId;

  const [input, setInput] = useState("");

  const {
    scrollToBottom,
    showScrollToBottom,
    setShowScrollToBottom,
    userScrolledAwayRef,
    wasStreamingRef,
    hasAutoScrolledRef,
    resetScrollLock,
  } = useAutoScroll();

  const {
    messages,
    setMessages,
    isAwaitingResponse,
    setIsAwaitingResponse,
    streamingMessageId,
    setStreamingMessageId,
    generateTitle,
  } = useMessages(chatId);

  const { handleSubmit, submitMessage } = useChatSubmit({
    chatId,
    messages,
    setMessages,
    input,
    setInput,
    setIsAwaitingResponse,
    setStreamingMessageId,
    scrollToBottom,
    userScrolledAwayRef,
    wasStreamingRef,
    generateTitle,
  });

  const messagesContainerRef = React.useRef<HTMLDivElement | null>(null);
  const lastMessageRef = React.useRef<HTMLDivElement | null>(null);
  const messageRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  // Keep a stable ref so the one-shot effect always calls the latest version.
  const submitMessageRef = React.useRef(submitMessage);
  React.useEffect(() => {
    submitMessageRef.current = submitMessage;
  });

  // ── Pick up pending first message from NewChatInput ───────────
  React.useEffect(() => {
    if (!chatId) return;
    const key = `pending-submit-${chatId}`;
    const stored = sessionStorage.getItem(key);
    if (!stored) return;
    sessionStorage.removeItem(key);

    try {
      const data = JSON.parse(stored) as {
        content: string;
        tempId: string;
        tools: { webSearch: boolean; deepThinking: boolean };
        attachments: unknown[];
      };
      void submitMessageRef.current(data.content, {
        tools: data.tools,
        attachments:
          data.attachments as import("@/types/chat").FileAttachment[],
        tempId: data.tempId,
      });
    } catch {
      /* ignore malformed data */
    }
  }, [chatId]);

  // ── Admin-denied toast ────────────────────────────────────────
  React.useEffect(() => {
    if (searchParams.get("adminDenied") !== "1") return;
    toast.error("You don't have access to the admin panel.");
    const next = new URLSearchParams(searchParams.toString());
    next.delete("adminDenied");
    const nextQuery = next.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  }, [searchParams, router, pathname]);

  // ── Scroll on message arrival ─────────────────────────────────
  React.useEffect(() => {
    if (!messagesContainerRef.current) return;
    const last = messages[messages.length - 1];
    if (!last) return;

    if (last.role === "user") {
      scrollToBottom("smooth");
      return;
    }

    // If this assistant message was delivered via streaming, the user has
    // already been reading it in real-time — don't yank the scroll position.
    if (last.role === "assistant" && wasStreamingRef.current) {
      wasStreamingRef.current = false;
      return;
    }
  }, [messages, scrollToBottom, wasStreamingRef]);

  // ── Auto-scroll on initial load ───────────────────────────────
  React.useEffect(() => {
    if (!chatId || messages.length === 0) return;
    if (hasAutoScrolledRef.current === chatId) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToBottom("auto");
      });
    });

    hasAutoScrolledRef.current = chatId;
  }, [chatId, messages.length, scrollToBottom, hasAutoScrolledRef]);

  React.useEffect(() => {
    hasAutoScrolledRef.current = null;
  }, [chatId, hasAutoScrolledRef]);

  return (
    <section className="pb-5 min-h-[calc(100vh-4rem)] flex flex-col">
      <div
        ref={messagesContainerRef}
        className="mx-auto w-full max-w-4xl px-4 pb-8 pt-4 space-y-4 flex-1"
      >
        {messages.map((item, idx) => (
          <div
            key={item.id}
            ref={(el) => {
              messageRefs.current[item.id] = el;
              if (idx === messages.length - 1) lastMessageRef.current = el;
            }}
          >
            <MessageItem
              message={item}
              streaming={item.id === streamingMessageId}
            />
          </div>
        ))}
        {isAwaitingResponse ? (
          <div>
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
              resetScrollLock();
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
