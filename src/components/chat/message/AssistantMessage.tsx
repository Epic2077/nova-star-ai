"use client";

import ReactMarkdown from "react-markdown";

import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkDeflist from "remark-deflist";
import remarkSupersub from "remark-supersub";
import remarkAbbr from "@syenchuk/remark-abbr";
import remarkEmoji from "remark-emoji";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkDirective from "remark-directive";

import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";

import "katex/dist/katex.min.css";

import { useTheme } from "next-themes";
import { createMarkdownComponents } from "@/components/markdown/markDown";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useRef, useCallback } from "react";
import isRTL from "@/lib/rtlDetect";
import { Vazirmatn } from "next/font/google";
import type { ToolResult, CodeExecutionResult } from "@/types/chat";
import { executeCode } from "@/lib/codeExecutor";
import ThinkingBlock from "./ThinkingBlock";
import WebSearchBlock from "./WebSearchBlock";
import CodeExecutionBlock from "./CodeExecutionBlock";
import AnswerCarousel from "./AnswerCarousel";

const vazirmatn = Vazirmatn({ subsets: ["arabic", "latin"], display: "swap" });

export default function AssistantMessage({
  content,
  thinking,
  toolResults,
  codeResult,
  streaming,
  altTotal,
  altCurrent,
  onAltPrev,
  onAltNext,
  onRegenerate,
}: {
  content: string;
  thinking?: string;
  toolResults?: ToolResult[];
  codeResult?: CodeExecutionResult;
  streaming?: boolean;
  altTotal?: number;
  altCurrent?: number;
  onAltPrev?: () => void;
  onAltNext?: () => void;
  onRegenerate?: () => void;
}) {
  const { theme } = useTheme();
  const rtl = isRTL(content);

  const sanitizeSchema = {
    ...defaultSchema,
    attributes: {
      ...defaultSchema.attributes,
      div: [...(defaultSchema.attributes?.div || []), "style"],
      span: [...(defaultSchema.attributes?.span || []), "style"],
      kbd: ["className"],
      mark: ["className"],
    },
  };

  const remarkPlugins = [
    remarkGfm,
    remarkMath,
    remarkDeflist,
    remarkAbbr,
    remarkSupersub,
    remarkDirective,
    remarkEmoji,
  ];

  const rehypePlugins = [
    rehypeRaw,
    // `rehype-sanitize` options cause a typing mismatch with the Pluggable[] signature —
    // narrow suppression is used here because runtime behavior is correct.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [rehypeSanitize, sanitizeSchema] as any,
    rehypeKatex,
  ];

  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleRunCode = useCallback(
    async (
      code: string,
      language: string,
      onStatus?: (status: string) => void,
    ): Promise<CodeExecutionResult> => {
      return executeCode(code, language, onStatus);
    },
    [],
  );

  const handleCopy = async () => {
    try {
      const text = containerRef.current?.innerText ?? content ?? "";
      if (!text) {
        toast.error("Nothing to copy");
        return;
      }

      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      style={rtl ? { fontFamily: vazirmatn.style.fontFamily } : {}}
      ref={containerRef}
      className="relative mb-10 leading-[1.8] text-[1.05rem] max-w-4xl"
    >
      {thinking && <ThinkingBlock thinking={thinking} streaming={streaming} />}
      {toolResults && toolResults.length > 0 && (
        <WebSearchBlock toolResults={toolResults} />
      )}
      {codeResult && <CodeExecutionBlock result={codeResult} />}
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={createMarkdownComponents({
          theme,
          onRunCode: handleRunCode,
        })}
      >
        {content}
      </ReactMarkdown>

      <div className="flex items-center gap-1 mt-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleCopy}
              aria-label="Copy message"
              className="rounded-full p-1 hover:bg-muted/60"
            >
              <Copy size={18} className="text-foreground" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Copy</TooltipContent>
        </Tooltip>

        {onRegenerate && !streaming && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onRegenerate}
                aria-label="Regenerate response"
                className="rounded-full p-1 hover:bg-muted/60"
              >
                <RefreshCw size={16} className="text-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Regenerate</TooltipContent>
          </Tooltip>
        )}

        {(altTotal ?? 0) > 1 && onAltPrev && onAltNext && (
          <AnswerCarousel
            total={altTotal!}
            current={altCurrent ?? 0}
            onPrev={onAltPrev}
            onNext={onAltNext}
          />
        )}
      </div>
    </div>
  );
}
