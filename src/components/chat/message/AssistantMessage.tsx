"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ReactNode } from "react";
import SyntaxHighlighter from "react-syntax-highlighter";

import { useTheme } from "next-themes";

import {
  dracula,
  github,
  stackoverflowLight,
} from "react-syntax-highlighter/dist/esm/styles/hljs";
import { stackoverflowDark } from "react-syntax-highlighter/dist/cjs/styles/hljs";

export default function AssistantMessage({ content }: { content: string }) {
  const { theme } = useTheme();
  return (
    <div className="mb-10 animate-fadeInUp leading-[1.8] text-[1.05rem]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-3xl font-medium mt-10 mb-4">{children}</h1>
          ),

          h2: ({ children }) => (
            <h2 className="text-2xl font-medium mt-8 mb-4">{children}</h2>
          ),

          p: ({ children }) => <p className="mb-5">{children}</p>,

          blockquote: ({ children }) => (
            <blockquote
              className="border-l-4 pl-4 italic my-6 opacity-80"
              style={{ borderColor: "oklch(75% 0.04 60)" }}
            >
              {children}
            </blockquote>
          ),

          ul: ({ children }) => (
            <ul className="list-disc ml-6 mb-5 space-y-2">{children}</ul>
          ),

          ol: ({ children }) => (
            <ol className="list-decimal ml-6 mb-5 space-y-2">{children}</ol>
          ),
          hr: () => <hr className="my-6 border-foreground" />,

          code({
            inline,
            className,
            children,
          }: {
            inline?: boolean;
            className?: string;
            children?: ReactNode;
          }) {
            if (inline) {
              return (
                <code className="bg-[oklch(95%_0.015_60)] px-2 py-1 rounded-md text-sm font-mono">
                  {children}
                </code>
              );
            }

            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "text";
            const codeText = String(children ?? "").trim();

            return (
              <div className="my-6 rounded-2xl overflow-hidden border border-border">
                <div className="px-4 py-2 text-xs bg-muted text-foreground border-b border-border">
                  {language}
                </div>

                <SyntaxHighlighter
                  language={language}
                  style={
                    theme === "dark" ? stackoverflowDark : stackoverflowLight
                  }
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    padding: "16px",
                    fontSize: "0.9rem",
                  }}
                >
                  {codeText}
                </SyntaxHighlighter>
              </div>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
