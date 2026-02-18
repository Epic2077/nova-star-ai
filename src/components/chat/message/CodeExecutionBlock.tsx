"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Terminal } from "lucide-react";
import type { CodeExecutionResult } from "@/types/chat";

interface CodeExecutionBlockProps {
  result: CodeExecutionResult;
}

/**
 * Collapsible block showing code execution input/output.
 */
export default function CodeExecutionBlock({
  result,
}: CodeExecutionBlockProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hasError = !!result.error;

  return (
    <div className="my-3 rounded-lg border border-border/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium bg-muted/40 hover:bg-muted/60 transition-colors"
      >
        {isOpen ? (
          <ChevronDown size={14} className="shrink-0" />
        ) : (
          <ChevronRight size={14} className="shrink-0" />
        )}
        <Terminal
          size={14}
          className={`shrink-0 ${hasError ? "text-red-500" : "text-green-500"}`}
        />
        <span>
          Code Execution{" "}
          <span className="text-xs text-muted-foreground font-normal">
            ({result.language} • {result.executionTime}ms)
          </span>
        </span>
        {hasError && (
          <span className="ml-auto text-xs text-red-500 font-normal">
            Error
          </span>
        )}
      </button>

      {isOpen && (
        <div className="border-t border-border/60">
          {/* Code */}
          <div className="px-3 py-2 bg-muted/20">
            <p className="text-xs text-muted-foreground mb-1 font-medium">
              Code
            </p>
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap font-mono">
              {result.code}
            </pre>
          </div>

          {/* Output */}
          {result.output && (
            <div className="px-3 py-2 border-t border-border/40">
              <p className="text-xs text-muted-foreground mb-1 font-medium">
                Output
              </p>
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap font-mono text-green-600 dark:text-green-400">
                {result.output}
              </pre>
            </div>
          )}

          {/* Error */}
          {result.error && (
            <div className="px-3 py-2 border-t border-border/40">
              <p className="text-xs text-red-500 mb-1 font-medium">Error</p>
              <pre className="text-xs overflow-x-auto whitespace-pre-wrap font-mono text-red-600 dark:text-red-400">
                {result.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
