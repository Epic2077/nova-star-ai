import React from "react";
import { Message } from "@/types/chat";
import type { FileAttachment } from "@/types/chat";
import type { ToolToggles } from "../ChatToolbar";
import { toast } from "sonner";

interface UseChatSubmitParams {
  chatId: string | undefined;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  setIsAwaitingResponse: React.Dispatch<React.SetStateAction<boolean>>;
  setStreamingMessageId: React.Dispatch<React.SetStateAction<string | null>>;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  userScrolledAwayRef: React.MutableRefObject<boolean>;
  wasStreamingRef: React.MutableRefObject<boolean>;
  generateTitle: (chatId: string, firstMessage: string) => void;
}

function isAbortError(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    (err.name === "AbortError" || err.code === 20)
  );
}

/**
 * Encapsulates the message-submission flow.
 *
 * Exports two functions:
 * - `submitMessage` — core send + SSE-stream logic (files already uploaded).
 *    Called directly for the first message in a new chat (from the pending-
 *    submit sessionStorage entry that NewChatInput writes).
 * - `handleSubmit` — ChatInput handler that uploads files, clears input,
 *    then delegates to `submitMessage`.
 */
export function useChatSubmit({
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
}: UseChatSubmitParams) {
  // ── Core submission (files already uploaded) ──────────────────
  const [isGenerating, setIsGenerating] = React.useState(false);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  /** Abort the current generation (fetch + SSE read). */
  const stopGeneration = React.useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  const submitMessage = async (
    content: string,
    opts?: {
      tools?: ToolToggles;
      attachments?: FileAttachment[];
      /** Re-use an existing temp id (e.g. from sessionStorage optimistic msg) */
      tempId?: string;
    },
  ) => {
    if (!chatId || !content) return;

    const toolOpts = opts?.tools ?? { webSearch: false, deepThinking: false };
    const attachments = opts?.attachments ?? [];
    const tempId = opts?.tempId ?? `tmp-${Date.now()}`;

    // "First message" = no real DB messages exist yet (only temp/stream ids).
    const isFirstMessage = messages.every(
      (m) =>
        typeof m.id === "string" &&
        (m.id.startsWith("tmp-") || m.id.startsWith("stream-")),
    );

    // ── Optimistic user bubble (skip if already rendered from sessionStorage)
    const optimisticMsg: Message = {
      id: tempId,
      content,
      role: "user",
      metadata: attachments.length > 0 ? { attachments } : undefined,
    };
    setMessages((prev) => {
      if (prev.some((m) => m.id === tempId)) return prev;
      return [...prev, optimisticMsg];
    });

    requestAnimationFrame(() =>
      requestAnimationFrame(() => scrollToBottom("smooth")),
    );
    setIsAwaitingResponse(true);
    setIsGenerating(true);

    // Create an AbortController for this request.
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const body = {
        chatId,
        content,
        useWebSearch: toolOpts.webSearch,
        useDeepThinking: toolOpts.deepThinking,
        attachments,
      };

      // ── STREAMING path (SSE) ──────────────────────────────────
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: abortController.signal,
      });

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(
          (errJson as { error?: string }).error || "AI request failed",
        );
      }

      // Streaming assistant placeholder
      const streamId = `stream-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: streamId,
          role: "assistant",
          content: "",
          metadata: toolOpts.deepThinking ? { thinking: "" } : undefined,
        },
      ]);
      setIsAwaitingResponse(false);
      userScrolledAwayRef.current = false;
      wasStreamingRef.current = true;
      if (toolOpts.deepThinking) setStreamingMessageId(streamId);

      // ── Read SSE stream ───────────────────────────────────────
      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";
      let currentEventType = "";

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            sseBuffer += decoder.decode(value, { stream: true });
            const lines = sseBuffer.split("\n");
            sseBuffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();

              if (!trimmed) {
                currentEventType = "";
                continue;
              }

              if (trimmed.startsWith("event: ")) {
                currentEventType = trimmed.slice(7);
                continue;
              }

              if (trimmed.startsWith("data: ")) {
                const jsonStr = trimmed.slice(6);
                let parsed: Record<string, unknown>;
                try {
                  parsed = JSON.parse(jsonStr);
                } catch {
                  continue;
                }

                const eventType = currentEventType;

                if (eventType === "thinking") {
                  const text = (parsed.text as string) ?? "";
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === streamId
                        ? {
                            ...m,
                            metadata: {
                              ...m.metadata,
                              thinking: (m.metadata?.thinking ?? "") + text,
                            },
                          }
                        : m,
                    ),
                  );
                  if (!userScrolledAwayRef.current) {
                    requestAnimationFrame(() => scrollToBottom("smooth"));
                  }
                } else if (eventType === "content") {
                  const text = (parsed.text as string) ?? "";
                  setStreamingMessageId(null);
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === streamId
                        ? { ...m, content: m.content + text }
                        : m,
                    ),
                  );
                  if (!userScrolledAwayRef.current) {
                    requestAnimationFrame(() => scrollToBottom("smooth"));
                  }
                } else if (eventType === "complete") {
                  const finalData = parsed as {
                    reply?: string;
                    thinking?: string;
                    toolResults?: unknown;
                    userMessage?: Record<string, unknown>;
                    assistantMessage?: Record<string, unknown>;
                  };

                  setMessages((prev) =>
                    prev.map((m) => {
                      if (m.id === streamId) {
                        return {
                          id:
                            (finalData.assistantMessage?.id as string) ??
                            streamId,
                          role: "assistant" as const,
                          content: (finalData.reply as string) ?? m.content,
                          type: finalData.assistantMessage?.type as
                            | Message["type"]
                            | undefined,
                          metadata: {
                            thinking:
                              (finalData.thinking as string) ??
                              m.metadata?.thinking,
                            ...(finalData.toolResults
                              ? {
                                  toolResults:
                                    finalData.toolResults as Message["metadata"] extends {
                                      toolResults?: infer T;
                                    }
                                      ? T
                                      : never,
                                }
                              : {}),
                          },
                        };
                      }
                      // Replace the temp user message with the real DB row.
                      if (m.id === tempId && finalData.userMessage?.id) {
                        return {
                          id: finalData.userMessage.id as string,
                          role: "user" as const,
                          content:
                            (finalData.userMessage.content as string) ??
                            content,
                          type: finalData.userMessage.type as
                            | Message["type"]
                            | undefined,
                          metadata:
                            (finalData.userMessage
                              .metadata as Message["metadata"]) ?? undefined,
                        };
                      }
                      return m;
                    }),
                  );
                } else if (eventType === "error") {
                  throw new Error(
                    (parsed.error as string) || "Streaming failed",
                  );
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }

      // Generate title for the first message in the chat.
      if (isFirstMessage) {
        void generateTitle(chatId, content);
      }
    } catch (err) {
      // If the user stopped generation, don't show an error — keep partial text.
      if (isAbortError(err)) return;

      toast.error(
        err instanceof Error ? err.message : "Failed to get AI response",
      );

      const failedMsg: Message = {
        id: `failed-${Date.now()}`,
        role: "assistant",
        content: "Failed to generate a response — please try again.",
      };
      setMessages((prev) => [...prev, failedMsg]);
    } finally {
      abortControllerRef.current = null;
      setIsGenerating(false);
      setStreamingMessageId(null);
      setIsAwaitingResponse(false);
    }
  };

  // ── ChatInput handler (uploads files → submitMessage) ─────────
  const handleSubmit = async (opts?: {
    tools?: ToolToggles;
    attachments?: FileAttachment[];
  }) => {
    const content = input.trim();
    if (!chatId || !content) return;

    const attachments = opts?.attachments ?? [];

    // Upload files to Supabase Storage if any.
    let uploadedAttachments: FileAttachment[] = [];
    if (attachments.length > 0) {
      try {
        const uploadPromises = attachments.map(async (att) => {
          const fileObj = (att as unknown as { _file?: File })._file;
          if (!fileObj) return att;

          const formData = new FormData();
          formData.append("file", fileObj);
          formData.append("chatId", chatId);

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

    setInput("");

    await submitMessage(content, {
      tools: opts?.tools,
      attachments: uploadedAttachments,
    });
  };

  // ── Edit a user message ───────────────────────────────────────
  const editMessage = async (messageId: string, newContent: string) => {
    if (!chatId) return;

    try {
      const resp = await fetch("/api/chat/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, content: newContent }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error || "Failed to edit message",
        );
      }

      const updated = await resp.json();

      // Update the message in local state
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, content: updated.content } : m,
        ),
      );

      toast.success("Message updated");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to edit message",
      );
    }
  };

  // ── Regenerate an assistant response (adds alternative) ───────
  const regenerateMessage = async (assistantMessageId: string) => {
    if (!chatId) return;

    // Find the assistant message and the user message before it
    const msgIndex = messages.findIndex((m) => m.id === assistantMessageId);
    if (msgIndex < 0) return;

    const assistantMsg = messages[msgIndex];
    if (assistantMsg.role !== "assistant") return;

    // Find the preceding user message
    let userContent = "";
    for (let i = msgIndex - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        userContent = messages[i].content;
        break;
      }
    }
    if (!userContent) return;

    setIsAwaitingResponse(true);
    setIsGenerating(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const streamId = `regen-${Date.now()}`;

    // Mark the assistant message as streaming with empty new content
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== assistantMessageId) return m;
        const existing = m.alternatives ?? [];
        return {
          ...m,
          alternatives: existing,
          activeAltIndex: existing.length + 1, // point to the new one (being generated)
          _regenStreamId: streamId, // internal marker
        } as Message & { _regenStreamId: string };
      }),
    );

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId,
          content: userContent,
          useWebSearch: false,
          useDeepThinking: false,
          attachments: [],
          skipSaveUser: true, // Tell the API to skip saving the user msg again
        }),
        signal: abortController.signal,
      });

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(
          (errJson as { error?: string }).error || "Regeneration failed",
        );
      }

      setIsAwaitingResponse(false);
      wasStreamingRef.current = true;
      userScrolledAwayRef.current = false;

      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";
      let currentEventType = "";
      let regenText = "";
      let regenThinking = "";

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            sseBuffer += decoder.decode(value, { stream: true });
            const lines = sseBuffer.split("\n");
            sseBuffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) {
                currentEventType = "";
                continue;
              }
              if (trimmed.startsWith("event: ")) {
                currentEventType = trimmed.slice(7);
                continue;
              }
              if (trimmed.startsWith("data: ")) {
                const jsonStr = trimmed.slice(6);
                let parsed: Record<string, unknown>;
                try {
                  parsed = JSON.parse(jsonStr);
                } catch {
                  continue;
                }

                if (currentEventType === "thinking") {
                  regenThinking += (parsed.text as string) ?? "";
                } else if (currentEventType === "content") {
                  regenText += (parsed.text as string) ?? "";
                  // Live update the new alternative content
                  setMessages((prev) =>
                    prev.map((m) => {
                      if (m.id !== assistantMessageId) return m;
                      const alts = [...(m.alternatives ?? [])];
                      const altIdx = (m.activeAltIndex ?? 1) - 1;
                      alts[altIdx] = {
                        id: streamId,
                        content: regenText,
                        metadata: regenThinking
                          ? { thinking: regenThinking }
                          : undefined,
                      };
                      return { ...m, alternatives: alts };
                    }),
                  );
                  if (!userScrolledAwayRef.current) {
                    requestAnimationFrame(() => scrollToBottom("smooth"));
                  }
                } else if (currentEventType === "complete") {
                  const finalData = parsed as {
                    reply?: string;
                    thinking?: string;
                    assistantMessage?: Record<string, unknown>;
                  };
                  const finalText = (finalData.reply as string) ?? regenText;
                  const finalThinking =
                    (finalData.thinking as string) ?? regenThinking;
                  const finalId =
                    (finalData.assistantMessage?.id as string) ?? streamId;

                  setMessages((prev) =>
                    prev.map((m) => {
                      if (m.id !== assistantMessageId) return m;
                      const alts = [...(m.alternatives ?? [])];
                      const altIdx = (m.activeAltIndex ?? 1) - 1;
                      alts[altIdx] = {
                        id: finalId,
                        content: finalText,
                        metadata: finalThinking
                          ? { thinking: finalThinking }
                          : undefined,
                      };
                      return { ...m, alternatives: alts };
                    }),
                  );
                } else if (currentEventType === "error") {
                  throw new Error(
                    (parsed.error as string) || "Regeneration failed",
                  );
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }
    } catch (err) {
      if (isAbortError(err)) return;
      toast.error(err instanceof Error ? err.message : "Regeneration failed");
      // Revert to the previous alternative
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== assistantMessageId) return m;
          const alts = m.alternatives ?? [];
          // Remove the failed partial alt
          const cleaned = alts.filter((a) => a.id !== streamId);
          return {
            ...m,
            alternatives: cleaned,
            activeAltIndex: Math.max(0, cleaned.length),
          };
        }),
      );
    } finally {
      abortControllerRef.current = null;
      setIsGenerating(false);
      setStreamingMessageId(null);
      setIsAwaitingResponse(false);
    }
  };

  // ── Carousel navigation ───────────────────────────────────────
  const setAltIndex = (messageId: string, index: number) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, activeAltIndex: index } : m,
      ),
    );
  };

  return {
    handleSubmit,
    submitMessage,
    stopGeneration,
    isGenerating,
    editMessage,
    regenerateMessage,
    setAltIndex,
  };
}
