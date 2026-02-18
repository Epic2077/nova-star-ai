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
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { useRef } from "react";
import isRTL from "@/lib/rtlDetect";
import { Vazirmatn } from "next/font/google";
import type { ToolResult } from "@/types/chat";
import ThinkingBlock from "./ThinkingBlock";
import WebSearchBlock from "./WebSearchBlock";

const vazirmatn = Vazirmatn({ subsets: ["arabic", "latin"], display: "swap" });

export default function AssistantMessage({
  content,
  thinking,
  toolResults,
  streaming,
}: {
  content: string;
  thinking?: string;
  toolResults?: ToolResult[];
  streaming?: boolean;
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
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={createMarkdownComponents({ theme })}
      >
        {content}
      </ReactMarkdown>

      <div>
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
      </div>
    </div>
  );
}
