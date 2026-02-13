"use client";

import React from "react";
import { motion } from "framer-motion";
import type { Dispatch, SetStateAction } from "react";
import { PlusIcon, SendHorizontalIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

interface ChatInputProps {
  //   userInfo: { user_metadata?: { full_name?: string } } | null;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  onSubmit: () => Promise<void>;
}

const ChatInput = ({ input, setInput, onSubmit }: ChatInputProps) => {
  const maxTextareaHeight = 200;
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  // Reset the textarea height to allow CSS `min-height` to take effect when
  // the input is cleared (so it returns to the small default size).
  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    if (input.trim().length === 0) {
      // remove programmatic height so CSS min-height applies
      el.style.height = "auto";
    }
  }, [input]);

  return (
    <div className="">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full px-4 "
      >
        <div className="mx-auto w-full max-w-4xl rounded-2xl bg-chat-input shadow-xl">
          <textarea
            ref={textareaRef}
            value={input}
            rows={1}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                input.trim().length > 0
              ) {
                event.preventDefault();
                void onSubmit();
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
            className="w-full min-h-12 text-lg max-h-50 resize-none rounded-2xl px-6 pt-3 pb-2
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
              onClick={() => void onSubmit()}
              disabled={input.trim().length === 0}
            >
              <SendHorizontalIcon size={18} className="-rotate-90" />
            </Button>
          </div>
        </div>
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-xs text-center text-muted-foreground mt-2"
      >
        Nova Star can make mistakes. Check important info.
      </motion.p>
    </div>
  );
};

export default ChatInput;
