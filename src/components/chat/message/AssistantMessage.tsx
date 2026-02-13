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
import { createMarkdownComponents } from "@/constant/markDown";
import { motion } from "motion/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Copy } from "lucide-react";

export default function AssistantMessage({
  content,
  animate,
}: {
  content: string;
  animate?: boolean;
}) {
  const { theme } = useTheme();

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
    rehypeKatex,
    [rehypeSanitize, sanitizeSchema] as any,
  ];

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.36, ease: "easeOut" }}
        className="mb-10 leading-[1.8] text-[1.05rem] max-w-4xl"
      >
        <ReactMarkdown
          remarkPlugins={remarkPlugins}
          rehypePlugins={rehypePlugins}
          components={createMarkdownComponents({ theme })}
        >
          {content}
        </ReactMarkdown>
        <Tooltip>
          <TooltipTrigger>
            <Copy size={20} className="text-foreground" />
          </TooltipTrigger>
          <TooltipContent>Copy</TooltipContent>
        </Tooltip>
      </motion.div>
    );
  }

  return (
    <div className="mb-10 leading-[1.8] text-[1.05rem] max-w-4xl">
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={createMarkdownComponents({ theme })}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
