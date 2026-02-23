"use client";

import React from "react";
import { motion } from "framer-motion";
import type { Dispatch, SetStateAction } from "react";
import { CameraIcon, PlusIcon, SendHorizontalIcon, Square } from "lucide-react";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import isRTL from "@/lib/rtlDetect";
import ChatToolbar, { type ToolToggles } from "./ChatToolbar";
import FilePreview from "./message/FilePreview";
import type { FileAttachment } from "@/types/chat";
import { useFileAttachments } from "./hooks/useFileAttachments";

interface ChatInputProps {
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  onSubmit: (opts?: {
    tools?: ToolToggles;
    attachments?: FileAttachment[];
  }) => Promise<void>;
  isGenerating?: boolean;
  onStop?: () => void;
}

const ChatInput = ({
  input,
  setInput,
  onSubmit,
  isGenerating = false,
  onStop,
}: ChatInputProps) => {
  const maxTextareaHeight = 200;
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const rtl = isRTL(input);

  const [tools, setTools] = React.useState<ToolToggles>({
    webSearch: false,
    deepThinking: false,
  });

  const {
    pendingFiles,
    isUploading,
    fileInputRef,
    cameraInputRef,
    handleFileSelect,
    handleRemoveFile,
    handlePaste,
    isDragOver,
    takeFiles,
  } = useFileAttachments();

  const handleToggle = (tool: keyof ToolToggles) => {
    setTools((prev) => ({ ...prev, [tool]: !prev[tool] }));
  };

  const handleSubmit = async () => {
    if (input.trim().length === 0 && pendingFiles.length === 0) return;
    const attachments = takeFiles();
    await onSubmit({ tools, attachments });
  };

  // Reset the textarea height when input is cleared.
  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    if (input.trim().length === 0) {
      el.style.height = "auto";
    }
  }, [input]);

  const isMobile =
    typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  return (
    <div className="">
      {/* Full-page drop overlay */}
      {isDragOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm pointer-events-none">
          <div className="rounded-2xl border-2 border-dashed border-primary/50 bg-primary/5 px-12 py-8 text-center shadow-2xl">
            <p className="text-lg font-medium text-primary">Drop files here</p>
            <p className="text-sm text-muted-foreground mt-1">
              Images, PDFs, documents&hellip;
            </p>
          </div>
        </div>
      )}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full px-4"
      >
        <div className="mx-auto w-full max-w-4xl rounded-2xl bg-chat-input shadow-xl">
          {/* Pending file previews */}
          {pendingFiles.length > 0 && (
            <div className="px-4 pt-3">
              <FilePreview
                attachments={pendingFiles}
                removable
                onRemove={handleRemoveFile}
              />
            </div>
          )}

          <textarea
            dir={rtl ? "rtl" : "ltr"}
            ref={textareaRef}
            value={input}
            rows={1}
            onPaste={handlePaste}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                (input.trim().length > 0 || pendingFiles.length > 0)
              ) {
                event.preventDefault();
                void handleSubmit();
              }
            }}
            onInput={(event) => {
              const target = event.currentTarget;
              // Preserve scroll position — collapsing to "auto" momentarily
              // shrinks the page, which makes the browser adjust scrollY.
              const prevScroll = window.scrollY;
              target.style.height = "auto";
              const nextHeight = Math.min(
                target.scrollHeight,
                maxTextareaHeight,
              );
              target.style.height = `${nextHeight}px`;
              window.scrollTo({ top: prevScroll });
            }}
            className="w-full min-h-12 text-lg max-h-50 resize-none rounded-2xl px-6 pt-3 pb-2
              bg-transparent
              outline-none
              focus:outline-none 
              transition-[height] duration-150 ease-out overflow-y-auto
              [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            placeholder="Ask anything"
            onChange={(event) => setInput(event.target.value)}
          />
          <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex items-center gap-1">
              {/* File upload button */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                accept="image/*,.pdf,.doc,.docx,.txt,.csv,.json,.md"
              />
              {/* Camera capture (mobile) */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className="rounded-full w-9 h-9 hover:bg-muted"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <PlusIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Add Files</p>
                </TooltipContent>
              </Tooltip>

              {/* Camera button (visible on mobile) */}
              {isMobile && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className="rounded-full w-9 h-9 hover:bg-muted"
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      <CameraIcon size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Take Photo</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Tool toggles */}
              <ChatToolbar tools={tools} onToggle={handleToggle} />
            </div>

            {isGenerating ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    className="h-9 w-9 rounded-full shadow-lg cursor-pointer bg-chat-background hover:bg-destructive text-destructive-foreground"
                    onClick={onStop}
                    aria-label="Stop generation"
                  >
                    <Square size={14} fill="currentColor" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Stop generating</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="secondary"
                className="h-9 w-9 rounded-full shadow-lg cursor-pointer"
                onClick={() => void handleSubmit()}
                disabled={
                  input.trim().length === 0 && pendingFiles.length === 0
                }
              >
                <SendHorizontalIcon size={18} className="-rotate-90" />
              </Button>
            )}
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
