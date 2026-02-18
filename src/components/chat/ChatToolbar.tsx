"use client";

import { Globe, Brain } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface ToolToggles {
  webSearch: boolean;
  deepThinking: boolean;
}

interface ChatToolbarProps {
  tools: ToolToggles;
  onToggle: (tool: keyof ToolToggles) => void;
}

/**
 * Toolbar row of tool toggle buttons that appears in the chat input area.
 */
export default function ChatToolbar({ tools, onToggle }: ChatToolbarProps) {
  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => onToggle("webSearch")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium hidden transition-colors cursor-pointer ${
              tools.webSearch
                ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
            aria-pressed={tools.webSearch}
          >
            <Globe size={14} />
            <span>Search</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {tools.webSearch ? "Disable" : "Enable"} web search
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => onToggle("deepThinking")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              tools.deepThinking
                ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
            aria-pressed={tools.deepThinking}
          >
            <Brain size={14} />
            <span>Think</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {tools.deepThinking ? "Disable" : "Enable"} deep thinking
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
