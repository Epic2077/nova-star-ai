"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Globe, ExternalLink } from "lucide-react";
import type { ToolResult } from "@/types/chat";

interface WebSearchBlockProps {
  toolResults: ToolResult[];
}

/**
 * Expandable web search results block shown above assistant messages
 * when web search was used.
 */
export default function WebSearchBlock({ toolResults }: WebSearchBlockProps) {
  const [isOpen, setIsOpen] = useState(false);

  const searchResults = toolResults.filter((t) => t.tool === "web_search");
  if (searchResults.length === 0) return null;

  const allResults = searchResults.flatMap((t) => t.results);
  const query = searchResults[0]?.query ?? "";

  return (
    <div className="mb-3 rounded-xl border border-border/50 bg-muted/30 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
        aria-expanded={isOpen}
      >
        <Globe size={16} className="shrink-0 text-blue-500" />
        <span className="font-medium">Searched the web</span>
        {query && (
          <span className="text-xs opacity-60 truncate max-w-48">
            &quot;{query}&quot;
          </span>
        )}
        <span className="text-xs opacity-60">
          ({allResults.length} {allResults.length === 1 ? "result" : "results"})
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.2 }}
          className="ml-auto"
        >
          <ChevronRight size={14} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pt-1 border-t border-border/30 space-y-2">
              {allResults.map((result, i) => (
                <a
                  key={i}
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <span className="text-xs text-muted-foreground mt-0.5 shrink-0 font-mono">
                    [{i + 1}]
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground group-hover:text-primary truncate flex items-center gap-1">
                      {result.title}
                      <ExternalLink
                        size={12}
                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {result.snippet}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
