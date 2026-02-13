"use client";

import React from "react";
import { motion } from "framer-motion";
import type { Dispatch, SetStateAction } from "react";
import { PlusIcon, SendHorizontalIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import {
  shouldUseReferenceLayer,
  shouldUseInsightLayer,
} from "@/lib/promptLayerDetection";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Spinner } from "../ui/spinner";

interface ChatInputProps {
  userInfo: { user_metadata?: { full_name?: string } } | null;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
}

const NewChatInput = ({ userInfo, input, setInput }: ChatInputProps) => {
  const { user } = useUser();
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleNewChat = async () => {
    const content = input.trim();

    if (!content || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    if (!user?.id) {
      toast.error("You need to be logged in to start a chat.");
      router.push("/login");
      setIsSubmitting(false);
      return;
    }

    const { data, error } = await supabase
      .from("chats")
      .insert([{ user_id: user.id, title: "New Chat" }])
      .select("id")
      .single();

    if (error) {
      toast.error(error.message);
      setIsSubmitting(false);
      return;
    }

    if (!data?.id) {
      toast.error("Failed to create a new chat.");
      setIsSubmitting(false);
      return;
    }

    window.dispatchEvent(
      new CustomEvent("chatCreated", {
        detail: {
          chat: {
            id: data.id,
            title: "New Chat",
            created_at: new Date().toISOString(),
          },
        },
      }),
    );

    // Navigate immediately - don't wait for AI response
    setInput("");
    router.push(`/chat/${data.id}`);
    setIsSubmitting(false);

    // Send the user's first message in the background (fire-and-forget)
    void fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId: data.id,
        content,
        useReferenceLayer: shouldUseReferenceLayer(content),
        useInsightLayer: shouldUseInsightLayer(content),
      }),
    }).catch((err) => {
      console.error("AI request failed:", err);
    });

    // Generate conversation title separately (first message only)
    void fetch("/api/chat/title", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId: data.id, firstUserMessage: content }),
    })
      .then(async (titleResp) => {
        if (!titleResp.ok) return;
        const titleJson = await titleResp.json();
        if (!titleJson?.title) return;

        window.dispatchEvent(
          new CustomEvent("chatRenamed", {
            detail: { chatId: data.id, newTitle: titleJson.title },
          }),
        );
      })
      .catch(() => {
        /* don't block user flow if title generation fails */
      });
  };

  const maxTextareaHeight = 200;
  return (
    <div>
      <div className="h-[calc(100vh-150px)] flex flex-col items-center justify-center gap-8 bg-chat-background">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center text-2xl md:text-4xl font-semibold"
        >
          Hi, {userInfo?.user_metadata?.full_name?.split(" ")[0] ?? "there"}
        </motion.h1>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full px-4"
        >
          <div className="mx-auto w-full max-w-2xl rounded-2xl bg-chat-input shadow-xl">
            <textarea
              value={input}
              rows={1}
              disabled={isSubmitting}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  input.trim().length > 0
                ) {
                  event.preventDefault();
                  void handleNewChat();
                }
              }}
              onInput={(event) => {
                const target = event.currentTarget;
                target.style.height = "auto";
                const nextHeight = Math.min(
                  target.scrollHeight,
                  maxTextareaHeight,
                );
                target.style.height = `${nextHeight}px`;
              }}
              className="w-full min-h-14 text-lg max-h-50 resize-none rounded-2xl px-6 pt-3 pb-2
              bg-transparent
              outline-none
              focus:outline-none 
              transition-[height] duration-150 ease-out overflow-y-auto
              [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              placeholder="How can I help you today?"
              onChange={(event) => setInput(event.target.value)}
            />
            <div className="flex items-center justify-between px-3 pb-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className="rounded-full w-9 h-9 hover:bg-muted"
                  >
                    <PlusIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Add Files</p>
                </TooltipContent>
              </Tooltip>
              <Button
                variant="secondary"
                className="h-9 w-9 rounded-full shadow-lg cursor-pointer"
                onClick={() => void handleNewChat()}
                disabled={!input.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <Spinner className="size-4" />
                ) : (
                  <SendHorizontalIcon size={18} className="-rotate-90" />
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default NewChatInput;
