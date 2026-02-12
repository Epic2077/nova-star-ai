"use client";

import React, { useMemo, useState } from "react";
import ChatInput from "./ChatInput";
import { Message, MessageRecord } from "@/types/chat";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import MessageItem from "./message/Message";

const ChatBody = () => {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const params = useParams<{ dataId?: string }>();
  const chatId = params?.dataId;

  const [message, setMessage] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  const messagesContainerRef = React.useRef<HTMLDivElement | null>(null);
  const lastMessageRef = React.useRef<HTMLDivElement | null>(null);
  const messageRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  React.useEffect(() => {
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
    };

    void fetchMessages();
  }, [chatId, supabase]);

  const handleSubmit = async () => {
    const content = input.trim();

    if (!chatId || !content) {
      return;
    }

    const { data, error } = await supabase
      .from("messages")
      .insert([
        {
          chat_id: chatId,
          content,
          role: "user",
        },
      ])
      .select("id, content, role")
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    setMessage((previous) => [
      ...previous,
      {
        id: data.id,
        content: data.content,
        role: data.role,
      },
    ]);

    setInput("");
  };

  // Scrolling behavior:
  // - when the user sends a message -> scroll to show the user's message (end)
  // - when the assistant replies -> scroll to the start of the user's preceding message
  React.useEffect(() => {
    if (!messagesContainerRef.current) return;
    const last = message[message.length - 1];
    if (!last) return;

    if (last.role === "user") {
      // show the user's message near the bottom
      lastMessageRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
      return;
    }

    if (last.role === "assistant") {
      const prev = message[message.length - 2];
      if (prev && messageRefs.current[prev.id]) {
        // scroll to beginning of user's message before assistant reply
        messageRefs.current[prev.id]?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      } else {
        // fallback -> scroll to beginning of assistant message
        lastMessageRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }
  }, [message]);

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
            <MessageItem message={item} />
          </div>
        ))}
      </div>

      <div className="mt-auto sticky bottom-5">
        <ChatInput input={input} setInput={setInput} onSubmit={handleSubmit} />
      </div>
    </section>
  );
};

export default ChatBody;
