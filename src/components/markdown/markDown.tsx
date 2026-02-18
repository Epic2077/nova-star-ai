import React from "react";
import SyntaxHighlighter from "react-syntax-highlighter";
import { stackoverflowLight } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { stackoverflowDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import Image from "next/image";
import { Kbd, KbdGroup } from "@/components/ui/kbd";

export function createMarkdownComponents({
  theme = "light",
}: {
  theme?: string;
}) {
  return {
    div: ({ children }: { children?: React.ReactNode }) => (
      <div className="bg-muted py-3 px-5">{children}</div>
    ),
    h1: ({ children }: { children?: React.ReactNode }) => (
      <h1 className="text-3xl font-medium mt-10 mb-4">{children}</h1>
    ),

    h2: ({ children }: { children?: React.ReactNode }) => (
      <h2 className="text-2xl font-medium mt-8 mb-4">{children}</h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className="text-xl font-medium mt-6 mb-3">{children}</h3>
    ),
    h4: ({ children }: { children?: React.ReactNode }) => (
      <h4 className="text-lg font-medium mt-4 mb-2">{children}</h4>
    ),
    h5: ({ children }: { children?: React.ReactNode }) => (
      <h5 className="text-base font-medium mt-2 mb-1">{children}</h5>
    ),
    h6: ({ children }: { children?: React.ReactNode }) => (
      <h6 className="text-sm font-medium mt-1 mb-1">{children}</h6>
    ),

    p: ({ children }: { children?: React.ReactNode }) => (
      <div className="mb-3">{children}</div>
    ),

    bold: ({ children }: { children?: React.ReactNode }) => (
      <strong className="font-bold text-foreground">{children}</strong>
    ),

    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className="font-semibold text-foreground">{children}</strong>
    ),

    i: ({ children }: { children?: React.ReactNode }) => (
      <em className="italic text-foreground/90">{children}</em>
    ),

    em: ({ children }: { children?: React.ReactNode }) => (
      <em className="italic text-foreground/90">{children}</em>
    ),

    u: ({ children }: { children?: React.ReactNode }) => (
      <u className="underline text-foreground/90">{children}</u>
    ),

    mark: ({ children }: { children?: React.ReactNode }) => (
      <mark className="bg-yellow-200 text-yellow-800 px-1 rounded">
        {children}
      </mark>
    ),

    del: ({ children }: { children?: React.ReactNode }) => (
      <del className="line-through opacity-70">{children}</del>
    ),

    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote
        className="border-l-4 pl-4 italic my-6 opacity-80"
        style={{ borderColor: "oklch(75% 0.04 60)" }}
      >
        {children}
      </blockquote>
    ),

    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul className="list-disc ml-6 mb-5 space-y-2">{children}</ul>
    ),

    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol className="list-decimal ml-6 mb-5 space-y-2">{children}</ol>
    ),

    hr: () => <hr className="my-8 border-foreground" />,

    table: ({ children }: { children?: React.ReactNode }) => (
      <div className="my-6 overflow-x-auto rounded-xl border border-border shadow-xl">
        <table className="min-w-full text-sm">{children}</table>
      </div>
    ),

    thead: ({ children }: { children?: React.ReactNode }) => (
      <thead className="bg-muted text-foreground">{children}</thead>
    ),

    th: ({
      children,
      align,
    }: {
      children?: React.ReactNode;
      align?: string | null;
    }) => {
      const alignClass =
        align === "center"
          ? "text-center"
          : align === "right"
            ? "text-right"
            : "text-left";
      return (
        <th
          className={`${alignClass} px-4 py-2 font-medium border-b border-border`}
        >
          {children}
        </th>
      );
    },

    td: ({
      children,
      align,
    }: {
      children?: React.ReactNode;
      align?: string | null;
    }) => {
      const alignClass =
        align === "center"
          ? "text-center"
          : align === "right"
            ? "text-right"
            : "text-left";
      return (
        <td
          className={`${alignClass} px-4 py-2 border-b border-border bg-chat-input`}
        >
          {children}
        </td>
      );
    },

    a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-4 decoration-muted-foreground/40 hover:decoration-foreground transition-colors"
      >
        {children}
      </a>
    ),

    img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
      const { alt = "", src } = props;
      // if there's no src, don't render anything
      if (!src) return null;

      return (
        <div className="my-6 rounded-2xl shadow-sm border border-border overflow-hidden">
          <Image
            src={String(src)}
            alt={alt}
            width={400}
            height={400}
            className="w-full h-auto object-contain"
            unoptimized
          />
        </div>
      );
    },

    kbd: ({ children }: { children?: React.ReactNode }) => (
      <KbdGroup>
        <Kbd>{children}</Kbd>
      </KbdGroup>
    ),

    code({
      inline,
      children,
    }: {
      inline?: boolean;
      className?: string;
      children?: React.ReactNode;
    }) {
      if (inline) {
        return (
          <code className="bg-[oklch(95%_0.015_60)] px-2 py-1 rounded-md text-sm font-mono">
            {children}
          </code>
        );
      }
      return <code>{children}</code>;
    },

    pre({ children }: { children?: React.ReactNode }) {
      const child = React.Children.only(children) as any;
      const className = child.props.className || "";
      const match = /language-(\w+)/.exec(className);
      const language = match ? match[1] : "text";
      const codeText = child.props.children;

      //   const match = /language-(\w+)/.exec(className || "");
      //   const language = match ? match[1] : "text";
      //   const codeText = String(children ?? "").trim();

      return (
        <div className="my-6 rounded-2xl overflow-hidden border border-border shadow-xl">
          <div className="px-4 py-2 text-xs bg-muted text-foreground border-b border-border">
            {language}
          </div>
          <SyntaxHighlighter
            language={language}
            style={theme === "dark" ? stackoverflowDark : stackoverflowLight}
            PreTag="div"
            customStyle={{ margin: 0, padding: "16px", fontSize: "0.9rem" }}
          >
            {codeText}
          </SyntaxHighlighter>
        </div>
      );
    },
  };
}
