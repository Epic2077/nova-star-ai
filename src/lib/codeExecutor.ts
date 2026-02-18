/**
 * Client-side sandboxed code execution via Web Workers.
 *
 * JavaScript  → runs in a Worker with dangerous globals (fetch, WebSocket, …) shadowed.
 * Python      → runs via Pyodide (CPython compiled to WebAssembly, loaded from CDN).
 *
 * All execution happens entirely in the browser — nothing touches the server.
 */

import type { CodeExecutionResult } from "@/types/chat";

/* ------------------------------------------------------------------ */
/*  Configuration                                                      */
/* ------------------------------------------------------------------ */

const JS_TIMEOUT = 10_000; // 10 s
const PY_TIMEOUT = 30_000; // 30 s  (Pyodide init can be slow on first run)

const SUPPORTED: Record<
  string,
  { worker: string; timeout: number; canonical: string }
> = {
  javascript: {
    worker: "/workers/js-sandbox.js",
    timeout: JS_TIMEOUT,
    canonical: "javascript",
  },
  js: {
    worker: "/workers/js-sandbox.js",
    timeout: JS_TIMEOUT,
    canonical: "javascript",
  },
  python: {
    worker: "/workers/py-sandbox.js",
    timeout: PY_TIMEOUT,
    canonical: "python",
  },
  py: {
    worker: "/workers/py-sandbox.js",
    timeout: PY_TIMEOUT,
    canonical: "python",
  },
};

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/** Returns `true` if the language is runnable in the browser sandbox. */
export function isSupportedLanguage(lang: string): boolean {
  return lang.toLowerCase() in SUPPORTED;
}

/**
 * Execute `code` in a sandboxed Web Worker and return the result.
 *
 * @param code       – source code to execute
 * @param language   – language identifier (javascript / js / python / py)
 * @param onStatus   – optional callback for progress updates ("Loading Python…")
 */
export function executeCode(
  code: string,
  language: string,
  onStatus?: (status: string) => void,
): Promise<CodeExecutionResult> {
  const lang = language.toLowerCase();
  const config = SUPPORTED[lang];

  if (!config) {
    return Promise.resolve({
      code,
      language: lang,
      output: "",
      error: `Language "${language}" is not supported. Supported: JavaScript, Python.`,
      executionTime: 0,
    });
  }

  return new Promise<CodeExecutionResult>((resolve) => {
    const worker = new Worker(config.worker);

    /* Hard timeout — forcibly terminate the worker */
    const timer = setTimeout(() => {
      worker.terminate();
      resolve({
        code,
        language: config.canonical,
        output: "",
        error: `Execution timed out (${config.timeout / 1000}s)`,
        executionTime: config.timeout,
      });
    }, config.timeout);

    worker.onmessage = (e: MessageEvent) => {
      /* Status messages (e.g. Pyodide loading) — don't resolve yet */
      if (e.data.status) {
        onStatus?.(
          e.data.status === "loading"
            ? "Loading Python runtime…"
            : e.data.status,
        );
        return;
      }

      clearTimeout(timer);
      worker.terminate();
      resolve({
        code,
        language: config.canonical,
        output: e.data.output ?? "",
        error: e.data.error,
        executionTime: e.data.executionTime ?? 0,
      });
    };

    worker.onerror = (err) => {
      clearTimeout(timer);
      worker.terminate();
      resolve({
        code,
        language: config.canonical,
        output: "",
        error: err.message || "Worker error",
        executionTime: 0,
      });
    };

    worker.postMessage({ code });
  });
}
