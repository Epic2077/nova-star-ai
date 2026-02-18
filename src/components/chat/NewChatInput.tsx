"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import type { Dispatch, SetStateAction } from "react";
import { PlusIcon, SendHorizontalIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Spinner } from "../ui/spinner";
import isRTL from "@/lib/rtlDetect";
import ChatToolbar, { type ToolToggles } from "./ChatToolbar";
import FilePreview from "./message/FilePreview";
import type { FileAttachment } from "@/types/chat";

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
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

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
      const url = file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : "";

      newAttachments.push({
        name: file.name,
        url,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        ...({ _file: file } as unknown as object),
      });
    }

    setPendingFiles((prev) => [...prev, ...newAttachments]);
    setIsUploading(false);

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

  useEffect(() => {
    const onPageLoad = () => {
      const textarea = document.querySelector("textarea");
      if (textarea) {
        textarea.focus();
        textarea.select();
      }
    };

    window.addEventListener("load", onPageLoad);
    return () => {
      window.removeEventListener("load", onPageLoad);
    };
  }, []);

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

    const tempId = `tmp-${Date.now()}`;

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

    // Upload files BEFORE navigating so we have the final URLs.
    const attachments = [...pendingFiles];
    setPendingFiles([]);

    let uploadedAttachments: FileAttachment[] = [];
    if (attachments.length > 0) {
      try {
        const uploadPromises = attachments.map(async (att) => {
          const fileObj = (att as unknown as { _file?: File })._file;
          if (!fileObj) return att;

          const formData = new FormData();
          formData.append("file", fileObj);
          formData.append("chatId", data.id);

          const uploadResp = await fetch("/api/chat/upload", {
            method: "POST",
            body: formData,
          });

          if (uploadResp.ok) {
            const uploaded = await uploadResp.json();
            return {
              name: uploaded.name,
              url: uploaded.url,
              mimeType: uploaded.mimeType,
              size: uploaded.size,
            } as FileAttachment;
          }
          return att;
        });

        uploadedAttachments = await Promise.all(uploadPromises);
      } catch {
        uploadedAttachments = attachments;
      }
    }

    // Store optimistic user bubble for instant first render on ChatBody.
    try {
      sessionStorage.setItem(
        `optimistic-msg-${data.id}`,
        JSON.stringify({
          id: tempId,
          role: "user",
          content,
          metadata:
            uploadedAttachments.length > 0
              ? { attachments: uploadedAttachments }
              : undefined,
        }),
      );
    } catch {
      /* sessionStorage unavailable */
    }

    // Store the pending submit so ChatBody streams the response itself.
    try {
      sessionStorage.setItem(
        `pending-submit-${data.id}`,
        JSON.stringify({
          content,
          tempId,
          tools: {
            webSearch: tools.webSearch,
            deepThinking: tools.deepThinking,
          },
          attachments: uploadedAttachments,
        }),
      );
    } catch {
      /* sessionStorage unavailable */
    }

    setInput("");
    router.push(`/chat/${data.id}`);
    setIsSubmitting(false);
  };

  const rtl = isRTL(input);

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
                      disabled={isUploading || isSubmitting}
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
                onClick={() => void handleNewChat()}
                disabled={
                  (!input.trim() && pendingFiles.length === 0) || isSubmitting
                }
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
