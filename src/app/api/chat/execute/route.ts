import { NextRequest, NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase/server";

/**
 * POST /api/chat/execute — execute code in a sandboxed environment
 *
 * Uses Node.js `vm` module for JavaScript execution with a strict timeout.
 * Only supports JavaScript for now.
 *
 * Body: { code: string; language?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const authClient = createAuthClient(req);
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code, language = "javascript" } = await req.json();

    if (!code?.trim()) {
      return NextResponse.json({ error: "Missing code" }, { status: 400 });
    }

    if (language !== "javascript") {
      return NextResponse.json(
        {
          error: `Language "${language}" is not supported. Only JavaScript is available.`,
        },
        { status: 400 },
      );
    }

    const result = await executeJavaScript(code.trim());
    return NextResponse.json(result);
  } catch (err) {
    console.error("Code execution error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 },
    );
  }
}

const TIMEOUT_MS = 5_000;
const MAX_OUTPUT_LENGTH = 10_000;

async function executeJavaScript(code: string): Promise<{
  output: string;
  error?: string;
  executionTime: number;
}> {
  // Dynamic import so the module is only loaded at runtime (Edge won't hit this).
  const vm = await import("node:vm");

  const logs: string[] = [];
  const mockConsole = {
    log: (...args: unknown[]) => logs.push(args.map(String).join(" ")),
    error: (...args: unknown[]) =>
      logs.push("[error] " + args.map(String).join(" ")),
    warn: (...args: unknown[]) =>
      logs.push("[warn] " + args.map(String).join(" ")),
    info: (...args: unknown[]) =>
      logs.push("[info] " + args.map(String).join(" ")),
    table: (data: unknown) => logs.push(JSON.stringify(data, null, 2)),
  };

  const sandbox: Record<string, unknown> = {
    console: mockConsole,
    Math,
    Date,
    JSON,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Map,
    Set,
    RegExp,
    Error,
    TypeError,
    RangeError,
    Symbol,
    Promise,
    BigInt,
    // Blocked: require, process, fs, fetch, setTimeout, setInterval, eval
  };

  vm.createContext(sandbox);

  const start = performance.now();

  try {
    const script = new vm.Script(code, { filename: "sandbox.js" });
    const result = script.runInContext(sandbox, { timeout: TIMEOUT_MS });

    const elapsed = Math.round(performance.now() - start);

    // Add return value to output if it's not undefined
    if (result !== undefined) {
      const formatted =
        typeof result === "object"
          ? JSON.stringify(result, null, 2)
          : String(result);
      logs.push(formatted);
    }

    const output = logs.join("\n").slice(0, MAX_OUTPUT_LENGTH);
    return { output, executionTime: elapsed };
  } catch (err) {
    const elapsed = Math.round(performance.now() - start);
    const errorMessage =
      err instanceof Error ? err.message : "Unknown execution error";

    const output = logs.join("\n").slice(0, MAX_OUTPUT_LENGTH);
    return { output, error: errorMessage, executionTime: elapsed };
  }
}
