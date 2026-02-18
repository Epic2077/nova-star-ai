"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronRight, Brain } from "lucide-react";

interface ThinkingBlockProps {
  thinking: string;
  /** When true, the block is still receiving streamed content */
  streaming?: boolean;
}

/**
 * Expandable thinking/reasoning block shown above assistant messages
 * when deep thinking was used. Starts expanded during streaming but
 * can be collapsed / expanded freely at any time.
 */
export default function ThinkingBlock({
  thinking,
  streaming = false,
}: ThinkingBlockProps) {
  // Default to open when streaming starts, user can toggle freely
  const [isOpen, setIsOpen] = useState(streaming);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // Track whether the user has manually scrolled inside the thinking box
  const userScrolledRef = useRef(false);

  // Auto-scroll the thinking container only when user hasn't scrolled away
  useEffect(() => {
    if (streaming && isOpen && scrollRef.current && !userScrolledRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thinking, streaming, isOpen]);

  // Detect user scroll inside the thinking container
  const handleThinkingScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 30;
    userScrolledRef.current = !nearBottom;
  }, []);

  if (!thinking && !streaming) return null;

  // Count approximate thinking steps
  const lines = thinking.split(/\n/).filter((l) => l.trim().length > 0);
  const stepCount = lines.length;

  return (
    <div className="mb-3 rounded-xl border border-border/50 bg-muted/30 overflow-hidden">
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
        aria-expanded={isOpen}
      >
        <Brain
          size={16}
          className={`shrink-0 text-purple-500 ${streaming ? "animate-pulse" : ""}`}
        />
        <span className="font-medium">
          {streaming ? "Thinking…" : "Deep Thinking"}
        </span>
        {!streaming && stepCount > 0 && (
          <span className="text-xs opacity-60">
            ({stepCount} {stepCount === 1 ? "line" : "lines"} of reasoning)
          </span>
        )}
        {streaming && (
          <span className="text-xs opacity-60 tabular-nums">
            {stepCount} {stepCount === 1 ? "line" : "lines"}
          </span>
        )}
        <span
          className="ml-auto transition-transform duration-200"
          style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          <ChevronRight size={14} />
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-border/30">
          <div className="px-4 pb-3 pt-1">
            <div
              ref={scrollRef}
              onScroll={handleThinkingScroll}
              className="max-h-80 overflow-y-auto text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap scrollbar-thin"
            >
              {thinking}
              {streaming && (
                <span className="inline-block w-2 h-4 bg-purple-500/70 rounded-sm ml-0.5 animate-pulse" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
