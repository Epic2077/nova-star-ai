"use client";

import React from "react";
import { motion } from "framer-motion";
import type { Dispatch, SetStateAction } from "react";
import { PlusIcon, SendHorizontalIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import isRTL from "@/lib/rtlDetect";
import ChatToolbar, { type ToolToggles } from "./ChatToolbar";
import FilePreview from "./message/FilePreview";
import type { FileAttachment } from "@/types/chat";

interface ChatInputProps {
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  onSubmit: (opts?: {
    tools?: ToolToggles;
    attachments?: FileAttachment[];
  }) => Promise<void>;
}

const ChatInput = ({ input, setInput, onSubmit }: ChatInputProps) => {
  const maxTextareaHeight = 200;
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const rtl = isRTL(input);

  const [tools, setTools] = React.useState<ToolToggles>({
    webSearch: false,
    deepThinking: false,
  });

  const [pendingFiles, setPendingFiles] = React.useState<FileAttachment[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);

  const handleToggle = (tool: keyof ToolToggles) => {
    setTools((prev) => ({ ...prev, [tool]: !prev[tool] }));
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newAttachments: FileAttachment[] = [];

    for (const file of Array.from(files)) {
      // Create a local preview URL for images, or a placeholder for other files
      const url = file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : "";

      newAttachments.push({
        name: file.name,
        url,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        // Store the File object reference for upload on submit
        ...({ _file: file } as unknown as object),
      });
    }

    setPendingFiles((prev) => [...prev, ...newAttachments]);
    setIsUploading(false);

    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveFile = (index: number) => {
    setPendingFiles((prev) => {
      const removed = prev[index];
      if (removed?.url?.startsWith("blob:")) {
        URL.revokeObjectURL(removed.url);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async () => {
    if (input.trim().length === 0 && pendingFiles.length === 0) return;
    const attachments = [...pendingFiles];
    setPendingFiles([]);
    await onSubmit({ tools, attachments });
  };

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

              {/* Tool toggles */}
              <ChatToolbar tools={tools} onToggle={handleToggle} />
            </div>

            <Button
              variant="secondary"
              className="h-9 w-9 rounded-full shadow-lg cursor-pointer"
              onClick={() => void handleSubmit()}
              disabled={input.trim().length === 0 && pendingFiles.length === 0}
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
