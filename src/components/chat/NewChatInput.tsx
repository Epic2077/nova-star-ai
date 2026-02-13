"use client";

import React from "react";
import { motion } from "framer-motion";
import type { Dispatch, SetStateAction } from "react";
import { PlusIcon, SendHorizontalIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface ChatInputProps {
  userInfo: { user_metadata?: { full_name?: string } } | null;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
}

const NewChatInput = ({ userInfo, input, setInput }: ChatInputProps) => {
  const { user } = useUser();
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();

  const handleNewChat = async () => {
    const content = input.trim();

    if (!content) {
      return;
    }

    if (!user?.id) {
      toast.error("You need to be logged in to start a chat.");
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from("chats")
      .insert([{ user_id: user.id, title: "New Chat" }])
      .select("id")
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    if (!data?.id) {
      toast.error("Failed to create a new chat.");
      return;
    }

    // Send the user's first message to the server API so assistant reply is generated and persisted
    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: data.id, content, role: "user" }),
      });

      const json = await resp.json();
      if (!resp.ok || !json?.ok) {
        throw new Error(json?.error || "AI request failed");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to contact AI");
      // still navigate to the chat even if AI failed
    }

    setInput("");
    router.push(`/chat/${data.id}`);
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
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
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
              >
                <SendHorizontalIcon size={18} className="-rotate-90" />
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default NewChatInput;
