import React, { useState } from "react";
import SyntaxHighlighter from "react-syntax-highlighter";
import { stackoverflowLight } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { stackoverflowDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import Image from "next/image";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Check, Copy, Loader2, Play } from "lucide-react";
import type { CodeExecutionResult } from "@/types/chat";

/** Languages eligible for the Run button. */
const RUNNABLE_LANGUAGES = new Set(["javascript", "js", "python", "py"]);

interface MarkdownComponentOptions {
  theme?: string;
  /** Callback invoked when the user clicks "Run" on a code block. */
  onRunCode?: (
    code: string,
    language: string,
    onStatus?: (status: string) => void,
  ) => Promise<CodeExecutionResult>;
}

export function createMarkdownComponents({
  theme = "light",
  onRunCode,
}: MarkdownComponentOptions) {
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const child = React.Children.only(children) as any;
      const className = child.props.className || "";
      const match = /language-(\w+)/.exec(className);
      const language = match ? match[1] : "text";
      const codeText = String(child.props.children ?? "").replace(/\n$/, "");

      const isRunnable = onRunCode && RUNNABLE_LANGUAGES.has(language);

      return (
        <CodeBlockWithActions
          language={language}
          codeText={codeText}
          theme={theme}
          runnable={!!isRunnable}
          onRunCode={onRunCode}
        />
      );
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Code block with copy / run buttons                                 */
/* ------------------------------------------------------------------ */

function CodeBlockWithActions({
  language,
  codeText,
  theme,
  runnable,
  onRunCode,
}: {
  language: string;
  codeText: string;
  theme: string;
  runnable: boolean;
  onRunCode?: (
    code: string,
    language: string,
    onStatus?: (status: string) => void,
  ) => Promise<CodeExecutionResult>;
}) {
  const [copied, setCopied] = useState(false);
  const [running, setRunning] = useState(false);
  const [statusText, setStatusText] = useState("Running…");
  const [execResult, setExecResult] = useState<CodeExecutionResult | null>(
    null,
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may not be available */
    }
  };

  const handleRun = async () => {
    if (!onRunCode || running) return;
    setRunning(true);
    setExecResult(null);
    setStatusText("Running…");
    try {
      const result = await onRunCode(codeText, language, (status) =>
        setStatusText(status),
      );
      setExecResult(result);
    } catch {
      setExecResult({
        code: codeText,
        language,
        output: "",
        error: "Execution request failed",
        executionTime: 0,
      });
    } finally {
      setRunning(false);
      setStatusText("Running…");
    }
  };

  return (
    <div className="my-6 rounded-2xl overflow-hidden border border-border shadow-xl group/code">
      <div className="flex items-center justify-between px-4 py-2 text-xs bg-muted text-foreground border-b border-border">
        <span>{language}</span>
        <div className="flex items-center gap-1">
          {runnable && (
            <button
              type="button"
              onClick={handleRun}
              disabled={running}
              className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-background/60 transition-colors text-green-600 dark:text-green-400 disabled:opacity-50"
              aria-label="Run code"
            >
              {running ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Play size={13} fill="currentColor" />
              )}
              <span>{running ? statusText : "Run"}</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-background/60 transition-colors"
            aria-label="Copy code"
          >
            {copied ? (
              <>
                <Check size={13} className="text-green-500" />
                <span className="text-green-500">Copied</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
      <SyntaxHighlighter
        language={language}
        style={theme === "dark" ? stackoverflowDark : stackoverflowLight}
        PreTag="div"
        customStyle={{ margin: 0, padding: "16px", fontSize: "0.9rem" }}
      >
        {codeText}
      </SyntaxHighlighter>

      {/* Inline execution result */}
      {execResult && (
        <div className="border-t border-border">
          {execResult.output && (
            <div className="px-4 py-2 bg-muted/30">
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap font-mono text-green-600 dark:text-green-400">
                {execResult.output}
              </pre>
            </div>
          )}
          {execResult.error && (
            <div className="px-4 py-2 bg-red-50 dark:bg-red-950/20">
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap font-mono text-red-600 dark:text-red-400">
                {execResult.error}
              </pre>
            </div>
          )}
          <div className="px-4 py-1 text-[10px] text-muted-foreground bg-muted/20 border-t border-border/40">
            Executed in {execResult.executionTime}ms
          </div>
        </div>
      )}
    </div>
  );
}
